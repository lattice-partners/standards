// Ticket and release commands, plus the two plain-English status commands a
// non-technical teammate needs: doctor (is my machine right?) and verify
// (is this safe to ship?).

import { resolve, join } from 'node:path'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import * as ui from './ui.js'
import { HOOKS_PATH, VENDOR_DIR, projectTracker, hooksInstalled, standardsVersion, MIN_NODE_MAJOR, readStack, SUPABASE_CLI_VERSION } from './lib.js'
import { check } from './commands.js'
import { projectGate } from './hooks.js'
import { git, gitOk, isRepo, refExists, currentBranch, commitSubjects, configGet } from './git.js'

/** Keys in .env.example with empty values that a human must fill in. */
export function requiredEnvKeys(examplePath) {
  const keys = []
  for (const line of fs.readFileSync(examplePath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const m = trimmed.match(/^([A-Z][A-Z0-9_]*)=$/)
    if (m) keys.push(m[1])
  }
  return keys
}

/** Keys from .env.example that are missing or empty in .env.local. */
export function emptyEnvKeys(target) {
  const example = join(target, '.env.example')
  const local = join(target, '.env.local')
  if (!fs.existsSync(example)) return []
  const keys = requiredEnvKeys(example)
  if (!keys.length) return []
  if (!fs.existsSync(local)) return keys
  const content = fs.readFileSync(local, 'utf8')
  return keys.filter((k) => !envLocalValue(content, k))
}

/** Parse a value from .env.local (simple KEY=value lines). */
export function envLocalValue(content, key) {
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const m = trimmed.match(/^([A-Z][A-Z0-9_]*)=(.*)$/)
    if (m && m[1] === key) return m[2].trim()
  }
  return null
}

/** Comment lines above a key in .env.example, joined for display. */
export function envKeyHint(exampleContent, key) {
  const lines = exampleContent.split('\n')
  const hints = []
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim().startsWith(`${key}=`)) continue
    for (let j = i - 1; j >= 0; j--) {
      const t = lines[j].trim()
      if (t.startsWith('#')) hints.unshift(t.replace(/^#\s?/, ''))
      else if (t && !t.startsWith('#')) break
    }
    break
  }
  return hints.join(' ')
}

/** Set one key in .env.local content, preserving the rest of the file. */
export function setEnvLocalValue(content, key, value) {
  const lines = content.split('\n')
  let found = false
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].trim().match(/^([A-Z][A-Z0-9_]*)=(.*)$/)
    if (m && m[1] === key) {
      lines[i] = `${key}=${value}`
      found = true
      break
    }
  }
  if (!found) lines.push(`${key}=${value}`)
  return lines.join('\n')
}

/** Required npm major from the project's devEngines pin, or null. */
function requiredNpmMajor(target) {
  const pkgPath = join(target, 'package.json')
  if (!fs.existsSync(pkgPath)) return null
  try {
    const ver = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).devEngines?.packageManager?.version
    if (!ver) return null
    const m = String(ver).match(/\^?(\d+)/)
    return m ? Number(m[1]) : null
  } catch {
    return null
  }
}

export function runningNpmMajor() {
  const fromAgent = process.env.npm_config_user_agent?.match(/npm\/(\d+)/)?.[1]
  if (fromAgent) return Number(fromAgent)
  try {
    return Number(execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim().split('.')[0])
  } catch {
    return null
  }
}

function expectsHooks(target) {
  const pkgPath = join(target, 'package.json')
  if (!fs.existsSync(pkgPath)) return false
  try {
    const prep = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).scripts?.prepare
    return typeof prep === 'string' && prep.includes('lattice hooks')
  } catch {
    return false
  }
}

/** Resolve the pair of refs a release spans, preferring the remote. */
function releaseRefs(cwd) {
  if (refExists('origin/main', cwd) && refExists('origin/dev', cwd)) {
    return { from: 'origin/main', to: 'origin/dev' }
  }
  if (refExists('main', cwd) && refExists('dev', cwd)) return { from: 'main', to: 'dev' }
  return null
}

