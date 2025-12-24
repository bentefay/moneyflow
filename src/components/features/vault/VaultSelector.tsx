"use client";

/**
 * Vault Selector
 *
 * Dropdown component to select the active vault.
 */

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveVault, type ActiveVault } from "@/hooks/use-active-vault";

export interface VaultOption {
  id: string;
  name: string;
  role: "owner" | "admin" | "member";
}

export interface VaultSelectorProps {
  /** Available vaults to select from */
  vaults: VaultOption[];
  /** Whether vaults are loading */
  isLoading?: boolean;
  /** Called when user wants to create a new vault */
  onCreateVault?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Dropdown selector for vaults.
 */
export function VaultSelector({
  vaults,
  isLoading = false,
  onCreateVault,
  className,
}: VaultSelectorProps) {
  const { activeVault, setActiveVault } = useActiveVault();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  // Auto-select first vault if none selected
  useEffect(() => {
    if (!activeVault && vaults.length > 0) {
      setActiveVault({
        id: vaults[0].id,
        name: vaults[0].name,
      });
    }
  }, [activeVault, vaults, setActiveVault]);

  const handleSelect = (vault: VaultOption) => {
    setActiveVault({
      id: vault.id,
      name: vault.name,
    });
    setIsOpen(false);
  };

  const selectedVault = vaults.find((v) => v.id === activeVault?.id);

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium",
          "hover:bg-accent focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none",
          isLoading && "cursor-wait opacity-50"
        )}
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="text-muted-foreground">Loading...</span>
        ) : selectedVault ? (
          <>
            <span>{selectedVault.name}</span>
            <RoleBadge role={selectedVault.role} />
          </>
        ) : (
          <span className="text-muted-foreground">Select vault</span>
        )}
        <ChevronDown
          className={cn(
            "text-muted-foreground h-4 w-4 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="bg-popover absolute top-full right-0 z-50 mt-1 min-w-[200px] rounded-md border p-1 shadow-lg">
          {vaults.length === 0 ? (
            <div className="text-muted-foreground px-3 py-2 text-sm">No vaults available</div>
          ) : (
            <div className="max-h-[300px] overflow-auto">
              {vaults.map((vault) => (
                <button
                  key={vault.id}
                  onClick={() => handleSelect(vault)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm",
                    "hover:bg-accent focus:bg-accent focus:outline-none",
                    vault.id === activeVault?.id && "bg-accent"
                  )}
                >
                  <span className="flex-1 text-left">{vault.name}</span>
                  <RoleBadge role={vault.role} />
                  {vault.id === activeVault?.id && <Check className="text-primary h-4 w-4" />}
                </button>
              ))}
            </div>
          )}

          {/* Create Vault Option */}
          {onCreateVault && (
            <>
              <div className="bg-border my-1 h-px" />
              <button
                onClick={() => {
                  onCreateVault();
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm",
                  "hover:bg-accent focus:bg-accent focus:outline-none"
                )}
              >
                <Plus className="h-4 w-4" />
                <span>Create new vault</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Small badge showing the user's role in a vault.
 */
function RoleBadge({ role }: { role: VaultOption["role"] }) {
  const colors = {
    owner: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    admin: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    member: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  };

  return (
    <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium capitalize", colors[role])}>
      {role}
    </span>
  );
}
