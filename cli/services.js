// Read-only provider probes and setup evidence. Commands that can mutate a
// provider stay in setup.js so they always sit behind an explicit prompt.

import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import { join } from 'node:path'
import { envLocalValue } from './workflow.js'
export { SUPABASE_CLI_VERSION, VERCEL_CLI_VERSION } from './lib.js'

/** Resolve a project-local CLI first, then a command available on PATH. */
export function resolveCli(target, name) {
  const local = join(target, 'node_modules', '.bin', name)
  if (fs.existsSync(local)) return local
  for (const directory of (process.env.PATH || '').split(process.platform === 'win32' ? ';' : ':')) {
    const candidate = join(directory, process.platform === 'win32' ? `${name}.cmd` : name)
    if (directory && fs.existsSync(candidate)) return candidate
  }
  return null
}

/** Run a read-only command and return a result without throwing. */
export function captureCommand(command, args, cwd) {
  try {
    const stdout = execFileSync(command, args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 16 * 1024 * 1024,
    })
    return { ok: true, stdout: stdout.trim() }
  } catch (error) {
    return {
      ok: false,
      stdout: '',
      error: String(error.stderr || error.message || '').replace(/\b(?:sk|sb_secret|sbp)_[A-Za-z0-9._-]+/g, '[secret]').trim(),
    }
  }
}

/** Parse JSON defensively because provider CLIs occasionally prefix notices. */
export function parseCliJson(value) {
  const text = String(value).trim()
  for (const start of [text.indexOf('{'), text.indexOf('[')].filter((index) => index >= 0).sort((a, b) => a - b)) {
    try {
      return JSON.parse(text.slice(start))
    } catch {
      // Try the next possible JSON boundary.
    }
  }
  return null
}

/** Read KEY=value settings without exposing them to command output. */
export function readEnvFile(path) {
  if (!fs.existsSync(path)) return {}
  const content = fs.readFileSync(path, 'utf8')
  const values = {}
  for (const line of content.split('\n')) {
    const match = line.trim().match(/^([A-Z][A-Z0-9_]*)=(.*)$/)
    if (match) values[match[1]] = match[2].trim()
  }
  return values
}

/** Validate the two Clerk application keys without logging either value. */
export function validateClerkKeys(values) {
  const publishable = values.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || ''
  const secret = values.CLERK_SECRET_KEY || ''
  const publicEnvironment = publishable.match(/^pk_(test|live)_/)?.[1]
  const secretEnvironment = secret.match(/^sk_(test|live)_/)?.[1]
  return {
    good: Boolean(publicEnvironment && secretEnvironment && publicEnvironment === secretEnvironment),
    environment: publicEnvironment && publicEnvironment === secretEnvironment ? publicEnvironment : null,
  }
}

/** Extract publishable and secret project keys from Supabase CLI JSON. */
export function parseSupabaseKeys(value) {
  const rows = Array.isArray(value) ? value : value?.api_keys || value?.keys || []
  const result = {}
  for (const row of rows) {
    const key = row.api_key || row.value || row.key || ''
    const name = String(row.name || row.type || '').toLowerCase()
    if (!result.publishable && (name.includes('publishable') || key.startsWith('sb_publishable_'))) {
      result.publishable = key
    }
    if (!result.secret && (name.includes('secret') || key.startsWith('sb_secret_'))) result.secret = key
  }
  return result
}

/** Report whether the backup response proves PITR is enabled. */
export function pitrEnabled(value) {
  return value?.pitr_enabled === true
}

/** Read the project ref written by `supabase link`. */
export function linkedSupabaseRef(target) {
  const path = join(target, 'supabase', '.temp', 'project-ref')
  return fs.existsSync(path) ? fs.readFileSync(path, 'utf8').trim() || null : null
}

/** Inspect the linked Supabase project, credentials, and PITR state. */
export function probeSupabase(target, runner = captureCommand) {
  const command = resolveCli(target, 'supabase')
  if (!command) return { good: false, reason: 'Supabase CLI is not installed' }
  const projectRef = linkedSupabaseRef(target)
  if (!projectRef) return { good: false, reason: 'Supabase project is not linked', command }
  const projects = runner(command, ['projects', 'list', '--output', 'json'], target)
  if (!projects.ok) return { good: false, reason: 'Supabase CLI is not authenticated', command, projectRef }
  const listed = parseCliJson(projects.stdout)
  if (!Array.isArray(listed) || !listed.some((project) => (project.id || project.ref) === projectRef)) {
    return { good: false, reason: 'linked Supabase project is not available to this account', command, projectRef }
  }
  const keysResult = runner(command, ['projects', 'api-keys', '--project-ref', projectRef, '--output', 'json'], target)
  const backupResult = runner(command, ['backups', 'list', '--project-ref', projectRef, '--output', 'json'], target)
  const keys = keysResult.ok ? parseSupabaseKeys(parseCliJson(keysResult.stdout)) : {}
  const pitr = backupResult.ok && pitrEnabled(parseCliJson(backupResult.stdout))
  return {
    good: Boolean(keys.publishable && keys.secret && pitr),
    reason: !keys.publishable || !keys.secret ? 'Supabase project keys could not be verified' : !pitr ? 'Supabase PITR is not enabled' : null,
    command,
    projectRef,
    keys,
    pitr,
  }
}

