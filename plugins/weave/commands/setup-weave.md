---
description: Kickoff — inspect the repo and write or update weave.md. Ask when unsure. Do not start building.
---

# Setup Weave

Write or update the project `weave.md`. Do not invent a stack. Do not start
building features.

## Preflight

- Is there already a `weave.md` in the repo root?
- Skim the repo for Supabase, Clerk, Vercel, and existing UI patterns.
- If posture is unclear (Lattice-owned vs client existing repo), ask before
  writing the file.

## Plan

State whose repo this is, what stack is actually present, and which Lattice
defaults will be opted in or out.

## Commands

1. If `weave.md` exists, show it and only change what is wrong.
2. Decide: Lattice-owned new project, or a client's existing repo?
3. Note what is here (Supabase, Clerk, Lattice Design, Vercel).
4. For each Lattice default that is missing, ask: opt out, or we still want it?
5. Write the short `weave.md` using `plugins/weave/templates/weave.md` as the
   shape. Stop.

## Verification

`weave.md` exists at the repo root (or you explained why not). Opt-outs match
what the human confirmed. You did not start implementation work.

## Summary

```text
## Result
- Action: setup-weave
- Status: success | partial | failed
- Details: repo type, opt-outs recorded, file path
```
