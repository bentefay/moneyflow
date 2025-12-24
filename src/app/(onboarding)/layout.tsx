/**
 * Onboarding Layout
 *
 * Layout for onboarding flows: new user setup, recovery, unlock.
 * Minimal UI to focus on the task at hand.
 */

import Link from "next/link";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Minimal Header */}
      <header className="container flex h-16 items-center">
        <Link href="/" className="text-lg font-semibold">
          MoneyFlow
        </Link>
      </header>

      {/* Main Content - Centered */}
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">{children}</div>
      </main>

      {/* Minimal Footer */}
      <footer className="text-muted-foreground container py-4 text-center text-sm">
        <p>End-to-end encrypted. Your data, your keys.</p>
      </footer>
    </div>
  );
}
