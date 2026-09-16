# ADR-0014: Signal loop as a first-class Weave duty

**Date:** 2026-09-16
**Status:** Accepted
**Owner:** Darragh Mahns

## Context

Weave (ADR-0013) put Lattice standards into Cursor as rules, skills, commands,
agents, and hooks. That stopped agents from ignoring the engineering bar, but
it did not tell them where work *comes from*.

Lattice already runs on Slack, Granola meetings, GitHub, mail, and the tracker.
The 11 Sep 2026 Lattice Dev discussion framed the company as: conversations and
code into a continuously updated picture, then Cursor agents (including cloud
agents launched from Slack, Linear, GitHub, or a webhook) turn that picture
into tested changes. Weave is the standards layer; `Weave.md` holds per-project
exceptions.

Without that loop in the portable core, each session only sees the current
prompt. Decisions from a standup, a client Slack thread, or a failing check
are optional folklore. The plugin cannot "run at max" if harvest is leftover
advice from a third-party Granola rule.

## Decision

Add a stack-agnostic **signal loop** to the portable core
(`core/signal-loop.md`) and generate a always-on Weave rule from it.

Weave grows skills, slash commands, and agents that operationalize the loop
inside Cursor:

- Harvest meetings, chat, mail, the tracker, GitHub, and this repo's Cursor
  files before planning product work.
- Intake a signal into a ticket and a plan when asked, without posting back
  to Slack or mail unless asked.
- Capture durable facts into `memory/` and standing exceptions into `Weave.md`.
- Ground implementation in meeting decisions (granola-engineer) and run the
  harvest/intake loop (signal-operator).

Plugin variables optionally name default Slack channels, GitHub org, tracker
team, and mail query. They are configuration, not secrets, and never required
for the plugin to load.

The CLI vendors `signal-loop.md` like every other `core/*.md` file. Git hooks
do not change. This repo does not ship Slack, Granola, Gmail, or GitHub
credentials inside the plugin; Cursor MCP connections and `gh` remain the
read path.

## Why

- The harness (Cursor) already has the tools. The missing piece was a Lattice
  duty to *use* them, with write-back held behind explicit ask.
- Canonical prose in `core/` keeps the CLI, Git-vendored projects, and Weave
  on one story. A Cursor-only rule would drift.
- `Weave.md` matches the rollout discussed in Lattice Dev: defaults on, named
  exceptions per project, new and smaller projects first.
- Inventing a "company brain" product inside this standards repo would mix
  product code with the paved road. Memory files and harvest are enough here.

## Consequences

- `VERSION` bumps to 0.9.0. Plugin version stays aligned.
- `npm run build:weave` emits `plugins/weave/rules/signal-loop.mdc`.
- Harvest is skipped for typos and one-line fixes, same threshold as planning.
- Projects without connected MCP servers get an honest "could not read"
  line, not a fake brief.
- Cloud automations that launch agents from Slack or GitHub inherit this
  duty once Weave is installed; they still need those MCP servers on the
  agent runtime.
