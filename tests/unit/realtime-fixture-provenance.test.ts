/**
 * @vitest-environment node
 *
 * Unit Tests: the realtime fixture provenance convention.
 *
 * A fixture row that survives its own cleanup can only be identified afterwards by something the
 * row itself carries. Memberships and ops already carry constant marker ciphertext; snapshots do
 * not, because nothing in the integration helpers writes `public.vault_snapshots` at all — which is
 * exactly why tens of thousands of leaked vaults could not be classified later.
 *
 * These cases hold two things still. The marker pair reserved in `.claude/CLAUDE.md` stays as it is
 * and keeps saying what it does not mean, and the integration helpers keep mentioning the snapshot
 * table only in the scoped cleanup `DELETE`. A writer added without the rest of the convention
 * fails here rather than quietly producing another generation of unclassifiable rows.
 *
 * The source guard reads SQL out of string and template literals; it sees direct SQL only, not a
 * write hidden behind an RPC whose body it cannot read. The RPCs the helpers currently call were
 * audited by hand and touch no snapshot.
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const HELPERS_DIRECTORY = path.join("tests", "integration", "helpers");
const CONVENTION_FILE = path.join(".claude", "CLAUDE.md");
const CONVENTION_HEADING = "### Provenance markers for realtime fixture rows";

/** The reserved pair, written here independently of the document these tests read. */
const SNAPSHOT_MARKER = {
    encryptedData: "aHMwMTUtZW5jcnlwdGVkLXNuYXBzaG90",
    versionVector: "e30="
} as const;

/** The two pairs that already exist, so the document cannot silently rewrite them. */
const EXISTING_MARKERS = ["d3JhcHBlZA==", "cHVibGlj", "aHMwMTUtZW5jcnlwdGVkLW9w", "e30="] as const;

interface SnapshotStatement {
    /** The whitespace-normalised statement, as the guard read it out of the source. */
    readonly statement: string;
    /** True only for the scoped cleanup `DELETE` the helpers are allowed to contain. */
    readonly allowed: boolean;
}

