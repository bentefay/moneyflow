/**
 * Loro ephemeral presence protocol (HS-003).
 *
 * Presence lives in a Loro `EphemeralStore`: a separate, history-free, timestamp-LWW CRDT whose
 * operations never enter the vault `LoroDoc`, IndexedDB or server storage. Each browsing session
 * owns exactly one store key (its session id), so two tabs of the same identity never collide.
 *
 * Wire shape, per broadcast:
 *
 *     { v: 1, vaultId, sessionId, nonce: base64, ciphertext: base64 }
 *
 * `ciphertext` is the raw `EphemeralStore.encode(sessionId)` bytes sealed with XChaCha20-Poly1305
 * under the vault-derived presence key. The envelope fields are authenticated as AEAD additional
 * data, so a payload cannot be re-labelled onto another vault, session or protocol version without
 * failing the Poly1305 tag. Combined with the P05 topic grant (which already binds the socket to
 * one vault), this makes cross-vault and cross-session injection unforgeable rather than merely
 * filtered.
 *
 * Everything here is pure over its inputs. Transport, timers and React live in the manager and hook
 * layers so this module stays directly testable.
 */

import sodium from "libsodium-wrappers";
import { z } from "zod";

import { initCrypto } from "@/lib/crypto/keypair";

/**
 * Protocol version. Receivers ignore anything they do not recognise, so a future version can be
 * rolled out without a flag day: old peers drop new payloads instead of misreading them.
 */
export const PRESENCE_PROTOCOL_VERSION = 1;

/** How long a session's presence survives without a refresh, in milliseconds. */
export const PRESENCE_TIMEOUT_MS = 30000;

/**
 * How often a session re-publishes its unchanged state. Comfortably inside
 * {@link PRESENCE_TIMEOUT_MS} so a live peer never flickers, but sparse enough that an idle vault
 * costs one small frame per session per interval rather than a heartbeat storm.
 */
export const PRESENCE_REFRESH_MS = 10000;

/** Nonce size for XChaCha20-Poly1305 AEAD (24 bytes). */
const AEAD_NONCE_BYTES = 24;

/** Key size for XChaCha20-Poly1305 AEAD (32 bytes). */
const AEAD_KEY_BYTES = 32;

/**
 * Editing focus within a row. A field is identified by its stable cell name, never by its value, so
 * no financial text can travel in a presence payload.
 */
/** Collapses Loro's `null` encoding of an absent property back to `undefined`. */
function nullToUndefined<T>(value: T | null | undefined): T | undefined {
    return value ?? undefined;
}

export const presenceFieldSchema = z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9:_-]+$/);

/**
 * What one session is currently doing. `transactionId` and `field` are absent when the session is
 * connected but not focused on a row, which is how blur, route change and unmount are expressed.
 *
 * Loro encodes an explicit `undefined` property as `null`, so "absent" arrives across the wire in
 * either form. Both are accepted and normalised back to `undefined`, and {@link createPresenceEntry}
 * omits the keys entirely so what we publish has a single canonical shape.
 */
export const presenceStateSchema = z
    .object({
        transactionId: z.string().min(1).max(128).nullish().transform(nullToUndefined),
        field: presenceFieldSchema.nullish().transform(nullToUndefined),
        editing: z.boolean()
    })
    .strict();

/**
 * Declared rather than inferred: the schema's `transform` widens absent fields to required-but-
 * undefined, whereas the domain genuinely has three optional-field shapes. Zod stays the boundary
 * validator; this is the type the app programs against.
 */
export type PresenceState = {
    transactionId?: string;
    field?: string;
    editing: boolean;
};

/**
 * The value stored under a session's `EphemeralStore` key. `pubkeyHash` is the identity to render;
 * `sessionId` is repeated inside the encrypted body so a relabelled envelope is detected even if an
 * attacker somehow obtained the presence key.
 */
export const presenceEntrySchema = z
    .object({
        v: z.literal(PRESENCE_PROTOCOL_VERSION),
        sessionId: z.string().min(1).max(128),
        pubkeyHash: z.string().regex(/^[0-9a-f]{64}$/),
        state: presenceStateSchema
    })
    .strict();

/**
 * Declared alongside {@link PresenceState} for the same reason: the schema transforms its output.
 * Both are type aliases rather than interfaces so they satisfy Loro's `Value` constraint, which
 * needs the implicit index signature TypeScript grants aliases but withholds from interfaces.
 */
export type PresenceEntry = {
    v: typeof PRESENCE_PROTOCOL_VERSION;
    sessionId: string;
    pubkeyHash: string;
    state: PresenceState;
};

/** The transport envelope carrying one encrypted ephemeral update. */
export const presenceEnvelopeSchema = z
    .object({
        v: z.literal(PRESENCE_PROTOCOL_VERSION),
        vaultId: z.string().min(1).max(128),
        sessionId: z.string().min(1).max(128),
        nonce: z.string().min(1),
        ciphertext: z.string().min(1)
    })
    .strict();

export type PresenceEnvelope = z.infer<typeof presenceEnvelopeSchema>;

