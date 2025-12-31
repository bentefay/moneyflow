/**
 * Security Section Component
 *
 * Explains the security model and privacy guarantees of MoneyFlow.
 */

import { CheckCircle2, Eye, Key, Lock, Server, Shield } from "lucide-react";

const securityFeatures = [
	{
		title: "End-to-End Encryption",
		description:
			"Your data is encrypted with XChaCha20-Poly1305 before leaving your device. Only people with the vault key can decrypt it.",
		icon: Lock,
	},
	{
		title: "Zero-Knowledge Architecture",
		description:
			"Our servers only see encrypted blobs. We literally cannot read your financial data, even if compelled by law.",
		icon: Eye,
	},
	{
		title: "No Account Required",
		description:
			"Your 12-word seed phrase is your identity. No email, no password, no personal information stored.",
		icon: Key,
	},
	{
		title: "Local-First Storage",
		description:
			"Your data lives on your device first. The cloud is just for sync—you're never locked out.",
		icon: Server,
	},
];

const cryptoDetails = [
	"Ed25519 signatures for identity",
	"X25519 key exchange for sharing",
	"XChaCha20-Poly1305 encryption",
	"BLAKE2b for key derivation",
	"BIP-39 seed phrase standard",
	"CRDT for conflict-free sync",
];

export function SecuritySection() {
	return (
		<section id="security" className="bg-zinc-50 py-20 sm:py-32 dark:bg-zinc-900/50">
			<div className="mx-auto max-w-7xl px-6 lg:px-8">
				{/* Section Header */}
				<div className="mx-auto max-w-2xl text-center">
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
						<Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
					</div>
					<h2 className="font-bold text-3xl text-zinc-900 tracking-tight sm:text-4xl dark:text-white">
						Built on proven cryptography
					</h2>
					<p className="mt-6 text-lg text-zinc-600 leading-8 dark:text-zinc-400">
						We don't invent our own crypto. MoneyFlow uses the same battle-tested algorithms that
						protect your cryptocurrency and secure messaging apps.
					</p>
				</div>

				{/* Security Features */}
				<div className="mx-auto mt-16 max-w-5xl">
					<div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
						{securityFeatures.map((feature) => (
							<div
								key={feature.title}
								className="rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900"
							>
								<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
									<feature.icon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
								</div>
								<h3 className="mt-4 font-semibold text-lg text-zinc-900 dark:text-white">
									{feature.title}
								</h3>
								<p className="mt-2 text-zinc-600 dark:text-zinc-400">{feature.description}</p>
							</div>
						))}
					</div>
				</div>

				{/* Crypto Details */}
				<div className="mx-auto mt-16 max-w-3xl">
					<div className="rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
						<h3 className="text-center font-semibold text-lg text-zinc-900 dark:text-white">
							Our cryptographic stack
						</h3>
						<div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
							{cryptoDetails.map((detail) => (
								<div key={detail} className="flex items-center gap-2">
									<CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
									<span className="text-sm text-zinc-600 dark:text-zinc-400">{detail}</span>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Open Source Badge */}
				<div className="mt-12 text-center">
					<p className="text-sm text-zinc-500 dark:text-zinc-500">
						All encryption code is open source and auditable.{" "}
						<a
							href="https://github.com/benallfree/moneyflow"
							target="_blank"
							rel="noopener noreferrer"
							className="font-medium text-violet-600 hover:text-violet-500 dark:text-violet-400 dark:hover:text-violet-300"
						>
							View on GitHub →
						</a>
					</p>
				</div>
			</div>
		</section>
	);
}
