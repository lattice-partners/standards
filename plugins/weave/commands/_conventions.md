# Command conventions

Every Weave slash command uses the same sections so the agent produces a
verifiable result. Files prefixed with `_` are meta-documents, not commands.

## Required sections

1. **Preflight** - prerequisites. Stop with actionable guidance on failure.
2. **Plan** - what will happen, including destructive or production impact.
3. **Commands** - the operational steps or skill to follow.
4. **Verification** - how to confirm the outcome.
5. **Summary** - a short result the human can read.

## Frontmatter

```yaml
---
description: One-line summary of what the command does.
---
```

## Naming

Command files live in `commands/` and end in `.md`. The file stem is the
slash command name (`setup.md` -> `/setup`).
