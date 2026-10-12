/**
 * Resolves the secret the app signs Realtime tokens with, for local development and tests.
 *
 * Shared by `run dev`, `playwright.config.ts` and the integration tests, so it must stay free of
 * Bun APIs and anything outside `node:`. An inherited `SUPABASE_JWT_SECRET` wins, so CI and hosted
 * environments supply it directly; otherwise it is read from the local Realtime container's JWKS.
 */
import { execFileSync } from "node:child_process";

export const REALTIME_CONTAINER = "supabase_realtime_moneyflow";

const MINIMUM_SECRET_BYTES = 32;

export type RealtimeJwtSecret =
    | { readonly ok: true; readonly secret: string; readonly source: "environment" | "container" }
    | { readonly ok: false; readonly reason: string };

const isUnknownRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
    typeof value === "object" && value !== null;

const isUsable = (secret: string): boolean =>
    Buffer.byteLength(secret, "utf8") >= MINIMUM_SECRET_BYTES;

const parseJson = (text: string): unknown => {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
};

/** Extracts the symmetric key from a container's `KEY=value` environment listing. */
export const secretFromRealtimeEnvironment = (containerEnvironment: string): RealtimeJwtSecret => {
    const prefix = "API_JWT_JWKS=";
    const jwksLine = containerEnvironment.split("\n").find((line) => line.startsWith(prefix));
    if (jwksLine == null)
        return { ok: false, reason: "the Realtime container has no API_JWT_JWKS" };

    const jwks = parseJson(jwksLine.slice(prefix.length));
    const keys = isUnknownRecord(jwks) ? jwks.keys : null;
    if (!Array.isArray(keys)) return { ok: false, reason: "the Realtime JWKS has no key list" };

    const symmetricKey = keys.find(
        (key): key is { readonly kty: "oct"; readonly k: string } =>
            isUnknownRecord(key) && key.kty === "oct" && typeof key.k === "string"
    );
    if (symmetricKey == null)
        return { ok: false, reason: "the Realtime JWKS has no symmetric key" };

    const secret = Buffer.from(symmetricKey.k, "base64url").toString("utf8");
    return isUsable(secret)
        ? { ok: true, secret, source: "container" }
        : { ok: false, reason: "the Realtime symmetric key is shorter than 32 bytes" };
};

const readContainerEnvironment = (): string | null => {
    try {
        return execFileSync(
            "docker",
            [
                "inspect",
                REALTIME_CONTAINER,
                "--format",
                "{{range .Config.Env}}{{println .}}{{end}}"
            ],
            { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
        );
    } catch {
        return null;
    }
};

export const resolveRealtimeJwtSecret = (
    inherited: string | undefined = process.env.SUPABASE_JWT_SECRET
): RealtimeJwtSecret => {
    if (inherited != null && isUsable(inherited)) {
        return { ok: true, secret: inherited, source: "environment" };
    }
    const containerEnvironment = readContainerEnvironment();
    return containerEnvironment == null
        ? { ok: false, reason: `the ${REALTIME_CONTAINER} container is not running` }
        : secretFromRealtimeEnvironment(containerEnvironment);
};
