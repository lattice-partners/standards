// Hook bodies. The vendored shims in .lattice/hooks/ delegate here, so the
// logic ships with the package and updates through "lattice sync".
//
// lattice:allow-secret-patterns - this file necessarily contains the key shapes
// the scanner looks for. The marker is a convenience for developing the gate,
// not a security boundary; the gate catches accidents, not a determined actor.

import { join } from 'node:path'
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import * as ui from './ui.js'
import { projectTracker } from './lib.js'
import { currentBranch, stagedFiles, stagedContent, stageFile, git, refExists } from './git.js'

const ALLOW_MARKER = 'lattice:allow-secret-patterns'
const DESTRUCTIVE_MARKER = '-- lattice:destructive-approved'

const SECRET_PATTERNS = [
  [/\bsb_secret_[A-Za-z0-9_-]{8,}/, 'Supabase secret key'],
  [/\bsk_live_[A-Za-z0-9]{8,}/, 'live secret key'],
  [/\bsk_test_[A-Za-z0-9]{8,}/, 'test secret key'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key id'],
  [/-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/, 'private key'],
]

// A public variable whose name announces it holds a secret. Next.js inlines
// every NEXT_PUBLIC_* value into the client bundle.
const PUBLIC_SECRET_NAME = /NEXT_PUBLIC_[A-Z0-9_]*(SECRET|PRIVATE|SERVICE_ROLE|PASSWORD)[A-Z0-9_]*/
const PUBLIC_ASSIGN = /NEXT_PUBLIC_[A-Z0-9_]+\s*[=:]\s*['"`]?([^\s'"`,;]+)/g

const DESTRUCTIVE_SQL = [
  [/\bdisable\s+row\s+level\s+security\b/i, 'disables row level security'],
  [/\bdrop\s+table\b/i, 'drops a table'],
  [/\bdrop\s+column\b/i, 'drops a column'],
  [/\btruncate\b/i, 'truncates a table'],
]

const TEXT_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|json|md|sql|yml|yaml|toml|css|env|example|sh|txt)$/i
const FORMAT_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|json|md|css|yml|yaml)$/i
const LINT_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/i

function localBin(cwd, name) {
  const p = join(cwd, 'node_modules', '.bin', name)
  return fs.existsSync(p) ? p : null
}

/**
 * A real file on disk, not a symlink. CLAUDE.md is a symlink to AGENTS.md in
 * every project we scaffold, and prettier errors out when one is named
 * explicitly, which would break the first commit of every project.
 */
function isPlainFile(cwd, f) {
  const p = join(cwd, f)
  try {
    return fs.lstatSync(p).isFile()
  } catch {
    return false
  }
}

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8' })
  return { ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() }
}

function hasScript(cwd, name) {
  const p = join(cwd, 'package.json')
  if (!fs.existsSync(p)) return false
  try {
    return Boolean(JSON.parse(fs.readFileSync(p, 'utf8')).scripts?.[name])
  } catch {
    return false
  }
}

/** Files with unstaged changes; we must not re-stage those. */
function unstagedFiles(cwd) {
  const out = git(['diff', '--name-only'], cwd)
  return new Set(out ? out.split('\n').filter(Boolean) : [])
}

// --- individual checks -----------------------------------------------------

function checkBranch(cwd, problems) {
  const branch = currentBranch(cwd)
  if (!branch) return
  // A merge lands on dev by design. The rule is about authored work, not about
  // integrating a ticket branch that already passed these checks.
  if (refExists('MERGE_HEAD', cwd)) return
  if (branch === 'dev') {
    problems.push('commit on a ticket branch, not dev. Run: lattice ticket <ID>')
    return
  }
  if (branch === 'main') {
    ui.step.warn('committing directly to main. This is for hotfixes only.')
    return
  }
  const prefix = projectTracker(cwd)
  if (!prefix) return
  if (!new RegExp(`^${prefix}-\\d+$`).test(branch)) {
    problems.push(
      `branch "${branch}" is not a ticket branch. The tracker links by branch name, ` +
        `so this change would never move its ticket. Expected ${prefix}-<number>.`,
    )
  }
}

