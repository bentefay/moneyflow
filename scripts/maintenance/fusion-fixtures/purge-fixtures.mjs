#!/usr/bin/env node
/**
 * MF-006 — guarded purge of leaked vault test-fixture rows from a LOCAL Supabase database.
 *
 * Modes
 *   --build-manifest   read-only: classify, freeze the UUID manifest + digests to JSON
 *   (default)          dry run: revalidate a manifest, report what WOULD be deleted, mutate nothing
 *   --apply --confirm  execute: one transaction, advisory + table locks, bounded child-first deletes
 *   --vacuum           separate autocommit connection: VACUUM ANALYZE each of the seven base tables
 *
 * Safety contract implemented here (see PROMPT.md):
 *   - local docker exec only; never a network URL, never hosted credentials
 *   - one persistent `psql -X -v ON_ERROR_STOP=1` session; any SQL error kills the process nonzero
 *     with the open transaction rolled back
 *   - pg_try_advisory_xact_lock fail-fast duplicate-run refusal
 *   - SHARE ROW EXCLUSIVE on all seven tables in deletion order (fences writers, allows SELECT)
 *   - post-lock revalidation of every selected row's content digest against the frozen manifest;
 *     any drift aborts, nothing is silently expanded
 *   - <= --batch-size (default 1000) rows per issued DELETE, each table drained before the next
 *   - `SET LOCAL session_replication_role = replica` only inside the transaction, restored to
 *     `origin` before the final assertions and COMMIT
 *   - nonselected ordered content fingerprints asserted unchanged, orphan counts asserted unchanged
 *
 * Digests are computed server-side over md5(row) aggregates: no ciphertext or financial payload is
 * ever read into this process or written to an artifact.
 */

import { spawn, execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const HERE = dirname(fileURLToPath(import.meta.url));

/** Child tables drained in FK-safe order, then `vaults` last. */
export const CHILD_TABLE_ORDER = Object.freeze([
    "realtime_grants",
    "vault_ops",
    "vault_updates_legacy",
    "vault_snapshots",
    "vault_invites",
    "vault_memberships"
]);

/** All seven base tables, in the order locks are taken and deletes are issued. */
export const ALL_TABLES = Object.freeze([...CHILD_TABLE_ORDER, "vaults"]);

const FIELD_SEPARATOR = "\u001f";
const SENTINEL = "__MF006_END_OF_STATEMENT__";
const ADVISORY_LOCK_KEY = "906006006006";
const MANIFEST_TEMP_TABLE = "mf006_manifest";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?[+-]\d{2}(:\d{2})?$/;

export const DEFAULT_CONTAINER = "supabase_db_moneyflow";
export const DEFAULT_DATABASE = "postgres";
export const DEFAULT_USER = "postgres";
export const DEFAULT_BATCH_SIZE = 1000;

// ---------------------------------------------------------------------------
// psql session
// ---------------------------------------------------------------------------

/**
 * A single long-lived `psql` process reached through `docker exec`.
 *
 * Statements are written to stdin and terminated with an `\echo` sentinel so each call reads back
 * exactly its own rows. With ON_ERROR_STOP=1 psql exits on the first error, so a rejected query
 * always means "the session is gone and any open transaction rolled back" — never "carried on".
 */
export class PsqlSession {
    #proc = null;
    #stdout = "";
    #stderr = "";
    #pending = null;
    #exited = null;

    constructor({
        container = DEFAULT_CONTAINER,
        database = DEFAULT_DATABASE,
        user = DEFAULT_USER
    } = {}) {
        this.container = container;
        this.database = database;
        this.user = user;
    }

    start() {
        this.#proc = spawn(
            "docker",
            [
                "exec",
                "-i",
                this.container,
                "psql",
                "-X",
                "-v",
                "ON_ERROR_STOP=1",
                "-q",
                "-A",
                "-t",
                "-F",
                FIELD_SEPARATOR,
                "-U",
                this.user,
                "-d",
                this.database
            ],
            { stdio: ["pipe", "pipe", "pipe"] }
        );

        this.#proc.stdout.setEncoding("utf8");
        this.#proc.stderr.setEncoding("utf8");
        this.#proc.stdout.on("data", (chunk) => {
            this.#stdout += chunk;
            this.#drain();
        });
        this.#proc.stderr.on("data", (chunk) => {
            this.#stderr += chunk;
        });
        this.#proc.on("exit", (code, signal) => {
            this.#exited = { code, signal };
            const pending = this.#pending;
            this.#pending = null;
            pending?.reject(
                new Error(
                    `psql session ended (code=${code} signal=${signal ?? "none"}) during:\n${pending.sql}\n${this.#stderr.trim()}`
                )
            );
        });
        return this;
    }

    #drain() {
        if (this.#pending === null) return;
        const marker = `${SENTINEL}\n`;
        const at = this.#stdout.indexOf(marker);
        if (at === -1) return;
        const payload = this.#stdout.slice(0, at);
        this.#stdout = this.#stdout.slice(at + marker.length);
        const pending = this.#pending;
        this.#pending = null;
        pending.resolve(
            payload
                .split("\n")
                .filter((line) => line.length > 0)
                .map((line) => line.split(FIELD_SEPARATOR))
        );
    }

    /** Run one statement (or psql meta-command) and return its rows as string cells. */
    query(sql) {
        if (this.#exited !== null) {
            return Promise.reject(
                new Error(`psql session already exited: ${JSON.stringify(this.#exited)}`)
            );
        }
        if (this.#pending !== null) {
            return Promise.reject(
                new Error("PsqlSession is single-flight; await the previous query")
            );
        }
        // psql buffers an unterminated statement, which would let the sentinel fire before the
        // statement ran. Terminate SQL explicitly; leave backslash meta-commands alone.
        const trimmed = sql.trim();
        const terminated =
            trimmed.startsWith("\\") || trimmed.endsWith(";") ? trimmed : `${trimmed};`;
        return new Promise((resolve, reject) => {
            this.#pending = { resolve, reject, sql };
            this.#proc.stdin.write(`${terminated}\n\\echo ${SENTINEL}\n`);
            this.#drain();
        });
    }

    /** Single-row single-column convenience. */
    async scalar(sql) {
        const rows = await this.query(sql);
        return rows.at(0)?.at(0) ?? null;
    }

    /** Timed variant used to report per-statement durations. */
    async timed(sql) {
        const startedAt = process.hrtime.bigint();
        const rows = await this.query(sql);
        const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
        return { rows, ms };
    }

    get stderr() {
        return this.#stderr;
    }

    /** Abrupt termination, used by the disconnect-rollback test. */
    kill() {
        this.#proc?.kill("SIGKILL");
    }

    async close() {
        if (this.#proc === null || this.#exited !== null) return this.#exited;
        const done = new Promise((resolve) =>
            this.#proc.once("exit", (code, signal) => resolve({ code, signal }))
        );
        this.#proc.stdin.end();
        return await done;
    }
}

