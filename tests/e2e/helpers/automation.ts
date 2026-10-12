import { expect, type Locator } from "@playwright/test";

/** The rule output fields, as the inspector's `data-automation-field` attributes name them. */
export type AutomationField = "descriptionAlias" | "tags" | "allocation";

/**
 * The inspector card for the rule that sets `field` on the active row. A card lists every output
 * its rule has in a space-separated `data-automation-field`, so a grouped rule's card is found by
 * any of its fields.
 */
export function inspectorRuleCard(inspector: Locator, field: AutomationField): Locator {
    return inspector.locator(`[data-testid^="rule-inspector-"][data-automation-field~="${field}"]`);
}

/** Every rule card the inspector shows for the active row. */
export function inspectorRuleCards(inspector: Locator): Locator {
    return inspector.locator('[data-testid^="rule-inspector-"]');
}

/**
 * Choose which transactions Apply updates and whether it applies on row exit, in the editor scoped
 * by `editor`. The two are independent: Update all or Update new, plus the Apply on blur checkbox.
 */
export async function chooseRuleApply(
    editor: Locator,
    choice: { readonly scope: "all" | "new"; readonly applyOnBlur: boolean }
): Promise<void> {
    const scope = editor.getByTestId(`rule-scope-${choice.scope}`);
    await scope.click();
    await expect(scope).toBeChecked();
    const applyOnBlur = editor.getByTestId("rule-apply-on-blur");
    await applyOnBlur.setChecked(choice.applyOnBlur);
    await expect(applyOnBlur).toBeChecked({ checked: choice.applyOnBlur });
}
