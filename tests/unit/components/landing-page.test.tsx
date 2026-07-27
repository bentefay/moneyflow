/**
 * Landing page semantics, destinations and truthfulness guards.
 *
 * These assert structure and destinations rather than prose, so copy can be edited freely. The
 * exception is the truthfulness guards: those deliberately assert the ABSENCE of claims the
 * product cannot back (budgeting, insights, false absolutes), which is the property HS-016 exists
 * to protect. Adding a budgeting feature is not a reason to weaken them — it is a reason to
 * re-read specs/human-scratch.md:328-331, which says this product is explicitly not that.
 */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import MarketingLayout from "@/app/(marketing)/layout";
import LandingPage from "@/app/(marketing)/page";

function renderLanding() {
    return render(
        <MarketingLayout>
            <LandingPage />
        </MarketingLayout>
    );
}

/** Visible text of the whole document, normalised for whitespace-insensitive matching. */
function visibleText(): string {
    return (document.body.textContent ?? "").replace(/\s+/g, " ");
}

describe("landing page semantics", () => {
    it("renders one h1 that states the product positioning", () => {
        renderLanding();

        const headingsLevelOne = screen.getAllByRole("heading", { level: 1 });
        expect(headingsLevelOne).toHaveLength(1);
        expect(headingsLevelOne[0]).toHaveTextContent(/categorise and allocate/i);
    });

    it("exposes header, main and footer landmarks", () => {
        renderLanding();

        expect(screen.getByRole("banner")).toBeInTheDocument();
        expect(screen.getByRole("main")).toBeInTheDocument();
        expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    });

    it("does not skip heading levels", () => {
        renderLanding();

        const levels = screen
            .getAllByRole("heading")
            .map((heading) => Number(heading.tagName.slice(1)));

        // The first heading must be the h1, and no heading may jump more than one level deeper
        // than the one before it.
        expect(levels[0]).toBe(1);
        levels.forEach((level, index) => {
            if (index === 0) return;
            expect(level).toBeLessThanOrEqual(levels[index - 1] + 1);
        });
    });

    it("gives every section heading an accessible name", () => {
        renderLanding();

        for (const heading of screen.getAllByRole("heading")) {
            expect(heading.textContent?.trim()).not.toBe("");
        }
    });
});

describe("landing page destinations", () => {
    it("points the primary calls to action at vault creation", () => {
        renderLanding();

        const createLinks = screen.getAllByRole("link", { name: /create a vault/i });
        expect(createLinks.length).toBeGreaterThan(0);
        for (const link of createLinks) {
            expect(link).toHaveAttribute("href", "/new-user");
        }
    });

    it("offers an unlock destination for returning users", () => {
        renderLanding();

        const unlockLinks = screen.getAllByRole("link", { name: /unlock/i });
        expect(unlockLinks.length).toBeGreaterThan(0);
        for (const link of unlockLinks) {
            expect(link).toHaveAttribute("href", "/unlock");
        }
    });

    it("anchors in-page navigation at sections that exist", () => {
        const { container } = renderLanding();

        const anchorLinks = Array.from(container.querySelectorAll('a[href^="#"]'));
        expect(anchorLinks.length).toBeGreaterThan(0);

        for (const link of anchorLinks) {
            const targetId = link.getAttribute("href")?.slice(1) ?? "";
            expect(targetId).not.toBe("");
            expect(container.querySelector(`#${targetId}`)).not.toBeNull();
        }
    });

    it("ships no dead placeholder links", () => {
        const { container } = renderLanding();

        // `href="#"` renders as a working link but goes nowhere, for pointer and keyboard alike.
        expect(container.querySelectorAll('a[href="#"]')).toHaveLength(0);
        expect(container.querySelectorAll("a:not([href])")).toHaveLength(0);
    });

    it("gives every link a discernible name", () => {
        const { container } = renderLanding();

        for (const link of Array.from(container.querySelectorAll("a"))) {
            const accessibleName =
                link.textContent?.trim() ||
                link.getAttribute("aria-label") ||
                link.querySelector(".sr-only")?.textContent?.trim() ||
                "";
            expect(accessibleName).not.toBe("");
        }
    });
});