// ---------------------------------------------------------------------------
// SQL helpers
// ---------------------------------------------------------------------------

/** Reject anything that is not a plain lowercase UUID before it reaches SQL. */
export function assertUuid(value) {
    if (typeof value !== "string" || !UUID_RE.test(value)) {
        throw new Error(`refusing non-UUID manifest entry: ${JSON.stringify(value)}`);
    }
    return value;
}

/**
 * Reject anything that is not a plain `YYYY-MM-DD HH:MM:SS[.ffffff]+HH[:MM]` timestamp.
 *
 * The cutoff is the one manifest field that reaches psql through `\set`, where it is interpolated
 * rather than bound. Stripping quotes is not validation: a newline would end the meta-command and
 * let the rest of the value run as SQL. Validate the shape before it is ever interpolated.
 */
export function assertTimestamp(value) {
    if (typeof value !== "string" || !TIMESTAMP_RE.test(value)) {
        throw new Error(`refusing non-timestamp cutoff: ${JSON.stringify(value)}`);
    }
    return value;
}

/** Deduplicate + sort so the manifest and every digest have one canonical ordering. */
export function normaliseVaultIds(ids) {
    const unique = [...new Set(ids.map((id) => assertUuid(String(id).trim().toLowerCase())))];
    unique.sort();
    return unique;
}

export function canonicalJson(value) {
    if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
    if (value !== null && typeof value === "object") {
        const keys = Object.keys(value).sort();
        return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
    }
    return JSON.stringify(value ?? null);
}

export function sha256(text) {
    return createHash("sha256").update(text, "utf8").digest("hex");
}

/** Extract the canonical predicate shared by manifest building and live selection. */
export function readSelectorBody(selectorPath = join(HERE, "fixture-selection.sql")) {
    const source = readFileSync(selectorPath, "utf8");
    const begin = source.indexOf("-- fixture-selection:begin");
    const end = source.indexOf("-- fixture-selection:end");
    if (begin === -1 || end === -1 || end < begin) {
        throw new Error(`fixture-selection.sql is missing its begin/end markers: ${selectorPath}`);
    }
    return {
        body: source.slice(begin, end + "-- fixture-selection:end".length),
        fileSha256: sha256(source)
    };
}

/**
 * Fingerprint of the structures this operation depends on: the seven tables' columns, their FK
 * actions, and their triggers. Any drift here aborts rather than widening the deletion.
 */
// NOTE: the aggregate is md5'd server-side so the result is a SINGLE output line. psql -A -t emits
// one row per line and PsqlSession#scalar reads the first line only, so a multi-line string_agg
// would silently digest just its first row and miss most schema drift.
const TABLE_LIST = ALL_TABLES.map((t) => `'${t}'`).join(", ");

