import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
    allocationField,
    type AllocationColumn
} from "@/components/features/transactions/allocation-columns";
import {
    asTransactionId,
    NO_TRANSACTION_ROWS_SELECTED,
    transactionRowOrderFromIds
} from "@/components/features/transactions/table-model";
import type { TransactionRowData } from "@/components/features/transactions/TransactionRow";
import { TransactionTable } from "@/components/features/transactions/TransactionTable";
import { allocationPresenceField } from "@/lib/crdt/allocations";

import {
    contiguousRowWindow,
    createTestTransactionGridController,
    installVirtualGridLayout
} from "./virtual-grid-harness";

const HEADER_HEIGHT = 37;
const ROW_HEIGHT = 57;
const CHECKBOX_COLUMN_WIDTH = 32;
const VIEWPORT_WIDTH = 1_600;
const VIEWPORT_HEIGHT = 900;
const SCROLLER_LEFT = 280;
const SCROLLER_TOP = 100;
const SCROLLER_WIDTH = 896;
const SCROLLER_HEIGHT = 607;
const ONE_ALLOCATION_CONTENT_WIDTH = 1_056;
const AMOUNT_REVEAL_SCROLL_LEFT = ONE_ALLOCATION_CONTENT_WIDTH - SCROLLER_WIDTH;
const PERSON_ID = "person-edge-owner";
const ALLOCATION_COLUMN: AllocationColumn = {
    field: allocationField(PERSON_ID),
    label: "Edge owner %",
    personId: PERSON_ID,
    presenceField: allocationPresenceField(PERSON_ID)
};

function transactions(): readonly TransactionRowData[] {
    return [
        {
            amount: -1_200,
            date: "2026-09-01",
            description: "Edge ownership first row",
            id: "transaction-edge-first"
        },
        {
            amount: -3_150,
            date: "2026-08-31",
            description: "Edge ownership bystander",
            id: "transaction-edge-bystander"
        }
    ];
}

function requiredElement<ElementType extends Element>(
    root: ParentNode,
    selector: string,
    constructor: { new (...arguments_: never[]): ElementType }
): ElementType {
    const element = root.querySelector(selector);
    if (!(element instanceof constructor)) throw new Error(`Expected ${selector}`);
    return element;
}

function containsPoint(rect: DOMRect, x: number, y: number): boolean {
    return x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom;
}

function installHitTestGeometry(grid: HTMLElement): () => void {
    const header = requiredElement(grid, ':scope > [role="row"]', HTMLElement);
    const headerCheckboxCell = requiredElement(
        header,
        '[data-testid="header-checkbox"]',
        HTMLElement
    );
    const headerCheckboxWrapper = requiredElement(
        headerCheckboxCell,
        ':scope > [role="presentation"]',
        HTMLElement
    );
    const rowGroup = requiredElement(grid, ':scope > [role="rowgroup"]', HTMLElement);
    const virtualWrapper = requiredElement(rowGroup, ':scope > [data-index="0"]', HTMLElement);
    const row = requiredElement(virtualWrapper, '[data-testid="transaction-row"]', HTMLElement);
    const checkboxCell = requiredElement(
        row,
        '[role="gridcell"][data-cell="checkbox"]',
        HTMLElement
    );

    expect(header.className).toContain("sticky");
    expect(header.className).toContain("z-10");
    expect(virtualWrapper.style.transform).toBe("translateY(0px)");
    expect(checkboxCell.className).toContain("border-b");
    expect(
        requiredElement(checkboxCell, '[data-slot="checkbox"]', HTMLElement).className
    ).toContain("before:-top-[8px]");

    const headerRect = new DOMRect(0, 0, 1_000, HEADER_HEIGHT);
    const rowRect = new DOMRect(0, HEADER_HEIGHT, 1_000, ROW_HEIGHT);
    const checkboxCellRect = new DOMRect(0, HEADER_HEIGHT, CHECKBOX_COLUMN_WIDTH, ROW_HEIGHT);
    const headerPaddingTop = headerCheckboxCell.classList.contains("py-2") ? 8 : 0;
    const headerCheckboxWrapperRect = new DOMRect(
        0,
        headerPaddingTop,
        CHECKBOX_COLUMN_WIDTH,
        HEADER_HEIGHT
    );

    header.getBoundingClientRect = () => headerRect;
    headerCheckboxCell.getBoundingClientRect = () =>
        new DOMRect(0, 0, CHECKBOX_COLUMN_WIDTH, HEADER_HEIGHT);
    headerCheckboxWrapper.getBoundingClientRect = () => headerCheckboxWrapperRect;
    rowGroup.getBoundingClientRect = () => rowRect;
    virtualWrapper.getBoundingClientRect = () => rowRect;
    row.getBoundingClientRect = () => rowRect;
    checkboxCell.getBoundingClientRect = () => checkboxCellRect;

    const previous = Object.getOwnPropertyDescriptor(document, "elementFromPoint");
    Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: (x: number, y: number): Element | null => {
            if (containsPoint(headerCheckboxWrapperRect, x, y)) return headerCheckboxWrapper;
            if (containsPoint(checkboxCellRect, x, y)) return checkboxCell;
            if (containsPoint(rowRect, x, y)) return virtualWrapper;
            return null;
        }
    });

    return () => {
        if (previous == null) {
            Reflect.deleteProperty(document, "elementFromPoint");
        } else {
            Object.defineProperty(document, "elementFromPoint", previous);
        }
    };
}

