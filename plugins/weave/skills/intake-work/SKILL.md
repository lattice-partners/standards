---
name: intake-work
description: Turn a harvested Slack thread, meeting, mail, or GitHub event into a tracker ticket and an approved plan. Use when the user says intake, "turn this into a ticket", or asks Lattice to start work from a conversation. Does not implement.
---

# Intake work

Turn a signal into tracked, planned work. Follow `plan-change` after the
ticket exists. Do not write product code in this skill.

## Preflight

1. Run `harvest-signals` unless a harvest for this topic already exists in
   this session.
2. Read posture and Tracker from `AGENTS.md`. In a consultative-guest repo,
   do not create tracker issues in a client workspace unless the human
   explicitly asked.
3. Confirm you have a concrete request (who asked, what outcome, what must
   not change). If harvest is only atmosphere, stop and say so.

## Action

1. **Dedup.** If the tracker already has this work, use that ticket. Do not
   open a second.
2. **Ticket.** Create or update one issue only when the human asked, this
   command ran, or the branch workflow requires a ticket id. Title is the
   outcome. Body cites sources (meetings, Slack, mail, GitHub) and the
   harvest open loops. No secrets, no paste of entire transcripts.
3. **Branch.** When the Lattice ticket workflow applies, the branch name is
   the ticket identifier. Do not start implementation on `main`.
4. **Plan.** Follow `plan-change`. Architectural and security work waits for
   approval. Just-do-it stays just-do-it.
5. **Memory.** If intake confirmed a standing decision, update
   `memory/MEMORY.md` or `Weave.md` per `capture-knowledge`.

Do not Slack, mail, or @-people unless the human asked to notify them.

## Verification

- One ticket (new or reused), or a written reason you did not create one.
- A plan with files, risks, and the question you need, or a just-do-it
  classification.
- Harvest sources are cited in the ticket or the plan, not in commit
  messages.

## Summary

Ticket, sources, plan-or-skip, and what is still on the human.
