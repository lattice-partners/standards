// Interactive setup wizard: walk a new project from scaffold to runnable.
// Non-interactive environments get a pointer to README.md and lattice doctor.

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

const LOCAL_API_URL = 'http://localhost:3001'

function section(title) {
  console.log('')
  ui.step.info(ui.bold(title))
}

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', encoding: 'utf8' })
  return r.status === 0
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

async function stepGitIdentity(target) {
  if (hasGitIdentity(target)) return true
  section('Git identity')
  ui.step.note('Git needs your name and email before the first push.')
  try {
    const email = await text('Your git email')
    if (!email) {
      ui.step.warn('skipped; set user.email before pushing')
      return false
    }
    const name = await text('Your git name')
    git(['config', '--local', 'user.email', email], target)
    if (name) git(['config', '--local', 'user.name', name], target)
    ui.step.ok(`git will commit as ${ui.gray(email)}`)
    return true
  } catch (err) {
    if (err instanceof Cancelled) throw err
    throw err
  }
}

async function stepGithubRemote(target) {
  if (gitOk(['remote', 'get-url', 'origin'], target)) {
    ui.step.ok(`origin is ${ui.gray(git(['remote', 'get-url', 'origin'], target))}`)
    return true
  }

  section('GitHub remote')
  ui.step.note('Create an empty repository on GitHub (no README or .gitignore).')
  ui.step.note('Then paste its clone URL here (HTTPS or git@).')

  try {
    for (;;) {
      const raw = await text('GitHub remote URL (blank to skip for now)')
      if (!raw) {
        ui.step.warn('skipped; run: git remote add origin <url>')
        return false
      }
      const url = normalizeRemoteUrl(raw)
      if (url) {
        git(['remote', 'add', 'origin', url], target)
        ui.step.ok(`added origin ${ui.gray(url)}`)
        break
      }
      ui.step.err('that does not look like a GitHub URL; try again')
    }

    if (!(await confirm('Push main and dev to GitHub now?', true))) {
      ui.step.note('when ready: git push -u origin main dev')
      return true
    }

    if (!hasGitIdentity(target)) {
      ui.step.warn('set git user.email first, then push')
      return true
    }

    const ok = run('git', ['push', '-u', 'origin', 'main', 'dev'], target)
    if (ok) ui.step.ok('pushed main and dev')
    else ui.step.warn('push failed; fix the error above and run: git push -u origin main dev')
    return ok
  } catch (err) {
    if (err instanceof Cancelled) throw err
    throw err
  }
}

async function stepNpmInstall(target) {
  if (!fs.existsSync(join(target, 'package.json'))) return true
  if (fs.existsSync(join(target, 'node_modules'))) {
    ui.step.ok('dependencies already installed')
    return true
  }

  section('Install dependencies')
  ui.step.note('This runs npm install and switches on the git hooks.')

  try {
    if (!(await confirm('Run npm install now?', true))) {
      ui.step.warn('skipped; run: npm install')
      return false
    }
    const ok = run('npm', ['install'], target)
    if (ok) ui.step.ok('dependencies installed')
    else ui.step.err('npm install failed; fix the error above and run: npm install')
    return ok
  } catch (err) {
    if (err instanceof Cancelled) throw err
    throw err
  }
}

async function stepExternalServices(target) {
  const agentsPath = join(target, 'AGENTS.md')
  const stack = fs.existsSync(agentsPath) ? readStack(fs.readFileSync(agentsPath, 'utf8')) : null
  if (stack !== 'next-monorepo') return true

  section('External services')
  ui.step.note('Do these in order. Each has a guide under stack/ in the standard package.')
  console.log('')
  const steps = [
    'Supabase: create the project, enable Point-in-Time Recovery before the first migration',
    'Clerk: create the application',
    'Supabase: wire Clerk as a third-party auth provider',
    'Vercel: two projects (apps/web and apps/api), link, env vars per environment',
    'Vercel Firewall: rate-limit rules on the api project',
  ]
  for (let i = 0; i < steps.length; i++) {
    ui.step.note(`${ui.gray(`${i + 1}.`)} ${steps[i]}`)
  }
  console.log('')

  try {
    await text('Press enter when you have started this (or blank to skip for now)', { defaultValue: '' })
    return true
  } catch (err) {
    if (err instanceof Cancelled) throw err
    throw err
  }
}