// Names and actions alone are not enough: a replaced trigger FUNCTION keeps the same trigger name,
// and table locks do not fence `CREATE OR REPLACE FUNCTION`. The digest therefore covers full
// constraint definitions, full trigger definitions, trigger enabled state, the bodies of the
// functions those triggers call, and every INCOMING foreign key (including from tables outside the
// seven), so an unknown dependency appearing between freeze and commit fails closed.
const SCHEMA_DIGEST_SQL = `
SELECT md5(coalesce(string_agg(line, E'\\n' ORDER BY line), '')) FROM (
    SELECT format('col|%s|%s|%s|%s|%s|%s', c.table_name, c.ordinal_position, c.column_name,
                  c.data_type, c.is_nullable, coalesce(c.column_default, '')) AS line
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name IN (${TABLE_LIST})
    UNION ALL
    SELECT format('con|%s|%s|%s|%s', con.conrelid::regclass::text, con.conname, con.contype,
                  pg_get_constraintdef(con.oid))
    FROM pg_constraint con
    WHERE con.conrelid::regclass::text IN (${TABLE_LIST})
    UNION ALL
    SELECT format('infk|%s|%s|%s|%s', con.conrelid::regclass::text, con.confrelid::regclass::text,
                  con.conname, pg_get_constraintdef(con.oid))
    FROM pg_constraint con
    WHERE con.contype = 'f' AND con.confrelid::regclass::text IN (${TABLE_LIST})
    UNION ALL
    SELECT format('trg|%s|%s|%s|%s', tg.tgrelid::regclass::text, tg.tgname, tg.tgenabled,
                  pg_get_triggerdef(tg.oid))
    FROM pg_trigger tg
    WHERE NOT tg.tgisinternal
      AND tg.tgrelid::regclass::text IN (${TABLE_LIST})
    UNION ALL
    SELECT format('trgfn|%s|%s|%s', p.proname, p.provolatile, md5(p.prosrc))
    FROM pg_trigger tg
    JOIN pg_proc p ON p.oid = tg.tgfoid
    WHERE NOT tg.tgisinternal
      AND tg.tgrelid::regclass::text IN (${TABLE_LIST})
) s`;

export async function readSchemaDigest(session) {
    const raw = await session.scalar(SCHEMA_DIGEST_SQL);
    return sha256(raw ?? "");
}

const vaultKeyColumn = (table) => (table === "vaults" ? "id" : "vault_id");

/**
 * Ordered content digest for the rows of `table` that belong to (or are excluded from) the manifest.
 * md5(row) is aggregated server-side, so only a hash ever crosses the wire.
 */
function contentDigestSql(table, { selected }) {
    const key = vaultKeyColumn(table);
    const membership = selected ? "EXISTS" : "NOT EXISTS";
    return `
SELECT count(*)::text,
       coalesce(md5(string_agg(md5(t.*::text), '' ORDER BY t.id)), 'empty')
FROM public.${table} t
WHERE ${membership} (SELECT 1 FROM ${MANIFEST_TEMP_TABLE} m WHERE m.id = t.${key})`;
}

export async function readFingerprints(session, { selected }) {
    const out = {};
    for (const table of ALL_TABLES) {
        const row = (await session.query(contentDigestSql(table, { selected }))).at(0) ?? [
            "0",
            "empty"
        ];
        out[table] = { count: Number(row[0]), digest: row[1] };
    }
    return out;
}

/** Rows in a child table whose parent vault no longer exists. Must not grow across the purge. */
export async function readOrphanCounts(session) {
    const out = {};
    for (const table of CHILD_TABLE_ORDER) {
        out[table] = Number(
            await session.scalar(
                `SELECT count(*)::text FROM public.${table} t
                 WHERE NOT EXISTS (SELECT 1 FROM public.vaults v WHERE v.id = t.vault_id)`
            )
        );
    }
    return out;
}

export async function readTotals(session) {
    const out = {};
    for (const table of ALL_TABLES) {
        out[table] = Number(await session.scalar(`SELECT count(*)::text FROM public.${table}`));
    }
    return out;
}

/** Create and fill the frozen-manifest temp table in bounded inserts. */
export async function materialiseManifest(session, vaultIds) {
    await session.query(
        `CREATE TEMP TABLE ${MANIFEST_TEMP_TABLE} (id uuid PRIMARY KEY) ON COMMIT DROP`
    );
    for (let i = 0; i < vaultIds.length; i += 1000) {
        const chunk = vaultIds.slice(i, i + 1000).map((id) => `('${assertUuid(id)}'::uuid)`);
        if (chunk.length === 0) break;
        await session.query(`INSERT INTO ${MANIFEST_TEMP_TABLE} (id) VALUES ${chunk.join(",")}`);
    }
    return Number(await session.scalar(`SELECT count(*)::text FROM ${MANIFEST_TEMP_TABLE}`));
}

// ---------------------------------------------------------------------------
// Target guard
// ---------------------------------------------------------------------------

/**
 * Refuse to touch anything that is not the expected local docker Postgres. Checked before any
 * write: container must be running under the local Supabase CLI project, and the connected
 * database/user/port must match what the manifest was frozen against.
 */
