// The interactive `lattice` shell: a home screen with this repo's standards
// status and a context-aware action menu. Runs an action, waits, returns home.
// Only launched on a TTY; the one-shot subcommands remain the agent/CI contract.

import readline from 'node:readline'
import { spawn } from 'node:child_process'
import { resolve, join } from 'node:path'
import fs from 'node:fs'
import { PKG_ROOT, VENDOR_DIR, standardsVersion, standardDocs, status } from './lib.js'
import * as ui from './ui.js'
import { select, Cancelled } from './prompts.js'
import { init, adopt, sync, check } from './commands.js'

const home = process.env.HOME || ''
const tilde = (p) => (home && p.startsWith(home) ? '~' + p.slice(home.length) : p)

function renderStatus(target, st) {
  const row = (k, v) => console.log(`  ${ui.gray(k.padEnd(9))} ${v}`)
  console.log(`  ${ui.bold('standards')}  ${ui.gray(ui.S.dot)}  ${ui.gray(tilde(target))}`)
  if (st.initialized) {
    const posture = st.posture ? `  ${ui.gray('(' + st.posture + ')')}` : ''
    row('status', `${ui.green('initialized')}  ${ui.gray(ui.S.dot)}  base@${st.vendored}${posture}`)
    const drift =
      st.drift === 'none'
        ? ui.green('none')
        : st.drift === 'behind'
          ? ui.yellow(`behind installed @${st.installed}`)
          : ui.yellow('locally edited')
    row('drift', drift)
  } else {
    row('status', `${ui.gray('not initialized')}  ${ui.gray(ui.S.dot)}  @${st.installed} installed`)
  }
  console.log(`\n  ${ui.dim('up/down move  ' + ui.S.dot + '  enter select  ' + ui.S.dot + '  q quit')}\n`)
}

function menu(st) {
  const items = st.initialized
    ? [
        { label: 'check', value: 'check', hint: 'verify conformance' },
        { label: 'sync', value: 'sync', hint: 'update the vendored standard' },
      ]
    : [{ label: 'init', value: 'init', hint: 'scaffold a new project here' }]
  items.push(
    { label: 'adopt', value: 'adopt', hint: 'overlay onto this repo' },
    { label: 'docs', value: 'docs', hint: 'read a standard' },
    { label: 'quit', value: 'quit', hint: 'exit' },
  )
  return items
}

async function runAction(action, target) {
  if (action === 'docs') return openDoc(target)
  await { init, adopt, sync, check }[action]({ dir: target })
}

async function openDoc(target) {
  const source = fs.existsSync(join(target, VENDOR_DIR)) ? join(target, VENDOR_DIR) : join(PKG_ROOT, 'core')
  let file
  try {
    file = await select(
      'Which standard?',
      standardDocs().map((f) => ({ label: f, value: f })),
    )
  } catch (err) {
    if (err instanceof Cancelled) return
    throw err
  }
  await page(join(source, file))
}

// Show a file in the user's pager, falling back to printing it.
function page(path) {
  return new Promise((res) => {
    const pager = process.env.PAGER || 'less'
    const child = spawn(pager, ['-R', path], { stdio: 'inherit' })
    child.on('error', () => {
      console.log('\n' + fs.readFileSync(path, 'utf8'))
      res()
    })
    child.on('close', () => res())
  })
}

function pause() {
  return new Promise((res) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question(ui.dim('  press enter to continue '), () => {
      rl.close()
      res()
    })
  })
}

/** Run the interactive shell loop against dir (default cwd). */
export async function shell(dir = '.') {
  const target = resolve(process.cwd(), dir)
  for (;;) {
    console.clear()
    ui.banner(standardsVersion())
    const st = status(target)
    renderStatus(target, st)

    let action
    try {
      action = await select('What would you like to do?', menu(st))
    } catch (err) {
      if (err instanceof Cancelled) break
      throw err
    }
    if (action === 'quit') break

    console.log('')
    try {
      await runAction(action, target)
    } catch (err) {
      if (!(err instanceof Cancelled)) ui.step.err(err.message)
    }
    await pause()
  }
  console.log(`\n  ${ui.gray('bye')}\n`)
}
