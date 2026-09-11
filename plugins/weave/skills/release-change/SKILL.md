---
name: release-change
description: Prepare the dev-to-main release pull request with the exact lattice release body when the Lattice branch model applies. Use when shipping a set of tickets from staging to production.
---

# Release a change

Applies when the project's `AGENTS.md` declares a tracker and uses the
Lattice `dev` / `main` model. If it does not, stop and follow that repo's
release process instead of inventing one.

## Preflight

- Confirm `.lattice/` and `lattice` are available, or generate the body
  the same way `lattice release` would: closing keywords plus one line per
  shipped change from the commit range.
- Confirm you are releasing `dev` into `main`, not a ticket branch into
  `main`.
- Confirm production deploy is a merge plus manual promotion, not
  `vercel --prod`.

## Action

1. Run `lattice release` (or equivalent) and capture the output.
2. Open a pull request from `dev` into `main`.
3. Paste that output as the **entire** body. Two lists, nothing else:
   `- Closes MIN-123` lines, then human-readable summary lines.
4. Do not add an AI attribution trailer. That is a defect on this body.

## Verification

Every ticket in the range has a closing line. The body matches the
generator output with nothing added.

## Summary

PR URL and the list of tickets that will close on merge.
