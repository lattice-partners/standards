---
description: Open the dev-to-main release pull request with the exact lattice release body.
---

# Release

Follow the `release-change` skill. Do not run `vercel --prod`.

## Preflight

- Confirm this repo uses the Lattice `dev` / `main` model and a tracker.
- If it does not, stop and follow the project's own release process.

## Plan

State that you will open `dev` into `main` with `lattice release` output as
the entire PR body.

## Commands

Load and follow `release-change`. Paste generator output with nothing
added. No AI attribution trailer.

## Verification

Every ticket in the range has a `- Closes` line. Body matches the generator.

## Summary

```text
## Result
- Action: release
- Status: success | failed | not applicable
- Details: PR URL, tickets closing
```
