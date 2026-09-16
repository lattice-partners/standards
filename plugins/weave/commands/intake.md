---
description: Turn a Slack thread, meeting, mail, or GitHub event into a tracker ticket and a plan. Does not implement.
---

# Intake

Follow the `intake-work` skill. Harvest first if this session has no brief
for the topic. Do not write product code.

## Preflight

- Read `AGENTS.md` (posture, Tracker) and `Weave.md`.
- Guest repos: do not create issues in a client tracker unless asked.

## Plan

State the signal, whether a ticket already exists, and whether this is
plan-before-code or just-do-it.

## Commands

Load `harvest-signals` if needed, then `intake-work`, then `plan-change`.
Do not Slack or mail unless the human asked to notify someone.

## Verification

One ticket (new or reused) or a reason you did not create one. A plan
awaiting approval, or a just-do-it classification.

## Summary

```text
## Result
- Action: intake
- Status: ticket-ready | awaiting-approval | skipped
- Details: ticket, sources, plan, what is on the human
```