/** A remote session as presented to the UI. */
export interface PresenceSession {
    readonly sessionId: string;
    readonly pubkeyHash: string;
    readonly state: PresenceState;
}

/** Row-level presence derived from all live sessions, keyed by transaction id. */
export interface TransactionPresence {
    readonly focusedBy: readonly string[];
    readonly editingBy: readonly string[];
    readonly fields: readonly string[];
}

/**
 * Additional authenticated data binding a ciphertext to its envelope. Any tampering with version,
 * vault or session makes decryption fail rather than merely mismatch a later check.
 */
function envelopeAad(vaultId: string, sessionId: string): Uint8Array {
    // NUL separators make the field boundaries unambiguous, so no combination of vault and
    // session ids can produce the same AAD as a different pair. `Uint8Array.from` normalises
    // TextEncoder's cross-realm result, which libsodium rejects under jsdom.
    return Uint8Array.from(
        new TextEncoder().encode(`${PRESENCE_PROTOCOL_VERSION}\u0000${vaultId}\u0000${sessionId}`)
    );
}

function toBase64(bytes: Uint8Array): string {
    return sodium.to_base64(bytes, sodium.base64_variants.ORIGINAL);
}

function fromBase64(text: string): Uint8Array | undefined {
    try {
        return sodium.from_base64(text, sodium.base64_variants.ORIGINAL);
    } catch {
        return undefined;
    }
}

/**
 * Seals raw ephemeral update bytes into a transport envelope.
 *
 * @param update - Raw `EphemeralStore.encode(sessionId)` bytes
 * @param context - Vault and session this update belongs to
 * @param presenceKey - 32-byte vault-derived presence key
 */
export async function sealPresenceUpdate(
    update: Uint8Array,
    context: { readonly vaultId: string; readonly sessionId: string },
    presenceKey: Uint8Array
): Promise<PresenceEnvelope> {
    await initCrypto();
    if (presenceKey.length !== AEAD_KEY_BYTES) {
        throw new Error(`Presence key must be ${AEAD_KEY_BYTES} bytes`);
    }

    const nonce = sodium.randombytes_buf(AEAD_NONCE_BYTES);
    const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
        Uint8Array.from(update),
        envelopeAad(context.vaultId, context.sessionId),
        null,
        nonce,
        Uint8Array.from(presenceKey)
    );

    return {
        v: PRESENCE_PROTOCOL_VERSION,
        vaultId: context.vaultId,
        sessionId: context.sessionId,
        nonce: toBase64(nonce),
        ciphertext: toBase64(ciphertext)
    };
}

/** Why an inbound payload was refused. Surfaced for metrics/tests, never for user-facing text. */
export type PresenceRejectionReason =
    | "malformed"
    | "unsupported-version"
    | "foreign-vault"
    | "own-session"
    | "undecryptable";

export type PresenceOpenResult =
    | { readonly ok: true; readonly sessionId: string; readonly update: Uint8Array }
    | { readonly ok: false; readonly reason: PresenceRejectionReason };

/**
 * Validates and decrypts an inbound payload of unknown shape.
 *
 * Rejects, in order: anything failing schema validation (which includes an unrecognised version),
 * a payload labelled for another vault, our own echo, and finally anything whose AEAD tag does not
 * verify under the presence key. A caller that receives `ok: true` still may not trust the key the
 * bytes claim — see {@link applyPresenceUpdate}.
 */
export async function openPresenceEnvelope(
    payload: unknown,
    context: { readonly vaultId: string; readonly sessionId: string },
    presenceKey: Uint8Array
): Promise<PresenceOpenResult> {
    await initCrypto();

    const parsed = presenceEnvelopeSchema.safeParse(payload);
    if (!parsed.success) {
        const versioned = z.object({ v: z.number() }).safeParse(payload);
        return {
            ok: false,
            reason:
                versioned.success && versioned.data.v !== PRESENCE_PROTOCOL_VERSION
                    ? "unsupported-version"
                    : "malformed"
        };
    }

    const envelope = parsed.data;
    if (envelope.vaultId !== context.vaultId) return { ok: false, reason: "foreign-vault" };
    if (envelope.sessionId === context.sessionId) return { ok: false, reason: "own-session" };

    const nonce = fromBase64(envelope.nonce);
    const ciphertext = fromBase64(envelope.ciphertext);
    if (nonce == null || ciphertext == null || nonce.length !== AEAD_NONCE_BYTES) {
        return { ok: false, reason: "malformed" };
    }

    try {
        const update = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
            null,
            ciphertext,
            envelopeAad(envelope.vaultId, envelope.sessionId),
            nonce,
            Uint8Array.from(presenceKey)
        );
        return { ok: true, sessionId: envelope.sessionId, update };
    } catch {
        return { ok: false, reason: "undecryptable" };
    }
}

/**
 * The subset of `EphemeralStore` this module needs. Declaring it structurally keeps the protocol
 * unit-testable without a live store and documents exactly which Loro surface we depend on.
 */
export interface EphemeralStoreLike {
    apply(bytes: Uint8Array): void;
    keys(): string[];
    delete(key: string): void;
    get(key: string): unknown;
    getAllStates(): Record<string, unknown>;
}

