/**
 * Presence Avatar
 *
 * Circular avatar with initials and colored border indicating presence.
 */

import { User } from "lucide-react";

import { type MemberDisplayName, memberDisplayLabel } from "@/lib/crdt/person";
import { cn } from "@/lib/utils";
import { getContrastColor, getInitials, hashToColor } from "@/lib/utils/color";

export interface PresenceAvatarProps {
    /** User identifier (pubkey_hash), used for colour only — never displayed */
    userId: string;
    /**
     * The member's resolved display name (UR-003). Required, so a caller cannot
     * omit it and silently fall back to rendering pubkeyHash characters.
     */
    displayName: MemberDisplayName;
    /** Whether the user is currently online */
    isOnline?: boolean;
    /** Size variant */
    size?: "sm" | "md" | "lg";
    /** Additional CSS classes */
    className?: string;
    /** Whether to show online indicator dot */
    showIndicator?: boolean;
}

const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base"
} as const;

const iconSizeClasses = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5"
} as const;

const indicatorSizeClasses = {
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5",
    lg: "h-3 w-3"
} as const;

/**
 * Avatar component for showing user presence.
 */
export function PresenceAvatar({
    userId,
    displayName,
    isOnline = false,
    size = "md",
    className,
    showIndicator = true
}: PresenceAvatarProps) {
    // Colour stays keyed on the stable userId, never the name, so it survives a
    // rename and members sharing initials remain visually distinct.
    const backgroundColor = hashToColor(userId);
    const textColor = getContrastColor(backgroundColor);
    const label = memberDisplayLabel(displayName);

    return (
        <div
            className={cn("relative inline-flex", className)}
            title={`${label}${isOnline ? " (online)" : ""}`}
        >
            {/* Avatar circle */}
            <div
                className={cn(
                    "flex items-center justify-center rounded-full font-medium",
                    sizeClasses[size],
                    isOnline && "ring-offset-background ring-2 ring-green-500 ring-offset-2"
                )}
                style={{
                    backgroundColor,
                    color: textColor
                }}
                role="img"
                aria-label={label}
            >
                {displayName.kind === "named" ? (
                    getInitials(displayName.name)
                ) : (
                    // No name resolved: a person icon rather than initials, because the
                    // only other identifier available is the pubkeyHash and UR-003
                    // forbids showing it.
                    <User className={iconSizeClasses[size]} aria-hidden="true" />
                )}
            </div>

            {/* Online indicator dot */}
            {showIndicator && isOnline && (
                <span
                    className={cn(
                        "ring-background absolute right-0 bottom-0 rounded-full bg-green-500 ring-2",
                        indicatorSizeClasses[size]
                    )}
                />
            )}
        </div>
    );
}
