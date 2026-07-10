// The four lattice commands. Each returns a process exit code. init and adopt
// run an interactive wizard for missing values when stdout is a TTY; otherwise
// they rely on flags and defaults so CI and tests stay non-interactive.

import { resolve, join, relative } from 'node:path'
import fs from 'node:fs'
import {
  VENDOR_DIR,
  standardsVersion,
  standardDocs,
  vendorCore,
  vendoredVersion,
  docDiffers,
  seedMemory,
  scaffoldStack,
  normalizePosture,
  latticeBlock,
  agentsMd,
  upsertBlock,
  readPin,
  readPosture,
  linkClaudeMd,
  installHint,
  basename,
} from './lib.js'
import * as ui from './ui.js'
import { text, select, Cancelled } from './prompts.js'

const POSTURE_CHOICES = [
  { label: 'Greenfield', value: 'greenfield', hint: 'Lattice owns the stack' },
  { label: 'Consultative guest', value: 'guest', hint: 'working in a client repo' },
]

const here = (target) => {
  const rel = relative(process.cwd(), target)
  if (!rel) return '.'
  return rel.startsWith('..') ? target : rel
}

/** Scaffold a new greenfield project. */
export async function init(opts = {}) {
  const target = resolve(process.cwd(), opts.dir ?? '.')
  fs.mkdirSync(target, { recursive: true })
  const agentsPath = join(target, 'AGENTS.md')
  if (fs.existsSync(agentsPath) && !opts.force) {
    ui.step.err(`AGENTS.md already exists in ${here(target)}. Use "lattice adopt", or --force to overwrite.`)
    return 1
  }

  let name = opts.name
  let posture = opts.posture
  if (ui.interactive) {
    ui.banner(standardsVersion())
    ui.step.info(`New project in ${ui.bold(here(target))}`)
    try {
      if (!name) name = await text('Project name', { defaultValue: basename(target) })
      if (!posture) posture = await select('Engagement posture', POSTURE_CHOICES)
    } catch (err) {
      if (err instanceof Cancelled) return cancel()
      throw err
    }
    console.log('')
  }

  const version = standardsVersion()
  const post = normalizePosture(posture ?? 'greenfield')
  const projectName = name || basename(target)

  const sp = ui.spinner('vendoring core standard')
  const docs = vendorCore(target)
  sp.stop(`vendored ${docs.length} core docs to ${ui.gray(VENDOR_DIR + '/')}`)

  fs.writeFileSync(agentsPath, agentsMd({ name: projectName, version, posture: post }))
  ui.step.ok(`wrote ${ui.gray('AGENTS.md')} (posture: ${post})`)
  ui.step.ok(linkClaudeMd(target) ? `linked ${ui.gray('CLAUDE.md')} ${ui.S.arrow} AGENTS.md` : 'CLAUDE.md exists; left untouched')
  if (seedMemory(target)) ui.step.ok(`seeded ${ui.gray('memory/')} from template`)
  if (post === 'greenfield') {
    const files = scaffoldStack(target)
    if (files.length) ui.step.ok(`scaffolded ${files.length} stack/CI files`)
  }

  ui.box(`lattice-standards@${version}  ${ui.S.dot}  ${projectName}`, [
    ui.bold('Next steps'),
    `${ui.gray('1.')} cd ${here(target)}`,
    `${ui.gray('2.')} ${ui.cyan(installHint())}`,
    `${ui.gray('3.')} lattice check`,
  ])
  return 0
}

