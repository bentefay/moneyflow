export {
  AuthGuard,
  withAuthGuard,
  useAuthGuard,
  isPublicRoute,
  isAuthenticated,
  getCurrentPubkeyHash,
  PUBLIC_ROUTES,
  UNLOCK_ROUTE,
  DASHBOARD_ROUTE,
} from "./guard";

export type {
  UseAuthGuardOptions,
  UseAuthGuardReturn,
  WithAuthGuardOptions,
  AuthGuardProps,
} from "./guard";
