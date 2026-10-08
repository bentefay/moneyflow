#!/usr/bin/env node
/**
 * MF-006 — real automated tests for the fixture selector and the purge runner.
 *
 * Every test runs against a uniquely named, test-owned PostgreSQL database inside the same local
 * docker container as the live target. The shared `public` tables are never seeded or touched.
 *
 * The tests import and execute the ACTUAL operational entry points (`buildManifest`, `purge`,
 * `vacuumAnalyze`, `PsqlSession`) and the ACTUAL canonical selector file — no mock predicate.
 *
 * Run: node --test purge-fixtures.test.mjs
 */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
    ALL_TABLES,
    CHILD_TABLE_ORDER,
    PsqlSession,
    buildManifest,
    canonicalJson,
    purge,
    sha256,
    vacuumAnalyze
} from "./purge-fixtures.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTAINER = "supabase_db_moneyflow";
const LIVE_SELECTOR = join(HERE, "fixture-selection.sql");

/** Markers copied from tests/integration/helpers/realtime-stack.ts. */
const SYNTHETIC_KEY = "d3JhcHBlZA==";
const SYNTHETIC_PUB = "cHVibGlj";
const SYNTHETIC_OP_DATA = "aHMwMTUtZW5jcnlwdGVkLW9w";
const SYNTHETIC_OP_VV = "e30=";

// ---------------------------------------------------------------------------
// isolated database plumbing
// ---------------------------------------------------------------------------

/** Effective schema of the seven base tables: same FK actions and same append-only trigger. */
const SCHEMA_SQL = `
CREATE TABLE public.vaults (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    deleted_at timestamptz
);
CREATE TABLE public.vault_memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id uuid NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
    pubkey_hash text NOT NULL,
    encrypted_vault_key text NOT NULL,
    role text NOT NULL,
    created_at timestamptz DEFAULT now(),
    enc_public_key text,
    UNIQUE (vault_id, pubkey_hash)
);
CREATE TABLE public.vault_ops (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id uuid NOT NULL REFERENCES public.vaults(id) ON DELETE RESTRICT,
    version_vector text NOT NULL,
    encrypted_data text NOT NULL,
    author_pubkey_hash text NOT NULL,
    created_at timestamptz DEFAULT now(),
    legacy_update_id uuid,
    legacy_base_snapshot_version integer,
    legacy_hlc_timestamp text
);
CREATE TABLE public.vault_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id uuid NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE UNIQUE,
    version integer NOT NULL,
    hlc_timestamp text NOT NULL,
    encrypted_data text NOT NULL,
    created_at timestamptz DEFAULT now(),
    version_vector text NOT NULL,
    updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.vault_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id uuid NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
    invite_pubkey text NOT NULL UNIQUE,
    encrypted_vault_key text NOT NULL,
    role text NOT NULL,
    created_by text NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now(),
    enc_public_key text
);
CREATE TABLE public.vault_updates_legacy (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id uuid NOT NULL REFERENCES public.vaults(id) ON DELETE RESTRICT,
    base_snapshot_version integer NOT NULL,
    hlc_timestamp text NOT NULL,
    encrypted_data text NOT NULL,
    author_pubkey_hash text NOT NULL,
    created_at timestamptz DEFAULT now()
);
CREATE TABLE public.realtime_grants (
    id uuid PRIMARY KEY,
    vault_id uuid NOT NULL REFERENCES public.vaults(id),
    pubkey_hash text NOT NULL,
    vault_role text NOT NULL,
    purpose text NOT NULL,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz DEFAULT clock_timestamp() NOT NULL
);
CREATE FUNCTION public.reject_vault_op_mutation() RETURNS trigger
    LANGUAGE plpgsql SET search_path TO '' AS $fn$
BEGIN
    RAISE EXCEPTION 'vault_ops is append-only';
END;
$fn$;
CREATE TRIGGER vault_ops_append_only BEFORE DELETE OR UPDATE ON public.vault_ops
    FOR EACH ROW EXECUTE FUNCTION public.reject_vault_op_mutation();
`;

function psqlExec(database, sql, { onErrorStop = true } = {}) {
    const args = ["exec", "-i", CONTAINER, "psql", "-X"];
    if (onErrorStop) args.push("-v", "ON_ERROR_STOP=1");
    args.push("-q", "-U", "postgres", "-d", database);
    return new Promise((resolve, reject) => {
        const proc = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
        let stdout = "";
        let stderr = "";
        proc.stdout.setEncoding("utf8");
        proc.stderr.setEncoding("utf8");
        proc.stdout.on("data", (d) => (stdout += d));
        proc.stderr.on("data", (d) => (stderr += d));
        proc.on("error", reject);
        proc.on("exit", (code) => resolve({ code, stdout, stderr }));
        proc.stdin.end(sql);
    });
}

async function scalar(database, sql) {
    const { code, stdout, stderr } = await psqlExec(
        database,
        `\\pset tuples_only on\n\\pset format unaligned\n${sql}`
    );
    assert.equal(code, 0, stderr);
    return stdout.trim();
}

async function count(database, table) {
    return Number(await scalar(database, `SELECT count(*) FROM public.${table};`));
}

const createdDatabases = [];

async function createDb() {
    const name = `mf006_test_${randomUUID().replace(/-/g, "")}`;
    const created = await psqlExec("postgres", `CREATE DATABASE ${name};`);
    assert.equal(created.code, 0, created.stderr);
    createdDatabases.push(name);
    const schema = await psqlExec(name, SCHEMA_SQL);
    assert.equal(schema.code, 0, schema.stderr);
    return name;
}

async function dropDb(name) {
    await psqlExec("postgres", `DROP DATABASE IF EXISTS ${name} WITH (FORCE);`);
}

test.after(async () => {
    for (const name of createdDatabases) await dropDb(name);
});

