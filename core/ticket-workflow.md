# Lattice Ticket Workflow

How work moves from a ticket to production. Applies when the project's
`AGENTS.md` block declares a tracker; projects without one skip this file.

## Branches

- **`dev` is the integration branch.** All ticket work branches from it.
- **`main` is production.** It accepts direct commits for hotfixes only.
- **A ticket branch is named exactly the ticket identifier**, for example
  `MIN-155`. No prefix, no description, no slug.

Start a ticket with `lattice ticket MIN-155`. It fetches and branches from
`origin/dev`, so you cannot accidentally build on a stale base or on `main`.

The branch name is not a convention, it is the link. The tracker integration
reads the branch name, the pull request title, and the pull request description.
It does **not** read commit messages. A branch named `fix-login` links to
nothing, and the ticket silently never moves. This is why the pre-commit hook
rejects it.

## Merging into dev

Open a pull request from the ticket branch into `dev`. **Leave the body empty.**
The ticket already describes the work; copying it here only creates two versions
that drift apart.

Merging moves the ticket to In Review.

## Releasing to main

Open a pull request from `dev` into `main`. Its body is exactly two lists and
nothing else:

```markdown
- Closes MIN-155
- Closes MIN-160

- Adds password reset to the sign-in flow
- Fixes duplicate rows in the export
```

The first list closes the tickets on merge. The second is the human-readable
summary of what is shipping.

Generate it with `lattice release` rather than writing it by hand. A closing
line that gets missed leaves a shipped ticket open, and the generated list is
derived from the commit range so it cannot miss one.

Merging into `main` closes the tickets.

## Commits

Commit messages follow the base standard: Conventional Commits, one line unless
the *why* is not obvious, no ticket IDs or URLs in the message (the branch
carries the link), and never an AI-attribution trailer.

## Environments

| Branch | Deploys to |
| ------ | ---------- |
| ticket branch | preview |
| `dev` | staging |
| `main` | production, behind manual promotion |

## Tracker setup

Three things must be configured in the tracker itself. They cannot be enforced
from the repository, and the workflow does not function without them:

1. Connect the tracker's GitHub integration to the repository.
2. Set the branch format to the bare issue identifier, so the identifier copied
   from a ticket matches what the hook expects.
3. Configure branch-specific workflow rules for the team: merging into `dev`
   sets In Review, merging into `main` sets Done.
