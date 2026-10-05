/**
 * Real-artifact validation for the grouped-rule ownership decision packet.
 *
 * The acceptance criterion this task repairs is not "a document exists" but "every ambiguous case
 * has an APPROVED resolution". Those are different failures and this file keeps them apart:
 *
 *   - `validateOwnershipPacket` returns STRUCTURAL issues — a missing decision, a blank or
 *     placeholder resolution, a manifest resolution that has drifted away from the contract prose,
 *     a dangling scenario/test/prototype reference, a duplicated or orphaned decision id.
 *   - It returns the approval gate separately, as `approval-absent` / `approval-*` issues. A packet
 *     may be structurally perfect and still unapproved; that is a legitimate DRAFT state and it is
 *     never a passing acceptance gate.
 *
 * Every assertion here reads the DELIVERED files from disk. Negative fixtures are derived by
 * perturbing a copy of the delivered manifest, so a fixture can never stand in for the real thing:
 * if the shipped packet regressed, the positive assertions fail regardless of how many negative
 * fixtures pass.
 *
 * No assertion in this file is, or can be, user approval (§7.0 of the contract).
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { z } from "zod";

// ============================================================================
// Delivered artefact paths
// ============================================================================

const CONTRACT_PATH = "specs/automation-rule-ownership.md";
const MANIFEST_PATH = "specs/016-automation-interaction-contract/ownership-approval.json";
const PROTOTYPE_PATH = "specs/016-automation-interaction-contract/ownership-approval.html";
const CHARACTERIZATION_PATH = "tests/integration/grouped-rule-ownership-contract.test.ts";

function readDelivered(relativePath: string): string {
    return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

// ============================================================================
// Manifest shape
// ============================================================================

const ApprovalSchema = z.object({
    approver: z.string(),
    evidenceReference: z.string(),
    date: z.string(),
    quotedAuthorization: z.string(),
    approvedSemanticRevision: z.string(),
    /**
     * The digest the approver actually approved, recomputed from the delivered bytes at validation
     * time. This — not the revision label — is what makes an approval stale when the semantics move.
     */
    approvedSemanticDigest: z.string()
});

const SemanticDigestSchema = z.object({
    algorithm: z.literal("sha256"),
    value: z.string(),
    regions: z.array(z.object({ region: z.string(), sha256: z.string() }))
});

const DecisionSchema = z.object({
    id: z.string(),
    title: z.string(),
    resolution: z.string(),
    affectedExamples: z.string(),
    scenarioClasses: z.array(z.string())
});

const ExampleClassSchema = z.object({
    id: z.string(),
    name: z.string(),
    scenarios: z.array(z.string()),
    tests: z.array(z.string()),
    prototypeScenarios: z.array(z.string())
});

const ChecklistItemSchema = z.object({
    id: z.string(),
    requirement: z.string(),
    decisions: z.array(z.string()),
    scenarios: z.array(z.string())
});

const ManifestSchema = z.object({
    task: z.string(),
    contract: z.string(),
    semanticRevision: z.string(),
    semanticRegions: z.array(z.string()).min(1),
    semanticRegionsExcluded: z.array(z.string()).min(1),
    semanticDigest: SemanticDigestSchema,
    acceptance: z.object({
        criterion: z.string(),
        status: z.union([z.literal("approved"), z.literal("unapproved")]),
        reason: z.string()
    }),
    decisions: z.array(DecisionSchema),
    exampleClasses: z.array(ExampleClassSchema),
    prototype: z.object({
        path: z.string(),
        e2e: z.string(),
        viewports: z
            .array(z.object({ name: z.string(), width: z.number(), height: z.number() }))
            .min(1),
        synthetic: z.boolean(),
        writesNothing: z.boolean(),
        checklist: z.array(ChecklistItemSchema)
    }),
    characterization: z.object({ path: z.string(), establishes: z.string() }),
    approval: ApprovalSchema.nullable()
});

type Manifest = z.infer<typeof ManifestSchema>;

// ============================================================================
// Validator
// ============================================================================

const ISSUE_CODES = [
    "manifest-unparseable",
    "revision-mismatch",
    "decision-missing",
    "decision-duplicate",
    "decision-orphan",
    "decision-count",
    "resolution-blank",
    "resolution-placeholder",
    "resolution-divergent",
    "d017-deferred",
    "class-missing",
    "class-empty",
    "scenario-dangling",
    "test-dangling",
    "prototype-scenario-dangling",
    "checklist-missing",
    "checklist-divergent",
    "acceptance-overclaimed",
    "approval-absent",
    "approval-incomplete",
    "approval-placeholder",
    "approval-wrong-revision",
    "approval-stale-digest",
    "digest-region-unknown",
    "digest-region-missing",
    "digest-region-mismatch",
    "digest-mismatch"
] as const;

type IssueCode = (typeof ISSUE_CODES)[number];

interface PacketIssue {
    readonly code: IssueCode;
    readonly detail: string;
}

interface PacketSources {
    readonly contract: string;
    readonly manifest: unknown;
    readonly prototype: string;
    readonly characterization: string;
}

const REQUIRED_DECISION_IDS: readonly string[] = Array.from(
    { length: 20 },
    (_, index) => `D-${String(index + 1).padStart(3, "0")}`
);

