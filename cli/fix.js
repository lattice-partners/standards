// Run the commands doctor and other prompts suggest, instead of only printing
// them. Interactive only; CI still gets the text remediations.

import fs from 'node:fs'
import { join } from 'node:path'
import * as ui from './ui.js'
import { confirm, select, text } from './prompts.js'
import { git, initRepo, createBranch, commitAll, refExists, normalizeRemoteUrl, configGet, configSet, isRepo } from './git.js'
import { HOOKS_PATH, vendorHooks } from './lib.js'
import { runInTerminal } from './screen.js'
import { openBrowser } from './services.js'

/** Mask common credentials before text is shown or retained. */
export function redactSecrets(value) {
  return String(value)
    .replace(/\b(?:sk|sb_secret|sbp)_(?:test_|live_)?[A-Za-z0-9._-]+/g, '[secret]')
    .replace(/(Authorization:\s*Bearer\s+)[^\s]+/gi, '$1[secret]')
}

/** Apply one doctor/setup action and verify its named postcondition. */
export async function applyFix(target, check) {
  const action = check.action
  if (!action) return { ran: false, verified: false, results: [] }
  try {
    switch (action.kind) {
      case 'git-init':
        initRepo(target)
        break
      case 'git-dev':
        if (!refExists('HEAD', target)) {
          commitAll(target, 'chore: initial commit', { noVerify: true })
        }
        createBranch('dev', target)
        break
      case 'git-email': {
        const email = await text('Your git email')
        if (!email) return { ran: false, verified: false, results: [] }
        const name = await text('Your git name')
        git(['config', '--local', 'user.email', email], target)
        if (name) git(['config', '--local', 'user.name', name], target)
        break
      }
      case 'git-origin': {
        const raw = await text('GitHub remote URL', {
          hint: 'Create an empty repository on GitHub, then paste its clone URL.',
        })
        const url = normalizeRemoteUrl(raw ?? '')
        if (!url) {
          ui.step.err('that does not look like a GitHub URL')
          return { ran: false, verified: false, results: [] }
        }
        git(['remote', 'add', 'origin', url], target)
        break
      }
      case 'hooks': {
        if (!isRepo(target)) return { ran: false, verified: false, results: [] }
        vendorHooks(target)
        const existing = configGet('core.hooksPath', target)
        if (existing && existing !== HOOKS_PATH) {
          ui.step.warn(`core.hooksPath is already ${existing}; leaving it alone`)
          return { ran: false, verified: false, results: [] }
        }
        configSet('core.hooksPath', HOOKS_PATH, target)
        break
      }
      case 'copy-env': {
        const example = join(target, '.env.example')
        const local = join(target, '.env.local')
        if (!fs.existsSync(example) || fs.existsSync(local)) {
          return { ran: false, verified: false, results: [] }
        }
        fs.copyFileSync(example, local)
        break
      }
      case 'command':
        if (!runInTerminal(action.argv[0], action.argv.slice(1), target)) {
          return { ran: true, verified: false, results: [] }
        }
        break
      case 'node':
        ui.step.warn('Node must be upgraded before this process can continue.')
        openBrowser('https://nodejs.org/en/download')
        return { ran: true, verified: false, results: [] }
      default:
        return { ran: false, verified: false, results: [] }
    }
    const { auditDoctor } = await import('./workflow.js')
    const results = auditDoctor(target).results
    return { ran: true, verified: results.find((result) => result.id === check.id)?.good === true, results }
  } catch (err) {
    ui.step.err(redactSecrets(err.message))
    return { ran: true, verified: false, results: [] }
  }
}

/** Offer runnable doctor fixes one at a time, verifying after every action. */
export async function offerFixes(target, results) {
  if (!ui.interactive) return results
  let current = results
  const skipped = new Set()
  while (true) {
    const check = current.find((result) => !result.good && result.action && !skipped.has(result.id))
    if (!check) return current
    ui.step.info(`${check.message}. I can run ${ui.cyan(check.action.label)} for you.`)
    if (!(await confirm('Run it now?', true))) {
      skipped.add(check.id)
      continue
    }
    const outcome = await applyFix(target, check)
    if (outcome.results.length) current = outcome.results
    if (outcome.verified) {
      ui.step.ok(`verified: ${check.action.label}`)
      continue
    }
    ui.step.warn(`could not verify: ${check.action.label}`)
    const choice = await select('What next?', [
      { label: 'Retry', value: 'retry', hint: 'run the action again' },
      { label: 'Skip', value: 'skip', hint: 'leave it incomplete' },
      { label: 'Exit', value: 'exit', hint: 'resume setup later' },
    ])
    if (choice === 'skip') skipped.add(check.id)
    if (choice === 'exit') return current
  }
}

/** Confirm and run a one-off command (npm install, npm run dev, …). */
export async function offerCommand(label, argv, cwd) {
  if (!ui.interactive) return false
  if (!(await confirm(`Run ${label} now?`, true))) return false
  return runInTerminal(argv[0], argv.slice(1), cwd)
}
