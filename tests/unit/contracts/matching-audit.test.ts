/**
 * Symptom regression for MF-005 / CA-MTPN1LJQ-0008-YYWW.
 *
 * The canonical matching audit (`specs/016-automation-interaction-contract/matching-audit.md`) was
 * promised by MF-001 and never delivered, so the automation behaviour contract had no reviewable
 * evidence. This test reads that EXACT repository-relative file and fails when it is absent — the
 * original symptom — and then holds it to substantive content rather than headings alone.
 *
 * What it asserts, and why each check exists:
 *
 * - Every required row id is present with a non-placeholder body. Row ids are stable handles the
 *   contract can be cited by; asserting ids (not prose) keeps the document editable without
 *   freezing wording into a snapshot.
 * - Every `src/…` and `tests/…` citation in the document resolves to a real file, and any
 *   `path:line` citation names a line that exists. A source-cited matrix whose citations rot is
 *   indistinguishable from an invented one.
 * - No redaction markers, TODO placeholders or empty matrix cells survive in the delivered
 *   document. The failed assertion was produced against redacted evidence; the repair must not
 *   reintroduce it.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const REPOSITORY_ROOT = path.resolve(__dirname, "../../..");
const AUDIT_RELATIVE_PATH = "specs/016-automation-interaction-contract/matching-audit.md";
const AUDIT_ABSOLUTE_PATH = path.join(REPOSITORY_ROOT, AUDIT_RELATIVE_PATH);

/**
 * Required rows, keyed by the stable id the document must carry. Each entry names the acceptance
 * topic it discharges so a failure points at the missing contract element, not just a missing
 * string.
 */
const REQUIRED_ROWS: readonly { readonly id: string; readonly topic: string }[] = [
    { id: "MA-LINK-01", topic: "no stored transaction-to-rule link; rules match facts" },
    {
        id: "MA-LINK-02",
        topic: "persisted descriptionAliasId is an alias reference, not a rule link"
    },
    { id: "MA-LINK-03", topic: "plan/outcome ruleId is transient in-memory provenance" },
    {
        id: "MA-LINK-04",
        topic: "legacy automationApplications.automationId is a retained declaration"
    },
    { id: "MA-RANK-01", topic: "rank 0 unscoped description-only" },
    { id: "MA-RANK-02", topic: "rank 1 description + amount" },
    { id: "MA-RANK-03", topic: "rank 2 description + account" },
    { id: "MA-RANK-04", topic: "rank 3 description + account + amount" },
    { id: "MA-TIE-01", topic: "rank tie breaks on newest createdAt" },
    { id: "MA-TIE-02", topic: "equal createdAt breaks on greatest lexical id" },
    { id: "MA-TIE-03", topic: "update preserves createdAt: recency is not last edit" },
    { id: "MA-MATCH-01", topic: "exact case/whitespace-sensitive description matching" },
    { id: "MA-MATCH-02", topic: "null description matches nothing" },
    { id: "MA-MATCH-03", topic: "per-field independent winner selection" },
    { id: "MA-MATCH-04", topic: "zero and negative amounts are exact constraints" },
    { id: "MA-ELIG-01", topic: "description-alias rules never apply to manual rows" },
    { id: "MA-ELIG-02", topic: "tag and whole-allocation rules do apply to manual rows" },
    { id: "MA-ELIG-03", topic: "imported rows match raw text despite a display alias" },
    { id: "MA-ELIG-04", topic: "manual rows match the resolved alias name" },
    { id: "MA-ALIAS-01", topic: "create and normalized exact-name reuse / duplicate rejection" },
    { id: "MA-ALIAS-02", topic: "assign and reverse transactionIds backlinks" },
    { id: "MA-ALIAS-03", topic: "change-one isolation and stale expectedAliasId rejection" },
    { id: "MA-ALIAS-04", topic: "rename shares one identity across referencing rows" },
    { id: "MA-ALIAS-05", topic: "change-all converts source to symlink and retargets inbound" },
    { id: "MA-ALIAS-06", topic: "remove-one detaches a single row" },
    { id: "MA-ALIAS-07", topic: "remove-all clears references and soft-deletes" },
    { id: "MA-ALIAS-08", topic: "missing/deleted alias references and repair" },
    { id: "MA-PERSIST-01", topic: "Loro vault persistence, not Fusion PostgreSQL" },
    { id: "MA-PERSIST-02", topic: "separate undo groups; no single cross-surface transaction" },
    { id: "MA-PERSIST-03", topic: "per-field typed outcomes without universal rollback" },
    { id: "MA-PREF-01", topic: "remembered choice defaults when no record exists" },
    { id: "MA-PREF-02", topic: "preferences are per-pubkeyHash user state" },
    { id: "MA-PREF-03", topic: "absent identity skips the preference write" },
    { id: "MA-PREF-04", topic: "manager Save versus explicit Apply entry points" },
    { id: "MA-BLUR-01", topic: "automatic modes require a genuine row exit" },
    { id: "MA-BLUR-02", topic: "manual modes require an explicit confirm" },
    {
        id: "MA-BLUR-03",
        topic: "appliedRef guards duplicate application; validation permits retry"
    },
    { id: "MA-BLUR-04", topic: "row-owned portals count as still inside the row" },
    { id: "MA-BLUR-05", topic: "cleanup does not cancel queued timer callbacks (hazard)" }
];

