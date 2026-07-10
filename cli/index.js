#!/usr/bin/env node
// lattice CLI entry: parse args, show the banner, and dispatch to a command.
// With no command on a TTY, offer an interactive menu.

import { parseArgs } from 'node:util'
import { init, adopt, sync, check } from './commands.js'
import { standardsVersion } from './lib.js'
import * as ui from './ui.js'
import { shell } from './shell.js'

const commands = { init, adopt, sync, check }

const COMMAND_HELP = [
  ['init [dir]', 'Scaffold a new (greenfield) project with the standard'],
  ['adopt [dir]', 'Overlay the standard onto an existing repo (non-destructive)'],
  ['sync [dir]', 'Update the vendored standard to the installed version'],
  ['check [dir]', 'Verify a project conforms (exit non-zero on drift)'],
]

function help() {
  const rows = COMMAND_HELP.map(([c, d]) => `  ${ui.cyan(c.padEnd(14))} ${ui.gray(d)}`)
  console.log(
    [
      `  ${ui.bold('lattice')} ${ui.gray('<command> [dir] [options]')}`,
      '',
      ...rows,
      '',
      `  ${ui.gray('Options')}`,
      `  ${'--posture'.padEnd(14)} ${ui.gray('greenfield | guest  (init/adopt)')}`,
      `  ${'--name'.padEnd(14)} ${ui.gray('project name for AGENTS.md')}`,
      `  ${'--force'.padEnd(14)} ${ui.gray('overwrite an existing AGENTS.md (init)')}`,
      `  ${'-h, --help'.padEnd(14)} ${ui.gray('show this help')}`,
      '',
      `  ${ui.gray('dir defaults to the current directory.')}`,
    ].join('\n'),
  )
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    posture: { type: 'string' },
    name: { type: 'string' },
    force: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
})

const [command, dir] = positionals

async function main() {
  if (values.help) {
    ui.banner(standardsVersion())
    help()
    return 0
  }

  if (!command) {
    if (ui.interactive) {
      await shell(dir)
      return 0
    }
    ui.banner(standardsVersion())
    help()
    return 1
  }

  const run = commands[command]
  if (!run) {
    ui.step.err(`unknown command: ${command}`)
    help()
    return 1
  }
  return run({ dir, name: values.name, posture: values.posture, force: values.force })
}

try {
  process.exit(await main())
} catch (err) {
  ui.step.err(err.message)
  process.exit(1)
}
