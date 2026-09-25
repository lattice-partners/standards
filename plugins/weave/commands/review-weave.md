---
description: Manual audit — compare the repo to Weave principles, weave.md, and the "Run and test" section of AGENTS.md. Report only; do not autofix unless asked.
---

# Review Weave

Read-only alignment check against Weave principle skills, `weave.md`, and the
"Run and test" section in root `AGENTS.md`.

## Preflight

- Locate `weave.md` at the repo root.
- Locate the "Run and test" section in root `AGENTS.md`.
- If `weave.md` is missing, treat as full Lattice defaults and say so in the
  report. Missing `opt-out` on older files means none opted out.
- Confirm whether this is a read-only review unless the human asked for fixes.

## Plan

List which principle skills you will check (include `principle-process`) and
which stack or design tools apply given opt-outs.

## Commands

1. Read `weave.md` (missing = full defaults; say so).
2. Read the "Run and test" section for verification and project notes.
3. Check always-on principles: process, testing, security, front-end UX, code
   quality, performance. If the change is a demo or mock-up, also check
   `principle-demo` (no live database, session store, multiple reachable
   flows).
4. Skip tools listed under opt-out (do not fail for missing Supabase or
   Lattice Design if they opted out).
5. List findings with severity (blocker / should-fix / nit). If clean, say what
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