/** Start work on a ticket: branch from the tip of dev. */
export function ticket(opts = {}) {
  const target = resolve(process.cwd(), opts.dir ?? '.')
  const id = (opts.id ?? '').trim().toUpperCase()
  if (!id) {
    ui.step.err('usage: lattice ticket <TICKET-ID>')
    return 1
  }
  if (!isRepo(target)) {
    ui.step.err('not a git repository')
    return 1
  }

  const prefix = projectTracker(target)
  const shape = prefix ? new RegExp(`^${prefix}-\\d+$`) : /^[A-Z]{2,10}-\d+$/
  if (!shape.test(id)) {
    ui.step.err(`"${id}" is not a ticket id${prefix ? ` (expected ${prefix}-<number>)` : ''}`)
    return 1
  }

  if (gitOk(['remote', 'get-url', 'origin'], target)) {
    const sp = ui.spinner('fetching origin')
    gitOk(['fetch', 'origin', '--prune'], target)
    sp.stop('fetched origin')
  }

  const base = refExists('origin/dev', target) ? 'origin/dev' : 'dev'
  if (!refExists(base, target)) {
    ui.step.err('no dev branch found. Create one before starting ticket work.')
    return 1
  }

  if (refExists(`refs/heads/${id}`, target)) {
    git(['checkout', id], target)
    ui.step.ok(`switched to existing ${ui.bold(id)}`)
    return 0
  }

  git(['checkout', '-b', id, base], target)
  ui.step.ok(`created ${ui.bold(id)} from ${ui.gray(base)}`)
  return 0
}

const TICKET_RE = /\b([A-Z]{2,10}-\d+)\b/g
const CONVENTIONAL_PREFIX = /^(feat|fix|perf|refactor|docs|style|test|build|ci|chore|revert)(\([^)]*\))?!?:\s*/

function titleCase(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Generate the dev -> main pull request body: closing magic words so the
 * tracker closes each ticket on merge, then one line per shipped change.
 *
 * Ticket ids come from merge commits, because our own commit-msg hook forbids
 * them in authored messages. Squash-merging loses that, so ids can also be
 * passed explicitly.
 */
export function releaseBody(target, opts = {}) {
  const refs = releaseRefs(target)
  if (!refs) return null

  const ids = new Set()
  for (const id of (opts.tickets ?? '').split(',')) {
    const v = id.trim().toUpperCase()
    if (v) ids.add(v)
  }
  const merges = git(['log', '--merges', '--format=%s %b', `${refs.from}..${refs.to}`], target)
  for (const m of merges.matchAll(TICKET_RE)) ids.add(m[1])

  const subjects = commitSubjects(refs.from, refs.to, target)
  // feat/fix/perf are the changes a reader of the release notes cares about.
  const features = subjects
    .filter((s) => /^(feat|fix|perf)(\([^)]*\))?!?:/.test(s))
    .map((s) => titleCase(s.replace(CONVENTIONAL_PREFIX, '')))
  const lines = [...new Set(features)].reverse()

  const body = [
    ...[...ids].sort().map((id) => `- Closes ${id}`),
    '',
    ...lines.map((l) => `- ${l}`),
  ].join('\n')

  return { refs, ids: [...ids], lines, body }
}

/** "lattice release": print the body to paste into the pull request. */
export function release(opts = {}) {
  const target = resolve(process.cwd(), opts.dir ?? '.')
  if (!isRepo(target)) {
    ui.step.err('not a git repository')
    return 1
  }
  const result = releaseBody(target, opts)
  if (!result) {
    ui.step.err('need both a main and a dev branch to build a release')
    return 1
  }
  if (!result.ids.length && !result.lines.length) {
    ui.step.warn(`nothing to release: ${result.refs.from} and ${result.refs.to} match`)
    return 0
  }
  if (!result.ids.length) {
    ui.step.warn('no ticket ids found in merge commits; pass --tickets MIN-1,MIN-2')
  }
  console.log(result.body)
  return 0
}

export function runningNodeVersion() {
  try {
    return execFileSync('node', ['--version'], { encoding: 'utf8' }).trim().replace(/^v/, '')
  } catch {
    return null
  }
}

function nodeTooOld(version) {
  return version === null || Number(version.split('.')[0]) < MIN_NODE_MAJOR
}

/** Create one stable doctor result with an optional executable remediation. */
export function doctorCheck(id, good, message, remediation = null, action = null) {
  return { id, good, message, remediation, action }
}