const REQUIRED_CLASS_IDS = ["EC-01", "EC-02", "EC-03", "EC-04", "EC-05"] as const;

const REQUIRED_CHECKLIST_IDS: readonly string[] = Array.from(
    { length: 14 },
    (_, index) => `M-${String(index + 1).padStart(2, "0")}`
);

/**
 * Words that make a "resolution" no resolution at all. The historical failure this task repairs is
 * exactly a ledger of these, so they are rejected by name rather than by length alone.
 */
const PLACEHOLDER_PATTERNS: readonly RegExp[] = [
    /^pending\b/i,
    /^tbd\b/i,
    /^todo\b/i,
    /^unresolved\b/i,
    /^—$/,
    /^-+$/,
    /^n\/a$/i,
    /\bpending user approval\b/i,
    /\bresolution pending\b/i
];

const MINIMUM_RESOLUTION_LENGTH = 40;

function normalize(value: string): string {
    return value.replace(/\s+/g, " ").trim();
}

function isPlaceholder(value: string): boolean {
    const normalized = normalize(value);
    return normalized.length === 0 || PLACEHOLDER_PATTERNS.some((rx) => rx.test(normalized));
}

/** Cells of a markdown table row, trimmed and whitespace-collapsed. */
function tableCells(line: string): readonly string[] {
    return line
        .slice(1, -1)
        .split("|")
        .map((cell) => normalize(cell));
}

interface LedgerRow {
    readonly id: string;
    readonly title: string;
    readonly resolution: string;
}

/** §7.1 — one row per decision. */
function parseLedger(contract: string): readonly LedgerRow[] {
    return contract
        .split("\n")
        .filter((line) => /^\| D-\d{3} /.test(line))
        .map((line) => {
            const cells = tableCells(line);
            const heading = cells[0] ?? "";
            return {
                id: heading.slice(0, 5),
                title: heading.slice(6),
                resolution: cells[1] ?? ""
            };
        });
}

interface ChecklistRow {
    readonly id: string;
    readonly requirement: string;
}

/** §7.2 — the downstream mockup checklist. */
function parseChecklist(contract: string): readonly ChecklistRow[] {
    return contract
        .split("\n")
        .filter((line) => /^\| M-\d{2} \|/.test(line))
        .map((line) => {
            const cells = tableCells(line);
            return { id: cells[0] ?? "", requirement: cells[1] ?? "" };
        });
}

function idsPresentIn(source: string, pattern: RegExp): ReadonlySet<string> {
    return new Set(source.match(pattern) ?? []);
}

function validateDecisions(manifest: Manifest, ledger: readonly LedgerRow[]): PacketIssue[] {
    const issues: PacketIssue[] = [];
    const seen = new Set<string>();
    const ledgerById = new Map(ledger.map((row) => [row.id, row]));

    for (const decision of manifest.decisions) {
        if (seen.has(decision.id)) {
            issues.push({ code: "decision-duplicate", detail: `${decision.id} appears twice` });
        }
        seen.add(decision.id);

        if (!ledgerById.has(decision.id)) {
            issues.push({
                code: "decision-orphan",
                detail: `${decision.id} is in the manifest but has no §7.1 ledger row`
            });
        }

        if (normalize(decision.resolution).length === 0) {
            issues.push({ code: "resolution-blank", detail: `${decision.id} has no resolution` });
            continue;
        }

        if (isPlaceholder(decision.resolution)) {
            issues.push({
                code: "resolution-placeholder",
                detail: `${decision.id} carries a placeholder, not a resolution: "${normalize(decision.resolution).slice(0, 60)}"`
            });
            continue;
        }

        if (normalize(decision.resolution).length < MINIMUM_RESOLUTION_LENGTH) {
            issues.push({
                code: "resolution-placeholder",
                detail: `${decision.id}'s resolution is too short to be reviewable`
            });
        }

        const row = ledgerById.get(decision.id);
        if (row && normalize(row.resolution) !== normalize(decision.resolution)) {
            issues.push({
                code: "resolution-divergent",
                detail: `${decision.id}: the manifest resolution does not match the §7.1 prose`
            });
        }
    }

    for (const required of REQUIRED_DECISION_IDS) {
        if (!seen.has(required)) {
            issues.push({ code: "decision-missing", detail: `${required} is absent` });
        }
    }

    if (manifest.decisions.length !== REQUIRED_DECISION_IDS.length) {
        issues.push({
            code: "decision-count",
            detail: `expected ${REQUIRED_DECISION_IDS.length} decisions, found ${manifest.decisions.length}`
        });
    }

    const d017 = manifest.decisions.find((decision) => decision.id === "D-017");
    if (d017 && /\b(deferred|defer|unresolved|out of scope|later task)\b/i.test(d017.resolution)) {
        issues.push({
            code: "d017-deferred",
            detail: "D-017 (atomicity) is deferred rather than resolved"
        });
    }

    return issues;
}

