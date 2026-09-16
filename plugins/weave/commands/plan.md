---
description: Plan an architectural, multi-file, or security-sensitive change and wait for approval before writing code.
---

# Plan

Follow the `plan-change` skill. Do not start implementation in this command.

## Preflight

- Read `AGENTS.md` and the ticket if a tracker is declared.
- Harvest meetings, Slack, mail, GitHub, and the tracker for product work
  (`harvest-signals`) unless this is skip-harvest.
- Confirm this is not a "just do it" change (typo, one-line fix, extra test).

## Plan

Outline the investigation you will do and the decision you need from the
human.

## Commands

Load and follow `plan-change`. Search the repo, name files and risks, then
stop.

## Verification

A plan exists and you have asked for approval, or you classified the work
as skip-planning and said why.

## Summary

```text
## Result
- Action: plan
- Status: awaiting approval | skipped (just-do-it)
- Details: problem, files, risks, question
```
