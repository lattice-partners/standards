---
name: ship-change
description: Inspect the diff, create a compliant commit, push safely, and open the correct pull request with no AI attribution. Use when the work is verified and ready to leave the machine.
---

# Ship a change

Agents may commit and push. Do not refuse because you are an agent. Never
`--force`, never `--no-verify`, never `--skip-checks`. Never add AI
attribution to a commit or a pull request.

## Preflight

- `git status` and `git diff`. Know exactly what will be committed.
- Confirm secrets, `.env` files, keys, `node_modules`, and large binaries
  are not in the diff.
- Confirm you are on the ticket branch when a tracker is declared. Do not
  commit directly to `main` except for a requested hotfix.
- Run `verify-change` if you have not already.

## Action

1. Stage the files that belong to this change. Leave unrelated dirty files
   untouched.
2. Commit with a Conventional Commits subject, one line unless the *why*
   is not obvious. No ticket IDs, URLs, names, or attribution trailers.
3. `git push` the current branch (no force). If a hook rejects the commit
   or push, fix the cause.
4. Open a pull request into `dev` when the Lattice branch model applies.
   **Leave the body empty.** No summary paragraph, no `Co-Authored-By`,
   no `Generated with`, no `Made-with`.
5. If the project does not use that model, follow the repo's own PR
   template, still without AI attribution.

## Verification

- `git status` is clean for the files you meant to ship.
- `git log -1 --format=%B` has no attribution trailer.
- The PR URL exists. For Lattice `dev` PRs, the body is empty.

## Summary

Commit subject, branch, PR URL, and anything the human still has to do
(review, merge).