const SNAPSHOT_TABLE = /\bvault_snapshots\b/i;
const SCOPED_CLEANUP_DELETE = /^delete from public\.vault_snapshots where vault_id in \(/i;

/**
 * Returns the contents of every string and template literal in `source`, skipping comments so a
 * sentence about `INSERT`ing a snapshot is not mistaken for one. Interpolations collapse to a
 * placeholder: what matters is the statement shape around them, never the value spliced in.
 */
function extractLiterals(source: string): readonly string[] {
    const literals: string[] = [];
    let index = 0;

    while (index < source.length) {
        const character = source[index];
        const following = source[index + 1];

        if (character === "/" && following === "/") {
            while (index < source.length && source[index] !== "\n") index++;
            continue;
        }
        if (character === "/" && following === "*") {
            index += 2;
            while (index < source.length && !(source[index] === "*" && source[index + 1] === "/")) {
                index++;
            }
            index += 2;
            continue;
        }
        if (character !== '"' && character !== "'" && character !== "`") {
            index++;
            continue;
        }

        const quote = character;
        const characters: string[] = [];
        index++;
        while (index < source.length && source[index] !== quote) {
            if (source[index] === "\\") {
                characters.push(source[index + 1] ?? "");
                index += 2;
                continue;
            }
            if (quote === "`" && source[index] === "$" && source[index + 1] === "{") {
                index += 2;
                let depth = 1;
                while (index < source.length && depth > 0) {
                    if (source[index] === "{") depth++;
                    else if (source[index] === "}") depth--;
                    index++;
                }
                characters.push("<value>");
                continue;
            }
            characters.push(source[index]);
            index++;
        }
        index++;
        literals.push(characters.join(""));
    }

    return literals;
}

/**
 * Every statement in `source` that names the snapshot table, classified. Splitting each literal on
 * `;` is what stops an allowed `DELETE` from vouching for a write batched beside it.
 */
function findSnapshotStatements(source: string): readonly SnapshotStatement[] {
    return extractLiterals(source)
        .flatMap((literal) => literal.split(";"))
        .map((statement) => statement.replace(/\s+/g, " ").trim())
        .filter((statement) => SNAPSHOT_TABLE.test(statement))
        .map((statement) => ({ statement, allowed: SCOPED_CLEANUP_DELETE.test(statement) }));
}

function readConventionSection(): string {
    const document = readFileSync(CONVENTION_FILE, "utf8");
    const start = document.indexOf(CONVENTION_HEADING);
    if (start < 0) throw new Error(`${CONVENTION_FILE} no longer documents the marker convention`);
    const rest = document.slice(start + CONVENTION_HEADING.length);
    const end = rest.search(/\n#{1,3} /);
    return end < 0 ? rest : rest.slice(0, end);
}

function decodeBase64(value: string): string {
    return Buffer.from(value, "base64").toString("utf8");
}

describe("the documented snapshot marker", () => {
    it("reserves a pair whose bytes decode to the values the convention names", () => {
        const section = readConventionSection();

        expect(decodeBase64(SNAPSHOT_MARKER.encryptedData)).toBe("hs015-encrypted-snapshot");
        expect(decodeBase64(SNAPSHOT_MARKER.versionVector)).toBe("{}");
        expect(section).toContain(SNAPSHOT_MARKER.encryptedData);
        expect(section).toContain(SNAPSHOT_MARKER.versionVector);
        expect(section).toContain("hs015-encrypted-snapshot");
        // A public test vector is not ciphertext anything can decrypt.
        expect(section).toMatch(/not genuine encrypted Loro data/);
    });

    it("leaves the membership and op markers the helpers already write untouched", () => {
        const section = readConventionSection();

        for (const marker of EXISTING_MARKERS) expect(section).toContain(marker);
        expect(section).toContain("createVaultOwnedBy");
        expect(section).toContain("appendVaultOp");
    });

    it("requires both columns and says a marker classifies nothing retroactively", () => {
        const section = readConventionSection();

        expect(section).toMatch(/\*\*both\*\* columns of its\s+pair match exactly/);
        expect(section).toMatch(/never retroactive/);
        // The emphasis marker around "unclassified" is the formatter's to choose, not this test's.
        expect(section).toMatch(/A missing, NULL or different marker means [*_]unclassified[*_]/);
        expect(section).toMatch(/classifies neither its\s+parent vault nor its siblings/);
        expect(section).toMatch(/authorizes a purge, a backfill, a retroactive/);
    });

    it("states what a future writer owes cleanup, counts and this guard", () => {
        const section = readConventionSection();

        expect(section).toMatch(/deletes snapshots exactly once/);
        expect(section).toMatch(/do not add a second `DELETE`/);
        expect(section).toMatch(/Extend `countVaultFixtureRows`/);
        expect(section).toMatch(/its return type, its empty-input result, its `SELECT`/);
        expect(section).toContain("tests/integration/realtime-origin-controls.test.ts");
        expect(section).toMatch(/Extend\s+the coverage; do not simply delete it/);
    });

    it("names the legacy migration fixture and the application path as deliberate exclusions", () => {
        const section = readConventionSection();

        expect(section).toContain("tests/database/legacy-upgrade-fixture.sql");
        expect(section).toContain("tests/database/legacy-upgrade-audit.sql");
        expect(section).toContain("src/server/routers/sync.ts:pushSnapshot");
        expect(section).toMatch(/must never write marker\s+bytes/);
    });
});

describe("the source guard classifies snapshot SQL", () => {
    it("accepts the scoped cleanup DELETE", () => {
        const source = [
            "runSql(`BEGIN;",
            "    SET LOCAL session_replication_role = replica;",
            "    DELETE FROM public.vault_snapshots WHERE vault_id IN (${list});",
            "    COMMIT;`);"
        ].join("\n");

        expect(findSnapshotStatements(source)).toEqual([
            {
                statement: "DELETE FROM public.vault_snapshots WHERE vault_id IN (<value>)",
                allowed: true
            }
        ]);
    });

    it("ignores line and block comments that merely mention the table", () => {
        const source = [
            "// Nothing here writes public.vault_snapshots.",
            "/* An INSERT INTO public.vault_snapshots would have to follow the convention. */",
            'export const unrelated = "SELECT 1;";'
        ].join("\n");

        expect(findSnapshotStatements(source)).toEqual([]);
    });

    it("rejects an INSERT, an UPDATE, an ON CONFLICT upsert and a client-side upsert call", () => {
        const samples = [
            "runSql('INSERT INTO public.vault_snapshots (vault_id) VALUES (' + id + ');');",
            "runSql('UPDATE public.vault_snapshots SET encrypted_data = ' + data + ';');",
            [
                "runSql('INSERT INTO public.vault_snapshots (vault_id, encrypted_data)",
                " VALUES (' + id + ') ON CONFLICT (vault_id) DO UPDATE SET encrypted_data = 1;');"
            ].join(""),
            'await supabase.from("vault_snapshots").upsert(row);'
        ];

        for (const sample of samples) {
            const statements = findSnapshotStatements(sample);
            expect(statements.length).toBeGreaterThan(0);
            expect(statements.every((found) => !found.allowed)).toBe(true);
        }
    });

    it("rejects a write batched beside an allowed DELETE, so cleanup cannot vouch for it", () => {
        const source = [
            "runSql(`BEGIN;",
            "    DELETE FROM public.vault_snapshots WHERE vault_id IN (${list});",
            "    INSERT INTO public.vault_snapshots (vault_id) VALUES (${id});",
            "    COMMIT;`);"
        ].join("\n");

        const statements = findSnapshotStatements(source);

        expect(statements.map((found) => found.allowed)).toEqual([true, false]);
    });
});

describe("the integration helpers only ever delete vault_snapshots", () => {
    const helperFiles = readdirSync(HELPERS_DIRECTORY).filter((name) => name.endsWith(".ts"));
    const sources = helperFiles.map((name) => ({
        name,
        source: readFileSync(path.join(HELPERS_DIRECTORY, name), "utf8")
    }));

    it("reads real helper SQL rather than passing on an empty scan", () => {
        expect(helperFiles).toContain("realtime-stack.ts");

        const literals = sources.flatMap(({ source }) => extractLiterals(source));

        // If the extractor stopped seeing SQL, every assertion below would pass vacuously.
        expect(literals.some((literal) => literal.includes("public.create_vault_for_owner"))).toBe(
            true
        );
        expect(literals.some((literal) => literal.includes("aHMwMTUtZW5jcnlwdGVkLW9w"))).toBe(true);
    });

    it("contains exactly one snapshot statement and it is the scoped cleanup DELETE", () => {
        const statements = sources.flatMap(({ source }) => findSnapshotStatements(source));

        expect(statements).toEqual([
            {
                statement: "DELETE FROM public.vault_snapshots WHERE vault_id IN (<value>)",
                allowed: true
            }
        ]);
    });
});
