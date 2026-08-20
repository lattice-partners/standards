// Interactive setup owns every command it can safely run and proves the
// resulting state before moving on. Browser-only provider work is recorded as
// explicit, non-secret evidence so the wizard remains resumable.

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import { resolve, join } from 'node:path'
import * as ui from './ui.js'
import { text, confirm, Cancelled } from './prompts.js'
import { VENDOR_DIR, HOOKS_PATH, readStack, standardsVersion, vendorHooks } from './lib.js'
import { auditDoctor, emptyEnvKeys, envKeyHint, setEnvLocalValue } from './workflow.js'
import {
  git,
  gitOk,
  isRepo,
  refExists,
  configGet,
  configSet,
  normalizeRemoteUrl,
  remoteHeads,
} from './git.js'
import { withScreen, currentScreen, screenDepth, runInTerminal } from './screen.js'
import {
  SUPABASE_CLI_VERSION,
  VERCEL_CLI_VERSION,
  captureCommand,
  hasSetupEvidence,
  openBrowser,
  privateTempFile,
  probeClerk,
  probeSupabase,
  probeVercel,
  readEnvFile,
  recordSetupEvidence,
  resolveCli,
  validateClerkKeys,
} from './services.js'

const LOCAL_API_URL = 'http://localhost:3001'

const STEPS = [
  { id: 'prerequisites', label: 'Prerequisites' },
  { id: 'identity', label: 'Git identity' },
  { id: 'github', label: 'GitHub remote' },
  { id: 'install', label: 'Dependencies and tools' },
  { id: 'supabase', label: 'Supabase' },
  { id: 'clerk', label: 'Clerk' },
  { id: 'vercel', label: 'Vercel' },
  { id: 'env', label: 'Local settings' },
  { id: 'health', label: 'Application health' },
]

function paintSetup(target, states) {
  const screen = currentScreen()
  if (!screen) return
  screen.setHeader({
    title: 'lattice setup',
    version: standardsVersion(),
    context: target,
    subtitle: 'Commands run here. Ctrl-C pauses; run lattice setup again to resume.',
  })
  screen.setProgress(STEPS.map((step) => ({ label: step.label, status: states[step.id] ?? 'pending' })))
}

function setState(target, states, id, state) {
  states[id] = state
  paintSetup(target, states)
}

function run(command, args, cwd) {
  return runInTerminal(command, args, cwd)
}

/** Re-export for callers that historically imported this helper from setup. */
export { normalizeRemoteUrl } from './git.js'

function hasGitIdentity(target) {
  return Boolean(configGet('user.email', target) || gitOk(['config', '--get', 'user.email'], target))
}

async function stepPrerequisites(target, states) {
  setState(target, states, 'prerequisites', 'active')
  const initial = auditDoctor(target)
  const prerequisiteIds = new Set(['node-version', 'npm-version', 'git-repository'])
  const pending = initial.results.filter((result) => prerequisiteIds.has(result.id) && !result.good)
  if (pending.length) {
    const { offerFixes } = await import('./fix.js')
    const after = await offerFixes(target, pending)
    if (after.some((result) => prerequisiteIds.has(result.id) && !result.good)) {
      setState(target, states, 'prerequisites', 'skip')
      return false
    }
  }
  setState(target, states, 'prerequisites', 'done')
  return true
}

async function stepGitIdentity(target, states) {
  if (hasGitIdentity(target)) {
    setState(target, states, 'identity', 'done')
    return true
  }
  setState(target, states, 'identity', 'active')
  const email = await text('Your git email', { hint: 'Stored in this repository only.' })
  const name = email ? await text('Your git name') : ''
  if (!email || !name) {
    setState(target, states, 'identity', 'skip')
    return false
  }
  git(['config', '--local', 'user.email', email], target)
  git(['config', '--local', 'user.name', name], target)
  const good = hasGitIdentity(target)
  setState(target, states, 'identity', good ? 'done' : 'skip')
  return good
}

function remoteHasRequiredBranches(target) {
  try {
    const heads = remoteHeads('origin', target)
    return heads.has('main') && heads.has('dev')
  } catch {
    return false
  }
}

