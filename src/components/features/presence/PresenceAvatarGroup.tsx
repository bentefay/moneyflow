"use client";

/**
 * Presence Avatar Group
 *
 * Stacked avatars showing multiple users with overflow indicator.
 */

import { cn } from "@/lib/utils";
import { PresenceAvatar, type PresenceAvatarProps } from "./PresenceAvatar";

export interface PresenceUser {
  /** User identifier */
  userId: string;
  /** Display name (optional) */
  name?: string;
  /** Whether the user is online */
  isOnline?: boolean;
}

export interface PresenceAvatarGroupProps {
  /** List of users to display */
  users: PresenceUser[];
  /** Maximum number of avatars to show before overflow */
  max?: number;
  /** Size variant */
  size?: PresenceAvatarProps["size"];
  /** Additional CSS classes */
  className?: string;
}

/**
 * Group of stacked presence avatars.
 */
export function PresenceAvatarGroup({
  users,
  max = 4,
  size = "md",
  className,
}: PresenceAvatarGroupProps) {
  // Sort online users first
  const sortedUsers = [...users].sort((a, b) => {
    if (a.isOnline === b.isOnline) return 0;
    return a.isOnline ? -1 : 1;
  });

  const visibleUsers = sortedUsers.slice(0, max);
  const overflowCount = Math.max(0, users.length - max);

  // Calculate negative margin based on size
  const overlapClasses = {
    sm: "-ml-2",
    md: "-ml-3",
    lg: "-ml-4",
  } as const;

  const overflowSizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base",
  } as const;

  if (users.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center", className)}>
      {visibleUsers.map((user, index) => (
        <div
          key={user.userId}
          className={cn(index > 0 && overlapClasses[size])}
          style={{ zIndex: visibleUsers.length - index }}
        >
          <PresenceAvatar
            userId={user.userId}
            name={user.name}
            isOnline={user.isOnline}
            size={size}
            showIndicator={false}
          />
        </div>
      ))}

      {/* Overflow indicator */}
      {overflowCount > 0 && (
        <div
          className={cn(
            "bg-muted text-muted-foreground flex items-center justify-center rounded-full font-medium",
            overlapClasses[size],
            overflowSizeClasses[size]
          )}
          style={{ zIndex: 0 }}
          title={`${overflowCount} more user${overflowCount > 1 ? "s" : ""}`}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  );
}
