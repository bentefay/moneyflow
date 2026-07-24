"use client";

import { Upload } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { type ImportFileValidationError, validateImportFiles } from "@/lib/import/file-validation";
import { cn } from "@/lib/utils";

export interface ImportDropTargetProps {
    readonly ariaLabel: string;
    readonly children: React.ReactNode;
    readonly className?: string;
    readonly containerRef?: React.Ref<HTMLDivElement>;
    readonly disabled?: boolean;
    readonly onFileAccepted: (file: File) => void;
    readonly onValidationError?: (error: ImportFileValidationError | null) => void;
    readonly testId?: string;
    readonly validationError?: ImportFileValidationError | null;
}

interface FloatingPosition {
    readonly left: number;
    readonly maxHeight: number;
    readonly top: number;
    readonly width: number;
}

const DROP_COLLISION_MARGIN_PX = 16;
const MINIMUM_VISIBLE_DROP_HEIGHT_PX = 320;

function isFileDrag(dataTransfer: DataTransfer): boolean {
    return Array.from(dataTransfer.types).includes("Files");
}

function hasOneFileItem(dataTransfer: DataTransfer): boolean {
    const fileItemCount = Array.from(dataTransfer.items).filter(
        (item) => item.kind === "file"
    ).length;
    return fileItemCount === 0 || fileItemCount === 1;
}

function floatingPositionFor(element: HTMLElement): FloatingPosition {
    const target = element.getBoundingClientRect();
    const viewport = window.visualViewport;
    const viewportLeft = viewport?.offsetLeft ?? 0;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportRight = viewportLeft + (viewport?.width ?? window.innerWidth);
    const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
    const visibleLeft = Math.max(target.left, viewportLeft) + DROP_COLLISION_MARGIN_PX;
    const visibleTop = Math.max(target.top, viewportTop) + DROP_COLLISION_MARGIN_PX;
    const visibleRight = Math.min(target.right, viewportRight) - DROP_COLLISION_MARGIN_PX;
    const visibleBottom = Math.min(target.bottom, viewportBottom) - DROP_COLLISION_MARGIN_PX;
    const scaleX = target.width / Math.max(element.offsetWidth, 1);
    const scaleY = target.height / Math.max(element.offsetHeight, 1);
    const visibleWidth = Math.max(1, visibleRight - visibleLeft);
    const visibleHeight = Math.max(1, visibleBottom - visibleTop);

    return {
        left: (visibleLeft + visibleWidth / 2 - target.left) / scaleX,
        maxHeight: visibleHeight / scaleY,
        top: (visibleTop + visibleHeight / 2 - target.top) / scaleY,
        width: visibleWidth / scaleX
    };
}

function ensureVisibleDropArea(element: HTMLElement): void {
    const target = element.getBoundingClientRect();
    const viewport = window.visualViewport;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
    const visibleHeight =
        Math.min(target.bottom, viewportBottom) - Math.max(target.top, viewportTop);
    if (
        visibleHeight < Math.min(target.height, MINIMUM_VISIBLE_DROP_HEIGHT_PX) &&
        typeof element.scrollIntoView === "function"
    ) {
        element.scrollIntoView({ block: "center", inline: "nearest" });
    }
}

function updateRef<T>(ref: React.Ref<T> | undefined, value: T | null): void {
    if (typeof ref === "function") {
        ref(value);
    } else if (ref != null) {
        ref.current = value;
    }
}

/**
 * Shared stable whole-surface target for browser import files.
 */
