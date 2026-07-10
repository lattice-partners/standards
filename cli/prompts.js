// Interactive prompts over node:readline. Used only when ui.interactive is
// true; commands stay fully non-interactive when driven by flags or in CI.

import readline from 'node:readline'
import { stdin, stdout } from 'node:process'
import { S, cyan, gray, bold } from './ui.js'

/** Thrown when the user cancels a prompt (Ctrl-C or Esc). */
export class Cancelled extends Error {
  constructor() {
    super('cancelled')
    this.name = 'Cancelled'
  }
}

/** Free-text prompt with an optional default. */
export function text(question, { defaultValue = '' } = {}) {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({ input: stdin, output: stdout })
    const hint = defaultValue ? gray(` (${defaultValue})`) : ''
    rl.question(`  ${cyan('?')} ${bold(question)}${hint} ${gray(S.bullet)} `, (answer) => {
      rl.close()
      resolve(answer.trim() || defaultValue)
    })
    rl.on('SIGINT', () => {
      rl.close()
      reject(new Cancelled())
    })
  })
}

/** Yes/no prompt. */
export async function confirm(question, def = true) {
  const answer = await text(`${question} ${gray(def ? '[Y/n]' : '[y/N]')}`)
  if (!answer) return def
  return /^y(es)?$/i.test(answer)
}

/** Arrow-key single select. options: [{ label, value, hint }]. */
export function select(question, options) {
  return new Promise((resolve, reject) => {
    let idx = 0

    const draw = (first) => {
      if (!first) stdout.write(`\x1b[${options.length + 1}A`)
      stdout.write('\x1b[J')
      stdout.write(`  ${cyan('?')} ${bold(question)}\n`)
      for (let i = 0; i < options.length; i++) {
        const o = options[i]
        const active = i === idx
        const pointer = active ? cyan(S.arrow) : ' '
        const label = active ? cyan(o.label) : o.label
        const hint = o.hint ? gray('  ' + o.hint) : ''
        stdout.write(`    ${pointer} ${label}${hint}\n`)
      }
    }

    const wasRaw = stdin.isRaw
    const cleanup = () => {
      stdin.off('keypress', onKey)
      if (stdin.setRawMode) stdin.setRawMode(!!wasRaw)
      stdout.write('\x1b[?25h')
      stdin.pause()
    }
    const onKey = (_str, key) => {
      if (!key) return
      if (key.name === 'up' || key.name === 'k') {
        idx = (idx - 1 + options.length) % options.length
        draw()
      } else if (key.name === 'down' || key.name === 'j') {
        idx = (idx + 1) % options.length
        draw()
      } else if (key.name === 'return') {
        cleanup()
        resolve(options[idx].value)
      } else if (key.name === 'escape' || key.name === 'q' || (key.ctrl && key.name === 'c')) {
        cleanup()
        reject(new Cancelled())
      }
    }

    readline.emitKeypressEvents(stdin)
    if (stdin.setRawMode) stdin.setRawMode(true)
    stdout.write('\x1b[?25l')
    draw(true)
    stdin.on('keypress', onKey)
    stdin.resume()
  })
}
