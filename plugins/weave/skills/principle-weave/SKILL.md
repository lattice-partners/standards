---
name: principle-weave
description: Use repository-specific Weave configuration and relevant task skills.
---

# Weave

`weave.md` is approved project configuration. The required engineering process
lives in the `engineering-process` rule.

When this skill is relevant:

1. Read root `weave.md` if it exists. Use its component paths and explicit
   Lattice flags to select applicable skills.
2. Use `principle-demo` for a mock-up, `lattice-stack` when stack is enabled
   for the component, and `lattice-design` when design is enabled for it.
3. Use other principle and task skills when their subjects match the change.
4. Keep required verification and handoff behavior in the rule.

If `weave.md` is stale or incorrect, propose a specific correction. Apply it
only through `/setup-weave` or after explicit human approval.

If `weave.md` is missing, say so. Do not invent repository-specific settings.
