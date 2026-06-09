# Lattice Security Baseline

Non-negotiable. Before any security-adjacent change: read the existing
implementation, explain the implications, get explicit approval.

- **Validate and sanitize all inputs at the API boundary.** Never trust the
  client.
- **Authentication.** Validate tokens/signatures server-side on every request.
- **Authorization.** Enforce at the data layer, not just the UI.
- **OWASP Top 10.** Actively guard against XSS, SQL injection, and CSRF.
- **Rate-limit all public endpoints.**
- **Least privilege** for every component and credential.
- **Never log** passwords, tokens, keys, PII, or financial data.
- **Secrets in env vars** — never hardcoded, never committed. **HTTPS only.**

For financial / high-stakes platforms, add platform-specific rules in the
project's `AGENTS.md`.
