---
name: lattice-design
description: Lattice Design — UI system on Tailwind CSS v4 (tokens, shell, typography, surfaces). Skip when weave.md opted out of lattice-design.
---

# Lattice Design

Skip when `weave.md` opted out of `lattice-design`. Interaction, copy, and
states: `principle-frontend-ux` (always on).

## CSS

Tailwind CSS v4, installed the way the [Next.js guide](https://tailwindcss.com/docs/installation/framework-guides/nextjs) says:

- `npm install tailwindcss @tailwindcss/postcss postcss` — current v4, not v3.
- `postcss.config.mjs` plugin `@tailwindcss/postcss`.
- `@import "tailwindcss";` in `globals.css` (or the repo theme file).
- No `tailwind.config.js`, no `@tailwind` directives, no Autoprefixer.
- If the project already has Tailwind, keep its major version and config style.

## Tokens

- CSS variables (or theme) are the source of truth — no raw hex in components.
- Tiered backgrounds (canvas → elevated → secondary/tertiary), matching text
  and border tiers. Hierarchy leans on color tier more than font size jumps.
- One accent for primary buttons and focus rings — not nav, labels, or icons.
- Semantic success/error/warning colors plus light tints for badges/banners.
- New values go in the theme file only. Repo tokens win over these defaults.
- If no accent exists in the repo, ask before inventing one.

## Typography

- Body sets Tailwind `antialiased` (`-webkit-font-smoothing: antialiased`).
  Without it, macOS subpixel smoothing paints the same font weight darker and
  thicker, so a button looks bolder than the same control on a page that sets it.
- UI sans + mono for code and numeric columns (`tabular-nums` on metrics).
- Body and controls: 14px (`text-sm`). Labels and column headers: 12px
  (`text-xs font-medium`) with secondary text color.
- Page title: one step above body (`text-xl font-medium` or repo `PageHeader`).
- Footnotes: `text-xs`, tertiary color, relaxed leading.

## Shell

- Sidebar ~240px (`w-60`): grouped nav, compact rows (~28–32px), tertiary icons.
  Sidebar background matches app chrome (unified shell, not a darker rail).
- Top bar ~44px (`h-11`), hairline bottom border.
- Breadcrumbs: `Section / Subsection / Current` — parents link, current is plain
  text.
- Main: consistent page padding (`p-6` or repo default). Optional max content
  width ~1200px on ultra-wide screens.

## Sections and surfaces

- Section title and actions in a header row **above** the content frame — never
  duplicate the title inside the frame body.
- Content frames: elevated fill, modest radius, 1px hairline border (outline or
  quaternary border). Frames stay flat. A popover is the surface that gets a
  shadow.
- Align subsection padding with table row insets so labels and cells share one
  grid.

## Tables and lists (visual)

- Row min-height ~44px, inset row dividers, header row styled like labels.
- Numbers: tabular nums; truncate long text with repo max-width utilities.
- Embedded tables inside a section frame: avoid double padding (frame `p-0` + row
  padding, not frame `p-6` plus row padding).

## Controls

- Secondary, the default button: `h-7`, `rounded-md`, elevated fill, primary
  text, 1px ring in the tertiary border color. Hover shifts that fill slightly.
  Active `scale-[0.97]`.
- Primary: same height and radius, accent fill, inverted label, no ring.
  Horizontal padding a step wider than secondary (`px-3`). Hover darkens the
  accent. Disabled uses the quaternary fill and secondary text at full opacity.
  Do not fade a primary with opacity alone.
- Look at what the control does when activated. If it changes something, use a
  pointer, a hover fill, and press scale. If it is disabled or does nothing,
  leave the default cursor and the resting appearance. Do not add
  `cursor-not-allowed`.
- Every `button` sets its own background: a token fill or `bg-transparent`.
  With no background, the user-agent button face is a gray and paints over the
  surface behind it.
- Modals (`dialog`): centered in the viewport. Preflight sets `margin: 0`,
  which removes the browser's `dialog { margin: auto }`, so set `m-auto` and a
  max width. Close control is an X (`XMarkIcon`) in the top corner,
  `bg-transparent`, labeled Close. Cancel stays with the footer actions.
- Shared input class: border, elevated fill, accent focus ring; selects styled
  consistently. Hide the native select caret (`appearance-none`) and draw one
  about 12px in from the right edge, with extra padding so the value does not
  sit under it. The native caret sits flush against the border.
- Fixed-height textareas with internal scroll; no drag resize handles unless the
  repo standard says otherwise.
- Heroicons outline for product chrome unless the repo standardizes otherwise.
- Row overflow (when `principle-frontend-ux` requires a menu): horizontal
  ellipsis (`EllipsisHorizontalIcon`), tertiary icon button at the row end.
  Menu is a portaled popover aligned to that button, 4–6px offset, so table
  overflow does not clip it. Panel: elevated fill, `rounded-md`, `p-1`. Edge is
  a soft shadow plus a 1px hairline ring in `box-shadow`, not a layout border.
  Items are at least 32px tall, `rounded-md`, `text-sm`, `bg-transparent`,
  primary text. Highlight uses the hover surface. Destructive items use the
  error text color and the error tint on highlight. The trigger keeps the hover
  fill while the menu is open. Open animates opacity and scale from 0.95;
  reduced motion fades only.

## Motion (visual)

- Nav, breadcrumbs, table row hover: color/background only (~150ms) — no
  enter/exit animation on high-frequency paths.
- Buttons: explicit transition properties (not `transition-all`); optional
  `active:scale-[0.97]`, ~100–160ms ease-out.
- Overlays: ease-out, fade plus slight scale from ~0.95 — never from zero.
- Use fine-pointer hover (`fine-hover:` or equivalent) so touch does not stick
  hovered. The variant must include `&:hover:not(:disabled)` inside
  `@media (hover: hover) and (pointer: fine)`. A media query alone applies the
  hover fill to every control on a mouse or trackpad, including closed menu
  rows. Without `:not(:disabled)`, a disabled control still takes the hover
  fill. Menu items rest on the elevated fill (white in the light theme). The
  hover surface and the error tint show only while the pointer is on that item.
  Honor `prefers-reduced-motion` for transforms.

## Density

- 4px grid. Sections `space-y-6`, blocks `gap-4`, inline controls `gap-2`.
- Information density over decorative whitespace for internal tools.
- Reuse existing components and tokens before inventing one-offs.
- At most one or two accent primary buttons visible in a viewport when possible.

## Workflow

1. Read repo `globals.css` (or theme) and `components/ui/*`; repo wins.
2. Compose from existing primitives (shell, section wrapper, table, buttons).
3. Visual pass: hover reads on canvas, table alignment, motion checklist above.
4. For three variants to compare, use the `utility-ui-options-toggle` skill.