/** Overlay the standard onto an existing repo, non-destructively. */
export async function adopt(opts = {}) {
  const target = resolve(process.cwd(), opts.dir ?? '.')
  if (!fs.existsSync(target)) {
    ui.step.err(`No such directory: ${opts.dir}`)
    return 1
  }

  let posture = opts.posture
  if (ui.interactive) {
    ui.banner(standardsVersion())
    ui.step.info(`Adopting the standard in ${ui.bold(here(target))}`)
    try {
      if (!posture) posture = await select('Engagement posture', POSTURE_CHOICES)
    } catch (err) {
      if (err instanceof Cancelled) return cancel()
      throw err
    }
    console.log('')
  }

  const version = standardsVersion()
  const post = normalizePosture(posture ?? 'guest')

  const sp = ui.spinner('vendoring core standard')
  const docs = vendorCore(target)
  sp.stop(`vendored ${docs.length} core docs to ${ui.gray(VENDOR_DIR + '/')} (base@${version})`)

  const agentsPath = join(target, 'AGENTS.md')
  if (fs.existsSync(agentsPath)) {
    const existing = fs.readFileSync(agentsPath, 'utf8')
    const keptPosture = readPosture(existing) ?? post
    fs.writeFileSync(agentsPath, upsertBlock(existing, latticeBlock({ version, posture: keptPosture })))
    ui.step.ok(`updated the Lattice block in ${ui.gray('AGENTS.md')} (rest left intact)`)
  } else {
    fs.writeFileSync(agentsPath, agentsMd({ name: opts.name ?? basename(target), version, posture: post }))
    ui.step.ok(`created ${ui.gray('AGENTS.md')}`)
  }
  ui.step.ok(linkClaudeMd(target) ? `linked ${ui.gray('CLAUDE.md')} ${ui.S.arrow} AGENTS.md` : 'CLAUDE.md exists; left untouched')

  ui.box(`lattice-standards@${version}`, [
    ui.bold('Next step'),
    `${ui.gray('run')} ${ui.cyan(installHint())}`,
  ])
  return 0
}

/** Update the vendored standard to the installed version. */
export function sync(opts = {}) {
  const target = resolve(process.cwd(), opts.dir ?? '.')
  if (!fs.existsSync(join(target, VENDOR_DIR))) {
    ui.step.err(`No ${VENDOR_DIR}/ found. Run "lattice init" or "lattice adopt" first.`)
    return 1
  }
  const before = vendoredVersion(target)
  const sp = ui.spinner('re-vendoring core standard')
  const docs = vendorCore(target)
  const after = standardsVersion()

  const agentsPath = join(target, 'AGENTS.md')
  if (fs.existsSync(agentsPath)) {
    const content = fs.readFileSync(agentsPath, 'utf8')
    const posture = readPosture(content) ?? 'greenfield'
    fs.writeFileSync(agentsPath, upsertBlock(content, latticeBlock({ version: after, posture })))
  }

  sp.stop(
    before === after
      ? `already at base@${after}; re-vendored ${docs.length} docs`
      : `synced base@${before ?? '?'} ${ui.S.arrow} @${after}; re-vendored ${docs.length} docs`,
  )
  return 0
}

/** Verify a project conforms to the installed standard. Non-zero on problems. */
export function check(opts = {}) {
  const target = resolve(process.cwd(), opts.dir ?? '.')
  const problems = []

  if (!fs.existsSync(join(target, VENDOR_DIR))) {
    ui.step.err(`no ${VENDOR_DIR}/ (run "lattice init" or "lattice adopt")`)
    return 1
  }

  const installed = standardsVersion()
  const vendored = vendoredVersion(target)
  if (!vendored) problems.push(`${VENDOR_DIR}/VERSION missing`)
  else if (vendored !== installed)
    problems.push(`vendored base@${vendored} is behind installed @${installed}; run "lattice sync"`)
  else {
    for (const f of standardDocs()) {
      if (docDiffers(target, f)) problems.push(`${VENDOR_DIR}/${f} differs from the standard (locally edited)`)
    }
  }

  const agentsPath = join(target, 'AGENTS.md')
  if (!fs.existsSync(agentsPath)) {
    problems.push('AGENTS.md missing')
  } else {
    const pin = readPin(fs.readFileSync(agentsPath, 'utf8'))
    if (!pin) problems.push('AGENTS.md has no lattice-standards@ pin')
    else if (vendored && pin !== vendored) problems.push(`AGENTS.md pins @${pin} but ${VENDOR_DIR}/ is @${vendored}`)
  }

  if (!fs.existsSync(join(target, 'CLAUDE.md'))) problems.push('CLAUDE.md missing')

  if (problems.length === 0) {
    ui.step.ok(`conforms to lattice-standards@${installed}`)
    return 0
  }
  ui.step.err(`found ${problems.length} problem(s):`)
  for (const p of problems) ui.step.note(`${ui.S.dot} ${p}`)
  return 1
}

function cancel() {
  ui.step.warn('cancelled')
  return 1
}
