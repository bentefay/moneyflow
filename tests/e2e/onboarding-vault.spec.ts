/**
 * E2E Test: Onboarding Creates + Selects Vault
 */

import { expect, test } from "@playwright/test";
import { createNewIdentity, goToAccounts, goToSettings, goToTags } from "./helpers";

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

test.describe("Currency Detection", () => {
	test("new vault uses USD for en-US locale (default)", async ({ page }) => {
		await test.step("create identity with automatic vault creation", async () => {
			await createNewIdentity(page);
		});

		await test.step("verify vault has USD as default currency", async () => {
			await goToSettings(page);

			// The currency selector button shows the selected currency
			const currencySelector = page.getByRole("combobox", { name: /default currency/i });
			await expect(currencySelector).toContainText("USD");
		});
	});

	test("new vault detects GBP for en-GB locale", async ({ browser }) => {
		// Create a new context with en-GB locale
		const context = await browser.newContext({ locale: "en-GB" });
		const page = await context.newPage();

		try {
			await test.step("create identity with automatic vault creation", async () => {
				await createNewIdentity(page);
			});

			await test.step("verify vault has GBP as default currency", async () => {
				await goToSettings(page);

				// The currency selector button shows the selected currency
				const currencySelector = page.getByRole("combobox", { name: /default currency/i });
				await expect(currencySelector).toContainText("GBP");
			});
		} finally {
			await context.close();
		}
	});

	test("new vault detects EUR for de-DE locale", async ({ browser }) => {
		// Create a new context with de-DE locale
		const context = await browser.newContext({ locale: "de-DE" });
		const page = await context.newPage();

		try {
			await test.step("create identity with automatic vault creation", async () => {
				await createNewIdentity(page);
			});

			await test.step("verify vault has EUR as default currency", async () => {
				await goToSettings(page);

				// The currency selector button shows the selected currency
				const currencySelector = page.getByRole("combobox", { name: /default currency/i });
				await expect(currencySelector).toContainText("EUR");
			});
		} finally {
			await context.close();
		}
	});

	test("new vault detects JPY for ja-JP locale", async ({ browser }) => {
		// Create a new context with ja-JP locale
		const context = await browser.newContext({ locale: "ja-JP" });
		const page = await context.newPage();

		try {
			await test.step("create identity with automatic vault creation", async () => {
				await createNewIdentity(page);
			});

			await test.step("verify vault has JPY as default currency", async () => {
				await goToSettings(page);

				// The currency selector button shows the selected currency
				const currencySelector = page.getByRole("combobox", { name: /default currency/i });
				await expect(currencySelector).toContainText("JPY");
			});
		} finally {
			await context.close();
		}
	});
});
