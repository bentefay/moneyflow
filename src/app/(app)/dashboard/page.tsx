/**
 * Dashboard Page
 *
 * Redirects to Transactions page - Dashboard is currently a placeholder.
 * This redirect ensures direct URL access to /dashboard lands on /transactions.
 */

import { redirect } from "next/navigation";

export default function DashboardPage() {
	redirect("/transactions");
}
