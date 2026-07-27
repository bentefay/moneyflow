/**
 * Features Section Component
 *
 * Displays the key features of MoneyFlow in a grid layout.
 *
 * Every entry here must map to a capability a user can reach today. Nothing is listed ahead of
 * shipping it.
 */

import {
    FileUp,
    Lock,
    RefreshCw,
    Smartphone,
    SplitSquareHorizontal,
    Tags,
    Users,
    Wand2
} from "lucide-react";

const features = [
    {
        name: "CSV and OFX import",
        description:
            "Load statements as CSV or OFX. The format is detected for you, columns are mapped, and rows that look like ones you already have are flagged before anything is added.",
        icon: FileUp,
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-100 dark:bg-amber-900/30"
    },
    {
        name: "Nested tags",
        description:
            "Sort transactions with tags that nest, so you can keep a broad category and its detail at the same time. Edit one transaction inline or a whole selection at once.",
        icon: Tags,
        color: "text-violet-600 dark:text-violet-400",
        bgColor: "bg-violet-100 dark:bg-violet-900/30"
    },
    {
        name: "Allocations to people",
        description:
            "Split a transaction across the people in your vault by percentage. Balances roll up into who owes whom, so you can settle up without a spreadsheet.",
        icon: SplitSquareHorizontal,
        color: "text-cyan-600 dark:text-cyan-400",
        bgColor: "bg-cyan-100 dark:bg-cyan-900/30"
    },
    {
        name: "Rules that carry forward",
        description:
            "Save the way you handled a transaction as a rule. Your tags, aliases and allocations are then applied to matching transactions as they arrive in new imports.",
        icon: Wand2,
        color: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-100 dark:bg-emerald-900/30"
    },
    {
        name: "Shared vaults",
        description:
            "Invite the people you share money with. Several of you can work in the same vault at once and see who is editing what.",
        icon: Users,
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-100 dark:bg-blue-900/30"
    },
    {
        name: "Edits merge cleanly",
        description:
            "Two people editing at the same time will not overwrite each other. Changes are merged with conflict-free replicated data types rather than last-write-wins.",
        icon: RefreshCw,
        color: "text-teal-600 dark:text-teal-400",
        bgColor: "bg-teal-100 dark:bg-teal-900/30"
    },
    {
        name: "Encrypted on your device",
        description:
            "Your transactions are encrypted in your browser before they are stored. The server keeps blobs it has no key for, so nobody there can read what you spent.",
        icon: Lock,
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-100 dark:bg-green-900/30"
    },
    {
        name: "Saves locally first",
        description:
            "Changes are written to your browser first and pushed when the network allows, so you can keep working when your connection drops. Runs in a browser, no install.",
        icon: Smartphone,
        color: "text-rose-600 dark:text-rose-400",
        bgColor: "bg-rose-100 dark:bg-rose-900/30"
    }
];

export function FeaturesSection() {
    return (
        <section id="features" className="py-20 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                {/* Section Header */}
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
                        What MoneyFlow does
                    </h2>
                    <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
                        It takes the transactions you already have and makes them legible: tagged,
                        split between the right people, and kept that way as new statements come in.
                        It does not set budgets, track you against limits, or tell you how to spend.
                    </p>
                </div>

                {/* Features Grid */}
                <div className="mx-auto mt-16 max-w-5xl sm:mt-20 lg:mt-24">
                    <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
                        {features.map((feature) => (
                            <div key={feature.name} className="relative pl-16">
                                <dt className="text-base leading-7 font-semibold text-zinc-900 dark:text-white">
                                    <div
                                        className={`absolute top-0 left-0 flex h-10 w-10 items-center justify-center rounded-lg ${feature.bgColor}`}
                                    >
                                        <feature.icon
                                            className={`h-6 w-6 ${feature.color}`}
                                            aria-hidden="true"
                                        />
                                    </div>
                                    {feature.name}
                                </dt>
                                <dd className="mt-2 text-base leading-7 text-zinc-600 dark:text-zinc-400">
                                    {feature.description}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </div>
        </section>
    );
}
