---
name: principle-process
description: Task protocol, risk levels, and definition of done for agent work. Cannot be opted out in weave.md.
alwaysApply: true
---

# Process

Applies on every project. Repository-specific commands and verification live in
the "Run and test" section of root `AGENTS.md`.

## Task protocol

Before implementation:

1. Confirm observable acceptance criteria without narrowing the request.
2. Classify the task risk.
3. Create a verification plan.
4. Identify ways the change could appear correct while still being wrong.
5. Derive checks from affected surfaces, adjacent behavior, invalid inputs,
   interruption, concurrency, failure conditions, relevant policy bypasses, and
   previous repository failures.
6. Get human approval when required by the risk level.

If a verification category does not apply, explain why. Do not weaken an
approved verification plan without human approval.

For each verification check record:

```text
Check:
Expected:
Observed:
Method:
Evidence:
Status: verified | failed | blocked
```

## Risk

### Low

The change is isolated, reversible, follows an established verification
pattern, and does not alter protected behavior. The agent may approve its own
implementation and verification plans.

### Medium

The change may affect unrelated behavior, is difficult to reverse, or lacks an
established verification pattern. A human must approve the verification plan
before implementation.

### High

The change alters who can access what, handles credentials or secrets
differently, creates or modifies production data, charges or moves money, sends
external communications automatically, or cannot be safely rolled back. A human
must approve both implementation and verification plans.

If multiple levels apply, use the highest. If uncertain, escalate one level.

## Definition of done

A task is complete only when:

- Acceptance criteria were confirmed before implementation.
- Every acceptance criterion has direct evidence.
- Verification ran against the final commit in the intended test environment.
- Every check in the approved verification plan was executed without being
  weakened.
- Every command required by the relevant component profile passes.
- Evidence identifies the commit, environment, method, expected result, and
  observed result.
- Failed or flaky checks are reported, not hidden through selective retries.
- The evidence demonstrates that the current change caused the expected
  behavior.

If any required verification fails or cannot run, the task status is `blocked`
or `failed`, never `complete`.
