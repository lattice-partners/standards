# ADR-0008: branch off dev, name branches after the Linear ticket

**Date:** 2026-08-19
**Status:** Accepted
**Owner:** Darragh Mahns

## Context

The standard had no branching model and no link between code and tickets.
Projects invented their own, and Linear issues were moved by hand, which means
they were not moved at all.

Linear's git integration can drive issue status automatically, but only if the
repository follows a shape it can read. One constraint from Linear's
documentation shapes everything here: **the integration cannot link issues via
commit messages.** It links through the branch name, the pull request title, or
the pull request description, and nothing else.

## Decision

- **`dev` is the integration branch.** Ticket work branches from `dev`.
- **A branch is named exactly the Linear issue identifier**, for example
  `MIN-155`. No prefix, no slug.
- **Merging into `dev` moves the issue to In Review.** The pull request body is
  empty; the ticket already holds the context and duplicating it guarantees the
  two disagree.
- **Releasing is a `dev` into `main` pull request** whose body is exactly two
  bullet lists: closing magic words (`Closes MIN-155`) so Linear closes the
  issues on merge, then one line per feature shipping. `lattice release`
  generates it from the commit range.
- **`main` accepts direct commits for hotfixes only.**
- **`dev` deploys to staging, `main` deploys to production.**

`lattice ticket MIN-155` fetches and branches from `origin/dev`. The pre-commit
hook validates the branch name and blocks commits made directly on `dev`.

Configuration lives in the `AGENTS.md` lattice block alongside posture and
stack, so a guest repo on a different tracker can leave it unset.

## Why

- **The empty dev PR body only works because the branch carries the ID.** Since
  Linear cannot read commit messages, a misnamed branch links nothing and the
  issue silently never moves. That is why branch naming is validated by a hook
  rather than documented as a convention.
- **Bare `MIN-155` over `MIN-155-add-login`.** Both link correctly. The bare form
  is unambiguous to validate and gives the branch exactly one meaning.
- **Generating the release body rather than templating it.** The closing magic
  words have to be complete or a ticket stays open after shipping. Deriving them
  from `origin/main..origin/dev` cannot miss one.
- **`dev` as a staging gate.** With direct commits to `main` permitted, `dev`
  plus a staging deployment is what gives a change somewhere to be seen before
  it reaches users.

## Consequences

- `VERSION` bumped to 0.5.0.
- New projects need a `dev` branch and a Linear team prefix at init.
- Three Linear-side setup steps cannot be enforced from the repository and are
  documented instead: connect the GitHub integration, set Branch format to the
  bare issue identifier, and configure branch-specific workflow rules per team
  (merge to `dev` sets In Review, merge to `main` sets Done).
- CI runs on `dev` as well as `main`, since `dev` is now where integration
  actually happens.
- Projects that do not use Linear leave the tracker unset and the branch-name
  check is skipped.
