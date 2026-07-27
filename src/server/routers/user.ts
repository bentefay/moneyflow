/**
 * User Router
 *
 * Handles verified user identity registration and vault membership lookup.
 *
 * Authentication Model:
 * - Key-only auth via Ed25519 signatures
 * - pubkey_hash is the user's permanent identity
 * - No email, no passwords, no sessions
 *
 * Vault keys and content are stored in their normalized encrypted vault-scoped tables.
 */

import { TRPCError } from "@trpc/server";

import { createSupabaseClient } from "@/lib/supabase/server";

import { userGetOrCreateInput, userRegisterInput } from "../schemas/user";
import { protectedProcedure, router } from "../trpc";

// ============================================================================
// Error Handling Helpers
// ============================================================================

/**
 * Determine if an error is a connection/infrastructure issue.
 */
function isConnectionError(error: unknown): boolean {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (
            message.includes("fetch failed") ||
            message.includes("econnrefused") ||
            message.includes("network") ||
            message.includes("timeout") ||
            message.includes("connection")
        );
    }
    return false;
}

/**
 * Handle database errors without exposing database details, identities or stored data.
 * This prevents leaking internal implementation details to clients.
 */
function handleDatabaseError(error: unknown, operation: string): never {
    console.error(`[${operation}] Database operation failed`);

    // Determine error category and throw sanitized error
    if (isConnectionError(error)) {
        throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Unable to connect to database"
        });
    }

    // Generic database error
    throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database operation failed"
    });
}

// ============================================================================
// Router
// ============================================================================

export const userRouter = router({
    /**
     * Register a new user.
     *
     * Creates a user_data record with the pubkey_hash.
     * Returns whether this was a new registration or existing user.
     *
     * Note: This is idempotent - calling with same pubkey_hash is safe.
     */
    register: protectedProcedure.input(userRegisterInput).mutation(async ({ ctx }) => {
        const supabase = await (async () => {
            try {
                return await createSupabaseClient();
            } catch (error) {
                handleDatabaseError(error, "user.register:connect");
            }
        })();

        // Check if user already exists
        const { data: existing, error: selectError } = await supabase
            .from("user_data")
            .select("pubkey_hash")
            .eq("pubkey_hash", ctx.pubkeyHash)
            .maybeSingle();

        if (selectError) {
            handleDatabaseError(selectError, "user.register:check");
        }

        if (existing) {
            return { success: true, isNew: false };
        }

        // Create new user
        const { error } = await supabase.from("user_data").insert({
            pubkey_hash: ctx.pubkeyHash
        });

        if (error) {
            // Handle race condition (another request created user)
            if (error.code === "23505") {
                return { success: true, isNew: false };
            }

            handleDatabaseError(error, "user.register:insert");
        }

        return { success: true, isNew: true };
    }),

    /**
     * Get or create user - idempotent registration.
     *
     * Returns existing registration metadata or creates a new identity row.
     * This is the preferred method for unlock flow:
     * 1. User enters seed phrase
     * 2. Client derives the keypair and installs its signing session
     * 3. Client calls getOrCreate
     * 4. If isNew, show welcome/setup
     * 5. Load vault membership and encrypted vault state through their dedicated paths
     *
     * The verified context is the only identity selector.
     */
    getOrCreate: protectedProcedure.input(userGetOrCreateInput).mutation(async ({ ctx }) => {
        const supabase = await (async () => {
            try {
                return await createSupabaseClient();
            } catch (error) {
                handleDatabaseError(error, "user.getOrCreate:connect");
            }
        })();

        // Try to get existing user
        const { data: existing, error: selectError } = await supabase
            .from("user_data")
            .select("updated_at")
            .eq("pubkey_hash", ctx.pubkeyHash)
            .maybeSingle();

        if (selectError) {
            handleDatabaseError(selectError, "user.getOrCreate:select");
        }

        if (existing) {
            return {
                isNew: false,
                updatedAt: existing.updated_at
            };
        }

        // Create new user
        const { data: newUser, error: insertError } = await supabase
            .from("user_data")
            .insert({
                pubkey_hash: ctx.pubkeyHash
            })
            .select("updated_at")
            .single();

        if (insertError) {
            // Handle race condition - another request created user
            if (insertError.code === "23505") {
                const { data: raceUser, error: raceError } = await supabase
                    .from("user_data")
                    .select("updated_at")
                    .eq("pubkey_hash", ctx.pubkeyHash)
                    .single();

                if (raceError || !raceUser) {
                    handleDatabaseError(
                        raceError ?? new Error("User not found after race"),
                        "user.getOrCreate:race"
                    );
                }

                return {
                    isNew: false,
                    updatedAt: raceUser.updated_at
                };
            }

            handleDatabaseError(insertError, "user.getOrCreate:insert");
        }

        return {
            isNew: true,
            updatedAt: newUser.updated_at
        };
    }),

    /**
     * Get current user's vaults.
     *
     * Returns all vaults the authenticated user is a member of,
     * including their role and encrypted vault key.
     */
    myVaults: protectedProcedure.query(async ({ ctx }) => {
        const supabase = await (async () => {
            try {
                return await createSupabaseClient();
            } catch (error) {
                handleDatabaseError(error, "user.myVaults:connect");
            }
        })();

        const { data, error } = await supabase
            .from("vault_memberships")
            .select(
                `
        vault_id,
        role,
        encrypted_vault_key,
        vaults:vault_id (
          id,
          created_at
        )
      `
            )
            .eq("pubkey_hash", ctx.pubkeyHash);

        if (error) {
            handleDatabaseError(error, "user.myVaults:query");
        }

        return data ?? [];
    })
});
