/**
 * Public landing page journeys.
 *
 * Covers the unauthenticated entry path: land on `/`, follow the primary call to action, and
 * arrive at the new-user flow. Assertions target destinations and behaviour rather than the
 * wording of any given sentence, so marketing copy stays editable.
 */

import { expect, test } from "@playwright/test";

const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 390, height: 844 };

test.describe("Public landing page", () => {
    test("takes an unauthenticated visitor from landing to vault creation", async ({ page }) => {
        await page.setViewportSize(DESKTOP);
        await page.goto("/");

        // The landing page must render for a visitor with no identity and no vault.
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

        await page
            .getByRole("main")
            .getByRole("link", { name: /create a vault/i })
            .first()
            .click();

        await page.waitForURL("**/new-user");
        // The new-user entry point offers a way to generate credentials.
        await expect(page.locator('[data-testid="generate-button"]')).toBeVisible();
    });

    test("offers returning visitors the unlock flow", async ({ page }) => {
        await page.setViewportSize(DESKTOP);
        await page.goto("/");

        await page
            .getByRole("banner")
            .getByRole("link", { name: /unlock/i })
            .click();

        await page.waitForURL("**/unlock");
        await expect(page.locator('[data-testid="seed-word-input-0"]')).toBeVisible();
    });

    test("navigates to in-page sections from the header", async ({ page }) => {
        await page.setViewportSize(DESKTOP);
        await page.goto("/");

        await page
            .getByRole("banner")
            .getByRole("link", { name: /what it does/i })
            .click();

        await expect(page).toHaveURL(/#features$/);
        await expect(page.locator("#features")).toBeInViewport();
    });

    test("reaches vault creation through the mobile menu", async ({ page }) => {
        await page.setViewportSize(MOBILE);
        await page.goto("/");

        await page.getByRole("button", { name: /open main menu/i }).click();
        await page
            .getByRole("link", { name: /create a vault/i })
            .last()
            .click();

        await page.waitForURL("**/new-user");
        await expect(page.locator('[data-testid="generate-button"]')).toBeVisible();
    });

    test("keeps the primary call to action reachable without horizontal overflow on mobile", async ({
        page
    }) => {
        await page.setViewportSize(MOBILE);
        await page.goto("/");

        const overflows = await page.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
        );
        expect(overflows).toBe(false);
    });

    test("exposes no dead placeholder links", async ({ page }) => {
        await page.setViewportSize(DESKTOP);
        await page.goto("/");

        // A `href="#"` link is focusable and clickable but goes nowhere.
        await expect(page.locator('a[href="#"]')).toHaveCount(0);
    });

    test("advertises no budgeting capability", async ({ page }) => {
        await page.setViewportSize(DESKTOP);
        await page.goto("/");

        // Guards the frozen positioning end-to-end: this product categorises and allocates.
        await expect(page.getByRole("heading", { name: /smart budgeting/i })).toHaveCount(0);
        await expect(page.getByText(/spending insights/i)).toHaveCount(0);
    });
});
