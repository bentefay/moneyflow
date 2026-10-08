/**
 * E2E Test: grouped-rule ownership approval prototype (MF-007)
 *
 * Drives the tracked, isolated HTML at
 * `specs/016-automation-interaction-contract/ownership-approval.html` — the reviewable
 * demonstration of the ownership decisions in `specs/automation-rule-ownership.md`
 * (semantic revision `OWN-2026-09-07-r2`).
 *
 * WHAT THESE TESTS ESTABLISH. That the PROTOTYPE demonstrates the proposed resolutions: an
 * ambiguous host set cannot be confirmed silently, a mismatched predicate refuses to fold, a stale
 * or deleted target invalidates confirmation, an occupied uniqueness slot never auto-retargets,
 * cancel writes nothing, and Apply/Delete never resolve a conflict.
 *
 * WHAT THEY DO NOT ESTABLISH. Anything about production runtime — no grouping exists in the
 * product — and, emphatically, not user approval. A passing run here is not consent; approval lives
 * only in §7.1 of the contract and the `approval` block of `ownership-approval.json`.
 *
 * The file is opened directly from disk over `file://`. It imports no production code, loads no
 * route, makes no network request and persists nothing, so these journeys need no identity, no
 * vault and no server state.
 */

import path from "node:path";
import { pathToFileURL } from "node:url";

import { expect, type Page, test } from "@playwright/test";

// ============================================================================
// Fixture
// ============================================================================

const PROTOTYPE_URL = pathToFileURL(
    path.resolve(process.cwd(), "specs/016-automation-interaction-contract/ownership-approval.html")
).href;

const DESKTOP = { width: 1280, height: 800 } as const;
const MOBILE = { width: 390, height: 844 } as const;

const VIEWPORTS = [
    { name: "desktop 1280x800", size: DESKTOP },
    { name: "mobile 390x844", size: MOBILE }
] as const;

/** Open the tracked prototype at a viewport and select one scenario. */
async function openScenario(
    page: Page,
    scenarioId: string,
    size: { readonly width: number; readonly height: number } = DESKTOP
): Promise<void> {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto(PROTOTYPE_URL);
    await page.locator('[data-testid="scenario-list"] button').first().waitFor();
    await page.locator(`[data-testid="scenario-tab-${scenarioId}"]`).click();
    await expect(page.locator('[data-testid="scenario-title"]')).toContainText(scenarioId);
}

/** The reasons confirmation is currently withheld, or `null` when the change may be confirmed. */
async function blockerText(page: Page): Promise<string | null> {
    const banner = page.locator('[data-testid="blockers"]');
    const blocked = await banner.getAttribute("data-blocked");
    return blocked === "true" ? ((await banner.textContent()) ?? "") : null;
}

/** The full simulated vault state — rules, applications and remembered preferences. */
async function storeSignature(page: Page): Promise<string> {
    return (await page.locator('[data-testid="store-signature"]').textContent()) ?? "";
}

async function expectConfirmDisabled(page: Page): Promise<void> {
    await expect(page.locator('[data-testid="confirm"]')).toBeDisabled();
    expect(await blockerText(page)).not.toBeNull();
}

async function expectConfirmEnabled(page: Page): Promise<void> {
    await expect(page.locator('[data-testid="confirm"]')).toBeEnabled();
    expect(await blockerText(page)).toBeNull();
}

// ============================================================================
// The prototype states what it is
// ============================================================================

test.describe("the prototype labels its own status", () => {
    for (const { name, size } of VIEWPORTS) {
        test(`states the semantic revision and that nothing here is approved — ${name}`, async ({
            page
        }) => {
            await openScenario(page, "P-01", size);

            await expect(page.locator('[data-testid="semantic-revision"]')).toHaveText(
                "OWN-2026-09-07-r2"
            );
            const status = page.locator('[data-testid="approval-status"]');
            await expect(status).toBeVisible();
            await expect(status).toContainText(/NOT APPROVED/i);
            // The banner's source wraps this phrase, so match across the whitespace.
            await expect(status).toContainText(/simulation,\s+never\s+an\s+approval/i);
            await expect(page.locator('[data-testid="scenario-meta"]')).toContainText(
                /PROPOSED, NOT APPROVED/
            );
        });
    }
});