export async function assertLocalTarget(session, expected) {
    // A matching container NAME on a remote daemon is not a local target. Check the effective
    // endpoint (env override wins over the selected context) before trusting `docker inspect`.
    const envHost = process.env.DOCKER_HOST ?? "";
    let endpoint = envHost;
    if (endpoint === "") {
        const { stdout: ctx } = await execFileAsync("docker", [
            "context",
            "inspect",
            "--format",
            "{{.Name}}|{{.Endpoints.docker.Host}}"
        ]);
        endpoint = ctx.trim().split("|").at(1) ?? "";
    }
    if (!/^unix:\/\//.test(endpoint)) {
        throw new Error(
            `target guard: docker endpoint ${endpoint || "(unknown)"} is not a local unix socket`
        );
    }

    const { stdout } = await execFileAsync("docker", [
        "inspect",
        "--format",
        '{{.State.Running}}|{{index .Config.Labels "com.supabase.cli.project"}}',
        session.container
    ]);
    const [running, project] = stdout.trim().split("|");
    if (running !== "true") throw new Error(`target container ${session.container} is not running`);

    const row = (
        await session.query(
            `SELECT current_database(), current_user, coalesce(inet_server_port()::text, 'local'),
                    coalesce(inet_server_addr()::text, 'local'), pg_is_in_recovery()::text`
        )
    ).at(0);
    const actual = {
        container: session.container,
        project,
        database: row[0],
        user: row[1],
        port: row[2],
        addr: row[3],
        endpoint
    };

    if (row[4] !== "false")
        throw new Error("target guard: server is in recovery — refusing to write");
    if (actual.addr !== "local" && !/^127\.|^::1$/.test(actual.addr)) {
        throw new Error(`target guard: server address ${actual.addr} is not loopback/unix`);
    }

    for (const key of ["container", "database", "user"]) {
        if (expected?.[key] !== undefined && expected[key] !== actual[key]) {
            throw new Error(
                `target guard: ${key} is ${actual[key]}, manifest expects ${expected[key]}`
            );
        }
    }
    if (expected?.project !== undefined && expected.project !== actual.project) {
        throw new Error(
            `target guard: docker project is ${actual.project}, manifest expects ${expected.project}`
        );
    }
    return actual;
}

/** SHA256 of this runner file, bound into every manifest and rechecked before any delete. */
export function runnerSha256() {
    return sha256(readFileSync(fileURLToPath(import.meta.url), "utf8"));
}

// ---------------------------------------------------------------------------
// Manifest building (read-only)
// ---------------------------------------------------------------------------

export async function buildManifest({
    container = DEFAULT_CONTAINER,
    database = DEFAULT_DATABASE,
    user = DEFAULT_USER,
    selectorPath = join(HERE, "fixture-selection.sql"),
    outputPath = join(HERE, "selection-manifest.json"),
    cutoff = null,
    write = true
} = {}) {
    const session = new PsqlSession({ container, database, user }).start();
    try {
        const target = await assertLocalTarget(session, { container, database });
        const { body, fileSha256 } = readSelectorBody(selectorPath);

        // REPEATABLE READ gives one consistent snapshot across every count/digest below. It is not
        // declared READ ONLY because the manifest is materialised into a TEMP table (which a
        // read-only transaction forbids); the transaction ends in ROLLBACK regardless, and no
        // statement here touches a persistent table.
        await session.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ");
        await session.query("SET LOCAL statement_timeout = '300s'");

        const effectiveCutoff = assertTimestamp(
            cutoff ?? (await session.scalar("SELECT now()::text"))
        );
        await session.query(`\\set cutoff '${effectiveCutoff}'`);

        const schemaDigest = await readSchemaDigest(session);
        const totalsBefore = await readTotals(session);

        // The manifest temp table is filled straight from the canonical selector, so the frozen
        // UUID list and the live predicate can never disagree.
        await session.query(
            `CREATE TEMP TABLE ${MANIFEST_TEMP_TABLE} (id uuid PRIMARY KEY) ON COMMIT DROP`
        );
        await session.query(
            `INSERT INTO ${MANIFEST_TEMP_TABLE} (id)\n${body}\nSELECT id FROM selected_vaults`
        );

        const cohortRows = await session.query(
            `${body}
             SELECT cohort, count(*)::text FROM selected_vaults GROUP BY cohort ORDER BY cohort`
        );
        const cohorts = Object.fromEntries(cohortRows.map(([cohort, n]) => [cohort, Number(n)]));

        const vaultIds = normaliseVaultIds(
            (await session.query(`SELECT id::text FROM ${MANIFEST_TEMP_TABLE} ORDER BY id`)).map(
                (r) => r[0]
            )
        );
        const selected = await readFingerprints(session, { selected: true });
        const nonSelected = await readFingerprints(session, { selected: false });
        const orphans = await readOrphanCounts(session);

        const exclusions = Object.fromEntries(
            (
                await session.query(`
WITH marked_memberships AS (
    SELECT m.vault_id, count(*) AS n_total,
           count(*) FILTER (WHERE m.encrypted_vault_key IS NOT DISTINCT FROM 'd3JhcHBlZA=='
                              AND m.enc_public_key IS NOT DISTINCT FROM 'cHVibGlj') AS n_synthetic
    FROM public.vault_memberships m GROUP BY m.vault_id
),
marked_ops AS (
    SELECT o.vault_id, count(*) AS n_total,
           count(*) FILTER (WHERE o.encrypted_data IS NOT DISTINCT FROM 'aHMwMTUtZW5jcnlwdGVkLW9w'
                              AND o.version_vector IS NOT DISTINCT FROM 'e30=') AS n_synthetic
    FROM public.vault_ops o GROUP BY o.vault_id
)
SELECT class, count(*)::text FROM (
    SELECT CASE
        WHEN v.created_at IS NULL THEN 'unknown-created-at'
        WHEN v.created_at > :'cutoff'::timestamptz THEN 'after-cutoff'
        WHEN EXISTS (SELECT 1 FROM public.vault_snapshots s WHERE s.vault_id = v.id)
          OR EXISTS (SELECT 1 FROM public.vault_invites i WHERE i.vault_id = v.id)
          OR EXISTS (SELECT 1 FROM public.vault_updates_legacy l WHERE l.vault_id = v.id)
            THEN 'unexplained-child'
        WHEN EXISTS (SELECT 1 FROM ${MANIFEST_TEMP_TABLE} m WHERE m.id = v.id) THEN 'selected'
        WHEN coalesce(mm.n_total, 0) = 0 AND coalesce(mo.n_total, 0) = 0 THEN 'empty-orphan-no-provenance'
        WHEN coalesce(mm.n_total, 0) <> coalesce(mm.n_synthetic, 0) THEN 'non-synthetic-membership'
        ELSE 'non-synthetic-op'
    END AS class
    FROM public.vaults v
    LEFT JOIN marked_memberships mm ON mm.vault_id = v.id
    LEFT JOIN marked_ops mo ON mo.vault_id = v.id
) c GROUP BY class ORDER BY class`)
            ).map(([klass, n]) => [klass, Number(n)])
        );

        await session.query("ROLLBACK");

        const body_ = {
            task: "MF-006",
            generatedAt: new Date().toISOString(),
            target: {
                container: target.container,
                project: target.project,
                database: target.database,
                user: target.user
            },
            cutoff: effectiveCutoff,
            selector: {
                file: "fixture-selection.sql",
                sha256: fileSha256,
                bodySha256: sha256(body)
            },
            runnerSha256: sha256(readFileSync(fileURLToPath(import.meta.url), "utf8")),
            schemaDigest,
            cohorts,
            vaultCount: vaultIds.length,
            vaultIds,
            selected,
            nonSelected,
            orphans,
            totalsBefore,
            exclusions
        };
        const manifest = { ...body_, confirmationDigest: sha256(canonicalJson(body_)) };
        if (write)
            writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
        return { manifest, outputPath };
    } finally {
        await session.close();
    }
}

