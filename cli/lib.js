// Shared helpers for the lattice CLI: locating the installed standard,
// vendoring core docs, stack docs and hooks into a project, and
// reading/writing AGENTS.md.

import { fileURLToPath } from 'node:url'
import { dirname, join, basename } from 'node:path'
import fs from 'node:fs'
import { configGet } from './git.js'

// Template entries whose vendored name differs from the source name. npm strips
// real dotfiles from published packages, so the template stores them undotted
// and we restore the dot on copy. Matched by basename at every level.
const RENAME_ON_COPY = {
  gitignore: '.gitignore',
  'env.example': '.env.example',
  claude: '.claude',
  github: '.github',
}

const CLI_DIR = dirname(fileURLToPath(import.meta.url))

/** Root of the installed lattice-standards package (parent of cli/). */
export const PKG_ROOT = dirname(CLI_DIR)

/** GitHub slug projects install from; used only for the printed install hint. */
export const REPO_SLUG = 'lattice-partners/standards'

/** Directory the standard is vendored into inside a project. */
export const VENDOR_DIR = '.lattice'

/** Where git is pointed for hooks, relative to the project root. */
export const HOOKS_PATH = `${VENDOR_DIR}/hooks`

/** Scaffolds init can lay down. The first is the default. */
export const STACKS = ['next-monorepo', 'minimal']

const STACK_TEMPLATE = {
  'next-monorepo': 'next-monorepo',
  minimal: 'greenfield',
}

const BLOCK_START = '<!-- lattice:standards -->'
const BLOCK_END = '<!-- /lattice:standards -->'

const DOC_DESC = {
  'agents-base.md': 'base engineering standard',
  'working-agreement.md': 'posture, rituals, commit discipline, DoD',
  'security-baseline.md': 'non-negotiable security rules',
  'agent-safety.md': 'what an agent must never do to clear an error',
  'ticket-workflow.md': 'branching, tickets, releases',
  'stack-baseline.md': 'Lattice stack rules (layout, RLS, env, migrations)',
}

/** Version of the installed standard, from the package VERSION file. */
export function standardsVersion() {
  return fs.readFileSync(join(PKG_ROOT, 'VERSION'), 'utf8').trim()
}

function coreDir() {
  return join(PKG_ROOT, 'core')
}

function stackDir() {
  return join(PKG_ROOT, 'stack')
}

function hooksSrcDir() {
  return join(PKG_ROOT, 'hooks')
}

/** Filenames of the top-level standard docs shipped in core/. */
export function standardDocs() {
  return fs
    .readdirSync(coreDir())
    .filter((f) => f.endsWith('.md'))
    .sort()
}

/**
 * Stack docs vendored alongside the core ones. README.md is the human-facing
 * setup index and stays in the package; everything else is agent-facing.
 */
export function stackDocs() {
  const dir = stackDir()
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .sort()
}

/** Hook scripts shipped in hooks/, vendored into <target>/.lattice/hooks/. */
export function hookNames() {
  const dir = hooksSrcDir()
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).sort()
}

/** Resolve a vendored doc name back to the file it was copied from. */
export function docSourcePath(file) {
  const fromCore = join(coreDir(), file)
  return fs.existsSync(fromCore) ? fromCore : join(stackDir(), file)
}

/** Copy the core standard docs into <target>/.lattice/, stamping the version. */
export function vendorCore(target) {
  const dst = join(target, VENDOR_DIR)
  fs.mkdirSync(dst, { recursive: true })
  const docs = standardDocs()
  for (const f of docs) fs.copyFileSync(join(coreDir(), f), join(dst, f))
  fs.writeFileSync(join(dst, 'VERSION'), standardsVersion() + '\n')
  return docs
}

/** Copy the stack docs into <target>/.lattice/. Only for projects on a stack. */
export function vendorStack(target) {
  const dst = join(target, VENDOR_DIR)
  fs.mkdirSync(dst, { recursive: true })
  const docs = stackDocs()
  for (const f of docs) fs.copyFileSync(join(stackDir(), f), join(dst, f))
  return docs
}

/**
 * Copy the hook scripts into <target>/.lattice/hooks/. chmod is explicit
 * because copyFileSync does not carry the exec bit and npm does not reliably
 * preserve it through a package tarball.
 */
export function vendorHooks(target) {
  const names = hookNames()
  if (!names.length) return []
  const dst = join(target, HOOKS_PATH)
  fs.mkdirSync(dst, { recursive: true })
  for (const n of names) {
    const p = join(dst, n)
    fs.copyFileSync(join(hooksSrcDir(), n), p)
    fs.chmodSync(p, 0o755)
  }
  return names
}

