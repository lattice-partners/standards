// The interactive `lattice` shell: a full-screen home with this repo's
// standards status and a context-aware action menu. Runs an action, waits,
// returns home. Only launched on a TTY; one-shot subcommands remain the
// agent/CI contract.

import { spawn } from 'node:child_process'
import { resolve, join } from 'node:path'
import fs from 'node:fs'
import { PKG_ROOT, VENDOR_DIR, standardsVersion, standardDocs, stackDocs, setupGuideDocs, status } from './lib.js'
import * as ui from './ui.js'
import { select, text, Cancelled } from './prompts.js'
import { init, adopt, sync, check } from './commands.js'
import { doctor, verify, ticket, release } from './workflow.js'
import { setup } from './setup.js'
import { withScreen, currentScreen } from './screen.js'

const home = process.env.HOME || ''
const tilde = (p) => (home && p.startsWith(home) ? '~' + p.slice(home.length) : p)

function menu(st) {
  const items = st.initialized
    ? [
        { label: 'setup', value: 'setup', hint: 'walk through project setup' },
        { label: 'check', value: 'check', hint: 'verify conformance' },
        { label: 'sync', value: 'sync', hint: 'update the vendored standard' },
        { label: 'doctor', value: 'doctor', hint: 'check this machine' },
        { label: 'verify', value: 'verify', hint: 'is it safe to ship?' },
        { label: 'ticket', value: 'ticket', hint: 'start work on a ticket' },
        { label: 'release', value: 'release', hint: 'print the release PR body' },
      ]
    : [{ label: 'init', value: 'init', hint: 'scaffold a new project here' }]
  items.push(
    { label: 'adopt', value: 'adopt', hint: 'overlay onto this repo' },
    { label: 'docs', value: 'docs', hint: 'read a standard' },
    { label: 'quit', value: 'quit', hint: 'exit' },
  )
  return items
}

function paintHome(target, st) {
  const s = currentScreen()
  if (!s) return
  s.resetView()
  const drift =
    !st.initialized
      ? `not initialized  ${ui.S.dot}  @${st.installed} installed`
      : st.drift === 'none'
        ? `initialized  ${ui.S.dot}  base@${st.vendored}`
        : st.drift === 'behind'
          ? `initialized  ${ui.S.dot}  behind @${st.installed}`
          : `initialized  ${ui.S.dot}  locally edited`
  const posture = st.posture ? `  ${ui.S.dot}  ${st.posture}` : ''
  s.setHeader({
    title: 'lattice',
    version: st.installed,
    context: tilde(target),
    subtitle: drift + posture,
  })
}

async function runAction(action, target) {
  if (action === 'docs') return openDoc(target)
  if (action === 'ticket') {
    const id = await text('Ticket ID', {})
    return ticket({ dir: target, id })
  }
  await { init, adopt, sync, check, setup, doctor, verify, release }[action]({ dir: target })
}

async function openDoc(target) {
  const st = status(target)
  const vendored = fs.existsSync(join(target, VENDOR_DIR))
  const coreSource = vendored ? join(target, VENDOR_DIR) : join(PKG_ROOT, 'core')
  const stackSource = join(PKG_ROOT, 'stack')

  const choices = standardDocs().map((f) => ({ label: f, value: join(coreSource, f) }))
  if (st.stack && st.stack !== 'minimal') {
    for (const f of stackDocs()) {
      const path = vendored ? join(target, VENDOR_DIR, f) : join(stackSource, f)
      if (fs.existsSync(path)) choices.push({ label: f, value: path })
    }
    for (const f of setupGuideDocs()) {
      choices.push({ label: f.replace('/README.md', ' setup'), value: join(stackSource, f) })
    }
  }

  let file
  try {
    file = await select('Which standard?', choices)
  } catch (err) {
    if (err instanceof Cancelled) return
    throw err
  }
  await page(file)
}

function page(path) {
  return new Promise((res) => {
    const screen = currentScreen()
    if (screen) screen.suspend()
    const pager = process.env.PAGER || 'less'
    const child = spawn(pager, ['-R', path], { stdio: 'inherit' })
    const done = () => {
      if (screen) screen.resume()
      res()
    }
    child.on('error', () => {
      if (screen) {
        screen.log('info', fs.readFileSync(path, 'utf8'))
        screen.resume()
        res()
        return
      }
      console.log('\n' + fs.readFileSync(path, 'utf8'))
      res()
    })
    child.on('close', done)
  })
}

/** Run the interactive shell loop against dir (default cwd). */
export async function shell(dir = '.') {
  const target = resolve(process.cwd(), dir)
  return withScreen(async () => {
    for (;;) {
      const st = status(target)
      paintHome(target, st)
      let action
      try {
        action = await select('What would you like to do?', menu(st))
      } catch (err) {
        if (err instanceof Cancelled) break
        throw err
      }
      if (action === 'quit') break

      const s = currentScreen()
      s.resetView()
      s.setHeader({
        title: `lattice ${action}`,
        version: standardsVersion(),
        context: tilde(target),
      })
      try {
        await runAction(action, target)
      } catch (err) {
        if (!(err instanceof Cancelled)) s.log('err', err.message)
        else continue
      }
      await s.wait('enter to return to the menu')
    }
  })
}