/** Markers that indicate an unfinished or redacted document rather than a delivered contract. */
const PLACEHOLDER_MARKERS: readonly string[] = [
    "external path omitted",
    "path omitted",
    "TODO",
    "TBD",
    "FIXME",
    "<!-- placeholder"
];

function readAudit(): string {
    expect(
        existsSync(AUDIT_ABSOLUTE_PATH),
        `The canonical matching audit is missing at ${AUDIT_RELATIVE_PATH}. This is the exact symptom recorded by CA-MTPN1LJQ-0008-YYWW.`
    ).toBe(true);
    return readFileSync(AUDIT_ABSOLUTE_PATH, "utf8");
}

/**
 * The body of a row: everything on the line carrying the id, after the id itself. Rows are markdown
 * table rows, so this is the remainder of the cells — which is what must be substantive.
 */
function rowBody(document: string, id: string): string | null {
    for (const line of document.split("\n")) {
        const index = line.indexOf(id);
        if (index === -1) continue;
        return line.slice(index + id.length);
    }
    return null;
}

/** Every `src/…` or `tests/…` path the document cites, with an optional `:line` suffix. */
function citedPaths(
    document: string
): readonly { readonly file: string; readonly line?: number }[] {
    const pattern = /\b((?:src|tests|specs)\/[A-Za-z0-9_./()@-]*[A-Za-z0-9_)])(?::(\d+))?/g;
    const cited = new Map<string, { readonly file: string; readonly line?: number }>();
    for (const match of document.matchAll(pattern)) {
        const file = match[1];
        if (file == null) continue;
        const lineText = match[2];
        const key = lineText == null ? file : `${file}:${lineText}`;
        cited.set(key, lineText == null ? { file } : { file, line: Number.parseInt(lineText, 10) });
    }
    return [...cited.values()];
}

describe("MF-005 canonical matching audit", () => {
    it("exists at the exact contract-designated repository path", () => {
        const document = readAudit();
        expect(document.trim().length).toBeGreaterThan(0);
    });

    it("records every required contract row with a substantive body", () => {
        const document = readAudit();
        const missing: string[] = [];
        const thin: string[] = [];

        for (const { id, topic } of REQUIRED_ROWS) {
            const body = rowBody(document, id);
            if (body == null) {
                missing.push(`${id} (${topic})`);
                continue;
            }
            // Strip table pipes and whitespace: what remains is the actual recorded behaviour.
            const substance = body.replaceAll("|", " ").trim();
            if (substance.length < 40) thin.push(`${id} (${topic}) -> "${substance}"`);
        }

        expect(missing, `Missing required contract rows: ${missing.join(", ")}`).toEqual([]);
        expect(thin, `Placeholder-thin contract rows: ${thin.join(" ;; ")}`).toEqual([]);
    });

    it("covers the four acceptance topics of the failed assertion by name", () => {
        const document = readAudit().toLowerCase();
        // (a) rejection of stored transaction-to-rule links, and the two distinctions it turns on.
        expect(document).toContain("descriptionaliasid");
        expect(document).toContain("automationapplications");
        // (b) the four-rank ladder, spelled out rather than merely alluded to.
        expect(document).toContain("description + account + amount");
        // (c) alias lifecycle verbs.
        expect(document).toContain("change all");
        expect(document).toContain("remove all");
        // (d) manual-versus-imported eligibility.
        expect(document).toContain("manual");
        expect(document).toContain("imported");
    });

    it("cites only source and test paths that resolve in this repository", () => {
        const document = readAudit();
        const unresolvable: string[] = [];

        for (const citation of citedPaths(document)) {
            const absolute = path.join(REPOSITORY_ROOT, citation.file);
            if (!existsSync(absolute)) {
                unresolvable.push(citation.file);
                continue;
            }
            if (citation.line == null) continue;
            const lineCount = readFileSync(absolute, "utf8").split("\n").length;
            if (citation.line < 1 || citation.line > lineCount) {
                unresolvable.push(
                    `${citation.file}:${citation.line} (file has ${lineCount} lines)`
                );
            }
        }

        expect(unresolvable, `Unresolvable citations: ${unresolvable.join(", ")}`).toEqual([]);
    });

    it("cites the production matching, alias and preference modules it claims to audit", () => {
        const document = readAudit();
        for (const required of [
            "src/lib/domain/automation/rules.ts",
            "src/lib/domain/automation/apply.ts",
            "src/lib/domain/automation/preferences.ts",
            "src/lib/domain/automation/apply-mode.ts",
            "src/lib/crdt/field-rules.ts",
            "src/lib/crdt/field-rule-mutations.ts",
            "src/lib/crdt/description-aliases.ts",
            "specs/fusion-mission-recovery/historical/TransactionRuleProposal.tsx.txt"
        ]) {
            expect(document, `audit does not cite ${required}`).toContain(required);
        }
    });

    it("carries no redaction markers or unfinished placeholders", () => {
        const document = readAudit();
        const found = PLACEHOLDER_MARKERS.filter((marker) => document.includes(marker));
        expect(found, `Placeholder/redaction markers present: ${found.join(", ")}`).toEqual([]);
    });
});
