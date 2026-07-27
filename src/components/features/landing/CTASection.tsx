"use client";

/**
 * CTA Section Component
 *
 * Final call-to-action section encouraging users to get started.
 */

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function CTASection() {
    return (
        <section className="py-20 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 to-cyan-600 px-6 py-24 shadow-2xl sm:px-24 xl:py-32">
                    {/* Background decoration */}
                    <div className="absolute -top-56 -left-80 -z-10 blur-3xl" aria-hidden="true">
                        <div
                            className="aspect-[1097/845] w-[68.5625rem] bg-gradient-to-tr from-white to-violet-200 opacity-20"
                            style={{
                                clipPath:
                                    "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)"
                            }}
                        />
                    </div>

                    <div className="mx-auto max-w-2xl text-center">
                        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                            Start with your last statement
                        </h2>
                        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-violet-100">
                            Create a vault, import a CSV or OFX file, and start tagging and
                            allocating. Nothing to install and no card required.
                        </p>
                        <div className="mt-10 flex items-center justify-center gap-4">
                            <Button
                                asChild
                                size="lg"
                                className="rounded-full bg-white px-8 text-violet-600 hover:bg-violet-50"
                            >
                                <Link href="/new-user">
                                    Create a vault
                                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                                </Link>
                            </Button>
                        </div>
                        <p className="mt-6 text-sm text-violet-100">
                            No email or password. You unlock with a 12-word recovery phrase or a
                            passkey.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
