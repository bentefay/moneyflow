/**
 * Resting chrome for transaction table cells.
 *
 * The inline cells render shared primitives — `Input`, `SelectTrigger`, the outline `Button` — and
 * every one of those bases carries `dark:bg-input/30`, with the outline button adding
 * `dark:border-input`. Those are unconditional resting decorations, so in dark mode each cell drew
 * a 15%-white fill and a visible border even though the cell asked for `bg-transparent`.
 *
 * A bare `bg-transparent` cannot remove them: `cn` is `twMerge(clsx(...))`, and `twMerge` treats a
 * variant-prefixed utility as targeting a different state from its unprefixed form, so
 * `dark:bg-input/30` survives the merge untouched. Cancelling a `dark:`-prefixed utility therefore
 * requires a `dark:`-prefixed override, which is what this constant supplies.
 *
 * Only the *resting* appearance is neutralised. Hover, focus, focus-visible, selected, editing,
 * presence and validation utilities all carry their own variant prefixes and higher specificity, so
 * they continue to paint over this baseline and state feedback is unchanged.
 */
export const RESTING_CELL_CHROME =
    "border-transparent bg-transparent shadow-none dark:border-transparent dark:bg-transparent";