/** Version stamped into a project's .lattice/, or null if absent. */
export function vendoredVersion(target) {
  const p = join(target, VENDOR_DIR, 'VERSION')
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8').trim() : null
}

/** True when a vendored doc differs from the installed one (edited or stale). */
export function docDiffers(target, file) {
  const vp = join(target, VENDOR_DIR, file)
  if (!fs.existsSync(vp)) return true
  return fs.readFileSync(vp, 'utf8') !== fs.readFileSync(docSourcePath(file), 'utf8')
}

/** True when a vendored hook differs from the installed one. */
export function hookDiffers(target, name) {
  const vp = join(target, HOOKS_PATH, name)
  if (!fs.existsSync(vp)) return true
  return fs.readFileSync(vp, 'utf8') !== fs.readFileSync(join(hooksSrcDir(), name), 'utf8')
}

/** Whether git in this project is pointed at the vendored hooks. */
export function hooksInstalled(target) {
  return configGet('core.hooksPath', target) === HOOKS_PATH
}

/**
 * Summarize a project's standards state for the interactive shell.
 * drift is one of: 'none', 'behind' (stale version), 'edited' (local changes),
 * or null when the project is not initialized.
 */
export function status(target) {
  const initialized = fs.existsSync(join(target, VENDOR_DIR))
  const installed = standardsVersion()
  const vendored = vendoredVersion(target)
  const agentsPath = join(target, 'AGENTS.md')
  const agents = fs.existsSync(agentsPath) ? fs.readFileSync(agentsPath, 'utf8') : null
  const posture = agents ? readPosture(agents) : null
  const stack = agents ? readStack(agents) : null
  const tracker = agents ? readTracker(agents) : null
  let drift = null
  if (initialized) {
    if (vendored !== installed) drift = 'behind'
    else {
      const docs = stack && stack !== 'minimal' ? [...standardDocs(), ...stackDocs()] : standardDocs()
      // Hooks only count toward drift once a project has vendored them; a guest
      // repo that never installed them is not drifting.
      const hooksVendored = fs.existsSync(join(target, HOOKS_PATH))
      const edited =
        docs.some((f) => docDiffers(target, f)) ||
        (hooksVendored && hookNames().some((n) => hookDiffers(target, n)))
      drift = edited ? 'edited' : 'none'
    }
  }
  return { initialized, installed, vendored, posture, stack, tracker, drift, hooks: hooksInstalled(target) }
}

/** Seed a project's memory/ from the template, unless one already exists. */
export function seedMemory(target) {
  const src = join(coreDir(), 'memory-template')
  const dst = join(target, 'memory')
  if (!fs.existsSync(src) || fs.existsSync(dst)) return false
  fs.cpSync(src, dst, { recursive: true })
  return true
}

const TEMPLATE_VAR = /\{\{(PROJECT_NAME|STANDARDS_VERSION)\}\}/g

/**
 * Copy a template tree, restoring dotted names and filling {{VARS}}. Written by
 * hand rather than with fs.cpSync because the rename has to happen at every
 * level of the tree, which cpSync cannot express. Never overwrites.
 */
function copyTree(srcDir, destDir, vars, created, prefix = '') {
  fs.mkdirSync(destDir, { recursive: true })
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (entry.name === '.gitkeep') continue
    const name = RENAME_ON_COPY[entry.name] ?? entry.name
    const src = join(srcDir, entry.name)
    const dest = join(destDir, name)
    const rel = prefix + name
    if (entry.isDirectory()) {
      copyTree(src, dest, vars, created, rel + '/')
      continue
    }
    if (fs.existsSync(dest)) continue
    const content = fs.readFileSync(src, 'utf8')
    fs.writeFileSync(dest, content.replace(TEMPLATE_VAR, (_, k) => vars[k] ?? ''))
    created.push(rel)
  }
}

/**
 * Lay down the scaffold for a stack, plus the CI workflow. Skips any file that
 * already exists. Returns created paths.
 */
export function scaffoldStack(target, stack = STACKS[0], vars = {}) {
  const created = []
  const dir = join(PKG_ROOT, 'templates', STACK_TEMPLATE[stack] ?? stack)
  if (fs.existsSync(dir)) {
    copyTree(dir, target, { STANDARDS_VERSION: standardsVersion(), ...vars }, created)
  }
  const ciSrc = join(PKG_ROOT, 'ci', 'workflows', 'ci.yml')
  const ciDest = join(target, '.github', 'workflows', 'ci.yml')
  if (fs.existsSync(ciSrc) && !fs.existsSync(ciDest)) {
    fs.mkdirSync(dirname(ciDest), { recursive: true })
    // Pin the reusable action to this standard version.
    const pinned = fs
      .readFileSync(ciSrc, 'utf8')
      .replace('standards-check@main', `standards-check@v${standardsVersion()}`)
    fs.writeFileSync(ciDest, pinned)
    created.push('.github/workflows/ci.yml')
  }
  return created
}