// ============================================================================
// The five required example classes
// ============================================================================

test.describe("every required example class is reachable and labelled", () => {
    const CLASSES: ReadonlyArray<{
        readonly scenario: string;
        readonly exampleClass: string;
    }> = [
        { scenario: "P-01", exampleClass: "EC-01" },
        { scenario: "P-02", exampleClass: "EC-02" },
        { scenario: "P-03", exampleClass: "EC-03" },
        { scenario: "P-04", exampleClass: "EC-04" },
        { scenario: "P-05", exampleClass: "EC-05" }
    ];

    for (const { scenario, exampleClass } of CLASSES) {
        test(`${scenario} presents example class ${exampleClass} with its measured baseline and proposal`, async ({
            page
        }) => {
            await openScenario(page, scenario);

            await expect(page.locator('[data-testid="scenario-meta"]')).toContainText(exampleClass);
            await expect(page.locator('[data-testid="scenario-baseline"]')).not.toBeEmpty();
            await expect(page.locator('[data-testid="scenario-proposed"]')).not.toBeEmpty();
        });
    }

    test("the scenario list covers all fourteen prototype scenarios and all five classes", async ({
        page
    }) => {
        await openScenario(page, "P-01");

        const labels = await page.locator('[data-testid="scenario-list"] button').allTextContents();
        expect(labels).toHaveLength(14);
        for (const id of ["EC-01", "EC-02", "EC-03", "EC-04", "EC-05"]) {
            expect(labels.some((label) => label.includes(id))).toBe(true);
        }
    });
});

// ============================================================================
// M-01..M-03, M-06 — what the surface must expose about the target
// ============================================================================

test.describe("a scenario exposes the target, its stored predicate and its other outputs", () => {
    for (const { name, size } of VIEWPORTS) {
        test(`P-02 names the rule, its predicate as stored and its population — ${name}`, async ({
            page
        }) => {
            await openScenario(page, "P-02", size);

            await expect(page.locator('[data-testid="target-identity"]')).toContainText("r-tags-A");
            // M-02: the predicate is the one the RULE stores, not the one seeded from this row.
            await expect(page.locator('[data-testid="target-predicate"]')).toContainText(
                "as stored"
            );
            await expect(page.locator('[data-testid="target-other-outputs"]')).not.toBeEmpty();
            await expect(page.locator('[data-testid="population-consequence"]')).not.toBeEmpty();
        });
    }

    test("P-04 shows the preferred alias host's untouched outputs and the broader population", async ({
        page
    }) => {
        await openScenario(page, "P-04");

        await expect(page.locator('[data-testid="host-option-r-alias-1"]')).toBeChecked();
        await expect(page.locator('[data-testid="target-other-outputs"]')).toContainText(/rename/i);
        // M-06: folding into the unscoped alias rule widens who is affected, stated in words.
        await expect(page.locator('[data-testid="host-population-r-alias-1"]')).toContainText(
            /BROADER/
        );
        await expect(page.locator('[data-testid="host-population-create"]')).toContainText(
            /account A only/
        );
    });
});

// ============================================================================
// D-005 / M-04 — an ambiguous host set cannot silently confirm
// ============================================================================

