// Self-check: exercise the commands, hooks, and workflow against temp projects.
// Run with `npm test`. No framework, asserts only. Commands run non-interactive
// here because stdout is not a TTY, so no prompt ever fires.
//
// lattice:allow-secret-patterns - the fixtures below are deliberately shaped
// like real keys so the scanner has something to catch.

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import { join } from 'node:path'
import { init, adopt, sync, check, hooks } from './commands.js'
import { preCommit, commitMsg } from './hooks.js'
import { ticket, releaseBody, setEnvLocalValue, envKeyHint, emptyEnvKeys, auditDoctor } from './workflow.js'
import { setup, stepDevBranch, normalizeRemoteUrl, waitForHealth } from './setup.js'
import { clip, padLine, runCommandInTerminal, spread, visibleWidth } from './screen.js'
import { standardsVersion, status, VENDOR_DIR, HOOKS_PATH } from './lib.js'
import { git, configGet, isRepo, isRepoRoot, refExists, remoteHeads } from './git.js'
import { applyFix, redactSecrets } from './fix.js'
import {
  parseCliJson,
  parseSupabaseKeys,
  pitrEnabled,
  probeSupabase,
  probeVercel,
  recordSetupEvidence,
  validateClerkKeys,
  vercelEnvNames,
} from './services.js'

const version = standardsVersion()
const root = fs.mkdtempSync(join(os.tmpdir(), 'lattice-cli-'))
let failed = 0

// Stop git discovering any repository above the temp root. Without this, a git
// call made in a directory that is not a repo walks up the tree and operates on
// whatever it finds, which means a test can write config into the real repo it
// is being run from. Child git processes inherit this.
process.env.GIT_CEILING_DIRECTORIES = root
delete process.env.GIT_DIR
delete process.env.GIT_WORK_TREE

function tmp(name) {
  const d = join(root, name)
  fs.mkdirSync(d, { recursive: true })
  return d
}

/** A temp dir that is a real git repo with a committable identity. */
function repo(name) {
  const d = tmp(name)
  git(['init', '-b', 'main'], d)
  // --local is explicit so a write can never land in an outer repo's config.
  git(['config', '--local', 'user.email', 'test@example.com'], d)
  git(['config', '--local', 'user.name', 'Test'], d)
  return d
}

function write(d, file, content) {
  const p = join(d, file)
  fs.mkdirSync(join(p, '..'), { recursive: true })
  fs.writeFileSync(p, content)
  return p
}

/** Stage a file and run the pre-commit hook against it. */
function stageAndCheck(d, file, content) {
  write(d, file, content)
  git(['add', '-A'], d)
  return preCommit(d)
}

