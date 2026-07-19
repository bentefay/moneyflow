import { expect, test } from "@playwright/test";

import { createNewIdentity } from "./helpers/auth";

test.describe("Desktop sidebar", () => {
    test("keeps labels on one line while the sidebar expands", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await createNewIdentity(page);

        const sidebar = page.locator("aside");
        await page.getByRole("button", { name: "Collapse sidebar" }).click();
        await expect(sidebar).toHaveCSS("width", "64px");

        const frames = await page.evaluate(async () => {
            const expandButton = document.querySelector('button[aria-label="Expand sidebar"]');
            if (!(expandButton instanceof HTMLButtonElement)) {
                throw new Error("Expand sidebar button not found");
            }

            expandButton.click();

            const labelSelectors = [
                'a[href="/tx-descriptions"] span',
                'a[href="/settings"] span',
                "nav:last-of-type button span"
            ];
            const capturedFrames: Array<{
                sidebarWidth: number;
                labels: Array<{
                    lineCount: number;
                    whiteSpace: string;
                }>;
            }> = [];

            for (let frame = 0; frame < 22; frame++) {
                await new Promise(requestAnimationFrame);

                const sidebarElement = document.querySelector("aside");
                if (!(sidebarElement instanceof HTMLElement)) {
                    throw new Error("Desktop sidebar not found");
                }

                const labels = labelSelectors.map((selector) => {
                    const label = sidebarElement.querySelector(selector);
                    if (!(label instanceof HTMLElement)) {
                        throw new Error(`Sidebar label not found: ${selector}`);
                    }

                    const range = document.createRange();
                    range.selectNodeContents(label);
                    const lineCount = new Set(
                        Array.from(range.getClientRects(), (rect) => Math.round(rect.top))
                    ).size;
                    const style = getComputedStyle(label);

                    return {
                        lineCount,
                        whiteSpace: style.whiteSpace
                    };
                });

                capturedFrames.push({
                    sidebarWidth: sidebarElement.getBoundingClientRect().width,
                    labels
                });
            }

            return capturedFrames;
        });

        expect(frames.some(({ sidebarWidth }) => sidebarWidth < 128)).toBe(true);
        expect(frames.some(({ sidebarWidth }) => sidebarWidth > 240)).toBe(true);

        for (const frame of frames) {
            for (const label of frame.labels) {
                expect(label.lineCount).toBe(1);
                expect(label.whiteSpace).toBe("nowrap");
            }
        }
    });
});
