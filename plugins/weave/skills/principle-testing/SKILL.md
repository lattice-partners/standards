---
name: principle-testing
description: Lattice testing expectations. Cannot be opted out in weave.md.
alwaysApply: true
---

# Testing

- **Tests ship with features.** Unit tests for every feature; integration or
  e2e for critical paths. Prefer too many over too few.
- **Handle edge cases.** If you can think of how it breaks, handle it in code
  or in a test.
- **Never delete or rewrite a failing test** to make a run pass. Fix the code or
  fix the test for the right reason.
- **Every app has a test runner** wired up and at least one real test before you
  call the app done.
- If verification cannot run (missing credentials, no runner), say so plainly.
  Never describe work as complete when tests were not run.
