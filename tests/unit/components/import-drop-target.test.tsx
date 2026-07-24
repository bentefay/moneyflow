import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ImportDropTarget } from "@/components/features/import/ImportDropTarget";
import {
    ImportFileTransferProvider,
    useImportFileTransfer
} from "@/components/features/import/ImportFileTransferProvider";

const CSV_CONTENT = "Date,Description,Amount\n2026-07-25,Coffee,-4.25";
const pathname = vi.hoisted(() => ({ current: "/transactions" }));

vi.mock("next/navigation", () => ({
    usePathname: () => pathname.current
}));

afterEach(() => {
    vi.restoreAllMocks();
});

function fileTransfer(files: readonly File[]) {
    return {
        dropEffect: "none",
        files,
        items: files.map((file) => ({ kind: "file", type: file.type })),
        types: ["Files"]
    };
}

function TransferHarness() {
    const { consumeImportFile, pendingImportFile, stageImportFile } = useImportFileTransfer();
    return (
        <>
            <button
                type="button"
                onClick={() =>
                    stageImportFile(new File([CSV_CONTENT], "in-memory.csv", { type: "text/csv" }))
                }
            >
                Stage
            </button>
            <button
                type="button"
                onClick={() => {
                    if (pendingImportFile) consumeImportFile(pendingImportFile.id);
                }}
            >
                Consume
            </button>
            <output aria-label="Pending file">
                {pendingImportFile == null
                    ? "none"
                    : `${pendingImportFile.file.name}:${pendingImportFile.sourcePath}`}
            </output>
        </>
    );
}

