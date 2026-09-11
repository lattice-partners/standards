# ADR-0012: agents may commit and push; never an AI attribution trailer

**Date:** 2026-09-11
**Status:** Accepted
**Owner:** Darragh Mahns

## Context

ADR-0001 put commit discipline in `agents-base.md` so agents would follow it,
and it included **agents-never-commit**: suggest the message, the human runs
git. That was written when a person was expected to read the diff before
anything landed.

The people directing agents now often cannot evaluate a diff, and the runbook
already has them checking a preview. Agents following agents-never-commit
refuse to commit, so the operator is stuck copying a message into git by hand.
Meanwhile the same tools append `Co-Authored-By:`, `Generated with`, or
`Made-with:` trailers to commit messages and pull request bodies. Those
trailers are permanent git history, they are not the change, and on a `dev`
pull request they violate the empty-body rule from ADR-0008.

The commit-msg hook already rejected some attribution trailers on commits.
Pull request bodies are not hooked. Claude Code honours `attribution.commit`
and `attribution.pr` when both are cleared; the scaffold only cleared
`commit`.

## Decision

- **Agents may commit and push.** The vendored **Commits** section allows
  `git commit` and `git push` on the ticket branch when the work is ready.
  Agents must not refuse because they are agents. Force-push, `--no-verify`,
  and `--skip-checks` stay banned. Secrets, `.env` files, keys, large
  binaries, and `node_modules` still must not be committed.
- **No AI attribution anywhere git stores text.** No `Co-Authored-By:`,
  `Generated with`, `Made-with:`, or any other AI trailer or footer on a
  commit message, a pull request title, or a pull request body. Strip it if a
  tool inserts one. The `dev` pull request body stays empty; the release body
  is exactly `lattice release` output.
- **Mechanical controls stay in place and widen slightly.** The commit-msg
  hook keeps rejecting attribution trailers (including `Made-with:`). The
  scaffolded `.claude/settings.json` clears both `attribution.commit` and
  `attribution.pr`. Ordinary `git push` remains prompted in Claude Code;
  `git push --force` remains denied.

This supersedes the agents-never-commit clause of ADR-0001. Conventional
Commits, atomic commits, and the rest of that decision stand.

## Why

- A preview cannot exist until the branch is on GitHub. Forbidding the agent
  to push makes the runbook's "check the preview" step a human git exercise.
- Attribution trailers are how tools sign work. Clients did not ask for that
  signature, and an empty `dev` PR body with a generated footer is not empty.
- Clearing `attribution.pr` at source beats asking the agent not to add one,
  for the same reason ADR-0007 put irreversible commands in `deny` rather
  than `ask`.

## Consequences

- `VERSION` bumped to 0.8.0, together with the Weave plugin in ADR-0013.
- `core/agents-base.md`, `working-agreement.md`, `agent-safety.md`, and
  `ticket-workflow.md` carry the new rule. Definition of Done no longer
  requires prompting a human to commit.
- The next-monorepo `.claude/settings.json` gains `attribution.pr: ""`.
  Existing projects pick this up on `lattice sync` only for vendored docs;
  the settings file is scaffolded at init and is not re-copied by `sync`.
  Projects already running need the `pr` key added by hand or by re-init of
  that file.
- Ordinary `git push` stays in Claude Code `ask`. The policy change is that
  the agent must not refuse; the operator still confirms the push.
