#!/usr/bin/env node
// lattice CLI entry: parse args, show the banner, and dispatch to a command.
// With no command on a TTY, offer an interactive menu.

import { parseArgs } from 'node:util'
import { init, adopt, sync, check, hooks } from './commands.js'
import { ticket, release, doctor, verify } from './workflow.js'
import { runHook } from './hooks.js'
import { standardsVersion, STACKS } from './lib.js'
import * as ui from './ui.js'
import { shell } from './shell.js'

const commands = { init, adopt, sync, check, hooks, ticket, release, doctor, verify }

const COMMAND_HELP = [
  ['init [dir]', 'Scaffold a new (greenfield) project with the standard'],
  ['adopt [dir]', 'Overlay the standard onto an existing repo (non-destructive)'],
  ['sync [dir]', 'Update the vendored standard to the installed version'],
  ['check [dir]', 'Verify a project conforms (exit non-zero on drift)'],
  ['hooks install', 'Point git at the vendored hooks'],
  ['ticket <ID>', 'Start a ticket: branch from dev'],
  ['release', 'Print the dev -> main pull request body'],
  ['doctor', 'Check this machine is set up correctly'],
  ['verify', 'Run every check and say whether it is safe to ship'],
]

function help() {
  const rows = COMMAND_HELP.map(([c, d]) => `  ${ui.cyan(c.padEnd(16))} ${ui.gray(d)}`)
  console.log(
    [
      `  ${ui.bold('lattice')} ${ui.gray('<command> [dir] [options]')}`,
      '',
      ...rows,
      '',
      `  ${ui.gray('Options')}`,
      `  ${'--posture'.padEnd(16)} ${ui.gray('greenfield | guest  (init/adopt)')}`,
      `  ${'--stack'.padEnd(16)} ${ui.gray(`${STACKS.join(' | ')}  (init)`)}`,
      `  ${'--tracker'.padEnd(16)} ${ui.gray('ticket prefix, e.g. MIN  (init)')}`,
      `  ${'--tickets'.padEnd(16)} ${ui.gray('comma-separated ids  (release)')}`,
      `  ${'--name'.padEnd(16)} ${ui.gray('project name for AGENTS.md')}`,
      `  ${'--force'.padEnd(16)} ${ui.gray('overwrite an existing AGENTS.md (init)')}`,
      `  ${'-h, --help'.padEnd(16)} ${ui.gray('show this help')}`,
      '',
      `  ${ui.gray('dir defaults to the current directory.')}`,
    ].join('\n'),
  )
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    posture: { type: 'string' },
    stack: { type: 'string' },
    tracker: { type: 'string' },
    tickets: { type: 'string' },
    name: { type: 'string' },
    force: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
})

const [command, arg] = positionals

async function main() {
  if (values.help) {
    ui.banner(standardsVersion())
    help()
    return 0
  }

  // The hook shims call back in here; keep it out of the command table so it
  // never shows up as something a person is meant to run.
  if (command === 'hook') return runHook(arg, positionals.slice(2), process.cwd())

  if (!command) {
    if (ui.interactive) {
      await shell(arg)
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

  // ticket and hooks take a value, not a directory, in the first positional.
  const opts = {
    name: values.name,
    posture: values.posture,
    stack: values.stack,
    tracker: values.tracker,
    tickets: values.tickets,
    force: values.force,
  }
  if (command === 'ticket') return run({ ...opts, id: arg })
  if (command === 'hooks') return run({ ...opts, action: arg ?? 'install' })
  return run({ ...opts, dir: arg })
}

try {
  process.exit(await main())
} catch (err) {
  ui.step.err(err.message)
  process.exit(1)
}
