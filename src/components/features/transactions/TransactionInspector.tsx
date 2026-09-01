"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type { TransactionGridWorkspaceController } from "./hooks/useTransactionGridController";
import {
    asTransactionId,
    type TransactionId,
    type TransactionInspectorBindingRegistration
} from "./table-model";
import {
    TransactionInspectorAutomation,
    type TransactionInspectorAutomationContext
} from "./TransactionInspectorAutomation";

const NOTES_BINDING = { action: "notes", kind: "action" } as const;
const CLOSE_BINDING = { action: "close", kind: "action" } as const;
const WIDE_INSPECTOR_MEDIA_QUERY = "(min-width: 80rem)";

type InspectorResponsiveMode = "narrow" | "wide";

interface PendingInspectorScrollRestoration {
    readonly acceptsUserScrollReplacement: boolean;
    readonly frame: number;
    readonly mode: InspectorResponsiveMode;
    readonly root: HTMLElement;
}

interface SuppressedInspectorScroll {
    readonly mode: InspectorResponsiveMode;
    readonly root: HTMLElement;
    readonly scrollTop: number;
}

function inspectorResponsiveMode(mediaQuery: MediaQueryList): InspectorResponsiveMode {
    return mediaQuery.matches ? "wide" : "narrow";
}

function maximumScrollTop(element: HTMLElement): number {
    return Math.max(0, element.scrollHeight - element.clientHeight);
}

/** The stable transaction identity and values rendered by the inspector. */
export interface TransactionInspectorTransaction {
    readonly id: string;
    readonly description: string;
    readonly notes: string;
    readonly automation?: TransactionInspectorAutomationContext;
}

export interface TransactionInspectorProps {
    /** The workspace controller that owns inspector focus and active-row identity. */
    readonly controller: TransactionGridWorkspaceController;
    /** Whether the persistent inspector subtree is exposed to layout and accessibility. */
    readonly open: boolean;
    /** The canonical active transaction, or `null` before the first grid focus. */
    readonly transaction: TransactionInspectorTransaction | null;
    /** Applies each Notes input event immediately at the transaction mutation boundary. */
    readonly onNotesChange: (transactionId: TransactionId, notes: string) => void;
    /** Persists an inside-the-inspector close after the controller restores grid focus. */
    readonly onRequestClose: () => void;
    /** Optional classes applied to the stable complementary landmark. */
    readonly className?: string;
}

