---
description: Run the relevant lint, type, test, and safety checks for the current change.
---

# Verify

Follow the `verify-change` skill. Work is not done if a required check was
skipped without a reason.

## Preflight

- List files changed.
- Read `package.json` scripts and whether `.lattice/` exists.

## Plan

Name the checks you will run and the ones you will skip, with why.

## Commands

Load and follow `verify-change`. Prefer `lattice verify` when vendored.
Never `--no-verify`.

## Verification

Paste commands and exit codes. Failures mean this command is not successful.

## Summary

```text
## Result
- Action: verify
- Status: success | failed | partial
- Details: checks run, checks skipped, remaining risk
```
