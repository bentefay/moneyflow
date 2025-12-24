"use client";

/**
 * Presence Avatar
 *
 * Circular avatar with initials and colored border indicating presence.
 */

import { cn } from "@/lib/utils";
import { hashToColor, getContrastColor, getInitials } from "@/lib/utils/color";

export interface PresenceAvatarProps {
  /** User identifier (pubkey_hash or name) */
  userId: string;
  /** Display name (optional, falls back to userId) */
  name?: string;
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
  lg: "h-10 w-10 text-base",
} as const;

const indicatorSizeClasses = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
} as const;

/**
 * Avatar component for showing user presence.
 */
export function PresenceAvatar({
  userId,
  name,
  isOnline = false,
  size = "md",
  className,
  showIndicator = true,
}: PresenceAvatarProps) {
  const displayName = name || userId;
  const initials = getInitials(displayName);
  const backgroundColor = hashToColor(userId);
  const textColor = getContrastColor(backgroundColor);

  return (
    <div
      className={cn("relative inline-flex", className)}
      title={`${displayName}${isOnline ? " (online)" : ""}`}
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
          color: textColor,
        }}
      >
        {initials}
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
