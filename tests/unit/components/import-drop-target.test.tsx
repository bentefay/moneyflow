import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
