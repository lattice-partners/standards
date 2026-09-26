---
name: principle-frontend-ux
description: Front-end UX (edit flows, lists, states, copy, motion policy). Always on; not the visual design system.
---

# Front-end UX

Applies in every project, including when `weave.md` opted out of
`lattice-design`. Tokens, shell, and component chrome: `lattice-design` when
enabled.

## Audience

- Assume competent operators on tools they use often — optimize throughput, not
  first-time marketing polish.
- Match **existing** list, detail, and create patterns in the repo before adding
  a new interaction model.

## Edit and create

- **Show then edit.** Default to read-only labels and values. **Edit** opens a
  modal or toggles an explicit edit mode with Save/Cancel. Do not show empty
  form fields on detail views until the user chooses to edit.
- **Lists and tables are read-only for data entry** — no inline edit,
  blur-to-save, or click-to-type in rows unless the screen is a dedicated
  spreadsheet-style tool.
- Row changes: **Edit** (or equivalent) → form in modal or drawer; **Delete** in
  that flow when allowed, with confirmation when destructive.
- **Row actions.** One or two actions may stay as buttons on the row. If there
  are more than two, do not line them up as buttons — put them in one overflow
  menu opened from a single control. Destructive items confirm before they run
  (a confirm step in the menu is enough). Name the control for the row
  (“Actions for {name}”).
- **One primary create affordance** per section. If type/mode/cadence branches,
  pick the branch **inside** the flow — not a row of parallel “Add X / Add Y”
  buttons on the header.
- **Progressive disclosure.** List → detail for depth; approve, comment, and
  edit on detail when that fits the workflow. Navigable lists: whole-row or
  clear primary link, not tiny hit targets only.

## Wizard modals (multi-step dialogs)

- **Separate leave from undo step.** Close ends the modal and drops progress
  (confirm when the product usually would). Back rewinds one step inside the
  same dialog. Do not put Back in the footer next to Save — users mix up undo
  with commit or discard everything.
- **Progressive disclosure in the flow.** First step: the smallest decision
  (type, intent, template). Later steps: the full form. Reduces noise and wrong
  submissions.
- **Action hierarchy.** Top chrome = navigation (Back, Close). Bottom chrome =
  commitment (Cancel, submit). Same pattern as mobile sheets and most design
  systems; footers stay predictable.
- **Always expose exit.** A visible close control in the header complements
  backdrop click and Escape; do not hide the only way out in the footer.
- **One primary per step.** After step one, footer is typically Cancel + one
  primary (Save / Continue). Step one can be Cancel only when choosing an
  option advances the flow.

Portable one-liner: wizard modals — first step = lightweight choice, later
steps = full form; header = Back (step) + Close (dismiss); footer = Cancel +
single primary; icon header controls get rounded hover/focus backgrounds
(`lattice-design` when enabled).

## Lists and filters

- **Active-first.** Default to live/open/current work; archived, closed, or
  inactive behind an explicit toggle or filter with a count (`Closed (12)`).
- When the default filter hides every visible row, empty copy should **point at
  the filter**, not imply the dataset is empty.
- Large datasets: paginate, virtualize, or cap in-view scroll so the page shell
  stays stable.
- Abbreviated or rounded metrics in rows: exact values in detail, tooltip, or
  export when precision matters.

## States and feedback

- **Loading, empty, and error** states are required. Never plain “Loading…”
  text alone — spinner, skeleton, or equivalent in the affected region.
- **Empty:** short heading plus **one** next action. Do not repeat a visible
  primary button in paragraph form (“Add a client to get started” when **New
  client** is already on screen).
- **Errors:** plain language, what went wrong, and **what to do next** — no stack
  traces or raw API payloads in the product UI.

## Interactivity

- **Pointer.** Buttons, links, menus, sort headers, navigable rows, and text
  actions use `cursor-pointer`, with visible focus and disabled states.
- **Unexpected targets.** Cards, rows, headings, stats, and other elements that
  do not usually look clickable  need a hover change when they navigate or
  open a flow, so the hit target reads as interactive before click.
- **Text links.** Hover changes the color or adds an underline. n hover.
- Hover is a cue. High-frequency paths stay free of enter/exit animation (see
  Motion). Timing and tokens: `lattice-design` when enabled.

## Copy

- **Short copy.** Verb-first buttons, sentence case, complete sentences when you
  need a sentence — no walls of text, no backend jargon in labels.
- Do not explain what the UI already shows (page-purpose subtitles, cron/sync
  internals, formula names) unless the user would be blocked without it.
- Explain **recovery** and setup blockers (“ask an admin…”, “configure X to use
  this page”).
- Do not chain unrelated metadata with middot (` · `) — use structure (stacked
  lines, labeled fields, layout gap), commas on one line, or slash hierarchy
  like breadcrumbs.

## Motion (interaction)

- High-frequency navigation (section changes, sort, row hover): **no enter/exit
  animation**.
- Do not animate actions initiated from the keyboard.
- Respect **prefers-reduced-motion** — state changes stay visible without
  gratuitous movement.

## Responsive and themes

- **Mobile responsive** when the product is used on small viewports.
- **Light/dark** (or other themes) when the product supports them — do not ship
  only desktop light mode.

## Workflow

1. Define flow first: default view, filters, empty, error, edit path.
2. Reuse the repo’s established patterns for the same entity type.
3. Visual styling: `lattice-design` when not opted out.
