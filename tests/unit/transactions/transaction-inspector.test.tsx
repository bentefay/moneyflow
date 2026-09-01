import { act, fireEvent, render, screen } from "@testing-library/react";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it, vi } from "vitest";

import {
    createTransactionCellSelectionAtom,
    createTransactionGridWorkspaceController
} from "@/components/features/transactions/hooks/useTransactionGridController";
import { asTransactionId } from "@/components/features/transactions/table-model";
import { TransactionInspector } from "@/components/features/transactions/TransactionInspector";
import type { TransactionInput } from "@/lib/crdt/schema";
import { buildTransactionIndex, createTransactionCursor } from "@/lib/crdt/transaction-cursor";
import { asMinorUnits } from "@/lib/domain/currency";

import { populateStore } from "../crdt/transaction-cursor-fixtures";

const COLUMNS = ["date", "description", "amount", "actions"] as const;

class InspectorResizeObserver {
    static current: InspectorResizeObserver | null = null;

    private readonly observedTargets = new Set<Element>();
    readonly disconnect = vi.fn(() => this.observedTargets.clear());
    readonly observe = vi.fn((target: Element) => {
        this.observedTargets.add(target);
    });
    readonly unobserve = vi.fn((target: Element) => {
        this.observedTargets.delete(target);
    });

    constructor(private readonly callback: ResizeObserverCallback) {
        InspectorResizeObserver.current = this;
    }

    isObserving(target: Element): boolean {
        return this.observedTargets.has(target);
    }

    trigger(target: Element): boolean {
        if (!this.isObserving(target)) return false;
        this.callback([], this);
        return true;
    }
}

class InspectorMediaQuery extends EventTarget {
    readonly media = "(min-width: 80rem)";
    matches: boolean;

    constructor(matches: boolean) {
        super();
        this.matches = matches;
    }

    setMatches(matches: boolean): void {
        this.matches = matches;
        this.dispatchEvent(new Event("change"));
    }
}

function transaction(id: string, notes = ""): TransactionInput {
    return {
        accountId: "acc-1",
        allocations: {},
        amount: asMinorUnits(-1000),
        creationInstant: Temporal.Instant.from("2026-08-29T10:00:00Z"),
        date: Temporal.PlainDate.from("2026-08-29"),
        deletedAt: undefined,
        description: `Description ${id}`,
        descriptionAliasId: undefined,
        id,
        importId: "",
        importRowIndex: 0,
        notes,
        originalAmount: undefined,
        statusId: "status-for-review",
        suspectedDuplicates: [],
        tagIds: []
    };
}

function createController(ids: readonly string[]) {
    const controller = createTransactionGridWorkspaceController(
        createTransactionCellSelectionAtom()
    );
    controller.updateProjection(
        createTransactionCursor(
            buildTransactionIndex(populateStore(ids.map((id) => transaction(id))))
        ),
        COLUMNS
    );
    return controller;
}

