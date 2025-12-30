/**
 * Skeleton Components
 *
 * Loading placeholder components for content that is being fetched.
 * Uses CSS animations for smooth loading states.
 */

import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
	/** Custom CSS classes */
	className?: string;
}

/**
 * Base skeleton component with pulsing animation
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
	return (
		<div
			className={cn("animate-pulse rounded-md bg-muted", className)}
			role="status"
			aria-label="Loading..."
			{...props}
		/>
	);
}

/**
 * Text skeleton - mimics text content
 */
export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
	return (
		<div className={cn("space-y-2", className)}>
			{Array.from({ length: lines }).map((_, i) => (
				<Skeleton
					key={i}
					className={cn(
						"h-4",
						// Last line is shorter for natural text appearance
						i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
					)}
				/>
			))}
		</div>
	);
}

/**
 * Avatar skeleton - circular placeholder
 */
export function SkeletonAvatar({
	size = "md",
	className,
}: {
	size?: "sm" | "md" | "lg";
	className?: string;
}) {
	const sizeClasses = {
		sm: "h-8 w-8",
		md: "h-10 w-10",
		lg: "h-12 w-12",
	};

	return <Skeleton className={cn("rounded-full", sizeClasses[size], className)} />;
}

/**
 * Card skeleton - placeholder for card content
 */
export function SkeletonCard({ className }: { className?: string }) {
	return (
		<div className={cn("rounded-lg border bg-card p-6", className)}>
			<div className="space-y-4">
				<Skeleton className="h-6 w-1/3" />
				<SkeletonText lines={3} />
			</div>
		</div>
	);
}

/**
 * Table row skeleton - placeholder for table data
 */
export function SkeletonTableRow({
	columns = 5,
	className,
}: {
	columns?: number;
	className?: string;
}) {
	return (
		<div className={cn("flex items-center gap-4 px-4 py-3", className)}>
			{Array.from({ length: columns }).map((_, i) => (
				<Skeleton
					key={i}
					className={cn(
						"h-4",
						// Vary widths for natural appearance
						i === 0 ? "w-8" : i === 1 ? "w-24" : i === columns - 1 ? "w-20" : "flex-1"
					)}
				/>
			))}
		</div>
	);
}

/**
 * Transaction table skeleton - full loading state for transactions page
 */
export function TransactionTableSkeleton({ rows = 10 }: { rows?: number }) {
	return (
		<div className="flex h-full flex-col">
			{/* Header skeleton */}
			<div className="flex items-center gap-4 border-b bg-muted/50 px-4 py-2">
				<Skeleton className="h-4 w-8" />
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-4 flex-1" />
				<Skeleton className="h-4 w-32" />
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-4 w-28" />
				<Skeleton className="h-4 w-28" />
			</div>
			{/* Row skeletons */}
			<div className="flex-1 space-y-1 py-2">
				{Array.from({ length: rows }).map((_, i) => (
					<SkeletonTableRow key={i} columns={7} />
				))}
			</div>
		</div>
	);
}

/**
 * Accounts page skeleton
 */
