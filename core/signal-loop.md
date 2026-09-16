# Lattice Signal Loop

How Lattice turns conversations and repo events into software. Stack-agnostic.
Applies to humans and agents. Cursor is the current harness; the duties stay
the same if the harness changes.

This is not a licence to skip planning, security, or the Definition of Done.
It is the duty to *look* before you build.

## Sources

Work arrives from more than the current chat. When the tools are connected,
treat these as first-class inputs:

- **Meetings** (Granola or equivalent). Decisions, constraints, deferred
  items, and who owned the follow-up.
- **Chat** (Slack or equivalent). Async decisions, client comments, "please
  ship this", and threads that continued after a call.
- **Mail**. Client and vendor commitments that never hit Slack.
- **The tracker**. Open tickets, cycle, and what is already in flight.
- **GitHub** (or the project's host). Open pull requests, failing checks,
  review comments, releases, and repo events.
- **This repo's Cursor setup.** `AGENTS.md`, `Weave.md`, `.cursor/`, and
  whatever the session-start hook injected.

Product telemetry (errors, replays) is a source when the project has it. It
does not replace the sources above.

Silence from a source is not "nothing happened". It means you could not read
it. Say so.

## Harvest before you build

Before planning or implementing a feature, a product change, or anything that
sounds like it came from a meeting, a person, or a client:

1. Search meetings for the topic, the project, and the people named.
2. Search chat for the same, including threads the meeting said would continue
   async.
3. Check mail when the request cites an email, a client, or an external
   commitment.
4. Check the tracker for an existing ticket before creating another.
5. Check GitHub for related pull requests, failing checks, and review threads.
6. Read `Weave.md` if it exists. Project exceptions beat Lattice defaults.

Skip the harvest for typos, one-line fixes, extra tests, and comment wording.
Do not skip it because the current message already sounds complete. Chat is
lossy.

## Conflict and recency

- Prefer the **later** source when two sources disagree, and say that you did.
- Prefer a **written decision** (ticket, ADR, `memory/`, `Weave.md`) over a
  passing remark, unless a later meeting or message explicitly reversed it.
- If meetings, chat, and mail disagree, stop and ask. Do not pick silently.
- Cite sources in the plan and in the PR or ticket body. Never put names,
  emails, or ticket IDs in **commit messages**.

## Memory

Durable facts belong in the project's `memory/` (and in `Weave.md` when they
are standing exceptions to Lattice defaults). Chat is not memory.

After a harvest that produced a decision, a constraint, or a "we always do X
here":

- Update `memory/MEMORY.md` if the stage or a confirmed decision changed.
- Append `memory/build-log.md` when the session changed shared state.
- Put stack or process exceptions in `Weave.md`, not in a one-off chat reply.

Keep `MEMORY.md` under 200 lines. Link to `docs/` and tickets; do not paste
transcripts.

## Writes back to the world

Reading is the default. Writing is opt-in.

- **Do not** post to Slack, send mail, or comment on a client thread unless
  the human asked, or a slash command / skill for that write was invoked.
- **Do not** create a tracker ticket unless the human asked, `/intake` ran, or
  the project's `AGENTS.md` tracker workflow requires one to start the branch.
- **Do** open or update a pull request on the ticket branch when the work is
  ready, following `ticket-workflow.md`.
- **Do** record what you learned in `memory/` when it will matter next session.

Cloud agents launched from Slack, the tracker, GitHub, or a webhook still
harvest, still plan when the change is architectural, and still do not skip
Git hooks.

## Project overrides

`Weave.md` at the repo root is the exception file. Empty of exceptions means
the portable core and (when declared) the Lattice stack apply in full.

Use it for:

- A different design system, cloud, or auth provider than the Lattice default
- Named Slack channels, tracker team, GitHub org, or mail query for harvest
- "Do not harvest mail" or "meetings only" when a client forbids a source

Do not use it to weaken security, skip tests, or allow force-push.

## When not to harvest

- The change is a typo, a one-line fix, an extra test, or comment wording.
- You already harvested this topic in this session and nothing new arrived.
- A source's tools are disconnected. Report that and continue with the rest.

Never invent a meeting, a Slack message, or a GitHub event to fill a gap.
