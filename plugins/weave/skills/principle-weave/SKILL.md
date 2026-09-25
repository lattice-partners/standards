---
name: principle-weave
description: Read and follow the repository's confirmed weave.md trust contract.
alwaysApply: true
---

# Weave

`weave.md` is the repository's confirmed trust contract for agent work.

Before planning or changing a repository:

1. Read root `weave.md` if it exists.
2. Follow its component instructions, boundaries, notes, task protocol, risk
   rules, verification methods, and definition of done.
3. Apply all always-on principles. Apply `principle-demo` when the user asks
   for a mock-up.
4. Respect any existing opt-outs for Supabase, Clerk, Vercel, and Lattice
   Design.
5. Use task skills when the work matches: Lattice stack setup, Lattice Design,
   and UI variants.
6. Never report work complete when its required verification cannot run.
7. Never weaken an approved verification plan without human approval.

Regular feature agents must not edit `weave.md`. If it is stale or incorrect,
propose a specific correction. Apply corrections only through `/setup-weave`
after human approval.

If `weave.md` is missing, say so. Apply Lattice principles and defaults, but
do not invent repository-specific commands, permissions, or verification
methods.
