/**
 * E2E Test: Onboarding Creates + Selects Vault
 */

import { expect, test } from "@playwright/test";
import { createNewIdentity, goToAccounts, goToTags } from "./helpers";

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

	test("new vault has default person and account with ownership", async ({ page }) => {
		await test.step("create identity with automatic vault creation", async () => {
			await createNewIdentity(page);
		});

		await test.step("verify default account has Me as 100% owner", async () => {
			await goToAccounts(page);

			// Default account should exist and show "Me (100%)" as owner
			await expect(page.getByText("Default", { exact: true })).toBeVisible();
			await expect(page.getByText("Me (100%)")).toBeVisible();
		});
	});
});
