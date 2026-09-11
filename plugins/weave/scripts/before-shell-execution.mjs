#!/usr/bin/env node
import { decideShell } from './lib/policy.mjs'
import { note, readStdinJson, writeJson } from './lib/io.mjs'

try {
  const decision = decideShell(await readStdinJson())
  writeJson(decision)
  if (decision.permission === 'deny') {
    note(decision.agent_message ?? decision.user_message)
    process.exit(2)
  }
} catch (err) {
  const decision = {
    permission: 'deny',
    user_message: 'Weave blocked a shell command because the hook payload was invalid.',
    agent_message: `beforeShellExecution failed closed: ${err.message}`,
  }
  writeJson(decision)
  note(decision.agent_message)
  process.exit(2)
}
