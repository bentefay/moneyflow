"use client";

/**
 * Hero Section Component
 *
 * The main hero section for the landing page with headline,
 * subheadline, and call-to-action buttons.
 */

import { FileUp, Lock, Users } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * The three steps a real user actually takes, in order. This stands in for a product screenshot:
 * a truthful description of the flow is more useful than a placeholder that shows nothing.
 */
const howItWorks = [
    {
        step: "1",
        title: "Import a statement",
        detail: "Drop in a CSV or OFX file. Columns are mapped for you and duplicates are flagged."
    },
    {
        step: "2",
        title: "Tag and allocate",
        detail: "Sort transactions with nested tags and split them across the people in your vault."
    },
    {
        step: "3",
        title: "Let it repeat itself",
        detail: "Save that as a rule and the next import arrives already tagged and allocated."
    }
];

export function HeroSection() {
    return (
        <section className="relative overflow-hidden py-20 sm:py-32">
            {/* Background gradient */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-cyan-50 dark:from-violet-950/20 dark:via-zinc-950 dark:to-cyan-950/20" />
                <div
                    className="absolute top-0 left-1/2 -z-10 -translate-x-1/2 blur-3xl"
                    aria-hidden="true"
                >
                    <div
                        className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-violet-500 to-cyan-500 opacity-20 dark:opacity-10"
                        style={{
                            clipPath:
                                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)"
                        }}
                    />
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-3xl text-center">
                    {/* Badge */}
                    <div className="mb-8 flex justify-center">
                        <div className="rounded-full bg-violet-100 px-4 py-1.5 text-sm font-medium text-violet-700 ring-1 ring-violet-200 ring-inset dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-800">
                            Encrypted in your browser before it is stored
                        </div>
                    </div>

                    {/* Headline */}
                    <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-6xl dark:text-white">
                        Categorise and allocate{" "}
                        <span className="bg-gradient-to-r from-violet-600 to-cyan-600 bg-clip-text text-transparent">
                            shared money
                        </span>
                    </h1>

                    {/* Subheadline */}
                    <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
                        MoneyFlow imports your CSV and OFX statements, sorts transactions into tags,
                        and splits them across the people who shared the cost. Several people can
                        work in the same vault at once. It is not a budgeting app — there are no
                        limits to set and no spending targets to miss.
                    </p>

                    {/* CTA Buttons */}
                    <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <Button asChild size="lg" className="rounded-full px-8">
                            <Link href="/new-user">Create a vault</Link>
                        </Button>
                        <Button asChild variant="outline" size="lg" className="rounded-full px-8">
                            <Link href="#features">See what it does</Link>
                        </Button>
                    </div>

                    {/* Trust indicators */}
                    <div className="mt-12 flex flex-col items-center justify-center gap-4 text-sm text-zinc-600 sm:flex-row sm:gap-8 dark:text-zinc-400">
                        <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4 text-green-600 dark:text-green-500" />
                            <span>Encrypted on your device</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <FileUp className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                            <span>CSV and OFX import</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                            <span>Real-time collaboration</span>
                        </div>
                    </div>
                </div>

                {/* How it works */}
                <div className="mt-16 sm:mt-24">
                    <div className="relative mx-auto max-w-5xl">
                        <div className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-violet-500/20 to-cyan-500/20 blur-xl" />
                        <div className="relative rounded-xl border border-zinc-200 bg-white/80 p-8 shadow-2xl backdrop-blur sm:p-10 dark:border-zinc-800 dark:bg-zinc-900/80">
                            <h2 className="text-center text-lg font-semibold text-zinc-900 dark:text-white">
                                How it works
                            </h2>
                            <ol className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
                                {howItWorks.map((item) => (
                                    <li key={item.step}>
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                                            {item.step}
                                        </div>
                                        <h3 className="mt-4 font-semibold text-zinc-900 dark:text-white">
                                            {item.title}
                                        </h3>
                                        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                                            {item.detail}
                                        </p>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
