/**
 * Onboarding Layout
 *
 * Layout for onboarding flows: new user setup, recovery, unlock.
 * Minimal chrome - pages handle their own backgrounds and centering.
 */

import Link from "next/link";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      {/* Minimal Header - Floating over content */}
      <header className="absolute top-0 right-0 left-0 z-20 flex h-16 items-center px-4 md:px-8">
        <Link href="/" className="text-lg font-semibold">
          MoneyFlow
        </Link>
      </header>

      {/* Main Content - Full viewport, pages handle their own layout */}
      <main className="min-h-screen">{children}</main>

      {/* Minimal Footer - Floating over content */}
      <footer className="text-muted-foreground absolute right-0 bottom-0 left-0 z-20 py-4 text-center text-sm">
        <p>End-to-end encrypted. Your data, your keys.</p>
      </footer>
    </div>
  );
}
