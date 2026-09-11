---
name: implement-change
description: Execute scoped implementation work, preserve existing conventions, and track verification as you go. Use after a plan is approved or for small just-do-it changes.
---

# Implement a change

Change only what the task requires. Match the conventions already in the
file. In a guest repo, do not mass-reformat or impose Lattice tooling on
existing code. New code you author still meets the Lattice bar.

## Preflight

- Confirm the plan is approved, or that the change is small enough to skip
  planning.
- Read the files you will edit before editing them.
- If a tracker is declared, work on the ticket branch.

## Action

1. Implement the scoped change. No unrelated refactors or dependency bumps.
2. Doc-comment exported symbols. Validate structured data at boundaries.
3. Handle errors on every external call. Add tests with the feature.
4. Keep a running list of what you have not verified yet.
5. Do not disable RLS, reach for a secret key, delete a failing test, or
   skip Git hooks to make an error go away.

## Verification

Run the checks that belong to this change (see `verify-change`). State what
you did and did not run.

## Summary

What changed, what was verified, and what is still open.
