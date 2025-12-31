"use client";

/**
 * CurrencySelect Component
 *
 * A dropdown select for choosing account currency with an option
 * to inherit from the vault's default currency.
 */

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SUPPORTED_CURRENCIES } from "@/lib/domain/currencies";
import { cn } from "@/lib/utils";

export interface CurrencySelectProps {
	/** Currently selected currency code (empty string = inherit from vault) */
	value: string;
	/** Vault's default currency for display */
	vaultDefaultCurrency: string;
	/** Callback when currency changes */
	onChange: (value: string) => void;
	/** Additional CSS classes */
	className?: string;
	/** Whether the select is disabled */
	disabled?: boolean;
}

/**
 * Currency select dropdown with "Use vault default" option.
 */
export function CurrencySelect({
	value,
	vaultDefaultCurrency,
	onChange,
	className,
	disabled = false,
}: CurrencySelectProps) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");

	// Check if using vault default (empty string)
	const isInherited = value === "";
	const displayValue = isInherited ? vaultDefaultCurrency : value;

	// Filter currencies by search
	const filteredCurrencies = useMemo(() => {
		if (!search) return SUPPORTED_CURRENCIES;
		const searchLower = search.toLowerCase();
		return SUPPORTED_CURRENCIES.filter(
			(c) =>
				c.code.toLowerCase().includes(searchLower) || c.name.toLowerCase().includes(searchLower)
		);
	}, [search]);

	// Handle selection
	const handleSelect = useCallback(
		(code: string) => {
			onChange(code);
			setOpen(false);
			setSearch("");
		},
		[onChange]
	);

	// Handle using vault default
	const handleUseDefault = useCallback(() => {
		onChange("");
		setOpen(false);
		setSearch("");
	}, [onChange]);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					disabled={disabled}
					className={cn(
						"h-8 w-24 justify-between text-sm",
						isInherited && "text-muted-foreground",
						className
					)}
				>
					{displayValue}
					{isInherited && <span className="ml-1 text-muted-foreground/60 text-xs">(default)</span>}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-56 p-2" align="start">
				<Input
					placeholder="Search currencies..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="mb-2 h-8"
					autoFocus
				/>
				<div className="max-h-48 overflow-y-auto">
					{/* Vault default option */}
					<button
						type="button"
						className={cn(
							"flex w-full items-center rounded px-2 py-1.5 text-left text-sm",
							"hover:bg-accent focus:bg-accent focus:outline-none",
							isInherited && "bg-accent/50"
						)}
						onClick={handleUseDefault}
					>
						<span className="font-medium">{vaultDefaultCurrency}</span>
						<span className="ml-2 text-muted-foreground text-xs">(vault default)</span>
					</button>

					{/* Separator */}
					<div className="my-1 border-t" />

					{/* Currency list */}
					{filteredCurrencies.map((currency) => (
						<button
							key={currency.code}
							type="button"
							className={cn(
								"flex w-full items-center rounded px-2 py-1.5 text-left text-sm",
								"hover:bg-accent focus:bg-accent focus:outline-none",
								value === currency.code && !isInherited && "bg-accent/50"
							)}
							onClick={() => handleSelect(currency.code)}
						>
							<span className="w-12 font-medium">{currency.code}</span>
							<span className="text-muted-foreground text-xs">{currency.name}</span>
						</button>
					))}

					{filteredCurrencies.length === 0 && (
						<div className="px-2 py-4 text-center text-muted-foreground text-sm">
							No currencies found
						</div>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
