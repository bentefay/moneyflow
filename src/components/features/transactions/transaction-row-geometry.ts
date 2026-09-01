/** Exact block size shared by transaction main rows and their virtualizer estimate. */
export const TRANSACTION_MAIN_ROW_HEIGHT_PX = 57;

/**
 * Tailwind must see the complete literal, so the DOM contract stays beside the numeric virtualizer
 * contract rather than being rebuilt at a call site.
 */
export const TRANSACTION_MAIN_ROW_HEIGHT_CLASS = "h-[57px] min-h-[57px] max-h-[57px]";
