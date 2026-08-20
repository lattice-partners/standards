# ADR-0010: Setup owns and verifies actions

**Date:** 2026-08-20
**Status:** Accepted
**Owner:** Lattice

## Context

The first setup wizard still printed remediation commands and asked people to
run them elsewhere. It could not observe whether those commands ran, and its
external-service checklist marked work complete without checking provider or
application state.

## Decision

`lattice setup` owns every safe command it can run. The full-screen UI suspends
while a child uses the real terminal, resumes afterward, and re-runs a named
postcondition. GitHub repository creation and billable provider actions remain
human decisions in the browser, but setup opens the relevant page and verifies
the resulting remote, link, configuration, or explicit non-secret evidence.

`doctor` findings are structured checks with stable IDs, plain-language
remediation, and optional argument-array actions. Interactive use offers one
action at a time; non-interactive use remains read-only. Secrets are masked and
never included in evidence records.

The stack pins the Supabase CLI as a project dependency. Vercel CLI installation
is offered only when needed and requires confirmation. GitHub uses git directly,
not `gh`.

## Consequences

- Setup succeeds only after project, provider, environment, and local health
  checks pass.
- Interrupted setup resumes from observed state rather than a fragile step
  counter.
- Dashboard-only controls are visibly confirmed and recorded, never silently
  treated as machine-verified.
- The portable agent standard requires agents to execute and verify safe setup
  commands instead of handing them back to a person.
- `VERSION` advances to 0.7.0.