describe("TransactionInspector", () => {
    it("renders one persistent complementary landmark with a neutral pre-focus state", () => {
        const controller = createController(["tx-1"]);
        render(
            <TransactionInspector
                controller={controller}
                open
                transaction={null}
                onNotesChange={() => undefined}
                onRequestClose={() => undefined}
            />
        );

        const inspector = screen.getByTestId("transaction-inspector");
        expect(screen.getAllByRole("complementary")).toEqual([inspector]);
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(inspector).toHaveAttribute("aria-labelledby", "transaction-inspector-title");
        expect(screen.getByTestId("transaction-inspector-title")).toHaveAttribute("tabindex", "-1");
        expect(screen.getByText(/focus a transaction cell/i)).toBeInTheDocument();
        expect(screen.queryByTestId("notes-editable")).not.toBeInTheDocument();
    });

    it("preserves one desired scroll offset through mode clamps and hidden reopen", () => {
        const originalInnerWidth = window.innerWidth;
        const originalMatchMedia = Object.getOwnPropertyDescriptor(window, "matchMedia");
        const mediaQuery = new InspectorMediaQuery(false);
        const matchMedia = vi.fn(() => mediaQuery);
        vi.useFakeTimers();
        const cancelAnimationFrame = vi.spyOn(window, "cancelAnimationFrame");
        Object.defineProperties(window, {
            innerWidth: { configurable: true, value: 1_024 },
            matchMedia: { configurable: true, value: matchMedia }
        });
        try {
            const controller = createController(["tx-1"]);
            controller.setFocusedCell("tx-1", "description");
            const onNotesChange = vi.fn();
            const first = transaction("tx-1", "First note");
            const { rerender } = render(
                <TransactionInspector
                    className="narrow-layout-simulation"
                    controller={controller}
                    open
                    transaction={first}
                    onNotesChange={onNotesChange}
                    onRequestClose={() => undefined}
                />
            );

            const inspector = screen.getByTestId("transaction-inspector");
            const notes = screen.getByTestId("notes-editable");
            if (!(notes instanceof HTMLTextAreaElement)) throw new Error("Expected notes textarea");
            let inspectorClientHeight = 288;
            Object.defineProperties(inspector, {
                clientHeight: { configurable: true, get: () => inspectorClientHeight },
                scrollHeight: { configurable: true, value: 800 }
            });
            notes.focus();
            notes.setSelectionRange(3, 3);
            notes.scrollTop = 19;
            inspector.scrollTop = 41;
            fireEvent.scroll(inspector);
            expect(matchMedia).toHaveBeenCalledWith("(min-width: 80rem)");
            expect(inspector.className).toContain("overflow-y-auto");
            expect(inspector.className).toContain("h-full");

            inspectorClientHeight = 780;
            mediaQuery.setMatches(true);
            inspector.scrollTop = 0;
            fireEvent.scroll(inspector);
            act(() => vi.advanceTimersByTime(20));
            expect(inspector.scrollTop).toBe(20);
            fireEvent.scroll(inspector);

            inspectorClientHeight = 288;
            mediaQuery.setMatches(false);
            act(() => vi.advanceTimersByTime(20));
            expect(inspector.scrollTop).toBe(41);

            mediaQuery.setMatches(true);
            act(() => vi.advanceTimersByTime(20));
            expect(inspector.scrollTop).toBe(41);
            inspector.scrollTop = 73;
            fireEvent.scroll(inspector);
            mediaQuery.setMatches(false);
            act(() => vi.advanceTimersByTime(20));
            expect(inspector.scrollTop).toBe(73);

            cancelAnimationFrame.mockClear();
            mediaQuery.setMatches(true);
            mediaQuery.setMatches(false);
            expect(cancelAnimationFrame).toHaveBeenCalledTimes(1);
            act(() => vi.advanceTimersByTime(20));
            expect(inspector.scrollTop).toBe(73);
            expect(window.innerWidth).toBe(1_024);
            expect(screen.getByTestId("transaction-inspector")).toBe(inspector);
            expect(screen.getByTestId("notes-editable")).toBe(notes);
            expect(document.activeElement).toBe(notes);
            expect(notes.selectionStart).toBe(3);
            expect(notes.scrollTop).toBe(19);

            rerender(
                <TransactionInspector
                    className="narrow-layout-simulation"
                    controller={controller}
                    open={false}
                    transaction={{ ...first, notes: "First note updated" }}
                    onNotesChange={onNotesChange}
                    onRequestClose={() => undefined}
                />
            );
            inspectorClientHeight = 780;
            mediaQuery.setMatches(true);
            inspector.scrollTop = 0;
            fireEvent.scroll(inspector);
            rerender(
                <TransactionInspector
                    className="narrow-layout-simulation"
                    controller={controller}
                    open
                    transaction={{ ...first, notes: "First note updated" }}
                    onNotesChange={onNotesChange}
                    onRequestClose={() => undefined}
                />
            );
            act(() => vi.advanceTimersByTime(20));
            expect(inspector.scrollTop).toBe(20);
            fireEvent.scroll(inspector);

            inspectorClientHeight = 288;
            mediaQuery.setMatches(false);
            act(() => vi.advanceTimersByTime(20));
            expect(inspector.scrollTop).toBe(73);
            expect(screen.getByTestId("notes-editable")).toBe(notes);
            expect(notes.value).toBe("First note updated");
        } finally {
            Object.defineProperty(window, "innerWidth", {
                configurable: true,
                value: originalInnerWidth
            });
            if (originalMatchMedia == null) {
                Reflect.deleteProperty(window, "matchMedia");
            } else {
                Object.defineProperty(window, "matchMedia", originalMatchMedia);
            }
            cancelAnimationFrame.mockRestore();
            vi.useRealTimers();
        }
    });

    it("preserves a same-mode desired offset through range clamps until a genuine user scroll replaces it", () => {
        const originalMatchMedia = Object.getOwnPropertyDescriptor(window, "matchMedia");
        const originalResizeObserver = Object.getOwnPropertyDescriptor(
            globalThis,
            "ResizeObserver"
        );
        const mediaQuery = new InspectorMediaQuery(false);
        vi.useFakeTimers();
        Object.defineProperty(window, "matchMedia", {
            configurable: true,
            value: vi.fn(() => mediaQuery)
        });
        Object.defineProperty(globalThis, "ResizeObserver", {
            configurable: true,
            value: InspectorResizeObserver
        });
        try {
            const controller = createController(["tx-1"]);
            controller.setFocusedCell("tx-1", "description");
            render(
                <TransactionInspector
                    controller={controller}
                    open
                    transaction={transaction("tx-1")}
                    onNotesChange={() => undefined}
                    onRequestClose={() => undefined}
                />
            );
            const inspector = screen.getByTestId("transaction-inspector");
            const resizeObserver = InspectorResizeObserver.current;
            if (resizeObserver == null) throw new Error("Expected the inspector resize observer");
            let inspectorClientHeight = 120;
            let inspectorScrollHeight = 800;
            Object.defineProperties(inspector, {
                clientHeight: { configurable: true, get: () => inspectorClientHeight },
                scrollHeight: { configurable: true, get: () => inspectorScrollHeight }
            });

            expect(resizeObserver.isObserving(inspector)).toBe(true);
            inspector.scrollTop = 120;
            fireEvent.scroll(inspector);

            inspectorScrollHeight = 200;
            inspector.scrollTop = 80;
            fireEvent.scroll(inspector);
            inspector.scrollTop = 17;
            act(() => vi.advanceTimersByTime(20));
            expect(inspector.scrollTop).toBe(80);

            inspectorScrollHeight = 800;
            expect(resizeObserver.trigger(inspector)).toBe(true);
            act(() => vi.advanceTimersByTime(20));
            expect(inspector.scrollTop).toBe(120);

            inspector.scrollTop = 45;
            fireEvent.scroll(inspector);
            inspectorClientHeight = 800;
            inspector.scrollTop = 0;
            fireEvent.scroll(inspector);
            act(() => vi.advanceTimersByTime(20));
            expect(inspector.scrollTop).toBe(0);
            fireEvent.scroll(inspector);
            fireEvent.scroll(inspector);

            inspectorClientHeight = 120;
            expect(resizeObserver.trigger(inspector)).toBe(true);
            act(() => vi.advanceTimersByTime(20));
            expect(inspector.scrollTop).toBe(45);
        } finally {
            InspectorResizeObserver.current = null;
            if (originalMatchMedia == null) Reflect.deleteProperty(window, "matchMedia");
            else Object.defineProperty(window, "matchMedia", originalMatchMedia);
            if (originalResizeObserver == null) {
                Reflect.deleteProperty(globalThis, "ResizeObserver");
            } else {
                Object.defineProperty(globalThis, "ResizeObserver", originalResizeObserver);
            }
            vi.useRealTimers();
        }
    });

    it("keeps a genuine user scroll that arrives before a same-mode restoration frame", () => {
        const originalMatchMedia = Object.getOwnPropertyDescriptor(window, "matchMedia");
        const originalResizeObserver = Object.getOwnPropertyDescriptor(
            globalThis,
            "ResizeObserver"
        );
        const mediaQuery = new InspectorMediaQuery(false);
        vi.useFakeTimers();
        Object.defineProperty(window, "matchMedia", {
            configurable: true,
            value: vi.fn(() => mediaQuery)
        });
        Object.defineProperty(globalThis, "ResizeObserver", {
            configurable: true,
            value: InspectorResizeObserver
        });
        try {
            const controller = createController(["tx-1"]);
            controller.setFocusedCell("tx-1", "description");
            render(
                <TransactionInspector
                    controller={controller}
                    open
                    transaction={transaction("tx-1")}
                    onNotesChange={() => undefined}
                    onRequestClose={() => undefined}
                />
            );
            const inspector = screen.getByTestId("transaction-inspector");
            const resizeObserver = InspectorResizeObserver.current;
            if (resizeObserver == null) throw new Error("Expected the inspector resize observer");
            let inspectorScrollHeight = 800;
            Object.defineProperties(inspector, {
                clientHeight: { configurable: true, value: 120 },
                scrollHeight: { configurable: true, get: () => inspectorScrollHeight }
            });

            inspector.scrollTop = 120;
            fireEvent.scroll(inspector);
            inspectorScrollHeight = 200;
            inspector.scrollTop = 80;
            fireEvent.scroll(inspector);

            inspector.scrollTop = 40;
            fireEvent.scroll(inspector);
            act(() => vi.advanceTimersByTime(20));
            expect(inspector.scrollTop).toBe(40);

            inspectorScrollHeight = 800;
            expect(resizeObserver.trigger(inspector)).toBe(true);
            act(() => vi.advanceTimersByTime(20));
            expect(inspector.scrollTop).toBe(40);
        } finally {
            InspectorResizeObserver.current = null;
            if (originalMatchMedia == null) Reflect.deleteProperty(window, "matchMedia");
            else Object.defineProperty(window, "matchMedia", originalMatchMedia);
            if (originalResizeObserver == null) {
                Reflect.deleteProperty(globalThis, "ResizeObserver");
            } else {
                Object.defineProperty(globalThis, "ResizeObserver", originalResizeObserver);
            }
            vi.useRealTimers();
        }
    });

    it("binds notes to the exact active owner and writes every input immediately", () => {
        const controller = createController(["tx-1", "tx-2"]);
        controller.setFocusedCell("tx-1", "description");
        const onNotesChange = vi.fn();
        const { rerender } = render(
            <TransactionInspector
                controller={controller}
                open
                transaction={transaction("tx-1", "one")}
                onNotesChange={onNotesChange}
                onRequestClose={() => undefined}
            />
        );

        const inspector = screen.getByTestId("transaction-inspector");
        const notes = screen.getByTestId("notes-editable");
        expect(inspector).toHaveAttribute("data-transaction-owner", "tx-1");
        expect(notes).toHaveAttribute("data-transaction-owner", "tx-1");
        expect(notes).toHaveAttribute("data-inspector-action", "notes");
        fireEvent.change(notes, { target: { value: "one changed" } });
        expect(onNotesChange).toHaveBeenLastCalledWith(asTransactionId("tx-1"), "one changed");

        controller.setFocusedCell("tx-2", "description");
        rerender(
            <TransactionInspector
                controller={controller}
                open
                transaction={transaction("tx-2", "two")}
                onNotesChange={onNotesChange}
                onRequestClose={() => undefined}
            />
        );
        expect(screen.getByTestId("notes-editable")).toBe(notes);
        expect(inspector).toHaveAttribute("data-transaction-owner", "tx-2");
        expect(notes).toHaveAttribute("data-transaction-owner", "tx-2");
        fireEvent.change(notes, { target: { value: "two changed" } });
        expect(onNotesChange).toHaveBeenLastCalledWith(asTransactionId("tx-2"), "two changed");
    });

    it.each(["navigating", "parked"])(
        "enters from %s close-button focus and restores the exact active gridcell",
        (entryState) => {
            const controller = createController(["tx-1"]);
            const address = {
                columnId: "description" as const,
                transactionId: asTransactionId("tx-1")
            };
            const gridcell = document.createElement("button");
            document.body.append(gridcell);
            controller.registerCell(address, gridcell);
            controller.setFocusedCell("tx-1", "description");
            controller.setInspectorPanelOpen(true);
            gridcell.focus();
            if (entryState === "parked") controller.parkExternalFocus();
            const onRequestClose = vi.fn();
            render(
                <TransactionInspector
                    controller={controller}
                    open
                    transaction={transaction("tx-1", "note")}
                    onNotesChange={() => undefined}
                    onRequestClose={onRequestClose}
                />
            );
            const close = screen.getByRole("button", { name: "Close transaction inspector" });

            fireEvent.focus(close);
            expect(controller.getInteractionState()).toMatchObject({ kind: "inspecting" });
            fireEvent.click(close);

            expect(onRequestClose).toHaveBeenCalledTimes(1);
            expect(document.activeElement).toBe(gridcell);
            expect(controller.getSnapshot()).toMatchObject({
                activeAddress: address,
                inspectorPanelOpen: false,
                interactionKind: "navigating"
            });
            gridcell.remove();
        }
    );

    it("restores the active gridcell when Escape is pressed from the inspector heading", () => {
        const controller = createController(["tx-1"]);
        const address = {
            columnId: "description" as const,
            transactionId: asTransactionId("tx-1")
        };
        const gridcell = document.createElement("button");
        document.body.append(gridcell);
        controller.registerCell(address, gridcell);
        controller.setFocusedCell("tx-1", "description");
        controller.setInspectorPanelOpen(true);
        gridcell.focus();
        const onRequestClose = vi.fn();
        render(
            <TransactionInspector
                controller={controller}
                open
                transaction={transaction("tx-1", "note")}
                onNotesChange={() => undefined}
                onRequestClose={onRequestClose}
            />
        );
        const heading = screen.getByTestId("transaction-inspector-title");

        fireEvent.focus(heading);
        expect(controller.getInteractionState()).toMatchObject({ kind: "inspecting" });
        fireEvent.keyDown(heading, { key: "Escape" });

        expect(onRequestClose).toHaveBeenCalledTimes(1);
        expect(document.activeElement).toBe(gridcell);
        expect(controller.getSnapshot()).toMatchObject({
            inspectorPanelOpen: false,
            interactionKind: "navigating"
        });
        gridcell.remove();
    });

    it("closes local panel availability when the focused close control no longer owns the active row", () => {
        const controller = createController(["tx-1", "tx-2"]);
        controller.setFocusedCell("tx-2", "description");
        controller.setInspectorPanelOpen(true);
        const onRequestClose = vi.fn();
        render(
            <TransactionInspector
                controller={controller}
                open
                transaction={transaction("tx-1", "stale note")}
                onNotesChange={() => undefined}
                onRequestClose={onRequestClose}
            />
        );
        const close = screen.getByRole("button", { name: "Close transaction inspector" });

        close.focus();
        expect(controller.getInteractionState()).toMatchObject({ kind: "navigating" });
        fireEvent.click(close);

        expect(onRequestClose).toHaveBeenCalledTimes(1);
        expect(controller.getSnapshot()).toMatchObject({
            activeTransactionId: asTransactionId("tx-2"),
            inspectorPanelOpen: false,
            interactionKind: "navigating"
        });
    });
});
