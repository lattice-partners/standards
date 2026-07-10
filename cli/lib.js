// Shared helpers for the lattice CLI: locating the installed standard,
// vendoring core docs into a project, and reading/writing AGENTS.md.

import { fileURLToPath } from 'node:url'
import { dirname, join, basename } from 'node:path'
import fs from 'node:fs'

// Files in templates/greenfield/ whose vendored name differs from the source
// name (npm strips a real .gitignore from published packages).
const RENAME_ON_COPY = { gitignore: '.gitignore' }

const CLI_DIR = dirname(fileURLToPath(import.meta.url))

/** Root of the installed lattice-standards package (parent of cli/). */
export const PKG_ROOT = dirname(CLI_DIR)

/** GitHub slug projects install from; used only for the printed install hint. */
export const REPO_SLUG = 'lattice-partners/standards'

/** Directory the standard is vendored into inside a project. */
export const VENDOR_DIR = '.lattice'

const BLOCK_START = '<!-- lattice:standards -->'
const BLOCK_END = '<!-- /lattice:standards -->'

const DOC_DESC = {
  'agents-base.md': 'base engineering standard',
  'working-agreement.md': 'posture, rituals, commit discipline, DoD',
  'security-baseline.md': 'non-negotiable security rules',
}

/** Version of the installed standard, from the package VERSION file. */
export function standardsVersion() {
  return fs.readFileSync(join(PKG_ROOT, 'VERSION'), 'utf8').trim()
}

function coreDir() {
  return join(PKG_ROOT, 'core')
}

/** Filenames of the top-level standard docs shipped in core/. */
export function standardDocs() {
  return fs
    .readdirSync(coreDir())
    .filter((f) => f.endsWith('.md'))
    .sort()
}

/** Copy the standard docs into <target>/.lattice/, stamping the version. */
export function vendorCore(target) {
  const dst = join(target, VENDOR_DIR)
  fs.mkdirSync(dst, { recursive: true })
  const docs = standardDocs()
  for (const f of docs) fs.copyFileSync(join(coreDir(), f), join(dst, f))
  fs.writeFileSync(join(dst, 'VERSION'), standardsVersion() + '\n')
  return docs
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
  return fs.readFileSync(vp, 'utf8') !== fs.readFileSync(join(coreDir(), file), 'utf8')
}

/** Seed a project's memory/ from the template, unless one already exists. */
export function seedMemory(target) {
  const src = join(coreDir(), 'memory-template')
  const dst = join(target, 'memory')
  if (!fs.existsSync(src) || fs.existsSync(dst)) return false
  fs.cpSync(src, dst, { recursive: true })
  return true
}

/**
 * Lay down greenfield stack config (tsconfig, eslint, prettier, gitignore) and
 * the CI workflow. Skips any file that already exists. Returns created paths.
 */
export function scaffoldStack(target) {
  const created = []
  const gfDir = join(PKG_ROOT, 'templates', 'greenfield')
  if (fs.existsSync(gfDir)) {
    for (const f of fs.readdirSync(gfDir)) {
      if (f === '.gitkeep') continue
      const dest = RENAME_ON_COPY[f] ?? f
      const dp = join(target, dest)
      if (fs.existsSync(dp)) continue
      fs.copyFileSync(join(gfDir, f), dp)
      created.push(dest)
    }
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

/** The marker-delimited Lattice block embedded in AGENTS.md. */
export function latticeBlock({ version, posture }) {
  const pointers = standardDocs()
    .map((f) => `- ${VENDOR_DIR}/${f} - ${DOC_DESC[f] ?? 'standard'}`)
    .join('\n')
  return [
    BLOCK_START,
    `Standards: lattice-standards@${version}  (vendored in ${VENDOR_DIR}/)`,
    `Engagement posture: ${posture}`,
    '',
    'Read the vendored standard before working here:',
    '',
    pointers,
    BLOCK_END,
  ].join('\n')
}

/** Full AGENTS.md for a fresh project. */
export function agentsMd({ name, version, posture }) {
  return [
    `# ${name}`,
    '',
    latticeBlock({ version, posture }),
    '',
    '## Project context',
    '<what this is, who the client is, current phase>',
    '',
    '## Stack',
    '<languages, frameworks, services - or "inherits Lattice stack">',
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
