import { basename } from 'node:path'

const GIT_BYPASS = /(?:^|[\s=])(?:--no-verify|--skip-checks|-n)(?=\s|$)/
const GIT_FORCE = /(?:^|[\s=])(?:--force|--force-with-lease|-f)(?=\s|$)/
const PROD_VERCEL = /(?:^|[\s])(?:--prod|--prod=true)(?=\s|$)/

function normalize(command) {
  return String(command ?? '').replace(/\s+/g, ' ').trim()
}

function withoutQuotes(command) {
  return command.replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''")
}

function gitSubcommand(command) {
  const match = command.match(
    /\bgit(?:\s+-C\s+(?:"[^"]+"|'[^']+'|\S+))?\s+([a-z-]+)\b/i,
  )
  return match ? match[1].toLowerCase() : null
}

function looksLikeSupabase(command) {
  return /(?:^|[\/\s])(?:npx|pnpm|yarn|bunx|bun)\s+supabase\b/.test(command) ||
    /(?:^|[\/\s])supabase\b/.test(command)
}

function looksLikeVercel(command) {
  return /(?:^|[\/\s])(?:npx|pnpm|yarn|bunx|bun)\s+vercel\b/.test(command) ||
    /(?:^|[\/\s])vercel\b/.test(command)
}

export function decideShell(input) {
  if (!input || typeof input !== 'object' || typeof input.command !== 'string') {
    return {
      permission: 'deny',
      user_message: 'Weave blocked a malformed shell hook payload.',
      agent_message:
        'beforeShellExecution input must be JSON with a string "command". Do not retry the same command.',
    }
  }

  const command = normalize(input.command)
  if (!command) {
    return { permission: 'allow' }
  }
  const flags = withoutQuotes(command)

  const gitCmd = gitSubcommand(flags)
  if (gitCmd === 'push' && GIT_FORCE.test(flags)) {
    return {
      permission: 'deny',
      user_message: 'Weave blocked a force-push.',
      agent_message:
        'Never git push --force, -f, or --force-with-lease. Rewrite locally and push a new commit, or ask a human.',
    }
  }

  if ((gitCmd === 'commit' || gitCmd === 'push' || gitCmd === 'merge') && GIT_BYPASS.test(flags)) {
    return {
      permission: 'deny',
      user_message: 'Weave blocked a git hook bypass.',
      agent_message:
        'Never use --no-verify, -n, or --skip-checks. Fix the hook failure instead of skipping the gate.',
    }
  }

  if (looksLikeSupabase(flags) && /\bdb\s+reset\b/.test(flags)) {
    return {
      permission: 'deny',
      user_message: 'Weave blocked supabase db reset.',
      agent_message:
        'Do not reset the database. Ask for explicit approval before any destructive data change.',
    }
  }

  if (looksLikeVercel(flags) && PROD_VERCEL.test(flags)) {
    return {
      permission: 'deny',
      user_message: 'Weave blocked a production Vercel deploy.',
      agent_message:
        'Do not run vercel --prod. Preview deploys are fine. Production promotion stays a human step.',
    }
  }

  return { permission: 'allow' }
}

const ENV_ALLOW = /\.example$|\.sample$|\.template$/i

export function isSecretEnvPath(filePath) {
  if (!filePath || typeof filePath !== 'string') return false
  const name = basename(filePath.replaceAll('\\', '/'))
  if (name === '.env' || name.startsWith('.env.')) {
    return !ENV_ALLOW.test(name)
  }
  return false
}

export function decideRead(input) {
  if (!input || typeof input !== 'object') {
    return {
      permission: 'deny',
      user_message: 'Weave blocked a malformed file-read hook payload.',
    }
  }

  const paths = []
  if (typeof input.file_path === 'string') paths.push(input.file_path)
  if (Array.isArray(input.attachments)) {
    for (const item of input.attachments) {
      if (item && typeof item.file_path === 'string') paths.push(item.file_path)
    }
  }

  if (!paths.length) {
    return {
      permission: 'deny',
      user_message: 'Weave blocked a file read with no path.',
    }
  }

  const blocked = paths.find((path) => isSecretEnvPath(path))
  if (blocked) {
    const name = basename(blocked.replaceAll('\\', '/'))
    return {
      permission: 'deny',
      user_message: `Weave blocked a read of ${name}. Use .env.example for names and placeholders.`,
    }
  }

  return { permission: 'allow' }
}