async function stepGithubRemote(target, states) {
  setState(target, states, 'github', 'active')
  const existing = gitOk(['remote', 'get-url', 'origin'], target)
  if (!existing) {
    openBrowser('https://github.com/new')
    let url = null
    while (!url) {
      const raw = await text('GitHub clone URL', {
        hint: 'Create an empty repository in the browser. Paste its HTTPS or SSH clone URL here.',
      })
      if (!raw) {
        setState(target, states, 'github', 'skip')
        return false
      }
      url = normalizeRemoteUrl(raw)
      if (!url) ui.step.err('that is not a supported GitHub clone URL')
    }
    try {
      const heads = remoteHeads(url, target)
      if (heads.size) {
        ui.step.err('the GitHub repository is not empty; create an empty repository for this greenfield project')
        setState(target, states, 'github', 'skip')
        return false
      }
    } catch (error) {
      ui.step.err(`could not reach that GitHub repository: ${error.message}`)
      setState(target, states, 'github', 'skip')
      return false
    }
    git(['remote', 'add', 'origin', url], target)
  }

  if (!remoteHasRequiredBranches(target)) {
    if (!(await confirm('Push main and dev to GitHub now?', true))) {
      setState(target, states, 'github', 'skip')
      return false
    }
    if (!run('git', ['push', '-u', 'origin', 'main', 'dev'], target)) {
      setState(target, states, 'github', 'skip')
      return false
    }
  }
  const good = remoteHasRequiredBranches(target)
  setState(target, states, 'github', good ? 'done' : 'skip')
  return good
}

async function stepDependencies(target, states) {
  if (!fs.existsSync(join(target, 'package.json'))) {
    setState(target, states, 'install', 'skip')
    return true
  }
  setState(target, states, 'install', 'active')
  if (!fs.existsSync(join(target, 'node_modules'))) {
    if (!(await confirm('Install project dependencies now?', true)) || !run('npm', ['install', '--allow-git=all'], target)) {
      setState(target, states, 'install', 'skip')
      return false
    }
  }
  if (!resolveCli(target, 'supabase')) {
    const label = `npm install -D supabase@${SUPABASE_CLI_VERSION}`
    if (!(await confirm(`Install the pinned Supabase CLI now?`, true)) || !run('npm', ['install', '-D', `supabase@${SUPABASE_CLI_VERSION}`], target)) {
      ui.step.err(`${label} did not complete`)
      setState(target, states, 'install', 'skip')
      return false
    }
  }
  const supabase = resolveCli(target, 'supabase')
  const verified = Boolean(supabase && captureCommand(supabase, ['--version'], target).ok)
  setState(target, states, 'install', verified ? 'done' : 'skip')
  return verified
}

function updateLocalSettings(target, values) {
  const path = join(target, '.env.local')
  let content = fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : ''
  for (const [key, value] of Object.entries(values)) {
    if (value) content = setEnvLocalValue(content, key, value)
  }
  fs.writeFileSync(path, content.endsWith('\n') ? content : content + '\n', { mode: 0o600 })
}

async function stepSupabase(target, states) {
  setState(target, states, 'supabase', 'active')
  const command = resolveCli(target, 'supabase')
  if (!command) {
    setState(target, states, 'supabase', 'skip')
    return false
  }
  let probe = probeSupabase(target)
  if (probe.reason === 'Supabase CLI is not authenticated') {
    if (!(await confirm('Log in to Supabase now?', true)) || !run(command, ['login'], target)) {
      setState(target, states, 'supabase', 'skip')
      return false
    }
    probe = probeSupabase(target)
  }
  if (!probe.projectRef) {
    openBrowser('https://supabase.com/dashboard/new')
    const projectRef = await text('Supabase project ref', {
      hint: 'Create the project in the browser, then paste the ref from its dashboard URL.',
    })
    if (!projectRef || !/^[a-z0-9]{8,32}$/i.test(projectRef) || !run(command, ['link', '--project-ref', projectRef], target)) {
      setState(target, states, 'supabase', 'skip')
      return false
    }
    probe = probeSupabase(target)
  }
  if (probe.keys?.publishable && probe.keys?.secret && probe.projectRef) {
    updateLocalSettings(target, {
      NEXT_PUBLIC_SUPABASE_URL: `https://${probe.projectRef}.supabase.co`,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: probe.keys.publishable,
      SUPABASE_SECRET_KEY: probe.keys.secret,
    })
  }
  if (!probe.pitr && probe.projectRef) {
    openBrowser(`https://supabase.com/dashboard/project/${probe.projectRef}/settings/addons`)
    await confirm('Enable Point-in-Time Recovery in the browser, then re-check?', true)
    probe = probeSupabase(target)
  }
  if (probe.good) recordSetupEvidence(target, 'Supabase PITR', probe.projectRef)
  setState(target, states, 'supabase', probe.good ? 'done' : 'skip')
  if (!probe.good) ui.step.err(probe.reason)
  return probe.good
}

