/**
 * Landing Page Footer Component
 *
 * Footer with links, social links, and copyright.
 */

import Link from "next/link";

function GithubIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
            />
        </svg>
    );
}

const footerLinks = {
    product: [
        { name: "Features", href: "#features" },
        { name: "Security", href: "#security" },
        { name: "Get Started", href: "/new-user" },
        { name: "Unlock", href: "/unlock" }
    ],
    resources: [
        { name: "Documentation", href: "#" },
        { name: "Privacy Policy", href: "#" },
        { name: "Terms of Service", href: "#" }
    ],
    community: [
        { name: "GitHub", href: "https://github.com/benallfree/moneyflow", external: true },
        { name: "Discord", href: "#", external: true },
        { name: "Twitter", href: "#", external: true }
    ]
};

export function Footer() {
    return (
        <footer className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
                <div className="xl:grid xl:grid-cols-3 xl:gap-8">
                    {/* Brand */}
                    <div className="space-y-4">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-600">
                                <span className="text-sm font-bold text-white">M</span>
                            </div>
                            <span className="text-lg font-semibold text-zinc-900 dark:text-white">
                                MoneyFlow
                            </span>
                        </Link>
                        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                            Private, collaborative household finance tracking. Your data never
                            leaves your control.
                        </p>
                        <div className="flex space-x-4">
                            <a
                                href="https://github.com/benallfree/moneyflow"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-zinc-400 hover:text-zinc-500 dark:hover:text-zinc-300"
                            >
                                <span className="sr-only">GitHub</span>
                                <GithubIcon className="h-6 w-6" />
                            </a>
                        </div>
                    </div>

                    {/* Links */}
                    <div className="mt-16 grid grid-cols-3 gap-8 xl:col-span-2 xl:mt-0">
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
                                Resources
                            </h3>
                            <ul className="mt-4 space-y-3">
                                {footerLinks.resources.map((item) => (
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
                                Community
                            </h3>
                            <ul className="mt-4 space-y-3">
                                {footerLinks.community.map((item) => (
                                    <li key={item.name}>
                                        <a
                                            href={item.href}
                                            target={item.external ? "_blank" : undefined}
                                            rel={item.external ? "noopener noreferrer" : undefined}
                                            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                                        >
                                            {item.name}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Copyright */}
                <div className="mt-12 border-t border-zinc-200 pt-8 dark:border-zinc-800">
                    <p className="text-center text-xs text-zinc-500 dark:text-zinc-500">
                        &copy; {new Date().getFullYear()} MoneyFlow. Open source under MIT license.
                    </p>
                </div>
            </div>
        </footer>
    );
}
