#!/usr/bin/env node
import { decideRead } from './lib/policy.mjs'
import { note, readStdinJson, writeJson } from './lib/io.mjs'

try {
  const decision = decideRead(await readStdinJson())
  writeJson(decision)
  if (decision.permission === 'deny') {
    note(decision.user_message)
    process.exit(2)
  }
} catch (err) {
  const decision = {
    permission: 'deny',
    user_message: 'Weave blocked a file read because the hook payload was invalid.',
  }
  writeJson(decision)
  note(`${decision.user_message} (${err.message})`)
  process.exit(2)
}
