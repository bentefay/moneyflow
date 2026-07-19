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

function getBrowserSupabaseConfiguration(): { url: string; anonKey: string } {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
        );
    }

    return {
        url: requireSecureSupabaseUrl(supabaseUrl, process.env.NODE_ENV),
        anonKey: supabaseAnonKey
    };
}

/**
 * Get the Supabase browser client (singleton).
 *
 * Uses anon key for client-side operations with RLS.
 */
export function createSupabaseClientForBrowser(): SupabaseClient<Database> {
    if (supabaseClient) {
        return supabaseClient;
    }

    const configuration = getBrowserSupabaseConfiguration();

    supabaseClient = createClient<Database>(configuration.url, configuration.anonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    });

    return supabaseClient;
}

/**
 * Create an isolated Realtime client whose callback supplies a vault-scoped short-lived token.
 * Isolation prevents one vault or purpose from replacing another channel's socket credential.
 */
export function createSupabaseClientForRealtime(
    accessToken: () => Promise<string>
): SupabaseClient<Database> {
    const configuration = getBrowserSupabaseConfiguration();
    return createClient<Database>(configuration.url, configuration.anonKey, {
        accessToken,
        auth: {
            persistSession: false,
            autoRefreshToken: false
        },
        realtime: {
            params: { eventsPerSecond: 10 }
        }
    });
}

export type { Database };
