---
description: Manual audit — compare the repo to Weave principles and this project's weave.md. Report only; do not autofix unless asked.
---

# Review Weave

Read-only alignment check against Weave principle skills and the project
`weave.md`.

## Preflight

- Locate `weave.md` at the repo root.
- If missing, treat as full Lattice defaults and say so in the report.
- Confirm whether this is a read-only review unless the human asked for fixes.

## Plan

List which principle skills you will check and which stack or design tools apply
given opt-outs.

## Commands

1. Read `weave.md` (missing = full defaults; say so).
2. Check always-on principles: testing, security, front-end UX, code quality,
   performance.
3. Skip tools listed under opt-out (do not fail for missing Supabase or
   Lattice Design if they opted out).
4. List findings with severity (blocker / should-fix / nit). If clean, say what
   you inspected.

Do not implement fixes unless explicitly asked.

## Verification

Every finding cites a path or principle. Verdict is approve or request changes.

## Summary

```text
## Result
- Action: review-weave
- Status: approve | request-changes
- Blockers: ...
- Inspected: ...
```