describe("landing page states the true positioning", () => {
    it("names categorising and allocating rather than budgeting", () => {
        renderLanding();

        const main = within(screen.getByRole("main"));
        expect(main.getByRole("heading", { level: 1 })).toHaveTextContent(
            /categorise and allocate/i
        );
        expect(visibleText()).toMatch(/not a budgeting app|does not set budgets/i);
    });

    it("surfaces each shipped capability at heading level", () => {
        renderLanding();

        const featureHeadings = ["CSV and OFX import", "Nested tags", "Allocations to people"];
        for (const name of featureHeadings) {
            expect(screen.getAllByText(name).length).toBeGreaterThan(0);
        }
    });

    it("advertises real-time collaboration and auto-applied rules", () => {
        renderLanding();

        const text = visibleText();
        expect(text).toMatch(/same vault at once/i);
        expect(text).toMatch(/tags, aliases and allocations are then applied/i);
    });

    it("describes both import formats", () => {
        renderLanding();

        const text = visibleText();
        expect(text).toMatch(/CSV/);
        expect(text).toMatch(/OFX/);
    });
});

describe("landing page truthfulness guards", () => {
    it("makes no budgeting or spending-insight claims", () => {
        renderLanding();

        const text = visibleText();
        const forbidden = [
            /smart budgeting/i,
            /spending insights/i,
            /budget limits?/i,
            /approaching limits/i,
            /visuali[sz]ations/i,
            /\bcharts\b/i
        ];

        for (const pattern of forbidden) {
            expect(text, `landing page must not claim ${String(pattern)}`).not.toMatch(pattern);
        }
    });

    it("only ever mentions budgeting to deny it", () => {
        renderLanding();

        // The page is allowed — encouraged — to say it is NOT a budgeting app. What it may not do
        // is offer budgeting as a capability, so every "budget" must sit next to a negation.
        const budgetMentions = visibleText().match(/[^.]*\bbudget\w*[^.]*\./gi) ?? [];
        expect(budgetMentions.length).toBeGreaterThan(0);

        for (const sentence of budgetMentions) {
            expect(sentence, `"${sentence.trim()}" presents budgeting as a feature`).toMatch(
                /\bnot\b|\bno\b|does not|doesn'?t/i
            );
        }
    });

    it("does not frame the product as expense tracking", () => {
        renderLanding();

        // "track" in the budgeting sense: tracking expenses/spending against a plan.
        expect(visibleText()).not.toMatch(
            /track(?:ing)?\s+(?:your\s+)?(?:expenses|spending|budget)/i
        );
    });

    it("makes no absolute security or privacy claims", () => {
        renderLanding();

        const text = visibleText();
        const overclaims = [
            /zero.?knowledge/i,
            /100% private/i,
            /unhackable/i,
            /hackers can'?t/i,
            /military.?grade/i,
            /completely anonymous/i,
            /even if compelled by law/i,
            /\bnever\b.{0,20}\bhacked\b/i
        ];

        for (const pattern of overclaims) {
            expect(text, `landing page must not claim ${String(pattern)}`).not.toMatch(pattern);
        }
    });

    it("discloses what the server can still see", () => {
        renderLanding();

        // The privacy story is only honest if the limits are stated alongside the guarantee.
        expect(visibleText()).toMatch(/what the server can still see/i);
    });

    it("does not claim an open-source or MIT licence", () => {
        renderLanding();

        // README.md declares the project proprietary and there is no LICENSE file.
        const text = visibleText();
        expect(text).not.toMatch(/open source/i);
        expect(text).not.toMatch(/MIT licen[cs]e/i);
    });

    it("does not promise a specific sync latency", () => {
        renderLanding();

        // The sync suite asserts convergence, not timing.
        expect(visibleText()).not.toMatch(/instantly|sub-second|in milliseconds/i);
    });
});
