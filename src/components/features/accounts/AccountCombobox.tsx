"use client";

/**
 * AccountCombobox Component
 *
 * A searchable combobox for selecting accounts with an option to create new accounts.
 * Uses shadcn's Command + Popover pattern for accessible autocomplete.
 */

import { CheckIcon, ChevronsUpDownIcon, PlusCircleIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CreateAccountDialog } from "./CreateAccountDialog";

export interface AccountOption {
	id: string;
	name: string;
}

export interface AccountComboboxProps {
	/** Currently selected account ID */
	value: string;
	/** Callback when selection changes */
	onChange: (accountId: string) => void;
	/** Available accounts */
	accounts: AccountOption[];
	/** Placeholder text when no selection */
	placeholder?: string;
	/** Additional CSS classes */
	className?: string;
	/** Disable the combobox */
	disabled?: boolean;
}

/**
 * Searchable account selector with create option.
 */
export function AccountCombobox({
	value,
	onChange,
	accounts,
	placeholder = "Select account...",
	className,
	disabled = false,
}: AccountComboboxProps) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [createDialogOpen, setCreateDialogOpen] = useState(false);

	const selectedAccount = accounts.find((acc) => acc.id === value);

	// Filter accounts based on search
	const filteredAccounts = accounts.filter((account) =>
		account.name.toLowerCase().includes(search.toLowerCase())
	);

	const handleSelect = useCallback(
		(accountId: string) => {
			onChange(accountId);
			setOpen(false);
			setSearch("");
		},
		[onChange]
	);

	const handleCreateNew = useCallback(() => {
		setOpen(false);
		setCreateDialogOpen(true);
	}, []);

	const handleAccountCreated = useCallback(
		(accountId: string) => {
			onChange(accountId);
		},
		[onChange]
	);

	return (
		<>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						role="combobox"
						aria-expanded={open}
						aria-label="Select account"
						disabled={disabled}
						className={cn(
							"w-full justify-between font-normal",
							!value && "text-muted-foreground",
							className
						)}
					>
						<span className="truncate">{selectedAccount?.name ?? placeholder}</span>
						<ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-[200px] p-0" align="start">
					<Command shouldFilter={false}>
						<CommandInput
							placeholder="Search accounts..."
							value={search}
							onValueChange={setSearch}
						/>
						<CommandList>
							<CommandEmpty>No accounts found.</CommandEmpty>
							{filteredAccounts.length > 0 && (
								<CommandGroup>
									{filteredAccounts.map((account) => (
										<CommandItem
											key={account.id}
											value={account.id}
											onSelect={() => handleSelect(account.id)}
										>
											<CheckIcon
												className={cn(
													"mr-2 h-4 w-4",
													value === account.id ? "opacity-100" : "opacity-0"
												)}
											/>
											<span className="truncate">{account.name}</span>
										</CommandItem>
									))}
								</CommandGroup>
							)}
							<CommandSeparator />
							<CommandGroup>
								<CommandItem onSelect={handleCreateNew}>
									<PlusCircleIcon className="mr-2 h-4 w-4" />
									Create new account
								</CommandItem>
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>

			<CreateAccountDialog
				open={createDialogOpen}
				onOpenChange={setCreateDialogOpen}
				onCreated={handleAccountCreated}
			/>
		</>
	);
}
