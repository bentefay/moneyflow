"use client";

import { usePathname } from "next/navigation";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";

export interface PendingImportFileTransfer {
    readonly file: File;
    readonly id: string;
    readonly sourcePath: string;
}

interface ImportFileTransferContextValue {
    readonly consumeImportFile: (id: string) => void;
    readonly pendingImportFile: PendingImportFileTransfer | null;
    readonly stageImportFile: (file: File) => void;
}

export interface ImportFileTransferProviderProps {
    readonly children: React.ReactNode;
    readonly scopeKey: string | null;
}

const ImportFileTransferContext = createContext<ImportFileTransferContextValue | null>(null);

/**
 * Keeps one browser File in memory across an app-router transition.
 */
export function ImportFileTransferProvider({
    children,
    scopeKey
}: ImportFileTransferProviderProps) {
    const pathname = usePathname();
    const priorScopeKeyRef = useRef(scopeKey);
    const [pendingImportFile, setPendingImportFile] = useState<PendingImportFileTransfer | null>(
        null
    );

    const stageImportFile = useCallback(
        (file: File) => {
            setPendingImportFile({
                file,
                id: crypto.randomUUID(),
                sourcePath: pathname
            });
        },
        [pathname]
    );

    const consumeImportFile = useCallback((id: string) => {
        setPendingImportFile((current) => (current?.id === id ? null : current));
    }, []);

    useEffect(() => {
        if (priorScopeKeyRef.current === scopeKey) return;
        priorScopeKeyRef.current = scopeKey;
        setPendingImportFile(null);
    }, [scopeKey]);

    useEffect(() => {
        let isCurrentRoute = true;
        queueMicrotask(() => {
            if (!isCurrentRoute) return;
            setPendingImportFile((current) => {
                if (
                    current == null ||
                    pathname === current.sourcePath ||
                    pathname === "/imports/new"
                ) {
                    return current;
                }
                return null;
            });
        });
        return () => {
            isCurrentRoute = false;
        };
    }, [pathname]);

    const value = useMemo(
        () => ({ consumeImportFile, pendingImportFile, stageImportFile }),
        [consumeImportFile, pendingImportFile, stageImportFile]
    );

    return (
        <ImportFileTransferContext.Provider value={value}>
            {children}
        </ImportFileTransferContext.Provider>
    );
}

export function useImportFileTransfer(): ImportFileTransferContextValue {
    const context = useContext(ImportFileTransferContext);
    if (context == null) {
        throw new Error("useImportFileTransfer must be used inside ImportFileTransferProvider");
    }
    return context;
}
