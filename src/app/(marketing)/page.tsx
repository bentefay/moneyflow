import Link from "next/link";

/**
 * Landing Page
 *
 * Marketing landing page for MoneyFlow.
 */

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="container flex flex-col items-center gap-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Track Shared Expenses
          <br />
          <span className="text-primary">Without Compromising Privacy</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg">
          MoneyFlow is an end-to-end encrypted household expense tracker. Import transactions,
          allocate expenses, and see who owes what—all with real-time collaboration and
          zero-knowledge encryption.
        </p>
        <div className="flex gap-4">
          <Link
            href="/new-user"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-medium"
          >
            Get Started
          </Link>
          <Link
            href="/features"
            className="hover:bg-accent inline-flex items-center justify-center rounded-md border px-6 py-3 text-sm font-medium"
          >
            Learn More
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container py-16">
        <h2 className="mb-12 text-center text-2xl font-bold">Why MoneyFlow?</h2>
        <div className="grid gap-8 md:grid-cols-3">
          <FeatureCard
            title="End-to-End Encrypted"
            description="Your financial data is encrypted on your device. We never see your transactions, balances, or who you share expenses with."
          />
          <FeatureCard
            title="Real-Time Collaboration"
            description="Share a vault with your household. Changes sync instantly across all devices using conflict-free data structures."
          />
          <FeatureCard
            title="Import & Automate"
            description="Import transactions from CSV or OFX files. Set up rules to automatically categorize and allocate expenses."
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border p-6">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}
