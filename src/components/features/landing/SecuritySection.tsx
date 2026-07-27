/**
 * Security Section Component
 *
 * Explains the security model and privacy properties of MoneyFlow.
 *
 * Wording here is deliberately literal and states the limits of the model as plainly as its
 * strengths. Primitive names match the actual calls in src/lib/crypto, not the labels in the
 * surrounding comments.
 */

import { CheckCircle2, Key, Lock, Server, Shield, Users } from "lucide-react";

const securityFeatures = [
    {
        title: "Encrypted before it is stored",
        description:
            "Your transactions are encrypted in your browser. What gets uploaded is a blob the server has no key for, so nobody operating it can read what you spent.",
        icon: Lock
    },
    {
        title: "What the server can still see",
        description:
            "It sees who shares a vault with whom, who made each change and when, and how much data changed. It cannot see amounts, descriptions, tags or allocations.",
        icon: Server
    },
    {
        title: "No email, no password",
        description:
            "A 12-word recovery phrase derives your keys, and you can add a passkey to unlock on a device you have. There is no password to reset and no account to recover.",
        icon: Key
    },
    {
        title: "Shared without sharing keys",
        description:
            "Inviting someone wraps the vault key to their key. The invite secret stays in the link fragment and never reaches the server. Remove a member and the vault is re-keyed.",
        icon: Users
    }
];

const cryptoDetails = [
    "Ed25519 signatures for identity",
    "X25519 key exchange for sharing",
    "XSalsa20-Poly1305 encryption",
    "HKDF-SHA256 for key derivation",
    "BLAKE2b for identity hashing",
    "BIP-39 recovery phrases",
    "WebAuthn PRF for passkeys",
    "CRDT for conflict-free sync"
];

export function SecuritySection() {
    return (
        <section id="security" className="bg-zinc-50 py-20 sm:py-32 dark:bg-zinc-900/50">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                {/* Section Header */}
                <div className="mx-auto max-w-2xl text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                        <Shield
                            className="h-6 w-6 text-green-600 dark:text-green-400"
                            aria-hidden="true"
                        />
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
                        How your data is protected
                    </h2>
                    <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
                        MoneyFlow does not invent its own cryptography — it uses standard, widely
                        reviewed primitives. Below is what that does and does not protect.
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
                                    <feature.icon
                                        className="h-5 w-5 text-violet-600 dark:text-violet-400"
                                        aria-hidden="true"
                                    />
                                </div>
                                <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-white">
                                    {feature.title}
                                </h3>
                                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Crypto Details */}
                <div className="mx-auto mt-16 max-w-3xl">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
                        <h3 className="text-center text-lg font-semibold text-zinc-900 dark:text-white">
                            The primitives in use
                        </h3>
                        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {cryptoDetails.map((detail) => (
                                <li key={detail} className="flex items-center gap-2">
                                    <CheckCircle2
                                        className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-500"
                                        aria-hidden="true"
                                    />
                                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                        {detail}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Recovery caveat */}
                <div className="mx-auto mt-12 max-w-3xl">
                    <p className="text-center text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                        Holding the only key cuts both ways. If you lose your recovery phrase and
                        every device with a passkey, your data cannot be recovered — not by you and
                        not by us.
                    </p>
                </div>
            </div>
        </section>
    );
}
