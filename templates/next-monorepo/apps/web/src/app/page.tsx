import { currentUser } from '@clerk/nextjs/server'

export default async function HomePage() {
  const user = await currentUser()

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">
        {user ? `Signed in as ${user.firstName ?? user.id}` : 'Not signed in'}
      </h1>
      <p className="text-muted-foreground">
        Replace this page. Requests to /api/* are rewritten to the api app, which enforces
        authentication and talks to Supabase under the signed-in user.
      </p>
    </section>
  )
}
