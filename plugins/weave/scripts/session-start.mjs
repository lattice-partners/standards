#!/usr/bin/env node
import fs from 'node:fs'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { note, readStdinJson, writeJson } from './lib/io.mjs'

function firstExisting(cwd, names) {
  for (const name of names) {
    const path = join(cwd, name)
    if (fs.existsSync(path)) return path
  }
  return null
}

function read(path) {
  try {
    return fs.readFileSync(path, 'utf8')
  } catch {
    return ''
  }
}

function field(content, label) {
  const match = content.match(new RegExp(`^${label}:\\s*(.+)$`, 'm'))
  return match ? match[1].trim() : null
}

export function sessionContext(cwd = process.cwd()) {
  const agentsPath = firstExisting(cwd, ['AGENTS.md', 'CLAUDE.md'])
  const agentsText = agentsPath ? read(agentsPath) : ''
  const latticeDir = join(cwd, '.lattice')
  const latticeVersionPath = join(latticeDir, 'VERSION')
  const latticeVersion = fs.existsSync(latticeVersionPath)
    ? read(latticeVersionPath).trim()
    : null
  const tracker = field(agentsText, 'Tracker')
  const stack = field(agentsText, 'Lattice stack')
  const hasApps = fs.existsSync(join(cwd, 'apps'))
  const hasSupabase = fs.existsSync(join(cwd, 'supabase'))
  const stackGuess =
    stack || (hasApps && hasSupabase ? 'next-monorepo layout on disk' : null)

  const instructions = agentsPath
    ? relative(cwd, agentsPath) || agentsPath
    : 'none (guest posture; do not run lattice init unless asked)'

  let vendored = 'none (Git hooks are not installed unless .lattice/hooks exists)'
  if (fs.existsSync(latticeDir)) {
    vendored = latticeVersion ? `.lattice/ (${latticeVersion})` : '.lattice/'
  }

  return [
    'Weave session context:',
    `- Instructions: ${instructions}`,
    `- Tracker: ${tracker ?? 'none declared'}`,
    `- Vendored standards: ${vendored}`,
    `- Stack: ${stackGuess ?? 'not detected'}`,
    '- Guardrails: no force-push, no --no-verify, no supabase db reset, no vercel --prod, no reading real .env files. Git hooks remain the commit gate.',
  ].join('\n')
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href

if (isMain) {
  try {
    await readStdinJson().catch(() => ({}))
    writeJson({ additional_context: sessionContext() })
  } catch (err) {
    note(`sessionStart skipped: ${err.message}`)
    writeJson({})
  }
}
