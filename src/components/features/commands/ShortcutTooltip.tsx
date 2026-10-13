"use client";

import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type CommandShortcut, formatShortcut } from "@/lib/commands";

import { useShortcutPlatform } from "./use-shortcut-platform";

export interface ShortcutTooltipProps {
    /** What the control does, shown before its shortcut. */
    label: string;
    /** The shortcut of the command this control runs, read from the catalog. */
    shortcut: CommandShortcut;
    side?: "top" | "right" | "bottom" | "left";
    /** The control. It must accept a ref, as Radix's `asChild` trigger requires. */
    children: React.ReactNode;
}

/**
 * Tooltip for a control that has a keyboard shortcut: its label, then each binding as a key badge. The shortcut comes from the
 * command catalog, so the tooltip always shows the binding the keyboard actually uses.
 */
export function ShortcutTooltip({ label, shortcut, side, children }: ShortcutTooltipProps) {
    const platform = useShortcutPlatform();
    return (
        <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent
                side={side}
                className="flex items-center gap-1.5"
                data-testid="shortcut-tooltip"
            >
                <span>{label}</span>
                {formatShortcut(shortcut, platform).map((keys) => (
                    // The tooltip is inverted, so the badge inverts with it.
                    <Kbd
                        key={keys}
                        className="border-background/30 bg-background/15 text-background"
                    >
                        {keys}
                    </Kbd>
                ))}
            </TooltipContent>
        </Tooltip>
    );
}
