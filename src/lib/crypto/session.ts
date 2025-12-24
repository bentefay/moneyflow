/**
 * Session Storage Helpers
 *
 * Manages keypair storage in sessionStorage for per-session authentication.
 * Keys are automatically cleared when the browser tab closes.
 */

const SESSION_KEY = "moneyflow_session";

/**
 * Session data stored in sessionStorage.
 * Contains all keys needed for signing and encryption.
 */
export interface SessionData {
  /** Ed25519 signing public key, base64 */
  publicKey: string;
  /** Ed25519 signing secret key, base64 */
  secretKey: string;
  /** X25519 encryption public key, base64 */
  encPublicKey: string;
  /** X25519 encryption secret key, base64 */
  encSecretKey: string;
  /** BLAKE2b hash of signing publicKey, base64 */
  pubkeyHash: string;
}

/**
 * Checks if we're running in a browser environment with sessionStorage.
 */
function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

/**
 * Stores session data in sessionStorage.
 * This data persists until the browser tab is closed.
 *
 * @param data - Session data to store
 */
export function storeSession(data: SessionData): void {
  if (!isBrowser()) {
    console.warn("sessionStorage not available - running server-side?");
    return;
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

/**
 * Retrieves session data from sessionStorage.
 *
 * @returns Session data if present, null otherwise
 */
export function getSession(): SessionData | null {
  if (!isBrowser()) {
    return null;
  }

  const stored = sessionStorage.getItem(SESSION_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as SessionData;
  } catch {
    // Corrupted data - clear it
    clearSession();
    return null;
  }
}

/**
 * Checks if a valid session exists.
 *
 * @returns true if session data is present
 */
export function hasSession(): boolean {
  return getSession() !== null;
}

/**
 * Clears session data (logout).
 * After calling this, the user must re-enter their seed phrase.
 */
export function clearSession(): void {
  if (!isBrowser()) {
    return;
  }
  sessionStorage.removeItem(SESSION_KEY);
}

/**
 * Gets the pubkeyHash from the current session.
 * Useful for identifying the current user.
 *
 * @returns pubkeyHash if session exists, null otherwise
 */
export function getSessionPubkeyHash(): string | null {
  const session = getSession();
  return session?.pubkeyHash ?? null;
}

/**
 * Gets the public signing key from the current session.
 *
 * @returns Base64-encoded public key if session exists, null otherwise
 */
export function getSessionPublicKey(): string | null {
  const session = getSession();
  return session?.publicKey ?? null;
}

/**
 * Gets the secret signing key from the current session.
 * ⚠️ Handle with care - this is secret material.
 *
 * @returns Base64-encoded secret key if session exists, null otherwise
 */
export function getSessionSecretKey(): string | null {
  const session = getSession();
  return session?.secretKey ?? null;
}

/**
 * Gets the encryption public key from the current session.
 *
 * @returns Base64-encoded encryption public key if session exists, null otherwise
 */
export function getSessionEncPublicKey(): string | null {
  const session = getSession();
  return session?.encPublicKey ?? null;
}

/**
 * Gets the encryption secret key from the current session.
 * ⚠️ Handle with care - this is secret material.
 *
 * @returns Base64-encoded encryption secret key if session exists, null otherwise
 */
export function getSessionEncSecretKey(): string | null {
  const session = getSession();
  return session?.encSecretKey ?? null;
}
