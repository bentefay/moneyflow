/**
 * Marketing Layout
 *
 * Layout for public marketing pages (landing page, features, etc.).
 * No authentication required.
 */

import type { Metadata } from "next";

import { Footer, Header } from "@/components/features/landing";

// Overrides the root layout's expense-tracking description, which does not describe this product.
export const metadata: Metadata = {
    title: "MoneyFlow — categorise and allocate shared transactions",
    description:
        "Import CSV and OFX statements, sort transactions with nested tags, and split them across the people who shared the cost. Encrypted in your browser. Not a budgeting app."
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1 pt-16">{children}</main>
            <Footer />
        </div>
    );
}
