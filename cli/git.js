// Thin wrappers over the git CLI. Every call is explicit about its cwd so the
// hooks, ticket, and release commands can all operate on a given project dir.

import { execFileSync } from 'node:child_process'

/** Run git and return trimmed stdout. Throws with git's stderr on failure. */
export function git(args, cwd = process.cwd()) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  } catch (err) {
    const detail = (err.stderr || '').toString().trim() || err.message
    throw new Error(`git ${args.join(' ')}: ${detail}`)
  }
}

/** True when the git call succeeds. Use for probes, not for output. */
export function gitOk(args, cwd = process.cwd()) {
  try {
    git(args, cwd)
    return true
  } catch {
    return false
  }
}

export function isRepo(cwd = process.cwd()) {
  return gitOk(['rev-parse', '--git-dir'], cwd)
}

/** Current branch name, or null when detached or not a repo. */
export function currentBranch(cwd = process.cwd()) {
  try {
    const b = git(['symbolic-ref', '--short', 'HEAD'], cwd)
    return b || null
  } catch {
    return null
  }
}

/** Paths staged for commit (added, copied, modified, renamed). */
export function stagedFiles(cwd = process.cwd()) {
  const out = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR'], cwd)
  return out ? out.split('\n').filter(Boolean) : []
}

/**
 * Content of a staged file as it will be committed. Reading the worktree would
 * miss the case where the staged and on-disk versions differ.
 */
export function stagedContent(file, cwd = process.cwd()) {
  try {
    return execFileSync('git', ['show', `:${file}`], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 32 * 1024 * 1024,
    })
  } catch {
    return ''
  }
}

export function configGet(key, cwd = process.cwd()) {
  try {
    return git(['config', '--local', '--get', key], cwd) || null
  } catch {
    return null
  }
}

export function configSet(key, value, cwd = process.cwd()) {
  git(['config', '--local', key, value], cwd)
}

/** Commit subjects in from..to, newest first. */
export function commitSubjects(from, to, cwd = process.cwd()) {
  const out = git(['log', '--no-merges', '--format=%s', `${from}..${to}`], cwd)
  return out ? out.split('\n').filter(Boolean) : []
}

/** True when a ref resolves. Used to tell origin/dev from a missing remote. */
export function refExists(ref, cwd = process.cwd()) {
  return gitOk(['rev-parse', '--verify', '--quiet', ref], cwd)
}

/** Re-stage a file the hook rewrote (prettier autofix). */
export function stageFile(file, cwd = process.cwd()) {
  git(['add', '--', file], cwd)
}
