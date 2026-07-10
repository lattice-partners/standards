# ADR-0003: Concise commit messages, no names or PII

**Date:** 2026-07-08
**Status:** Accepted
**Owner:** Darragh Mahns

## Context

Conventional Commits (ADR-0001) set the format but not the length or content.
Agent-authored commits drift toward multi-paragraph bodies and often embed
personal names, Linear ticket IDs and URLs, or other PII that then lives
permanently in git history across client repos.

## Decision

Commit messages stay concise: a short conventional-commit summary of what was
built, one line by default, with a brief body (a sentence or two) only when the
*why* is not obvious. No paragraphs. No personal names, ticket IDs/URLs, emails,
or other PII in the message. The rule lives in the **Commits** section of
`agents-base.md`, which is vendored into every project.

## Why

- Git history is permanent and often shared with clients; PII and internal
  ticket references do not belong there.
- Short messages are easier to scan and keep the log useful.
- The description should stand on its own: what changed, not who asked or where
  it is tracked.

## Consequences

- Rides in the unreleased `VERSION` 0.3.0 (additive standard change).
- The prior "body explains why" bullet is narrowed to "brief body only when the
  why is not obvious".
- Existing client repos pick up the rule when they re-vendor to base@0.3.0.
- Future option: enforce in CI (reject over-length messages or PII patterns)
  once the Phase 2 CI pipeline exists.
