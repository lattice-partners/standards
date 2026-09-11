---
name: verify-change
description: Run the relevant format, lint, type, test, build, security, and end-to-end checks for the current change. Use before calling work done, before commit, and when a human asks if it is safe to ship.
---

# Verify a change

Proportionate verification. A one-line copy fix does not need a full e2e
suite. A payments change does.

## Preflight

- Identify the repo's test, lint, and type scripts from `package.json`.
- If `.lattice/` is present, `lattice verify` / `lattice doctor` are
  available. Use them. If not, use the project's own scripts.
- List the paths you changed so you can run filtered test tasks when the
  repo supports them.

## Action

Run what applies, in this order when the tools exist:

1. Format / lint for the touched files
2. Typecheck
3. Unit tests for the change
4. Integration or e2e for critical paths you touched
5. Security-adjacent review if auth, secrets, RLS, or payments moved
6. App/build health if you changed runtime code

Prefer `lattice verify` in an opted-in Lattice repo. Prefer `turbo` filters
when the monorepo is set up for them. Do not skip Git hooks with
`--no-verify` to "save time."

## Verification

Paste the commands and their exit status. If something failed, you are not
done.

## Summary

Checks run, checks skipped (with why), remaining risk.