// ---------------------------------------------------------------------------
// Purge
// ---------------------------------------------------------------------------

export function loadManifest(path) {
    const manifest = JSON.parse(readFileSync(path, "utf8"));
    if (!Array.isArray(manifest.vaultIds)) throw new Error("manifest vaultIds must be an array");
    if (typeof manifest.cutoff !== "string" || manifest.cutoff.length === 0) {
        throw new Error("manifest cutoff must be a non-empty string");
    }
    if (manifest.target === null || typeof manifest.target !== "object") {
        throw new Error("manifest target must be an object");
    }
    // Validate the cutoff at LOAD time, not at the `\set` site deep inside the locked transaction.
    // A malformed cutoff should be refused before a connection is opened, let alone before locks.
    assertTimestamp(manifest.cutoff);
    const { confirmationDigest, ...body } = manifest;
    const recomputed = sha256(canonicalJson(body));
    if (recomputed !== confirmationDigest) {
        throw new Error(
            `manifest confirmationDigest mismatch: file says ${confirmationDigest}, content hashes to ${recomputed}`
        );
    }

    // Duplicates must REJECT, never be silently collapsed: dropping a repeated id would change the
    // authorised set after it was reviewed and digested.
    const raw = manifest.vaultIds.map((id) => assertUuid(String(id).trim().toLowerCase()));
    if (new Set(raw).size !== raw.length) {
        throw new Error(
            "manifest contains duplicate vaultIds; refusing to silently alter an authorised set"
        );
    }
    const sorted = [...raw].sort();
    if (raw.some((id, i) => id !== sorted[i])) {
        throw new Error(
            "manifest vaultIds are not canonically sorted; refusing to reorder an authorised set"
        );
    }
    manifest.vaultIds = sorted;
    if (manifest.vaultIds.length !== manifest.vaultCount) {
        throw new Error(
            `manifest vaultCount ${manifest.vaultCount} != ${manifest.vaultIds.length} normalised ids`
        );
    }
    return manifest;
}

function compareFingerprints(label, expected, actual) {
    const problems = [];
    for (const table of ALL_TABLES) {
        const e = expected[table];
        const a = actual[table];
        if (e.count !== a.count || e.digest !== a.digest) {
            problems.push(
                `${label}.${table}: manifest ${e.count}/${e.digest} vs live ${a.count}/${a.digest}`
            );
        }
    }
    return problems;
}

/**
 * Dry run (default) or confirmed execution.
 *
 * Returns a structured report. Throws — leaving the transaction rolled back and the process
 * destined to exit nonzero — on any guard failure, drift, or SQL error.
 */