function commit(d, msg) {
  git(['add', '-A'], d)
  git(['commit', '--no-verify', '--allow-empty', '-m', msg], d)
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

// --- scaffolding -----------------------------------------------------------

await step('init scaffolds AGENTS.md, CLAUDE.md symlink, and .lattice/', async () => {
  const d = tmp('green')
  assert.equal(await init({ dir: d, name: 'demo' }), 0)
  assert.ok(fs.existsSync(join(d, 'AGENTS.md')))
  assert.equal(fs.readFileSync(join(d, VENDOR_DIR, 'VERSION'), 'utf8').trim(), version)
  assert.ok(fs.lstatSync(join(d, 'CLAUDE.md')).isSymbolicLink())
  assert.match(fs.readFileSync(join(d, 'AGENTS.md'), 'utf8'), new RegExp(`lattice-standards@${version}`))
  assert.equal(check({ dir: d }), 0)
})

await step('init defaults to the next-monorepo scaffold', async () => {
  const d = tmp('mono')
  await init({ dir: d, name: 'acme' })
  for (const f of [
    'package.json',
    'turbo.json',
    'tsconfig.base.json',
    'apps/web/package.json',
    'apps/api/package.json',
    '.github/workflows/ci.yml',
  ]) {
    assert.ok(fs.existsSync(join(d, f)), `missing ${f}`)
  }
  const pkg = JSON.parse(fs.readFileSync(join(d, 'package.json'), 'utf8'))
  assert.deepEqual(pkg.workspaces, ['apps/*', 'packages/*'])
  assert.equal(pkg.devDependencies.supabase, '2.115.0')
  // {{PROJECT_NAME}} and {{STANDARDS_VERSION}} must both be substituted.
  assert.equal(pkg.name, 'acme')
  assert.equal(JSON.stringify(pkg).includes('{{'), false, 'unsubstituted template var')
  // Dotfiles ship undotted in the template and are restored on copy.
  assert.ok(fs.existsSync(join(d, '.gitignore')))
  assert.ok(fs.existsSync(join(d, '.claude/settings.json')))
  assert.match(fs.readFileSync(join(d, 'AGENTS.md'), 'utf8'), /Lattice stack: next-monorepo/)
  assert.ok(fs.existsSync(join(d, VENDOR_DIR, 'stack-baseline.md')), 'stack doc not vendored')
})

await step('init --stack=minimal keeps the config-only scaffold', async () => {
  const d = tmp('minimal')
  await init({ dir: d, stack: 'minimal' })
  for (const f of ['tsconfig.json', 'eslint.config.mjs', 'prettier.config.mjs', '.gitignore']) {
    assert.ok(fs.existsSync(join(d, f)), `missing ${f}`)
  }
  assert.equal(fs.existsSync(join(d, 'apps')), false, 'minimal should not scaffold apps/')
  const ci = fs.readFileSync(join(d, '.github/workflows/ci.yml'), 'utf8')
  assert.match(ci, new RegExp(`standards-check@v${version.replace(/\./g, '\\.')}`))
})

await step('init rejects an unknown stack', async () => {
  await assert.rejects(() => init({ dir: tmp('badstack'), stack: 'nope' }), /unknown stack/)
})

await step('adopt does not scaffold stack config or hooks', async () => {
  const d = repo('guest')
  fs.writeFileSync(join(d, 'AGENTS.md'), '# client\n')
  await adopt({ dir: d })
  assert.equal(fs.existsSync(join(d, 'tsconfig.json')), false)
  assert.equal(fs.existsSync(join(d, HOOKS_PATH)), false)
  assert.equal(configGet('core.hooksPath', d), null)
})

await step('init refuses an existing AGENTS.md without --force', async () => {
  const d = tmp('exists')
  fs.writeFileSync(join(d, 'AGENTS.md'), '# keep me\n')
  assert.equal(await init({ dir: d }), 1)
  assert.equal(fs.readFileSync(join(d, 'AGENTS.md'), 'utf8'), '# keep me\n')
})

// --- drift and propagation -------------------------------------------------

await step('check flags local edits; sync restores conformance', async () => {
  const d = tmp('drift')
  await init({ dir: d, name: 'drift' })
  fs.appendFileSync(join(d, VENDOR_DIR, 'agents-base.md'), '\nlocal edit\n')
  assert.equal(check({ dir: d }), 1)
  assert.equal(sync({ dir: d }), 0)
  assert.equal(check({ dir: d }), 0)
})

await step('sync propagates an edited stack baseline', async () => {
  const d = tmp('stackdrift')
  await init({ dir: d, name: 'sd' })
  fs.appendFileSync(join(d, VENDOR_DIR, 'stack-baseline.md'), '\nedited\n')
  assert.equal(check({ dir: d }), 1)
  sync({ dir: d })
  assert.equal(check({ dir: d }), 0)
})

await step('check and sync cover vendored hooks', async () => {
  const d = repo('hookdrift')
  git(['config', '--local', 'user.email', 'test@example.com'], d)
  git(['config', '--local', 'user.name', 'Test'], d)
  await init({ dir: d, name: 'hd' })
  assert.ok(fs.existsSync(join(d, HOOKS_PATH, 'pre-commit')), 'hooks not vendored')
  assert.equal(configGet('core.hooksPath', d), HOOKS_PATH)
  assert.equal(check({ dir: d }), 0)
  fs.appendFileSync(join(d, HOOKS_PATH, 'pre-commit'), '\n# tampered\n')
  assert.equal(check({ dir: d }), 1)
  sync({ dir: d })
  assert.equal(check({ dir: d }), 0)
})

await step('check fails when hooks are vendored but not switched on', async () => {
  const d = repo('hookoff')
  git(['config', '--local', 'user.email', 'test@example.com'], d)
  git(['config', '--local', 'user.name', 'Test'], d)
  await init({ dir: d, name: 'ho' })
  git(['config', '--unset', 'core.hooksPath'], d)
  assert.equal(check({ dir: d }), 1)
})

await step('hooks install refuses to clobber an existing hooksPath', async () => {
  const d = repo('husky')
  await adopt({ dir: d })
  git(['config', '--local', 'core.hooksPath', '.husky'], d)
  assert.equal(hooks({ dir: d }), 0)
  assert.equal(configGet('core.hooksPath', d), '.husky')
})

await step('hooks install succeeds when target is not a git repo', async () => {
  const d = tmp('nohooksrepo')
  await init({ dir: d, name: 'nhr' })
  assert.equal(hooks({ dir: d }), 0)
})

await step('init creates a git repo with main, dev, hooks, and .env.local', async () => {
  const d = repo('boot')
  git(['config', '--local', 'user.email', 'test@example.com'], d)
  git(['config', '--local', 'user.name', 'Test'], d)
  await init({ dir: d, name: 'boot' })
  assert.equal(git(['rev-parse', '--abbrev-ref', 'HEAD'], d), 'main')
  assert.ok(refExists('dev', d))
  assert.equal(configGet('core.hooksPath', d), HOOKS_PATH)
  assert.ok(fs.existsSync(join(d, '.env.local')))
  assert.equal(git(['ls-files', '.env.local'], d), '')
  assert.equal(git(['rev-list', '--count', 'HEAD'], d), '1')
})

await step('init creates a nested repository instead of committing its parent', async () => {
  const parent = repo('nested-parent')
  write(parent, 'parent.txt', 'parent\n')
  commit(parent, 'chore: parent')
  const before = git(['rev-parse', 'HEAD'], parent)
  const child = join(parent, 'child')
  await init({ dir: child, name: 'nested', stack: 'minimal' })
  assert.equal(isRepoRoot(child), true)
  assert.equal(git(['rev-parse', 'HEAD'], parent), before)
  assert.equal(fs.realpathSync(git(['rev-parse', '--show-toplevel'], child)), fs.realpathSync(child))
})

await step('git() scrubs inherited git environment variables', () => {
  const d = repo('gitenv')
  write(d, 'probe.txt', 'x\n')
  git(['add', 'probe.txt'], d)
  git(['commit', '-m', 'chore: probe'], d)
  process.env.GIT_INDEX_FILE = '.git/index'
  process.env.GIT_DIR = '/tmp/bogus'
  assert.equal(fs.realpathSync(git(['rev-parse', '--show-toplevel'], d)), fs.realpathSync(d))
  delete process.env.GIT_INDEX_FILE
  delete process.env.GIT_DIR
})

await step('adopt is non-destructive on an existing AGENTS.md', async () => {
  const d = tmp('brown')
  fs.writeFileSync(join(d, 'AGENTS.md'), '# client repo\n\nExisting house rules.\n')
  assert.equal(await adopt({ dir: d }), 0)
  const out = fs.readFileSync(join(d, 'AGENTS.md'), 'utf8')
  assert.match(out, /Existing house rules\./)
  assert.match(out, /lattice:standards/)
  assert.equal(check({ dir: d }), 0)
})

await step('adopt is idempotent (single Lattice block)', async () => {
  const d = tmp('twice')
  fs.writeFileSync(join(d, 'AGENTS.md'), '# repo\n')
  await adopt({ dir: d })
  await adopt({ dir: d })
  const out = fs.readFileSync(join(d, 'AGENTS.md'), 'utf8')
  assert.equal(out.match(/<!-- lattice:standards -->/g).length, 1)
})

await step('status reports initialized, version, and drift', async () => {
  const d = tmp('status')
  assert.equal(status(d).initialized, false)
  await init({ dir: d, name: 'st' })
  const st = status(d)
  assert.equal(st.initialized, true)
  assert.equal(st.vendored, version)
  assert.equal(st.drift, 'none')
  assert.equal(st.stack, 'next-monorepo')
  fs.appendFileSync(join(d, VENDOR_DIR, 'agents-base.md'), '\nedit\n')
  assert.equal(status(d).drift, 'edited')
})

// --- pre-commit guardrails -------------------------------------------------

await step('pre-commit blocks a staged .env file', async () => {
  const d = repo('envfile')
  assert.equal(stageAndCheck(d, '.env', 'SECRET=hunter2\n'), 1)
})

await step('pre-commit allows .env.example', async () => {
  const d = repo('envexample')
  assert.equal(stageAndCheck(d, '.env.example', 'SUPABASE_SECRET_KEY=\n'), 0)
})

await step('pre-commit blocks a committed secret key', async () => {
  const d = repo('secret')
  assert.equal(stageAndCheck(d, 'config.ts', "export const k = 'sb_secret_abcdef1234567890'\n"), 1)
})

await step('pre-commit blocks a secret in a NEXT_PUBLIC_ variable', async () => {
  const d = repo('publicsecret')
  assert.equal(stageAndCheck(d, 'app.ts', 'const k = process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY\n'), 1)
})

await step('pre-commit blocks a migration that drops a table', async () => {
  const d = repo('dropmig')
  const sql = 'alter table users enable row level security;\ndrop table old_users;\n'
  assert.equal(stageAndCheck(d, 'supabase/migrations/001_x.sql', sql), 1)
})

await step('pre-commit allows a destructive migration once marked approved', async () => {
  const d = repo('approvedmig')
  const sql = '-- lattice:destructive-approved\ndrop table old_users;\n'
  assert.equal(stageAndCheck(d, 'supabase/migrations/001_x.sql', sql), 0)
})

await step('pre-commit blocks a table created without RLS', async () => {
  const d = repo('norls')
  assert.equal(stageAndCheck(d, 'supabase/migrations/002_x.sql', 'create table notes (id int);\n'), 1)
})

await step('pre-commit accepts a table created with RLS enabled', async () => {
  const d = repo('withrls')
  const sql = 'create table notes (id int);\nalter table notes enable row level security;\n'
  assert.equal(stageAndCheck(d, 'supabase/migrations/003_x.sql', sql), 0)
})

await step('pre-commit blocks a branch that is not a ticket branch', async () => {
  const d = repo('branch')
  write(d, 'AGENTS.md', 'Tracker: MIN\n')
  commit(d, 'chore: init')
  git(['checkout', '-b', 'my-feature'], d)
  assert.equal(stageAndCheck(d, 'a.txt', 'x\n'), 1)
})

await step('pre-commit accepts a correctly named ticket branch', async () => {
  const d = repo('branchok')
  write(d, 'AGENTS.md', 'Tracker: MIN\n')
  commit(d, 'chore: init')
  git(['checkout', '-b', 'MIN-155'], d)
  assert.equal(stageAndCheck(d, 'a.txt', 'x\n'), 0)
})

await step('pre-commit blocks committing on dev', async () => {
  const d = repo('ondev')
  write(d, 'AGENTS.md', 'Tracker: MIN\n')
  commit(d, 'chore: init')
  git(['checkout', '-b', 'dev'], d)
  assert.equal(stageAndCheck(d, 'a.txt', 'x\n'), 1)
})

// Merging a ticket branch into dev is itself a commit on dev, and must not be
// caught by the rule that keeps authored work off dev.
await step('pre-commit allows a merge landing on dev', async () => {
  const d = repo('mergedev')
  write(d, 'AGENTS.md', 'Tracker: MIN\n')
  commit(d, 'chore: init')
  git(['branch', 'dev'], d)
  git(['checkout', '-b', 'MIN-1'], d)
  write(d, 'a.txt', 'x\n')
  commit(d, 'feat: add a')
  git(['checkout', 'dev'], d)
  // --no-commit leaves MERGE_HEAD set, which is the state the hook sees.
  git(['merge', '--no-ff', '--no-commit', 'MIN-1'], d)
  assert.equal(preCommit(d), 0)
})

// The affected-package filter needs a HEAD to diff against. A brand new project
// has none at its first commit, and turbo fails with a raw git error.
await step('pre-commit omits the turbo filter until there is a HEAD', () => {
  const d = repo('turbofilter')
  write(d, 'turbo.json', '{"tasks":{}}')
  const log = join(d, 'turbo-args.txt')
  const bin = write(d, 'node_modules/.bin/turbo', `#!/bin/sh\necho "$@" >> ${log}\nexit 0\n`)
  fs.chmodSync(bin, 0o755)

  stageAndCheck(d, 'a.txt', 'x\n')
  assert.equal(fs.readFileSync(log, 'utf8').includes('--filter'), false, 'filtered with no HEAD')

  commit(d, 'chore: first')
  stageAndCheck(d, 'b.txt', 'y\n')
  assert.ok(fs.readFileSync(log, 'utf8').includes('--filter=...[HEAD]'), 'no filter once HEAD exists')
})

// --- commit-msg ------------------------------------------------------------

function msg(d, text) {
  const p = join(d, 'MSG')
  fs.writeFileSync(p, text)
  return commitMsg(p, d)
}

await step('commit-msg accepts a conventional subject', () => {
  const d = tmp('msgok')
  assert.equal(msg(d, 'feat: add password reset\n'), 0)
})

await step('commit-msg rejects a non-conventional subject', () => {
  const d = tmp('msgbad')
  assert.equal(msg(d, 'added some stuff\n'), 1)
})

await step('commit-msg rejects an em dash', () => {
  const d = tmp('msgdash')
  assert.equal(msg(d, 'feat: add reset — the long way\n'), 1)
})

await step('commit-msg rejects an AI attribution trailer', () => {
  const d = tmp('msgattr')
  assert.equal(msg(d, 'feat: add reset\n\nCo-Authored-By: Someone <a@b.c>\n'), 1)
})

await step('commit-msg rejects a ticket id and a URL', () => {
  const d = tmp('msgticket')
  write(d, 'AGENTS.md', 'Tracker: MIN\n')
  assert.equal(msg(d, 'feat: add reset for MIN-155\n'), 1)
  assert.equal(msg(d, 'feat: add reset\n\nhttps://example.com/x\n'), 1)
})

// The ticket check keys off the configured prefix. A bare CAPS-number pattern
// would also reject "ADR-0006", which this repo cites in commit bodies.
await step('commit-msg allows an ADR reference', () => {
  const d = tmp('msgadr')
  write(d, 'AGENTS.md', 'Tracker: MIN\n')
  assert.equal(msg(d, 'feat: add hooks\n\nRecorded in ADR-0007.\n'), 0)
  const noTracker = tmp('msgnotracker')
  assert.equal(msg(noTracker, 'feat: add hooks\n\nSee ADR-0006 and ADR-0008.\n'), 0)
})

// Merge commits are generated by git and GitHub, and they carry the branch name
// that lattice release reads. Rejecting them would block the whole workflow.
await step('commit-msg allows merge and revert commits', () => {
  const d = tmp('msgmerge')
  assert.equal(msg(d, 'Merge pull request #1 from acme/MIN-155\n'), 0)
  assert.equal(msg(d, 'Revert "feat: add reset"\n'), 0)
  const p = join(d, 'MSG')
  fs.writeFileSync(p, 'anything at all\n')
  assert.equal(commitMsg(p, d, 'merge'), 0)
})

// --- ticket and release ----------------------------------------------------

await step('setup refuses a non-interactive terminal', async () => {
  const d = tmp('nosetup')
  await init({ dir: d, name: 'ns' })
  assert.equal(await setup({ dir: d }), 1)
})

await step('setup refuses an uninitialized directory', async () => {
  assert.equal(await setup({ dir: tmp('raw') }), 1)
})

await step('setup stepDevBranch does not throw on an unborn HEAD', async () => {
  const d = tmp('unborn-setup')
  git(['init', '-b', 'main'], d)
  git(['config', '--local', 'user.email', 'test@example.com'], d)
  git(['config', '--local', 'user.name', 'Test'], d)
  // Non-interactive: offerFixes cannot prompt, so this can only report the
  // failure, not crash the way a direct `git branch dev` call used to.
  assert.equal(await stepDevBranch(d), false)
  assert.equal(refExists('dev', d), false)
})

await step('normalizeRemoteUrl accepts common GitHub paste shapes', () => {
  assert.equal(normalizeRemoteUrl('git@github.com:acme/app.git'), 'git@github.com:acme/app.git')
  assert.equal(normalizeRemoteUrl('https://github.com/acme/app'), 'https://github.com/acme/app.git')
  assert.equal(normalizeRemoteUrl('github.com/acme/app'), 'https://github.com/acme/app.git')
  assert.equal(normalizeRemoteUrl('not a url'), null)
})

await step('remoteHeads verifies branches on a reachable remote', () => {
  const source = repo('remote-source')
  commit(source, 'chore: init')
  git(['branch', 'dev'], source)
  const bare = tmp('remote.git')
  git(['init', '--bare'], bare)
  git(['push', bare, 'main', 'dev'], source)
  assert.deepEqual([...remoteHeads(bare, source)].sort(), ['dev', 'main'])
  assert.throws(() => remoteHeads(join(root, 'missing.git'), source))
})

await step('setEnvLocalValue updates a key in place', () => {
  const out = setEnvLocalValue('API_URL=\nFOO=bar\n', 'API_URL', 'http://localhost:3001')
  assert.match(out, /^API_URL=http:\/\/localhost:3001/m)
  assert.match(out, /FOO=bar/)
})

await step('envKeyHint reads comments above a key', () => {
  const ex = '# Origin of the api app.\nAPI_URL=\n'
  assert.match(envKeyHint(ex, 'API_URL'), /Origin of the api app/)
})

await step('emptyEnvKeys lists keys still blank in .env.local', async () => {
  const d = tmp('emptyenv')
  write(d, '.env.example', 'API_URL=\nFOO=\n')
  write(d, '.env.local', 'API_URL=http://localhost:3001\nFOO=\n')
  assert.deepEqual(emptyEnvKeys(d), ['FOO'])
})

await step('screen clip and spread fit a terminal width', () => {
  assert.equal(visibleWidth('\x1b[96mhello\x1b[0m'), 5)
  assert.equal(clip('abcdefghij', 6), 'abcde…')
  assert.equal(padLine('hi', 5), 'hi   ')
  assert.equal(spread('left', 'right', 14), 'left     right')
})

await step('doctor attaches a runnable git init fix', () => {
  const d = tmp('doctorfix')
  const gitInit = auditDoctor(d).results.find((result) => result.action?.kind === 'git-init')
  assert.ok(gitInit)
  assert.equal(gitInit.action.label, 'git init -b main')
  assert.equal(gitInit.id, 'git-repository')
})

await step('applyFix verifies the named doctor postcondition', async () => {
  const d = tmp('applyfix')
  const check = auditDoctor(d).results.find((result) => result.id === 'git-repository')
  const result = await applyFix(d, check)
  assert.equal(result.ran, true)
  assert.equal(result.verified, true)
  assert.equal(isRepo(d), true)
})

await step('applyFix makes the initial commit before creating dev on an unborn HEAD', async () => {
  const d = tmp('unborn-fix')
  git(['init', '-b', 'main'], d)
  git(['config', '--local', 'user.email', 'test@example.com'], d)
  git(['config', '--local', 'user.name', 'Test'], d)
  write(d, 'placeholder.txt', 'x\n')
  const check = auditDoctor(d).results.find((result) => result.id === 'git-dev')
  assert.ok(check, 'expected a git-dev finding')
  const result = await applyFix(d, check)
  assert.equal(result.verified, true)
  assert.ok(refExists('dev', d))
  assert.equal(git(['rev-list', '--count', 'HEAD'], d), '1')
})

await step('secret redaction masks provider tokens', () => {
  const output = redactSecrets('Authorization: Bearer sk_test_abc123 and sbp_token123')
  assert.equal(output.includes('abc123'), false)
  assert.equal(output.includes('token123'), false)
})

await step('provider parsers accept current CLI response shapes', () => {
  const json = parseCliJson('notice\n[{"name":"publishable","api_key":"sb_publishable_public"},{"name":"secret","api_key":"sb_secret_private"}]')
  assert.deepEqual(parseSupabaseKeys(json), {
    publishable: 'sb_publishable_public',
    secret: 'sb_secret_private',
  })
  assert.equal(pitrEnabled({ pitr_enabled: true }), true)
  assert.deepEqual([...vercelEnvNames({ envs: [{ key: 'API_URL' }] })], ['API_URL'])
  assert.equal(validateClerkKeys({ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_public', CLERK_SECRET_KEY: 'sk_test_private' }).good, true)
  assert.equal(validateClerkKeys({ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_public', CLERK_SECRET_KEY: 'sk_live_private' }).good, false)
})

await step('Supabase probe verifies auth, keys, and PITR from fixtures', () => {
  const d = tmp('supabase-probe')
  write(d, 'node_modules/.bin/supabase', '')
  write(d, 'supabase/.temp/project-ref', 'abcdefgh')
  const runner = (_command, args) => {
    const joined = args.join(' ')
    if (joined.startsWith('projects list')) return { ok: true, stdout: '[{"id":"abcdefgh"}]' }
    if (joined.startsWith('projects api-keys')) {
      return { ok: true, stdout: '[{"name":"publishable","api_key":"sb_publishable_public"},{"name":"secret","api_key":"sb_secret_private"}]' }
    }
    if (joined.startsWith('backups list')) return { ok: true, stdout: '{"pitr_enabled":true}' }
    return { ok: false, stdout: '' }
  }
  assert.equal(probeSupabase(d, runner).good, true)
  const noPitr = (_command, args) => args[0] === 'backups'
    ? { ok: true, stdout: '{"pitr_enabled":false}' }
    : runner(_command, args)
  assert.equal(probeSupabase(d, noPitr).reason, 'Supabase PITR is not enabled')
})

await step('Vercel probe rejects missing env and accepts published firewall fixtures', () => {
  const d = tmp('vercel-probe')
  write(d, 'node_modules/.bin/vercel', '')
  write(d, 'apps/web/.vercel/project.json', '{"projectId":"web","orgId":"org"}')
  write(d, 'apps/api/.vercel/project.json', '{"projectId":"api","orgId":"org"}')
  const webKeys = ['API_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY']
  const apiKeys = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY']
  const runner = (_command, args) => {
    if (args[0] === 'whoami') return { ok: true, stdout: 'tester' }
    if (args[0] === 'env') {
      const keys = args.join(' ').includes('apps/web') ? webKeys : apiKeys
      return { ok: true, stdout: JSON.stringify(keys.map((key) => ({ key }))) }
    }
    if (args[0] === 'firewall') return { ok: true, stdout: 'Rate Limit /api active' }
    return { ok: false, stdout: '' }
  }
  assert.equal(probeVercel(d, runner).good, true)
  const missingEnv = (_command, args) => args[0] === 'env'
    ? { ok: true, stdout: '[]' }
    : runner(_command, args)
  assert.match(probeVercel(d, missingEnv).reason, /missing Vercel environment variables/)
})

await step('setup evidence is resumable and never stores secrets', () => {
  const d = tmp('evidence')
  write(d, 'memory/project-details.md', '# Project details\n')
  assert.equal(recordSetupEvidence(d, 'Supabase PITR', 'project-ref'), true)
  assert.equal(recordSetupEvidence(d, 'Supabase PITR', 'project-ref'), true)
  const content = fs.readFileSync(join(d, 'memory/project-details.md'), 'utf8')
  assert.equal((content.match(/Supabase PITR/g) || []).length, 1)
  assert.doesNotMatch(content, /sk_test|sb_secret/)
})

await step('health polling requires both apps', async () => {
  const seen = new Set()
  const good = await waitForHealth(async (url) => {
    seen.add(url)
    return { ok: true }
  }, 50, 1)
  assert.equal(good, true)
  assert.equal(seen.size, 2)
  const bad = await waitForHealth(async (url) => ({ ok: !url.includes('3001') }), 5, 1)
  assert.equal(bad, false)
})

await step('terminal command runner reports status and spawn failures', () => {
  assert.equal(runCommandInTerminal(process.execPath, ['--version'], root).ok, true)
  assert.equal(runCommandInTerminal('lattice-command-that-does-not-exist', [], root).ok, false)
})

await step('PTY command output survives full-screen suspension and resume', () => {
  const screenUrl = new URL('./screen.js', import.meta.url).href
  const program = `import {withScreen,runInTerminal} from ${JSON.stringify(screenUrl)}; await withScreen(async()=>{runInTerminal(process.execPath,['-e','console.log("PTY_CHILD_OK")'])})`
  const python = 'import os,pty,sys; pty.spawn(sys.argv[1:])'
  const output = execFileSync('python3', ['-c', python, process.execPath, '--input-type=module', '-e', program], { encoding: 'utf8' })
  assert.match(output, /PTY_CHILD_OK/)
})

await step('ticket branches from dev', () => {
  const d = repo('ticket')
  write(d, 'AGENTS.md', 'Tracker: MIN\n')
  commit(d, 'chore: init')
  git(['branch', 'dev'], d)
  assert.equal(ticket({ dir: d, id: 'MIN-155' }), 0)
  assert.equal(git(['rev-parse', '--abbrev-ref', 'HEAD'], d), 'MIN-155')
  assert.equal(git(['rev-parse', 'MIN-155'], d), git(['rev-parse', 'dev'], d))
})

await step('ticket rejects an id that does not match the tracker', () => {
  const d = repo('ticketbad')
  write(d, 'AGENTS.md', 'Tracker: MIN\n')
  commit(d, 'chore: init')
  git(['branch', 'dev'], d)
  assert.equal(ticket({ dir: d, id: 'ENG-1' }), 1)
})

await step('release builds closing words and feature lines', () => {
  const d = repo('release')
  commit(d, 'chore: init')
  git(['checkout', '-b', 'dev'], d)
  git(['checkout', '-b', 'MIN-155'], d)
  commit(d, 'feat: add password reset')
  git(['checkout', 'dev'], d)
  git(['merge', '--no-ff', 'MIN-155', '-m', 'Merge pull request #1 from acme/MIN-155'], d)

  const out = releaseBody(d, {})
  assert.deepEqual(out.ids, ['MIN-155'])
  assert.deepEqual(out.lines, ['Add password reset'])
  assert.match(out.body, /^- Closes MIN-155$/m)
  assert.match(out.body, /^- Add password reset$/m)
})

await step('release accepts explicit ticket ids for squash merges', () => {
  const d = repo('releasesquash')
  commit(d, 'chore: init')
  git(['checkout', '-b', 'dev'], d)
  commit(d, 'fix: stop duplicate rows in the export')
  const out = releaseBody(d, { tickets: 'MIN-160, MIN-161' })
  assert.deepEqual(out.ids.sort(), ['MIN-160', 'MIN-161'])
  assert.deepEqual(out.lines, ['Stop duplicate rows in the export'])
})

fs.rmSync(root, { recursive: true, force: true })
if (failed) {
  console.error(`\n${failed} check(s) failed`)
  process.exit(1)
}
console.log('\nall checks passed')