async function stepEnvLocal(target) {
  const examplePath = join(target, '.env.example')
  if (!fs.existsSync(examplePath)) return true

  const localPath = join(target, '.env.local')
  if (!fs.existsSync(localPath)) {
    fs.copyFileSync(examplePath, localPath)
    ui.step.ok(`created ${ui.gray('.env.local')}`)
  }

  let missing = emptyEnvKeys(target)
  if (!missing.length) {
    ui.step.ok('every required setting in .env.local has a value')
    return true
  }

  section('Local settings (.env.local)')
  ui.step.note('Paste values as you get them from Supabase, Clerk, and Vercel.')
  ui.step.note('Press enter on a prompt to skip a value for now.')

  const example = fs.readFileSync(examplePath, 'utf8')
  let content = fs.readFileSync(localPath, 'utf8')

  try {
    for (const key of [...missing]) {
      const hint = envKeyHint(example, key)
      if (hint) ui.step.note(hint)
      const def = key === 'API_URL' ? LOCAL_API_URL : ''
      const value = await text(key, { defaultValue: def })
      if (!value) {
        ui.step.warn(`skipped ${key}`)
        continue
      }
      content = setEnvLocalValue(content, key, value)
      fs.writeFileSync(localPath, content)
      ui.step.ok(`set ${ui.gray(key)}`)
    }
  } catch (err) {
    if (err instanceof Cancelled) throw err
    throw err
  }

  missing = emptyEnvKeys(target)
  if (missing.length) {
    ui.step.warn(`still empty: ${missing.join(', ')}. Run ${ui.cyan('lattice setup')} again later.`)
    return false
  }
  ui.step.ok('every required setting in .env.local has a value')
  return true
}

async function stepDevBranch(target) {
  if (!isRepo(target) || refExists('dev', target)) return true
  section('Dev branch')
  git(['branch', 'dev'], target)
  ui.step.ok('created dev branch')
  return true
}

async function stepHooks(target) {
  if (!fs.existsSync(join(target, HOOKS_PATH))) return true
  if (!isRepo(target)) return true
  vendorHooks(target)
  const existing = configGet('core.hooksPath', target)
  if (existing && existing !== HOOKS_PATH) {
    ui.step.warn(`core.hooksPath is already ${existing}; leaving it alone`)
    return true
  }
  configSet('core.hooksPath', HOOKS_PATH, target)
  ui.step.ok(`git hooks installed (${ui.gray(HOOKS_PATH)})`)
  return true
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

  ui.banner(standardsVersion())
  ui.step.info(`Setting up ${ui.bold(opts.dir ?? '.')}`)
  ui.step.note('You can stop any time with Ctrl-C and run lattice setup again later.')
  console.log('')

  try {
    section('Pre-flight')
    let { problems } = auditDoctor(target)
    if (problems) {
      ui.step.warn(`${problems} issue(s) from lattice doctor (some steps below will fix them)`)
    } else {
      ui.step.ok('pre-flight checks passed')
    }

    await stepGitIdentity(target)
    await stepDevBranch(target)
    await stepGithubRemote(target)
    await stepNpmInstall(target)
    await stepHooks(target)
    await stepExternalServices(target)
    await stepEnvLocal(target)

    section('Final check')
    const final = auditDoctor(target)
    for (const [good, msg, fix] of final.results) {
      if (good) ui.step.ok(msg)
      else ui.step.err(`${msg}${fix ? ` ${ui.gray(`(${fix})`)}` : ''}`)
    }
    console.log('')

    if (final.problems === 0) {
      ui.box(`Ready to go  ${ui.S.dot}  ${standardsVersion()}`, [
        ui.bold('Start the app'),
        `${ui.gray('run')} ${ui.cyan('npm run dev')}`,
        `${ui.gray('web')}  http://localhost:3000`,
        `${ui.gray('api')}  http://localhost:3001`,
        '',
        ui.bold('Day to day'),
        `${ui.gray('run')} ${ui.cyan('lattice ticket MIN-155')}  ${ui.gray('to start work')}`,
        `${ui.gray('run')} ${ui.cyan('lattice')}  ${ui.gray('for the menu')}`,
        `${ui.gray('read')} RUNBOOK.md  ${ui.gray('for operations')}`,
      ])
      return 0
    }

    ui.step.warn(`${final.problems} thing(s) still to fix. Run ${ui.cyan('lattice setup')} again when ready.`)
    return 1
  } catch (err) {
    if (err instanceof Cancelled) {
      ui.step.warn('setup paused; run lattice setup to continue')
      return 1
    }
    throw err
  }
}
