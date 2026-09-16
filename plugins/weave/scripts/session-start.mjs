#!/usr/bin/env node
import fs from 'node:fs'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { note, readStdinJson, writeJson } from './lib/io.mjs'

const VAR_KEYS = ['slack_channels', 'github_org', 'tracker_team', 'email_query']

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

function pluginVars(payload = {}, env = process.env) {
  const bag = {
    ...(payload.variables && typeof payload.variables === 'object' ? payload.variables : {}),
    ...(payload.plugin_variables && typeof payload.plugin_variables === 'object'
      ? payload.plugin_variables
      : {}),
    ...(payload.pluginVariables && typeof payload.pluginVariables === 'object'
      ? payload.pluginVariables
      : {}),
  }
  const out = {}
  for (const key of VAR_KEYS) {
    const fromBag = typeof bag[key] === 'string' ? bag[key].trim() : ''
    const fromEnv = typeof env[key] === 'string' ? env[key].trim() : ''
    const value = fromBag || fromEnv
    if (value) out[key] = value
  }
  return out
}

function weaveExcerpt(text, maxLines = 24) {
  const lines = text.trim().split('\n')
  if (lines.length <= maxLines) return text.trim()
  return `${lines.slice(0, maxLines).join('\n')}\n… (truncated; read Weave.md)`
}

export function sessionContext(cwd = process.cwd(), payload = {}, env = process.env) {
  const agentsPath = firstExisting(cwd, ['AGENTS.md', 'CLAUDE.md'])
  const agentsText = agentsPath ? read(agentsPath) : ''
  const weavePath = firstExisting(cwd, ['Weave.md', 'weave.md', 'WEAVE.md'])
  const weaveText = weavePath ? read(weavePath) : ''
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
  const vars = pluginVars(payload, env)
  const varLine = VAR_KEYS.map((key) => `${key}=${vars[key] ? 'set' : 'unset'}`).join(', ')

  const instructions = agentsPath
    ? relative(cwd, agentsPath) || agentsPath
    : 'none (guest posture; do not run lattice init unless asked)'

  let vendored = 'none (Git hooks are not installed unless .lattice/hooks exists)'
  if (fs.existsSync(latticeDir)) {
    vendored = latticeVersion ? `.lattice/ (${latticeVersion})` : '.lattice/'
  }

  const overrides = weavePath
    ? `${relative(cwd, weavePath) || weavePath} (project exceptions beat defaults)`
    : 'none (Lattice defaults apply in full)'

  const lines = [
    'Weave session context:',
    `- Instructions: ${instructions}`,
    `- Tracker: ${tracker ?? 'none declared'}`,
    `- Vendored standards: ${vendored}`,
    `- Stack: ${stackGuess ?? 'not detected'}`,
    `- Overrides: ${overrides}`,
    `- Plugin harvest vars: ${varLine}`,
    '- Signal loop: harvest meetings, Slack, mail, GitHub, and the tracker before planning product work. Skip harvest for typos and one-line fixes. Do not post to Slack or send mail unless asked.',
    '- Guardrails: no force-push, no --no-verify, no supabase db reset, no vercel --prod, no reading real .env files. Git hooks remain the commit gate.',
  ]

  if (weaveText.trim()) {
    lines.push('', 'Weave.md:', weaveExcerpt(weaveText))
  }

  return lines.join('\n')
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href

if (isMain) {
  try {
    const payload = await readStdinJson().catch(() => ({}))
    writeJson({ additional_context: sessionContext(process.cwd(), payload) })
  } catch (err) {
    note(`sessionStart skipped: ${err.message}`)
    writeJson({})
  }
}
