---
name: harvest-signals
description: Pull meetings, Slack, mail, GitHub, the tracker, and this repo Cursor setup into a sourced brief before planning product work. Use at session start for feature work, when the user cites a person, meeting, thread, or client, or when asked for a harvest or daily brief.
---

# Harvest signals

Build a picture of what the company already said, then stop. Do not implement
in this skill. Do not invent sources you could not read.

## Preflight

1. Read `AGENTS.md` / `CLAUDE.md`, then `Weave.md` if present.
2. Note posture, tracker, stack, and any harvest targets in `Weave.md` or
   Weave plugin variables (`slack_channels`, `github_org`, `tracker_team`,
   `email_query`).
3. Confirm this is not a skip-harvest change (typo, one-line fix, extra test,
   comment wording). If it is, say so and stop.

## Action

Run every source you have tools for. Parallelize independent reads. If a
server needs auth or is missing, record `unavailable: <source>` and continue.

### Meetings

Use Granola (or the connected meeting tool): `query_granola_meetings` for the
topic and project; `list_meetings` when the user asks about a date range or
upcoming calls; `get_meetings` / `get_meeting_transcript` when wording
matters. Preserve citation marks the tool returns.

### Chat

Search Slack (public and private when the tool allows) for the topic, the
project name, and people named in the request. Prefer the named channels in
`Weave.md` or plugin variables, then adjacent threads. Read the thread, not
only the hit. Do not send Slack messages.

### Mail

If Gmail (or the connected mail tool) is authenticated, search with
`email_query` or a topic query. If it needs auth, record that and skip. Do
not send mail.

### Tracker

If `AGENTS.md` declares a Tracker, list open issues for this project or team
(`tracker_team` or the team named in `Weave.md`). Reuse an existing ticket
rather than implying a new one.

### GitHub

Use `gh` in the current repo (and `github_org` when set): open pull requests,
failing checks, review comments, latest releases, and notifications. On a
cloud agent, `gh` may be read-only; do not try to create PRs from harvest.

### Cursor setup

Read session-start context, `.cursor/environment.json` if present, and
whether `.lattice/` is vendored. That is how this repo wants to be built.

## Output

A brief with four lists. Every bullet names its source (meeting title and
date, Slack channel and permalink if you have one, ticket id, PR number,
mail subject). No bullet without a source.

```text
## Harvest
- Project: <name or cwd>
- Window: <what you searched>
- Unavailable: <sources you could not read>

## Decisions
- ...

## Open loops
- ...

## Build candidates
- ... (what an agent could do next; do not start them here)
```

If harvest found a standing exception, say whether `Weave.md` already
records it.

## Verification

You attempted every connected source. You did not write to Slack, mail, or
the tracker. You did not start a feature branch.
