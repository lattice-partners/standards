---
description: Review the current diff against Lattice standards, tests, and security.
---

# Review

Follow the `review-change` skill. Prefer a read-only pass unless the human
asked you to implement fixes.

## Preflight

- Identify engagement posture.
- Collect the diff (`git diff` / `git diff origin/dev...HEAD` as applicable).

## Plan

Name the rules that apply (engineering, security, ticket workflow, stack)
and whether this is approve-only or fix-forward.

## Commands

Load and follow `review-change`. Cite file paths for every finding.

## Verification

Every blocker has a path. If you approve, you inspected tests and security
surface, not just the happy path.

## Summary

```text
## Result
- Action: review
- Status: approve | request changes
- Details: blockers, should-fix, residual risk
```
