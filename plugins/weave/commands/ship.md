---
description: Commit, push, and open the correct pull request with no AI attribution and no hook bypass.
---

# Ship

Follow the `ship-change` skill. Agents may commit and push. They may not
force-push or skip hooks.

## Preflight

- `git status` and `git diff` are known.
- No secrets or `.env` files in the diff.
- Verification has already run, or you will run `/verify` first.

## Plan

State the commit subject you intend, the branch, and the PR target (`dev`
when the Lattice workflow applies).

## Commands

Load and follow `ship-change`. Empty body on `dev` PRs. No
`Co-Authored-By`, `Generated with`, or `Made-with` anywhere.

## Verification

Latest commit message is clean. PR URL exists. Lattice `dev` PR body is
empty.

## Summary

```text
## Result
- Action: ship
- Status: success | failed
- Details: commit subject, branch, PR URL
```
