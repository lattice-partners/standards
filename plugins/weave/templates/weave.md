# Weave

This file is the repository's confirmed trust contract for agent work. Create or
update it with `/setup-weave`. Regular feature agents may propose corrections
but must not edit this file directly.

## Components

<!-- Repeat this block for each confirmed component. -->

### `<component-path>`

- Type: `<application, service, or shared library>`
- Runtime: `<runtime and version>`
- Install or build: `<verified command or procedure>`
- Start: `<verified command or procedure>`
- Test environment: `<confirmed environment>`

#### Verification methods

##### `<method-name>`

- Applies to: `<change categories>`
- Tool: `<tool>`
- Command or procedure: `<verified command or procedure>`
- Expected observable result: `<what proves the method ran correctly>`
- Evidence: `<screenshots, video, transcript, logs, requests, responses, or test output>`

#### Verification gaps

- `<missing method or none>`

Work that depends on a verification gap cannot be reported complete.

## Shared prerequisites

- Package manager: `<confirmed package manager>`
- Required runtimes: `<confirmed versions>`
- Shared services: `<confirmed services or none>`
- Startup order: `<confirmed order>`
- Environment variables: `<names only, never values>`
- Test accounts: `<confirmed fixture or procedure>`
- Seed data: `<confirmed fixture or procedure>`

## Boundaries

- `<repository-specific restriction or action requiring approval>`

## Notes

- `<non-obvious fact agents would otherwise get wrong>`

Notes must not weaken a boundary or verification requirement.

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