async function stepClerk(target, states) {
  setState(target, states, 'clerk', 'active')
  const localPath = join(target, '.env.local')
  let values = readEnvFile(localPath)
  if (!validateClerkKeys(values).good) {
    openBrowser('https://dashboard.clerk.com/~/api-keys')
    const publishable = await text('Clerk publishable key', { hint: 'Starts with pk_test_ or pk_live_.' })
    const secret = await text('Clerk secret key', { hint: 'Starts with sk_test_ or sk_live_. It will not be displayed.', mask: true })
    updateLocalSettings(target, {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: publishable,
      CLERK_SECRET_KEY: secret,
    })
    values = readEnvFile(localPath)
  }
  const clerk = await probeClerk(target)
  if (!clerk.good) {
    ui.step.err(clerk.reason)
    setState(target, states, 'clerk', 'skip')
    return false
  }
  openBrowser('https://dashboard.clerk.com/setup/supabase')
  const evidenceLabel = 'Clerk to Supabase integration'
  if (!hasSetupEvidence(target, evidenceLabel) && !(await confirm('Confirm the Clerk to Supabase integration is active?', false))) {
    setState(target, states, 'clerk', 'skip')
    return false
  }
  if (!hasSetupEvidence(target, evidenceLabel)) recordSetupEvidence(target, evidenceLabel, clerk.environment)
  setState(target, states, 'clerk', 'done')
  return true
}

async function ensureVercelCli(target) {
  let command = resolveCli(target, 'vercel')
  if (command) return command
  if (!(await confirm(`Install Vercel CLI ${VERCEL_CLI_VERSION} globally now?`, true))) return null
  if (!run('npm', ['install', '-g', `vercel@${VERCEL_CLI_VERSION}`], target)) return null
  command = resolveCli(target, 'vercel')
  return command && captureCommand(command, ['--version'], target).ok ? command : null
}

async function linkVercelApp(target, command, app) {
  const appPath = join(target, 'apps', app)
  if (fs.existsSync(join(appPath, '.vercel', 'project.json'))) return true
  const project = await text(`Vercel ${app} project name`)
  const team = project ? await text('Vercel team slug', { hint: 'Leave blank for your personal account.' }) : ''
  if (!project) return false
  const args = ['link', '--yes', '--project', project, '--cwd', appPath]
  if (team) args.push('--team', team)
  return run(command, args, target)
}

function mergePulledEnv(target, pulledPath) {
  const values = readEnvFile(pulledPath)
  const allowed = [
    'API_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_SECRET_KEY',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
  ]
  updateLocalSettings(target, Object.fromEntries(allowed.map((key) => [key, values[key]])))
  return values
}

async function stepVercel(target, states) {
  setState(target, states, 'vercel', 'active')
  const command = await ensureVercelCli(target)
  if (!command) {
    setState(target, states, 'vercel', 'skip')
    return false
  }
  if (!captureCommand(command, ['whoami'], target).ok) {
    if (!(await confirm('Log in to Vercel now?', true)) || !run(command, ['login'], target)) {
      setState(target, states, 'vercel', 'skip')
      return false
    }
  }
  if (!(await linkVercelApp(target, command, 'web')) || !(await linkVercelApp(target, command, 'api'))) {
    setState(target, states, 'vercel', 'skip')
    return false
  }
  const pulled = {}
  for (const app of ['web', 'api']) {
    const temporary = privateTempFile(`lattice-vercel-${app}`)
    try {
      if (run(command, ['env', 'pull', temporary.path, '--yes', '--cwd', join(target, 'apps', app)], target)) {
        pulled[app] = mergePulledEnv(target, temporary.path)
      }
    } finally {
      fs.rmSync(temporary.directory, { recursive: true, force: true })
    }
  }
  const sharedKeys = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
  ]
  const mismatch = pulled.web && pulled.api && sharedKeys.find((key) => pulled.web[key] && pulled.api[key] && pulled.web[key] !== pulled.api[key])
  if (mismatch) {
    ui.step.err(`the web and API Vercel projects do not share the same ${mismatch} value`)
    setState(target, states, 'vercel', 'skip')
    return false
  }
  let probe = probeVercel(target)
  if (!probe.good) {
    ui.step.warn(probe.reason)
    openBrowser('https://vercel.com/dashboard')
    await confirm('Finish the Vercel env and firewall settings in the browser, then re-check?', true)
    probe = probeVercel(target)
  }
  const evidenceLabel = 'Vercel project root and deployment controls'
  if (probe.good && !hasSetupEvidence(target, evidenceLabel)) {
    const confirmed = await confirm('Confirm both Vercel root directories, staging branch, and manual production promotion are configured?', false)
    if (!confirmed) probe = { ...probe, good: false, reason: 'Vercel dashboard controls are not confirmed' }
    else recordSetupEvidence(target, evidenceLabel, `${probe.web.projectId}/${probe.api.projectId}`)
  }
  if (probe.good) recordSetupEvidence(target, 'Vercel projects and firewall', `${probe.web.projectId}/${probe.api.projectId}`)
  setState(target, states, 'vercel', probe.good ? 'done' : 'skip')
  if (!probe.good) ui.step.err(probe.reason)
  return probe.good
}

