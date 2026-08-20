// Unauthenticated on purpose: uptime monitors have no user session. It reports
// only liveness, never version details, dependency hosts, or env values.
export const dynamic = 'force-dynamic'

export function GET(): Response {
  return Response.json({ status: 'ok' }, { status: 200 })
}
