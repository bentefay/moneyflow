/**
 * Marketing Landing Page
 *
 * The main landing page for MoneyFlow, showcasing features,
 * security, and encouraging visitors to get started.
 */

import {
	CTASection,
	FeaturesSection,
	HeroSection,
	SecuritySection,
} from "@/components/features/landing";

export default function LandingPage() {
	return (
		<>
			<HeroSection />
			<FeaturesSection />
			<SecuritySection />
			<CTASection />
		</>
	);
}