test.describe("an ambiguous host set requires an explicit choice", () => {
    for (const { name, size } of VIEWPORTS) {
        test(`P-03 withholds confirmation until a host is chosen — ${name}`, async ({ page }) => {
            await openScenario(page, "P-03", size);

            // Nothing is preselected: no recency, id-order or list-order tiebreak.
            for (const host of ["r-tags-1", "r-alias-1", "create"]) {
                await expect(page.locator(`[data-testid="host-option-${host}"]`)).not.toBeChecked();
            }
            await expectConfirmDisabled(page);
            expect(await blockerText(page)).toContain("No target chosen");

            const before = await storeSignature(page);
            await page.locator('[data-testid="confirm"]').click({ force: true });
            expect(await storeSignature(page)).toBe(before);

            // An explicit choice — and only then — unblocks the confirm.
            await page.locator('[data-testid="host-option-r-alias-1"]').check();
            await expectConfirmEnabled(page);
        });
    }

    test("P-03 presents every candidate with its own population and source fate", async ({
        page
    }) => {
        await openScenario(page, "P-03");

        for (const host of ["r-tags-1", "r-alias-1", "create"]) {
            await expect(page.locator(`[data-testid="host-population-${host}"]`)).not.toBeEmpty();
            await expect(page.locator(`[data-testid="host-source-fate-${host}"]`)).not.toBeEmpty();
        }
    });
});

// ============================================================================
// D-003 / D-011 / M-07 / M-14 — explicit owner selection previews source fate
// ============================================================================

test.describe("consolidation is a named, previewed choice, never a side effect", () => {
    for (const { name, size } of VIEWPORTS) {
        test(`P-05 defaults to the existing owner and gates the transfer on a preview — ${name}`, async ({
            page
        }) => {
            await openScenario(page, "P-05", size);

            // D-003: the existing owner of the edited field wins by default; no transfer.
            await expect(page.locator('[data-testid="host-option-r-tags-1"]')).toBeChecked();
            await expectConfirmEnabled(page);

            await page.locator('[data-testid="host-option-r-alias-1"]').check();
            await expectConfirmDisabled(page);
            expect(await blockerText(page)).toContain("Consolidation has not been previewed");

            // M-07: the source rule's fate and the population change are stated before the write.
            await expect(page.locator('[data-testid="consolidation-source-fate"]')).toContainText(
                /soft-deleted/i
            );
            await expect(page.locator('[data-testid="consolidation-population"]')).not.toBeEmpty();

            await page.locator('[data-testid="consolidation-preview"]').click();
            await expectConfirmEnabled(page);
        });
    }

    test("P-05 re-arms the preview when the chosen host changes", async ({ page }) => {
        await openScenario(page, "P-05");

        await page.locator('[data-testid="host-option-r-alias-1"]').check();
        await page.locator('[data-testid="consolidation-preview"]').click();
        await expectConfirmEnabled(page);

        await page.locator('[data-testid="host-option-r-tags-1"]').check();
        await page.locator('[data-testid="host-option-r-alias-1"]').check();
        await expectConfirmDisabled(page);
    });
});

// ============================================================================
// D-004 — a mismatched predicate refuses to fold
// ============================================================================

test.describe("a mismatched stored predicate refuses the fold", () => {
    for (const { name, size } of VIEWPORTS) {
        test(`P-06 blocks the narrower alias host and says why — ${name}`, async ({ page }) => {
            await openScenario(page, "P-06", size);

            await expect(page.locator('[data-testid="host-option-r-tags-1"]')).toBeChecked();
            await expect(page.locator('[data-testid="host-blocked-r-alias-A"]')).toContainText(
                /Predicate mismatch/i
            );

            await page.locator('[data-testid="host-option-r-alias-A"]').check();
            await expectConfirmDisabled(page);
            expect(await blockerText(page)).toContain("Predicate mismatch");

            const before = await storeSignature(page);
            await page.locator('[data-testid="confirm"]').click({ force: true });
            expect(await storeSignature(page)).toBe(before);
        });
    }
});

// ============================================================================
// D-008 / D-009 / M-12 — a stale or deleted target invalidates confirmation
// ============================================================================

