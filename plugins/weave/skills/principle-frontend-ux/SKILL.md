---
name: principle-frontend-ux
description: Lattice front-end UX expectations (show then edit, states, copy, mobile, themes). Not the design system.
alwaysApply: true
---

# Front-end UX

These apply even when the project opted out of Lattice Design.

- **Show then edit.** Default to read-only labels and values. Edit opens a
  modal or toggles inputs. Do not make every field editable by default.
- **Loading, empty, and error states** are required. Never plain "Loading..."
  text alone; use a spinner, skeleton, or equivalent. Errors get clear
  user-facing messages and next steps, not stack traces.
- **Mobile responsive** and **light/dark** when the product has themes. Designs
  should cover those cases, not just desktop light mode.
- **Short copy.** Concrete verbs, no walls of text, no backend jargon in labels.
  Do not explain what the UI already shows.
- **Progressive disclosure.** List click-through; approve, comment, and edit on
  detail when that fits the workflow.

For components, density, tokens, and layout patterns, use the `lattice-design`
skill when the project has not opted out.
