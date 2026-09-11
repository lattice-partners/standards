---
description: Inspect the repo and set up Lattice only if this project already opted in. Guest repos get AGENTS.md respect, not lattice init.
---

# Setup

Follow the `setup-repository` skill. Do not vendor Lattice into a brownfield
repo unless a human asked.

## Preflight

- Is there `AGENTS.md` or `CLAUDE.md`?
- Is there `.lattice/`?
- What posture does the project declare?
- Is a tracker or Lattice stack declared?

Stop and ask if posture is unclear.

## Plan

State whether this is an opted-in Lattice repo or a guest repo, and which
setup actions (if any) you will run.

## Commands

Load and follow `setup-repository`. Use `lattice doctor` / `lattice setup`
only when `.lattice/` already exists.

## Verification

`AGENTS.md` is in place or you explained why not. You did not run
`lattice init` on a repo that had not opted in. If the CLI ran, doctor was
re-checked.

## Summary

```text
## Result
- Action: setup inspection / remediation
- Status: success | partial | failed
- Details: posture, .lattice present?, commands run
```