async function stepEnvLocal(target, states) {
  const examplePath = join(target, '.env.example')
  if (!fs.existsSync(examplePath)) {
    setState(target, states, 'env', 'skip')
    return true
  }
  const localPath = join(target, '.env.local')
  if (!fs.existsSync(localPath)) fs.copyFileSync(examplePath, localPath)
  setState(target, states, 'env', 'active')
  const example = fs.readFileSync(examplePath, 'utf8')
  for (const key of emptyEnvKeys(target)) {
    const value = await text(key, {
      defaultValue: key === 'API_URL' ? LOCAL_API_URL : '',
      hint: envKeyHint(example, key),
      mask: /SECRET|TOKEN|PASSWORD/.test(key),
    })
    if (value) updateLocalSettings(target, { [key]: value })
  }
  const good = emptyEnvKeys(target).length === 0
  setState(target, states, 'env', good ? 'done' : 'skip')
  return good
}

async function stepDevBranch(target) {
  if (!isRepo(target) || refExists('dev', target)) return true
  git(['branch', 'dev'], target)
  return true
}

async function stepHooks(target) {
  if (!fs.existsSync(join(target, HOOKS_PATH)) || !isRepo(target)) return true
  vendorHooks(target)
  const existing = configGet('core.hooksPath', target)
  if (existing && existing !== HOOKS_PATH) return true
  configSet('core.hooksPath', HOOKS_PATH, target)
  return true
}

/** Poll the web and API endpoints until both respond or the timeout expires. */
export async function waitForHealth(fetcher = globalThis.fetch, timeoutMs = 60_000, intervalMs = 500) {
  const deadline = Date.now() + timeoutMs
  const urls = ['http://localhost:3000', 'http://localhost:3001/api/health']
  while (Date.now() < deadline) {
    const results = await Promise.all(urls.map(async (url) => {
      try {
        return (await fetcher(url)).ok
      } catch {
        return false
      }
    }))
    if (results.every(Boolean)) return true
    await new Promise((resolveDelay) => setTimeout(resolveDelay, intervalMs))
  }
  return false
}

/** Start the real development command, prove both apps respond, then clean up. */
export async function smokeDev(target, options = {}) {
  const screen = currentScreen()
  if (screen) screen.suspend()
  const child = (options.spawnImpl || spawn)('npm', ['run', 'dev'], {
    cwd: target,
    stdio: 'inherit',
    detached: process.platform !== 'win32',
  })
  let stopped = false
  let resolveInterrupted
  const interrupted = new Promise((resolvePromise) => {
    resolveInterrupted = resolvePromise
  })
  const exited = new Promise((resolvePromise) => {
    child.once('error', () => resolvePromise(false))
    child.once('exit', () => resolvePromise(false))
  })
  const stop = () => {
    if (stopped) return
    stopped = true
    resolveInterrupted(false)
    if (child.pid && process.platform !== 'win32') {
      try {
        process.kill(-child.pid, 'SIGTERM')
      } catch {
        child.kill('SIGTERM')
      }
    } else child.kill('SIGTERM')
  }
  process.once('SIGINT', stop)
  try {
    const healthy = await Promise.race([
      waitForHealth(options.fetcher, options.timeoutMs, options.intervalMs),
      interrupted,
      exited,
    ])
    stop()
    await Promise.race([exited, new Promise((resolveDelay) => setTimeout(resolveDelay, 2_000))])
    return healthy
  } finally {
    process.off('SIGINT', stop)
    if (screen) screen.resume()
  }
}

