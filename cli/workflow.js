// Ticket and release commands, plus the two plain-English status commands a
// non-technical teammate needs: doctor (is my machine right?) and verify
// (is this safe to ship?).

import { resolve, join } from 'node:path'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import * as ui from './ui.js'
import { HOOKS_PATH, VENDOR_DIR, projectTracker, hooksInstalled, standardsVersion, MIN_NODE_MAJOR } from './lib.js'
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

function runningNpmMajor() {
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

function nodeTooOld() {
  const [maj] = process.versions.node.split('.').map(Number)
  return maj < MIN_NODE_MAJOR
}

/** Structured pre-flight results for doctor and setup. */
export function auditDoctor(target) {
  const results = []
  const ok = (m) => results.push([true, m])
  const bad = (m, fix) => results.push([false, m, fix])

  if (nodeTooOld()) bad(`Node ${process.versions.node} is too old`, `install Node ${MIN_NODE_MAJOR} or newer`)
  else ok(`Node ${process.versions.node}`)

  const npmPin = requiredNpmMajor(target)
  if (npmPin !== null) {
    const npmMajor = runningNpmMajor()
    if (npmMajor === null) bad('could not detect npm version', `install npm@${npmPin}`)
    else if (npmMajor < npmPin) bad(`npm ${npmMajor} is too old (project requires ${npmPin})`, `npm i -g npm@${npmPin}`)
    else ok(`npm ${npmMajor}`)
  }

  if (!isRepo(target)) {
    bad('this folder is not a git repository', 'run: git init')
  } else {
    ok('git repository')
    const who = configGet('user.email', target) || gitOk(['config', '--get', 'user.email'], target)
    if (who) ok('git knows who you are')
    else bad('git does not know your email', 'run: git config user.email you@example.com')
    if (refExists('dev', target)) ok('dev branch exists')
    else bad('no dev branch', 'run: git branch dev')
    if (gitOk(['remote', 'get-url', 'origin'], target)) ok('origin remote is set')
    else bad('no origin remote', 'create a GitHub repo and run: git remote add origin <url>')
  }

  if (fs.existsSync(join(target, VENDOR_DIR))) ok('standards are installed')
  else bad('the standard is not installed here', 'run: lattice init')

  if (expectsHooks(target)) {
    if (!fs.existsSync(join(target, HOOKS_PATH))) {
      bad('safety checks are not installed', 'run: lattice hooks install')
    } else if (hooksInstalled(target)) ok('safety checks run before every commit')
    else bad('safety checks are not switched on', 'run: lattice hooks install')
  } else if (fs.existsSync(join(target, HOOKS_PATH))) {
    if (hooksInstalled(target)) ok('safety checks run before every commit')
    else bad('safety checks are not switched on', 'run: lattice hooks install')
  }

  if (fs.existsSync(join(target, 'package.json')) && !fs.existsSync(join(target, 'node_modules'))) {
    bad('dependencies are not installed', 'run: npm install')
  }

  const example = join(target, '.env.example')
  if (fs.existsSync(example)) {
    const keys = requiredEnvKeys(example)
    const local = join(target, '.env.local')
    if (keys.length) {
      if (!fs.existsSync(local)) {
        bad('you have no local settings file', 'copy .env.example to .env.local and fill it in')
      } else {
        const content = fs.readFileSync(local, 'utf8')
        const empty = keys.filter((k) => !envLocalValue(content, k))
        if (empty.length) bad(`settings missing or empty: ${empty.join(', ')}`, 'fill them in .env.local')
        else ok('local settings file has values for every required key')
      }
    }
  }

  const prefix = projectTracker(target)
  if (prefix) ok(`tickets use the ${prefix} prefix`)

  const branch = currentBranch(target)
  if (branch) ok(`you are on branch ${branch}`)

  const problems = results.filter(([g]) => !g).length
  return { results, problems }
}

/** Check the developer's machine is set up. Written to be read by anyone. */
export function doctor(opts = {}) {
  const target = resolve(process.cwd(), opts.dir ?? '.')
  const { results, problems } = auditDoctor(target)

  for (const [good, msg, fix] of results) {
    if (good) ui.step.ok(msg)
    else ui.step.err(`${msg}${fix ? ` ${ui.gray(`(${fix})`)}` : ''}`)
  }
  console.log('')
  if (!problems) {
    ui.step.ok('Your setup looks good.')
    return 0
  }
  ui.step.warn(`${problems} thing(s) to fix above before you start.`)
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
