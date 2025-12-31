/**
 * Supabase Server Client
 *
 * Creates a Supabase client for server-side operations.
 * Uses service role key for full database access.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let supabaseServer: SupabaseClient<Database> | null = null;

/**
 * Get the Supabase server client (singleton).
 *
 * Uses service role key for server-side operations with full access.
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
	const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!supabaseUrl || !supabaseServiceKey) {
		throw new Error(
			"Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
		);
	}

	return createClient<Database>(supabaseUrl, supabaseServiceKey, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
		},
	});
}
