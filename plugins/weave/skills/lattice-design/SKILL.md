---
name: lattice-design
description: Lattice Design — our UI system (components, density, tokens). Skip when weave.md opted out of lattice-design.
---

# Lattice Design

Skip when `weave.md` opted out of `lattice-design`. `principle-frontend-ux`
still applies in all projects.

## Stance

- Information density over decorative whitespace for internal tools.
- Reuse existing components and tokens before inventing one-offs.
- One accent color, primary CTAs only. Tokens in CSS variables, not hardcoded
  hex in components.
- Section title and actions above the card, not inside the card body.
- Show-then-edit on detail views. Whole-row click for navigable lists.
- Heroicons outline for icons unless the repo standardizes otherwise.

## Density

- 4px grid. ~1200px max content width on wide screens.
- Body UI at 14px (`text-sm`). Labels at 12px (`text-xs`).
- Fixed-height textareas with scroll; no drag resize handles.

## States

- Loading: spinner or skeleton, not text alone.
- Errors: visible chrome, user terms, next steps. No stack traces in UI.

## Workflow

1. Read repo design tokens or `globals.css` if present; repo wins over defaults.
2. If no accent is defined, ask before inventing one.
3. Compose from existing primitives.
4. For three variants to compare, use the `utility-ui-options-toggle` skill.
