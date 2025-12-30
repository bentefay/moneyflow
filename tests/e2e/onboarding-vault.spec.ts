/**
 * E2E Test: Onboarding Creates + Selects Vault
 */

import { expect, test } from "@playwright/test";
import { createNewIdentity, goToTags } from "./helpers";

test.describe("Onboarding", () => {
	test("creates and selects a vault as part of onboarding", async ({ page }) => {
		await test.step("create identity with automatic vault creation", async () => {
			await createNewIdentity(page);
		});

		await test.step("verify vault is created and selected", async () => {
			// If a vault is created+selected correctly, Tags should render the table (not the empty state)
			await goToTags(page);

			await expect(page.getByRole("button", { name: /add tag/i })).toBeVisible();
			await expect(page.getByText(/no vault selected/i)).not.toBeVisible();

			// The vault selector should no longer show the placeholder label.
			await expect(page.getByRole("button", { name: /select vault/i })).not.toBeVisible();
		});
	});
});
