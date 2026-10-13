/**
 * Keyboard movement among the buttons inside the actions cell.
 *
 * Tab enters the cell on its first button. From there Left and Right move between its buttons and
 * stop at either end rather than wrapping, Escape returns to cell navigation, and Enter or Space stay
 * native so a button activates exactly once.
 */

export type ActionCellKeyResult =
    | { readonly kind: "focus-button"; readonly index: number }
    | { readonly kind: "stay" }
    | { readonly kind: "return-to-cell" }
    | { readonly kind: "native" };

export interface ActionCellKey {
    readonly key: string;
    readonly altKey: boolean;
    readonly ctrlKey: boolean;
    readonly metaKey: boolean;
    readonly shiftKey: boolean;
}

/** What a key pressed on the action button at `index` of `count` buttons should do. */
export function actionCellKeyResult(
    index: number,
    count: number,
    event: ActionCellKey
): ActionCellKeyResult {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return { kind: "native" };
    if (event.key === "Escape") return { kind: "return-to-cell" };
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return { kind: "native" };
    const next = event.key === "ArrowLeft" ? index - 1 : index + 1;
    return next < 0 || next >= count ? { kind: "stay" } : { kind: "focus-button", index: next };
}
