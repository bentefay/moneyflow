/**
 * Marketing Layout
 *
 * Layout for public marketing pages (landing page, features, etc.).
 * No authentication required.
 */

import { Header, Footer } from "@/components/features/landing";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
    </div>
  );
}
