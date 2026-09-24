---
description: Kickoff — interview for every weave.md field, then write the file. Do not start building.
---

# Setup Weave

Write or update the project `weave.md` from answers, not from guesses. Do not
invent a stack. Do not start building features.

## Preflight

- Is there already a `weave.md` in the repo root? If yes, show it and treat
  each current value as a proposed default, not a silent keep.
- Skim the repo only to **suggest** answers (Supabase, Clerk, Vercel, UI).
  Suggestions are optional hints next to the questions. They are not the
  source of truth.
- Do not write `weave.md` until every question below is answered.

## Plan

State that this is an interview. List the fields you will fill (`repo`,
each opt-out, `notes`). After answers, show the draft `weave.md` and wait
for a yes before writing the file.

## Commands

Ask these questions in **one message**. Number them. Wait for replies. Do
not skip a question because the repo "looks like" an answer.

1. **Repo.** Is this `lattice-owned` or `client existing`?
2. **Supabase.** Does this project use Lattice's Supabase default (Postgres,
   RLS, this team's usual setup)? If no, one-line reason for the opt-out.
3. **Clerk.** Does this project use Clerk as auth? If no, one-line reason.
4. **Vercel.** Does this project host on Vercel the Lattice way? If no,
   one-line reason.
5. **Lattice Design.** Does this project use Lattice Design? If no,
   one-line reason.
6. **Notes — agents would miss.** Tokens file, `legacy/`, ticket prefix,
   anything similar. Empty is allowed.
7. **Notes — boot.** How does an agent start the app (command, port, env)?
   Empty is allowed.
8. **Notes — prove path.** What path must work to call a change done
   (which screen, API, or wizard step)? Empty is allowed.
9. **Notes — proof.** Where does evidence live (screenshot, test log,
   artifact path)? Empty is allowed.

You cannot opt out of testing, security, or basic front-end UX. Do not ask
to turn those off.

Allowed opt-out keys only: `supabase`, `clerk`, `vercel`, `lattice-design`.
Each opted-out tool needs a one-line reason. If they use the default, omit
it from `opt-out`.

Then:

1. Draft `weave.md` in chat using `plugins/weave/templates/weave.md` as the
   shape. Put boot / prove / proof lines under `notes` when they answered.
2. Ask for confirmation.
3. On yes, write the file at the repo root. If `weave.md` already exists,
   only change fields they updated.
4. Stop.

## Verification

`weave.md` exists at the repo root (or you explained why not). Every field
matches an answer from this turn, not an unverified skim. Opt-outs match
what the human confirmed. You did not start implementation work.

## Summary

```text
## Result
- Action: setup-weave
- Status: success | partial | failed
- Details: repo type, opt-outs recorded, notes recorded, file path
```
