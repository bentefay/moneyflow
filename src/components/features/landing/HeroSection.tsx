"use client";

/**
 * Hero Section Component
 *
 * The main hero section for the landing page with headline,
 * subheadline, and call-to-action buttons.
 */

import { Shield, Users, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HeroSection() {
	return (
		<section className="relative overflow-hidden py-20 sm:py-32">
			{/* Background gradient */}
			<div className="absolute inset-0 -z-10">
				<div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-cyan-50 dark:from-violet-950/20 dark:via-zinc-950 dark:to-cyan-950/20" />
				<div className="absolute top-0 left-1/2 -z-10 -translate-x-1/2 blur-3xl" aria-hidden="true">
					<div
						className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-violet-500 to-cyan-500 opacity-20 dark:opacity-10"
						style={{
							clipPath:
								"polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
						}}
					/>
				</div>
			</div>

			<div className="mx-auto max-w-7xl px-6 lg:px-8">
				<div className="mx-auto max-w-3xl text-center">
					{/* Badge */}
					<div className="mb-8 flex justify-center">
						<div className="rounded-full bg-violet-100 px-4 py-1.5 font-medium text-sm text-violet-700 ring-1 ring-violet-200 ring-inset dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-800">
							🔐 Zero-Knowledge • 100% Private
						</div>
					</div>

					{/* Headline */}
					<h1 className="font-bold text-4xl text-zinc-900 tracking-tight sm:text-6xl dark:text-white">
						Household finances,{" "}
						<span className="bg-gradient-to-r from-violet-600 to-cyan-600 bg-clip-text text-transparent">
							truly private
						</span>
					</h1>

					{/* Subheadline */}
					<p className="mt-6 text-lg text-zinc-600 leading-8 dark:text-zinc-400">
						Track expenses together without trusting anyone with your data. MoneyFlow uses
						end-to-end encryption so only your household sees your finances. No accounts. No cloud
						access. Just you and your data.
					</p>

					{/* CTA Buttons */}
					<div className="mt-10 flex items-center justify-center gap-4">
						<Button asChild size="lg" className="rounded-full px-8">
							<Link href="/new-user">Get Started</Link>
						</Button>
						<Button asChild variant="outline" size="lg" className="rounded-full px-8">
							<Link href="#features">Learn More</Link>
						</Button>
					</div>

					{/* Trust indicators */}
					<div className="mt-12 flex items-center justify-center gap-8 text-sm text-zinc-500 dark:text-zinc-500">
						<div className="flex items-center gap-2">
							<Shield className="h-4 w-4 text-green-500" />
							<span>End-to-end encrypted</span>
						</div>
						<div className="flex items-center gap-2">
							<Zap className="h-4 w-4 text-amber-500" />
							<span>Offline-first</span>
						</div>
						<div className="flex items-center gap-2">
							<Users className="h-4 w-4 text-violet-500" />
							<span>Real-time sync</span>
						</div>
					</div>
				</div>

				{/* Hero Image/Demo */}
				<div className="mt-16 sm:mt-24">
					<div className="relative mx-auto max-w-5xl">
						<div className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-violet-500/20 to-cyan-500/20 blur-xl" />
						<div className="relative rounded-xl border border-zinc-200 bg-white/80 p-2 shadow-2xl backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
							<div className="aspect-[16/9] rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900">
								{/* Placeholder for app screenshot/demo */}
								<div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-600">
									<div className="text-center">
										<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
											<Shield className="h-8 w-8 text-violet-600 dark:text-violet-400" />
										</div>
										<p className="font-medium text-lg">Your data stays yours</p>
										<p className="mt-1 text-sm">Encrypted locally, synced securely</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