/** Structured, synchronous pre-flight results for doctor and setup. */
export function auditDoctor(target) {
  const results = []
  const ok = (id, message) => results.push(doctorCheck(id, true, message))
  const bad = (id, message, remediation, action) =>
    results.push(doctorCheck(id, false, message, remediation, action))

  const nodeVersion = runningNodeVersion()
  if (nodeTooOld(nodeVersion)) {
    bad(
      'node-version',
      nodeVersion ? `Node ${nodeVersion} is too old` : 'could not detect Node',
      `install Node ${MIN_NODE_MAJOR} LTS or newer`,
      { kind: 'node', label: `install and use Node ${MIN_NODE_MAJOR}` },
    )
  } else ok('node-version', `Node ${nodeVersion}`)

  const npmPin = requiredNpmMajor(target)
  if (npmPin !== null) {
    const npmMajor = runningNpmMajor()
    if (npmMajor === null) bad('npm-version', 'could not detect npm version', `install npm@${npmPin}`)
    else if (npmMajor < npmPin)
      bad('npm-version', `npm ${npmMajor} is too old (project requires ${npmPin})`, `install npm@${npmPin}`, {
        kind: 'command',
        label: `npm i -g npm@${npmPin}`,
        argv: ['npm', 'i', '-g', `npm@${npmPin}`],
      })
    else ok('npm-version', `npm ${npmMajor}`)
  }

  if (!isRepo(target)) {
    bad('git-repository', 'this folder is not a git repository', 'initialize git', {
      kind: 'git-init',
      label: 'git init -b main',
    })
  } else {
    ok('git-repository', 'git repository')
    const who = configGet('user.email', target) || gitOk(['config', '--get', 'user.email'], target)
    if (who) ok('git-identity', 'git knows who you are')
    else bad('git-identity', 'git does not know your email', 'configure a local git identity', {
      kind: 'git-email',
      label: 'git config user.email',
    })
    if (refExists('dev', target)) ok('git-dev', 'dev branch exists')
    else bad('git-dev', 'no dev branch', 'create the dev branch', { kind: 'git-dev', label: 'git branch dev' })
    if (gitOk(['remote', 'get-url', 'origin'], target)) ok('git-origin', 'origin remote is set')
    else
      bad('git-origin', 'no origin remote', 'create an empty GitHub repository and connect it', {
        kind: 'git-origin',
        label: 'git remote add origin',
      })
  }

  if (fs.existsSync(join(target, VENDOR_DIR))) ok('standards', 'standards are installed')
  else bad('standards', 'the standard is not installed here', 'run lattice init')

  if (expectsHooks(target)) {
    if (!fs.existsSync(join(target, HOOKS_PATH))) {
      bad('hooks', 'safety checks are not installed', 'install the Lattice git hooks', {
        kind: 'hooks',
        label: 'lattice hooks install',
      })
    } else if (hooksInstalled(target)) ok('hooks', 'safety checks run before every commit')
    else
      bad('hooks', 'safety checks are not switched on', 'enable the Lattice git hooks', {
        kind: 'hooks',
        label: 'lattice hooks install',
      })
  } else if (fs.existsSync(join(target, HOOKS_PATH))) {
    if (hooksInstalled(target)) ok('hooks', 'safety checks run before every commit')
    else
      bad('hooks', 'safety checks are not switched on', 'enable the Lattice git hooks', {
        kind: 'hooks',
        label: 'lattice hooks install',
      })
  }

  if (fs.existsSync(join(target, 'package.json')) && !fs.existsSync(join(target, 'node_modules'))) {
    bad('dependencies', 'dependencies are not installed', 'install project dependencies', {
      kind: 'command',
      label: 'npm install --allow-git=all',
      argv: ['npm', 'install', '--allow-git=all'],
    })
  }

  const example = join(target, '.env.example')
  if (fs.existsSync(example)) {
    const keys = requiredEnvKeys(example)
    const local = join(target, '.env.local')
    if (keys.length) {
      if (!fs.existsSync(local)) {
        bad('local-settings', 'you have no local settings file', 'create .env.local from the example', {
          kind: 'copy-env',
          label: 'copy .env.example to .env.local',
        })
      } else {
        const content = fs.readFileSync(local, 'utf8')
        const empty = keys.filter((k) => !envLocalValue(content, k))
        if (empty.length) bad('local-settings', `settings missing or empty: ${empty.join(', ')}`, 'fill them in .env.local')
        else ok('local-settings', 'local settings file has values for every required key')
      }
    }
  }

  const prefix = projectTracker(target)
  if (prefix) ok('ticket-prefix', `tickets use the ${prefix} prefix`)

  const branch = currentBranch(target)
  if (branch) ok('current-branch', `you are on branch ${branch}`)

  const agentsPath = join(target, 'AGENTS.md')
  const stack = fs.existsSync(agentsPath) ? readStack(fs.readFileSync(agentsPath, 'utf8')) : null
  if (stack === 'next-monorepo' && fs.existsSync(join(target, 'node_modules'))) {
    const supabaseCli = join(target, 'node_modules', '.bin', process.platform === 'win32' ? 'supabase.cmd' : 'supabase')
    if (fs.existsSync(supabaseCli)) ok('supabase-cli', 'pinned Supabase CLI is installed')
    else
      bad('supabase-cli', 'pinned Supabase CLI is not installed', 'install the project Supabase CLI', {
        kind: 'command',
        label: `npm install -D supabase@${SUPABASE_CLI_VERSION}`,
        argv: ['npm', 'install', '-D', `supabase@${SUPABASE_CLI_VERSION}`],
      })
    if (fs.existsSync(join(target, 'supabase', '.temp', 'project-ref'))) ok('supabase-link', 'Supabase project is linked')
    else bad('supabase-link', 'Supabase project is not linked', 'complete the Supabase stage in lattice setup')

    const webLink = join(target, 'apps', 'web', '.vercel', 'project.json')
    const apiLink = join(target, 'apps', 'api', '.vercel', 'project.json')
    if (fs.existsSync(webLink) && fs.existsSync(apiLink)) ok('vercel-links', 'both Vercel projects are linked')
    else bad('vercel-links', 'both Vercel projects are not linked', 'complete the Vercel stage in lattice setup')

    const detailsPath = join(target, 'memory', 'project-details.md')
    const details = fs.existsSync(detailsPath) ? fs.readFileSync(detailsPath, 'utf8') : ''
    if (/^- Supabase PITR: confirmed /m.test(details)) ok('supabase-pitr', 'Supabase PITR is verified')
    else bad('supabase-pitr', 'Supabase PITR is not verified', 'complete the Supabase stage in lattice setup')
    if (/^- Clerk to Supabase integration: confirmed /m.test(details)) ok('clerk-supabase', 'Clerk to Supabase integration is confirmed')
    else bad('clerk-supabase', 'Clerk to Supabase integration is not confirmed', 'complete the Clerk stage in lattice setup')
    if (/^- Vercel projects and firewall: confirmed /m.test(details)) ok('vercel-provider', 'Vercel env and firewall are verified')
    else bad('vercel-provider', 'Vercel env and firewall are not verified', 'complete the Vercel stage in lattice setup')
    if (/^- Vercel project root and deployment controls: confirmed /m.test(details)) ok('vercel-controls', 'Vercel deployment controls are confirmed')
    else bad('vercel-controls', 'Vercel deployment controls are not confirmed', 'complete the Vercel stage in lattice setup')
  }

  const problems = results.filter((result) => !result.good).length
  return { results, problems }
}

