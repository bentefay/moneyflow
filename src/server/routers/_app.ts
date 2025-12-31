/**
 * Root tRPC Router
 *
 * Merges all sub-routers into a single app router.
 * This is the main entry point for tRPC.
 */

import { router } from "../trpc";
import { inviteRouter } from "./invite";
import { membershipRouter } from "./membership";
import { syncRouter } from "./sync";
import { userRouter } from "./user";
import { vaultRouter } from "./vault";

/**
 * Root router that merges all sub-routers.
 */
export const appRouter = router({
	/** User identity and settings */
	user: userRouter,
	/** Vault CRUD and membership */
	vault: vaultRouter,
	/** Vault membership management */
	membership: membershipRouter,
	/** CRDT sync operations */
	sync: syncRouter,
	/** Vault invitations */
	invite: inviteRouter,
});

/**
 * Type definition for the app router.
 * Used for client-side type inference.
 */
export type AppRouter = typeof appRouter;
