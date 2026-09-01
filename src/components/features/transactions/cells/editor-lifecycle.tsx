"use client";

import {
    createContext,
    useCallback,
    useContext,
    useLayoutEffect,
    useState,
    type RefCallback
} from "react";

export type TransactionGridEditorCommitResult =
    | { readonly ok: false; readonly status: "rejected" }
    | { readonly ok: true; readonly status: "unchanged" | "changed" };

export const TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS: TransactionGridEditorCommitResult = {
    ok: true,
    status: "changed"
};
export const TRANSACTION_GRID_EDITOR_COMMIT_UNCHANGED: TransactionGridEditorCommitResult = {
    ok: true,
    status: "unchanged"
};
export const TRANSACTION_GRID_EDITOR_COMMIT_FAILURE: TransactionGridEditorCommitResult = {
    ok: false,
    status: "rejected"
};

export type TransactionGridAutomationEditorContext =
    | {
          readonly field: "descriptionAlias";
          readonly originalText: string;
          readonly draftText: string;
      }
    | {
          readonly field: "tags";
          readonly originalTagIds: readonly string[];
          readonly draftTagIds: readonly string[];
      }
    | {
          readonly field: "allocation";
          readonly originalAllocations: Readonly<Record<string, number>>;
          readonly draft: { readonly personId: string; readonly text: string };
      };

/** Returns popup ownership before finishing the editor that retained it. */
export function finishTransactionGridPopupEditing<Popup extends string>(
    popup: Popup,
    onPopupOpenChange: ((popup: Popup, open: boolean) => void) | undefined,
    onEditingChange: ((editing: boolean) => void) | undefined
): void {
    onPopupOpenChange?.(popup, false);
    onEditingChange?.(false);
}

interface TransactionGridEditorLifecycleBase {
    readonly automation?: TransactionGridAutomationEditorContext;
    readonly cancel: () => void;
    readonly commit: () => TransactionGridEditorCommitResult;
}

/** Synchronous editor boundary used before the controller is allowed to move selection or focus. */
export type TransactionGridEditorLifecycle =
    | (TransactionGridEditorLifecycleBase & {
          /** Clears the synchronous result slot immediately before focus invokes native blur. */
          readonly beginExternalExitValidation: () => void;
          /** Native blur validates external focus exits before the wrapper classifies ownership. */
          readonly externalExitValidation: "blur";
          /** Returns the result written by that exact native blur without validating again. */
          readonly readExternalExitValidation: () => TransactionGridEditorCommitResult | null;
      })
    | (TransactionGridEditorLifecycleBase & {
          /** The wrapper must invoke commit because native blur does not own external validation. */
          readonly externalExitValidation: "controller";
      });

type RegisterTransactionGridEditorLifecycle = (
    lifecycle: TransactionGridEditorLifecycle
) => () => void;

const TransactionGridEditorLifecycleContext =
    createContext<RegisterTransactionGridEditorLifecycle | null>(null);
const TransactionGridNativeBlurCommitContext = createContext<
    | ((result: TransactionGridEditorCommitResult, relatedTarget: EventTarget | null) => boolean)
    | null
>(null);
const TransactionGridEditorPortalRegistrationContext =
    createContext<RefCallback<HTMLElement> | null>(null);
const TransactionGridEditorPortalOwnershipContext = createContext<
    ((target: EventTarget | null) => boolean) | null
>(null);
const TransactionGridEditorPopupCancellationContext = createContext<(() => boolean) | null>(null);

const rejectTransactionGridPopupCancellation = (): boolean => false;

export interface TransactionGridEditorLifecycleProviderProps {
    readonly children: React.ReactNode;
    readonly cancelPopupEditing?: () => boolean;
    readonly isPortalTargetOwned: (target: EventTarget | null) => boolean;
    readonly publishNativeBlurCommit?:
        | ((
              result: TransactionGridEditorCommitResult,
              relatedTarget: EventTarget | null
          ) => boolean)
        | null;
    readonly register: RegisterTransactionGridEditorLifecycle;
    readonly registerPortal: RefCallback<HTMLElement>;
}

export function TransactionGridEditorLifecycleProvider({
    children,
    cancelPopupEditing = rejectTransactionGridPopupCancellation,
    isPortalTargetOwned,
    publishNativeBlurCommit = null,
    register,
    registerPortal
}: TransactionGridEditorLifecycleProviderProps) {
    return (
        <TransactionGridEditorLifecycleContext.Provider value={register}>
            <TransactionGridNativeBlurCommitContext.Provider value={publishNativeBlurCommit}>
                <TransactionGridEditorPortalRegistrationContext.Provider value={registerPortal}>
                    <TransactionGridEditorPortalOwnershipContext.Provider
                        value={isPortalTargetOwned}
                    >
                        <TransactionGridEditorPopupCancellationContext.Provider
                            value={cancelPopupEditing}
                        >
                            {children}
                        </TransactionGridEditorPopupCancellationContext.Provider>
                    </TransactionGridEditorPortalOwnershipContext.Provider>
                </TransactionGridEditorPortalRegistrationContext.Provider>
            </TransactionGridNativeBlurCommitContext.Provider>
        </TransactionGridEditorLifecycleContext.Provider>
    );
}

/** Registers the current editor's atomic validation, commit, and cancellation adapter. */
export function useTransactionGridEditorLifecycle(lifecycle: TransactionGridEditorLifecycle): void {
    const register = useContext(TransactionGridEditorLifecycleContext);
    useLayoutEffect(
        () => (register == null ? undefined : register(lifecycle)),
        [lifecycle, register]
    );
}

/** Publishes the result produced by an editor's own native blur before controller ownership ends. */
export function useTransactionGridNativeBlurCommit():
    | ((result: TransactionGridEditorCommitResult, relatedTarget: EventTarget | null) => boolean)
    | null {
    return useContext(TransactionGridNativeBlurCommitContext);
}

/** Registers one exact portaled editor root with the controller that owns this editor. */
export function useTransactionGridEditorPortalRef<
    ElementType extends HTMLElement
>(): RefCallback<ElementType> {
    const register = useContext(TransactionGridEditorPortalRegistrationContext);
    return useCallback((element: ElementType | null) => register?.(element), [register]);
}

/** Tests whether a target belongs to an exact live portal root registered by this editor. */
export function useTransactionGridEditorPortalOwnership():
    | ((target: EventTarget | null) => boolean)
    | null {
    return useContext(TransactionGridEditorPortalOwnershipContext);
}

/** Cancels the complete controller-owned popup editor from its local widget Escape boundary. */
export function useTransactionGridEditorPopupCancellation(): (() => boolean) | null {
    return useContext(TransactionGridEditorPopupCancellationContext);
}

interface StartOpenState {
    readonly open: boolean;
    readonly startOpen: boolean;
}

/** Opens a mounted popup when its controller fulfills a pending editor activation. */
export function useTransactionGridStartOpen(
    startOpen: boolean
): readonly [boolean, (open: boolean) => void] {
    const [state, setState] = useState<StartOpenState>({ open: startOpen, startOpen });
    if (state.startOpen !== startOpen) {
        setState({ open: startOpen || state.open, startOpen });
    }
    const setOpen = useCallback((open: boolean) => {
        setState((current) => ({ ...current, open }));
    }, []);
    return [state.open, setOpen];
}
