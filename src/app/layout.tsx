import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TRPCProvider } from "@/components/providers/trpc-provider";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "MoneyFlow",
	description:
		"Track shared household expenses with real-time collaboration and end-to-end encryption.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background antialiased`}
			>
				<TRPCProvider>
					<ToastProvider>{children}</ToastProvider>
				</TRPCProvider>
			</body>
		</html>
	);
}
