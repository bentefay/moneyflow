"use client";

/**
 * Add Transaction Row
 *
 * Empty row at the top of the transaction table for adding new transactions.
 * Provides inline form for quick transaction entry.
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface NewTransactionData {
	date: string;
	description: string;
	amount: number;
	accountId: string;
}

export interface AccountOption {
	id: string;
	name: string;
}

export interface AddTransactionRowProps {
	/** Available accounts for selection */
	availableAccounts?: AccountOption[];
	/** Callback when a new transaction is submitted */
	onAdd: (transaction: NewTransactionData) => void;
	/** Callback when the add row is focused */
	onFocus?: () => void;
	/** Default account ID to pre-select */
	defaultAccountId?: string;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Add transaction row component.
 */
export function AddTransactionRow({
	availableAccounts = [],
	onAdd,
	onFocus,
	defaultAccountId,
	className,
}: AddTransactionRowProps) {
	const [isActive, setIsActive] = useState(false);
	const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
	const [description, setDescription] = useState("");
	const [amount, setAmount] = useState("");
	const [accountId, setAccountId] = useState(defaultAccountId ?? "");

	const descriptionRef = useRef<HTMLInputElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// Set default account if provided - only runs when defaults change
	useEffect(() => {
		if (defaultAccountId && !accountId) {
			setAccountId(defaultAccountId);
		}
	}, [defaultAccountId, accountId]);

	// Focus description input when activated
	useEffect(() => {
		if (isActive && descriptionRef.current) {
			descriptionRef.current.focus();
		}
	}, [isActive]);

	const handleActivate = () => {
		setIsActive(true);
		onFocus?.();
	};

	const handleReset = () => {
		setDate(new Date().toISOString().split("T")[0]);
		setDescription("");
		setAmount("");
		setAccountId(defaultAccountId ?? "");
		setIsActive(false);
	};

	const handleSubmit = () => {
		if (!description.trim() || !amount || !accountId) {
			return;
		}

		const parsedAmount = parseFloat(amount.replace(/[^0-9.-]/g, ""));
		if (isNaN(parsedAmount)) {
			return;
		}

		onAdd({
			date,
			description: description.trim(),
			amount: parsedAmount,
			accountId,
		});

		// Reset for next entry
		setDescription("");
		setAmount("");
		descriptionRef.current?.focus();
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		} else if (e.key === "Escape") {
			handleReset();
		}
	};

	// Handle click outside to deactivate
	useEffect(() => {
		if (!isActive) return;

		const handleClickOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				if (!description.trim() && !amount) {
					handleReset();
				}
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- handleReset is stable
	}, [isActive, description, amount]);

	if (!isActive) {
		return (
			<div
				onClick={handleActivate}
				data-testid="add-transaction-row"
				className={cn(
					"flex cursor-pointer items-center gap-4 border-b border-dashed px-4 py-3",
					"text-muted-foreground hover:bg-accent/50 hover:text-foreground",
					"transition-colors",
					className
				)}
				role="button"
				tabIndex={0}
				onKeyDown={(e) => e.key === "Enter" && handleActivate()}
			>
				<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
				</svg>
				<span className="text-sm">Add transaction...</span>
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			data-testid="add-transaction-row"
			className={cn("flex items-center gap-2 border-b bg-accent/50 px-4 py-2", className)}
			onKeyDown={handleKeyDown}
		>
			{/* Date */}
			<input
				type="date"
				value={date}
				onChange={(e) => setDate(e.target.value)}
				data-testid="new-transaction-date"
				className="w-32 rounded border bg-transparent px-2 py-1 text-sm"
			/>

			{/* Description */}
			<input
				ref={descriptionRef}
				type="text"
				value={description}
				onChange={(e) => setDescription(e.target.value)}
				placeholder="Description"
				data-testid="new-transaction-merchant"
				className="min-w-0 flex-1 rounded border bg-transparent px-2 py-1 text-sm"
			/>

			{/* Account */}
			<select
				value={accountId}
				onChange={(e) => setAccountId(e.target.value)}
				className="w-32 rounded border bg-transparent px-2 py-1 text-sm"
			>
				<option value="">Account...</option>
				{availableAccounts.map((account) => (
					<option key={account.id} value={account.id}>
						{account.name}
					</option>
				))}
			</select>

			{/* Amount */}
			<input
				type="text"
				inputMode="decimal"
				value={amount}
				onChange={(e) => setAmount(e.target.value)}
				placeholder="0.00"
				data-testid="new-transaction-amount"
				className="w-24 rounded border bg-transparent px-2 py-1 text-right text-sm tabular-nums"
			/>

			{/* Actions */}
			<div className="flex gap-1">
				<button
					type="button"
					onClick={handleSubmit}
					disabled={!description.trim() || !amount || !accountId}
					className={cn(
						"rounded p-1.5",
						"hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50",
						"text-primary"
					)}
					aria-label="Add transaction"
				>
					<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
					</svg>
				</button>
				<button
					type="button"
					onClick={handleReset}
					className="rounded p-1.5 text-muted-foreground hover:text-foreground"
					aria-label="Cancel"
				>
					<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>
		</div>
	);
}