test.describe("a target that moved after this surface opened invalidates confirmation", () => {
    for (const { name, size } of VIEWPORTS) {
        test(`P-07 blocks on a remote edit and on a remote delete, distinctly — ${name}`, async ({
            page
        }) => {
            await openScenario(page, "P-07", size);
            await expectConfirmEnabled(page);

            await page.locator('[data-testid="simulate-remote-edit"]').click();
            await expectConfirmDisabled(page);
            expect(await blockerText(page)).toContain("changed since this surface opened");
            // Distinguished from "your input was invalid".
            await expect(page.locator('[data-testid="simulation-note"]')).toContainText(
                /not a validation error/i
            );

            await page.locator('[data-testid="simulate-remote-delete"]').click();
            await expectConfirmDisabled(page);
            const deleted = await blockerText(page);
            expect(deleted).toContain("no longer exists");
            // D-009: a create is OFFERED, never performed for the user.
            expect(deleted).toContain("OFFERED, not performed");

            const before = await storeSignature(page);
            await page.locator('[data-testid="confirm"]').click({ force: true });
            expect(await storeSignature(page)).toBe(before);
        });
    }
});

// ============================================================================
// D-010 / D-007 / M-13 — an occupied slot never auto-retargets
// ============================================================================

test.describe("an occupied uniqueness slot is refused and never auto-retargeted", () => {
    for (const { name, size } of VIEWPORTS) {
        test(`P-08 names the holder without selecting it — ${name}`, async ({ page }) => {
            await openScenario(page, "P-08", size);

            // The default target is the user's own rule, NOT the rule holding the slot.
            await expect(page.locator('[data-testid="host-option-r-tags-A"]')).toBeChecked();
            await expect(page.locator('[data-testid="host-option-r-tags-1"]')).not.toBeChecked();

            await expect(page.locator('[data-testid="collision-notice"]')).toContainText(
                /duplicate-key/
            );
            await expect(page.locator('[data-testid="collision-notice"]')).toContainText(
                /never selected for you/i
            );
            await expectConfirmDisabled(page);

            const before = await storeSignature(page);
            await page.locator('[data-testid="confirm"]').click({ force: true });
            expect(await storeSignature(page)).toBe(before);
        });
    }

    test("P-12 refuses a duplicated slot and an unreadable record as fold hosts", async ({
        page
    }) => {
        await openScenario(page, "P-12");

        await expectConfirmDisabled(page);
        for (const host of ["r-tags-A", "r-tags-A2"]) {
            await expect(page.locator(`[data-testid="host-blocked-${host}"]`)).toContainText(
                /Duplicated uniqueness slot/i
            );
        }
        await expect(page.locator('[data-testid="host-blocked-r-broken"]')).toContainText(
            /Unreadable record/i
        );

        // Every existing candidate is blocked; only an explicit create proceeds.
        await page.locator('[data-testid="host-option-r-tags-A2"]').check();
        await expectConfirmDisabled(page);
        await page.locator('[data-testid="host-option-create"]').check();
        await expectConfirmEnabled(page);
    });
});

// ============================================================================
// D-016 / M-11 — cancel writes nothing
// ============================================================================

test.describe("cancel writes nothing", () => {
    for (const { name, size } of VIEWPORTS) {
        test(`P-05 cancel restores rules, applications and preferences exactly — ${name}`, async ({
            page
        }) => {
            await openScenario(page, "P-05", size);
            const pristine = await storeSignature(page);

            await page.locator('[data-testid="host-option-r-alias-1"]').check();
            await page.locator('[data-testid="consolidation-preview"]').click();
            await page.locator('[data-testid="confirm"]').click();
            expect(await storeSignature(page)).not.toBe(pristine);

            await page.locator('[data-testid="cancel"]').click();
            expect(await storeSignature(page)).toBe(pristine);
            await expect(page.locator('[data-testid="outcome"]')).toHaveAttribute(
                "data-outcome",
                "cancelled"
            );
            await expect(page.locator('[data-testid="outcome"]')).toContainText(
                /no remembered preference/i
            );
        });
    }

    test("cancel is reachable in every conflict state", async ({ page }) => {
        for (const scenario of ["P-03", "P-06", "P-08", "P-12", "P-13", "P-14"]) {
            await openScenario(page, scenario);
            await expect(page.locator('[data-testid="cancel"]')).toBeEnabled();
        }
    });
});

