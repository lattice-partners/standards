# Vercel

Hosting for the Lattice stack. One Vercel project per app, both pointed at the
same repository.

## 1. One project per app

`apps/web` and `apps/api` deploy independently, so each gets its own Vercel
project with its own Root Directory.

| Vercel project | Root Directory | Framework |
| --- | --- | --- |
| `<client>-web` | `apps/web` | Next.js |
| `<client>-api` | `apps/api` | Next.js |

Set Root Directory under **Settings > Build and Deployment > Root Directory**,
and enable **Include source files outside of the Root Directory in the Build
Step**. Without it the build cannot see `packages/*`, `tsconfig.base.json`, or
the workspace lockfile, and fails on the first shared import.

```bash
cd apps/web && vercel link
cd apps/api && vercel link
```

Each app builds with the repo-root install and its own build command, so
Turborepo's cache still applies.

## 2. Branch to environment mapping

| Branch | Vercel environment | Serves |
| --- | --- | --- |
| `main` | Production | Production domain, after manual promotion |
| `dev` | `staging` (custom environment) | Staging domain |
| Any other branch | Preview | Per-deployment preview URL |

Set the Production Branch to `main` under **Settings > Git**.

Create the staging environment under **Settings > Environments**, with a branch
matcher of `equals dev`, so every push to `dev` deploys to a stable staging
domain rather than a throwaway preview URL. Staging gets its own Supabase
project and its own Clerk instance, so a staging test cannot touch production
data.

Deploy to it explicitly when needed:

```bash
vercel deploy --target=staging
vercel pull --environment=staging
```

## 3. Production deploys behind manual promotion

Turn off **Auto-assign Custom Production Domains** under
**Settings > Git > Branch Tracking**.

With it off, a push to `main` still builds and deploys, but the deployment is
not aliased to the production domains. Production keeps serving the previous
deployment until someone promotes the new one:

```bash
vercel promote <deployment-url>
```

This is the control that stops a merged commit from being live. Without it,
"merged to main" and "in front of every user" are the same event, and the only
way to undo a bad merge is another deploy. With it, the build is verified on its
own URL first and promotion is a deliberate, separately auditable act.

The same behaviour is available per-deploy from CI with `vercel deploy --prod
--skip-domain`, which overrides the project setting. Use the project setting as
the default so the safe path does not depend on remembering a flag.

Rollback is `vercel rollback <deployment-url>` (Pro and Enterprise).

## 4. Environment variables

Values live in Vercel, per environment. Nothing is committed.

```bash
vercel env ls
vercel env add SUPABASE_SECRET_KEY production
cd <repo-root>
vercel env pull .env.local              # development values
vercel env pull .env.local --environment=staging
```

Per project:

| Project | Variables |
| --- | --- |
| `<client>-web` | `API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, Clerk keys |
| `<client>-api` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, Clerk keys |

Rules:

- `SUPABASE_SECRET_KEY` belongs to `<client>-api` only. `apps/web` never needs
  it and should not be able to read it.
- Every environment gets its own value. `API_URL` in preview must point at a
  preview or staging API, never at production. See `stack/nextjs/README.md`.
- Anything prefixed `NEXT_PUBLIC_` is inlined into the client bundle. A secret
  behind that prefix is published, and rotating it is the only fix.
- `.env*` files stay gitignored. `vercel env pull` regenerates them.

Clerk's Marketplace integration provisions its own variables. Do not overwrite
them by hand (see `stack/clerk/README.md`).

## 5. Rate limiting via Vercel Firewall

`core/security-baseline.md` requires rate limiting on all public endpoints. On
this stack that is Vercel WAF custom rules on the `<client>-api` project, not
application code.

DDoS mitigation is automatic on every plan and needs no configuration. Rate
limiting does not: it is opt-in per rule.

Traffic blocked by the firewall is not billed, so a rate limit also caps the
cost of an abusive client.

### Add a rule

Staged rollout. Start in `log` mode with a generous limit, review what actually
matched, then enforce.

```bash
vercel firewall rules add "Rate limit API" \
  --condition '{"type":"path","op":"pre","value":"/api"}' \
  --action rate_limit \
  --rate-limit-window 60 \
  --rate-limit-requests 600 \
  --rate-limit-keys ip \
  --rate-limit-action log \
  --yes

vercel firewall diff
vercel firewall publish --yes
```

Review hits at
`https://vercel.com/<team>/<project>/firewall/traffic?filter=<ruleId>`, then
tighten the limit and switch `--rate-limit-action` to `deny` (403) or leave it
as `rate_limit` (429).

Rules are drafts until published. `rules`, `ip-blocks`, and edits all stage;
`system-bypass` and `attack-mode` take effect immediately.

### Scoping

- Scope by method. `GET /api/documents` and `POST /api/documents` do not need
  the same limit.
- Give unauthenticated and expensive endpoints (sign-in, search, file upload,
  anything that calls a paid API) their own tighter rules.
- Webhook routes are public by session but should be limited by path and, where
  the provider publishes them, by source IP.
- Counters are per region. With N regions serving traffic, the effective global
  limit is up to N times the configured number. Size accordingly.

### Per-user limits

IP-keyed limits are the floor, not the ceiling. To bucket by tenant or user,
use the Rate Limiting SDK inside the route handler:

```ts
import { checkRateLimit } from '@vercel/firewall'
import { auth } from '@clerk/nextjs/server'

export async function POST(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { rateLimited } = await checkRateLimit('update-document', {
    request,
    rateLimitKey: userId,
  })

  if (rateLimited) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  // ...
}
```

The rule is still defined in the firewall dashboard; the SDK only chooses the
counting key.

### Do not over-block

User-agent substrings and JA4 fingerprints collide with real traffic far more
than they look like they will. A single JA4 covers an entire browser release.
Log first, confirm in the dashboard, then enforce.

## 6. Preview protection

Preview deployments of a client project are not public by default and should
stay that way. Keep Vercel Authentication enabled under
**Settings > Deployment Protection** so preview URLs require a team login.

## Reference

- <https://vercel.com/docs/monorepos>
- <https://vercel.com/docs/deployments/promoting-a-deployment>
- <https://vercel.com/docs/deployments/environments>
- <https://vercel.com/docs/vercel-firewall/vercel-waf/custom-rules>
- <https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting-sdk>
