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
 * Every utility here is unprefixed or `dark:`-prefixed, so it only sets the baseline paint. The
 * state utilities each cell adds — `hover:`, `focus:`, `focus-visible:`, `aria-invalid:` — are
 * emitted after the base utilities in Tailwind's layer and so still win when their condition holds.
 * UR-005 requires that removing resting chrome not remove state feedback; that outcome is asserted
 * against the rendered paint in `tests/e2e/transactions.spec.ts` and against the merge in
 * `tests/unit/transactions/cell-resting-chrome.test.ts` rather than assumed here.
 */
export const RESTING_CELL_CHROME =
    "border-transparent bg-transparent shadow-none dark:border-transparent dark:bg-transparent";
