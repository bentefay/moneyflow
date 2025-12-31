"use client";

/**
 * CurrencySelector Component
 *
 * A searchable combobox for selecting currencies from the full list of supported
 * currencies. Uses shadcn's Command component (cmdk) for search functionality.
 */

import { Check, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Currencies } from "@/lib/domain/currencies";
import { cn } from "@/lib/utils";

export interface CurrencySelectorProps {
	/** Currently selected currency code (e.g., "USD", "EUR") */
	value: string;
	/** Callback when currency selection changes */
	onChange: (currencyCode: string) => void;
	/** Additional CSS classes */
	className?: string;
	/** Disable the selector */
	disabled?: boolean;
}

/** Common currencies to show at the top of the list */
const COMMON_CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "CNY"];

/**
 * A searchable currency selector with common currencies prioritized at the top.
 */
export function CurrencySelector({
	value,
	onChange,
	className,
	disabled = false,
}: CurrencySelectorProps) {
	const [open, setOpen] = useState(false);

	// Get the currently selected currency info
	const selectedCurrency = Currencies[value];

	// Sort currencies: common first, then alphabetically by name
	const sortedCurrencies = useMemo(() => {
		const allCurrencies = Object.values(Currencies);

		// Separate common and other currencies
		const common = COMMON_CURRENCIES.map((code) => Currencies[code]).filter(Boolean);

		const others = allCurrencies
			.filter((currency) => !COMMON_CURRENCIES.includes(currency.code))
			.sort((a, b) => a.name.localeCompare(b.name));

		return { common, others };
	}, []);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					aria-label="Default currency"
					className={cn("w-full justify-between", className)}
					disabled={disabled}
				>
					{selectedCurrency ? (
						<span className="flex items-center gap-2">
							<span className="font-mono text-muted-foreground">{selectedCurrency.code}</span>
							<span className="truncate">{selectedCurrency.name}</span>
						</span>
					) : (
						<span className="text-muted-foreground">Select currency...</span>
					)}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[300px] p-0" align="start">
				<Command>
					<CommandInput placeholder="Search currencies..." />
					<CommandList>
						<CommandEmpty>No currency found.</CommandEmpty>

						{/* Common currencies group */}
						<CommandGroup heading="Common">
							{sortedCurrencies.common.map((currency) => (
								<CommandItem
									key={currency.code}
									value={`${currency.code} ${currency.name}`}
									onSelect={() => {
										onChange(currency.code);
										setOpen(false);
									}}
								>
									<Check
										className={cn(
											"mr-2 h-4 w-4",
											value === currency.code ? "opacity-100" : "opacity-0"
										)}
									/>
									<span className="mr-2 font-mono text-muted-foreground">{currency.code}</span>
									<span className="truncate">{currency.name}</span>
								</CommandItem>
							))}
						</CommandGroup>

						{/* All other currencies */}
						<CommandGroup heading="All Currencies">
							{sortedCurrencies.others.map((currency) => (
								<CommandItem
									key={currency.code}
									value={`${currency.code} ${currency.name}`}
									onSelect={() => {
										onChange(currency.code);
										setOpen(false);
									}}
								>
									<Check
										className={cn(
											"mr-2 h-4 w-4",
											value === currency.code ? "opacity-100" : "opacity-0"
										)}
									/>
									<span className="mr-2 font-mono text-muted-foreground">{currency.code}</span>
									<span className="truncate">{currency.name}</span>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
