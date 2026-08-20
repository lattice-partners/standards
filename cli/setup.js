// Interactive setup wizard: walk a new project from scaffold to runnable.
// Full-screen on a TTY. Non-interactive environments get a pointer to the README.

import { resolve, join } from 'node:path'
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import * as ui from './ui.js'
import { text, confirm, Cancelled } from './prompts.js'
import { VENDOR_DIR, HOOKS_PATH, readStack, standardsVersion, vendorHooks } from './lib.js'
import {
  auditDoctor,
  emptyEnvKeys,
  envKeyHint,
  setEnvLocalValue,
} from './workflow.js'
import { git, gitOk, isRepo, refExists, configGet, configSet } from './git.js'
import { withScreen, currentScreen, screenDepth } from './screen.js'

const LOCAL_API_URL = 'http://localhost:3001'

const STEPS = [
  { id: 'identity', label: 'Git identity' },
  { id: 'github', label: 'GitHub remote' },
  { id: 'install', label: 'Install dependencies' },
  { id: 'services', label: 'External services' },
  { id: 'env', label: 'Local settings' },
]

function paintSetup(target, states) {
  const s = currentScreen()
  if (!s) return
  s.setHeader({
    title: 'lattice setup',
    version: standardsVersion(),
    context: target,
    subtitle: 'Ctrl-C pauses. Run lattice setup again to continue.',
  })
  s.setProgress(STEPS.map((step) => ({ label: step.label, status: states[step.id] ?? 'pending' })))
}

function run(cmd, args, cwd) {
  const s = currentScreen()
  if (s) s.suspend()
  try {
    const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', encoding: 'utf8' })
    return r.status === 0
  } finally {
    if (s) s.resume()
  }
}

