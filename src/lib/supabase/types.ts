/**
 * Supabase Database Types
 *
 * Re-exports generated types from database.types.ts and adds
 * convenience type aliases.
 *
 * To regenerate types after schema changes:
 *   pnpm db:types
 *
 * Requires Supabase to be running:
 *   pnpm db:start
 */

// Re-export everything from generated types
export type { Database, Json } from "./database.types";

// Import Database for deriving convenience types
import type { Database } from "./database.types";

// ============================================================================
// Convenience Type Aliases
// ============================================================================

/** Vault membership roles */
export type VaultRole = "owner" | "member";

/** Vault invite roles */
export type InviteRole = "owner" | "member";

/** User data row type */
export type UserData = Database["public"]["Tables"]["user_data"]["Row"];

/** Vault row type */
export type Vault = Database["public"]["Tables"]["vaults"]["Row"];

/** Vault membership row type */
export type VaultMembership = Database["public"]["Tables"]["vault_memberships"]["Row"];

/** Vault invite row type */
export type VaultInvite = Database["public"]["Tables"]["vault_invites"]["Row"];

/** Vault snapshot row type */
export type VaultSnapshot = Database["public"]["Tables"]["vault_snapshots"]["Row"];

/** Vault update row type */
export type VaultUpdate = Database["public"]["Tables"]["vault_updates"]["Row"];