export function ImportDropTarget({
    ariaLabel,
    children,
    className,
    containerRef,
    disabled = false,
    onFileAccepted,
    onValidationError,
    testId = "import-drop-target",
    validationError
}: ImportDropTargetProps) {
    const dragDepthRef = useRef(0);
    const priorFocusRef = useRef<HTMLElement | null>(null);
    const targetRef = useRef<HTMLDivElement | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [internalError, setInternalError] = useState<ImportFileValidationError | null>(null);
    const [floatingPosition, setFloatingPosition] = useState<FloatingPosition | null>(null);
    const displayedError = validationError === undefined ? internalError : validationError;

    const setTargetRef = useCallback(
        (element: HTMLDivElement | null) => {
            targetRef.current = element;
            updateRef(containerRef, element);
        },
        [containerRef]
    );

    const updateFloatingPosition = useCallback(() => {
        const target = targetRef.current;
        if (target != null) setFloatingPosition(floatingPositionFor(target));
    }, []);

    const reportError = useCallback(
        (error: ImportFileValidationError | null) => {
            setInternalError(error);
            onValidationError?.(error);
        },
        [onValidationError]
    );

    const resetDragState = useCallback(() => {
        dragDepthRef.current = 0;
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (!isDragging) return;
        window.addEventListener("dragend", resetDragState, true);
        window.addEventListener("drop", resetDragState);
        return () => {
            window.removeEventListener("dragend", resetDragState, true);
            window.removeEventListener("drop", resetDragState);
        };
    }, [isDragging, resetDragState]);

    useLayoutEffect(() => {
        if (!isDragging && displayedError == null) return;

        updateFloatingPosition();
        const viewport = window.visualViewport;
        const resizeObserver =
            typeof ResizeObserver === "undefined"
                ? null
                : new ResizeObserver(updateFloatingPosition);
        const target = targetRef.current;
        if (target != null) resizeObserver?.observe(target);
        window.addEventListener("resize", updateFloatingPosition);
        window.addEventListener("scroll", updateFloatingPosition, true);
        viewport?.addEventListener("resize", updateFloatingPosition);
        viewport?.addEventListener("scroll", updateFloatingPosition);
        return () => {
            resizeObserver?.disconnect();
            window.removeEventListener("resize", updateFloatingPosition);
            window.removeEventListener("scroll", updateFloatingPosition, true);
            viewport?.removeEventListener("resize", updateFloatingPosition);
            viewport?.removeEventListener("scroll", updateFloatingPosition);
        };
    }, [displayedError, isDragging, updateFloatingPosition]);

    const handleDragEnter = useCallback(
        (event: React.DragEvent<HTMLDivElement>) => {
            if (!isFileDrag(event.dataTransfer)) return;
            event.preventDefault();
            event.stopPropagation();
            if (disabled) {
                event.dataTransfer.dropEffect = "none";
                return;
            }
            if (dragDepthRef.current === 0) {
                ensureVisibleDropArea(event.currentTarget);
                priorFocusRef.current =
                    document.activeElement instanceof HTMLElement ? document.activeElement : null;
                setIsDragging(true);
            }
            dragDepthRef.current += 1;
            event.dataTransfer.dropEffect = hasOneFileItem(event.dataTransfer) ? "copy" : "none";
        },
        [disabled]
    );

    const handleDragLeave = useCallback(
        (event: React.DragEvent<HTMLDivElement>) => {
            if (!isFileDrag(event.dataTransfer)) return;
            event.preventDefault();
            event.stopPropagation();
            const relatedTarget = event.relatedTarget;
            const leavesOuterBoundary =
                event.target === event.currentTarget &&
                (!(relatedTarget instanceof Node) || !event.currentTarget.contains(relatedTarget));
            if (leavesOuterBoundary) {
                resetDragState();
                return;
            }

            dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
            if (dragDepthRef.current === 0) setIsDragging(false);
        },
        [resetDragState]
    );

    const handleDragOver = useCallback(
        (event: React.DragEvent<HTMLDivElement>) => {
            if (!isFileDrag(event.dataTransfer)) return;
            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect =
                !disabled && hasOneFileItem(event.dataTransfer) ? "copy" : "none";
        },
        [disabled]
    );

    const handleDrop = useCallback(
        async (event: React.DragEvent<HTMLDivElement>) => {
            if (!isFileDrag(event.dataTransfer)) return;
            event.preventDefault();
            event.stopPropagation();
            resetDragState();
            if (disabled) {
                event.dataTransfer.dropEffect = "none";
                return;
            }
            ensureVisibleDropArea(event.currentTarget);

            const result = await validateImportFiles(Array.from(event.dataTransfer.files));
            if (!result.ok) {
                reportError(result.error);
                priorFocusRef.current?.focus();
                return;
            }

            reportError(null);
            onFileAccepted(result.file);
        },
        [disabled, onFileAccepted, reportError, resetDragState]
    );

    return (
        <div
            aria-label={ariaLabel}
            className={cn("relative", isDragging && "ring-primary/50 ring-2 ring-inset", className)}
            data-testid={testId}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            ref={setTargetRef}
            role="region"
        >
            {children}
            {isDragging && (
                <div
                    className="bg-background/85 pointer-events-none absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm motion-reduce:transition-none"
                    data-testid="import-drop-overlay"
                    role="status"
                >
                    <div
                        className="text-primary absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 overflow-hidden text-center"
                        data-testid="import-drop-guidance"
                        style={floatingPosition ?? undefined}
                    >
                        <Upload aria-hidden="true" className="h-12 w-12" />
                        <p className="text-lg font-medium">Drop file to import</p>
                        <p className="text-muted-foreground text-sm">
                            One CSV, OFX, or QFX file up to 10 MiB
                        </p>
                    </div>
                </div>
            )}
            {displayedError && (
                <p
                    className="pointer-events-none absolute z-[60] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-md bg-red-900 px-4 py-3 text-sm text-white shadow-lg dark:bg-red-950 dark:text-white"
                    role="alert"
                    style={floatingPosition ?? undefined}
                >
                    {displayedError.message}
                </p>
            )}
        </div>
    );
}
