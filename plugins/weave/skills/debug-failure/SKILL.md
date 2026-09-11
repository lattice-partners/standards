---
name: debug-failure
description: Diagnose a failure from evidence before changing code. Use when tests fail, a preview is broken, a hook rejected a commit, or behaviour does not match the ticket.
---

# Debug a failure

Do not speculate a fix and apply it to see if the error goes away. Gather
evidence first.

## Preflight

- Reproduce, or quote the exact command and output you already have.
- Read the failing test, log, hook message, or stack trace in full.
- Note whether the failure is local, CI, preview, staging, or production.

## Action

1. Name the failing assertion or symptom in one sentence.
2. Trace it to a specific file and behaviour.
3. Form one hypothesis. Test that hypothesis with a read, a log, or a
   focused command.
4. Only then change code. Keep the change as small as the cause.
5. Banned "fixes": disable RLS, use the secret key, delete the test, run
   `--no-verify`, reset the database, deploy `--prod` to debug.

## Verification

The original failing command now passes, or you have a clear question for a
human because the next step is destructive or product-ambiguous.

## Summary

Symptom, evidence, cause, change, and the command that now passes.