/**
 * Applies a decrypted update to a store, but only if it writes exactly the session key it claims.
 *
 * Loro's `apply` will happily write whatever keys the bytes contain, so a member could otherwise
 * author an update under a *different* session's key and puppet that peer's indicator. We stage
 * into a scratch store first, verify the claimed key set is exactly `{sessionId}` and that the
 * decoded entry agrees with the envelope, then apply to the live store. The scratch store is
 * cleared either way so a rejected message leaves no residue.
 *
 * @returns true when the update was accepted into `store`
 */
export function applyPresenceUpdate(
    store: EphemeralStoreLike,
    scratch: EphemeralStoreLike,
    sessionId: string,
    update: Uint8Array
): boolean {
    const claimed = ((): { readonly keys: readonly string[]; readonly entry: unknown } => {
        try {
            scratch.apply(update);
            return { keys: [...scratch.keys()], entry: scratch.get(sessionId) };
        } catch {
            // Loro throws on truncated or corrupt frames; treat them as unroutable.
            return { keys: [], entry: undefined };
        } finally {
            for (const key of scratch.keys()) scratch.delete(key);
        }
    })();

    if (claimed.keys.length !== 1 || claimed.keys[0] !== sessionId) return false;

    const entry = presenceEntrySchema.safeParse(claimed.entry);
    if (!entry.success || entry.data.sessionId !== sessionId) return false;

    try {
        store.apply(update);
        return true;
    } catch {
        return false;
    }
}

/**
 * Reads every well-formed session out of a store, dropping our own and anything malformed.
 *
 * Expiry needs no work here: Loro omits timed-out keys from `getAllStates`, so a session that
 * stopped refreshing simply stops being returned.
 */
export function readPresenceSessions(
    store: Pick<EphemeralStoreLike, "getAllStates">,
    ownSessionId: string
): readonly PresenceSession[] {
    return Object.entries(store.getAllStates()).flatMap(([key, value]) => {
        if (key === ownSessionId) return [];
        const entry = presenceEntrySchema.safeParse(value);
        if (!entry.success || entry.data.sessionId !== key) return [];
        return [
            {
                sessionId: entry.data.sessionId,
                pubkeyHash: entry.data.pubkeyHash,
                state: entry.data.state
            }
        ];
    });
}

/** Distinct values in first-seen order. */
function distinct(values: readonly string[]): readonly string[] {
    return [...new Set(values)];
}

/**
 * Projects live sessions into per-transaction presence for the table.
 *
 * Identities are deduplicated so a member with three tabs on one row renders once, while the
 * underlying sessions stay distinct in {@link readPresenceSessions} for anyone who needs them.
 */
export function buildTransactionPresence(
    sessions: readonly PresenceSession[]
): Readonly<Record<string, TransactionPresence>> {
    const byTransaction = new Map<
        string,
        { focusedBy: string[]; editingBy: string[]; fields: string[] }
    >();

    for (const session of sessions) {
        const transactionId = session.state.transactionId;
        if (transactionId == null) continue;

        const bucket = byTransaction.get(transactionId) ?? {
            focusedBy: [],
            editingBy: [],
            fields: []
        };
        bucket.focusedBy.push(session.pubkeyHash);
        if (session.state.editing) bucket.editingBy.push(session.pubkeyHash);
        if (session.state.field != null) bucket.fields.push(session.state.field);
        byTransaction.set(transactionId, bucket);
    }

    return Object.fromEntries(
        [...byTransaction].map(([transactionId, bucket]) => [
            transactionId,
            {
                focusedBy: distinct(bucket.focusedBy),
                editingBy: distinct(bucket.editingBy),
                fields: distinct(bucket.fields)
            }
        ])
    );
}

/** Identities with at least one live session, for the header avatar group. */
export function readOnlineIdentities(sessions: readonly PresenceSession[]): readonly string[] {
    return distinct(sessions.map((session) => session.pubkeyHash));
}

/**
 * Builds the entry this session publishes for a given focus state.
 *
 * Absent fields are omitted rather than set to `undefined`, so an idle session encodes the same
 * bytes every refresh instead of alternating between omitted and null-valued keys.
 */
export function createPresenceEntry(
    sessionId: string,
    pubkeyHash: string,
    state: PresenceState
): PresenceEntry {
    return {
        v: PRESENCE_PROTOCOL_VERSION,
        sessionId,
        pubkeyHash,
        state: {
            ...(state.transactionId == null ? {} : { transactionId: state.transactionId }),
            ...(state.field == null ? {} : { field: state.field }),
            editing: state.editing
        }
    };
}

/** True when two states are equivalent, so an unchanged focus does not trigger a broadcast. */
export function isSamePresenceState(left: PresenceState, right: PresenceState): boolean {
    return (
        left.transactionId === right.transactionId &&
        left.field === right.field &&
        left.editing === right.editing
    );
}

/** The state of a session that is connected but not focused on any row. */
export const IDLE_PRESENCE_STATE: PresenceState = { editing: false };
