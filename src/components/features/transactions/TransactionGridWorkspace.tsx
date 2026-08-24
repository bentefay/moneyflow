"use client";

import { useCreateAtom } from "@tanstack/react-store";
import type { CellSelectionState } from "@tanstack/table-core";
import { createContext, useContext, useState } from "react";

import { cn } from "@/lib/utils";

import {
    createTransactionGridWorkspaceController,
    type TransactionGridWorkspaceController
} from "./hooks/useTransactionGridController";

const TransactionGridWorkspaceContext = createContext<TransactionGridWorkspaceController | null>(
    null
);

export interface TransactionGridWorkspaceProps {
    /** Grid subtree sharing one interaction state, projection authority and cell-selection atom. */
    readonly children: React.ReactNode;
    /** Optional classes applied to the layout-neutral workspace boundary. */
    readonly className?: string;
}

/** Owns the sole runtime transaction-grid controller and external TanStack cell-selection atom. */
export function TransactionGridWorkspace({ children, className }: TransactionGridWorkspaceProps) {
    const cellSelectionAtom = useCreateAtom<CellSelectionState>([]);
    const [controller] = useState(() =>
        createTransactionGridWorkspaceController(cellSelectionAtom)
    );

    return (
        <TransactionGridWorkspaceContext.Provider value={controller}>
            <div className={cn("contents", className)}>{children}</div>
        </TransactionGridWorkspaceContext.Provider>
    );
}

/** Returns the controller owned by the nearest {@link TransactionGridWorkspace}. */
export function useTransactionGridWorkspace(): TransactionGridWorkspaceController {
    const controller = useContext(TransactionGridWorkspaceContext);
    if (controller == null) {
        throw new Error("transaction grid consumers must be inside TransactionGridWorkspace");
    }
    return controller;
}