function linkedVercelProject(target, app) {
  const path = join(target, 'apps', app, '.vercel', 'project.json')
  if (!fs.existsSync(path)) return null
  try {
    const value = JSON.parse(fs.readFileSync(path, 'utf8'))
    return value.projectId && value.orgId ? value : null
  } catch {
    return null
  }
}

/** Extract environment-variable names from Vercel CLI JSON. */
export function vercelEnvNames(value) {
  const rows = Array.isArray(value) ? value : value?.envs || value?.environmentVariables || []
  return new Set(rows.map((row) => row.key || row.name).filter(Boolean))
}

/** Inspect both Vercel links, required env names, and the API firewall. */
export function probeVercel(target, runner = captureCommand) {
  const command = resolveCli(target, 'vercel')
  if (!command) return { good: false, reason: 'Vercel CLI is not installed' }
  const who = runner(command, ['whoami'], target)
  if (!who.ok) return { good: false, reason: 'Vercel CLI is not authenticated', command }
  const web = linkedVercelProject(target, 'web')
  const api = linkedVercelProject(target, 'api')
  if (!web || !api) return { good: false, reason: 'both Vercel apps must be linked', command, web, api }
  const webEnv = runner(command, ['env', 'ls', 'development', '--format=json', '--cwd', join(target, 'apps', 'web')], target)
  const apiEnv = runner(command, ['env', 'ls', 'development', '--format=json', '--cwd', join(target, 'apps', 'api')], target)
  const webNames = webEnv.ok ? vercelEnvNames(parseCliJson(webEnv.stdout)) : new Set()
  const apiNames = apiEnv.ok ? vercelEnvNames(parseCliJson(apiEnv.stdout)) : new Set()
  const requiredWeb = ['API_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY']
  const requiredApi = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY']
  const missing = [
    ...requiredWeb.filter((key) => !webNames.has(key)).map((key) => `web:${key}`),
    ...requiredApi.filter((key) => !apiNames.has(key)).map((key) => `api:${key}`),
  ]
  const firewall = runner(command, ['firewall', 'rules', 'list', '--cwd', join(target, 'apps', 'api')], target)
  const publishedRateLimit = firewall.ok && /rate.?limit/i.test(firewall.stdout) && /\/api/i.test(firewall.stdout) && !/draft only/i.test(firewall.stdout)
  return {
    good: missing.length === 0 && publishedRateLimit,
    reason: missing.length ? `missing Vercel environment variables: ${missing.join(', ')}` : !publishedRateLimit ? 'a published /api rate-limit rule was not found' : null,
    command,
    web,
    api,
    missing,
    publishedRateLimit,
  }
}

/** Verify the Clerk key pair with a read-only Backend API request. */
export async function probeClerk(target, fetcher = globalThis.fetch) {
  const values = readEnvFile(join(target, '.env.local'))
  const shape = validateClerkKeys(values)
  if (!shape.good) return { good: false, reason: 'Clerk keys are missing, malformed, or from different environments' }
  try {
    const response = await fetcher('https://api.clerk.com/v1/users?limit=1', {
      headers: { Authorization: `Bearer ${values.CLERK_SECRET_KEY}` },
    })
    return { good: response.ok, reason: response.ok ? null : `Clerk rejected the secret key (${response.status})`, environment: shape.environment }
  } catch {
    return { good: false, reason: 'Clerk could not be reached', environment: shape.environment }
  }
}

/** Open a browser without adding a dependency on a provider CLI. */
export function openBrowser(url) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open'
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url]
  return spawnSync(command, args, { stdio: 'ignore' }).status === 0
}

/** Record non-secret evidence for a dashboard-only setup control. */
export function recordSetupEvidence(target, label, reference) {
  const path = join(target, 'memory', 'project-details.md')
  if (!fs.existsSync(path)) return false
  let content = fs.readFileSync(path, 'utf8')
  const marker = '## Setup verification'
  if (!content.includes(marker)) content = content.trimEnd() + `\n\n${marker}\n`
  const safeReference = String(reference).replace(/[^A-Za-z0-9._:/ -]/g, '')
  const line = `- ${label}: confirmed ${new Date().toISOString()}${safeReference ? ` (${safeReference})` : ''}`
  const pattern = new RegExp(`^- ${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:.*$`, 'm')
  content = pattern.test(content) ? content.replace(pattern, line) : content.trimEnd() + `\n${line}\n`
  fs.writeFileSync(path, content)
  return true
}

/** Check whether a dashboard-only control already has recorded evidence. */
export function hasSetupEvidence(target, label) {
  const path = join(target, 'memory', 'project-details.md')
  if (!fs.existsSync(path)) return false
  return fs.readFileSync(path, 'utf8').split('\n').some((line) => line.startsWith(`- ${label}: confirmed `))
}

/** Read a single local setting for health and provider setup. */
export function localSetting(target, key) {
  const path = join(target, '.env.local')
  return fs.existsSync(path) ? envLocalValue(fs.readFileSync(path, 'utf8'), key) : null
}

/** Create a private temporary file path for merging provider env output. */
export function privateTempFile(prefix) {
  const directory = fs.mkdtempSync(join(os.tmpdir(), `${prefix}-`))
  return { directory, path: join(directory, '.env.local') }
}
