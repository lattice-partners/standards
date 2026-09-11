---
name: plan-change
description: Investigate requirements and obtain approval before architectural, multi-file, or security-sensitive work. Use before writing code for new features, auth, payments, contracts, or anything that spans several files.
---

# Plan a change

Plan before code when the work is a new feature, an architectural or
multi-file change, or anything touching security, auth, payments, or
contracts. Single-line fixes, typos, a test for existing code, and comment
updates can skip this skill and just be done.

## Preflight

- Read `AGENTS.md` / `.lattice/` so the plan matches posture and stack.
- Find the ticket if a tracker is declared. The branch name is the ticket
  identifier when the Lattice workflow applies.
- Search the repo for the current behaviour before proposing a new one.

## Action

1. State the problem in one or two sentences.
2. List the files and boundaries you expect to touch.
3. Call out security, data, or migration impact explicitly.
4. Offer the smallest design that works. No "just in case" layers.
5. **Stop and wait for approval** before writing code.

## Verification

The human has approved the plan, or you classified the work as a "just do
it" change and said why.

## Summary

Problem, approach, files, risks, and the question you need answered.