/** Normalise a GitHub remote pasted by a human. */
export function normalizeRemoteUrl(input) {
  const u = input.trim()
  if (!u) return null
  if (/^git@github\.com:/.test(u)) return u
  const https = u.match(/^https:\/\/github\.com\/([^/]+\/[^/\s#?]+?)(?:\.git)?\/?$/i)
  if (https) return `git@github.com:${https[1]}.git`
  const short = u.match(/^(?:https?:\/\/)?github\.com\/([^/]+\/[^/\s#?]+?)(?:\.git)?\/?$/i)
  if (short) return `git@github.com:${short[1]}.git`
  return null
}

function hasGitIdentity(target) {
  return Boolean(configGet('user.email', target) || gitOk(['config', '--get', 'user.email'], target))
}

async function stepGitIdentity(target, states) {
  if (hasGitIdentity(target)) {
    states.identity = 'done'
    paintSetup(target, states)
    return true
  }
  states.identity = 'active'
  paintSetup(target, states)
  const email = await text('Your git email', {
    hint: 'Git needs your name and email before the first push.',
  })
  if (!email) {
    states.identity = 'skip'
    paintSetup(target, states)
    return false
  }
  const name = await text('Your git name')
  git(['config', '--local', 'user.email', email], target)
  if (name) git(['config', '--local', 'user.name', name], target)
  states.identity = 'done'
  paintSetup(target, states)
  return true
}

async function stepGithubRemote(target, states) {
  if (gitOk(['remote', 'get-url', 'origin'], target)) {
    states.github = 'done'
    paintSetup(target, states)
    return true
  }

  states.github = 'active'
  paintSetup(target, states)

  for (;;) {
    const raw = await text('GitHub remote URL', {
      hint: 'Create an empty repository on GitHub (no README or .gitignore), then paste its clone URL. Leave blank to skip.',
    })
    if (!raw) {
      states.github = 'skip'
      paintSetup(target, states)
      return false
    }
    const url = normalizeRemoteUrl(raw)
    if (url) {
      git(['remote', 'add', 'origin', url], target)
      break
    }
    ui.step.err('that does not look like a GitHub URL; try again')
  }

  if (!(await confirm('Push main and dev to GitHub now?', true))) {
    states.github = 'done'
    paintSetup(target, states)
    return true
  }

  if (!hasGitIdentity(target)) {
    ui.step.warn('set git user.email first, then push')
    states.github = 'done'
    paintSetup(target, states)
    return true
  }

  const ok = run('git', ['push', '-u', 'origin', 'main', 'dev'], target)
  if (!ok) ui.step.warn('push failed; when ready: git push -u origin main dev')
  states.github = 'done'
  paintSetup(target, states)
  return ok
}

async function stepNpmInstall(target, states) {
  if (!fs.existsSync(join(target, 'package.json'))) {
    states.install = 'skip'
    paintSetup(target, states)
    return true
  }
  if (fs.existsSync(join(target, 'node_modules'))) {
    states.install = 'done'
    paintSetup(target, states)
    return true
  }

  states.install = 'active'
  paintSetup(target, states)
  if (!(await confirm('Run npm install now?', true))) {
    states.install = 'skip'
    paintSetup(target, states)
    return false
  }
  const ok = run('npm', ['install', '--allow-git=all'], target)
  if (!ok) ui.step.err('npm install failed; fix the error and run: npm install --allow-git=all')
  states.install = ok ? 'done' : 'skip'
  paintSetup(target, states)
  return ok
}

async function stepExternalServices(target, states) {
  const agentsPath = join(target, 'AGENTS.md')
  const stack = fs.existsSync(agentsPath) ? readStack(fs.readFileSync(agentsPath, 'utf8')) : null
  if (stack !== 'next-monorepo') {
    states.services = 'skip'
    paintSetup(target, states)
    return true
  }

  states.services = 'active'
  paintSetup(target, states)
  await text('Press enter when you have started this (or leave blank to skip)', {
    hint: [
      'Do these in order:',
      '1. Supabase: create the project, enable Point-in-Time Recovery before the first migration',
      '2. Clerk: create the application',
      '3. Supabase: wire Clerk as a third-party auth provider',
      '4. Vercel: two projects (apps/web and apps/api), link, env vars per environment',
      '5. Vercel Firewall: rate-limit rules on the api project',
    ].join(' '),
  })
  states.services = 'done'
  paintSetup(target, states)
  return true
}

async function stepEnvLocal(target, states) {
  const examplePath = join(target, '.env.example')
  if (!fs.existsSync(examplePath)) {
    states.env = 'skip'
    paintSetup(target, states)
    return true
  }

  const localPath = join(target, '.env.local')
  if (!fs.existsSync(localPath)) fs.copyFileSync(examplePath, localPath)

  let missing = emptyEnvKeys(target)
  if (!missing.length) {
    states.env = 'done'
    paintSetup(target, states)
    return true
  }

  states.env = 'active'
  paintSetup(target, states)

  const example = fs.readFileSync(examplePath, 'utf8')
  let content = fs.readFileSync(localPath, 'utf8')

  for (const key of [...missing]) {
    const hint = envKeyHint(example, key)
    const def = key === 'API_URL' ? LOCAL_API_URL : ''
    const value = await text(key, { defaultValue: def, hint })
    if (!value) continue
    content = setEnvLocalValue(content, key, value)
    fs.writeFileSync(localPath, content)
  }

  missing = emptyEnvKeys(target)
  states.env = missing.length ? 'skip' : 'done'
  paintSetup(target, states)
  return missing.length === 0
}

async function stepDevBranch(target) {
  if (!isRepo(target) || refExists('dev', target)) return true
  git(['branch', 'dev'], target)
  return true
}

async function stepHooks(target) {
  if (!fs.existsSync(join(target, HOOKS_PATH))) return true
  if (!isRepo(target)) return true
  vendorHooks(target)
  const existing = configGet('core.hooksPath', target)
  if (existing && existing !== HOOKS_PATH) return true
  configSet('core.hooksPath', HOOKS_PATH, target)
  return true
}

async function runSetup(target) {
  const s = currentScreen()
  const states = {}
  paintSetup(target, states)

  const { problems } = auditDoctor(target)
  if (problems && s) s.log('warn', `${problems} issue(s) to fix as we go`)

  await stepGitIdentity(target, states)
  await stepDevBranch(target)
  await stepGithubRemote(target, states)
  await stepNpmInstall(target, states)
  await stepHooks(target)
  await stepExternalServices(target, states)
  await stepEnvLocal(target, states)

  const final = auditDoctor(target)
  if (s) {
    s.logs = []
    s.panel = null
    for (const [good, msg, fix] of final.results) {
      s.log(good ? 'ok' : 'err', good ? msg : `${msg}${fix ? ` (${fix})` : ''}`)
    }
  } else {
    for (const [good, msg, fix] of final.results) {
      if (good) ui.step.ok(msg)
      else ui.step.err(`${msg}${fix ? ` ${ui.gray(`(${fix})`)}` : ''}`)
    }
  }

  if (final.problems === 0) {
    ui.box(`Ready to go  ${ui.S.dot}  ${standardsVersion()}`, [
      ui.bold('Start the app'),
      `${ui.gray('run')} ${ui.cyan('npm run dev')}`,
      `${ui.gray('web')}  http://localhost:3000`,
      `${ui.gray('api')}  http://localhost:3001`,
      '',
      ui.bold('Day to day'),
      `${ui.gray('run')} ${ui.cyan('lattice ticket MIN-155')}  ${ui.gray('to start work')}`,
      `${ui.gray('read')} RUNBOOK.md  ${ui.gray('for operations')}`,
    ])
    return 0
  }

  ui.step.warn(`${final.problems} thing(s) still to fix. Run lattice setup again when ready.`)
  return 1
}

/** Walk through new-project setup interactively. */
export async function setup(opts = {}) {
  const target = resolve(process.cwd(), opts.dir ?? '.')

  if (!ui.interactive) {
    ui.step.err('lattice setup needs an interactive terminal')
    ui.step.note('Follow the setup steps in README.md, or run: lattice doctor')
    return 1
  }

  if (!fs.existsSync(join(target, VENDOR_DIR))) {
    ui.step.err('this folder is not a Lattice project yet')
    ui.step.note('run: lattice init')
    return 1
  }

  try {
    return await withScreen(async () => {
      const code = await runSetup(target)
      if (screenDepth() === 1) await currentScreen()?.wait('enter to exit')
      return code
    })
  } catch (err) {
    if (err instanceof Cancelled) {
      ui.step.warn('setup paused; run lattice setup to continue')
      return 1
    }
    throw err
  }
}
