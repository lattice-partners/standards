---
description: Manual only — read recent chats and write a report for the Weave team. Do not run unless invoked.
---

# Weave improvements

Read recent chats and write a report for the Weave Management Team. Look for
problems the standard should prevent or clarify, whether or not anyone said
"Weave." That includes security issues, repeated frustrations, configuration
mistakes, contradictions, and explicit requests. Print it in chat. Do not
edit files.

Run this only when the human invokes `/utility-weave-improvements`. Do not
start it from another task, skill, review, or setup.

## Preflight

- Stop unless this slash command was just invoked.
- Confirm this is read-only. Do not change `weave.md`, skills, or the repo.
- Default window is the last 14 days, on this machine, across Cursor
  projects. If the human named a window, use that.
- Parent transcripts live at
  `~/.cursor/projects/<workspace>/agent-transcripts/<id>/<id>.jsonl`.
  Subagent transcripts live in `<id>/subagents/`. If that folder is missing,
  stop and say so.

## Plan

Scan parent chats in the window. Read user messages for security issues,
repeated friction, and corrections. Print one report the management team can
act on without opening the chats.

## Commands

1. List parent transcript files modified in the window. Skip the chat that is
   running this command. Note how many projects and chats exist before reading.
2. Read user messages in those chats. A chat does not need to mention Weave.
   Keep going when someone raises a security concern, corrects the agent,
   hits the same friction more than once, or describes a setup that keeps
   going wrong. Use subagent transcripts as evidence. Skip a one-off product
   decision that would not change how Lattice builds software.
3. Keep an item when the Weave team could encode it, clarify it, or stop it:
   a security mistake, a repeated frustration, a config that produced the
   wrong behavior, two rules that disagree, or a change someone asked for.
   A local mistake that `/setup-weave` already prevents is not a finding.
   Drop secrets, credentials, and customer data.
4. Sort what remains:
   - **Security** — a vulnerability, unsafe default, secret, auth gap, or
     data exposure someone brought up.
   - **Frustration** — the same annoyance in more than one chat, or a
     correction the person had to keep making.
   - **Configuration** — project or tool setup that made agents do the wrong
     thing, or a config shape that made the mistake likely.
   - **Inconsistency** — rules disagree with each other or with what the
     agent actually did.
   - **Recommendation** — an explicit request for how work should be done.
5. Rate each item. **Strong:** the person said it, or the same friction
   appears in more than one chat. **Medium:** one clear incident. **Weak:**
   inferred from a single aside. Omit weak items, or list them under left-out
   in one line each.
6. Write the report below in complete sentences. Explain what happened, why
   the standard should care, and what the team could change. Name an existing
   skill, command, or `weave.md` field when one applies. When none does, say
   the standard does not cover it yet. Paraphrase. Quote only when the
   wording is the request, and keep the quote short. Each item must make
   sense if the reader cannot open the chat. Cite a parent chat as
   `[topic](conversation-id)` using the transcript folder id, not a file path.

Do not file tickets, open pull requests, or edit the standards repo.

## Verification

The report names the date window, how many chats were scanned, and how many
contained a security issue, repeated frustration, or other signal. Every
finding says what happened, why the standard should care, and what to change.
No file in the repo was modified.

## Summary

Print this report. Omit an empty findings section. If nothing qualifies, say
what you scanned and that there is no change to recommend.

```text
# Weave improvement report

For the Weave Management Team.
Window: <start> to <end>.
Scanned: <N> parent chats across <M> projects. <K> had a security issue, repeated frustration, or other signal.

<One paragraph: the pattern across these chats, or that nothing repeated.>

## Security
### <short title>
What happened: <enough context that someone outside the chat understands>.
Why it matters: <existing skill or command, or say the standard does not cover this yet>.
Change: <what the team could edit or clarify>.
Evidence: <strong|medium>. <date>. <topic>. [topic](conversation-id)

## Frustration
### <short title>
What happened: ...
Why it matters: ...
Change: ...
Evidence: ...

## Configuration
### <short title>
What happened: ...
Why it matters: ...
Change: ...
Evidence: ...

## Inconsistencies
### <short title>
What happened: ...
Why it matters: ...
Change: ...
Evidence: ...

## Recommendations
### <short title>
What happened: ...
Why it matters: ...
Change: ...
Evidence: ...

## Left out
<One short paragraph: one-off product work, secrets, and weak guesses you did not include.>

## Result
- Action: utility-weave-improvements
- Status: findings | none
- Window: ...
- Chats: <scanned> scanned, <with signal> with signal
- Findings: <security count> security, <frustration count> frustration, <configuration count> configuration, <inconsistency count> inconsistencies, <recommendation count> recommendations
```
