/**
 * Root tRPC Router
 *
 * Merges all sub-routers into a single app router.
 * This is the main entry point for tRPC.
 */

import { router } from "../trpc";
import { vaultRouter } from "./vault";
import { syncRouter } from "./sync";
import { inviteRouter } from "./invite";
import { userRouter } from "./user";

/**
 * Root router that merges all sub-routers.
 */
export const appRouter = router({
  /** User identity and settings */
  user: userRouter,
  /** Vault CRUD and membership */
  vault: vaultRouter,
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