export function AccountsPageSkeleton({ rows = 5 }: { rows?: number }) {
	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<Skeleton className="h-8 w-32" />
				<Skeleton className="h-10 w-32" />
			</div>
			{/* Table */}
			<div className="rounded-lg border">
				<div className="flex items-center gap-4 border-b bg-muted/50 px-4 py-2">
					<Skeleton className="h-4 w-40" />
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-4 w-24" />
				</div>
				{Array.from({ length: rows }).map((_, i) => (
					<div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-0">
						<Skeleton className="h-4 w-40" />
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-4 w-24" />
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * People page skeleton
 */
export function PeoplePageSkeleton({ rows = 4 }: { rows?: number }) {
	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<Skeleton className="h-8 w-24" />
				<Skeleton className="h-10 w-36" />
			</div>
			{/* Balance summary skeleton */}
			<SkeletonCard />
			{/* Table */}
			<div className="rounded-lg border">
				<div className="flex items-center gap-4 border-b bg-muted/50 px-4 py-2">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-4 w-32" />
				</div>
				{Array.from({ length: rows }).map((_, i) => (
					<div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-0">
						<div className="flex items-center gap-3">
							<SkeletonAvatar size="sm" />
							<Skeleton className="h-4 w-32" />
						</div>
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-32" />
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * Tags page skeleton
 */
export function TagsPageSkeleton({ rows = 8 }: { rows?: number }) {
	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<Skeleton className="h-8 w-20" />
				<Skeleton className="h-10 w-28" />
			</div>
			{/* Tag tree skeleton with indentation */}
			<div className="space-y-2">
				{Array.from({ length: rows }).map((_, i) => {
					// Alternate between root and child for visual hierarchy
					const isChild = i % 3 !== 0;
					return (
						<div key={i} className={cn("flex items-center gap-3", isChild && "ml-6")}>
							<Skeleton className="h-4 w-4" />
							<Skeleton className={cn("h-6", isChild ? "w-24" : "w-32")} />
							{!isChild && <Skeleton className="h-4 w-16" />}
						</div>
					);
				})}
			</div>
		</div>
	);
}

/**
 * Imports page skeleton
 */
export function ImportsPageSkeleton({ rows = 5 }: { rows?: number }) {
	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<Skeleton className="h-8 w-28" />
				<Skeleton className="h-10 w-36" />
			</div>
			{/* Import list */}
			<div className="rounded-lg border">
				{Array.from({ length: rows }).map((_, i) => (
					<div
						key={i}
						className="flex items-center justify-between border-b px-4 py-4 last:border-0"
					>
						<div className="flex items-center gap-4">
							<Skeleton className="h-10 w-10 rounded" />
							<div className="space-y-1">
								<Skeleton className="h-4 w-48" />
								<Skeleton className="h-3 w-32" />
							</div>
						</div>
						<div className="flex items-center gap-4">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-8 w-8 rounded" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * Automations page skeleton
 */
export function AutomationsPageSkeleton({ rows = 4 }: { rows?: number }) {
	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<Skeleton className="h-8 w-36" />
				<Skeleton className="h-10 w-32" />
			</div>
			{/* Automation cards */}
			<div className="space-y-4">
				{Array.from({ length: rows }).map((_, i) => (
					<div key={i} className="rounded-lg border p-4">
						<div className="flex items-start justify-between">
							<div className="space-y-3">
								<Skeleton className="h-5 w-40" />
								<div className="space-y-2">
									<div className="flex items-center gap-2">
										<Skeleton className="h-4 w-12" />
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-4 w-16" />
										<Skeleton className="h-4 w-32" />
									</div>
								</div>
								<div className="flex items-center gap-2">
									<Skeleton className="h-4 w-10" />
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-6 w-24 rounded-full" />
								</div>
							</div>
							<div className="flex items-center gap-2">
								<Skeleton className="h-8 w-8 rounded" />
								<Skeleton className="h-8 w-8 rounded" />
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * Statuses page skeleton
 */
export function StatusesPageSkeleton({ rows = 4 }: { rows?: number }) {
	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<Skeleton className="h-8 w-28" />
				<Skeleton className="h-10 w-32" />
			</div>
			{/* Status list */}
			<div className="rounded-lg border">
				{Array.from({ length: rows }).map((_, i) => (
					<div
						key={i}
						className="flex items-center justify-between border-b px-4 py-3 last:border-0"
					>
						<div className="flex items-center gap-3">
							<Skeleton className="h-4 w-4 rounded-full" />
							<Skeleton className="h-4 w-32" />
						</div>
						<div className="flex items-center gap-3">
							<Skeleton className="h-6 w-24 rounded-full" />
							<Skeleton className="h-8 w-8 rounded" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * Dashboard skeleton
 */
export function DashboardSkeleton() {
	return (
		<div className="space-y-6">
			{/* Summary cards */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="rounded-lg border bg-card p-6">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="mt-2 h-8 w-32" />
						<Skeleton className="mt-2 h-3 w-20" />
					</div>
				))}
			</div>
			{/* Chart placeholder */}
			<div className="rounded-lg border bg-card p-6">
				<Skeleton className="h-6 w-40" />
				<Skeleton className="mt-4 h-64 w-full" />
			</div>
			{/* Recent transactions */}
			<div className="rounded-lg border bg-card p-6">
				<Skeleton className="h-6 w-48" />
				<div className="mt-4 space-y-3">
					{Array.from({ length: 5 }).map((_, i) => (
						<SkeletonTableRow key={i} columns={4} />
					))}
				</div>
			</div>
		</div>
	);
}

/**
 * Full page loading skeleton
 */
export function PageSkeleton({
	type = "default",
}: {
	type?:
		| "default"
		| "transactions"
		| "accounts"
		| "people"
		| "tags"
		| "imports"
		| "automations"
		| "statuses"
		| "dashboard";
}) {
	switch (type) {
		case "transactions":
			return <TransactionTableSkeleton />;
		case "accounts":
			return <AccountsPageSkeleton />;
		case "people":
			return <PeoplePageSkeleton />;
		case "tags":
			return <TagsPageSkeleton />;
		case "imports":
			return <ImportsPageSkeleton />;
		case "automations":
			return <AutomationsPageSkeleton />;
		case "statuses":
			return <StatusesPageSkeleton />;
		case "dashboard":
			return <DashboardSkeleton />;
		default:
			return (
				<div className="space-y-4">
					<Skeleton className="h-8 w-48" />
					<SkeletonText lines={3} />
					<SkeletonCard />
				</div>
			);
	}
}
