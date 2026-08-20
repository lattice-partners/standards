# Runbook

For whoever is driving the work today, technical or not. Read the section you
need. Nothing here requires you to understand the code.

Two rules cover most of it:

1. Every change lives on its own branch until someone approves it.
2. Everything on this page can be undone. Nothing you do here is permanent.

## Day-one setup

Do this once when the project is new. The README in lattice-standards walks
through the same steps in order; this is the short version.

1. **Install the tools.** Node 24 or newer, npm 12, and git.
2. **Scaffold the project.** `lattice init my-app && cd my-app`. Say yes when
   asked to run the setup wizard, or run `lattice setup` yourself afterward.
3. **Finish setup.** The wizard walks through the GitHub remote, `npm install`,
   the external-service checklist, and filling in `.env.local`.
4. **Run the app.** `npm run dev` (web on port 3000, api on 3001).

Run `lattice setup` again any time you need to pick up where you left off.
`lattice doctor` shows what is still missing.

## Starting work on a ticket

Open your terminal in the project folder and run:

```bash
lattice ticket MIN-155
```

Replace `MIN-155` with the ticket number from Linear. This creates a branch off
`dev` named after the ticket. A branch is a private copy of the project. Work on
it cannot affect the live site.

Now tell the AI agent what you want, and mention the ticket number so it can
read the details.

If the command complains that you have unsaved work, you are still partway
through a previous ticket. Finish or park that first, or ask an engineer.

## Seeing your change

When the agent says it is done, push the work up:

```bash
git push
```

Within a couple of minutes a preview link appears on the pull request in GitHub
and in the Linear ticket. Vercel builds one preview per branch, so the link
shows only your change.

Check it there before asking for review. The preview has its own database and
its own test accounts. Nothing you click on a preview touches real customers.

Staging is at the `dev` deployment URL pinned in the project channel. Changes
land there once the pull request is merged.

## Getting it live

You do not deploy by hand. Merging the pull request into `main` deploys to
production automatically. Ask an engineer to review and merge.

## Undoing something

Pick the one that matches what went wrong. All three are safe.

### The site is broken and you want the previous version back now

Use the Vercel instant rollback. In the Vercel dashboard, open the project, go
to **Deployments**, find the last deployment that was fine, and choose
**Instant Rollback** from its menu. It takes seconds and does not rebuild
anything.

Do this first. Diagnose afterwards. A rollback is not an admission of anything.

### A specific change was wrong and you want to remove it

Ask an engineer, or the agent, to revert the pull request. GitHub has a
**Revert** button on every merged pull request. It creates a new pull request
that undoes the change, which then goes through normal review.

This keeps the history honest. Nothing is deleted, the change is just reversed.

### Data was deleted or corrupted in the database

This is the serious one, and it is still recoverable.

Stop writing to the database. Tell the engineer on call immediately, and note
the time you first noticed. That timestamp is what the recovery is aimed at.

Supabase point-in-time recovery restores the database to any moment in the
retention window, accurate to roughly two minutes. An engineer runs it from
**Database > Backups > Point in Time** in the Supabase dashboard.

Two things to know so the timing is not a surprise: the project is offline
while it restores, and how long that takes depends on how big the database is.

Do not attempt this yourself.

## When something breaks

Work down this list. Stop when it is fixed.

1. **Write down what you saw.** The exact time, the page or button, and the
   error text if there was one. Screenshot it. This is the single most useful
   thing you can do.
2. **Check whether it is only you.** Try a private browser window, or ask
   someone else to load the same page. If it works for them, it is a session
   or cache problem on your machine, not an outage.
3. **Check whether it is us.** Look at the Vercel dashboard for a failed
   deployment, and at status.supabase.com and status.clerk.com. If a provider
   is down, there is nothing to fix on our side; post the status link and wait.
4. **If the live site is affected, roll back.** See the rollback section above.
   Do this before investigating.
5. **If data looks wrong, stop and escalate.** Do not try to correct it by
   hand. Manual fixes on top of a data problem make recovery harder.
6. **Post it in the project channel** with what you wrote down in step 1.

## Words you will see

| Word         | What it means                                              |
| ------------ | ---------------------------------------------------------- |
| Branch       | A private copy of the project where work happens           |
| Pull request | A request to merge your branch in, with review             |
| Preview      | A temporary live copy of your branch, one per pull request |
| Staging      | The shared test site, built from the `dev` branch          |
| Production   | The real site that customers use, built from `main`        |
| Rollback     | Putting a previous version back, in seconds                |
| Revert       | Undoing one specific change through a new pull request     |
| Migration    | A change to the shape of the database                      |

## Who to call

Fill this in before the project starts. If it is blank when you need it, that
is the failure.

| Situation                 | Who              | Where                       |
| ------------------------- | ---------------- | --------------------------- |
| Site down, needs rollback | Engineer on call | Project channel, then phone |
| Data wrong or missing     | Engineer on call | Phone, do not wait          |
| Login or account problems | Engineer on call | Project channel             |
| Everything else           | Project lead     | Project channel             |

If you cannot reach anyone and the live site is broken, do the Vercel instant
rollback yourself. It is the safest action available to you, and it is far
better than waiting.
