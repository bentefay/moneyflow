/**
 * Ed25519 Request Signing
 *
 * Signs API requests with Ed25519 for authentication.
 * The server verifies signatures using the user's public key.
 */

import sodium from "libsodium-wrappers";
import { initCrypto } from "./keypair";
import { getSession } from "./session";

/**
 * Headers required for signed requests.
 */
export interface SignedRequestHeaders {
  "X-Pubkey": string;
  "X-Timestamp": string;
  "X-Signature": string;
}

/**
 * Signs an API request for authentication.
 *
 * The message format is:
 *   {method}\n{path}\n{timestamp}\n{bodyHash}
 *
 * Where bodyHash is BLAKE2b-256 of the JSON body (empty string if no body).
 *
 * @param method - HTTP method (GET, POST, etc.)
 * @param path - Request path (e.g., /api/trpc/vault.create)
 * @param body - Request body (optional)
 * @returns Headers to include with the request
 * @throws Error if no session exists
 */
export async function signRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<SignedRequestHeaders> {
  await initCrypto();

  const session = getSession();
  if (!session) {
    throw new Error("No session - user must be unlocked");
  }

  const secretKey = sodium.from_base64(session.secretKey, sodium.base64_variants.ORIGINAL);

  const timestamp = Date.now().toString();

  // Hash the body if present
  const bodyHash = body
    ? sodium.to_base64(
        sodium.crypto_generichash(32, JSON.stringify(body)),
        sodium.base64_variants.ORIGINAL
      )
    : "";

  // Create message to sign
  const message = `${method}\n${path}\n${timestamp}\n${bodyHash}`;

  // Sign with Ed25519
  const signature = sodium.crypto_sign_detached(sodium.from_string(message), secretKey);

  return {
    "X-Pubkey": session.publicKey,
    "X-Timestamp": timestamp,
    "X-Signature": sodium.to_base64(signature, sodium.base64_variants.ORIGINAL),
  };
}

/**
 * Verifies a signed request.
 *
 * @param method - HTTP method
 * @param path - Request path
 * @param body - Request body (optional)
 * @param headers - Headers from the request
 * @param maxAgeMs - Maximum age of request in milliseconds (default: 5 minutes)
 * @returns Object with verified: boolean and pubkeyHash if verified
 */
export async function verifyRequest(
  method: string,
  path: string,
  body: unknown,
  headers: {
    "X-Pubkey"?: string;
    "X-Timestamp"?: string;
    "X-Signature"?: string;
  },
  maxAgeMs: number = 5 * 60 * 1000
): Promise<{ verified: boolean; pubkeyHash?: string; error?: string }> {
  await initCrypto();

  const { "X-Pubkey": pubkey, "X-Timestamp": timestamp, "X-Signature": signature } = headers;

  // Check required headers
  if (!pubkey || !timestamp || !signature) {
    return { verified: false, error: "Missing authentication headers" };
  }

  // Check timestamp freshness
  const requestTime = parseInt(timestamp, 10);
  if (isNaN(requestTime)) {
    return { verified: false, error: "Invalid timestamp" };
  }

  const now = Date.now();
  if (Math.abs(now - requestTime) > maxAgeMs) {
    return { verified: false, error: "Request expired" };
  }

  try {
    const publicKey = sodium.from_base64(pubkey, sodium.base64_variants.ORIGINAL);
    const sig = sodium.from_base64(signature, sodium.base64_variants.ORIGINAL);

    // Hash the body if present
    const bodyHash = body
      ? sodium.to_base64(
          sodium.crypto_generichash(32, JSON.stringify(body)),
          sodium.base64_variants.ORIGINAL
        )
      : "";

    // Recreate message
    const message = `${method}\n${path}\n${timestamp}\n${bodyHash}`;

    // Verify signature
    const verified = sodium.crypto_sign_verify_detached(
      sig,
      sodium.from_string(message),
      publicKey
    );

    if (!verified) {
      return { verified: false, error: "Invalid signature" };
    }

    // Compute pubkeyHash
    const pubkeyHash = sodium.to_base64(
      sodium.crypto_generichash(32, publicKey),
      sodium.base64_variants.ORIGINAL
    );

    return { verified: true, pubkeyHash };
  } catch (e) {
    return { verified: false, error: `Verification error: ${e}` };
  }
}

/**
 * Signs arbitrary data with Ed25519.
 * Useful for signing non-request data like invite tokens.
 *
 * @param data - Data to sign
 * @returns Detached signature
 * @throws Error if no session exists
 */
export async function signData(data: Uint8Array): Promise<Uint8Array> {
  await initCrypto();

  const session = getSession();
  if (!session) {
    throw new Error("No session - user must be unlocked");
  }

  const secretKey = sodium.from_base64(session.secretKey, sodium.base64_variants.ORIGINAL);

  return sodium.crypto_sign_detached(data, secretKey);
}

/**
 * Verifies a signature on arbitrary data.
 *
 * @param data - Original data
 * @param signature - Detached signature
 * @param publicKeyBase64 - Signer's public key (base64)
 * @returns true if signature is valid
 */
export async function verifySignature(
  data: Uint8Array,
  signature: Uint8Array,
  publicKeyBase64: string
): Promise<boolean> {
  await initCrypto();

  try {
    const publicKey = sodium.from_base64(publicKeyBase64, sodium.base64_variants.ORIGINAL);
    return sodium.crypto_sign_verify_detached(signature, data, publicKey);
  } catch {
    return false;
  }
}

/**
 * Signs a string and returns base64-encoded signature.
 *
 * @param text - String to sign
 * @returns Base64-encoded signature
 */
export async function signString(text: string): Promise<string> {
  await initCrypto();
  const data = sodium.from_string(text);
  const signature = await signData(data);
  return sodium.to_base64(signature, sodium.base64_variants.ORIGINAL);
}

/**
 * Verifies a string signature.
 *
 * @param text - Original string
 * @param signatureBase64 - Base64-encoded signature
 * @param publicKeyBase64 - Signer's public key (base64)
 * @returns true if signature is valid
 */
export async function verifyStringSignature(
  text: string,
  signatureBase64: string,
  publicKeyBase64: string
): Promise<boolean> {
  await initCrypto();

  try {
    const data = sodium.from_string(text);
    const signature = sodium.from_base64(signatureBase64, sodium.base64_variants.ORIGINAL);
    return verifySignature(data, signature, publicKeyBase64);
  } catch {
    return false;
  }
}