function validateClasses(manifest: Manifest, sources: PacketSources): PacketIssue[] {
    const issues: PacketIssue[] = [];
    const scenarioIds = idsPresentIn(sources.contract, /S-\d{2}/g);
    const testIds = idsPresentIn(sources.characterization, /EX-\d{2}b?/g);
    const prototypeIds = idsPresentIn(sources.prototype, /P-\d{2}/g);
    const present = new Set(manifest.exampleClasses.map((entry) => entry.id));

    for (const required of REQUIRED_CLASS_IDS) {
        if (!present.has(required)) {
            issues.push({ code: "class-missing", detail: `${required} is absent` });
        }
    }

    for (const entry of manifest.exampleClasses) {
        if (
            entry.scenarios.length === 0 ||
            entry.tests.length === 0 ||
            entry.prototypeScenarios.length === 0
        ) {
            issues.push({
                code: "class-empty",
                detail: `${entry.id} must name at least one scenario, test and prototype scenario`
            });
        }
        for (const scenario of entry.scenarios) {
            if (!scenarioIds.has(scenario)) {
                issues.push({
                    code: "scenario-dangling",
                    detail: `${entry.id} cites ${scenario}, which the contract does not define`
                });
            }
        }
        for (const test of entry.tests) {
            if (!testIds.has(test)) {
                issues.push({
                    code: "test-dangling",
                    detail: `${entry.id} cites ${test}, which ${CHARACTERIZATION_PATH} does not assert`
                });
            }
        }
        for (const scenario of entry.prototypeScenarios) {
            if (!prototypeIds.has(scenario)) {
                issues.push({
                    code: "prototype-scenario-dangling",
                    detail: `${entry.id} cites ${scenario}, which the prototype does not render`
                });
            }
        }
    }

    return issues;
}

function validateChecklist(manifest: Manifest, checklist: readonly ChecklistRow[]): PacketIssue[] {
    const issues: PacketIssue[] = [];
    const byId = new Map(checklist.map((row) => [row.id, row]));
    const present = new Set(manifest.prototype.checklist.map((item) => item.id));

    for (const required of REQUIRED_CHECKLIST_IDS) {
        if (!present.has(required)) {
            issues.push({ code: "checklist-missing", detail: `${required} is absent` });
        }
    }

    for (const item of manifest.prototype.checklist) {
        const row = byId.get(item.id);
        if (!row) {
            issues.push({
                code: "checklist-missing",
                detail: `${item.id} has no §7.2 row`
            });
            continue;
        }
        if (normalize(row.requirement) !== normalize(item.requirement)) {
            issues.push({
                code: "checklist-divergent",
                detail: `${item.id}: the manifest requirement does not match §7.2`
            });
        }
    }

    return issues;
}

// ============================================================================
// Semantic digest — the content check a revision label cannot perform
// ============================================================================

/**
 * A revision label is a string an editor can leave untouched while rewriting everything around it.
 * The digest closes that hole: each declared semantic region is re-extracted from the delivered
 * bytes by the deterministic rule §7.0 states, hashed, and combined. Nothing is stored except the
 * hashes themselves, so the digest cannot drift out of date the way a copied excerpt would.
 */

/** `## N. …` / `### N.N …` slice, heading included, up to the next heading at or above its level. */
function headingSlice(source: string, startPattern: RegExp, stopPattern: RegExp): string | null {
    const lines = source.split("\n");
    const start = lines.findIndex((line) => startPattern.test(line));
    if (start === -1) {
        return null;
    }
    let end = lines.length;
    for (let index = start + 1; index < lines.length; index += 1) {
        const line = lines[index];
        if (line !== undefined && stopPattern.test(line)) {
            end = index;
            break;
        }
    }
    return lines.slice(start, end).join("\n").trimEnd();
}

/**
 * The §7.1 semantic cells only: id/title, resolution and affected examples. The Status, evidence and
 * approved-revision columns are excluded by construction, which is what keeps the binding
 * non-circular — recording an approval must not perturb the digest it approves.
 */
function ledgerSemanticCells(contract: string): string | null {
    const rows = parseLedger(contract);
    if (rows.length === 0) {
        return null;
    }
    return contract
        .split("\n")
        .filter((line) => /^\| D-\d{3} /.test(line))
        .map((line) => tableCells(line).slice(0, 3).join(" | "))
        .join("\n");
}

