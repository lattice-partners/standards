// Ticket and release commands, plus the two plain-English status commands a
// non-technical teammate needs: doctor (is my machine right?) and verify
// (is this safe to ship?).

import { resolve, join } from 'node:path'
import fs from 'node:fs'
import * as ui from './ui.js'
import { HOOKS_PATH, VENDOR_DIR, projectTracker, hooksInstalled, standardsVersion } from './lib.js'
import { check } from './commands.js'
import { projectGate } from './hooks.js'
import { git, gitOk, isRepo, refExists, currentBranch, commitSubjects, configGet } from './git.js'

const MIN_NODE = [20, 9]

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
  const [maj, min] = process.versions.node.split('.').map(Number)
  return maj < MIN_NODE[0] || (maj === MIN_NODE[0] && min < MIN_NODE[1])
}

/** Check the developer's machine is set up. Written to be read by anyone. */
export function doctor(opts = {}) {
  const target = resolve(process.cwd(), opts.dir ?? '.')
  const results = []
  const ok = (m) => results.push([true, m])
  const bad = (m, fix) => results.push([false, m, fix])

  if (nodeTooOld()) bad(`Node ${process.versions.node} is too old`, `install Node ${MIN_NODE.join('.')} or newer`)
  else ok(`Node ${process.versions.node}`)

  if (!isRepo(target)) {
    bad('this folder is not a git repository', 'run: git init')
  } else {
    ok('git repository')
    const who = configGet('user.email', target) || gitOk(['config', '--get', 'user.email'], target)
    if (who) ok('git knows who you are')
    else bad('git does not know your email', 'run: git config user.email you@example.com')
  }

  if (fs.existsSync(join(target, VENDOR_DIR))) ok('standards are installed')
  else bad('the standard is not installed here', 'run: lattice init')

  if (fs.existsSync(join(target, HOOKS_PATH))) {
    if (hooksInstalled(target)) ok('safety checks run before every commit')
    else bad('safety checks are not switched on', 'run: lattice hooks install')
  }

  if (fs.existsSync(join(target, 'package.json')) && !fs.existsSync(join(target, 'node_modules'))) {
    bad('dependencies are not installed', 'run: npm install')
  }

  const example = join(target, '.env.example')
  if (fs.existsSync(example) && !fs.existsSync(join(target, '.env.local'))) {
    bad('you have no local settings file', 'copy .env.example to .env.local and fill it in')
  }

  const prefix = projectTracker(target)
  if (prefix) ok(`tickets use the ${prefix} prefix`)

  const branch = currentBranch(target)
  if (branch) ok(`you are on branch ${branch}`)

  for (const [good, msg, fix] of results) {
    if (good) ui.step.ok(msg)
    else ui.step.err(`${msg}${fix ? ` ${ui.gray(`(${fix})`)}` : ''}`)
  }
  const problems = results.filter(([g]) => !g).length
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
