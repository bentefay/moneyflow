/**
 * Live Supabase Realtime stack helpers for HS-015 websocket security tests.
 *
 * These talk to the running local Supabase containers so the socket assertions exercise the real
 * Realtime server, its JWT verification and the real `realtime.messages` / `vault_ops` RLS policies
 * rather than a mock. Nothing here logs or returns secret material: the symmetric signing key is
 * derived into memory only, and fixtures use public test vectors.
 */

import { execFileSync } from "node:child_process";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const DB_CONTAINER = "supabase_db_moneyflow";
const REALTIME_CONTAINER = "supabase_realtime_moneyflow";
const NO_PREVIOUS_GRANT_ID = "00000000-0000-0000-0000-000000000000";

export interface RealtimeStack {
    readonly supabaseUrl: string;
    readonly anonKey: string;
    /** HS256 key the local Realtime server verifies with. Never log or serialize this. */
    readonly jwtSecret: string;
}

export interface VaultGrant {
    readonly grantId: string;
    readonly vaultRole: "owner" | "member";
    readonly expiresAt: string;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readLocalEnvironment(): Readonly<Record<string, string>> {
    const entries = readFileSync(".env.local", "utf8")
        .split(/\r?\n/)
        .filter((line) => line.length > 0 && !line.startsWith("#"))
        .flatMap((line) => {
            const separator = line.indexOf("=");
            return separator > 0 ? [[line.slice(0, separator), line.slice(separator + 1)]] : [];
        });
    return Object.fromEntries(entries);
}

/**
 * Derives the local Realtime symmetric verification key, mirroring `playwright.config.ts`. An
 * inherited server-only `SUPABASE_JWT_SECRET` wins so CI can supply it without Docker inspection.
 */
function requireLocalRealtimeJwtSecret(): string {
    const inherited = process.env.SUPABASE_JWT_SECRET;
    if (inherited && Buffer.byteLength(inherited, "utf8") >= 32) return inherited;

    const containerEnvironment = execFileSync(
        "docker",
        ["inspect", REALTIME_CONTAINER, "--format", "{{range .Config.Env}}{{println .}}{{end}}"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
    const jwksLine = containerEnvironment
        .split("\n")
        .find((line) => line.startsWith("API_JWT_JWKS="));
    const parsed: unknown = jwksLine ? JSON.parse(jwksLine.slice("API_JWT_JWKS=".length)) : null;
    const keys = isUnknownRecord(parsed) ? parsed.keys : null;
    if (!Array.isArray(keys)) throw new Error("Local Realtime JWKS is unavailable");
    const symmetric = keys.find(
        (key): key is { kty: "oct"; k: string } =>
            isUnknownRecord(key) && key.kty === "oct" && typeof key.k === "string"
    );
    const secret = symmetric ? Buffer.from(symmetric.k, "base64url").toString("utf8") : "";
    if (Buffer.byteLength(secret, "utf8") < 32) {
        throw new Error("Local Realtime symmetric key is unusable");
    }
    return secret;
}

/**
 * Resolves the running local stack, or throws with the exact missing capability. The realtime
 * security suite is meaningless without a real server, so it fails loudly rather than skipping.
 */
export function requireRealtimeStack(): RealtimeStack {
    const environment = readLocalEnvironment();
    const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? environment.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? environment.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
        throw new Error(
            "Realtime security tests require NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. Run `pnpm db:start`."
        );
    }
    try {
        return { supabaseUrl, anonKey, jwtSecret: requireLocalRealtimeJwtSecret() };
    } catch (cause) {
        throw new Error(
            "Realtime security tests require the running local Supabase Realtime stack or a server-only SUPABASE_JWT_SECRET. Run `pnpm db:start`.",
            { cause }
        );
    }
}

/** Runs SQL as the database superuser, returning unaligned tuple-only rows. */
export function runSql(statement: string): string {
    return execFileSync(
        "docker",
        [
            "exec",
            "-i",
            DB_CONTAINER,
            "psql",
            "-U",
            "postgres",
            "-d",
            "postgres",
            "-X",
            "-q",
            "-t",
            "-A"
        ],
        { input: statement, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    );
}

/** Runs SQL expected to be rejected, returning the SQLSTATE the database raised. */
export function runSqlExpectingDenial(statement: string): string {
    try {
        runSql(`\\set ON_ERROR_STOP on\n${statement}`);
    } catch (error) {
        const stderr = isUnknownRecord(error) ? error.stderr : null;
        const text = typeof stderr === "string" ? stderr : String(error);
        // psql prints the message; the RPCs raise a single documented denial code.
        if (/realtime grant (rotation )?denied|vault access denied|permission denied/.test(text)) {
            return "42501";
        }
        return text.trim().slice(0, 200);
    }
    return "";
}

/** Deterministic, obviously-synthetic identity hash. Never a real key. */
export function testIdentityHash(label: string): string {
    return createHash("sha256").update(`hs015-${label}-${randomUUID()}`).digest("hex");
}

export function createVaultOwnedBy(ownerHash: string): string {
    return runSql(
        `SELECT public.create_vault_for_owner('${ownerHash}', 'd3JhcHBlZA==', 'cHVibGlj');`
    ).trim();
}

export function addVaultMember(vaultId: string, memberHash: string): void {
    runSql(
        `INSERT INTO public.vault_memberships (vault_id, pubkey_hash, encrypted_vault_key, role, enc_public_key)
         VALUES ('${vaultId}'::uuid, '${memberHash}', 'd3JhcHBlZA==', 'member', 'cHVibGlj');`
    );
}

export function removeVaultMember(vaultId: string, memberHash: string): void {
    runSql(
        `DELETE FROM public.vault_memberships WHERE vault_id = '${vaultId}'::uuid AND pubkey_hash = '${memberHash}';`
    );
}

/** Mints a grant exactly as the tRPC router does, through the pubkey-hash-verifying RPC. */
export function rotateGrant(
    pubkeyHash: string,
    vaultId: string,
    purpose: "sync" | "presence" = "sync",
    previousGrantId: string = NO_PREVIOUS_GRANT_ID
): VaultGrant {
    const row = runSql(
        `SELECT grant_id || '|' || vault_role || '|' || expires_at
         FROM public.rotate_realtime_grant('${pubkeyHash}', '${vaultId}'::uuid, '${purpose}', '${previousGrantId}'::uuid, 60);`
    ).trim();
    const [grantId, vaultRole, expiresAt] = row.split("|");
    if (!grantId || (vaultRole !== "owner" && vaultRole !== "member") || !expiresAt) {
        throw new Error("Realtime grant fixture could not be minted");
    }
    return { grantId, vaultRole, expiresAt };
}

export function revokeGrant(
    pubkeyHash: string,
    vaultId: string,
    grantId: string,
    purpose: "sync" | "presence" = "sync"
): boolean {
    return (
        runSql(
            `SELECT public.revoke_realtime_grant('${pubkeyHash}', '${vaultId}'::uuid, '${purpose}', '${grantId}'::uuid);`
        ).trim() === "t"
    );
}

/** Appends an encrypted op through the same server-verified path the tRPC sync router uses. */
export function appendVaultOp(vaultId: string, authorHash: string): string {
    const operationId = randomUUID();
    runSql(
        `SELECT public.append_vault_ops('${vaultId}'::uuid, '${authorHash}',
         '[{"id":"${operationId}","encrypted_data":"aHMwMTUtZW5jcnlwdGVkLW9w","version_vector":"e30="}]'::jsonb);`
    );
    return operationId;
}

export interface RealtimeTokenClaims {
    readonly grantId: string;
    readonly vaultId: string;
    readonly purpose?: "sync" | "presence";
    readonly vaultRole?: "owner" | "member";
    readonly realtimeTable?: string;
    readonly realtimeTopic?: string;
    /** Negative values mint an already-expired token. */
    readonly lifetimeSeconds?: number;
}

/**
 * Mints a Realtime JWT with the same claim set as `src/server/routers/realtime.ts`, allowing
 * individual claims to be widened so the server's own enforcement can be observed.
 */
export function mintRealtimeToken(
    stack: RealtimeStack,
    claims: RealtimeTokenClaims,
    options: { readonly secret?: string; readonly corruptSignature?: boolean } = {}
): string {
    const purpose = claims.purpose ?? "sync";
    const lifetimeSeconds = claims.lifetimeSeconds ?? 60;
    const nowSeconds = Math.floor(Date.now() / 1000);
    // An expired token must also have an issue time in the past to be internally consistent.
    const issuedAtSeconds = lifetimeSeconds < 0 ? nowSeconds + lifetimeSeconds - 60 : nowSeconds;
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" }), "utf8").toString(
        "base64url"
    );
    const payload = Buffer.from(
        JSON.stringify({
            iss: "moneyflow",
            aud: "authenticated",
            sub: claims.grantId,
            jti: claims.grantId,
            role: "authenticated",
            iat: issuedAtSeconds,
            nbf: issuedAtSeconds - 5,
            exp: issuedAtSeconds + Math.abs(lifetimeSeconds),
            vault_id: claims.vaultId,
            realtime_table: claims.realtimeTable ?? "vault_ops",
            realtime_purpose: purpose,
            realtime_topic: claims.realtimeTopic ?? `vault:${claims.vaultId}:${purpose}`,
            vault_role: claims.vaultRole ?? "owner"
        }),
        "utf8"
    ).toString("base64url");
    const unsigned = `${header}.${payload}`;
    const signature = createHmac("sha256", options.secret ?? stack.jwtSecret)
        .update(unsigned)
        .digest("base64url");

    return options.corruptSignature
        ? `${unsigned}.${signature.slice(0, -4)}AAAA`
        : `${unsigned}.${signature}`;
}

export interface VaultOpsSocket {
    /** Resolves `true` when the channel joined and the server confirmed a vault_ops subscription. */
    readonly authorized: Promise<boolean>;
    /** Ids of `vault_ops` rows this socket was actually allowed to receive. */
    readonly receivedOperationIds: readonly string[];
    close(): void;
}

/**
 * Opens a raw Realtime websocket and requests the private `vault_ops` subscription exactly as
 * `VaultRealtimeSync` does, so the server decides authorization from the token alone.
 */
export function openVaultOpsSocket(
    stack: RealtimeStack,
    vaultId: string,
    token: string,
    options: { readonly authorizationTimeoutMs?: number } = {}
): VaultOpsSocket {
    const socketUrl = `${stack.supabaseUrl.replace(/^http/, "ws")}/realtime/v1/websocket?apikey=${stack.anonKey}&vsn=1.0.0`;
    const received: string[] = [];
    const authorization = Promise.withResolvers<boolean>();
    let settled = false;
    const settle = (value: boolean) => {
        if (settled) return;
        settled = true;
        authorization.resolve(value);
    };
    // A denied join is silent: the server simply never confirms the subscription.
    const denialTimer = setTimeout(() => settle(false), options.authorizationTimeoutMs ?? 6_000);
    const socket = new WebSocket(socketUrl);

    socket.addEventListener("open", () => {
        socket.send(
            JSON.stringify({
                topic: `realtime:vault:${vaultId}:sync`,
                event: "phx_join",
                ref: "1",
                payload: {
                    config: {
                        private: true,
                        broadcast: { ack: false, self: false },
                        presence: { key: "" },
                        postgres_changes: [
                            {
                                event: "INSERT",
                                schema: "public",
                                table: "vault_ops",
                                filter: `vault_id=eq.${vaultId}`
                            }
                        ]
                    },
                    access_token: token
                }
            })
        );
    });

    socket.addEventListener("message", (event: MessageEvent<string>) => {
        const frame: unknown = JSON.parse(event.data);
        if (!isUnknownRecord(frame)) return;
        const payload = isUnknownRecord(frame.payload) ? frame.payload : null;

        if (frame.event === "phx_reply" && payload?.status !== "ok") settle(false);
        if (frame.event === "system") {
            if (payload?.status === "ok" && payload.extension === "postgres_changes") settle(true);
            if (payload?.status === "error") settle(false);
        }
        if (frame.event === "postgres_changes") {
            const data = isUnknownRecord(payload?.data) ? payload.data : null;
            const record = isUnknownRecord(data?.record) ? data.record : null;
            if (typeof record?.id === "string") received.push(record.id);
        }
    });

    socket.addEventListener("error", () => settle(false));
    socket.addEventListener("close", () => settle(false));

    return {
        authorized: authorization.promise.finally(() => clearTimeout(denialTimer)),
        get receivedOperationIds() {
            return [...received];
        },
        close() {
            clearTimeout(denialTimer);
            settle(false);
            socket.close();
        }
    };
}

/** Waits for a convergence predicate without asserting any wall-clock duration. */
export async function waitUntil(
    predicate: () => boolean,
    options: { readonly timeoutMs?: number; readonly intervalMs?: number } = {}
): Promise<boolean> {
    const deadline = Date.now() + (options.timeoutMs ?? 10_000);
    const intervalMs = options.intervalMs ?? 100;
    while (Date.now() < deadline) {
        if (predicate()) return true;
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return predicate();
}

/** Drops every fixture row this suite created, leaving the local database as it was found. */
export function cleanUpVaultFixtures(vaultIds: readonly string[]): void {
    if (vaultIds.length === 0) return;
    const list = vaultIds.map((vaultId) => `'${vaultId}'::uuid`).join(", ");
    runSql(
        `\\set ON_ERROR_STOP on
         BEGIN;
         ALTER TABLE public.vault_ops DISABLE TRIGGER vault_ops_append_only;
         DELETE FROM public.vault_ops WHERE vault_id IN (${list});
         ALTER TABLE public.vault_ops ENABLE TRIGGER vault_ops_append_only;
         DELETE FROM public.realtime_grants WHERE vault_id IN (${list});
         DELETE FROM public.vault_memberships WHERE vault_id IN (${list});
         DELETE FROM public.vaults WHERE id IN (${list});
         COMMIT;`
    );
}
