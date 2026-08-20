import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'App',
  description: 'Replace this with the product name and description.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // Clerk Core 3 note: ClerkProvider sits inside <body>, not around <html>.
    // Wrapping <html> opts the whole tree out of Next.js cache components.
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${geistSans.className}`}
    >
      <body className="bg-background text-foreground antialiased">
        <ClerkProvider>
          <header className="border-border flex items-center justify-between border-b px-6 py-4">
            <span className="font-medium">App</span>
            <nav className="flex items-center gap-3">
              <Show when="signed-out">
                <SignInButton />
                <SignUpButton />
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </nav>
          </header>
          <main className="px-6 py-10">{children}</main>
        </ClerkProvider>
      </body>
    </html>
  )
}