/** Resolve a declared region name to the bytes it names, or null when it names nothing. */
function extractRegion(region: string, sources: PacketSources): string | null {
    switch (region) {
        case "specs/automation-rule-ownership.md §1-§6":
            return headingSlice(sources.contract, /^## 1\. /, /^## 7\. /);
        case "specs/automation-rule-ownership.md §7.1 columns: Decision, Resolution at this revision, Affected examples":
            return ledgerSemanticCells(sources.contract);
        case "specs/automation-rule-ownership.md §7.2":
            return headingSlice(sources.contract, /^### 7\.2 /, /^#{2,3} /);
        case "specs/automation-rule-ownership.md §7.4":
            return headingSlice(sources.contract, /^### 7\.4 /, /^#{2,3} /);
        case "specs/automation-rule-ownership.md §7.6":
            return headingSlice(sources.contract, /^### 7\.6 /, /^#{2,3} /);
        case "specs/016-automation-interaction-contract/ownership-approval.html":
            return sources.prototype;
        default:
            return null;
    }
}

function sha256(value: string): string {
    return createHash("sha256").update(value, "utf8").digest("hex");
}

interface ComputedDigest {
    readonly value: string;
    readonly regions: ReadonlyArray<{ readonly region: string; readonly sha256: string }>;
    readonly unknown: readonly string[];
}

/** Recompute the digest from the delivered files, in the manifest's declared region order. */
function computeSemanticDigest(manifest: Manifest, sources: PacketSources): ComputedDigest {
    const regions: Array<{ region: string; sha256: string }> = [];
    const unknown: string[] = [];

    for (const region of manifest.semanticRegions) {
        const content = extractRegion(region, sources);
        if (content == null) {
            unknown.push(region);
            continue;
        }
        regions.push({ region, sha256: sha256(content) });
    }

    const value = sha256(regions.map((entry) => `${entry.region}\n${entry.sha256}`).join("\n"));
    return { value, regions, unknown };
}

function validateDigest(manifest: Manifest, computed: ComputedDigest): PacketIssue[] {
    const issues: PacketIssue[] = [];

    for (const region of computed.unknown) {
        issues.push({
            code: "digest-region-unknown",
            detail: `${region} names no extractable content in the delivered files`
        });
    }

    const declared = new Map(manifest.semanticDigest.regions.map((entry) => [entry.region, entry]));
    for (const entry of computed.regions) {
        const stated = declared.get(entry.region);
        if (stated == null) {
            issues.push({
                code: "digest-region-missing",
                detail: `${entry.region} is a semantic region with no hash in semanticDigest.regions`
            });
            continue;
        }
        if (stated.sha256 !== entry.sha256) {
            issues.push({
                code: "digest-region-mismatch",
                detail: `${entry.region}: manifest ${stated.sha256.slice(0, 12)}… ≠ delivered ${entry.sha256.slice(0, 12)}…`
            });
        }
    }

    if (manifest.semanticDigest.value !== computed.value) {
        issues.push({
            code: "digest-mismatch",
            detail: `manifest ${manifest.semanticDigest.value.slice(0, 12)}… ≠ delivered ${computed.value.slice(0, 12)}…`
        });
    }

    return issues;
}

function validateApproval(
    manifest: Manifest,
    contract: string,
    computedDigest: string
): PacketIssue[] {
    const approval = manifest.approval;

    if (approval == null) {
        const issues: PacketIssue[] = [
            {
                code: "approval-absent",
                detail: `no approval is recorded for ${manifest.semanticRevision}`
            }
        ];
        if (manifest.acceptance.status === "approved") {
            issues.push({
                code: "acceptance-overclaimed",
                detail: "acceptance.status says approved while the approval block is null"
            });
        }
        // The historical failure: every ledger row RESOLVED but no evidence anywhere.
        if (/\bapproved by\b/i.test(contract) && !/\bNOT MET\b/.test(contract)) {
            issues.push({
                code: "acceptance-overclaimed",
                detail: "the contract prose claims approval the manifest does not carry"
            });
        }
        return issues;
    }

    const issues: PacketIssue[] = [];
    const fields: ReadonlyArray<readonly [string, string]> = [
        ["approver", approval.approver],
        ["evidenceReference", approval.evidenceReference],
        ["date", approval.date],
        ["quotedAuthorization", approval.quotedAuthorization],
        ["approvedSemanticRevision", approval.approvedSemanticRevision]
    ];

    for (const [name, value] of fields) {
        if (normalize(value).length === 0) {
            issues.push({ code: "approval-incomplete", detail: `${name} is empty` });
        } else if (
            isPlaceholder(value) ||
            /\b(tbd|todo|placeholder|example|lorem|xxx|fixme)\b/i.test(value)
        ) {
            issues.push({ code: "approval-placeholder", detail: `${name} is a placeholder` });
        }
    }

    if (!/^\d{4}-\d{2}-\d{2}/.test(approval.date)) {
        issues.push({ code: "approval-incomplete", detail: "date is not an ISO date" });
    }

    if (approval.approvedSemanticRevision !== manifest.semanticRevision) {
        issues.push({
            code: "approval-wrong-revision",
            detail: `approval names ${approval.approvedSemanticRevision}; the packet is ${manifest.semanticRevision}`
        });
    }

    // The content check the label cannot perform. Compared against the digest RECOMPUTED from the
    // delivered files, never against the manifest's own copy of it: editing the semantics and the
    // manifest's `semanticDigest.value` together still leaves this comparison failing.
    if (approval.approvedSemanticDigest !== computedDigest) {
        issues.push({
            code: "approval-stale-digest",
            detail: `approval was given for ${approval.approvedSemanticDigest.slice(0, 12)}…; the delivered semantics hash to ${computedDigest.slice(0, 12)}…`
        });
    }

    if (manifest.acceptance.status !== "approved" && issues.length === 0) {
        issues.push({
            code: "acceptance-overclaimed",
            detail: "a complete approval block is recorded but acceptance.status is still unapproved"
        });
    }

    return issues;
}

/** Every defect in the delivered packet, structural and approval alike. */
function validateOwnershipPacket(sources: PacketSources): readonly PacketIssue[] {
    const parsed = ManifestSchema.safeParse(sources.manifest);
    if (!parsed.success) {
        return [{ code: "manifest-unparseable", detail: parsed.error.issues[0]?.message ?? "" }];
    }
    const manifest = parsed.data;

    const contractRevision = sources.contract.match(/\*\*Semantic revision:\*\* `([A-Za-z0-9-]+)`/);
    const issues: PacketIssue[] = [];

    if (contractRevision == null) {
        issues.push({
            code: "revision-mismatch",
            detail: "the contract names no semantic revision"
        });
    } else if (contractRevision[1] !== manifest.semanticRevision) {
        issues.push({
            code: "revision-mismatch",
            detail: `contract ${contractRevision[1]} ≠ manifest ${manifest.semanticRevision}`
        });
    }

    const computed = computeSemanticDigest(manifest, sources);

    issues.push(...validateDecisions(manifest, parseLedger(sources.contract)));
    issues.push(...validateClasses(manifest, sources));
    issues.push(...validateChecklist(manifest, parseChecklist(sources.contract)));
    issues.push(...validateDigest(manifest, computed));
    issues.push(...validateApproval(manifest, sources.contract, computed.value));

    return issues;
}

const APPROVAL_CODES: ReadonlySet<IssueCode> = new Set([
    "approval-absent",
    "approval-incomplete",
    "approval-placeholder",
    "approval-wrong-revision",
    "approval-stale-digest",
    "acceptance-overclaimed"
]);

function structuralIssues(issues: readonly PacketIssue[]): readonly PacketIssue[] {
    return issues.filter((issue) => !APPROVAL_CODES.has(issue.code));
}

function codes(issues: readonly PacketIssue[]): readonly IssueCode[] {
    return issues.map((issue) => issue.code);
}

// ============================================================================
// The delivered packet
// ============================================================================

const deliveredSources: PacketSources = {
    contract: readDelivered(CONTRACT_PATH),
    manifest: JSON.parse(readDelivered(MANIFEST_PATH)),
    prototype: readDelivered(PROTOTYPE_PATH),
    characterization: readDelivered(CHARACTERIZATION_PATH)
};

const deliveredManifest = ManifestSchema.parse(deliveredSources.manifest);

/** A deep copy of the delivered manifest, so a fixture mutation cannot leak between tests. */
function manifestCopy(): Manifest {
    return ManifestSchema.parse(JSON.parse(JSON.stringify(deliveredSources.manifest)));
}

function withManifest(manifest: Manifest): PacketSources {
    return { ...deliveredSources, manifest };
}

/** Perturb the delivered FILES, not just the manifest — needed to move the semantic digest. */
function withSources(overrides: Partial<PacketSources>): PacketSources {
    return { ...deliveredSources, ...overrides };
}

/**
 * The digest of the packet as it stands on disk right now. Fixtures that need a VALID approval bind
 * to this, so the moment the delivered semantics change, every such fixture is re-derived rather
 * than silently approving stale bytes.
 */
const deliveredDigest = computeSemanticDigest(deliveredManifest, deliveredSources).value;

/** A complete, well-formed approval block bound to the delivered bytes. Invented, never delivered. */
function syntheticApproval(
    overrides: Partial<z.infer<typeof ApprovalSchema>> = {}
): z.infer<typeof ApprovalSchema> {
    return {
        approver: "Ben",
        evidenceReference: "fusion task MF-007 message 2026-09-07T10:00:00Z",
        date: "2026-09-07",
        quotedAuthorization: "I approve the ownership contract as written.",
        approvedSemanticRevision: deliveredManifest.semanticRevision,
        approvedSemanticDigest: deliveredDigest,
        ...overrides
    };
}

describe("the delivered grouped-rule ownership packet", () => {
    it("parses as the declared manifest shape", () => {
        expect(deliveredManifest.task).toBe("MF-007");
        expect(deliveredManifest.contract).toBe(CONTRACT_PATH);
        expect(deliveredManifest.prototype.path).toBe(PROTOTYPE_PATH);
        expect(deliveredManifest.characterization.path).toBe(CHARACTERIZATION_PATH);
    });

    it("has no structural defect — every decision, class and checklist item resolves", () => {
        expect(structuralIssues(validateOwnershipPacket(deliveredSources))).toEqual([]);
    });

    it("carries a concrete resolution for all twenty decisions, D-017 included", () => {
        expect(deliveredManifest.decisions.map((decision) => decision.id)).toEqual(
            REQUIRED_DECISION_IDS
        );
        for (const decision of deliveredManifest.decisions) {
            expect(isPlaceholder(decision.resolution)).toBe(false);
            expect(normalize(decision.resolution).length).toBeGreaterThanOrEqual(
                MINIMUM_RESOLUTION_LENGTH
            );
        }
        const d017 = deliveredManifest.decisions.find((decision) => decision.id === "D-017");
        expect(d017?.resolution).toMatch(/one local vault mutation|ships DISABLED/i);
    });

    it("covers all five required example classes with real scenario, test and prototype references", () => {
        expect(deliveredManifest.exampleClasses.map((entry) => entry.id)).toEqual([
            ...REQUIRED_CLASS_IDS
        ]);
        const names = deliveredManifest.exampleClasses.map((entry) => entry.name.toLowerCase());
        expect(names).toEqual([
            "no matching rule",
            "one constrained rule",
            "multiple applicable rules",
            "previously split fields",
            "conflicting field ownership"
        ]);
    });

    it("declares hashed semantic regions that exclude the approval metadata", () => {
        const excluded = deliveredManifest.semanticRegionsExcluded.join(" ");
        expect(excluded).toMatch(/User evidence/);
        expect(excluded).toMatch(/approval block/);
        // Non-circularity: no region may be both hashed and excluded.
        for (const region of deliveredManifest.semanticRegions) {
            expect(deliveredManifest.semanticRegionsExcluded).not.toContain(region);
        }
    });

    it("declares the prototype as synthetic and non-persisting at both required viewports", () => {
        expect(deliveredManifest.prototype.synthetic).toBe(true);
        expect(deliveredManifest.prototype.writesNothing).toBe(true);
        expect(deliveredManifest.prototype.viewports).toEqual([
            { name: "desktop", width: 1280, height: 800 },
            { name: "mobile", width: 390, height: 844 }
        ]);
    });

    it("states that the characterization test establishes only the measured baseline", () => {
        expect(deliveredManifest.characterization.establishes).toMatch(
            /measured production baseline/i
        );
        expect(deliveredManifest.characterization.establishes).toMatch(/nothing about proposed/i);
    });
});

describe("the approval gate on the delivered packet", () => {
    const issues = validateOwnershipPacket(deliveredSources);

    it("reports the packet's real approval state rather than assuming one", () => {
        const approvalIssues = issues.filter((issue) => APPROVAL_CODES.has(issue.code));
        if (deliveredManifest.approval == null) {
            expect(codes(approvalIssues)).toContain("approval-absent");
            expect(deliveredManifest.acceptance.status).toBe("unapproved");
        } else {
            expect(approvalIssues).toEqual([]);
            expect(deliveredManifest.acceptance.status).toBe("approved");
        }
    });

    it("keeps the contract prose and the manifest telling the same story about approval", () => {
        const contractSaysUnmet =
            /"ambiguous cases have an approved resolution" is (?:therefore )?\*\*NOT met\*\*|remains \*\*unmet\*\*|\*\*NOT MET\*\*/.test(
                deliveredSources.contract
            );
        expect(contractSaysUnmet).toBe(deliveredManifest.approval == null);
    });

    it("never treats a test run, a prototype click or workflow review as approval", () => {
        // The only thing that can close the gate is an `approval` block naming this revision.
        const withoutEvidence = manifestCopy();
        const computed = computeSemanticDigest(withoutEvidence, deliveredSources);
        expect(
            codes(validateApproval(withoutEvidence, deliveredSources.contract, computed.value))
        ).toContain("approval-absent");
    });
});

describe("the validator rejects every historical and near-miss failure mode", () => {
    it("rejects the historical PENDING ledger", () => {
        const manifest = manifestCopy();
        const pending = manifest.decisions.map((decision) => ({
            ...decision,
            resolution: "PENDING USER APPROVAL"
        }));
        const issues = validateOwnershipPacket(withManifest({ ...manifest, decisions: pending }));
        expect(codes(issues)).toContain("resolution-placeholder");
        expect(structuralIssues(issues).length).toBeGreaterThanOrEqual(20);
    });

    it("rejects a missing D-017", () => {
        const manifest = manifestCopy();
        const issues = validateOwnershipPacket(
            withManifest({
                ...manifest,
                decisions: manifest.decisions.filter((decision) => decision.id !== "D-017")
            })
        );
        expect(codes(issues)).toContain("decision-missing");
        expect(issues.some((issue) => issue.detail.includes("D-017"))).toBe(true);
    });

    it("rejects a D-017 that defers atomicity instead of resolving it", () => {
        const manifest = manifestCopy();
        const issues = validateOwnershipPacket(
            withManifest({
                ...manifest,
                decisions: manifest.decisions.map((decision) =>
                    decision.id === "D-017"
                        ? {
                              ...decision,
                              resolution:
                                  "Atomicity is unresolved and deferred to a later task once grouped capacity exists."
                          }
                        : decision
                )
            })
        );
        expect(codes(issues)).toContain("d017-deferred");
    });

    it("rejects a blank resolution", () => {
        const manifest = manifestCopy();
        const issues = validateOwnershipPacket(
            withManifest({
                ...manifest,
                decisions: manifest.decisions.map((decision) =>
                    decision.id === "D-005" ? { ...decision, resolution: "   " } : decision
                )
            })
        );
        expect(codes(issues)).toContain("resolution-blank");
    });

    it("rejects a manifest resolution that has drifted from the contract prose", () => {
        const manifest = manifestCopy();
        const issues = validateOwnershipPacket(
            withManifest({
                ...manifest,
                decisions: manifest.decisions.map((decision) =>
                    decision.id === "D-003"
                        ? {
                              ...decision,
                              resolution:
                                  "The preferred host always wins and the previous owner is deleted without asking the user."
                          }
                        : decision
                )
            })
        );
        expect(codes(issues)).toContain("resolution-divergent");
    });

    it("rejects a duplicated decision id", () => {
        const manifest = manifestCopy();
        const first = manifest.decisions[0];
        expect(first).toBeDefined();
        const issues = validateOwnershipPacket(
            withManifest({
                ...manifest,
                decisions: first ? [...manifest.decisions, first] : manifest.decisions
            })
        );
        expect(codes(issues)).toContain("decision-duplicate");
        expect(codes(issues)).toContain("decision-count");
    });

    it("rejects an orphan decision with no ledger row", () => {
        const manifest = manifestCopy();
        const issues = validateOwnershipPacket(
            withManifest({
                ...manifest,
                decisions: manifest.decisions.map((decision) =>
                    decision.id === "D-020" ? { ...decision, id: "D-021" } : decision
                )
            })
        );
        expect(codes(issues)).toContain("decision-orphan");
        expect(codes(issues)).toContain("decision-missing");
    });

    it("rejects a dropped example class", () => {
        const manifest = manifestCopy();
        const issues = validateOwnershipPacket(
            withManifest({
                ...manifest,
                exampleClasses: manifest.exampleClasses.filter((entry) => entry.id !== "EC-05")
            })
        );
        expect(codes(issues)).toContain("class-missing");
    });

    it("rejects a class whose scenario, test or prototype reference does not resolve", () => {
        const manifest = manifestCopy();
        const issues = validateOwnershipPacket(
            withManifest({
                ...manifest,
                exampleClasses: manifest.exampleClasses.map((entry) =>
                    entry.id === "EC-01"
                        ? {
                              ...entry,
                              scenarios: ["S-99"],
                              tests: ["EX-99"],
                              prototypeScenarios: ["P-99"]
                          }
                        : entry
                )
            })
        );
        expect(codes(issues)).toContain("scenario-dangling");
        expect(codes(issues)).toContain("test-dangling");
        expect(codes(issues)).toContain("prototype-scenario-dangling");
    });

    it("rejects a checklist item that no longer matches §7.2", () => {
        const manifest = manifestCopy();
        const issues = validateOwnershipPacket(
            withManifest({
                ...manifest,
                prototype: {
                    ...manifest.prototype,
                    checklist: manifest.prototype.checklist.map((item) =>
                        item.id === "M-07"
                            ? { ...item, requirement: "Something entirely different" }
                            : item
                    )
                }
            })
        );
        expect(codes(issues)).toContain("checklist-divergent");
    });

    it("rejects a dropped checklist item", () => {
        const manifest = manifestCopy();
        const issues = validateOwnershipPacket(
            withManifest({
                ...manifest,
                prototype: {
                    ...manifest.prototype,
                    checklist: manifest.prototype.checklist.filter((item) => item.id !== "M-14")
                }
            })
        );
        expect(codes(issues)).toContain("checklist-missing");
    });

    it("rejects a manifest whose revision has drifted from the contract", () => {
        const manifest = manifestCopy();
        const issues = validateOwnershipPacket(
            withManifest({ ...manifest, semanticRevision: "OWN-1999-01-01-r0" })
        );
        expect(codes(issues)).toContain("revision-mismatch");
    });

    it("rejects an acceptance status of approved with no approval block", () => {
        const manifest = manifestCopy();
        const issues = validateOwnershipPacket(
            withManifest({
                ...manifest,
                approval: null,
                acceptance: { ...manifest.acceptance, status: "approved" }
            })
        );
        expect(codes(issues)).toContain("acceptance-overclaimed");
    });

    it("rejects a partial approval block", () => {
        const manifest = manifestCopy();
        const issues = validateOwnershipPacket(
            withManifest({
                ...manifest,
                acceptance: { ...manifest.acceptance, status: "approved" },
                approval: syntheticApproval({ evidenceReference: "", quotedAuthorization: "" })
            })
        );
        expect(codes(issues)).toContain("approval-incomplete");
    });

    it("rejects placeholder approval evidence", () => {
        const manifest = manifestCopy();
        const issues = validateOwnershipPacket(
            withManifest({
                ...manifest,
                acceptance: { ...manifest.acceptance, status: "approved" },
                approval: syntheticApproval({
                    approver: "TBD",
                    evidenceReference: "placeholder",
                    quotedAuthorization: "TODO: paste the approval here"
                })
            })
        );
        expect(codes(issues)).toContain("approval-placeholder");
    });

    it("rejects an approval of a superseded revision", () => {
        const manifest = manifestCopy();
        const issues = validateOwnershipPacket(
            withManifest({
                ...manifest,
                acceptance: { ...manifest.acceptance, status: "approved" },
                approval: syntheticApproval({ approvedSemanticRevision: "OWN-2026-09-01-r0" })
            })
        );
        expect(codes(issues)).toContain("approval-wrong-revision");
    });

    it("rejects an approval recorded while acceptance still reads unapproved", () => {
        const manifest = manifestCopy();
        const issues = validateOwnershipPacket(
            withManifest({ ...manifest, approval: syntheticApproval() })
        );
        expect(codes(issues)).toContain("acceptance-overclaimed");
    });

    it("accepts a synthetic complete fixture — proving the validator can pass, not that the packet is approved", () => {
        const manifest = manifestCopy();
        const issues = validateOwnershipPacket(
            withManifest({
                ...manifest,
                acceptance: { ...manifest.acceptance, status: "approved" },
                approval: syntheticApproval()
            })
        );
        expect(issues).toEqual([]);
        // The fixture is invented. It demonstrates the validator's success path and is deliberately
        // NOT written back to the delivered manifest: inventing consent is the one failure this
        // whole file exists to prevent.
        expect(deliveredManifest.approval).toBeNull();
    });

    it("rejects a manifest that is not the declared shape at all", () => {
        const issues = validateOwnershipPacket({
            ...deliveredSources,
            manifest: { task: "MF-007" }
        });
        expect(codes(issues)).toEqual(["manifest-unparseable"]);
    });
});

describe("the semantic digest binds an approval to content, not to a label", () => {
    /** Edits §1–§6 without touching the revision label — the hole a label alone cannot close. */
    function contractWithEditedSemantics(): string {
        const edited = deliveredSources.contract.replace(
            "These terms are used with exactly these meanings throughout.",
            "These terms are used with approximately these meanings throughout."
        );
        expect(edited).not.toBe(deliveredSources.contract);
        return edited;
    }

    /** Edits the prototype without touching the revision label. */
    function prototypeWithEditedSemantics(): string {
        const edited = deliveredSources.prototype.replace(
            "Isolated approval prototype for",
            "Isolated approval prototype, since edited, for"
        );
        expect(edited).not.toBe(deliveredSources.prototype);
        return edited;
    }

    it("computes the delivered digest from the delivered files, matching the manifest", () => {
        const computed = computeSemanticDigest(deliveredManifest, deliveredSources);
        expect(computed.unknown).toEqual([]);
        expect(computed.value).toBe(deliveredManifest.semanticDigest.value);
        expect(computed.regions).toEqual(deliveredManifest.semanticDigest.regions);
    });

    it("rejects a semantic region edited while the manifest's hashes stay put", () => {
        const issues = validateOwnershipPacket(
            withSources({ contract: contractWithEditedSemantics() })
        );
        expect(codes(issues)).toContain("digest-region-mismatch");
        expect(codes(issues)).toContain("digest-mismatch");
    });

    it("rejects a prototype edited while the manifest's hashes stay put", () => {
        const issues = validateOwnershipPacket(
            withSources({ prototype: prototypeWithEditedSemantics() })
        );
        expect(
            issues.some(
                (issue) => issue.code === "digest-region-mismatch" && issue.detail.includes(".html")
            )
        ).toBe(true);
        expect(codes(issues)).toContain("digest-mismatch");
    });

    it("rejects a manifest digest that no longer describes the delivered bytes", () => {
        const manifest = manifestCopy();
        const issues = validateOwnershipPacket(
            withManifest({
                ...manifest,
                semanticDigest: { ...manifest.semanticDigest, value: "0".repeat(64) }
            })
        );
        expect(codes(issues)).toContain("digest-mismatch");
    });

    it("rejects a declared region that names no extractable content", () => {
        const manifest = manifestCopy();
        const issues = validateOwnershipPacket(
            withManifest({
                ...manifest,
                semanticRegions: [...manifest.semanticRegions, "specs/does-not-exist.md §42"]
            })
        );
        expect(codes(issues)).toContain("digest-region-unknown");
    });

    it("rejects an approval left in place across a semantic edit, label and hashes rewritten", () => {
        // The most adversarial case: the semantics move AND everything a forger controls is
        // updated to agree — label, per-region hashes, manifest digest. The approval still binds
        // to the digest it was given for, so the comparison against the RECOMPUTED value fails.
        const contract = contractWithEditedSemantics();
        const manifest = manifestCopy();
        const recomputed = computeSemanticDigest(manifest, withSources({ contract }));
        const issues = validateOwnershipPacket(
            withSources({
                contract,
                manifest: {
                    ...manifest,
                    semanticDigest: {
                        algorithm: "sha256",
                        value: recomputed.value,
                        regions: [...recomputed.regions]
                    },
                    acceptance: { ...manifest.acceptance, status: "approved" },
                    approval: syntheticApproval()
                }
            })
        );
        expect(codes(issues)).toContain("approval-stale-digest");
        expect(codes(issues)).not.toContain("digest-mismatch");
    });

    it("rejects an approval left in place across a prototype edit", () => {
        const manifest = manifestCopy();
        const issues = validateOwnershipPacket(
            withSources({
                prototype: prototypeWithEditedSemantics(),
                manifest: {
                    ...manifest,
                    acceptance: { ...manifest.acceptance, status: "approved" },
                    approval: syntheticApproval()
                }
            })
        );
        expect(codes(issues)).toContain("approval-stale-digest");
    });

    it("keeps a genuine approval valid across an evidence-only amendment", () => {
        // Correcting the durable reference or the recorded date touches only excluded metadata.
        const manifest = manifestCopy();
        const issues = validateOwnershipPacket(
            withManifest({
                ...manifest,
                acceptance: { ...manifest.acceptance, status: "approved" },
                approval: syntheticApproval({
                    evidenceReference: "fusion task MF-007 message 2026-09-07T18:30:00Z",
                    date: "2026-09-08"
                })
            })
        );
        expect(issues).toEqual([]);
    });
});
