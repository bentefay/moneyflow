import type * as React from "react";

import { cn } from "@/lib/utils";

/** A key or shortcut as a small monospace badge. Override colours with `className` on dark chrome. */
function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
    return (
        <kbd
            data-slot="kbd"
            className={cn(
                "bg-muted text-muted-foreground inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-xs leading-none",
                className
            )}
            {...props}
        />
    );
}

export { Kbd };
