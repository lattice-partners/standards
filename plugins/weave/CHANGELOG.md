# Changelog

## 2.1.0

Split per-repo config: `weave.md` holds repo type, `opt-out` (always set;
`none` when all defaults stay on), and Weave-only notes. Components,
verification, prerequisites, boundaries, and project notes live in a
"Run and test" section of root `AGENTS.md` (`<!-- run-and-test:start -->`
markers; scaffold in `/setup-weave`, shape in `principle-weave`). Setup replaces
an older `weave:start` section when it finds one. Task protocol, risk, and
definition of done move to always-on `principle-process`.
`/setup-weave` interviews for repo type and each opt-out again and writes both
files.

## 2.0.1

`principle-frontend-ux` and `lattice-design`: wizard modals use header Back and Close, footer Cancel plus one primary, and progressive disclosure.

## 2.0.0

Redesign `/setup-weave` around repository-specific trust. It now discovers and
confirms monorepo components, verifies runtime and testing methods, records
evidence requirements, boundaries, notes, risk rules, and a strict definition
of done. Setup also maintains a marked root `AGENTS.md` pointer. Existing task
and principle skills remain available.

## 1.1.18

`lattice-design`: hover is only for a control that will respond. Disabled and
inert controls keep the default cursor and their resting appearance.
`fine-hover` uses `&:hover:not(:disabled)`.

## 1.1.17

`lattice-design`: the body sets `antialiased`. Without it, macOS subpixel
smoothing paints the same font weight darker, so buttons look bolder.

## 1.1.16

`lattice-design`: fine-pointer hover must include `&:hover` inside the hover
media query. A media query alone paints hover fills on every mouse control.

## 1.1.15

`lattice-design`: secondary buttons are elevated with a 1px ring; primary
hovers a darker accent. Popovers use a soft shadow plus a hairline ring, 32px
items, and a highlighted trigger while open. From Mesh client pages.

## 1.1.14

`lattice-design`: select carets are inset about 12px from the right edge. The
native caret sits flush against the border.

## 1.1.13

`lattice-design`: modals are centered. Set `m-auto` because preflight removes
the browser dialog margin. Close control is an X in the top corner.

## 1.1.12

`lattice-design`: buttons set an explicit background. A portaled menu is the
elevated fill; item buttons are transparent so the user-agent button face does
not cover the panel.

## 1.1.11

`principle-frontend-ux`: interactivity rules: pointer on controls, hover on
unexpected click targets, color or underline on text links.

## 1.1.10

Table rows with more than two actions use one overflow menu. Trigger is a
horizontal ellipsis; destructive items confirm before they run.

## 1.1.9

`principle-demo`: mock-up pages keep data in `sessionStorage`, ship multiple
clickable flows, and do not connect to a real database.

## 1.1.8

`principle-frontend-ux`: expand UX rules (edit/create, active-first lists,
copy, motion policy, states). Visual system stays in `lattice-design`.

## 1.1.7

`lattice-design` uses Tailwind CSS v4 through `@tailwindcss/postcss`, matching
the current Next.js install guide. Keep an existing Tailwind major version.

## 1.1.6

`/utility-weave-improvements` reads recent chats for security issues, repeated
frustrations, and other gaps the standard should cover, including when nobody
mentioned Weave. It runs only when invoked. It does not edit files.

## 1.1.5

`lattice-design`: expand UI rules (tokens, shell, sections, tables, controls,
motion, density). UX stays in `principle-frontend-ux`.

## 1.1.4

`lattice-stack`: local may use staging values or a local substitute; staging and production stay on their own. Day-to-day `db push` targets the staging branch; `main` applies production migrations. `apps/server` prefers Vercel, with Railway when the process must stay running. Clerk user and org id columns are `text`; other ids may be `uuid`.

## 1.1.3

`lattice-stack`: one Next.js app at the repo root, or a monorepo with
`apps/web`, `apps/server`, and `supabase/`. One Supabase project; local and
`dev` use the staging branch and Clerk Development keys; `main` uses the
production branch and Production keys. `API_URL` points at the matching
`apps/server` deploy. RLS uses Clerk `sub` and `o.id`.

Rename `ui-options-toggle` to `utility-ui-options-toggle`. Security assumes
a site is private unless it is clearly public. Do not replace a stack tool
the project already chose.

## 1.1.2

`/setup-weave` uses AskQuestion, one field per turn. Each question observes
what is already in the repo or Weave.md and asks keep or edit.

## 1.1.1

`/setup-weave` interviews for every `weave.md` field (repo type, each
opt-out, notes including boot / prove / proof) and writes only after
confirmation.

## 1.1.0

Replace always-on `.mdc` rules with `principle-*` skills (`alwaysApply: true`).
Remove the plugin `rules` bundle.

## 1.0.0

Weave-only repo. Remove CLI, core, stack, templates, hooks, and docs. Policy
lives in hand-authored plugin rules and skills. Per-project config via
`weave.md` and `/setup-weave`.

## 0.11.0

Restructure around hand-authored rules, three skills, two commands, and
`templates/weave.md` for opt-outs.

## 0.10.0

Remove Weave Cursor hooks and their scripts.

## 0.9.0

Remove Weave subagents.

## 0.8.0

First Weave release.