describe("ImportDropTarget", () => {
    it("keeps one stable overlay through nested enter/leaves and clears on outside end", () => {
        render(
            <ImportDropTarget
                ariaLabel="Import transactions"
                onFileAccepted={vi.fn()}
                testId="test-import-target"
            >
                <button type="button">Child action</button>
            </ImportDropTarget>
        );

        const target = screen.getByTestId("test-import-target");
        const child = screen.getByRole("button", { name: "Child action" });
        const transfer = fileTransfer([
            new File([CSV_CONTENT], "statement.csv", { type: "text/csv" })
        ]);

        fireEvent.dragEnter(target, { dataTransfer: transfer });
        expect(screen.getByTestId("import-drop-overlay")).toBeVisible();
        fireEvent.dragOver(target, { dataTransfer: transfer });
        expect(transfer.dropEffect).toBe("copy");
        fireEvent.dragEnter(child, { dataTransfer: transfer });
        fireEvent.dragLeave(child, { dataTransfer: transfer });
        expect(screen.getByTestId("import-drop-overlay")).toBeVisible();
        fireEvent.dragLeave(target, { dataTransfer: transfer });
        expect(screen.queryByTestId("import-drop-overlay")).not.toBeInTheDocument();

        fireEvent.dragEnter(target, { dataTransfer: transfer });
        fireEvent.dragEnd(window, { dataTransfer: transfer });
        expect(screen.queryByTestId("import-drop-overlay")).not.toBeInTheDocument();

        const multipleTransfer = fileTransfer([
            new File([CSV_CONTENT], "one.csv", { type: "text/csv" }),
            new File([CSV_CONTENT], "two.csv", { type: "text/csv" })
        ]);
        fireEvent.dragOver(target, { dataTransfer: multipleTransfer });
        expect(multipleTransfer.dropEffect).toBe("none");
    });

    it("reports invalid drops accessibly and restores the prior child focus", async () => {
        const onFileAccepted = vi.fn();
        render(
            <ImportDropTarget
                ariaLabel="Import transactions"
                onFileAccepted={onFileAccepted}
                testId="test-import-target"
            >
                <button type="button">Child action</button>
            </ImportDropTarget>
        );

        const target = screen.getByTestId("test-import-target");
        const child = screen.getByRole("button", { name: "Child action" });
        child.focus();
        fireEvent.dragEnter(target, {
            dataTransfer: fileTransfer([new File([CSV_CONTENT], "one.csv", { type: "text/csv" })])
        });
        fireEvent.drop(target, {
            dataTransfer: fileTransfer([
                new File([CSV_CONTENT], "one.csv", { type: "text/csv" }),
                new File([CSV_CONTENT], "two.csv", { type: "text/csv" })
            ])
        });

        expect(await screen.findByRole("alert")).toHaveTextContent(/one file at a time/i);
        await waitFor(() => expect(child).toHaveFocus());
        expect(onFileAccepted).not.toHaveBeenCalled();
        expect(screen.queryByTestId("import-drop-overlay")).not.toBeInTheDocument();
    });

    it("accepts the exact original File and does not interfere with child interaction", async () => {
        const onFileAccepted = vi.fn();
        const onChildClick = vi.fn();
        const file = new File([CSV_CONTENT], "statement.csv", { type: "text/csv" });
        render(
            <ImportDropTarget
                ariaLabel="Import transactions"
                onFileAccepted={onFileAccepted}
                testId="test-import-target"
            >
                <button type="button" onClick={onChildClick}>
                    Child action
                </button>
            </ImportDropTarget>
        );

        fireEvent.click(screen.getByRole("button", { name: "Child action" }));
        expect(onChildClick).toHaveBeenCalledOnce();

        const target = screen.getByTestId("test-import-target");
        fireEvent.drop(target, { dataTransfer: fileTransfer([file]) });
        await waitFor(() => expect(onFileAccepted).toHaveBeenCalledWith(file));
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("uses an explicit high-contrast alert pair in light and dark themes", async () => {
        render(
            <ImportDropTarget
                ariaLabel="Import transactions"
                onFileAccepted={vi.fn()}
                testId="test-import-target"
            >
                <button type="button">Child action</button>
            </ImportDropTarget>
        );

        fireEvent.drop(screen.getByTestId("test-import-target"), {
            dataTransfer: fileTransfer([
                new File([CSV_CONTENT], "one.csv", { type: "text/csv" }),
                new File([CSV_CONTENT], "two.csv", { type: "text/csv" })
            ])
        });

        const alert = await screen.findByRole("alert");
        expect(alert).toHaveClass("bg-red-900", "text-white", "dark:bg-red-950", "dark:text-white");
    });

    it("positions guidance and feedback in the zoomed target viewport intersection", async () => {
        const innerWidth = vi.spyOn(window, "innerWidth", "get").mockReturnValue(390);
        const innerHeight = vi.spyOn(window, "innerHeight", "get").mockReturnValue(844);
        render(
            <ImportDropTarget
                ariaLabel="Import transactions"
                onFileAccepted={vi.fn()}
                testId="test-import-target"
            >
                <button type="button">Child action</button>
            </ImportDropTarget>
        );

        const target = screen.getByTestId("test-import-target");
        const targetBounds = vi
            .spyOn(target, "getBoundingClientRect")
            .mockReturnValue(new DOMRect(0, 112, 390, 1576));
        vi.spyOn(target, "offsetWidth", "get").mockReturnValue(195);
        vi.spyOn(target, "offsetHeight", "get").mockReturnValue(788);
        const transfer = fileTransfer([
            new File([CSV_CONTENT], "statement.csv", { type: "text/csv" })
        ]);

        fireEvent.dragEnter(target, { dataTransfer: transfer });
        const guidance = await screen.findByTestId("import-drop-guidance");
        expect(guidance.style.left).toBe("97.5px");
        expect(guidance.style.top).toBe("183px");
        expect(guidance.style.width).toBe("179px");
        expect(guidance.style.maxHeight).toBe("350px");

        fireEvent.drop(target, {
            dataTransfer: fileTransfer([
                new File([CSV_CONTENT], "one.csv", { type: "text/csv" }),
                new File([CSV_CONTENT], "two.csv", { type: "text/csv" })
            ])
        });
        const alert = await screen.findByRole("alert");
        expect(alert.style.left).toBe("97.5px");
        expect(alert.style.top).toBe("183px");
        expect(alert.style.width).toBe("179px");
        expect(alert.style.maxHeight).toBe("350px");

        const scrollIntoView = vi.fn();
        Object.defineProperty(target, "scrollIntoView", {
            configurable: true,
            value: scrollIntoView
        });
        targetBounds.mockReturnValue(new DOMRect(48, 744, 294, 400));
        fireEvent.dragEnter(target, { dataTransfer: transfer });
        expect(scrollIntoView).toHaveBeenCalledWith({
            block: "center",
            inline: "nearest"
        });

        innerWidth.mockRestore();
        innerHeight.mockRestore();
    });

    it("clears on an authoritative outer leave after an entered child unmounts", () => {
        const targetView = (showChild: boolean) => (
            <ImportDropTarget
                ariaLabel="Import transactions"
                onFileAccepted={vi.fn()}
                testId="test-import-target"
            >
                {showChild && <button type="button">Virtual child</button>}
            </ImportDropTarget>
        );
        const view = render(targetView(true));
        const target = screen.getByTestId("test-import-target");
        const transfer = fileTransfer([
            new File([CSV_CONTENT], "statement.csv", { type: "text/csv" })
        ]);

        fireEvent.dragEnter(target, { dataTransfer: transfer });
        fireEvent.dragEnter(screen.getByRole("button", { name: "Virtual child" }), {
            dataTransfer: transfer
        });
        expect(screen.getByTestId("import-drop-overlay")).toBeVisible();

        view.rerender(targetView(false));
        fireEvent.dragLeave(target, { dataTransfer: transfer, relatedTarget: document.body });

        expect(screen.queryByTestId("import-drop-overlay")).not.toBeInTheDocument();
    });
});

describe("ImportFileTransferProvider", () => {
    it("keeps the original File only in memory for one target take", () => {
        pathname.current = "/transactions";
        render(
            <ImportFileTransferProvider scopeKey="vault-one">
                <TransferHarness />
            </ImportFileTransferProvider>
        );

        fireEvent.click(screen.getByRole("button", { name: "Stage" }));
        expect(screen.getByRole("status", { name: "Pending file" })).toHaveTextContent(
            "in-memory.csv:/transactions"
        );
        expect(sessionStorage).toHaveLength(0);
        expect(localStorage).toHaveLength(0);

        fireEvent.click(screen.getByRole("button", { name: "Consume" }));
        expect(screen.getByRole("status", { name: "Pending file" })).toHaveTextContent("none");
        fireEvent.click(screen.getByRole("button", { name: "Consume" }));
        expect(screen.getByRole("status", { name: "Pending file" })).toHaveTextContent("none");
    });

    it("clears an untaken File on unrelated route replacement and vault switch", async () => {
        pathname.current = "/transactions";
        const view = render(
            <ImportFileTransferProvider scopeKey="vault-one">
                <TransferHarness />
            </ImportFileTransferProvider>
        );
        fireEvent.click(screen.getByRole("button", { name: "Stage" }));

        pathname.current = "/imports/new";
        view.rerender(
            <ImportFileTransferProvider scopeKey="vault-one">
                <TransferHarness />
            </ImportFileTransferProvider>
        );
        expect(screen.getByRole("status", { name: "Pending file" })).toHaveTextContent(
            "in-memory.csv"
        );

        pathname.current = "/settings";
        view.rerender(
            <ImportFileTransferProvider scopeKey="vault-one">
                <TransferHarness />
            </ImportFileTransferProvider>
        );
        await waitFor(() =>
            expect(screen.getByRole("status", { name: "Pending file" })).toHaveTextContent("none")
        );

        pathname.current = "/transactions";
        view.rerender(
            <ImportFileTransferProvider scopeKey="vault-one">
                <TransferHarness />
            </ImportFileTransferProvider>
        );
        fireEvent.click(screen.getByRole("button", { name: "Stage" }));
        view.rerender(
            <ImportFileTransferProvider scopeKey="vault-two">
                <TransferHarness />
            </ImportFileTransferProvider>
        );
        await waitFor(() =>
            expect(screen.getByRole("status", { name: "Pending file" })).toHaveTextContent("none")
        );
    });
});
