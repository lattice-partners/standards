// The lattice commands. Each returns a process exit code. init and adopt run an
// interactive wizard for missing values when stdout is a TTY; otherwise they
// rely on flags and defaults so CI and tests stay non-interactive.

import { resolve, join, relative } from 'node:path'
import fs from 'node:fs'
import {
  VENDOR_DIR,
  HOOKS_PATH,
  STACKS,
  standardsVersion,
  standardDocs,
  stackDocs,
  hookNames,
  vendorCore,
  vendorStack,
  vendorHooks,
  vendoredVersion,
  docDiffers,
  hookDiffers,
  hooksInstalled,
  seedMemory,
  scaffoldStack,
  normalizePosture,
  normalizeStack,
  normalizeTracker,
  latticeBlock,
  agentsMd,
  upsertBlock,
  readPin,
  readPosture,
  readStack,
  readTracker,
  linkClaudeMd,
  installHint,
  basename,
} from './lib.js'
import * as ui from './ui.js'
import { text, select, confirm, Cancelled } from './prompts.js'
import { isRepo, isRepoRoot, configGet, configSet, initRepo, commitAll, createBranch } from './git.js'
import { withScreen, currentScreen, screenDepth } from './screen.js'

const POSTURE_CHOICES = [
  { label: 'Greenfield', value: 'greenfield', hint: 'Lattice owns the stack' },
  { label: 'Consultative guest', value: 'guest', hint: 'working in a client repo' },
]

const STACK_CHOICES = [
  { label: 'Next.js monorepo', value: 'next-monorepo', hint: 'web + api, Supabase, Clerk, Vercel' },
  { label: 'Minimal', value: 'minimal', hint: 'config only, no application' },
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
  let stack = normalizeStack(opts.stack)
  let tracker = opts.tracker

  const run = async () => {
    const screen = currentScreen()
    if (screen) {
      screen.setHeader({
        title: 'lattice init',
        version: standardsVersion(),
        context: here(target),
        subtitle: `New project in ${here(target)}`,
      })
    }
    if (ui.interactive) {
      try {
        if (!name) name = await text('Project name', { defaultValue: basename(target) })
        if (!posture) posture = await select('Engagement posture', POSTURE_CHOICES)
        if (!stack && normalizePosture(posture) === 'greenfield') {
          stack = await select('Scaffold', STACK_CHOICES)
        }
        if (tracker === undefined) tracker = await text('Ticket prefix (blank for none)', { defaultValue: '' })
      } catch (err) {
        if (err instanceof Cancelled) return cancel()
        throw err
      }
    }

    const version = standardsVersion()
    const post = normalizePosture(posture ?? 'greenfield')
    const projectName = name || basename(target)
    const track = normalizeTracker(tracker)
    const chosenStack = post === 'greenfield' ? (stack ?? STACKS[0]) : null

    const sp = ui.spinner('vendoring core standard')
    const docs = vendorCore(target)
    sp.stop(`vendored ${docs.length} core docs to ${ui.gray(VENDOR_DIR + '/')}`)

    if (chosenStack && chosenStack !== 'minimal') {
      const sd = vendorStack(target)
      if (sd.length) ui.step.ok(`vendored ${sd.length} stack doc(s)`)
    }

    fs.writeFileSync(
      agentsPath,
      agentsMd({ name: projectName, version, posture: post, stack: chosenStack, tracker: track }),
    )
    ui.step.ok(`wrote ${ui.gray('AGENTS.md')} (posture: ${post}${chosenStack ? `, stack: ${chosenStack}` : ''})`)
    ui.step.ok(linkClaudeMd(target) ? `linked ${ui.gray('CLAUDE.md')} ${ui.S.arrow} AGENTS.md` : 'CLAUDE.md exists; left untouched')
    if (seedMemory(target)) ui.step.ok(`seeded ${ui.gray('memory/')} from template`)

    if (chosenStack) {
      const files = scaffoldStack(target, chosenStack, { PROJECT_NAME: projectName })
      if (files.length) ui.step.ok(`scaffolded ${files.length} files (${chosenStack})`)
    }

    if (post === 'greenfield') bootstrapRepo(target, version)

    if (ui.interactive && post === 'greenfield') {
      try {
        if (await confirm('Run the setup wizard now?', true)) {
          const { setup } = await import('./setup.js')
          const code = await setup({ dir: target })
          if (screen && screenDepth() === 1) await screen.wait('enter to exit')
          return code
        }
      } catch (err) {
        if (err instanceof Cancelled) return cancel()
        throw err
      }
    }

    const nextSteps = [
      ui.bold('Next steps'),
      `${ui.gray('1.')} cd ${here(target)}`,
      `${ui.gray('2.')} ${ui.cyan('lattice setup')}  ${ui.gray('walk through the rest')}`,
    ]
    if (chosenStack === 'next-monorepo') {
      nextSteps.push(`${ui.gray('3.')} ${ui.cyan('npm run dev')}  ${ui.gray('when setup passes')}`)
    }
    ui.box(`lattice-standards@${version}  ${ui.S.dot}  ${projectName}`, nextSteps)
    if (screen && screenDepth() === 1) await screen.wait('enter to exit')
    return 0
  }

  if (!ui.interactive) return run()
  try {
    return await withScreen(run)
  } catch (err) {
    if (err instanceof Cancelled) return cancel()
    throw err
  }
}

