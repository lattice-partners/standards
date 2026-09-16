---
description: Harvest meetings, Slack, mail, GitHub, the tracker, and this repo Cursor setup into a sourced brief. Does not implement.
---

# Harvest

Follow the `harvest-signals` skill. Do not start implementation in this
command. Do not write to Slack, mail, or the tracker.

## Preflight

- Read `AGENTS.md` and `Weave.md` if present.
- Confirm this is not a skip-harvest change (typo, one-line fix, extra test).

## Plan

Name the sources you will query and the window (for example last 7 days,
named channels, this repo).

## Commands

Load and follow `harvest-signals`. Query connected tools in parallel. Record
unavailable sources instead of guessing.

## Verification

A sourced brief exists. Every bullet has a source. You did not implement
and did not send messages.

## Summary

```text
## Result
- Action: harvest
- Status: complete | partial (sources unavailable) | skipped (just-do-it)
- Details: decisions, open loops, build candidates
```
