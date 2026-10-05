/**
 * Checkbox activation areas inside contiguous transaction spreadsheet cells.
 *
 * The shared gridcell now owns every background pixel. A data-row checkbox therefore keeps a centred
 * 32px row-selection target, leaving the surrounding surface to canonical cell selection. The header
 * has no selectable gridcell owner, so its checkbox target reaches the complete 37px header cell.
 * Both overlays remain within their own cell and cannot overlap a neighboring row or track.
 */
export const CHECKBOX_HIT_AREA = {
    /** Centred 32px row-selection target around the 16px checkbox glyph. */
    dataRow:
        "relative before:absolute before:content-[''] before:-top-[8px] before:-bottom-[8px] before:-left-[8px] before:-right-[8px]",
    /** Full-cell select-all target in the 37px sticky header. */
    header: "relative before:absolute before:content-[''] before:-top-[10px] before:-bottom-[11px] before:-left-[8px] before:-right-[8px]"
} as const;

/** Which row geometry a {@link CHECKBOX_HIT_AREA} mount sits in. */
export type CheckboxRowGeometry = keyof typeof CHECKBOX_HIT_AREA;
