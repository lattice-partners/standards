---
name: principle-demo
description: Clickable mock-up pages with session-only data and multiple user flows. No real database. Applies when the user asks for a demo or mock-up.
---

# Demo

Use this when the user asks for a demo, mock-up, prototype, or clickable
walkthrough. Production features keep the real stack (`lattice-stack` when
the project has not opted out). Leave existing data paths in place unless
the user asked for a mock.

## No live data

- No database client on the demo path. No Supabase, Postgres, ORM, or other
  persistence.
- No auth-provider calls. Personas are local fixtures.
- No API routes, server actions, or fetches that read or write a real
  service. Demo routes do not import the app's database or auth clients.
- No env keys, connection strings, or migrations for the demo.

## Session store

- One client module owns fixtures and state. Pages read and write that
  module only.
- Persist in `sessionStorage`. Creates, edits, and deletes survive refresh
  in that tab and clear when the tab closes. Do not use `localStorage`, a
  cookie, or a server.
- On first load, if the session key is missing, seed it from the active
  scenario.
- Parse what you read back. If it fails validation, replace it with that
  scenario's seed.

## Flows

- Show more than the happy path. Include a populated scenario, an empty
  scenario, and one that changes what the person can do (role, blocked
  step, or error) when the product has that case.
- Each scenario is a full starting dataset plus the routes in that
  walkthrough (list, detail, create, and the screen after the action).
- A scenario control switches flows. Switching replaces the session store
  with that scenario's seed.
- Use real routes so someone can click through without the agent driving
  the browser. Mutations show up on the next screen in the same session.
- Product copy only. Do not caption pages as fake, local, or
  session-backed. The scenario control is the only demo chrome. Put it in
  the header utility, a corner, or a `/demo` entry, off the main task
  surface.

## Pages

- Build the screens the walkthrough needs. Follow `principle-frontend-ux`.
  Use `lattice-design` when the project has not opted out.
- Include loading, empty, and error states. A short simulated delay still
  uses a spinner or skeleton.
- Seed enough realistic rows that a populated scenario looks in use.

## Workflow

1. Confirm this is a demo. A real app uses the project stack instead.
2. List the flows. Ask when the set is unclear.
3. Define typed fixtures per scenario and the session store.
4. Build routes against the store only.
5. Add the scenario switcher and click through each flow.
