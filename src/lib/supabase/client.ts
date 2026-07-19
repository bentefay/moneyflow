/**
 * Supabase Client
 *
 * Creates a Supabase client for client-side operations.
 * Uses anon key with RLS for secure access.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types";
import { requireSecureSupabaseUrl } from "./url";

let supabaseClient: SupabaseClient<Database> | null = null;

/**
 * Get the Supabase browser client (singleton).
 *
 * Uses anon key for client-side operations with RLS.
 */
export function createSupabaseClientForBrowser(): SupabaseClient<Database> {
    if (supabaseClient) {
        return supabaseClient;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
        );
    }

    const secureSupabaseUrl = requireSecureSupabaseUrl(supabaseUrl, process.env.NODE_ENV);

    supabaseClient = createClient<Database>(secureSupabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    });

    return supabaseClient;
}

export type { Database };
