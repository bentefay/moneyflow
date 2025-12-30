/**
 * Features Section Component
 *
 * Displays the key features of MoneyFlow in a grid layout.
 */

import {
	BarChart3,
	Lock,
	PiggyBank,
	RefreshCw,
	Shield,
	Smartphone,
	Users,
	Zap,
} from "lucide-react";

const features = [
	{
		name: "Zero-Knowledge Privacy",
		description:
			"Your financial data is encrypted before it ever leaves your device. We can't see it, hackers can't steal it.",
		icon: Shield,
		color: "text-violet-600 dark:text-violet-400",
		bgColor: "bg-violet-100 dark:bg-violet-900/30",
	},
	{
		name: "Household Collaboration",
		description:
			"Share a vault with your partner or family. Everyone sees updates in real-time, with automatic conflict resolution.",
		icon: Users,
		color: "text-cyan-600 dark:text-cyan-400",
		bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
	},
	{
		name: "Offline-First",
		description:
			"Works without internet. Make changes offline, and everything syncs automatically when you're back online.",
		icon: Zap,
		color: "text-amber-600 dark:text-amber-400",
		bgColor: "bg-amber-100 dark:bg-amber-900/30",
	},
	{
		name: "Seed Phrase Security",
		description:
			"No passwords to remember or reset. Your 12-word seed phrase is the only key to your data.",
		icon: Lock,
		color: "text-green-600 dark:text-green-400",
		bgColor: "bg-green-100 dark:bg-green-900/30",
	},
	{
		name: "Real-Time Sync",
		description:
			"See changes instantly as your household members add transactions. Powered by conflict-free replicated data types.",
		icon: RefreshCw,
		color: "text-blue-600 dark:text-blue-400",
		bgColor: "bg-blue-100 dark:bg-blue-900/30",
	},
	{
		name: "Works Everywhere",
		description:
			"Access from any device with a web browser. No app downloads required. Your data follows you.",
		icon: Smartphone,
		color: "text-rose-600 dark:text-rose-400",
		bgColor: "bg-rose-100 dark:bg-rose-900/30",
	},
	{
		name: "Smart Budgeting",
		description:
			"Set budgets for categories and track spending. Get gentle nudges when you're approaching limits.",
		icon: PiggyBank,
		color: "text-emerald-600 dark:text-emerald-400",
		bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
	},
	{
		name: "Spending Insights",
		description:
			"Understand where your money goes with clear visualizations. No AI analyzing your data—just local charts.",
		icon: BarChart3,
		color: "text-orange-600 dark:text-orange-400",
		bgColor: "bg-orange-100 dark:bg-orange-900/30",
	},
];

export function FeaturesSection() {
	return (
		<section id="features" className="py-20 sm:py-32">
			<div className="mx-auto max-w-7xl px-6 lg:px-8">
				{/* Section Header */}
				<div className="mx-auto max-w-2xl text-center">
					<h2 className="font-semibold text-base text-violet-600 leading-7 dark:text-violet-400">
						Everything you need
					</h2>
					<p className="mt-2 font-bold text-3xl text-zinc-900 tracking-tight sm:text-4xl dark:text-white">
						Privacy meets simplicity
					</p>
					<p className="mt-6 text-lg text-zinc-600 leading-8 dark:text-zinc-400">
						MoneyFlow combines military-grade encryption with an intuitive interface. Track
						expenses, share with family, and stay in control—all without sacrificing privacy.
					</p>
				</div>

				{/* Features Grid */}
				<div className="mx-auto mt-16 max-w-5xl sm:mt-20 lg:mt-24">
					<dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
						{features.map((feature) => (
							<div key={feature.name} className="relative pl-16">
								<dt className="font-semibold text-base text-zinc-900 leading-7 dark:text-white">
									<div
										className={`absolute top-0 left-0 flex h-10 w-10 items-center justify-center rounded-lg ${feature.bgColor}`}
									>
										<feature.icon className={`h-6 w-6 ${feature.color}`} aria-hidden="true" />
									</div>
									{feature.name}
								</dt>
								<dd className="mt-2 text-base text-zinc-600 leading-7 dark:text-zinc-400">
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
