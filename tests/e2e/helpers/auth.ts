/**
 * Authentication E2E Helpers
 *
 * Helpers for identity creation, unlock, and session management.
 */

import { expect, type Page } from "@playwright/test";

/**
 * Complete the new user flow: generate seed phrase, confirm, and create account.
 * Returns the seed phrase words for potential later use (e.g., unlock tests).
 */
export async function createNewIdentity(page: Page): Promise<string[]> {
    await page.goto("/new-user");

    // Wait for page to be fully loaded and generate button to be ready
    const generateButton = page.locator('[data-testid="generate-button"]');
    await generateButton.waitFor({ state: "visible", timeout: 10000 });

    // Button is disabled until React hydration completes (via useIsHydrated hook).
    // Playwright's click() auto-waits for enabled state, so this just works.
    await generateButton.click();

    // Wait for seed phrase to be displayed
    await page.waitForSelector('[data-testid="seed-phrase-word"]', { timeout: 20000 });

    // Reveal seed phrase if hidden (click the reveal button)
    // The SeedPhraseDisplay starts with initiallyRevealed=false on new-user page
    const revealButton = page.getByRole("button", { name: /click to reveal/i });
    // Sized like the sibling waits on this path: the button only paints after the generate step
    // re-renders, and under full-suite parallel load that re-render can exceed the 5s default.
    await revealButton.waitFor({ state: "visible", timeout: 15_000 });
    await revealButton.click();
    // The reveal animation is complete once the words themselves are visible, which is exactly
    // what extractSeedPhrase reads next.
    await page.locator('[data-testid="seed-phrase-word"]').first().waitFor({ state: "visible" });

    // Extract seed phrase
    const words = await extractSeedPhrase(page);

    // Check confirm checkbox and continue
    const checkbox = page.locator('[data-testid="confirm-checkbox"]');
    await checkbox.waitFor({ state: "visible", timeout: 15_000 });
    await checkbox.check();

    const continueButton = page.locator('[data-testid="continue-button"]');
    await expect(continueButton).toBeEnabled({ timeout: 15_000 });

    await continueButton.click();

    // New users land on settings page after vault creation
    await page.waitForURL("**/settings", { timeout: 15000 });

    // Onboarding must create + select a vault (persisted via localStorage)
    await page.waitForFunction(
        () => {
            try {
                return !!localStorage.getItem("moneyflow_active_vault");
            } catch {
                return false;
            }
        },
        undefined,
        { timeout: 20000 }
    );

    return words;
}

/**
 * Extract seed phrase words from the display component.
 */
export async function extractSeedPhrase(page: Page): Promise<string[]> {
    const wordElements = await page.$$('[data-testid="seed-phrase-word"]');
    const words: string[] = [];

    for (const element of wordElements) {
        const text = await element.textContent();
        if (text) {
            const word = text.replace(/^\d+\.\s*/, "").trim();
            words.push(word);
        }
    }

    return words;
}

/**
 * Wait until the unlock page's React tree has hydrated, so a subsequent fill into the recovery
 * phrase fields actually reaches their onChange handlers.
 *
 * Why a dedicated signal is needed: the word slots and the canonical credential are fully
 * controlled inputs (`SeedPhraseInput.tsx`, `RecoveryPhraseCredentialFields.tsx`), and
 * `components/ui/input.tsx` carries no hydration gate — unlike `components/ui/button.tsx`, which
 * disables itself until `useIsHydrated()` flips. An input is therefore editable from the moment
 * the server HTML paints, so `toBeVisible()`/`toBeEditable()`/`toHaveValue()` prove nothing about
 * hydration: a fill landing early sets the DOM value but never runs `onChange`, and the next
 * React commit re-asserts empty state over it.
 *
 * The passkey branch is the deterministic signal. `usePasskey` starts at `capability: "checking"`
 * and `PasskeyUnlockButton` renders `null` for that value, moving to the button or the unsupported
 * notice only from a `useEffect`. Neither element can exist in the server HTML, so seeing either
 * one proves the unlock page's root has hydrated and flushed its effects — which is the same
 * commit that attached the seed inputs' handlers. Asserting it is also enabled adds the
 * `useIsHydrated` gate itself in the supported branch, since it is a `Button`; the notice is a
 * `<p>`, which Playwright treats as trivially enabled.
 */
export async function waitForUnlockHydration(page: Page): Promise<void> {
    const passkeyBranch = page
        .getByTestId("passkey-unlock-button")
        .or(page.getByTestId("passkey-unsupported-notice"));

    await expect(passkeyBranch).toBeVisible({ timeout: 15_000 });
    await expect(passkeyBranch).toBeEnabled({ timeout: 15_000 });
}

/**
 * Enter seed phrase into the unlock inputs.
 * Clears all inputs first and then fills each word.
 *
 * @param page - Playwright page
 * @param words - Array of 12 seed phrase words
 * @param expectValid - Whether to wait for "Valid recovery phrase" indicator (default: false)
 */
export async function enterSeedPhrase(
    page: Page,
    words: string[],
    expectValid = false
): Promise<void> {
    // A fill into an unhydrated controlled input is silently discarded, so gate on hydration
    // before touching the grid at all.
    await waitForUnlockHydration(page);

    // First, clear all inputs to ensure clean state
    for (let i = 0; i < 12; i++) {
        const input = page.locator(`[data-testid="seed-word-input-${i}"]`);
        await input.clear();
    }

    // Enter words one by one
    for (let i = 0; i < words.length; i++) {
        const input = page.locator(`[data-testid="seed-word-input-${i}"]`);
        await input.fill(words[i]);
    }

    // If we expect the phrase to be valid, wait for the validation indicator. This is the
    // post-propagation signal: it can only render once every onChange ran and the BIP39 checksum
    // was recomputed from React state, so it proves the twelve fills landed in the component and
    // not merely in the DOM.
    if (expectValid) {
        await page
            .getByText("Valid recovery phrase")
            .waitFor({ state: "visible", timeout: 15_000 });
    }
}

/**
 * Clear session storage and local storage for a fresh start.
 */
export async function clearSession(page: Page): Promise<void> {
    await page.evaluate(() => {
        sessionStorage.clear();
        localStorage.clear();
    });
}
