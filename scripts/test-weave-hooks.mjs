#!/usr/bin/env node
// Exercise Weave Cursor hooks: deny/allow, malformed input, fail-closed JSON,
// paths with spaces, and session context.

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { decideRead, decideShell, isSecretEnvPath } from '../plugins/weave/scripts/lib/policy.mjs'
import { sessionContext } from '../plugins/weave/scripts/session-start.mjs'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const SCRIPTS = join(ROOT, 'plugins/weave/scripts')
let failed = 0

function step(label, fn) {
  try {
    fn()
    console.error(`ok  ${label}`)
  } catch (err) {
    failed++
    console.error(`not ok  ${label}`)
    console.error(`    ${err.message}`)
  }
}

function runHook(script, stdin, extraEnv = {}) {
  return spawnSync(process.execPath, [join(SCRIPTS, script)], {
    input: stdin,
    encoding: 'utf8',
    env: { ...process.env, ...extraEnv },
  })
}

function parseStdout(result) {
  const line = result.stdout.trim().split('\n').at(-1)
  return JSON.parse(line)
}

step('deny force-push variants', () => {
  for (const command of [
    'git push --force origin HEAD',
    'git push -f origin HEAD',
    'git push --force-with-lease',
    'git -C "/tmp/my project" push --force origin main',
  ]) {
    const decision = decideShell({ command })
    assert.equal(decision.permission, 'deny', command)
  }
})

step('deny hook bypass on commit and push', () => {
  for (const command of [
    'git commit --no-verify -m "feat: x"',
    'git commit -n -m "feat: x"',
    'git commit --skip-checks -m "feat: x"',
    'git push --no-verify origin HEAD',
  ]) {
    assert.equal(decideShell({ command }).permission, 'deny', command)
  }
})

step('deny supabase db reset and vercel --prod', () => {
  for (const command of [
    'supabase db reset',
    'npx supabase db reset --yes',
    'pnpm supabase db reset',
    'vercel --prod',
    'npx vercel deploy --prod',
    'vercel deploy --prod=true',
  ]) {
    assert.equal(decideShell({ command }).permission, 'deny', command)
  }
})

step('allow ordinary git, tests, and preview deploys', () => {
  for (const command of [
    'git status',
    'git commit -m "feat: add reset"',
    'git push origin HEAD',
    'npm test',
    'vercel',
    'npx vercel deploy',
    'git commit -m "feat: mention --no-verify in prose"',
  ]) {
    assert.equal(decideShell({ command }).permission, 'allow', command)
  }
})

step('malformed shell payload denies', () => {
  assert.equal(decideShell(null).permission, 'deny')
  assert.equal(decideShell({}).permission, 'deny')
  assert.equal(decideShell({ command: 12 }).permission, 'deny')
})

step('block real env files including paths with spaces', () => {
  for (const file_path of [
    '/tmp/.env',
    '/tmp/.env.local',
    '/tmp/.env.production',
    '/tmp/my project/.env',
    '/tmp/my project/.env.production.local',
    '/tmp/apps/web/.env',
  ]) {
    assert.equal(isSecretEnvPath(file_path), true, file_path)
    assert.equal(decideRead({ file_path }).permission, 'deny', file_path)
  }
})

step('allow env examples and ordinary source files', () => {
  for (const file_path of [
    '/tmp/.env.example',
    '/tmp/my project/.env.example',
    '/tmp/.env.sample',
    '/tmp/src/index.ts',
    '/tmp/AGENTS.md',
  ]) {
    assert.equal(decideRead({ file_path }).permission, 'allow', file_path)
  }
})

step('malformed read payload denies', () => {
  assert.equal(decideRead(null).permission, 'deny')
  assert.equal(decideRead({}).permission, 'deny')
})

step('beforeShellExecution script fail-closes on bad JSON', () => {
  const result = runHook('before-shell-execution.mjs', 'not-json')
  assert.equal(result.status, 2)
  const body = parseStdout(result)
  assert.equal(body.permission, 'deny')
  assert.ok(body.user_message)
})

step('beforeShellExecution script denies force-push via stdin', () => {
  const result = runHook(
    'before-shell-execution.mjs',
    JSON.stringify({ command: 'git push --force origin HEAD', cwd: '/tmp' }),
  )
  assert.equal(result.status, 2)
  assert.equal(parseStdout(result).permission, 'deny')
})

step('beforeShellExecution script allows git status', () => {
  const result = runHook(
    'before-shell-execution.mjs',
    JSON.stringify({ command: 'git status', cwd: '/tmp' }),
  )
  assert.equal(result.status, 0)
  assert.equal(parseStdout(result).permission, 'allow')
})

step('beforeReadFile script denies spaced env path', () => {
  const result = runHook(
    'before-read-file.mjs',
    JSON.stringify({ file_path: '/tmp/my project/.env' }),
  )
  assert.equal(result.status, 2)
  assert.equal(parseStdout(result).permission, 'deny')
})

step('beforeReadFile script fail-closes on empty stdin', () => {
  const result = runHook('before-read-file.mjs', '')
  assert.equal(result.status, 2)
  assert.equal(parseStdout(result).permission, 'deny')
})

step('sessionStart injects guest context without AGENTS.md', () => {
  const cwd = fs.mkdtempSync(join(os.tmpdir(), 'weave-session-'))
  const text = sessionContext(cwd)
  assert.match(text, /guest posture/)
  assert.match(text, /Tracker: none declared/)
  assert.match(text, /Vendored standards: none/)
})

step('sessionStart detects tracker, stack, and .lattice', () => {
  const cwd = fs.mkdtempSync(join(os.tmpdir(), 'weave-session-'))
  fs.writeFileSync(
    join(cwd, 'AGENTS.md'),
    'Tracker: MIN\nLattice stack: next-monorepo\n',
  )
  fs.mkdirSync(join(cwd, '.lattice'))
  fs.writeFileSync(join(cwd, '.lattice/VERSION'), '0.8.0\n')
  fs.mkdirSync(join(cwd, 'apps'))
  fs.mkdirSync(join(cwd, 'supabase'))
  const text = sessionContext(cwd)
  assert.match(text, /Instructions: AGENTS\.md/)
  assert.match(text, /Tracker: MIN/)
  assert.match(text, /\.lattice\/ \(0\.8\.0\)/)
  assert.match(text, /next-monorepo/)
})

step('hooks.json failClosed is set for security pre-hooks', () => {
  const hooks = JSON.parse(
    fs.readFileSync(join(ROOT, 'plugins/weave/hooks/hooks.json'), 'utf8'),
  )
  assert.equal(hooks.hooks.beforeShellExecution[0].failClosed, true)
  assert.equal(hooks.hooks.beforeReadFile[0].failClosed, true)
  assert.ok(hooks.hooks.beforeShellExecution[0].command.includes('${CURSOR_PLUGIN_ROOT}'))
})

step('missing node runtime is a fail-closed config concern, not a silent allow', () => {
  const result = spawnSync('weave-node-missing-runtime-test', [], { encoding: 'utf8' })
  assert.ok(result.error || result.status)
  const hooks = JSON.parse(
    fs.readFileSync(join(ROOT, 'plugins/weave/hooks/hooks.json'), 'utf8'),
  )
  assert.equal(hooks.hooks.beforeShellExecution[0].failClosed, true)
})

if (failed) {
  console.error(`${failed} Weave hook test(s) failed`)
  process.exit(1)
}
console.error('ok: Weave hook tests passed')
