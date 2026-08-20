// Full-screen session for interactive lattice. Uses the terminal's alternate
// buffer so prompts redraw in place instead of scrolling a transcript.
// Nested enter()/leave() share one session so init can hand off to setup.

import readline from 'node:readline'
import { spawnSync } from 'node:child_process'
import { stdin, stdout } from 'node:process'
import * as ui from './ui.js'
import { Cancelled } from './ui.js'

const ESC = {
  altOn: '\x1b[?1049h',
  altOff: '\x1b[?1049l',
  hide: '\x1b[?25l',
  show: '\x1b[?25h',
  home: '\x1b[H',
  clear: '\x1b[2J',
}

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

export function stripAnsi(s) {
  return String(s).replace(/\x1b\[[0-9;]*m/g, '')
}

export function visibleWidth(s) {
  return stripAnsi(s).length
}

/** Clip to width, preserving leading ANSI when possible. */
export function clip(s, width) {
  if (width <= 0) return ''
  if (visibleWidth(s) <= width) return s
  const plain = stripAnsi(s)
  if (plain.length <= width) return plain
  if (width === 1) return '…'
  return plain.slice(0, Math.max(0, width - 1)) + '…'
}

export function padLine(s, cols) {
  const c = clip(s, cols)
  const w = visibleWidth(c)
  return c + (w < cols ? ' '.repeat(cols - w) : '')
}

export function spread(left, right, cols) {
  const gap = cols - visibleWidth(left) - visibleWidth(right)
  if (gap < 1) return clip(left + ' ' + right, cols)
  return left + ' '.repeat(gap) + right
}

let session = null
let depth = 0

export function screenDepth() {
  return depth
}

export function currentScreen() {
  return session
}

export function enterScreen() {
  if (depth++ === 0) {
    session = new Screen()
    session.attach()
    ui.setSink(session)
  }
  return session
}

export function leaveScreen() {
  if (depth <= 0) return
  if (--depth === 0 && session) {
    session.detach()
    ui.setSink(null)
    session = null
  }
}

/** Run fn inside a full-screen session. Nested calls share the session. */
export async function withScreen(fn) {
  if (!ui.interactive) return fn()
  enterScreen()
  try {
    return await fn()
  } finally {
    leaveScreen()
  }
}

/**
 * Run a command in the real terminal. Suspends the full-screen session so the
 * user sees the command's own output (npm install, git push, npm run dev).
 */
export function runCommandInTerminal(cmd, args, cwd = process.cwd()) {
  const screen = currentScreen()
  if (screen) screen.suspend()
  try {
    const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', encoding: 'utf8' })
    return { ok: r.status === 0, status: r.status, signal: r.signal, error: r.error ?? null }
  } finally {
    if (screen) screen.resume()
  }
}

/** Run a command visibly and return whether it exited successfully. */
export function runInTerminal(cmd, args, cwd = process.cwd()) {
  return runCommandInTerminal(cmd, args, cwd).ok
}

class Screen {
  constructor() {
    this.title = 'lattice'
    this.version = ''
    this.context = ''
    this.subtitle = ''
    this.banner = false
    this.progress = []
    this.logs = []
    this.panel = null
    this.footer = ''
    this.prompt = null
    this.spinText = null
    this.spinFrame = 0
    this.spinTimer = null
    this.onKey = null
    this._onKeypress = (str, key) => this.onKey?.(str, key)
    this._onResize = () => this.paint()
    this._onExit = () => this.restore(false)
  }

  attach() {
    readline.emitKeypressEvents(stdin)
    if (stdin.setRawMode) stdin.setRawMode(true)
    stdin.on('keypress', this._onKeypress)
    stdin.resume()
    stdout.on('resize', this._onResize)
    process.on('exit', this._onExit)
    stdout.write(ESC.altOn + ESC.hide + ESC.clear)
    this.paint()
  }

  detach() {
    this.clearSpin()
    this.restore(true)
  }

  restore(unhook) {
    if (unhook) {
      stdin.off('keypress', this._onKeypress)
      stdout.off('resize', this._onResize)
      process.off('exit', this._onExit)
      if (stdin.setRawMode) stdin.setRawMode(false)
      stdin.pause()
    }
    stdout.write(ESC.show + ESC.altOff)
  }

  /** Leave the alt buffer so a child can take the real terminal. */
  suspend() {
    this.clearSpin()
    stdin.off('keypress', this._onKeypress)
    if (stdin.setRawMode) stdin.setRawMode(false)
    stdout.write(ESC.show + ESC.altOff)
  }

  resume() {
    if (stdin.setRawMode) stdin.setRawMode(true)
    stdin.on('keypress', this._onKeypress)
    stdin.resume()
    stdout.write(ESC.altOn + ESC.hide + ESC.clear)
    this.paint()
  }

  resetView() {
    this.logs = []
    this.panel = null
    this.progress = []
    this.subtitle = ''
    this.banner = false
    this.prompt = null
    this.clearSpin()
  }

  setHeader({ title, version, context, subtitle, banner } = {}) {
    if (title != null) this.title = title
    if (version != null) this.version = version
    if (context != null) this.context = context
    if (subtitle != null) this.subtitle = subtitle
    if (banner != null) this.banner = banner
    this.paint()
  }

  setProgress(items) {
    this.progress = items ?? []
    this.paint()
  }

  setFooter(text) {
    this.footer = text ?? ''
    this.paint()
  }

  setPanel(title, rows) {
    this.panel = { title, rows }
    this.paint()
  }

  log(kind, msg) {
    this.logs.push({ kind, msg: String(msg) })
    if (this.logs.length > 80) this.logs.splice(0, this.logs.length - 80)
    this.paint()
  }

  spinner(text) {
    this.clearSpin()
    this.spinText = text
    this.spinFrame = 0
    if (ui.color) {
      this.spinTimer = setInterval(() => {
        this.spinFrame++
        this.paint()
      }, 80)
    } else {
      this.paint()
    }
    return {
      stop: (msg = text) => {
        this.clearSpin()
        this.log('ok', msg)
      },
    }
  }

  clearSpin() {
    if (this.spinTimer) {
      clearInterval(this.spinTimer)
      this.spinTimer = null
    }
    this.spinText = null
  }

  size() {
    return { cols: stdout.columns || 80, rows: stdout.rows || 24 }
  }

  promptLines(width) {
    const inner = Math.max(8, width - 4)
    const p = this.prompt
    if (!p) return []
    if (p.type === 'select') {
      const out = ['  ' + ui.bold(clip(p.question, inner)), '']
      for (let i = 0; i < p.options.length; i++) {
        const o = p.options[i]
        const active = i === p.idx
        const pointer = active ? ui.cyan(ui.S.arrow) : ' '
        const label = active ? ui.cyan(o.label) : o.label
        const hint = o.hint ? ui.gray('  ' + o.hint) : ''
        out.push(clip(`    ${pointer} ${label}${hint}`, width))
      }
      return out
    }
    if (p.type === 'text') {
      const out = []
      if (p.hint) {
        for (const line of wrap(p.hint, inner)) out.push('  ' + ui.gray(line))
        out.push('')
      }
      out.push('  ' + ui.bold(clip(p.question, inner)))
      const shown = p.value ? (p.mask ? ui.dim('•'.repeat(p.value.length)) : p.value) : p.defaultValue ? ui.dim(p.mask ? '••••••••' : p.defaultValue) : ''
      out.push('  ' + ui.cyan(ui.S.bullet) + ' ' + shown)
      return out
    }
    return []
  }

  paint() {
    if (!stdout.isTTY) return
    const { cols, rows } = this.size()
    const inner = Math.max(10, cols - 4)
    const lines = []
    const hand = this.banner ? ui.handLines() : []
    const useHand = hand.length > 0 && cols >= 70
    let prompt = []

    if (useHand) {
      const rightWidth = Math.max(24, cols - ui.HAND_COLS - 1)
      const right = [
        ui.bold('L A T T I C E'),
        ui.gray('P A R T N E R S'),
        ui.dim('standards' + (this.version ? `  ${this.version}` : '')),
        '',
      ]
      if (this.context) right.push(ui.gray(this.context))
      if (this.subtitle) {
        for (const line of wrap(this.subtitle, rightWidth)) right.push(ui.gray(line))
      }
      right.push('')
      prompt = this.promptLines(rightWidth)
      right.push(...prompt)
      const n = Math.max(hand.length, right.length)
      for (let i = 0; i < n; i++) {
        lines.push(padLine(hand[i] ?? '', ui.HAND_COLS) + (right[i] ?? ''))
      }
      lines.push('')
      prompt = []
    } else {
      lines.push('')
      const left = [
        '  ' + ui.bold(this.title || 'lattice'),
        this.version ? ui.gray(`  ${ui.S.dot}  ${this.version}`) : '',
      ].join('')
      const right = this.context ? ui.gray(this.context) + ' ' : ''
      lines.push(spread(left, right, cols))
      if (this.subtitle) {
        for (const line of wrap(this.subtitle, inner)) lines.push('  ' + ui.gray(line))
      }
      lines.push('')
      prompt = this.promptLines(cols)
    }

    if (this.progress.length) {
      for (const item of this.progress) {
        let mark = ui.gray(' ')
        let label = ui.gray(item.label)
        if (item.status === 'done') {
          mark = ui.green(ui.S.ok)
          label = item.label
        } else if (item.status === 'active') {
          mark = ui.cyan(ui.S.arrow)
          label = ui.bold(item.label)
        } else if (item.status === 'skip') {
          mark = ui.gray(ui.S.dot)
          label = ui.gray(item.label)
        }
        const extra = item.detail ? ui.gray('  ' + item.detail) : ''
        lines.push(clip(`  ${mark}  ${label}${extra}`, cols))
      }
      lines.push('')
    }

    const footerRows = 2
    const budget = Math.max(0, rows - lines.length - prompt.length - footerRows - 1)

    if (this.panel) {
      const panel = [ui.bold(this.panel.title), '', ...this.panel.rows]
      const wrapped = []
      for (const row of panel) {
        if (!row) wrapped.push('')
        else for (const line of wrap(row, inner)) wrapped.push(line)
      }
      for (const line of wrapped.slice(0, budget)) lines.push('  ' + line)
    } else {
      const logLines = []
      for (const { kind, msg } of this.logs) {
        const prefix =
          kind === 'ok'
            ? ui.green(ui.S.ok) + ' '
            : kind === 'err'
              ? ui.red(ui.S.err) + ' '
              : kind === 'warn'
                ? ui.yellow(ui.S.warn) + ' '
                : kind === 'note'
                  ? '  '
                  : ui.cyan(ui.S.info) + ' '
        for (const line of wrap(msg, inner - 2)) {
          logLines.push(prefix + (kind === 'note' ? ui.gray(line) : line))
        }
      }
      if (this.spinText) {
        const frame = ui.cyan(FRAMES[this.spinFrame % FRAMES.length])
        logLines.push(`${frame} ${ui.gray(this.spinText)}`)
      }
      for (const line of logLines.slice(-budget)) lines.push('  ' + line)
    }

    if (prompt.length) {
      if (lines[lines.length - 1] !== '') lines.push('')
      lines.push(...prompt)
    }

    while (lines.length < rows - 2) lines.push('')
    if (lines.length > rows - 2) lines.length = rows - 2
    lines.push(ui.gray(ui.S.h.repeat(Math.max(1, cols - 1))))
    lines.push(clip('  ' + ui.dim(this.footer), cols))

    stdout.write(ESC.home)
    for (let i = 0; i < rows; i++) {
      stdout.write(padLine(lines[i] ?? '', cols))
      if (i < rows - 1) stdout.write('\n')
    }

    if (this.prompt?.type === 'text') {
      let row = 0
      for (let i = 0; i < lines.length; i++) {
        if (stripAnsi(lines[i] ?? '').trimStart().startsWith(ui.S.bullet)) row = i
      }
      const val = this.prompt.mask ? '•'.repeat(this.prompt.value.length) : this.prompt.value || ''
      const col = 4 + visibleWidth(ui.S.bullet) + 1 + visibleWidth(val)
      stdout.write(`\x1b[${row + 1};${Math.min(col, cols)}H` + ESC.show)
    } else {
      stdout.write(ESC.hide)
    }
  }

  waitForKey(handle) {
    return new Promise((resolve, reject) => {
      this.onKey = (str, key) => {
        if (!key) return
        if (key.ctrl && key.name === 'c') {
          this.onKey = null
          this.prompt = null
          reject(new Cancelled())
          return
        }
        try {
          handle(str, key, (value) => {
            this.onKey = null
            this.prompt = null
            resolve(value)
          })
        } catch (err) {
          this.onKey = null
          this.prompt = null
          reject(err)
        }
      }
      this.paint()
    })
  }

  async select(question, options, { idx = 0 } = {}) {
    this.prompt = { type: 'select', question, options, idx }
    this.footer = '↑↓ move  ·  enter select  ·  q back'
    return this.waitForKey((_str, key, done) => {
      const n = this.prompt.options.length
      if (key.name === 'up' || key.name === 'k') {
        this.prompt.idx = (this.prompt.idx - 1 + n) % n
        this.paint()
      } else if (key.name === 'down' || key.name === 'j') {
        this.prompt.idx = (this.prompt.idx + 1) % n
        this.paint()
      } else if (key.name === 'return') {
        done(this.prompt.options[this.prompt.idx].value)
      } else if (key.name === 'escape' || key.name === 'q') {
        throw new Cancelled()
      }
    })
  }

  async confirm(question, def = true) {
    return this.select(question, [
      { label: 'Yes', value: true, hint: def ? 'default' : '' },
      { label: 'No', value: false, hint: def ? '' : 'default' },
    ], { idx: def ? 0 : 1 })
  }

  async text(question, { defaultValue = '', hint = '', mask = false } = {}) {
    this.prompt = { type: 'text', question, value: '', defaultValue, hint, mask }
    this.footer = defaultValue
      ? 'enter confirm  ·  empty uses the default  ·  ctrl-c back'
      : 'enter confirm  ·  empty skips  ·  ctrl-c back'
    return this.waitForKey((str, key, done) => {
      if (key.name === 'return') {
        done(this.prompt.value.trim() || defaultValue)
        return
      }
      if (key.name === 'escape') {
        throw new Cancelled()
      }
      if (key.name === 'backspace') {
        this.prompt.value = this.prompt.value.slice(0, -1)
        this.paint()
        return
      }
      if (str && !key.ctrl && !key.meta && str !== '\u0000' && key.name !== 'return') {
        this.prompt.value += str
        this.paint()
      }
    })
  }

  async wait(message = 'enter to continue') {
    this.prompt = { type: 'wait' }
    this.footer = message
    return this.waitForKey((_str, key, done) => {
      if (key.name === 'return' || key.name === 'escape' || key.name === 'q') done()
    })
  }
}

function wrap(text, width) {
  const raw = stripAnsi(String(text ?? ''))
  if (!raw) return ['']
  if (width < 8) return [clip(raw, width)]
  const words = raw.split(/\s+/)
  const lines = []
  let cur = ''
  for (const w of words) {
    if (!cur) {
      cur = w
      continue
    }
    if ((cur + ' ' + w).length <= width) cur += ' ' + w
    else {
      lines.push(cur)
      cur = w
    }
  }
  if (cur) lines.push(cur)
  return lines.length ? lines : ['']
}
