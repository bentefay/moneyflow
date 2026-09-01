import { describe, expect, it, vi } from "vitest";

import { finishTransactionGridPopupEditing } from "@/components/features/transactions/cells/editor-lifecycle";

describe("transaction grid popup editor lifecycle", () => {
    it("returns popup ownership before finishing the retained editor", () => {
        const events: string[] = [];
        const onPopupOpenChange = vi.fn((popup: "listbox", open: boolean) => {
            events.push(`${popup}-${open ? "open" : "closed"}`);
        });
        const onEditingChange = vi.fn((editing: boolean) => {
            events.push(editing ? "editing-open" : "editing-closed");
        });

        finishTransactionGridPopupEditing("listbox", onPopupOpenChange, onEditingChange);

        expect(events).toEqual(["listbox-closed", "editing-closed"]);
    });
});
