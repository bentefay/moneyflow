"use client";

/**
 * AutomationCell
 *
 * Displays automation status for a transaction.
 * Shows which automation rule was applied and provides an update button
 * to re-evaluate automations or exclude the transaction from a rule.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Wand2, RefreshCw, XCircle, RotateCcw } from "lucide-react";

export interface AutomationCellProps {
  /** ID of the automation that was applied (if any) */
  appliedAutomationId?: string;
  /** Name of the automation that was applied */
  appliedAutomationName?: string;
  /** Callback to re-run automations on this transaction */
  onRerunAutomations?: () => void;
  /** Callback to exclude transaction from the applied automation */
  onExcludeFromAutomation?: () => void;
  /** Callback to undo the automation application */
  onUndoAutomation?: () => void;
  /** Whether the transaction has pending undo data */
  canUndo?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * AutomationCell - displays automation status and actions for a transaction.
 */
export function AutomationCell({
  appliedAutomationId,
  appliedAutomationName,
  onRerunAutomations,
  onExcludeFromAutomation,
  onUndoAutomation,
  canUndo = false,
  className,
}: AutomationCellProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasAppliedAutomation = !!appliedAutomationId;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("h-7 w-7 p-0", hasAppliedAutomation && "text-primary")}
                >
                  <Wand2 className="h-4 w-4" />
                  <span className="sr-only">Automation options</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              {hasAppliedAutomation ? (
                <p>
                  Applied: <strong>{appliedAutomationName}</strong>
                </p>
              ) : (
                <p>No automation applied</p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DropdownMenuContent align="end" className="w-56">
          {hasAppliedAutomation && (
            <>
              <div className="px-2 py-1.5 text-sm">
                <span className="text-muted-foreground">Applied rule:</span>
                <span className="ml-1 font-medium">{appliedAutomationName}</span>
              </div>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              onRerunAutomations?.();
              setIsOpen(false);
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Re-run automations
          </DropdownMenuItem>

          {hasAppliedAutomation && (
            <DropdownMenuItem
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                onExcludeFromAutomation?.();
                setIsOpen(false);
              }}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Exclude from this rule
            </DropdownMenuItem>
          )}

          {canUndo && (
            <DropdownMenuItem
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                onUndoAutomation?.();
                setIsOpen(false);
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Undo automation
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {hasAppliedAutomation && (
        <span className="text-muted-foreground truncate text-xs">{appliedAutomationName}</span>
      )}
    </div>
  );
}
