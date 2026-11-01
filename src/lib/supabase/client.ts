/**
 * Supabase Client
 *
 * Creates a Supabase client for client-side operations.
 * Uses the publishable key, which only reaches what RLS allows.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types";
import { requireSecureSupabaseUrl } from "./url";

function getBrowserSupabaseConfiguration(): { url: string; publishableKey: string } {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabasePublishableKey) {
        throw new Error(
            "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
        );
    }

    return {
        url: requireSecureSupabaseUrl(supabaseUrl, process.env.NODE_ENV),
        publishableKey: supabasePublishableKey
    };
}

/**
 * Create an isolated Realtime client whose callback supplies a vault-scoped short-lived token.
 * Isolation prevents one vault or purpose from replacing another channel's socket credential.
 */
export function createSupabaseClientForRealtime(
    accessToken: () => Promise<string>
): SupabaseClient<Database> {
    const configuration = getBrowserSupabaseConfiguration();
    return createClient<Database>(configuration.url, configuration.publishableKey, {
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
