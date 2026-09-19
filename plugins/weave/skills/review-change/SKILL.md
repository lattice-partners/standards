---
name: review-change
description: Review a diff for correctness, maintainability, tests, and Lattice standards. Use before shipping or when asked to review a PR.
---

# Review a change

Read the diff. Do not rubber-stamp.

## Preflight

- Identify posture (greenfield vs guest) so you do not demand a Lattice
  layout on a client codebase.
- Read the applicable Weave rules: engineering, commits, working agreement,
  security, ticket workflow if a tracker is declared, stack rules if
  `apps/` or `supabase/` moved.

## Action

Check, with evidence (file and line):

1. **Correctness.** Does the change do what the ticket or request asked?
2. **Scope.** Unrelated edits, leftover debug, commented-out code.
3. **Tests.** Feature without tests, deleted tests, assertions that cannot
   fail.
4. **Security.** Secrets, `NEXT_PUBLIC_` leaks, RLS bypass, missing input
   validation.
5. **Standards.** Typing, error handling, naming, commit/PR attribution.

Do not implement fixes in a read-only review unless asked. File findings
by severity: blocker, should-fix, nit.

## Verification

Every finding cites a path. If you found nothing, say what you inspected.

## Summary

Verdict (approve / request changes), blockers, and residual risk.