// ============================================================================
// D-018 — Apply and Delete are not an ownership bypass
// ============================================================================

test.describe("Apply and Delete never resolve an ownership conflict", () => {
    for (const { name, size } of VIEWPORTS) {
        test(`P-13 keeps the conflict open after Apply and after Delete — ${name}`, async ({
            page
        }) => {
            await openScenario(page, "P-13", size);
            await expectConfirmDisabled(page);

            await page.locator('[data-testid="apply-rule"]').click();
            await expect(page.locator('[data-testid="outcome"]')).toHaveAttribute(
                "data-outcome",
                "bypass-refused"
            );
            await expect(page.locator('[data-testid="outcome"]')).toContainText(
                /not consent to a fold/i
            );
            await expectConfirmDisabled(page);

            await page.locator('[data-testid="delete-rule"]').click();
            await expect(page.locator('[data-testid="outcome"]')).toContainText(
                /not the mechanism by which a fold wins/i
            );
            await expectConfirmDisabled(page);
        });
    }
});

// ============================================================================
// D-014 / D-015 / D-006 — M-08, M-09, M-10, M-05: mode, allocation, slots and drift are explicit
// ============================================================================

test.describe("tag mode, allocation sets and drift are explicit, never inferred", () => {
    test("P-10 carries the host's stored mode and requires confirmation when it differs", async ({
        page
    }) => {
        await openScenario(page, "P-10");

        await expect(page.locator('[data-testid="tag-mode-host"]')).toContainText(/“set”/);
        await expect(page.locator('[data-testid="tag-mode"]')).toHaveValue("set");
        await expectConfirmDisabled(page);
        expect(await blockerText(page)).toContain("clears tags typed by hand");

        await page.locator('[data-testid="tag-mode-ack"]').check();
        await expectConfirmEnabled(page);

        // Selecting the remembered mode is itself a choice, and it re-arms the acknowledgement.
        await page.locator('[data-testid="tag-mode"]').selectOption("add");
        await expectConfirmEnabled(page);
    });

    test("P-11 refuses a partial allocation and accepts only the whole validated set", async ({
        page
    }) => {
        await openScenario(page, "P-11");

        await expect(page.locator('[data-testid="allocation-option-whole"]')).toBeChecked();
        await expectConfirmEnabled(page);

        await page.locator('[data-testid="allocation-option-partial"]').check();
        await expectConfirmDisabled(page);
        expect(await blockerText(page)).toContain("allocation set is incomplete");

        const before = await storeSignature(page);
        await page.locator('[data-testid="confirm"]').click({ force: true });
        expect(await storeSignature(page)).toBe(before);
    });

    test("P-09 requires drift acknowledgement and never auto-reconciles", async ({ page }) => {
        await openScenario(page, "P-09");

        await expect(page.locator('[data-testid="drift-implied"]')).toContainText(/coffee/);
        await expect(page.locator('[data-testid="drift-actual"]')).toContainText(/no tags/);
        await expectConfirmDisabled(page);

        await page.locator('[data-testid="drift-ack"]').check();
        await expectConfirmEnabled(page);
    });
});

// ============================================================================
// EC-01 — empty and cleared states
// ============================================================================

