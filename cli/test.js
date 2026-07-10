// Self-check: exercise the four commands against a temp project.
// Run with `npm test`. No framework, asserts only. Commands run non-interactive
// here because stdout is not a TTY, so no prompt ever fires.

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import { join } from 'node:path'
import { init, adopt, sync, check } from './commands.js'
import { standardsVersion, VENDOR_DIR } from './lib.js'

const version = standardsVersion()
const root = fs.mkdtempSync(join(os.tmpdir(), 'lattice-cli-'))
let failed = 0

function tmp(name) {
  const d = join(root, name)
  fs.mkdirSync(d, { recursive: true })
  return d
}

async function step(label, fn) {
  try {
    await fn()
    console.log(`  ok  ${label}`)
  } catch (err) {
    failed++
    console.error(`FAIL  ${label}\n      ${err.message}`)
  }
}

// init produces a conforming project
await step('init scaffolds AGENTS.md, CLAUDE.md symlink, and .lattice/', async () => {
  const d = tmp('green')
  assert.equal(await init({ dir: d, name: 'demo' }), 0)
  assert.ok(fs.existsSync(join(d, 'AGENTS.md')))
  assert.equal(fs.readFileSync(join(d, VENDOR_DIR, 'VERSION'), 'utf8').trim(), version)
  assert.ok(fs.lstatSync(join(d, 'CLAUDE.md')).isSymbolicLink())
  assert.match(fs.readFileSync(join(d, 'AGENTS.md'), 'utf8'), new RegExp(`lattice-standards@${version}`))
  assert.equal(check({ dir: d }), 0)
})

// init lays down stack config and a version-pinned CI workflow for greenfield
await step('init scaffolds stack config and CI for greenfield', async () => {
  const d = tmp('stack')
  await init({ dir: d })
  for (const f of [
    'tsconfig.json',
    'eslint.config.mjs',
    'prettier.config.mjs',
    '.gitignore',
    '.github/workflows/ci.yml',
  ]) {
    assert.ok(fs.existsSync(join(d, f)), `missing ${f}`)
  }
  const ci = fs.readFileSync(join(d, '.github/workflows/ci.yml'), 'utf8')
  assert.match(ci, new RegExp(`standards-check@v${version.replace(/\./g, '\\.')}`))
})

// adopt (guest posture) does not impose stack config on a client repo
await step('adopt does not scaffold stack config', async () => {
  const d = tmp('guest')
  fs.writeFileSync(join(d, 'AGENTS.md'), '# client\n')
  await adopt({ dir: d })
  assert.equal(fs.existsSync(join(d, 'tsconfig.json')), false)
})

// init refuses to clobber an existing AGENTS.md without --force
await step('init refuses an existing AGENTS.md without --force', async () => {
  const d = tmp('exists')
  fs.writeFileSync(join(d, 'AGENTS.md'), '# keep me\n')
  assert.equal(await init({ dir: d }), 1)
  assert.equal(fs.readFileSync(join(d, 'AGENTS.md'), 'utf8'), '# keep me\n')
})

// check fails when a vendored doc is edited, passes again after sync
await step('check flags local edits; sync restores conformance', async () => {
  const d = tmp('drift')
  await init({ dir: d, name: 'drift' })
  fs.appendFileSync(join(d, VENDOR_DIR, 'agents-base.md'), '\nlocal edit\n')
  assert.equal(check({ dir: d }), 1)
  assert.equal(sync({ dir: d }), 0)
  assert.equal(check({ dir: d }), 0)
})

// adopt preserves an existing AGENTS.md and injects the Lattice block
await step('adopt is non-destructive on an existing AGENTS.md', async () => {
  const d = tmp('brown')
  fs.writeFileSync(join(d, 'AGENTS.md'), '# client repo\n\nExisting house rules.\n')
  assert.equal(await adopt({ dir: d }), 0)
  const out = fs.readFileSync(join(d, 'AGENTS.md'), 'utf8')
  assert.match(out, /Existing house rules\./)
  assert.match(out, /lattice:standards/)
  assert.equal(check({ dir: d }), 0)
})

// adopt run twice does not duplicate the block
await step('adopt is idempotent (single Lattice block)', async () => {
  const d = tmp('twice')
  fs.writeFileSync(join(d, 'AGENTS.md'), '# repo\n')
  await adopt({ dir: d })
  await adopt({ dir: d })
  const out = fs.readFileSync(join(d, 'AGENTS.md'), 'utf8')
  assert.equal(out.match(/<!-- lattice:standards -->/g).length, 1)
})

fs.rmSync(root, { recursive: true, force: true })
if (failed) {
  console.error(`\n${failed} check(s) failed`)
  process.exit(1)
}
console.log('\nall checks passed')