/** Accept greenfield or a guest alias; return the canonical posture string. */
export function normalizePosture(p) {
  if (!p) return 'greenfield'
  if (['guest', 'consultative-guest', 'brownfield'].includes(p)) return 'consultative-guest'
  return p
}

/** Validate a stack name, or throw with the accepted values. */
export function normalizeStack(s) {
  if (!s) return null
  if (!STACKS.includes(s)) throw new Error(`unknown stack: ${s} (expected ${STACKS.join(' or ')})`)
  return s
}

/** Uppercase a tracker prefix, or null when the project does not use one. */
export function normalizeTracker(t) {
  const v = (t ?? '').trim().toUpperCase()
  return /^[A-Z]{2,10}$/.test(v) ? v : null
}

/** The marker-delimited Lattice block embedded in AGENTS.md. */
export function latticeBlock({ version, posture, stack, tracker }) {
  const docs = stack ? [...standardDocs(), ...stackDocs()] : standardDocs()
  const pointers = docs.map((f) => `- ${VENDOR_DIR}/${f} - ${DOC_DESC[f] ?? 'standard'}`).join('\n')
  const lines = [
    BLOCK_START,
    `Standards: lattice-standards@${version}  (vendored in ${VENDOR_DIR}/)`,
    `Engagement posture: ${posture}`,
  ]
  if (stack) lines.push(`Lattice stack: ${stack}`)
  if (tracker) lines.push(`Tracker: ${tracker}`)
  lines.push('', 'Read the vendored standard before working here:', '', pointers, BLOCK_END)
  return lines.join('\n')
}

const STACK_SUMMARY = {
  'next-monorepo': [
    'Next.js monorepo on the Lattice stack (see .lattice/stack-baseline.md).',
    '',
    '- `apps/web` - Next.js App Router, Tailwind, shadcn/ui',
    '- `apps/api` - Next.js route handlers only',
    '- Supabase for storage, RLS enforced via Clerk as a third-party JWT issuer',
    '- Clerk for auth, Vercel for hosting',
  ].join('\n'),
  minimal: '<languages, frameworks, services>',
}

/** Full AGENTS.md for a fresh project. */
export function agentsMd({ name, version, posture, stack, tracker }) {
  return [
    `# ${name}`,
    '',
    latticeBlock({ version, posture, stack, tracker }),
    '',
    '## Project context',
    '<what this is, who the client is, current phase>',
    '',
    '## Stack',
    STACK_SUMMARY[stack] ?? '<languages, frameworks, services - or "inherits Lattice stack">',
    '',
    '## Architecture pointers',
    '<decisions already made; the why>',
    '',
    '## Environment & ops',
    '<env vars, deploy targets, migration rules>',
    '',
  ].join('\n')
}

/** Replace the Lattice block in existing content, or append it if absent. */
export function upsertBlock(content, block) {
  const re = new RegExp(escapeRe(BLOCK_START) + '[\\s\\S]*?' + escapeRe(BLOCK_END))
  if (re.test(content)) return content.replace(re, block)
  return content.trimEnd() + '\n\n' + block + '\n'
}

/** Read the pinned version from AGENTS.md content, or null. */
export function readPin(content) {
  const m = content.match(/lattice-standards@([\w.\-]+)/)
  return m ? m[1] : null
}

/** Read the engagement posture from AGENTS.md content, or null. */
export function readPosture(content) {
  const m = content.match(/Engagement posture:\s*(.+)/)
  return m ? m[1].trim() : null
}

/** Read the declared Lattice stack from AGENTS.md content, or null. */
export function readStack(content) {
  const m = content.match(/Lattice stack:\s*(.+)/)
  return m ? m[1].trim() : null
}

/** Read the ticket tracker prefix from AGENTS.md content, or null. */
export function readTracker(content) {
  const m = content.match(/Tracker:\s*(.+)/)
  return m ? m[1].trim() : null
}

/** Tracker prefix for a project on disk, or null. */
export function projectTracker(target) {
  const p = join(target, 'AGENTS.md')
  if (!fs.existsSync(p)) return null
  return readTracker(fs.readFileSync(p, 'utf8'))
}

/** Create CLAUDE.md as a symlink to AGENTS.md unless a CLAUDE.md exists. */
export function linkClaudeMd(target) {
  const p = join(target, 'CLAUDE.md')
  if (fs.existsSync(p)) return false
  fs.symlinkSync('AGENTS.md', p)
  return true
}

/** npm install hint pinned to the current standard version. */
export function installHint() {
  return `npm i -D github:${REPO_SLUG}#v${standardsVersion()}`
}

export { basename }

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