function installScrolledViewportHitTestGeometry(grid: HTMLElement) {
    const scroller = grid.parentElement;
    if (!(scroller instanceof HTMLElement)) throw new Error("Expected the transaction scroller");
    const header = requiredElement(grid, ':scope > [role="row"]', HTMLElement);
    const headerCheckboxCell = requiredElement(
        header,
        '[data-testid="header-checkbox"]',
        HTMLElement
    );
    const headerCheckboxWrapper = requiredElement(
        headerCheckboxCell,
        ':scope > [role="presentation"]',
        HTMLElement
    );
    const rowGroup = requiredElement(grid, ':scope > [role="rowgroup"]', HTMLElement);
    const virtualWrapper = requiredElement(rowGroup, ':scope > [data-index="0"]', HTMLElement);
    const row = requiredElement(virtualWrapper, '[data-testid="transaction-row"]', HTMLElement);
    const checkboxCell = requiredElement(
        row,
        '[role="gridcell"][data-cell="checkbox"]',
        HTMLElement
    );
    const checkboxControl = requiredElement(checkboxCell, '[data-slot="checkbox"]', HTMLElement);
    const outsideSurface = document.createElement("div");
    outsideSurface.dataset.testid = "outside-transaction-scroller";
    document.body.append(outsideSurface);

    expect(header.className).toContain("sticky");
    expect(header.className).toContain("z-10");
    expect(header.style.gridTemplateColumns).toContain("minmax(112px,128px)");
    expect(virtualWrapper.style.transform).toBe("translateY(0px)");
    expect(checkboxCell.className).toContain("border-b");

    const viewportRect = new DOMRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
    const scrollerRect = new DOMRect(SCROLLER_LEFT, SCROLLER_TOP, SCROLLER_WIDTH, SCROLLER_HEIGHT);
    const rowTop = SCROLLER_TOP + HEADER_HEIGHT;
    const contentLeft = (): number => SCROLLER_LEFT - scroller.scrollLeft;
    const headerRect = (): DOMRect =>
        new DOMRect(contentLeft(), SCROLLER_TOP, ONE_ALLOCATION_CONTENT_WIDTH, HEADER_HEIGHT);
    const headerCheckboxRect = (): DOMRect =>
        new DOMRect(contentLeft(), SCROLLER_TOP, CHECKBOX_COLUMN_WIDTH, HEADER_HEIGHT);
    const rowRect = (): DOMRect =>
        new DOMRect(contentLeft(), rowTop, ONE_ALLOCATION_CONTENT_WIDTH, ROW_HEIGHT);
    const checkboxCellRect = (): DOMRect =>
        new DOMRect(contentLeft(), rowTop, CHECKBOX_COLUMN_WIDTH, ROW_HEIGHT);
    const checkboxControlRect = (): DOMRect =>
        new DOMRect(contentLeft() + 8, rowTop + (ROW_HEIGHT - 16) / 2, 16, 16);

    scroller.scrollTop = 0;
    scroller.scrollLeft = AMOUNT_REVEAL_SCROLL_LEFT;
    scroller.getBoundingClientRect = () => scrollerRect;
    grid.getBoundingClientRect = () =>
        new DOMRect(contentLeft(), SCROLLER_TOP, ONE_ALLOCATION_CONTENT_WIDTH, SCROLLER_HEIGHT);
    header.getBoundingClientRect = headerRect;
    headerCheckboxCell.getBoundingClientRect = headerCheckboxRect;
    headerCheckboxWrapper.getBoundingClientRect = headerCheckboxRect;
    rowGroup.getBoundingClientRect = rowRect;
    virtualWrapper.getBoundingClientRect = rowRect;
    row.getBoundingClientRect = rowRect;
    checkboxCell.getBoundingClientRect = checkboxCellRect;
    checkboxControl.getBoundingClientRect = checkboxControlRect;

    const previousClientWidth = Object.getOwnPropertyDescriptor(scroller, "clientWidth");
    const previousScrollWidth = Object.getOwnPropertyDescriptor(scroller, "scrollWidth");
    Object.defineProperties(scroller, {
        clientWidth: { configurable: true, value: SCROLLER_WIDTH },
        scrollWidth: { configurable: true, value: ONE_ALLOCATION_CONTENT_WIDTH }
    });

    const previousElementFromPoint = Object.getOwnPropertyDescriptor(document, "elementFromPoint");
    Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: (x: number, y: number): Element | null => {
            if (!containsPoint(viewportRect, x, y)) return null;
            if (!containsPoint(scrollerRect, x, y)) return outsideSurface;
            if (containsPoint(headerCheckboxRect(), x, y)) return headerCheckboxWrapper;
            if (containsPoint(headerRect(), x, y)) return header;
            if (containsPoint(checkboxControlRect(), x, y)) return checkboxControl;
            if (containsPoint(checkboxCellRect(), x, y)) return checkboxCell;
            if (containsPoint(rowRect(), x, y)) return virtualWrapper;
            return scroller;
        }
    });

    return {
        checkboxCell,
        checkboxControl,
        controlCenterPoint: () => {
            const rect = checkboxControl.getBoundingClientRect();
            return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        },
        topEdgePoint: () => {
            const rect = checkboxCell.getBoundingClientRect();
            return { x: rect.left + rect.width / 2, y: rect.top + 2 };
        },
        revealCheckbox: () => {
            scroller.scrollLeft = 0;
            scroller.dispatchEvent(new Event("scroll"));
        },
        restore: () => {
            outsideSurface.remove();
            if (previousClientWidth == null) Reflect.deleteProperty(scroller, "clientWidth");
            else Object.defineProperty(scroller, "clientWidth", previousClientWidth);
            if (previousScrollWidth == null) Reflect.deleteProperty(scroller, "scrollWidth");
            else Object.defineProperty(scroller, "scrollWidth", previousScrollWidth);
            if (previousElementFromPoint == null) {
                Reflect.deleteProperty(document, "elementFromPoint");
            } else {
                Object.defineProperty(document, "elementFromPoint", previousElementFromPoint);
            }
        },
        scroller
    };
}

