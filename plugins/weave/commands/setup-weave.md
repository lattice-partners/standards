---
description: Kickoff — AskQuestion interview, one weave.md field per turn, then write the file. Do not start building.
---

# Setup Weave

Write or update `weave.md` for a repo that may already be running. Detect
what is already true, then ask the human to **keep or edit** it. Do not
invent a stack. Do not start building features.

## Preflight

- Read `weave.md` and `Weave.md` if they exist. Also skim `package.json`,
  lockfile, `supabase/`, Clerk packages, Vercel config, and UI tokens only
  to **observe** current setup.
- One sentence in chat: what you already found (file names only, not a
  paste of Weave.md).
- Do not write `weave.md` until every field is confirmed and the draft is
  accepted.

## Plan

One sentence: keep-or-edit interview via the question UI, then a draft,
then write on confirm. Do not paste the question list. Do not print Result
until the end.

## Commands

Use the **AskQuestion** tool. Ask **exactly one** field per turn. Wait for
the answer before the next.

Do **not** add an option named Other. The UI already appends it.

**Every question follows this shape:**

1. Observe the current value (existing weave file first, then the repo).
2. Prompt like "I found X. Keep it, or change it?"
3. Option A is always **Keep:** plus a **short** observed label (one line).
4. Other options are the real alternatives (the other repo type, opt out,
   skip). Never put a paragraph of project lore in an **option label**.
   The notes **prompt** may list a few proposed bullets.

If you found nothing, option A is **Not set:** plus "record the usual
Lattice default" or "leave this out of weave.md", and the other option
sets or opts out.

**Fields, in order:**

1. **Repo.** Observe `repo:` in weave/Weave.md, or org/README. Keep
   `lattice-owned` or `client existing`, or switch to the other.
2. **Supabase.** Observe `supabase/` , Supabase packages, or an existing
   opt-out. Keep using Lattice Supabase, or opt out. Reason question only
   on opt out (short choices: already has Postgres, not a DB app).
3. **Clerk.** Observe Clerk packages or env names, or an existing opt-out.
   Keep Clerk, or opt out, then reason if needed.
4. **Vercel.** Observe Vercel config or an existing opt-out. Keep Lattice
   Vercel, or opt out, then reason if needed.
5. **Lattice Design.** Observe Lattice Design / tokens notes, or an
   existing opt-out. Keep it, or opt out (own UI), then reason if needed.
6. **Notes.** See **Notes question copy** below. Do this even when
   Weave.md already exists. Do not ask "copy themes into weave.md".
7. **Boot, done path, proof.** Ask these only if that fact is not already
   in the notes list they just accepted. Same keep-or-edit shape, one line
   each.

You cannot opt out of testing, security, or basic front-end UX.

### Notes question copy

`notes` in lowercase `weave.md` is a short list later chats always read. It
is not a second copy of a long `Weave.md` product doc. Put facts an agent
would get wrong if it only knew Lattice defaults (ticket prefix, boot
command, do not treat prototype repos as source of truth). Leave architecture
and Slack runbooks out.

Before AskQuestion, in chat, one short paragraph: existing `Weave.md` can
stay as a human doc. This step only decides the short `notes:` list.

AskQuestion **prompt** (adapt the bullets to what you actually found, max
eight one-liners):

```text
weave.md notes are a short list every later agent will read. They should
only be facts Lattice defaults would get wrong on this already-running
repo. I would record:

- (one-line fact)
- (one-line fact)

Your longer Weave.md can stay as-is either way. What should notes be?
```

Options (labels only, no essays):

- Use this short list
- Use this list, I will add more next
- Leave notes empty

Then boot / done path / proof only for facts not already in that list.

Allowed opt-out keys only: `supabase`, `clerk`, `vercel`, `lattice-design`.
Each opted-out tool needs a one-line reason. If they keep the default, omit
it from `opt-out`.

Then:

1. Show the draft `weave.md` using `plugins/weave/templates/weave.md`.
2. AskQuestion: write this file, or go back.
3. On write, create lowercase `weave.md`. Do not overwrite a non-template
   `Weave.md` unless they asked to replace it.
4. Stop.

## Verification

`weave.md` exists (or you explained why not). Each field was a keep-or-edit
AskQuestion against something you observed. One field at a time. No
implementation work.

## Summary

Print this block only after success, abort, or a hard stop.

```text
## Result
- Action: setup-weave
- Status: success | partial | failed
- Details: repo type, opt-outs recorded, notes recorded, file path
```
