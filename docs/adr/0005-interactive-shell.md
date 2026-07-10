# ADR-0005: Interactive lattice shell

**Date:** 2026-07-10
**Status:** Accepted
**Owner:** Darragh Mahns

## Context

The CLI (ADR-0004) was a one-shot dispatcher: each command ran and exited. The
intended experience is to type `lattice` in a repo and drop into a workspace,
seeing the repo's standards state and working through actions in one session,
while coding agents keep driving the same commands non-interactively.

## Decision

Typing `lattice` with no command on a TTY opens an interactive shell: a home
screen with the repo's status (initialized, vendored version, drift) and a
context-aware menu (`check`/`sync` when initialized, `init` when not, plus
`adopt` and `docs`). It runs the chosen action, waits, and returns home until
the user quits with `q`/Esc/Ctrl-C. The shell is hand-rolled on the existing
zero-dependency UI and prompt layer.

The one-shot subcommands are unchanged and remain the contract for CI and coding
agents. With no TTY, `lattice` prints help and exits non-zero rather than
launching the shell, so nothing ever blocks in a pipeline.

## Why

- A returning home screen matches how the tool is meant to be used: explore and
  run several actions without re-invoking.
- Gating the shell on a TTY keeps the human and machine interfaces separate: the
  same binary is a workspace for people and a scriptable command for agents.
- Building on the existing UI/prompt code avoids a TUI dependency that every
  consuming project would inherit.

## Consequences

- `VERSION` bumped to 0.4.0 (additive feature).
- New module `cli/shell.js`; `status()` added to `cli/lib.js` to summarize repo
  state for the home screen.
- The shell is TTY-interactive, so it is covered by the `status()` unit test
  rather than an end-to-end driver.
- Future views (new ADR, open a doc, project scaffolding beyond init) can be
  added as menu actions without changing the command interface.
