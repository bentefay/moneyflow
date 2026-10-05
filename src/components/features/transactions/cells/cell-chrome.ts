/**
 * Neutral presentation for staged always-live controls inside a transaction gridcell.
 *
 * The shared gridcell owns resting, hover, focus, selection and validation paint. These utilities
 * therefore cancel both the shadcn primitive baseline and its focus/invalid variants without changing
 * the control's editor behavior or accessible state.
 */
export const RESTING_CELL_CHROME =
    "rounded-none border-transparent bg-transparent shadow-none outline-none hover:bg-transparent focus:border-transparent focus:bg-transparent focus:ring-0 focus-visible:border-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 aria-invalid:border-transparent aria-invalid:ring-0 dark:border-transparent dark:bg-transparent dark:hover:bg-transparent";

/** Focus paint is supplied by the containing gridcell for non-primitive descendants too. */
export const INNER_CELL_FOCUS_CHROME =
    "focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0";

/** Parked action descendants need their own keyboard indicator while outer paint stays suppressed. */
export const PARKED_ACTION_FOCUS_CHROME =
    "focus:ring-0 focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring focus-visible:ring-0 focus-visible:ring-offset-0";

/** Cancels primitive inline padding so display and editor text share the outer cell inset. */
export const TRANSACTION_GRID_EDITOR_INLINE_CHROME = "px-0 has-[>svg]:px-0";

/** Shared spreadsheet rule and spacing for every transaction data gridcell. */
export const TRANSACTION_GRIDCELL_CHROME =
    "relative flex h-full min-h-0 min-w-0 items-center overflow-hidden rounded-none border-r border-b border-border/60 px-2 outline-none hover:bg-accent/30 has-[[aria-invalid=true]]:z-[3] has-[[aria-invalid=true]]:ring-2 has-[[aria-invalid=true]]:ring-destructive has-[[aria-invalid=true]]:ring-inset";

/** Canonical selected-cell paint while the grid owns the interaction. */
export const TRANSACTION_GRIDCELL_VISIBLE_SELECTION_CHROME =
    "aria-selected:z-[1] aria-selected:bg-primary/10 aria-selected:shadow-[inset_0_0_0_2px_color-mix(in_oklch,var(--primary)_55%,transparent)] dark:aria-selected:bg-primary/15";

/** Layout-neutral retained selection while the inspector owns the interaction. */
export const TRANSACTION_GRIDCELL_MUTED_SELECTION_CHROME =
    "aria-selected:z-[1] aria-selected:bg-primary/5 aria-selected:shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary)_30%,transparent)] dark:aria-selected:bg-primary/10";

/** Whole-cell focus paint, omitted while a retained range is parked behind a descendant. */
export const TRANSACTION_GRIDCELL_FOCUS_CHROME =
    "focus-within:z-[2] focus-within:ring-2 focus-within:ring-ring focus-within:ring-inset focus-visible:z-[2] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset";

/** Header cells share the exact body tracks and the same single-width neighboring rules. */
export const TRANSACTION_GRID_HEADER_CELL_CHROME =
    "flex min-w-0 items-center overflow-hidden rounded-none border-r border-b border-border/60 px-2 py-2";