/** Check the developer's machine is set up. Written to be read by anyone. */
export async function doctor(opts = {}) {
  const target = resolve(process.cwd(), opts.dir ?? '.')
  let { results, problems } = auditDoctor(target)

  const print = (rows) => {
    for (const result of rows) {
      if (result.good) ui.step.ok(result.message)
      else ui.step.err(`${result.message}${result.remediation ? ` ${ui.gray(`(${result.remediation})`)}` : ''}`)
    }
  }

  print(results)
  console.log('')
  if (!problems) {
    ui.step.ok('Your setup looks good.')
    return 0
  }
  ui.step.warn(`${problems} thing(s) to fix above before you start.`)

  if (ui.interactive) {
    const { offerFixes } = await import('./fix.js')
    results = await offerFixes(target, results)
    problems = results.filter((result) => !result.good).length
    console.log('')
    print(results)
    console.log('')
    if (!problems) {
      ui.step.ok('Your setup looks good.')
      return 0
    }
    ui.step.warn(`${problems} thing(s) still to fix.`)
  }
  return 1
}

/** Run the full gate and answer "is this safe to ship?" in plain language. */
export function verify(opts = {}) {
  const target = resolve(process.cwd(), opts.dir ?? '.')
  ui.step.info(`Checking ${ui.bold(opts.dir ?? '.')} against lattice-standards@${standardsVersion()}`)
  console.log('')

  const problems = []
  if (check({ dir: opts.dir ?? '.' }) !== 0) {
    problems.push('the project does not match the current standard (see above)')
  }
  projectGate(target, problems)

  console.log('')
  if (!problems.length) {
    ui.step.ok('Safe to ship. Tests, types, and lint all pass.')
    return 0
  }
  ui.step.err(`Not safe to ship yet. ${problems.length} problem(s):`)
  for (const p of problems) ui.step.note(`${ui.S.dot} ${p}`)
  console.log('')
  ui.step.note('Paste a problem above to your coding agent and ask it to fix it.')
  return 1
}