/** Overlay the standard onto an existing repo, non-destructively. */
export async function adopt(opts = {}) {
  const target = resolve(process.cwd(), opts.dir ?? '.')
  if (!fs.existsSync(target)) {
    ui.step.err(`No such directory: ${opts.dir}`)
    return 1
  }

  let posture = opts.posture
  const run = async () => {
    const screen = currentScreen()
    if (screen) {
      screen.setHeader({
        title: 'lattice adopt',
        version: standardsVersion(),
        context: here(target),
        subtitle: `Adopting the standard in ${here(target)}`,
      })
    }
    if (ui.interactive) {
      try {
        if (!posture) posture = await select('Engagement posture', POSTURE_CHOICES)
      } catch (err) {
        if (err instanceof Cancelled) return cancel()
        throw err
      }
    }

    const version = standardsVersion()
    const post = normalizePosture(posture ?? 'guest')

    const sp = ui.spinner('vendoring core standard')
    const docs = vendorCore(target)
    sp.stop(`vendored ${docs.length} core docs to ${ui.gray(VENDOR_DIR + '/')} (base@${version})`)

    const agentsPath = join(target, 'AGENTS.md')
    if (fs.existsSync(agentsPath)) {
      const existing = fs.readFileSync(agentsPath, 'utf8')
      // A guest repo keeps whatever it already declared; adopt never re-decides.
      const block = latticeBlock({
        version,
        posture: readPosture(existing) ?? post,
        stack: readStack(existing),
        tracker: readTracker(existing),
      })
      fs.writeFileSync(agentsPath, upsertBlock(existing, block))
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
    if (ui.interactive) {
      const { offerCommand } = await import('./fix.js')
      const pin = `github:lattice-partners/standards#v${version}`
      await offerCommand(installHint(), ['npm', 'i', '-D', pin, '--allow-git=all'], target)
    }
    if (screen && screenDepth() === 1) await screen.wait('enter to exit')
    return 0
  }

  if (!ui.interactive) return run()
  try {
    return await withScreen(run)
  } catch (err) {
    if (err instanceof Cancelled) return cancel()
    throw err
  }
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
  let stack = null
  if (fs.existsSync(agentsPath)) {
    const content = fs.readFileSync(agentsPath, 'utf8')
    stack = readStack(content)
    const posture = readPosture(content) ?? 'greenfield'
    fs.writeFileSync(
      agentsPath,
      upsertBlock(content, latticeBlock({ version: after, posture, stack, tracker: readTracker(content) })),
    )
  }

  sp.stop(
    before === after
      ? `already at base@${after}; re-vendored ${docs.length} docs`
      : `synced base@${before ?? '?'} ${ui.S.arrow} @${after}; re-vendored ${docs.length} docs`,
  )

  // Stack docs and hooks propagate the same way the core docs do.
  if (stack && stack !== 'minimal') {
    const sd = vendorStack(target)
    if (sd.length) ui.step.ok(`re-vendored ${sd.length} stack doc(s)`)
  }
  if (fs.existsSync(join(target, HOOKS_PATH))) {
    const hn = vendorHooks(target)
    if (hn.length) ui.step.ok(`re-vendored ${hn.length} hook(s)`)
  }
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
  const agentsPath = join(target, 'AGENTS.md')
  const agents = fs.existsSync(agentsPath) ? fs.readFileSync(agentsPath, 'utf8') : null
  const stack = agents ? readStack(agents) : null

  if (!vendored) problems.push(`${VENDOR_DIR}/VERSION missing`)
  else if (vendored !== installed)
    problems.push(`vendored base@${vendored} is behind installed @${installed}; run "lattice sync"`)
  else {
    const docs = stack && stack !== 'minimal' ? [...standardDocs(), ...stackDocs()] : standardDocs()
    for (const f of docs) {
      if (docDiffers(target, f)) problems.push(`${VENDOR_DIR}/${f} differs from the standard (locally edited)`)
    }
  }

  if (!agents) {
    problems.push('AGENTS.md missing')
  } else {
    const pin = readPin(agents)
    if (!pin) problems.push('AGENTS.md has no lattice-standards@ pin')
    else if (vendored && pin !== vendored) problems.push(`AGENTS.md pins @${pin} but ${VENDOR_DIR}/ is @${vendored}`)
  }

  if (!fs.existsSync(join(target, 'CLAUDE.md'))) problems.push('CLAUDE.md missing')

  // Hooks are only expected once a project has vendored them.
  if (fs.existsSync(join(target, HOOKS_PATH))) {
    if (!hooksInstalled(target)) problems.push('git hooks are not installed; run "lattice hooks install"')
    for (const n of hookNames()) {
      if (hookDiffers(target, n)) problems.push(`${HOOKS_PATH}/${n} differs from the standard (locally edited)`)
    }
  }

  if (problems.length === 0) {
    ui.step.ok(`conforms to lattice-standards@${installed}`)
    return 0
  }
  ui.step.err(`found ${problems.length} problem(s):`)
  for (const p of problems) ui.step.note(`${ui.S.dot} ${p}`)
  return 1
}

/**
 * Point git at the vendored hooks. Refuses to take over an existing hooksPath:
 * a client repo already on Husky would otherwise silently lose its hooks.
 */
export function installHooks(target, { quiet = true } = {}) {
  if (!isRepo(target)) {
    if (!quiet) ui.step.warn('not a git repo yet; run "lattice hooks install" after git init')
    return 0
  }
  vendorHooks(target)
  const existing = configGet('core.hooksPath', target)
  if (existing && existing !== HOOKS_PATH) {
    if (!quiet) ui.step.warn(`core.hooksPath is already ${existing}; leaving it alone`)
    return 0
  }
  configSet('core.hooksPath', HOOKS_PATH, target)
  if (!quiet) ui.step.ok(`git hooks installed (${ui.gray(HOOKS_PATH)})`)
  return 0
}

/** "lattice hooks install" */
export function hooks(opts = {}) {
  const target = resolve(process.cwd(), opts.dir ?? '.')
  const action = opts.action ?? 'install'
  if (action !== 'install') {
    ui.step.err(`unknown hooks action: ${action}`)
    return 1
  }
  return installHooks(target, { quiet: false })
}

function cancel() {
  ui.step.warn('cancelled')
  return 1
}

/** Git init, first commit, dev branch, and hooks for a greenfield scaffold. */
function bootstrapRepo(target, version) {
  if (!isRepoRoot(target)) initRepo(target)

  const example = join(target, '.env.example')
  const local = join(target, '.env.local')
  if (fs.existsSync(example) && !fs.existsSync(local)) {
    fs.copyFileSync(example, local)
    ui.step.ok(`copied ${ui.gray('.env.example')} ${ui.S.arrow} ${ui.gray('.env.local')}`)
  }

  try {
    commitAll(target, `chore: scaffold from lattice-standards@${version}`, { noVerify: true })
    ui.step.ok(`initial commit on ${ui.gray('main')}`)
  } catch (err) {
    ui.step.warn(`could not create the initial commit: ${err.message}`)
    ui.step.warn('Set git user.name and user.email, then run: lattice doctor')
    return
  }

  try {
    createBranch('dev', target)
    ui.step.ok(`created ${ui.gray('dev')} branch`)
  } catch (err) {
    ui.step.warn(`could not create the dev branch: ${err.message}`)
  }
  installHooks(target, { quiet: false })
}
