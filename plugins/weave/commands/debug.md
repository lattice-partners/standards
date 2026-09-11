---
description: Diagnose a failure from evidence before changing code.
---

# Debug

Follow the `debug-failure` skill. Do not apply speculative fixes.

## Preflight

- Capture the exact command and output, or reproduce it.
- Note environment: local, CI, preview, staging, production.

## Plan

State the symptom and the first evidence you will read. Do not propose a
patch until the cause is named.

## Commands

Load and follow `debug-failure`. Banned shortcuts: disable RLS, secret key,
delete the test, `--no-verify`, `supabase db reset`, `vercel --prod`.

## Verification

The original failing command passes, or you have a question that must be
answered before a destructive step.

## Summary

```text
## Result
- Action: debug
- Status: success | blocked | needs input
- Details: symptom, cause, change, passing command
```
