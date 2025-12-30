/**
 * E2E Test: Tags Management
 *
 * Journey-style tests that validate complete user flows rather than
 * isolated features. This minimizes setup overhead (identity creation)
 * while still covering all critical functionality.
 */

import { test, expect, type Page } from "@playwright/test";
import { createNewIdentity, goToTags } from "./helpers";

// ============================================================================
// Tag-Specific Helpers
// ============================================================================

/**
 * Create a new tag via the Add Tag form.
 */
async function createTag(
  page: Page,
  data: {
    name: string;
    parentName?: string;
    isTransfer?: boolean;
  }
): Promise<void> {
  const addButton = page.getByRole("button", { name: /add tag/i });
  await addButton.click();

  const nameInput = page.getByPlaceholder(/enter tag name/i);
  await nameInput.waitFor({ state: "visible", timeout: 3000 });
  await nameInput.fill(data.name);

  if (data.parentName) {
    const parentSelect = page.getByRole("combobox");
    await parentSelect.click();
    await page.getByRole("option", { name: data.parentName }).click();
  }

  if (data.isTransfer) {
    const transferCheckbox = page.getByLabel(/transfer tag/i);
    await transferCheckbox.check();
  }

  const submitButton = page.getByRole("button", { name: /^add tag$/i });
  await submitButton.click();
}

/**
 * Start editing a tag (clicks edit button, returns for further interaction).
 */
async function startEditTag(page: Page, tagName: string): Promise<void> {
  const tagRow = page
    .locator("div")
    .filter({ hasText: new RegExp(`^${tagName}`) })
    .first();
  await tagRow.hover();
  const editButton = tagRow.getByRole("button", { name: /edit/i });
  await editButton.click();
}

/**
 * Edit an existing tag and save.
 */
async function editTag(
  page: Page,
  tagName: string,
  updates: {
    name?: string;
    parentName?: string;
    isTransfer?: boolean;
  }
): Promise<void> {
  await startEditTag(page, tagName);

  if (updates.name) {
    const nameInput = page.getByPlaceholder(/tag name/i);
    await nameInput.clear();
    await nameInput.fill(updates.name);
  }

  if (updates.parentName !== undefined) {
    const parentSelect = page.getByRole("combobox");
    await parentSelect.click();
    if (updates.parentName === "") {
      await page.getByRole("option", { name: /none/i }).click();
    } else {
      await page.getByRole("option", { name: updates.parentName }).click();
    }
  }

  if (updates.isTransfer !== undefined) {
    const transferCheckbox = page.getByLabel(/transfer tag/i);
    if (updates.isTransfer) {
      await transferCheckbox.check();
    } else {
      await transferCheckbox.uncheck();
    }
  }

  const saveButton = page.getByRole("button", { name: /save/i });
  await saveButton.click();
}

/**
 * Delete a tag (double-click to confirm).
 */
async function deleteTag(page: Page, tagName: string): Promise<void> {
  const tagRow = page
    .locator("div")
    .filter({ hasText: new RegExp(`^${tagName}`) })
    .first();
  await tagRow.hover();

  const deleteButton = tagRow.getByRole("button", { name: /delete/i });
  await deleteButton.click();
  await deleteButton.click(); // Confirm
}

// ============================================================================
// Journey Tests
// ============================================================================

