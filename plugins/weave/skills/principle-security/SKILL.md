---
name: principle-security
description: Lattice security expectations. Cannot be opted out in weave.md.
alwaysApply: true
---

# Security

Non-negotiable. Before security-adjacent changes: read the existing
implementation, explain implications, get explicit approval when needed.

## Baseline

- Validate and sanitize all inputs at the API boundary.
- Authenticate server-side on every request.
- Authorize at the data layer, not just the UI.
- Guard against XSS, SQL injection, and CSRF.
- Rate-limit public endpoints.
- Least privilege for every credential.
- Never log passwords, tokens, keys, PII, or financial data.
- Secrets in env vars only. HTTPS only. Never commit `.env` or keys.

## Agent shortcuts you must not take

These make errors go away; that is why they are banned.

- Never disable RLS to clear a permission error. Fix the policy.
- Never use the service-role or secret key to bypass authorization on user
  requests.
- Never widen a policy to `using (true)`.
- Never put secrets in `NEXT_PUBLIC_` variables (inlined into the client
  bundle).
- Never run destructive SQL or migrations without explicit human approval.
- Migrations are forward-only. Never edit one that already ran.
- Never run migrations or queries against production to fix a local problem.

If stuck, stop and say what you would need. Weakening authorization is not an
acceptable fix.
