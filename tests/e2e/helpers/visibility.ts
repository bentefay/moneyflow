/**
 * Page-visibility control for background-behaviour E2E tests.
 *
 * IMPORTANT — what this does and does not do:
 *
 *   - It DOES redefine the `document.visibilityState` / `document.hidden` getters and dispatch a
 *     real `visibilitychange` event, so application code that branches on the page-visibility API
 *     takes its hidden/visible path exactly as it would in a backgrounded tab.
 *   - It does NOT background the renderer, throttle timers, or slow the websocket. The browser's own
 *     scheduling is untouched.
 *
 * Consequently this helper is valid for asserting BEHAVIOUR (does the client re-sync, does it leak,
 * does it stall?) and is NOT valid for measuring hidden-tab network timing. No duration observed
 * under this control may be reported as genuinely-hidden-tab timing.
 */

import type { Page } from "@playwright/test";

export type DocumentVisibility = "visible" | "hidden";

interface VisibilityControlWindow {
    __moneyflowVisibilityControl?: { state: DocumentVisibility };
}

/**
 * Installs the overridable visibility getters before any application script runs.
 * Must be called before the page navigates.
 */
export async function installVisibilityControl(page: Page): Promise<void> {
    // The init script is serialized into the page, so it cannot close over module-level bindings.
    await page.addInitScript(() => {
        const control = { state: "visible" as DocumentVisibility };
        (window as VisibilityControlWindow).__moneyflowVisibilityControl = control;

        Object.defineProperty(document, "visibilityState", {
            configurable: true,
            get: () => control.state
        });
        Object.defineProperty(document, "hidden", {
            configurable: true,
            get: () => control.state === "hidden"
        });
    });
}

/**
 * Flips the reported visibility and dispatches `visibilitychange`, mirroring the event order a real
 * tab switch produces. Requires {@link installVisibilityControl} to have run first.
 */
export async function setDocumentVisibility(page: Page, state: DocumentVisibility): Promise<void> {
    await page.evaluate((nextState: DocumentVisibility) => {
        const control = (window as VisibilityControlWindow).__moneyflowVisibilityControl;
        if (!control) {
            throw new Error("Visibility control was not installed before navigation");
        }
        control.state = nextState;
        document.dispatchEvent(new Event("visibilitychange"));
        // A real foreground transition also restores window focus.
        if (nextState === "visible") window.dispatchEvent(new Event("focus"));
    }, state);
}