function checkSecrets(cwd, files, problems) {
  for (const f of files) {
    const base = f.split('/').pop()
    if (base.startsWith('.env') && base !== '.env.example') {
      problems.push(`${f} is an env file and must not be committed`)
      continue
    }
    if (!TEXT_EXT.test(f)) continue
    const content = stagedContent(f, cwd)
    if (!content || content.includes(ALLOW_MARKER)) continue

    for (const [re, label] of SECRET_PATTERNS) {
      if (re.test(content)) problems.push(`${f} looks like it contains a ${label}`)
    }

    const nameHit = content.match(PUBLIC_SECRET_NAME)
    if (nameHit) {
      problems.push(
        `${f} defines ${nameHit[0]}. NEXT_PUBLIC_ values are inlined into the ` +
          'client bundle and readable by every visitor.',
      )
    }
    for (const m of content.matchAll(PUBLIC_ASSIGN)) {
      const value = m[1] ?? ''
      if (SECRET_PATTERNS.some(([re]) => re.test(value))) {
        problems.push(`${f} assigns a secret-looking value to a NEXT_PUBLIC_ variable`)
      }
    }
  }
}

function checkMigrations(cwd, files, problems) {
  for (const f of files) {
    if (!/supabase\/migrations\/.+\.sql$/.test(f)) continue
    const sql = stagedContent(f, cwd)
    if (!sql) continue

    if (!sql.includes(DESTRUCTIVE_MARKER)) {
      for (const [re, label] of DESTRUCTIVE_SQL) {
        if (re.test(sql)) {
          problems.push(
            `${f} ${label}. If the data loss is intended and approved, add the ` +
              `line "${DESTRUCTIVE_MARKER}" to the migration.`,
          )
        }
      }
    }
    if (/\bcreate\s+table\b/i.test(sql) && !/\benable\s+row\s+level\s+security\b/i.test(sql)) {
      problems.push(`${f} creates a table without enabling row level security`)
    }
  }
}

function formatStaged(cwd, files, problems) {
  const prettier = localBin(cwd, 'prettier')
  if (!prettier) return
  const targets = files.filter((f) => FORMAT_EXT.test(f) && isPlainFile(cwd, f))
  if (!targets.length) return

  const unstaged = unstagedFiles(cwd)
  // Re-staging a partially staged file would sweep in hunks the author left
  // out on purpose, so report those instead of rewriting them.
  const safe = targets.filter((f) => !unstaged.has(f))
  const partial = targets.filter((f) => unstaged.has(f))

  if (safe.length) {
    const r = run(prettier, ['--write', '--ignore-unknown', ...safe], cwd)
    if (r.ok) for (const f of safe) stageFile(f, cwd)
    else problems.push(`prettier failed:\n${r.out}`)
  }
  if (partial.length) {
    const r = run(prettier, ['--check', '--ignore-unknown', ...partial], cwd)
    if (!r.ok) {
      problems.push(
        `these files are partially staged and not formatted; format them yourself: ${partial.join(', ')}`,
      )
    }
  }
}

function lintStaged(cwd, files, problems) {
  const eslint = localBin(cwd, 'eslint')
  if (!eslint) return
  const targets = files.filter((f) => LINT_EXT.test(f) && isPlainFile(cwd, f))
  if (!targets.length) return
  // Report only. An eslint autofix can change behaviour, and the person driving
  // the agent would not notice.
  const r = run(eslint, ['--max-warnings=0', ...targets], cwd)
  if (!r.ok) problems.push(`eslint:\n${r.out}`)
}