test.describe("empty and cleared states propose nothing", () => {
    for (const { name, size } of VIEWPORTS) {
        test(`P-14 offers no rule at all for a cleared value — ${name}`, async ({ page }) => {
            await openScenario(page, "P-14", size);

            await expectConfirmDisabled(page);
            expect(await blockerText(page)).toContain("No rule is proposed");

            const before = await storeSignature(page);
            await page.locator('[data-testid="confirm"]').click({ force: true });
            expect(await storeSignature(page)).toBe(before);
            // Every unrelated rule keeps its id, scope and action.
            await expect(page.locator('[data-testid="store-rule-r-tags-A"]')).toContainText(
                "add [coffee]"
            );
        });
    }

    test("P-01 starts from an empty rule set and proposes a create", async ({ page }) => {
        await openScenario(page, "P-01");

        await expect(page.locator('[data-testid="store-rules"]')).toContainText("No rules.");
        await expect(page.locator('[data-testid="store-applications"]')).toContainText(
            "No applications."
        );
        await expect(page.locator('[data-testid="confirm"]')).toHaveText("Create the rule");

        await page.locator('[data-testid="confirm"]').click();
        await expect(page.locator('[data-testid="store-rule-r-new-1"]')).toBeVisible();
        await expect(page.locator('[data-testid="outcome"]')).toContainText(/not an approval/i);
    });
});

// ============================================================================
// Presentation: no orphan controls, no overflow, usable keyboard focus
// ============================================================================

test.describe("the prototype leaves no orphan controls and stays readable", () => {
    const ALL_SCENARIOS = [
        "P-01",
        "P-02",
        "P-03",
        "P-04",
        "P-05",
        "P-06",
        "P-07",
        "P-08",
        "P-09",
        "P-10",
        "P-11",
        "P-12",
        "P-13",
        "P-14"
    ] as const;

    for (const { name, size } of VIEWPORTS) {
        test(`every scenario renders named controls with no horizontal overflow — ${name}`, async ({
            page
        }) => {
            for (const scenario of ALL_SCENARIOS) {
                await openScenario(page, scenario, size);

                const audit = await page.evaluate(() => {
                    const accessibleName = (node: Element): string => {
                        const aria = node.getAttribute("aria-label");
                        if (aria != null && aria.trim().length > 0) return aria.trim();
                        if (node instanceof HTMLInputElement) {
                            const label = node.id
                                ? document.querySelector(`label[for="${node.id}"]`)
                                : node.closest("label");
                            return (label?.textContent ?? "").trim();
                        }
                        return (node.textContent ?? "").trim();
                    };

                    const controls = Array.from(
                        document.querySelectorAll("button, input, select, a")
                    );
                    return {
                        unnamed: controls
                            .filter((node) => accessibleName(node).length === 0)
                            .map((node) => node.outerHTML.slice(0, 120)),
                        emptyContainers: Array.from(document.querySelectorAll("fieldset, dl, ul"))
                            .filter((node) => node.children.length === 0)
                            .map((node) => node.outerHTML.slice(0, 120)),
                        overflow:
                            document.documentElement.scrollWidth -
                            document.documentElement.clientWidth
                    };
                });

                expect(audit.unnamed, `${scenario}: unnamed control`).toEqual([]);
                expect(audit.emptyContainers, `${scenario}: empty container`).toEqual([]);
                expect(audit.overflow, `${scenario}: horizontal overflow`).toBeLessThanOrEqual(0);
            }
        });
    }

    test("keyboard focus reaches the scenario list and the confirm control", async ({ page }) => {
        await openScenario(page, "P-05");

        await page.keyboard.press("Tab");
        const first = await page.evaluate(() => document.activeElement?.tagName ?? "");
        expect(first).not.toBe("BODY");

        // The confirm control is focusable and operable from the keyboard.
        await page.locator('[data-testid="confirm"]').focus();
        await expect(page.locator('[data-testid="confirm"]')).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(page.locator('[data-testid="outcome"]')).toHaveAttribute(
            "data-outcome",
            "confirmed"
        );
    });

    test("selecting a scenario moves focus to its heading", async ({ page }) => {
        await openScenario(page, "P-01");
        await page.locator('[data-testid="scenario-tab-P-06"]').click();
        await expect(page.locator('[data-testid="scenario-title"]')).toBeFocused();
    });
});