let scratchDir = null;
function scratch(file) {
    scratchDir ??= mkdtempSync(join(tmpdir(), "mf006-"));
    return join(scratchDir, file);
}
test.after(() => {
    if (scratchDir) rmSync(scratchDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// seeding
// ---------------------------------------------------------------------------

const q = (value) => (value === null ? "NULL" : `'${String(value).replace(/'/g, "''")}'`);

/**
 * Seed one vault plus the requested children. Everything is explicit: no helper invents markers.
 *
 * @param {object} spec
 * @param {string} spec.id vault uuid
 * @param {string|null} spec.createdAt timestamptz literal, or null for an unknown creation time
 * @param {Array<{key: string|null, pub: string|null}>} spec.memberships
 * @param {Array<{data: string, vv: string, legacy?: boolean, count?: number}>} spec.ops
 */
function seedSql({
    id,
    createdAt = "2026-01-01 00:00:00+00",
    memberships = [],
    ops = [],
    grants = 0,
    snapshot = false,
    invite = false,
    legacy = false
}) {
    const parts = [
        `INSERT INTO public.vaults (id, created_at) VALUES ('${id}', ${createdAt === null ? "NULL" : q(createdAt) + "::timestamptz"});`
    ];
    memberships.forEach((m, i) => {
        parts.push(
            `INSERT INTO public.vault_memberships (vault_id, pubkey_hash, encrypted_vault_key, role, enc_public_key)
             VALUES ('${id}', 'member-${i}', ${q(m.key)}, 'owner', ${q(m.pub)});`
        );
    });
    ops.forEach((o) => {
        const n = o.count ?? 1;
        parts.push(
            `INSERT INTO public.vault_ops (vault_id, version_vector, encrypted_data, author_pubkey_hash, legacy_update_id)
             SELECT '${id}', ${q(o.vv)}, ${q(o.data)}, 'author', ${o.legacy ? "gen_random_uuid()" : "NULL"}
             FROM generate_series(1, ${n});`
        );
    });
    if (grants > 0) {
        parts.push(
            `INSERT INTO public.realtime_grants (id, vault_id, pubkey_hash, vault_role, purpose, expires_at)
             SELECT gen_random_uuid(), '${id}', repeat('a', 64), 'owner', 'sync', now() + interval '1 hour'
             FROM generate_series(1, ${grants});`
        );
    }
    if (snapshot) {
        parts.push(
            `INSERT INTO public.vault_snapshots (vault_id, version, hlc_timestamp, encrypted_data, version_vector)
             VALUES ('${id}', 1, 'hlc', 'snapshot-ciphertext-${id}', '{}');`
        );
    }
    if (invite) {
        parts.push(
            `INSERT INTO public.vault_invites (vault_id, invite_pubkey, encrypted_vault_key, role, created_by, expires_at)
             VALUES ('${id}', 'invite-${id}', ${q(SYNTHETIC_KEY)}, 'member', 'creator', now() + interval '1 day');`
        );
    }
    if (legacy) {
        parts.push(
            `INSERT INTO public.vault_updates_legacy (vault_id, base_snapshot_version, hlc_timestamp, encrypted_data, author_pubkey_hash)
             VALUES ('${id}', 1, 'hlc', 'legacy-ciphertext', 'author');`
        );
    }
    return parts.join("\n");
}

async function seed(database, specs) {
    const sql = specs.map(seedSql).join("\n");
    const result = await psqlExec(database, `BEGIN;\n${sql}\nCOMMIT;`);
    assert.equal(result.code, 0, result.stderr);
}

const syntheticMembership = { key: SYNTHETIC_KEY, pub: SYNTHETIC_PUB };
const syntheticOp = { data: SYNTHETIC_OP_DATA, vv: SYNTHETIC_OP_VV };
const realMembership = { key: "cmVhbC13cmFwcGVkLWtleQ==", pub: "cmVhbC1wdWJsaWM=" };
const realOp = { data: "cmVhbC1lbmNyeXB0ZWQtb3A=", vv: '{"1":7}' };

/** Freeze a manifest against an isolated database using the real builder. */
async function manifestFor(database, { selectorPath = LIVE_SELECTOR, cutoff = null } = {}) {
    const outputPath = scratch(`manifest-${randomUUID()}.json`);
    const { manifest } = await buildManifest({
        container: CONTAINER,
        database,
        selectorPath,
        outputPath,
        cutoff
    });
    return { manifest, manifestPath: outputPath };
}

// ---------------------------------------------------------------------------
// Step 1 — selector inclusions and exclusions
// ---------------------------------------------------------------------------

test("selector: includes only provably synthetic vaults and excludes every ambiguous class", async (t) => {
    const db = await createDb();
    t.after(() => dropDb(db));

    const ids = {
        cohortA: randomUUID(),
        cohortAWithOps: randomUUID(),
        cohortBOrphanOps: randomUUID(),
        cohortBManyOps: randomUUID(),
        emptyOrphan: randomUUID(),
        realMembership: randomUUID(),
        mixedMembership: randomUUID(),
        nullMarkerMembership: randomUUID(),
        realOp: randomUUID(),
        mixedOps: randomUUID(),
        legacyColumnOp: randomUUID(),
        hasSnapshot: randomUUID(),
        hasInvite: randomUUID(),
        hasLegacyRow: randomUUID(),
        unknownCreatedAt: randomUUID(),
        afterCutoff: randomUUID()
    };

    await seed(db, [
        // --- included ---
        { id: ids.cohortA, memberships: [syntheticMembership] },
        {
            id: ids.cohortAWithOps,
            memberships: [syntheticMembership],
            ops: [syntheticOp],
            grants: 2
        },
        { id: ids.cohortBOrphanOps, ops: [syntheticOp], grants: 1 },
        { id: ids.cohortBManyOps, ops: [{ ...syntheticOp, count: 5 }] },
        // --- excluded ---
        { id: ids.emptyOrphan },
        { id: ids.realMembership, memberships: [realMembership] },
        { id: ids.mixedMembership, memberships: [syntheticMembership, realMembership] },
        { id: ids.nullMarkerMembership, memberships: [{ key: SYNTHETIC_KEY, pub: null }] },
        { id: ids.realOp, ops: [realOp] },
        { id: ids.mixedOps, memberships: [syntheticMembership], ops: [syntheticOp, realOp] },
        { id: ids.legacyColumnOp, ops: [{ ...syntheticOp, legacy: true }] },
        {
            id: ids.hasSnapshot,
            memberships: [syntheticMembership],
            ops: [syntheticOp],
            snapshot: true
        },
        { id: ids.hasInvite, memberships: [syntheticMembership], ops: [syntheticOp], invite: true },
        {
            id: ids.hasLegacyRow,
            memberships: [syntheticMembership],
            ops: [syntheticOp],
            legacy: true
        },
        {
            id: ids.unknownCreatedAt,
            createdAt: null,
            memberships: [syntheticMembership],
            ops: [syntheticOp]
        },
        {
            id: ids.afterCutoff,
            createdAt: "2026-12-31 00:00:00+00",
            memberships: [syntheticMembership]
        }
    ]);

    const { manifest } = await manifestFor(db, { cutoff: "2026-06-01 00:00:00+00" });

    assert.deepEqual(
        [...manifest.vaultIds].sort(),
        [ids.cohortA, ids.cohortAWithOps, ids.cohortBOrphanOps, ids.cohortBManyOps].sort(),
        "exactly the four provable fixtures are selected, once each"
    );
    assert.equal(manifest.cohorts.A, 2, "cohort A = vaults with a synthetic membership");
    assert.equal(manifest.cohorts.B, 2, "cohort B = membership-free vaults with synthetic ops");
    assert.equal(manifest.selected.vaults.count, 4);
    assert.equal(manifest.selected.vault_ops.count, 7, "1 + 1 + 5 synthetic ops");
    assert.equal(manifest.selected.vault_memberships.count, 2);
    assert.equal(manifest.selected.realtime_grants.count, 3);
    assert.equal(manifest.selected.vault_snapshots.count, 0);
    assert.equal(manifest.selected.vault_invites.count, 0);
    assert.equal(manifest.selected.vault_updates_legacy.count, 0);
    assert.equal(manifest.exclusions["empty-orphan-no-provenance"], 1);
    assert.equal(manifest.exclusions["unexplained-child"], 3);
    assert.equal(manifest.exclusions["unknown-created-at"], 1);
    assert.equal(manifest.exclusions["after-cutoff"], 1);
});

/**
 * Hand-written, deliberately DIFFERENT formulation of the canonical predicate: correlated
 * EXISTS/NOT EXISTS instead of the selector's grouped-count CTEs. It is written here, in the test,
 * from the documented contract — it is not extracted from fixture-selection.sql — so agreement
 * between the two is real cross-validation rather than a tautology.
 */
function independentSelectionSql(cutoff) {
    const synthMembership = `m.encrypted_vault_key IS NOT DISTINCT FROM '${SYNTHETIC_KEY}'
                             AND m.enc_public_key IS NOT DISTINCT FROM '${SYNTHETIC_PUB}'`;
    const synthOp = `o.encrypted_data IS NOT DISTINCT FROM '${SYNTHETIC_OP_DATA}'
                     AND o.version_vector IS NOT DISTINCT FROM '${SYNTHETIC_OP_VV}'`;
    return `
SELECT v.id
FROM public.vaults v
WHERE v.created_at IS NOT NULL
  AND v.created_at <= '${cutoff}'::timestamptz
  AND NOT EXISTS (SELECT 1 FROM public.vault_snapshots s WHERE s.vault_id = v.id)
  AND NOT EXISTS (SELECT 1 FROM public.vault_invites i WHERE i.vault_id = v.id)
  AND NOT EXISTS (SELECT 1 FROM public.vault_updates_legacy l WHERE l.vault_id = v.id)
  AND NOT EXISTS (
      SELECT 1 FROM public.vault_ops o
      WHERE o.vault_id = v.id
        AND (o.legacy_update_id IS NOT NULL
             OR o.legacy_base_snapshot_version IS NOT NULL
             OR o.legacy_hlc_timestamp IS NOT NULL))
  AND NOT EXISTS (
      SELECT 1 FROM public.vault_memberships m
      WHERE m.vault_id = v.id AND NOT (${synthMembership}))
  AND NOT EXISTS (
      SELECT 1 FROM public.vault_ops o
      WHERE o.vault_id = v.id AND NOT (${synthOp}))
  AND (
      EXISTS (SELECT 1 FROM public.vault_memberships m WHERE m.vault_id = v.id AND ${synthMembership})
      OR (NOT EXISTS (SELECT 1 FROM public.vault_memberships m WHERE m.vault_id = v.id)
          AND EXISTS (SELECT 1 FROM public.vault_ops o WHERE o.vault_id = v.id AND ${synthOp}))
  )
ORDER BY v.id;`;
}

test("selector: an independent formulation agrees exactly, including boundary and empty-marker rows", async (t) => {
    const db = await createDb();
    t.after(() => dropDb(db));

    const cutoff = "2026-06-01 00:00:00+00";
    const ids = {
        // --- included ---
        atCutoffExactly: randomUUID(),
        cohortAGrants: randomUUID(),
        cohortBGrants: randomUUID(),
        // --- excluded ---
        oneMicrosecondAfterCutoff: randomUUID(),
        grantsOnlyOrphan: randomUUID(),
        emptyStringMembership: randomUUID(),
        emptyStringOp: randomUUID(),
        nullEncPublicKey: randomUUID()
    };

    await seed(db, [
        { id: ids.atCutoffExactly, createdAt: cutoff, ops: [syntheticOp] },
        {
            id: ids.cohortAGrants,
            createdAt: "2026-05-01 00:00:00+00",
            memberships: [syntheticMembership],
            grants: 3
        },
        {
            id: ids.cohortBGrants,
            createdAt: "2026-05-01 00:00:00+00",
            ops: [{ ...syntheticOp, count: 2 }],
            grants: 4
        },
        {
            id: ids.oneMicrosecondAfterCutoff,
            createdAt: "2026-06-01 00:00:00.000001+00",
            ops: [syntheticOp]
        },
        // Grants are dependents, never provenance: a vault whose ONLY child is a realtime grant has
        // no positive evidence and must survive.
        { id: ids.grantsOnlyOrphan, createdAt: "2026-05-01 00:00:00+00", grants: 5 },
        // Empty-string markers are not the markers. They must not slip through as "close enough".
        { id: ids.emptyStringMembership, memberships: [{ key: "", pub: "" }] },
        { id: ids.emptyStringOp, ops: [{ data: "", vv: "" }] },
        // `enc_public_key` is the only nullable marker column in the live schema
        // (vault_ops.version_vector / .encrypted_data and vault_memberships.encrypted_vault_key are
        // all NOT NULL, so a NULL there is unreachable). IS NOT DISTINCT FROM makes this NULL
        // contradictory rather than SQL UNKNOWN, so the vault is excluded despite a matching key.
        { id: ids.nullEncPublicKey, memberships: [{ key: SYNTHETIC_KEY, pub: null }] }
    ]);

    const expected = [ids.atCutoffExactly, ids.cohortAGrants, ids.cohortBGrants].sort();

    const { manifest } = await manifestFor(db, { cutoff });
    assert.deepEqual(
        [...manifest.vaultIds].sort(),
        expected,
        "extracted selector selects exactly the provable set"
    );

    const independent = (await scalar(db, independentSelectionSql(cutoff)))
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .sort();
    assert.deepEqual(
        independent,
        expected,
        "an independently written predicate agrees row for row"
    );

    // Grants of a selected vault are dependents that DO get deleted; the grants-only vault's do not.
    assert.equal(
        manifest.selected.realtime_grants.count,
        7,
        "3 + 4 grants of the two selected vaults"
    );
    assert.equal(
        manifest.exclusions["empty-orphan-no-provenance"],
        1,
        "the grants-only vault has no provenance"
    );
    assert.equal(manifest.exclusions["after-cutoff"], 1);
});

test("selector: an empty database produces an empty manifest and a verified no-op purge", async (t) => {
    const db = await createDb();
    t.after(() => dropDb(db));

    const { manifest, manifestPath } = await manifestFor(db);
    assert.deepEqual(manifest.vaultIds, []);
    assert.equal(manifest.vaultCount, 0);

    const report = await purge({
        manifestPath,
        apply: true,
        confirm: manifest.confirmationDigest,
        database: db
    });
    assert.equal(report.outcome, "already-purged-noop");
});

// ---------------------------------------------------------------------------
// Step 2 — end-to-end operation
// ---------------------------------------------------------------------------

test("end-to-end: selector -> manifest -> runner purges fixtures and preserves neighbours", async (t) => {
    const db = await createDb();
    t.after(() => dropDb(db));

    const fixture = randomUUID();
    const fixtureOrphan = randomUUID();
    const developer = randomUUID();
    const snapshotVault = randomUUID();

    await seed(db, [
        {
            id: fixture,
            memberships: [syntheticMembership],
            ops: [{ ...syntheticOp, count: 3 }],
            grants: 2
        },
        { id: fixtureOrphan, ops: [{ ...syntheticOp, count: 2 }], grants: 1 },
        {
            id: developer,
            memberships: [realMembership],
            ops: [{ ...realOp, count: 4 }],
            grants: 3,
            snapshot: true
        },
        {
            id: snapshotVault,
            memberships: [syntheticMembership],
            ops: [syntheticOp],
            snapshot: true
        }
    ]);

    const { manifest, manifestPath } = await manifestFor(db);
    assert.deepEqual([...manifest.vaultIds].sort(), [fixture, fixtureOrphan].sort());

    const report = await purge({
        manifestPath,
        apply: true,
        confirm: manifest.confirmationDigest,
        database: db
    });

    assert.equal(report.outcome, "committed");
    assert.equal(report.deleted.vaults, 2);
    assert.equal(report.deleted.vault_ops, 5);
    assert.equal(report.deleted.vault_memberships, 1);
    assert.equal(report.deleted.realtime_grants, 3);
    assert.equal(report.replicationRoleBeforeCommit, "origin");

    assert.equal(await count(db, "vaults"), 2, "developer + snapshot-bearing vaults survive");
    assert.equal(await count(db, "vault_ops"), 5, "4 real + 1 excluded synthetic op survive");
    assert.equal(await count(db, "vault_snapshots"), 2);
    assert.equal(
        await scalar(
            db,
            `SELECT count(*) FROM public.vaults WHERE id IN ('${developer}', '${snapshotVault}');`
        ),
        "2"
    );
});

test("engine: drains all seven tables in order with every DELETE capped at the batch size", async (t) => {
    const db = await createDb();
    t.after(() => dropDb(db));

    // A deliberately permissive TEST-OWNED selector: it ignores the child-table exclusions so the
    // deletion engine can be exercised across all seven tables. The live selector is untouched and
    // the preceding test asserts it still excludes snapshot/invite/legacy-bearing vaults.
    const testSelector = scratch("test-selector.sql");
    writeFileSync(
        testSelector,
        `-- MF-006 test-owned selector (engine exercise only; NOT the live predicate)
-- fixture-selection:begin
WITH selected_vaults AS (
    SELECT v.id, v.created_at, 'T'::text AS cohort
    FROM public.vaults v
    WHERE v.created_at IS NOT NULL
      AND v.created_at <= :'cutoff'::timestamptz
      AND EXISTS (
          SELECT 1 FROM public.vault_ops o
          WHERE o.vault_id = v.id AND o.encrypted_data = '${SYNTHETIC_OP_DATA}'
      )
)
-- fixture-selection:end
SELECT id, created_at, cohort FROM selected_vaults ORDER BY id;
`
    );

    const big = randomUUID();
    const small = randomUUID();
    const keeper = randomUUID();
    await seed(db, [
        {
            id: big,
            memberships: [syntheticMembership],
            ops: [{ ...syntheticOp, count: 1200 }],
            grants: 5,
            snapshot: true,
            invite: true,
            legacy: true
        },
        { id: small, ops: [syntheticOp], grants: 1 },
        { id: keeper, memberships: [realMembership], ops: [realOp], grants: 2, snapshot: true }
    ]);

    const { manifest, manifestPath } = await manifestFor(db, { selectorPath: testSelector });
    assert.deepEqual([...manifest.vaultIds].sort(), [big, small].sort());

    const report = await purge({
        manifestPath,
        selectorPath: testSelector,
        apply: true,
        confirm: manifest.confirmationDigest,
        database: db
    });

    assert.equal(report.outcome, "committed");
    assert.equal(report.deleted.vault_ops, 1201);
    assert.equal(report.deleted.vault_snapshots, 1);
    assert.equal(report.deleted.vault_invites, 1);
    assert.equal(report.deleted.vault_updates_legacy, 1);
    assert.equal(report.deleted.vault_memberships, 1);
    assert.equal(report.deleted.realtime_grants, 6);
    assert.equal(report.deleted.vaults, 2);

    const deletes = report.statements.filter((s) => s.kind === "delete");
    for (const s of deletes)
        assert.ok(s.rows <= 1000, `${s.table} batch ${s.batch} deleted ${s.rows} rows`);
    assert.ok(
        deletes.filter((s) => s.table === "vault_ops" && s.rows > 0).length >= 2,
        "1201 ops must span more than one bounded statement"
    );

    // Table-draining order: statements are grouped per table, in the declared order, and each group
    // ends with a zero-row statement proving the table was drained before the next one started.
    const groups = [];
    for (const s of deletes) {
        if (groups.at(-1)?.table !== s.table) groups.push({ table: s.table, rows: [] });
        groups.at(-1).rows.push(s.rows);
    }
    assert.deepEqual(
        groups.map((g) => g.table),
        [...CHILD_TABLE_ORDER, "vaults"]
    );
    for (const g of groups) assert.equal(g.rows.at(-1), 0, `${g.table} was not drained to zero`);

    assert.equal(await count(db, "vaults"), 1);
    assert.equal(await count(db, "vault_ops"), 1);
    assert.equal(await count(db, "realtime_grants"), 2);
});

test("original defect: old cleanup half-commits and psql without ON_ERROR_STOP exits 0", async (t) => {
    const db = await createDb();
    t.after(() => dropDb(db));

    const vault = randomUUID();
    await seed(db, [
        {
            id: vault,
            memberships: [syntheticMembership],
            ops: [{ ...syntheticOp, count: 2 }],
            grants: 2
        }
    ]);

    // Exactly the pre-MF-004 cleanup: grants + memberships deleted, vault_ops never touched, so the
    // parent DELETE violates vault_ops_vault_id_fkey (RESTRICT).
    const oldCleanup = `
DELETE FROM public.realtime_grants WHERE vault_id = '${vault}';
DELETE FROM public.vault_memberships WHERE vault_id = '${vault}';
DELETE FROM public.vaults WHERE id = '${vault}';
`;

    const lenient = await psqlExec(db, oldCleanup, { onErrorStop: false });
    assert.equal(lenient.code, 0, "the old runSql masked the failure: psql exits 0");
    assert.match(lenient.stderr, /violates foreign key constraint/);

    assert.equal(await count(db, "vaults"), 1, "the vault survived the failed DELETE");
    assert.equal(await count(db, "vault_ops"), 2, "its ops survived");
    assert.equal(
        await count(db, "vault_memberships"),
        0,
        "memberships were already committed away"
    );
    assert.equal(await count(db, "realtime_grants"), 0);

    // The MF-004 fix: the same script under ON_ERROR_STOP=1 fails loudly.
    await seed(db, [{ id: randomUUID(), ops: [syntheticOp] }]);
    const strict = await psqlExec(db, `DELETE FROM public.vaults WHERE id = '${vault}';`);
    assert.notEqual(strict.code, 0, "ON_ERROR_STOP=1 surfaces the error as a nonzero exit");

    // This is precisely the historical residue MF-006 purges: membership-free, synthetic ops only.
    const { manifest, manifestPath } = await manifestFor(db);
    assert.ok(manifest.vaultIds.includes(vault));
    const report = await purge({
        manifestPath,
        apply: true,
        confirm: manifest.confirmationDigest,
        database: db
    });
    assert.equal(report.outcome, "committed");
    assert.equal(await count(db, "vaults"), 0);
    assert.equal(await count(db, "vault_ops"), 0);
});

// ---------------------------------------------------------------------------
// Step 2 — refusals, rollback and fencing
// ---------------------------------------------------------------------------

test("dry run mutates nothing and never sets the replication role", async (t) => {
    const db = await createDb();
    t.after(() => dropDb(db));

    const vault = randomUUID();
    await seed(db, [{ id: vault, ops: [syntheticOp], grants: 1 }]);
    const { manifest, manifestPath } = await manifestFor(db);

    const report = await purge({ manifestPath, database: db });
    assert.equal(report.outcome, "dry-run-validated");
    assert.equal(report.mode, "dry-run");
    assert.equal(report.replicationRoleDuringDeletes, undefined);
    assert.equal(await count(db, "vaults"), 1);
    assert.equal(await count(db, "vault_ops"), 1);
    assert.equal(await count(db, "realtime_grants"), 1);
    assert.equal(manifest.vaultCount, 1);
});

test("refuses --apply without the exact confirmation digest", async (t) => {
    const db = await createDb();
    t.after(() => dropDb(db));

    await seed(db, [{ id: randomUUID(), ops: [syntheticOp] }]);
    const { manifestPath } = await manifestFor(db);

    await assert.rejects(
        () => purge({ manifestPath, apply: true, database: db }),
        /requires --confirm/
    );
    await assert.rejects(
        () => purge({ manifestPath, apply: true, confirm: "0".repeat(64), database: db }),
        /requires --confirm/
    );
    assert.equal(await count(db, "vaults"), 1);
});

test("refuses a manifest whose selector file no longer matches", async (t) => {
    const db = await createDb();
    t.after(() => dropDb(db));

    await seed(db, [{ id: randomUUID(), ops: [syntheticOp] }]);
    const { manifest, manifestPath } = await manifestFor(db);

    const tampered = scratch(`tampered-${randomUUID()}.sql`);
    writeFileSync(
        tampered,
        `-- fixture-selection:begin
WITH selected_vaults AS (SELECT v.id, v.created_at, 'X'::text AS cohort FROM public.vaults v WHERE v.created_at <= :'cutoff'::timestamptz)
-- fixture-selection:end
SELECT * FROM selected_vaults;
`
    );
    await assert.rejects(
        () =>
            purge({
                manifestPath,
                selectorPath: tampered,
                apply: true,
                confirm: manifest.confirmationDigest,
                database: db
            }),
        /selector drift/
    );
    assert.equal(await count(db, "vaults"), 1);
});

test("refuses a partially absent manifest instead of completing silently", async (t) => {
    const db = await createDb();
    t.after(() => dropDb(db));

    const a = randomUUID();
    const b = randomUUID();
    await seed(db, [
        { id: a, memberships: [syntheticMembership] },
        { id: b, memberships: [syntheticMembership] }
    ]);
    const { manifest, manifestPath } = await manifestFor(db);
    assert.equal(manifest.vaultCount, 2);

    // A concurrent actor removes one manifest vault before the purge runs.
    const removed = await psqlExec(
        db,
        `DELETE FROM public.vault_memberships WHERE vault_id = '${a}';
DELETE FROM public.vaults WHERE id = '${a}';`
    );
    assert.equal(removed.code, 0, removed.stderr);

    await assert.rejects(
        () =>
            purge({
                manifestPath,
                apply: true,
                confirm: manifest.confirmationDigest,
                database: db
            }),
        /partial manifest absence/
    );
    assert.equal(await count(db, "vaults"), 1, "the surviving manifest vault was not deleted");
});

test("writer commits before the locks: selected drift is rejected and nothing is deleted", async (t) => {
    const db = await createDb();
    t.after(() => dropDb(db));

    const vault = randomUUID();
    await seed(db, [{ id: vault, ops: [syntheticOp] }]);
    const { manifest, manifestPath } = await manifestFor(db);

    const drift = await psqlExec(
        db,
        `INSERT INTO public.vault_ops (vault_id, version_vector, encrypted_data, author_pubkey_hash)
         VALUES ('${vault}', '${SYNTHETIC_OP_VV}', '${SYNTHETIC_OP_DATA}', 'late-writer');`
    );
    assert.equal(drift.code, 0, drift.stderr);

    await assert.rejects(
        () =>
            purge({
                manifestPath,
                apply: true,
                confirm: manifest.confirmationDigest,
                database: db
            }),
        /selected content drift/
    );
    assert.equal(await count(db, "vault_ops"), 2, "the purge did not delete anything");
    assert.equal(await count(db, "vaults"), 1);
});

test("schema drift after freezing aborts the purge", async (t) => {
    const db = await createDb();
    t.after(() => dropDb(db));

    await seed(db, [{ id: randomUUID(), ops: [syntheticOp] }]);
    const { manifest, manifestPath } = await manifestFor(db);

    const altered = await psqlExec(
        db,
        "ALTER TABLE public.vaults ADD COLUMN unexpected_column text;"
    );
    assert.equal(altered.code, 0, altered.stderr);

    await assert.rejects(
        () =>
            purge({
                manifestPath,
                apply: true,
                confirm: manifest.confirmationDigest,
                database: db
            }),
        /schema drift/
    );
    assert.equal(await count(db, "vaults"), 1);
});

test("duplicate maintenance run is refused fast by the advisory lock", async (t) => {
    const db = await createDb();
    t.after(() => dropDb(db));

    await seed(db, [{ id: randomUUID(), ops: [syntheticOp] }]);
    const { manifest, manifestPath } = await manifestFor(db);

    const holder = new PsqlSession({ container: CONTAINER, database: db }).start();
    t.after(() => holder.close());
    await holder.query("BEGIN");
    // pg_advisory_xact_lock() returns void — `void IS NULL` is false, so it proves nothing.
    // Take the lock with the try- variant instead, whose boolean result is real evidence.
    assert.equal(
        await holder.scalar("SELECT pg_try_advisory_xact_lock(906006006006)::text"),
        "true"
    );

    await assert.rejects(
        () =>
            purge({
                manifestPath,
                apply: true,
                confirm: manifest.confirmationDigest,
                database: db
            }),
        /holds the advisory lock/
    );
    await holder.query("ROLLBACK");
    assert.equal(await count(db, "vaults"), 1);
});

test("injected failure before COMMIT rolls back and leaves append-only enforcement restored", async (t) => {
    const db = await createDb();
    t.after(() => dropDb(db));

    const vault = randomUUID();
    await seed(db, [{ id: vault, ops: [{ ...syntheticOp, count: 3 }], grants: 2 }]);
    const { manifest, manifestPath } = await manifestFor(db);

    const opId = await scalar(
        db,
        `SELECT id FROM public.vault_ops WHERE vault_id = '${vault}' LIMIT 1;`
    );
    const before = await psqlExec(db, `DELETE FROM public.vault_ops WHERE id = '${opId}';`);
    assert.notEqual(before.code, 0);
    assert.match(before.stderr, /append-only/);

    await assert.rejects(
        () =>
            purge({
                manifestPath,
                apply: true,
                confirm: manifest.confirmationDigest,
                database: db,
                beforeCommitHook: () => {
                    throw new Error("injected failure");
                }
            }),
        /injected failure/
    );

    assert.equal(await count(db, "vault_ops"), 3, "the deletes rolled back");
    assert.equal(await count(db, "vaults"), 1);
    assert.equal(await count(db, "realtime_grants"), 2);

    const after = await psqlExec(db, `DELETE FROM public.vault_ops WHERE id = '${opId}';`);
    assert.notEqual(after.code, 0, "append-only enforcement is back on a fresh session");
    assert.match(after.stderr, /append-only/);
    assert.equal(await scalar(db, "SHOW session_replication_role;"), "origin");
});

test("process disconnection before COMMIT rolls the whole purge back", async (t) => {
    const db = await createDb();
    t.after(() => dropDb(db));

    const vault = randomUUID();
    await seed(db, [{ id: vault, ops: [{ ...syntheticOp, count: 2 }], grants: 1 }]);
    const { manifest, manifestPath } = await manifestFor(db);

    await assert.rejects(
        () =>
            purge({
                manifestPath,
                apply: true,
                confirm: manifest.confirmationDigest,
                database: db,
                beforeCommitHook: (session) => session.kill()
            }),
        /psql session ended/
    );

    assert.equal(await count(db, "vaults"), 1);
    assert.equal(await count(db, "vault_ops"), 2);
    assert.equal(await count(db, "realtime_grants"), 1);
});

test("writer arriving after the locks is fenced until COMMIT, then proceeds", async (t) => {
    const db = await createDb();
    t.after(() => dropDb(db));

    const fixture = randomUUID();
    const developer = randomUUID();
    await seed(db, [
        { id: fixture, ops: [syntheticOp], grants: 1 },
        { id: developer, memberships: [realMembership] }
    ]);
    const { manifest, manifestPath } = await manifestFor(db);

    const writer = new PsqlSession({ container: CONTAINER, database: db }).start();
    t.after(() => writer.close());
    let writerSettled = false;
    let writerPromise = null;

    const report = await purge({
        manifestPath,
        apply: true,
        confirm: manifest.confirmationDigest,
        database: db,
        afterLockHook: async (session) => {
            writerPromise = writer
                .query(
                    `INSERT INTO public.vault_ops (vault_id, version_vector, encrypted_data, author_pubkey_hash)
                     VALUES ('${developer}', '{"9":1}', 'unrelated-later-write', 'developer')`
                )
                .then(
                    (r) => {
                        writerSettled = true;
                        return r;
                    },
                    (e) => {
                        writerSettled = true;
                        throw e;
                    }
                );

            // Synchronise on the writer actually queueing behind our table lock — no sleeps.
            for (;;) {
                const waiting = await session.scalar(
                    `SELECT count(*)::text FROM pg_locks
                     WHERE NOT granted AND relation = 'public.vault_ops'::regclass`
                );
                if (Number(waiting) > 0) break;
            }
            assert.equal(
                writerSettled,
                false,
                "the writer is blocked while the maintenance locks are held"
            );
        }
    });

    assert.equal(report.outcome, "committed");
    await writerPromise;
    assert.equal(writerSettled, true, "the writer resumed once the transaction committed");

    assert.equal(
        await count(db, "vaults"),
        1,
        "the fixture vault is gone, the developer vault remains"
    );
    assert.equal(
        await scalar(
            db,
            "SELECT count(*) FROM public.vault_ops WHERE author_pubkey_hash = 'developer';"
        ),
        "1",
        "the fenced write landed intact after the purge"
    );
});

test("a conflicting lock holder makes the purge time out and roll back", async (t) => {
    const db = await createDb();
    t.after(() => dropDb(db));

    const vault = randomUUID();
    await seed(db, [{ id: vault, ops: [syntheticOp], grants: 1 }]);
    const { manifest, manifestPath } = await manifestFor(db);

    const blocker = new PsqlSession({ container: CONTAINER, database: db }).start();
    t.after(() => blocker.close());
    await blocker.query("BEGIN");
    await blocker.query("LOCK TABLE public.realtime_grants IN EXCLUSIVE MODE");

    await assert.rejects(
        () =>
            purge({
                manifestPath,
                apply: true,
                confirm: manifest.confirmationDigest,
                database: db,
                lockTimeout: "1s"
            }),
        /lock timeout|canceling statement/i
    );

    await blocker.query("ROLLBACK");
    assert.equal(await count(db, "vaults"), 1, "nothing was deleted");
    assert.equal(await count(db, "realtime_grants"), 1);
});

test("target guard refuses a database other than the one the manifest was frozen against", async (t) => {
    const db = await createDb();
    const other = await createDb();
    t.after(() => Promise.all([dropDb(db), dropDb(other)]));

    await seed(db, [{ id: randomUUID(), ops: [syntheticOp] }]);
    const { manifest, manifestPath } = await manifestFor(db);

    await assert.rejects(
        () =>
            purge({
                manifestPath,
                apply: true,
                confirm: manifest.confirmationDigest,
                database: other
            }),
        /target guard: database/
    );
    assert.equal(await count(db, "vaults"), 1);
});

test("unrelated data created after the cutoff is never selected or deleted", async (t) => {
    const db = await createDb();
    t.after(() => dropDb(db));

    const fixture = randomUUID();
    await seed(db, [{ id: fixture, ops: [{ ...syntheticOp, count: 2 }], grants: 1 }]);
    const { manifest, manifestPath } = await manifestFor(db);

    // New fixture-shaped data appears after the manifest was frozen. It is outside the manifest and
    // after the cutoff, so it must survive untouched.
    const later = randomUUID();
    await seed(db, [
        { id: later, createdAt: "2027-01-01 00:00:00+00", ops: [{ ...syntheticOp, count: 2 }] }
    ]);

    const report = await purge({
        manifestPath,
        apply: true,
        confirm: manifest.confirmationDigest,
        database: db
    });
    assert.equal(report.outcome, "committed");
    assert.equal(report.deleted.vaults, 1);
    assert.equal(
        await scalar(db, `SELECT count(*) FROM public.vaults WHERE id = '${later}';`),
        "1"
    );
    assert.equal(
        await scalar(db, `SELECT count(*) FROM public.vault_ops WHERE vault_id = '${later}';`),
        "2"
    );
});

test("refuses to apply a manifest frozen against a different runner build", async (t) => {
    const db = await createDb();
    t.after(() => dropDb(db));

    await seed(db, [{ id: randomUUID(), ops: [syntheticOp] }]);
    const { manifest, manifestPath } = await manifestFor(db);

    // Re-freeze the manifest as if it had been reviewed against an EARLIER build of the runner.
    // The digest is recomputed so the file is internally consistent: only the executable binding
    // is stale, which is exactly the case a reviewed-then-edited runner produces.
    const { confirmationDigest: _drop, ...body } = manifest;
    body.runnerSha256 = "0".repeat(64);
    const stale = { ...body, confirmationDigest: sha256(canonicalJson(body)) };
    const stalePath = scratch(`stale-runner-${randomUUID()}.json`);
    writeFileSync(stalePath, `${JSON.stringify(stale, null, 2)}\n`);

    await assert.rejects(
        () =>
            purge({
                manifestPath: stalePath,
                apply: true,
                confirm: stale.confirmationDigest,
                database: db
            }),
        /runner drift/
    );
    assert.equal(
        await count(db, "vaults"),
        1,
        "nothing was deleted under a stale executable binding"
    );

    // A dry run stays usable while the runner is being repaired.
    const dry = await purge({ manifestPath: stalePath, database: db });
    assert.equal(dry.outcome, "dry-run-validated");

    // The current manifest, frozen against THIS build, is accepted.
    const ok = await purge({
        manifestPath,
        apply: true,
        confirm: manifest.confirmationDigest,
        database: db
    });
    assert.equal(ok.outcome, "committed");
});

test("vacuumAnalyze reports one successful result per base table", async (t) => {
    const db = await createDb();
    t.after(() => dropDb(db));

    const before = { vaults: 1, ops: 1, grants: 1 };
    await seed(db, [
        { id: randomUUID(), memberships: [syntheticMembership], ops: [syntheticOp], grants: 1 }
    ]);
    const maintenance = await vacuumAnalyze({ container: CONTAINER, database: db });
    const results = maintenance.results;
    assert.deepEqual(
        results.map((r) => r.table),
        [...ALL_TABLES]
    );
    for (const r of results) assert.equal(r.ok, true, `${r.table}: ${r.error ?? ""}`);
    assert.equal(maintenance.complete, true);

    // Maintenance must not change data.
    assert.equal(await count(db, "vaults"), before.vaults);
    assert.equal(await count(db, "vault_ops"), before.ops);
    assert.equal(await count(db, "realtime_grants"), before.grants);
});

test("vacuumAnalyze refuses a wrong target before vacuuming anything", async (t) => {
    const db = await createDb();
    t.after(() => dropDb(db));

    await seed(db, [{ id: randomUUID(), ops: [syntheticOp] }]);

    await assert.rejects(
        () =>
            vacuumAnalyze({
                container: CONTAINER,
                database: db,
                expect: { database: "some_other_db" }
            }),
        /target guard: database/
    );
    await assert.rejects(
        () => vacuumAnalyze({ container: "mf006_not_a_container", database: db }),
        /No such object|target container|Error: No such/i
    );
});

test("one failed table yields incomplete maintenance that can be retried on its own", async (t) => {
    const db = await createDb();
    t.after(() => dropDb(db));

    await seed(db, [{ id: randomUUID(), ops: [syntheticOp], grants: 1 }]);

    // Make exactly one table un-vacuumable by dropping it; the rest must still be attempted and
    // reported, so the caller can see maintenance is incomplete rather than silently partial.
    const dropped = await psqlExec(db, "DROP TABLE public.vault_invites;");
    assert.equal(dropped.code, 0, dropped.stderr);

    const maintenance = await vacuumAnalyze({ container: CONTAINER, database: db });
    const results = maintenance.results;
    assert.equal(maintenance.complete, false, "one failed table means maintenance is incomplete");
    assert.deepEqual(
        results.map((r) => r.table),
        [...ALL_TABLES],
        "every table is still reported"
    );
    const failed = results.filter((r) => !r.ok);
    assert.equal(failed.length, 1);
    assert.equal(failed[0].table, "vault_invites");
    for (const r of results.filter((r) => r.table !== "vault_invites")) {
        assert.equal(r.ok, true, `${r.table}: ${r.error ?? ""}`);
    }

    // Maintenance-only retry after the cause is fixed — no deletion, no restore.
    const recreated = await psqlExec(
        db,
        `CREATE TABLE public.vault_invites (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            vault_id uuid NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
            invite_pubkey text NOT NULL UNIQUE,
            encrypted_vault_key text NOT NULL,
            role text NOT NULL,
            created_by text NOT NULL,
            expires_at timestamptz NOT NULL,
            created_at timestamptz DEFAULT now(),
            enc_public_key text
        );`
    );
    assert.equal(recreated.code, 0, recreated.stderr);

    const retry = await vacuumAnalyze({ container: CONTAINER, database: db });
    for (const r of retry.results) assert.equal(r.ok, true, `${r.table}: ${r.error ?? ""}`);
    assert.equal(retry.complete, true, "maintenance-only retry completes");
    assert.equal(await count(db, "vaults"), 1, "maintenance retry changed no data");
});
