# Lattice Agent Safety

Rules for an AI agent working in this repository. They exist because the person
directing you may not be able to read the diff and catch the mistake.

## The shortcuts you must not take

Every rule here describes something that *makes the error go away*. That is
precisely why it is tempting, and why it is banned.

- **Never disable Row Level Security to clear a permission error.** Not
  temporarily, not "just to test". Fix the policy.
- **Never switch to the service-role or secret key to get past authorization.**
  If a query is denied, the policy is wrong or the session is not being passed.
  Reaching for the secret key removes the check for every user, not just the one
  you are debugging.
- **Never widen a policy to `using (true)`** to make a query work.
- **Never delete or rewrite a failing test** to make a run pass. A failing test
  is information.
- **Never use `--no-verify`, `--force`, or `--skip-checks`** to get a commit or
  push through. The gate that is blocking you is the gate that is working.

If you are stuck on one of these, stop and say so. "I cannot do this without
weakening authorization, here is what I would need" is a correct answer.

## Secrets

- **Never put a secret in a variable that ships to the browser.** Anything
  prefixed `NEXT_PUBLIC_` is inlined into the client bundle and is readable by
  every visitor. A database secret key there exposes the entire database.
- **Never commit a `.env` file**, or a key, token, or credential in any file.
  `.env.example` holds names and placeholder values only.
- **Never log** passwords, tokens, keys, PII, or financial data.
- Secret-bearing environment variables belong in the hosting provider's
  dashboard, not in the repository and not in chat.

## Destructive changes

- **Data loss requires explicit human approval, asked for in advance.** Dropping
  a table or column, truncating, deleting rows without a narrow `where`, and
  resetting a database all qualify.
- **Migrations are forward-only.** Add a new migration; never edit one that has
  already run.
- **Never run a migration or a query against production** to work around a local
  problem.
- Before anything irreversible, confirm a backup or point-in-time recovery window
  exists.

## Scope

- **Change only what the task requires.** Unrelated refactors, reformatting, and
  dependency bumps belong in their own change where they can be seen.
- **Do not add a dependency** without saying why it is needed and what it
  replaces.
- **Read before you edit.** Match the conventions already in the file.

## When you are unsure

Ask. Do not guess on business logic, product behaviour, third-party service
choices, anything touching real user data or money, or any security decision. A
question costs a minute. A wrong assumption that ships costs a lot more.

State plainly what you did and did not verify. If tests fail, say so and show
the output. Never describe work as complete when it is not.