describe("transaction checkbox hit ownership", () => {
    let restoreVirtualLayout: () => void;

    beforeEach(() => {
        restoreVirtualLayout = installVirtualGridLayout();
    });

    afterEach(() => restoreVirtualLayout());

    it("keeps the first row checkbox top edge outside the sticky header stack", () => {
        const rows = transactions();
        render(
            <TransactionTable
                controller={createTestTransactionGridController(rows)}
                rowWindow={contiguousRowWindow(rows, 0)}
                matchingRowCount={rows.length}
                rowOrder={transactionRowOrderFromIds(rows.map((row) => asTransactionId(row.id)))}
                rowSelection={NO_TRANSACTION_ROWS_SELECTED}
                onRowSelectionChange={() => undefined}
                matchingRowsChange={null}
                onMatchingSetReconciled={() => undefined}
            />
        );

        const grid = screen.getByTestId("transaction-table");
        const restoreHitTest = installHitTestGeometry(grid);
        try {
            const firstRow = screen.getAllByTestId("transaction-row")[0];
            if (firstRow == null) throw new Error("Expected the first virtual row");
            const checkboxCell = requiredElement(
                firstRow,
                '[role="gridcell"][data-cell="checkbox"]',
                HTMLElement
            );
            const rect = checkboxCell.getBoundingClientRect();
            const target = document.elementFromPoint(rect.left + rect.width / 2, rect.top + 2);

            expect(target).toBe(checkboxCell);
            expect(target?.closest("[data-cell]")).toBe(checkboxCell);
        } finally {
            restoreHitTest();
        }
    });

    it("reveals checkbox cell and control probes after another column scrolled the grid", () => {
        const rows = transactions();
        render(
            <TransactionTable
                allocationColumns={[ALLOCATION_COLUMN]}
                controller={createTestTransactionGridController(rows)}
                rowWindow={contiguousRowWindow(rows, 0)}
                matchingRowCount={rows.length}
                rowOrder={transactionRowOrderFromIds(rows.map((row) => asTransactionId(row.id)))}
                rowSelection={NO_TRANSACTION_ROWS_SELECTED}
                onRowSelectionChange={() => undefined}
                matchingRowsChange={null}
                onMatchingSetReconciled={() => undefined}
            />
        );

        const geometry = installScrolledViewportHitTestGeometry(
            screen.getByTestId("transaction-table")
        );
        try {
            expect(geometry.scroller.scrollTop).toBe(0);
            expect(geometry.scroller.scrollLeft).toBe(AMOUNT_REVEAL_SCROLL_LEFT);
            expect(geometry.scroller.scrollWidth).toBeGreaterThan(geometry.scroller.clientWidth);

            for (const clippedPoint of [geometry.topEdgePoint(), geometry.controlCenterPoint()]) {
                expect(clippedPoint.x).toBeLessThan(geometry.scroller.getBoundingClientRect().left);
                const clippedTarget = document.elementFromPoint(clippedPoint.x, clippedPoint.y);
                expect(clippedTarget?.tagName).toBe("DIV");
                expect(clippedTarget?.closest("[data-cell]")).toBeNull();
            }

            geometry.revealCheckbox();

            const scrollerRect = geometry.scroller.getBoundingClientRect();
            const visibleTopEdgePoint = geometry.topEdgePoint();
            expect(visibleTopEdgePoint.x).toBeGreaterThanOrEqual(scrollerRect.left);
            expect(visibleTopEdgePoint.x).toBeLessThan(scrollerRect.right);
            const visibleTopEdgeTarget = document.elementFromPoint(
                visibleTopEdgePoint.x,
                visibleTopEdgePoint.y
            );
            expect(visibleTopEdgeTarget).toBe(geometry.checkboxCell);
            expect(visibleTopEdgeTarget?.closest("[data-cell]")).toBe(geometry.checkboxCell);

            const visibleControlPoint = geometry.controlCenterPoint();
            expect(visibleControlPoint.x).toBeGreaterThanOrEqual(scrollerRect.left);
            expect(visibleControlPoint.x).toBeLessThan(scrollerRect.right);
            const visibleControlTarget = document.elementFromPoint(
                visibleControlPoint.x,
                visibleControlPoint.y
            );
            expect(visibleControlTarget).toBe(geometry.checkboxControl);
            expect(visibleControlTarget?.closest("[data-cell]")).toBe(geometry.checkboxCell);
        } finally {
            geometry.restore();
        }
    });
});
