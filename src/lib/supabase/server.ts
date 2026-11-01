/**
 * Supabase Server Client
 *
 * Creates a Supabase client for server-side operations.
 * Uses a secret key, which bypasses RLS, for full database access.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types";
import { requireSecureSupabaseUrl } from "./url";

let supabaseServer: SupabaseClient<Database> | null = null;

/**
 * Get the Supabase server client (singleton).
 *
 * Uses a secret key for server-side operations with full access.
 */
export async function createSupabaseClient(): Promise<SupabaseClient<Database>> {
    if (!supabaseServer) {
        supabaseServer = createSupabaseClientFresh();
    }

    return supabaseServer;
}

/**
 * Create a fresh Supabase client (not singleton).
 *
 * Useful for operations that need isolated connections.
 */
export function createSupabaseClientFresh(): SupabaseClient<Database> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
        throw new Error(
            "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY."
        );
    }

    const secureSupabaseUrl = requireSecureSupabaseUrl(supabaseUrl, process.env.NODE_ENV);

    return createClient<Database>(secureSupabaseUrl, supabaseSecretKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    });
}