/** Persistent, nonmodal details surface for the canonical active transaction. */
export function TransactionInspector({
    className,
    controller,
    onNotesChange,
    onRequestClose,
    open,
    transaction
}: TransactionInspectorProps) {
    const transactionOwner = transaction == null ? null : asTransactionId(transaction.id);
    const inspectorRootRef = useRef<HTMLElement | null>(null);
    const inspectorOpenRef = useRef(open);
    const inspectorMediaQueryRef = useRef<MediaQueryList | null>(null);
    const inspectorResponsiveModeRef = useRef<InspectorResponsiveMode>("narrow");
    const desiredScrollTopRef = useRef(0);
    const maximumScrollTopRef = useRef(0);
    const restoreScrollFrameRef = useRef<PendingInspectorScrollRestoration | null>(null);
    const scheduleScrollRestorationRef = useRef<
        ((acceptsUserScrollReplacement?: boolean) => void) | null
    >(null);
    const suppressedScrollRef = useRef<SuppressedInspectorScroll | null>(null);
    const notesRegistration = useMemo<TransactionInspectorBindingRegistration | null>(
        () => (transactionOwner == null ? null : { binding: NOTES_BINDING, transactionOwner }),
        [transactionOwner]
    );
    const closeRegistration = useMemo<TransactionInspectorBindingRegistration | null>(
        () => (transactionOwner == null ? null : { binding: CLOSE_BINDING, transactionOwner }),
        [transactionOwner]
    );
    const registerRoot = useCallback(
        (element: HTMLElement | null) => {
            if (element == null) return;
            inspectorRootRef.current = element;
            const unregister = controller.registerInspectorRoot(element);
            return () => {
                unregister();
                if (inspectorRootRef.current === element) inspectorRootRef.current = null;
            };
        },
        [controller]
    );
    const registerHeading = useCallback(
        (element: HTMLHeadingElement | null) => {
            if (element == null) return;
            return controller.registerInspectorHeading(element);
        },
        [controller]
    );
    const registerNotes = useCallback(
        (element: HTMLTextAreaElement | null) => {
            if (element == null || notesRegistration == null) return;
            return controller.registerInspectorControl(notesRegistration, element);
        },
        [controller, notesRegistration]
    );
    const registerClose = useCallback(
        (element: HTMLButtonElement | null) => {
            if (element == null || closeRegistration == null) return;
            return controller.registerInspectorControl(closeRegistration, element);
        },
        [closeRegistration, controller]
    );
    const handleFocusCapture = useCallback(
        (event: React.FocusEvent<HTMLElement>) => {
            controller.enterInspector(event.target);
        },
        [controller]
    );
    const handleBlurCapture = useCallback(
        (event: React.FocusEvent<HTMLElement>) => {
            controller.handleInspectorFocusOut(
                event.relatedTarget,
                event.currentTarget.ownerDocument
            );
        },
        [controller]
    );
    const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
        const inspector = event.currentTarget;
        const mediaQuery = inspectorMediaQueryRef.current;
        if (!inspectorOpenRef.current || mediaQuery == null) return;
        const mode = inspectorResponsiveMode(mediaQuery);
        if (mode !== inspectorResponsiveModeRef.current) return;
        const pending = restoreScrollFrameRef.current;
        if (pending != null) {
            if (
                pending.root !== inspector ||
                pending.mode !== mode ||
                !pending.acceptsUserScrollReplacement
            ) {
                return;
            }
            const maximum = maximumScrollTop(inspector);
            const normalizedScrollTop = Math.min(Math.max(0, inspector.scrollTop), maximum);
            const expectedScrollTop = Math.min(desiredScrollTopRef.current, maximum);
            maximumScrollTopRef.current = maximum;
            if (normalizedScrollTop === expectedScrollTop) return;
            window.cancelAnimationFrame(pending.frame);
            restoreScrollFrameRef.current = null;
            suppressedScrollRef.current = null;
            desiredScrollTopRef.current = normalizedScrollTop;
            return;
        }
        const suppressed = suppressedScrollRef.current;
        if (suppressed != null) {
            suppressedScrollRef.current = null;
            if (
                suppressed.root === inspector &&
                suppressed.mode === mode &&
                suppressed.scrollTop === inspector.scrollTop
            ) {
                return;
            }
        }
        const maximum = maximumScrollTop(inspector);
        const previousMaximum = maximumScrollTopRef.current;
        maximumScrollTopRef.current = maximum;
        if (
            maximum === 0 ||
            (maximum !== previousMaximum &&
                inspector.scrollTop === Math.min(desiredScrollTopRef.current, maximum))
        ) {
            scheduleScrollRestorationRef.current?.();
            return;
        }
        desiredScrollTopRef.current = inspector.scrollTop;
    }, []);
    useEffect(() => {
        const wasOpen = inspectorOpenRef.current;
        inspectorOpenRef.current = open;
        if (open && !wasOpen) scheduleScrollRestorationRef.current?.(false);
    }, [open]);
    useEffect(() => {
        if (typeof window.matchMedia !== "function") return;
        const mediaQuery = window.matchMedia(WIDE_INSPECTOR_MEDIA_QUERY);
        inspectorMediaQueryRef.current = mediaQuery;
        inspectorResponsiveModeRef.current = inspectorResponsiveMode(mediaQuery);

        const cancelPendingRestoration = (): void => {
            suppressedScrollRef.current = null;
            const pending = restoreScrollFrameRef.current;
            if (pending == null) return;
            window.cancelAnimationFrame(pending.frame);
            restoreScrollFrameRef.current = null;
        };
        const scheduleScrollRestoration = (acceptsUserScrollReplacement = true): void => {
            cancelPendingRestoration();
            const mode = inspectorResponsiveMode(mediaQuery);
            const root = inspectorRootRef.current;
            if (!inspectorOpenRef.current || root == null || !root.isConnected) return;

            const frame = window.requestAnimationFrame(() => {
                const pending = restoreScrollFrameRef.current;
                if (pending?.frame !== frame) return;
                restoreScrollFrameRef.current = null;
                const currentRoot = inspectorRootRef.current;
                if (
                    !inspectorOpenRef.current ||
                    currentRoot !== pending.root ||
                    !currentRoot.isConnected ||
                    inspectorResponsiveMode(mediaQuery) !== pending.mode
                ) {
                    return;
                }
                const maximum = maximumScrollTop(currentRoot);
                const appliedScrollTop = Math.min(desiredScrollTopRef.current, maximum);
                maximumScrollTopRef.current = maximum;
                currentRoot.scrollTop = appliedScrollTop;
                suppressedScrollRef.current = {
                    mode: pending.mode,
                    root: currentRoot,
                    scrollTop: appliedScrollTop
                };
            });
            restoreScrollFrameRef.current = {
                acceptsUserScrollReplacement,
                frame,
                mode,
                root
            };
        };
        const handleResponsiveChange = (): void => {
            inspectorResponsiveModeRef.current = inspectorResponsiveMode(mediaQuery);
            scheduleScrollRestoration(false);
        };

        scheduleScrollRestorationRef.current = scheduleScrollRestoration;
        mediaQuery.addEventListener("change", handleResponsiveChange);
        return () => {
            mediaQuery.removeEventListener("change", handleResponsiveChange);
            cancelPendingRestoration();
            if (scheduleScrollRestorationRef.current === scheduleScrollRestoration) {
                scheduleScrollRestorationRef.current = null;
            }
            if (inspectorMediaQueryRef.current === mediaQuery) {
                inspectorMediaQueryRef.current = null;
            }
        };
    }, []);
    useEffect(() => {
        const root = inspectorRootRef.current;
        if (root == null) return;
        const scheduleScrollRestoration = (): void => scheduleScrollRestorationRef.current?.();
        const resizeObserver =
            typeof ResizeObserver === "function"
                ? new ResizeObserver(scheduleScrollRestoration)
                : null;
        const observeCurrentLayout = (): void => {
            resizeObserver?.observe(root);
            for (const descendant of root.querySelectorAll<HTMLElement>("*")) {
                resizeObserver?.observe(descendant);
            }
        };
        const mutationObserver = new MutationObserver(() => {
            observeCurrentLayout();
            scheduleScrollRestoration();
        });

        observeCurrentLayout();
        mutationObserver.observe(root, { childList: true, subtree: true });
        window.addEventListener("resize", scheduleScrollRestoration);
        return () => {
            window.removeEventListener("resize", scheduleScrollRestoration);
            mutationObserver.disconnect();
            resizeObserver?.disconnect();
        };
    }, []);
    const closeFromInspector = useCallback(() => {
        const returnedToGrid = controller.closeInspector();
        if (!returnedToGrid) controller.setInspectorPanelOpen(false);
        onRequestClose();
    }, [controller, onRequestClose]);
    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLElement>) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            event.stopPropagation();
            closeFromInspector();
        },
        [closeFromInspector]
    );

    return (
        <aside
            ref={registerRoot}
            aria-labelledby="transaction-inspector-title"
            className={cn(
                "bg-background border-border h-full min-h-0 min-w-0 overflow-y-auto rounded-lg border",
                "xl:h-auto xl:w-[clamp(18rem,24vw,24rem)]",
                className
            )}
            data-testid="transaction-inspector"
            data-transaction-owner={transactionOwner ?? undefined}
            hidden={!open}
            id="transaction-inspector"
            onBlurCapture={handleBlurCapture}
            onFocusCapture={handleFocusCapture}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            role="complementary"
        >
            <div className="border-border flex items-start gap-3 border-b px-4 py-3">
                <div className="min-w-0 flex-1">
                    <h2
                        ref={registerHeading}
                        className="text-sm font-semibold"
                        data-testid="transaction-inspector-title"
                        id="transaction-inspector-title"
                        tabIndex={-1}
                    >
                        Transaction inspector
                    </h2>
                    {transaction != null && (
                        <p className="text-muted-foreground mt-1 truncate text-xs">
                            {transaction.description || "No description"}
                        </p>
                    )}
                </div>
                <Button
                    ref={registerClose}
                    aria-label="Close transaction inspector"
                    className="text-muted-foreground shrink-0"
                    data-inspector-action="close"
                    data-transaction-owner={transactionOwner ?? undefined}
                    onClick={closeFromInspector}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                >
                    <X className="size-4" />
                </Button>
            </div>

            {transaction == null || transactionOwner == null ? (
                <div className="flex min-h-48 items-center justify-center px-6 py-8 text-center">
                    <p className="text-muted-foreground max-w-56 text-sm">
                        Focus a transaction cell to inspect its details.
                    </p>
                </div>
            ) : (
                <div className="space-y-6 p-4">
                    <section aria-labelledby="transaction-inspector-notes-title">
                        <label
                            className="text-sm font-medium"
                            htmlFor="transaction-inspector-notes"
                            id="transaction-inspector-notes-title"
                        >
                            Notes
                        </label>
                        <Textarea
                            ref={registerNotes}
                            className="mt-2 min-h-28 resize-y"
                            data-inspector-action="notes"
                            data-testid="notes-editable"
                            data-transaction-owner={transactionOwner}
                            id="transaction-inspector-notes"
                            onChange={(event) =>
                                onNotesChange(transactionOwner, event.currentTarget.value)
                            }
                            placeholder="Add notes or a memo..."
                            value={transaction.notes}
                        />
                    </section>

                    <section
                        aria-labelledby="transaction-inspector-automation-title"
                        className="border-border border-t pt-4"
                        data-inspector-action="automation"
                        data-testid="transaction-inspector-automation-section"
                        data-transaction-owner={transactionOwner}
                    >
                        <h3
                            className="text-sm font-medium"
                            id="transaction-inspector-automation-title"
                        >
                            Automation
                        </h3>
                        <div className="mt-3">
                            {transaction.automation != null ? (
                                <TransactionInspectorAutomation
                                    context={transaction.automation}
                                    controller={controller}
                                    transactionId={transactionOwner}
                                />
                            ) : (
                                <p className="text-muted-foreground text-sm">
                                    Automation is unavailable for this transaction.
                                </p>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </aside>
    );
}
