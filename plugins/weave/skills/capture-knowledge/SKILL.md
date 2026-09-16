---
name: capture-knowledge
description: Write durable decisions from harvest, meetings, Slack, or mail into memory/ and Weave.md. Use after a harvest that produced a standing rule, when the user says remember this, or when a session changed shared project facts.
---

# Capture knowledge

Chat is not memory. Write only facts that should survive this session.

## Preflight

- Read `memory/MEMORY.md` (keep it under 200 lines) and `Weave.md`.
- Distinguish a **decision** (we will / we will not) from a **task** (do X
  this week). Tasks go to the tracker via `intake-work`, not here.
- Do not capture secrets, tokens, personal addresses, or medical details.

## Action

1. **Search first.** Update the existing bullet or file. Do not duplicate.
2. **Confirmed decisions** go in `memory/MEMORY.md`. One line each, with why.
3. **Session history** appends to `memory/build-log.md` (newest on top): Did,
   Decided, State.
4. **Standing exceptions** to Lattice defaults go in `Weave.md` at the repo
   root (stack, harvest channels, "do not read mail"). Not in MEMORY.
5. **Longer design** goes in `docs/` and is linked from MEMORY. Do not paste
   a transcript into MEMORY.

If `memory/` does not exist, create it from the Lattice memory template
shape (`MEMORY.md`, `build-log.md`, `project-details.md`) rather than a
new layout.

Do not create Notion pages unless the human asked for Notion.

## Verification

- MEMORY is still short and current.
- Weave.md still contains only exceptions.
- No PII that would be illegal in a commit message landed in git.

## Summary

What you wrote, which file, and what you refused to store.
