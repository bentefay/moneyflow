/**
 * WebAuthn Ceremony Helpers
 *
 * Pure transforms over WebAuthn ceremony responses. These sit between the browser API and every
 * network call so the secret-safety rule has exactly one enforcement point.
 *
 * The rule: `clientExtensionResults.prf.results` carries the raw key-encryption key. W3C WebAuthn
 * Level 3 §10.1.4 warns that it "will include this `results` output if present" when a credential
 * is serialized, so a response must never be transmitted without passing through
 * {@link stripPrfResults} first.
 */

import { PRF_OUTPUT_BYTES } from "./passkeyWrap";

/**
 * The part of a WebAuthn ceremony response that matters to this module.
 *
 * Deliberately minimal and structural rather than importing the library's response types: this
 * must apply uniformly to registration and authentication responses, and the fields carried
 * alongside the extension results are irrelevant to stripping. Callers keep their own precise
 * type; these helpers are generic over it.
 */
export interface CeremonyResponse {
    readonly clientExtensionResults: { readonly prf?: unknown };
}

interface PrfExtensionOutput {
    enabled?: boolean;
    results?: { first?: ArrayBuffer | Uint8Array; second?: ArrayBuffer | Uint8Array };
}

function readPrfOutput(response: CeremonyResponse): PrfExtensionOutput | null {
    const prf = response.clientExtensionResults?.prf;
    return typeof prf === "object" && prf !== null ? (prf as PrfExtensionOutput) : null;
}

/**
 * Removes the PRF extension output from a ceremony response.
 *
 * Returns a new object; the caller's response is left untouched so the PRF output remains
 * available locally for key derivation after the stripped copy has been sent.
 *
 * The whole `prf` entry is dropped rather than just `results`, since `enabled` is consumed
 * client-side and the server has no use for either.
 */
export function stripPrfResults<T extends CeremonyResponse>(response: T): T {
    const safeExtensionResults = { ...response.clientExtensionResults };
    delete safeExtensionResults.prf;

    return { ...response, clientExtensionResults: safeExtensionResults };
}

/**
 * Extracts the PRF output from an assertion.
 *
 * @returns The 32-byte PRF output, or null when the authenticator produced none or produced one
 *   of an unexpected width. A wrong-width result is refused rather than padded or truncated,
 *   because silently reshaping key material would produce a wrong key instead of a clear failure.
 */
export function extractPrfOutput(response: CeremonyResponse): Uint8Array | null {
    const first = readPrfOutput(response)?.results?.first;
    if (!first) {
        return null;
    }

    const bytes = first instanceof Uint8Array ? first : new Uint8Array(first);
    return bytes.length === PRF_OUTPUT_BYTES ? bytes : null;
}

/**
 * Reports whether a registration produced a credential that actually supports PRF.
 *
 * `enabled` is reported only during registration (§10.1.4). A credential without it cannot wrap
 * the identity, so registration must fail rather than fall back to something weaker - a silent
 * downgrade would leave the user believing they have a working unlock factor.
 */
export function isPasskeySupportedResult(response: CeremonyResponse): boolean {
    return readPrfOutput(response)?.enabled === true;
}

/**
 * Reports whether this browser exposes the WebAuthn API at all.
 *
 * Capability detection is intentionally conservative: the passkey branch is offered only when the
 * API is present, and the recovery-phrase route is always available regardless.
 */
export function browserSupportsPasskeys(): boolean {
    return (
        typeof window !== "undefined" &&
        typeof window.PublicKeyCredential === "function" &&
        typeof navigator !== "undefined" &&
        navigator.credentials != null &&
        typeof navigator.credentials.create === "function"
    );
}