export function projectGate(cwd, problems) {
  const turbo = localBin(cwd, 'turbo')
  if (turbo && fs.existsSync(join(cwd, 'turbo.json'))) {
    // Cache plus affected-package filtering is what keeps a full gate fast
    // enough that people do not reach for --no-verify. The filter needs a HEAD
    // to compare against, which the very first commit in a new project does not
    // have yet; run everything then.
    const args = ['run', 'lint', 'typecheck', 'test']
    if (refExists('HEAD', cwd)) args.push('--filter=...[HEAD]')
    const r = run(turbo, args, cwd)
    if (!r.ok) problems.push(`turbo gate failed:\n${r.out}`)
    return
  }
  for (const script of ['lint', 'typecheck', 'test']) {
    if (!hasScript(cwd, script)) continue
    const r = run('npm', ['run', script, '--if-present'], cwd)
    if (!r.ok) problems.push(`npm run ${script} failed:\n${r.out}`)
  }
}

// --- hooks -----------------------------------------------------------------

export function preCommit(cwd) {
  const problems = []
  const files = stagedFiles(cwd)
  if (!files.length) return 0

  checkBranch(cwd, problems)
  checkSecrets(cwd, files, problems)
  checkMigrations(cwd, files, problems)
  formatStaged(cwd, files, problems)
  lintStaged(cwd, files, problems)
  if (!problems.length) projectGate(cwd, problems)

  if (!problems.length) {
    ui.step.ok('pre-commit checks passed')
    return 0
  }
  ui.step.err(`commit blocked: ${problems.length} problem(s)`)
  for (const p of problems) ui.step.note(`${ui.S.dot} ${p}`)
  return 1
}

const CONVENTIONAL =
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([\w.\-/ ]+\))?!?: .+/
const EMOJI = /\p{Extended_Pictographic}/u
const ATTRIBUTION =
  /^\s*(co-authored-by|generated[ -]with|generated by|assisted-by|made-with|made with)/im

export function commitMsg(file, cwd, source) {
  if (!file || !fs.existsSync(file)) {
    ui.step.err('commit-msg hook did not receive a message file')
    return 1
  }
  const raw = fs.readFileSync(file, 'utf8')
  const body = raw
    .split('\n')
    .filter((l) => !l.startsWith('#'))
    .join('\n')
    .trim()
  const subject = body.split('\n')[0] ?? ''

  // Merge and revert commits are generated, not authored. Holding them to the
  // subject rules would make it impossible to merge a ticket branch at all, and
  // the branch name they carry is exactly what "lattice release" reads to find
  // which tickets shipped.
  if (source === 'merge' || refExists('MERGE_HEAD', cwd) || /^(Merge|Revert) /.test(subject)) {
    return 0
  }

  const problems = []

  if (!subject) problems.push('empty commit message')
  else if (!CONVENTIONAL.test(subject)) {
    problems.push(`subject is not a Conventional Commit: "${subject}"`)
  }
  if (subject.length > 72) problems.push(`subject is ${subject.length} chars; keep it under 72`)
  if (body.includes('—')) problems.push('contains an em dash; use a plain hyphen')
  if (EMOJI.test(body)) problems.push('contains an emoji')
  if (ATTRIBUTION.test(body)) problems.push('contains an AI attribution trailer')
  if (/https?:\/\//.test(body)) problems.push('contains a URL; keep links in the ticket')
  // Match the configured prefix rather than any CAPS-number pattern, which also
  // catches legitimate references like ADR-0006.
  const prefix = projectTracker(cwd)
  if (prefix && new RegExp(`\\b${prefix}-\\d+\\b`).test(body)) {
    problems.push('contains a ticket ID; the branch name carries the link')
  }

  if (!problems.length) return 0
  ui.step.err(`commit message rejected: ${problems.length} problem(s)`)
  for (const p of problems) ui.step.note(`${ui.S.dot} ${p}`)
  return 1
}

/** Dispatch for "lattice hook <name> [args]". */
export function runHook(name, args, cwd) {
  if (name === 'pre-commit') return preCommit(cwd)
  // git passes the message file, then the commit source (merge, squash, ...).
  if (name === 'commit-msg') return commitMsg(args[0], cwd, args[1])
  ui.step.err(`unknown hook: ${name}`)
  return 1
}