export async function purge({
    manifestPath = join(HERE, "selection-manifest.json"),
    selectorPath = join(HERE, "fixture-selection.sql"),
    apply = false,
    confirm = null,
    batchSize = DEFAULT_BATCH_SIZE,
    container = null,
    database = null,
    user = DEFAULT_USER,
    lockTimeout = "15s",
    statementTimeout = "120s",
    onStatement = null,
    afterLockHook = null,
    beforeCommitHook = null
} = {}) {
    const manifest = loadManifest(manifestPath);
    if (apply && confirm !== manifest.confirmationDigest) {
        throw new Error(
            "--apply requires --confirm <manifest confirmationDigest>; refusing to delete"
        );
    }
    if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1000) {
        throw new Error(`batch size must be an integer in 1..1000, got ${batchSize}`);
    }

    // The manifest binds the selector it was frozen against: a live run cannot silently swap in a
    // different predicate between confirmation and deletion.
    const selector = readSelectorBody(selectorPath);
    if (
        selector.fileSha256 !== manifest.selector.sha256 ||
        sha256(selector.body) !== manifest.selector.bodySha256
    ) {
        throw new Error(
            `selector drift: ${selectorPath} hashes to ${selector.fileSha256}, manifest expects ${manifest.selector.sha256}`
        );
    }

    // The manifest also binds the EXECUTABLE it was frozen against. Reviewing a manifest authorises
    // one deletion engine, not any future edit of it: if this file changed since the freeze, the
    // review is stale and must be redone. Only a confirmed apply is gated — dry runs mutate nothing
    // and must stay usable while the runner is being repaired.
    if (apply) {
        const liveRunner = runnerSha256();
        if (typeof manifest.runnerSha256 !== "string" || manifest.runnerSha256 !== liveRunner) {
            throw new Error(
                `runner drift: this runner hashes to ${liveRunner}, manifest expects ${manifest.runnerSha256}. ` +
                    "Refreeze and re-review the manifest against the current executable."
            );
        }
    }

    const session = new PsqlSession({
        container: container ?? manifest.target.container,
        database: database ?? manifest.target.database,
        user
    }).start();

    const report = {
        mode: apply ? "apply" : "dry-run",
        manifestPath,
        confirmationDigest: manifest.confirmationDigest,
        vaultCount: manifest.vaultIds.length,
        statements: [],
        deleted: Object.fromEntries(ALL_TABLES.map((t) => [t, 0]))
    };

    try {
        // Expectations come from the FROZEN MANIFEST, never from the session we are about to use —
        // comparing the session against itself would make the guard unfalsifiable.
        report.target = await assertLocalTarget(session, {
            container: manifest.target.container,
            database: manifest.target.database,
            user: manifest.target.user,
            project: manifest.target.project
        });

        await session.query("BEGIN");
        await session.query(`SET LOCAL lock_timeout = '${lockTimeout}'`);
        await session.query(`SET LOCAL statement_timeout = '${statementTimeout}'`);
        await session.query("SET LOCAL idle_in_transaction_session_timeout = '300s'");

        // Fail-fast duplicate-run refusal before any lock queueing.
        // `boolean::text` renders as 'true'/'false' (psql's own boolean display would be 't'/'f').
        const gotLock = await session.scalar(
            `SELECT pg_try_advisory_xact_lock(${ADVISORY_LOCK_KEY})::text`
        );
        if (gotLock !== "true") {
            throw new Error(
                "another MF-006 maintenance session holds the advisory lock; refusing to run concurrently"
            );
        }

        // Deterministic lock order == deletion order. SHARE ROW EXCLUSIVE fences INSERT/UPDATE/DELETE
        // while ordinary SELECT (dev app reads) keeps working.
        const lockStartedAt = process.hrtime.bigint();
        for (const table of ALL_TABLES) {
            const { ms } = await session.timed(
                `LOCK TABLE public.${table} IN SHARE ROW EXCLUSIVE MODE`
            );
            report.statements.push({ kind: "lock", table, ms });
        }

        if (afterLockHook) await afterLockHook(session);

        // Fresh committed-state reads taken only AFTER the locks, so a writer that committed while
        // we waited cannot hide behind a stale snapshot.
        const schemaDigest = await readSchemaDigest(session);
        if (schemaDigest !== manifest.schemaDigest) {
            throw new Error(
                `schema drift: live digest ${schemaDigest} != manifest ${manifest.schemaDigest}`
            );
        }

        const loaded = await materialiseManifest(session, manifest.vaultIds);
        if (loaded !== manifest.vaultIds.length) {
            throw new Error(
                `manifest load mismatch: ${loaded} of ${manifest.vaultIds.length} ids materialised`
            );
        }

        const presentVaults = Number(
            await session.scalar(
                `SELECT count(*)::text FROM ${MANIFEST_TEMP_TABLE} m
                 JOIN public.vaults v ON v.id = m.id`
            )
        );
        report.presentVaults = presentVaults;

        if (presentVaults === 0) {
            // Entirely absent manifest is a legitimate verified no-op.
            const residue = await readFingerprints(session, { selected: true });
            const stillThere = ALL_TABLES.filter((t) => residue[t].count > 0);
            if (stillThere.length > 0) {
                throw new Error(
                    `manifest vaults are gone but child rows remain in: ${stillThere.join(", ")}`
                );
            }
            report.outcome = "already-purged-noop";
            await session.query("ROLLBACK");
            return report;
        }
        if (presentVaults !== manifest.vaultIds.length) {
            throw new Error(
                `partial manifest absence: ${presentVaults} of ${manifest.vaultIds.length} vaults present. ` +
                    "Refusing silent partial completion — re-review and refreeze the manifest."
            );
        }

        // Every manifest vault must STILL satisfy the canonical selector (the same file whose
        // digest was bound to the manifest above).
        const { body } = selector;
        await session.query(`\\set cutoff '${assertTimestamp(manifest.cutoff)}'`);
        const notSelectable = Number(
            await session.scalar(`
${body}
SELECT count(*)::text FROM ${MANIFEST_TEMP_TABLE} m
WHERE NOT EXISTS (SELECT 1 FROM selected_vaults s WHERE s.id = m.id)`)
        );
        if (notSelectable > 0) {
            throw new Error(
                `${notSelectable} manifest vaults no longer satisfy the fixture predicate; aborting`
            );
        }

        const selectedNow = await readFingerprints(session, { selected: true });
        const drift = compareFingerprints("selected", manifest.selected, selectedNow);
        if (drift.length > 0) {
            throw new Error(
                `selected content drift — refreshed confirmation required:\n${drift.join("\n")}`
            );
        }

        const nonSelectedBaseline = await readFingerprints(session, { selected: false });
        const orphanBaseline = await readOrphanCounts(session);
        report.selected = selectedNow;
        report.nonSelectedBaseline = nonSelectedBaseline;
        report.orphanBaseline = orphanBaseline;
        report.totalsBefore = await readTotals(session);

        if (!apply) {
            report.outcome = "dry-run-validated";
            await session.query("ROLLBACK");
            report.lockWindowMs = Number(process.hrtime.bigint() - lockStartedAt) / 1e6;
            return report;
        }

        // Transaction-local append-only bypass. FK triggers are bypassed too, which is why the
        // deletes are child-first and orphan counts are asserted before COMMIT.
        await session.query("SET LOCAL session_replication_role = replica");
        report.replicationRoleDuringDeletes = await session.scalar("SHOW session_replication_role");

        for (const table of CHILD_TABLE_ORDER) {
            let batch = 0;
            for (;;) {
                const { rows, ms } = await session.timed(`
WITH victims AS (
    SELECT t.id FROM public.${table} t
    JOIN ${MANIFEST_TEMP_TABLE} m ON m.id = t.vault_id
    LIMIT ${batchSize}
), deleted AS (
    DELETE FROM public.${table} d USING victims v WHERE d.id = v.id RETURNING 1
)
SELECT count(*)::text FROM deleted`);
                const n = Number(rows.at(0)?.at(0) ?? 0);
                batch += 1;
                report.statements.push({ kind: "delete", table, batch, rows: n, ms });
                if (n > batchSize)
                    throw new Error(`batch cap violated on ${table}: ${n} > ${batchSize}`);
                report.deleted[table] += n;
                if (n === 0) break;
            }
        }

        let vaultBatch = 0;
        for (;;) {
            const { rows, ms } = await session.timed(`
WITH victims AS (
    SELECT v.id FROM public.vaults v
    JOIN ${MANIFEST_TEMP_TABLE} m ON m.id = v.id
    LIMIT ${batchSize}
), deleted AS (
    DELETE FROM public.vaults d USING victims x WHERE d.id = x.id RETURNING 1
)
SELECT count(*)::text FROM deleted`);
            const n = Number(rows.at(0)?.at(0) ?? 0);
            vaultBatch += 1;
            report.statements.push({
                kind: "delete",
                table: "vaults",
                batch: vaultBatch,
                rows: n,
                ms
            });
            if (n > batchSize) throw new Error(`batch cap violated on vaults: ${n} > ${batchSize}`);
            report.deleted.vaults += n;
            if (n === 0) break;
        }

        // Restore normal trigger/FK enforcement BEFORE the closing assertions and the commit.
        await session.query("SET LOCAL session_replication_role = origin");
        report.replicationRoleBeforeCommit = await session.scalar("SHOW session_replication_role");
        if (report.replicationRoleBeforeCommit !== "origin") {
            throw new Error("failed to restore session_replication_role=origin before commit");
        }

        const residue = await readFingerprints(session, { selected: true });
        const leftovers = ALL_TABLES.filter((t) => residue[t].count > 0);
        if (leftovers.length > 0) {
            throw new Error(
                `selected rows still present after deletes in: ${leftovers.join(", ")}`
            );
        }

        const preserved = await readFingerprints(session, { selected: false });
        const damage = compareFingerprints("nonSelected", nonSelectedBaseline, preserved);
        if (damage.length > 0) {
            throw new Error(`nonselected data changed — rolling back:\n${damage.join("\n")}`);
        }

        const orphansAfter = await readOrphanCounts(session);
        for (const table of CHILD_TABLE_ORDER) {
            if (orphansAfter[table] > orphanBaseline[table]) {
                throw new Error(
                    `new FK orphans introduced in ${table}: ${orphanBaseline[table]} -> ${orphansAfter[table]}`
                );
            }
        }
        report.orphansAfter = orphansAfter;
        report.preserved = preserved;

        // AUTHORITATIVE after-counts, read while the locks are still held and before COMMIT. A
        // count taken after COMMIT is a fresh observation of a database the developer can write to
        // again, so it can neither prove nor excuse a preservation result.
        report.totalsAfterLocked = await readTotals(session);
        for (const table of ALL_TABLES) {
            const expected = report.totalsBefore[table] - report.deleted[table];
            if (report.totalsAfterLocked[table] !== expected) {
                throw new Error(
                    `locked total mismatch on ${table}: ${report.totalsBefore[table]} - ${report.deleted[table]} ` +
                        `= ${expected}, but observed ${report.totalsAfterLocked[table]}`
                );
            }
        }

        // Test seam: injected failure / process disconnect immediately before COMMIT, proving the
        // whole purge rolls back rather than partially landing.
        if (beforeCommitHook) await beforeCommitHook(session);

        await session.query("COMMIT");
        report.lockWindowMs = Number(process.hrtime.bigint() - lockStartedAt) / 1e6;
        report.outcome = "committed";
        // Post-commit only. Labelled separately because concurrent developer writes land here.
        report.freshObservedTotals = { observedAfterCommit: true, ...(await readTotals(session)) };
        return report;
    } finally {
        if (onStatement) onStatement(report.statements);
        await session.close();
    }
}

