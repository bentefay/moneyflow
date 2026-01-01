"use client";

/**
 * Toast Component
 *
 * Lightweight toast notifications without external dependencies.
 * Uses a singleton pattern with React portal for global notifications.
 */

import { createContext, type ReactNode, useCallback, useContext, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface ToastData {
	id: string;
	message: string;
	type?: "info" | "success" | "warning" | "error";
	duration?: number;
}

interface ToastContextValue {
	toasts: ToastData[];
	addToast: (toast: Omit<ToastData, "id">) => void;
	removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

/**
 * Toast provider component.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<ToastData[]>([]);

	const addToast = useCallback((toast: Omit<ToastData, "id">) => {
		const id = `toast-${++toastId}`;
		const duration = toast.duration ?? 4000;

		setToasts((prev) => [...prev, { ...toast, id }]);

		// Auto-remove after duration
		if (duration > 0) {
			setTimeout(() => {
				setToasts((prev) => prev.filter((t) => t.id !== id));
			}, duration);
		}
	}, []);

	const removeToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	return (
		<ToastContext.Provider value={{ toasts, addToast, removeToast }}>
			{children}
			{typeof document !== "undefined" &&
				createPortal(<ToastContainer toasts={toasts} onRemove={removeToast} />, document.body)}
		</ToastContext.Provider>
	);
}

/**
 * Hook to use toast notifications.
 */
export function useToast() {
	const context = useContext(ToastContext);
	if (!context) {
		throw new Error("useToast must be used within a ToastProvider");
	}

	return {
		toast: context.addToast,
		dismiss: context.removeToast,
		toasts: context.toasts,
	};
}

/**
 * Toast container that renders all active toasts.
 */
function ToastContainer({
	toasts,
	onRemove,
}: {
	toasts: ToastData[];
	onRemove: (id: string) => void;
}) {
	if (toasts.length === 0) return null;

	return (
		<div
			className="fixed right-4 bottom-4 z-[100] flex flex-col gap-2"
			role="region"
			aria-label="Notifications"
		>
			{toasts.map((toast) => (
				<Toast key={toast.id} toast={toast} onDismiss={() => onRemove(toast.id)} />
			))}
		</div>
	);
}

/**
 * Individual toast component.
 */
function Toast({ toast, onDismiss }: { toast: ToastData; onDismiss: () => void }) {
	const typeStyles = {
		info: "bg-background border-border",
		success: "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900",
		warning: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900",
		error: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900",
	};

	const iconByType = {
		info: (
			<svg
				className="h-4 w-4 text-muted-foreground"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
		),
		success: (
			<svg
				className="h-4 w-4 text-green-600 dark:text-green-400"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
		),
		warning: (
			<svg
				className="h-4 w-4 text-yellow-600 dark:text-yellow-400"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
				/>
			</svg>
		),
		error: (
			<svg
				className="h-4 w-4 text-red-600 dark:text-red-400"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
		),
	};

	return (
		<div
			className={cn(
				"flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg",
				"animate-in slide-in-from-right-full duration-200",
				typeStyles[toast.type ?? "info"]
			)}
			role="alert"
		>
			{iconByType[toast.type ?? "info"]}
			<p className="flex-1 text-sm">{toast.message}</p>
			<button
				type="button"
				onClick={onDismiss}
				className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
				aria-label="Dismiss notification"
			>
				<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>
	);
}
