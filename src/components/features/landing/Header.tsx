"use client";

/**
 * Landing Page Header Component
 *
 * Navigation header with logo and action buttons.
 */

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navigation = [
	{ name: "Features", href: "#features" },
	{ name: "Security", href: "#security" },
	{ name: "Open Source", href: "https://github.com/bentefay/moneyflow", external: true },
];

export function Header() {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	return (
		<header className="fixed inset-x-0 top-0 z-50 bg-white/80 backdrop-blur-md">
			<div className="mx-auto max-w-7xl px-6 lg:px-8">
				<nav className="flex h-16 items-center justify-between" aria-label="Global">
					{/* Logo */}
					<div className="flex lg:flex-1">
						<Link href="/" className="-m-1.5 p-1.5">
							<span className="sr-only">MoneyFlow</span>
							<div className="flex items-center gap-2">
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-600">
									<span className="font-bold text-sm text-white">M</span>
								</div>
								<span className="font-semibold text-lg text-zinc-900 dark:text-white">
									MoneyFlow
								</span>
							</div>
						</Link>
					</div>

					{/* Mobile menu button */}
					<div className="flex lg:hidden">
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="-m-2.5"
							onClick={() => setMobileMenuOpen(true)}
						>
							<span className="sr-only">Open main menu</span>
							<Menu className="h-6 w-6" aria-hidden="true" />
						</Button>
					</div>

					{/* Desktop navigation */}
					<div className="hidden lg:flex lg:gap-x-8">
						{navigation.map((item) => (
							<a
								key={item.name}
								href={item.href}
								target={item.external ? "_blank" : undefined}
								rel={item.external ? "noopener noreferrer" : undefined}
								className="font-medium text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
							>
								{item.name}
							</a>
						))}
					</div>

					{/* Desktop CTA buttons */}
					<div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4">
						<Button asChild variant="ghost" size="sm">
							<Link href="/unlock">Unlock</Link>
						</Button>
						<Button asChild size="sm" className="rounded-full">
							<Link href="/new-user">Get Started</Link>
						</Button>
					</div>
				</nav>
			</div>

			{/* Mobile menu */}
			{mobileMenuOpen && (
				<div className="lg:hidden">
					<div className="fixed inset-0 z-50" />
					<div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-zinc-900/10 dark:bg-zinc-900 dark:sm:ring-zinc-800">
						<div className="flex items-center justify-between">
							<Link href="/" className="-m-1.5 p-1.5">
								<span className="sr-only">MoneyFlow</span>
								<div className="flex items-center gap-2">
									<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-600">
										<span className="font-bold text-sm text-white">M</span>
									</div>
									<span className="font-semibold text-lg text-zinc-900 dark:text-white">
										MoneyFlow
									</span>
								</div>
							</Link>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="-m-2.5"
								onClick={() => setMobileMenuOpen(false)}
							>
								<span className="sr-only">Close menu</span>
								<X className="h-6 w-6" aria-hidden="true" />
							</Button>
						</div>
						<div className="mt-6 flow-root">
							<div className="-my-6 divide-y divide-zinc-500/10 dark:divide-zinc-800">
								<div className="space-y-2 py-6">
									{navigation.map((item) => (
										<a
											key={item.name}
											href={item.href}
											target={item.external ? "_blank" : undefined}
											rel={item.external ? "noopener noreferrer" : undefined}
											className="-mx-3 block rounded-lg px-3 py-2 font-medium text-base text-zinc-900 hover:bg-zinc-50 dark:text-white dark:hover:bg-zinc-800"
											onClick={() => setMobileMenuOpen(false)}
										>
											{item.name}
										</a>
									))}
								</div>
								<div className="space-y-2 py-6">
									<Link
										href="/unlock"
										className="-mx-3 block rounded-lg px-3 py-2.5 font-medium text-base text-zinc-900 hover:bg-zinc-50 dark:text-white dark:hover:bg-zinc-800"
										onClick={() => setMobileMenuOpen(false)}
									>
										Unlock
									</Link>
									<Link
										href="/new-user"
										className="-mx-3 block rounded-lg bg-violet-600 px-3 py-2.5 text-center font-medium text-base text-white hover:bg-violet-500"
										onClick={() => setMobileMenuOpen(false)}
									>
										Get Started
									</Link>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</header>
	);
}
