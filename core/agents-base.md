# Lattice Engineering Standard (base)

> This is the **portable core** engineering standard. It is stack-agnostic and
> applies to every Lattice engagement, greenfield or brownfield. A project's own
> `AGENTS.md` composes from this file: copy the project header below, pin the
> `lattice-standards` version, then add project-specific facts (stack, env,
> architecture). `CLAUDE.md` is a symlink to that `AGENTS.md` - one file on disk,
> two names, zero drift.

## How to compose a project AGENTS.md

Every project repo gets an `AGENTS.md` shaped like this:

```markdown
# <Project Name>

Standards: lattice-standards@<version>  (see core/agents-base.md)
Engagement posture: <greenfield | consultative-guest>  (see working-agreement.md)

## Project context
<what this is, who the client is, current phase>

## Stack
<languages, frameworks, services - or "inherits Lattice stack">

## Architecture pointers
<decisions already made; the why>

## Environment & ops
<env vars, deploy targets, migration rules>
```

Then `ln -s AGENTS.md CLAUDE.md` so Claude Code and AGENTS.md-aware tools
(Codex, Gemini, Cursor, …) read identical instructions.

## Engineering standards

- **Simplicity is the highest priority.** Never write more code than the task
  requires. No "just in case" abstractions. (YAGNI, ruthlessly.)
- **DRY.** The same logic in two or more places gets extracted.
- **Explicit over clever.** Readable, obvious code wins. No magic one-liners.
- **Descriptive names.** No abbreviations beyond standard ones (`id`, `db`,
  `url`). Prefer `getActiveUserSessions` over `getSessions`.
- **One concept per file.** If a file is doing two things, split it. A file
  growing large is a signal it is doing too much.
- **No dead code. No commented-out code.** Remove unused code immediately. No
  `TODO` without a linked issue.
- **Doc-comment every exported symbol** (function, class, type, constant).
  Brief, single-purpose; say **what** and **why**, not **how**. Inline comments
  only where the *why* is not obvious - never restate what the code does.
- **Typed boundaries.** Use the strictest typing the language offers. In
  TypeScript: strict mode, no `any` (use `unknown` + narrowing). Validate and
  type any structured data crossing a module boundary (HTTP, tool args, DB rows,
  queue payloads) with a schema, and derive types from the schema rather than
  hand-writing them in parallel.
- **Error handling on every external call.** Every API, DB, filesystem, or
  network call has explicit handling. Never swallow errors silently. User-facing
  error states have clear messages.
- **Tests ship with features.** Unit tests for every feature; integration/e2e
  for critical paths. Prefer too many over too few. Handle edge cases - if you
  can think of how it breaks, handle it.

## Writing style

- **No em dashes. No emojis.** Applies to all written output: code, comments,
  docs, commit messages, PR descriptions, and chat. Use hyphens, commas, colons,
  or parentheses in place of em dashes; use plain text in place of emojis.

## Commits

- **Conventional Commits 1.0.0.** Every commit message is
  `<type>[optional scope][!]: <description>` - e.g. `feat(auth): add WhatsApp
  OTP login`. Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`,
  `test`, `build`, `ci`, `chore`, `revert`. A breaking change adds `!` before
  the colon and a `BREAKING CHANGE:` footer. Spec:
  <https://www.conventionalcommits.org/en/v1.0.0/>
- **Atomic commits** - one logical change each.
- **Concise.** The description is a short summary of what was built. Prefer a
  one-line message; add a brief body only when the *why* is not obvious, and
  keep it to a sentence or two. No paragraphs, no walls of text.
- **No names or PII.** Never put personal names, Linear or other ticket
  IDs/URLs, emails, or any other PII in a commit message. Describe the change,
  not who asked for it or where it is tracked.
- **No AI attribution.** Never add `Co-Authored-By:` trailers or any AI
  attribution footer. Plain messages only - even when asked to run the commit.
- **Agents never commit unless explicitly asked.** Suggest the message; the
  human runs git. Never commit secrets, `.env` files, keys, large binaries, or
  `node_modules`.

## When unsure - ask

Don't guess on business/product logic, UX choices, third-party service
selection, anything involving real user data or money, or security decisions.
A wrong assumption that gets built is harder to undo than a question.
