/**
 * Dashboard Page
 *
 * Main dashboard showing settlement balances and recent activity.
 */

export default function DashboardPage() {
	return (
		<div className="flex h-full flex-col">
			{/* Page header */}
			<div className="border-b px-6 py-4">
				<h1 className="font-semibold text-2xl">Dashboard</h1>
				<p className="mt-1 text-muted-foreground text-sm">Overview of your household finances.</p>
			</div>

			{/* Dashboard content */}
			<div className="flex-1 overflow-auto p-6">
				{/* Placeholder - will be implemented in user stories */}
				<div className="rounded-lg border p-8 text-center text-muted-foreground">
					<p>Dashboard will be implemented in US-010</p>
				</div>
			</div>
		</div>
	);
}