async function stepHealth(target, states) {
  setState(target, states, 'health', 'active')
  if (!(await confirm('Start the app and verify both health endpoints now?', true))) {
    setState(target, states, 'health', 'skip')
    return false
  }
  const good = await smokeDev(target)
  setState(target, states, 'health', good ? 'done' : 'skip')
  if (!good) ui.step.err('the web and API apps did not both become healthy within 60 seconds')
  return good
}

function showDoctorResults(results) {
  const screen = currentScreen()
  if (screen) {
    screen.logs = []
    screen.panel = null
    for (const result of results) {
      screen.log(result.good ? 'ok' : 'err', result.good ? result.message : `${result.message}${result.remediation ? ` (${result.remediation})` : ''}`)
    }
    return
  }
  for (const result of results) {
    if (result.good) ui.step.ok(result.message)
    else ui.step.err(`${result.message}${result.remediation ? ` ${ui.gray(`(${result.remediation})`)}` : ''}`)
  }
}

async function runSetup(target) {
  const states = {}
  paintSetup(target, states)
  if (!(await stepPrerequisites(target, states))) return 1
  await stepGitIdentity(target, states)
  await stepDevBranch(target)
  await stepGithubRemote(target, states)
  await stepDependencies(target, states)
  await stepHooks(target)

  const agentsPath = join(target, 'AGENTS.md')
  const stack = fs.existsSync(agentsPath) ? readStack(fs.readFileSync(agentsPath, 'utf8')) : null
  if (stack === 'next-monorepo') {
    await stepSupabase(target, states)
    await stepClerk(target, states)
    await stepVercel(target, states)
  } else {
    for (const id of ['supabase', 'clerk', 'vercel']) setState(target, states, id, 'skip')
  }
  await stepEnvLocal(target, states)

  let final = auditDoctor(target)
  if (final.problems) {
    const { offerFixes } = await import('./fix.js')
    final = { results: await offerFixes(target, final.results) }
    final.problems = final.results.filter((result) => !result.good).length
  }
  showDoctorResults(final.results)

  const required = stack === 'next-monorepo'
    ? ['prerequisites', 'identity', 'github', 'install', 'supabase', 'clerk', 'vercel', 'env']
    : ['prerequisites', 'identity', 'github']
  const incomplete = required.filter((id) => states[id] !== 'done')
  if (final.problems || incomplete.length) {
    ui.step.warn(`setup is incomplete; ${final.problems + incomplete.length} check(s) still need attention`)
    return 1
  }
  if (stack === 'next-monorepo') {
    if (!(await stepHealth(target, states))) return 1
  } else setState(target, states, 'health', 'skip')

  ui.box(`Ready to go  ${ui.S.dot}  ${standardsVersion()}`, [
    ui.bold('Verified full stack'),
    `${ui.gray('web')}  http://localhost:3000`,
    `${ui.gray('api')}  http://localhost:3001/api/health`,
    '',
    `${ui.gray('run')} ${ui.cyan('npm run dev')}  ${ui.gray('to keep working')}`,
    `${ui.gray('run')} ${ui.cyan('lattice ticket MIN-155')}  ${ui.gray('to start ticket work')}`,
  ])
  return 0
}

/** Walk through complete new-project setup in the current interactive terminal. */
export async function setup(opts = {}) {
  const target = resolve(process.cwd(), opts.dir ?? '.')
  if (!ui.interactive) {
    ui.step.err('lattice setup needs an interactive terminal')
    ui.step.note('Run lattice doctor for a non-interactive status report.')
    return 1
  }
  if (!fs.existsSync(join(target, VENDOR_DIR))) {
    ui.step.err('this folder is not a Lattice project yet')
    ui.step.note('run lattice init first')
    return 1
  }
  try {
    return await withScreen(async () => {
      const code = await runSetup(target)
      if (screenDepth() === 1) await currentScreen()?.wait('enter to exit')
      return code
    })
  } catch (error) {
    if (error instanceof Cancelled) {
      ui.step.warn('setup paused; run lattice setup to continue')
      return 1
    }
    throw error
  }
}
