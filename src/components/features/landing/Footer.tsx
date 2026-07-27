/**
 * Landing Page Footer Component
 *
 * Footer with navigation links and copyright.
 *
 * Only destinations that exist are linked. Placeholder links are left out rather than pointed at
 * "#", which reads as a working link to both pointer and keyboard users.
 */

import Link from "next/link";

const footerLinks = {
    product: [
        { name: "What it does", href: "#features" },
        { name: "How your data is protected", href: "#security" }
    ],
    getStarted: [
        { name: "Create a vault", href: "/new-user" },
        { name: "Unlock your vault", href: "/unlock" }
    ]
};

export function Footer() {
    return (
        <footer className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
                <h2 className="sr-only">Site footer</h2>
                <div className="xl:grid xl:grid-cols-3 xl:gap-8">
                    {/* Brand */}
                    <div className="space-y-4">
                        <Link href="/" className="flex items-center gap-2">
                            <div
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-600"
                                aria-hidden="true"
                            >
                                <span className="text-sm font-bold text-white">M</span>
                            </div>
                            <span className="text-lg font-semibold text-zinc-900 dark:text-white">
                                MoneyFlow
                            </span>
                        </Link>
                        <p className="max-w-sm text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                            Private categorising and allocating of shared transactions. Encrypted on
                            your device before it is stored.
                        </p>
                    </div>

                    {/* Links */}
                    <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
                        <div>
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                                Product
                            </h3>
                            <ul className="mt-4 space-y-3">
                                {footerLinks.product.map((item) => (
                                    <li key={item.name}>
                                        <Link
                                            href={item.href}
                                            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                                        >
                                            {item.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                                Get started
                            </h3>
                            <ul className="mt-4 space-y-3">
                                {footerLinks.getStarted.map((item) => (
                                    <li key={item.name}>
                                        <Link
                                            href={item.href}
                                            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                                        >
                                            {item.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Copyright */}
                <div className="mt-12 border-t border-zinc-200 pt-8 dark:border-zinc-800">
                    <p className="text-center text-xs text-zinc-600 dark:text-zinc-400">
                        &copy; {new Date().getFullYear()} MoneyFlow
                    </p>
                </div>
            </div>
        </footer>
    );
}
