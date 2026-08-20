// Terminal UI toolkit for the lattice CLI. Zero dependencies.
// Color and animation degrade to plain text when stdout is not a TTY, when
// NO_COLOR is set, or when LATTICE_ASCII forces the ASCII symbol set.

const isTTY = process.stdout.isTTY === true

/** True when output should carry ANSI color. */
export const color = isTTY && process.env.NO_COLOR == null && process.env.TERM !== 'dumb'

/** True when we can drive an interactive prompt (both streams are TTYs). */
export const interactive = isTTY && process.stdin.isTTY === true

/** Thrown when the user cancels a prompt (Ctrl-C, Esc, or q). */
export class Cancelled extends Error {
  constructor() {
    super('cancelled')
    this.name = 'Cancelled'
  }
}

/** Optional full-screen sink. When set, status lines paint in place. */
let sink = null
export function setSink(s) {
  sink = s
}

const wrap = (codes) => (s) => (color ? `\x1b[${codes}m${s}\x1b[0m` : String(s))
export const bold = wrap('1')
export const dim = wrap('2')
export const white = wrap('97')
export const gray = wrap('90')
export const cyan = wrap('96')
export const green = wrap('92')
export const yellow = wrap('93')
export const red = wrap('91')

const unicode = !/^(1|true|yes)$/i.test(process.env.LATTICE_ASCII ?? '')

/** Glyph set, with an ASCII fallback for terminals without Unicode. */
export const S = unicode
  ? { ok: '✔', err: '✖', warn: '▲', info: '•', arrow: '❯', bullet: '›', dot: '·', tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' }
  : { ok: 'v', err: 'x', warn: '!', info: '*', arrow: '>', bullet: '>', dot: '-', tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' }

// The Lattice hand, traced from the brand wordmark (half-block rendering).
const HAND = [
  '                ▄██████████████▄  ',
  '              ▄██████████████████▄',
  '            ▄█████████████████████',
  '          ▄█████▀ ▄███████████████',
  '        ▄█████▀ ▄█████████████████',
  '       █████▀ ▄███████████████████',
  '        ▀█▀ ▄█████████████████████',
  '          ▄█████▀▄████████████████',
  '        ▄████▀ ▄██████████████████',
  '      ▄████▀ ▄█████▀██████████████',
  '   ▄█████▀ ▄█████▀ █████████████▀ ',
  ' ▄█████▀ ▄█████▀ ▄████▀ ██████▀   ',
  ' ████▀ ▄█████▀ ▄████▀ ▄█████▀     ',
  '  ▀▀ ▄█████▀ ▄████▀ ▄█████▀       ',
  '   ▄█████▀ ▄████▀ ▄█████▀         ',
  '    ▀██▀    ▀█▀▀   ▀██▀           ',
]

const HAND_W = 34

export const HAND_COLS = 36

/** Hand art lines (no labels). Empty when the terminal cannot render it. */
export function handLines() {
  if (!(color && unicode)) return []
  return HAND.map((raw) => '  ' + bold(white(raw.padEnd(HAND_W))))
}

/** Print the Lattice logo. Block art when rich; a plain wordmark otherwise. */
export function banner(version) {
  const lines = bannerLines(version)
  if (sink) {
    sink.setHeader({ version: version ?? sink.version, banner: true })
    return
  }
  console.log('\n' + lines.join('\n') + '\n')
}

/** Banner lines: hand plus brand labels, or a plain wordmark. */
export function bannerLines(version) {
  const tag = version ? `  ${version}` : ''
  if (!(color && unicode)) {
    return [`  ${bold('LATTICE PARTNERS')}${gray('   standards' + tag)}`]
  }
  const labels = [bold('L A T T I C E'), gray('P A R T N E R S'), dim('standards' + tag)]
  const start = Math.floor((HAND.length - labels.length) / 2)
  return HAND.map((raw, i) => {
    const left = '  ' + bold(white(raw.padEnd(HAND_W)))
    const li = i - start
    return left + (li >= 0 && li < labels.length ? '    ' + labels[li] : '')
  })
}

/** Styled status lines. */
export const step = {
  ok: (m) => (sink ? sink.log('ok', m) : console.log(`  ${green(S.ok)} ${m}`)),
  info: (m) => (sink ? sink.log('info', m) : console.log(`  ${cyan(S.info)} ${m}`)),
  warn: (m) => (sink ? sink.log('warn', m) : console.log(`  ${yellow(S.warn)} ${m}`)),
  err: (m) => (sink ? sink.log('err', m) : console.error(`  ${red(S.err)} ${m}`)),
  note: (m) => (sink ? sink.log('note', m) : console.log(`    ${gray(m)}`)),
}

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

/** A spinner that animates on a TTY and always logs a final status line. */
export function spinner(text) {
  if (sink) return sink.spinner(text)
  let timer = null
  let i = 0
  if (color) {
    process.stdout.write('\x1b[?25l')
    timer = setInterval(() => {
      process.stdout.write(`\r  ${cyan(FRAMES[i++ % FRAMES.length])} ${gray(text)}`)
    }, 80)
  }
  return {
    stop(msg = text, symbol = green(S.ok)) {
      if (timer) {
        clearInterval(timer)
        process.stdout.write('\r\x1b[K\x1b[?25h')
      }
      console.log(`  ${symbol} ${msg}`)
    },
  }
}

const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '')

/** A rounded box around a title and rows (ANSI-width aware). */
export function box(title, rows) {
  if (sink) {
    sink.setPanel(title, rows)
    return
  }
  const width = Math.max(stripAnsi(title).length, ...rows.map((r) => stripAnsi(r).length))
  const bar = S.h.repeat(width + 2)
  const pad = (r) => r + ' '.repeat(width - stripAnsi(r).length)
  const out = [gray(S.tl + bar + S.tr), `${gray(S.v)} ${bold(pad(title))} ${gray(S.v)}`]
  for (const r of rows) out.push(`${gray(S.v)} ${pad(r)} ${gray(S.v)}`)
  out.push(gray(S.bl + bar + S.br))
  console.log('\n' + out.map((l) => '  ' + l).join('\n') + '\n')
}