// ---------------------------------------------------------------------------
// Maintenance
// ---------------------------------------------------------------------------

/**
 * VACUUM ANALYZE each base table on its own autocommit connection. Never VACUUM FULL.
 *
 * Guarded by the same target check as the purge: maintenance is a write on the server and must not
 * be pointed at anything other than the expected local container. The guard runs ONCE, before the
 * first table, so an identity failure aborts with nothing vacuumed.
 */
export async function vacuumAnalyze({
    container = DEFAULT_CONTAINER,
    database = DEFAULT_DATABASE,
    user = DEFAULT_USER,
    expect = null
} = {}) {
    const guard = new PsqlSession({ container, database, user }).start();
    let target;
    try {
        target = await assertLocalTarget(guard, { container, database, ...(expect ?? {}) });
    } finally {
        await guard.close();
    }

    const results = [];
    for (const table of ALL_TABLES) {
        const session = new PsqlSession({ container, database, user }).start();
        try {
            const startedAt = process.hrtime.bigint();
            await session.query(`VACUUM ANALYZE public.${table}`);
            results.push({
                table,
                ok: true,
                ms: Number(process.hrtime.bigint() - startedAt) / 1e6
            });
        } catch (error) {
            results.push({ table, ok: false, error: String(error.message ?? error) });
        } finally {
            await session.close();
        }
    }
    // A single failed table means maintenance is INCOMPLETE, to be retried as maintenance only —
    // never as a reason to re-delete or restore.
    return { target, results, complete: results.every((r) => r.ok) };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
    const args = { _: [] };
    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];
        if (!token.startsWith("--")) {
            args._.push(token);
            continue;
        }
        const key = token.slice(2);
        const next = argv[i + 1];
        if (next === undefined || next.startsWith("--")) args[key] = true;
        else {
            args[key] = next;
            i++;
        }
    }
    return args;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const common = {
        container: typeof args.container === "string" ? args.container : undefined,
        database: typeof args.database === "string" ? args.database : undefined
    };

    if (args["build-manifest"]) {
        const { manifest, outputPath } = await buildManifest({
            container: common.container ?? DEFAULT_CONTAINER,
            database: common.database ?? DEFAULT_DATABASE,
            cutoff: typeof args.cutoff === "string" ? args.cutoff : null,
            outputPath: typeof args.out === "string" ? args.out : undefined
        });
        console.log(
            JSON.stringify(
                {
                    outputPath,
                    cutoff: manifest.cutoff,
                    cohorts: manifest.cohorts,
                    vaultCount: manifest.vaultCount,
                    selectedCounts: Object.fromEntries(
                        ALL_TABLES.map((t) => [t, manifest.selected[t].count])
                    ),
                    exclusions: manifest.exclusions,
                    totalsBefore: manifest.totalsBefore,
                    confirmationDigest: manifest.confirmationDigest
                },
                null,
                2
            )
        );
        return;
    }

    if (args.vacuum) {
        const maintenance = await vacuumAnalyze({
            container: common.container ?? DEFAULT_CONTAINER,
            database: common.database ?? DEFAULT_DATABASE
        });
        console.log(JSON.stringify(maintenance, null, 2));
        if (!maintenance.complete) process.exitCode = 1;
        return;
    }

    const report = await purge({
        manifestPath: typeof args.manifest === "string" ? args.manifest : undefined,
        apply: args.apply === true,
        confirm: typeof args.confirm === "string" ? args.confirm : null,
        batchSize: args["batch-size"] ? Number(args["batch-size"]) : DEFAULT_BATCH_SIZE,
        ...common
    });
    console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    main().catch((error) => {
        console.error(`MF-006 FAILED: ${error.message ?? error}`);
        process.exit(1);
    });
}

export { randomUUID as __randomUUID };