test.describe("Tags", () => {
  test("CRUD journey: create, edit, delete tags with cancel operations", async ({ page }) => {
    await createNewIdentity(page);
    await goToTags(page);

    // --- Page loads correctly ---
    await expect(page.getByRole("heading", { name: "Tags", level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /add tag/i })).toBeVisible();

    // --- Empty state ---
    await expect(page.getByText(/no tags created yet/i)).toBeVisible();

    // --- Cancel add form ---
    await page.getByRole("button", { name: /add tag/i }).click();
    await expect(page.getByPlaceholder(/enter tag name/i)).toBeVisible();
    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByPlaceholder(/enter tag name/i)).not.toBeVisible();

    // --- Create root tag ---
    await createTag(page, { name: "Expenses" });
    await expect(page.getByText("Expenses", { exact: true })).toBeVisible();
    await expect(page.getByText(/no tags created yet/i)).not.toBeVisible();

    // --- Create transfer tag ---
    await createTag(page, { name: "Internal Transfer", isTransfer: true });
    await expect(page.getByText("Internal Transfer", { exact: true })).toBeVisible();
    // Transfer badge should appear somewhere
    const transferBadges = page.locator("text=Transfer");
    await expect(transferBadges.first()).toBeVisible();

    // --- Edit tag name ---
    await editTag(page, "Expenses", { name: "Monthly Expenses" });
    await expect(page.getByText("Monthly Expenses", { exact: true })).toBeVisible();
    await expect(page.getByText("Expenses", { exact: true })).not.toBeVisible();

    // --- Cancel edit ---
    await startEditTag(page, "Monthly Expenses");
    const nameInput = page.getByPlaceholder(/tag name/i);
    await nameInput.clear();
    await nameInput.fill("Should Not Save");
    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByText("Monthly Expenses", { exact: true })).toBeVisible();
    await expect(page.getByText("Should Not Save", { exact: true })).not.toBeVisible();

    // --- Delete requires confirmation ---
    await createTag(page, { name: "Temporary Tag" });
    await expect(page.getByText("Temporary Tag", { exact: true })).toBeVisible();

    // First click should NOT delete
    const tempTagRow = page
      .locator("div")
      .filter({ hasText: /^Temporary Tag/ })
      .first();
    await tempTagRow.hover();
    const deleteBtn = tempTagRow.getByRole("button", { name: /delete/i });
    await deleteBtn.click();
    await expect(page.getByText("Temporary Tag", { exact: true })).toBeVisible();

    // Second click confirms
    await deleteBtn.click();
    await expect(page.getByText("Temporary Tag", { exact: true })).not.toBeVisible();
  });

  test("hierarchy journey: parent-child relationships and circular reference prevention", async ({
    page,
  }) => {
    await createNewIdentity(page);
    await goToTags(page);

    // --- Create hierarchy: Food > Groceries > Organic ---
    await createTag(page, { name: "Food" });
    await expect(page.getByText("Food", { exact: true })).toBeVisible();

    await createTag(page, { name: "Groceries", parentName: "Food" });
    await expect(page.getByText("Groceries", { exact: true })).toBeVisible();
    await expect(page.getByText(/parent.*food/i)).toBeVisible();

    await createTag(page, { name: "Organic", parentName: "Groceries" });
    await expect(page.getByText("Organic", { exact: true })).toBeVisible();
    await expect(page.getByText(/parent.*groceries/i)).toBeVisible();

    // --- Edit to add parent to existing root tag ---
    await createTag(page, { name: "Standalone" });
    await editTag(page, "Standalone", { parentName: "Food" });
    // Now Standalone should show Food as parent
    await expect(page.getByText("Standalone", { exact: true })).toBeVisible();

    // --- Circular reference prevention ---
    // When editing "Food", neither Groceries nor Organic should be available as parent
    await startEditTag(page, "Food");
    const parentSelect = page.getByRole("combobox");
    await parentSelect.click();

    // Groceries and Organic are descendants, should NOT be options
    await expect(page.getByRole("option", { name: "Groceries" })).not.toBeVisible();
    await expect(page.getByRole("option", { name: "Organic" })).not.toBeVisible();

    // Cancel out
    await page.getByRole("button", { name: /cancel/i }).click();
  });

  test("navigation: sidebar link works", async ({ page }) => {
    await createNewIdentity(page);
    await page.goto("/dashboard");

    // Click Tags in sidebar
    await page.getByRole("link", { name: /tags/i }).click();

    await expect(page).toHaveURL(/\/tags/);
    await expect(page.getByRole("heading", { name: "Tags", level: 1 })).toBeVisible();
  });
});
