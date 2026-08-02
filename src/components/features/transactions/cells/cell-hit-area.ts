/**
 * Full-cell activation areas for transaction table cells (UR-012).
 *
 * The requirement is about where a click is ACCEPTED, not about how the table looks: "the resting
 * appearance is unchanged … a row at rest looks exactly as it did before". So nothing here may move
 * a pixel; each constant only enlarges the region that receives the pointer.
 *
 * ## The measured geometry these constants are derived from
 *
 * Measured in the running app rather than inferred from classes. The row is `px-4 py-3` with a
 * `border-b`, giving a 57px box whose content band starts 12px below the row's top edge:
 *
 * | element                  | box (y, height) | dead strip above / below |
 * | ------------------------ | --------------- | ------------------------ |
 * | row                      | 219, 57         | —                        |
 * | date/description/amount  | 233, 28         | 14 / 14                  |
 * | account (outline button) | 233, 28         | 14 / 14                  |
 * | tags display             | 233, 28         | 14 / 14                  |
 * | status trigger           | 231, 32         | 12 / 12                  |
 * | allocation button        | 231, 32         | 12 / 12                  |
 * | checkbox (drawn box)     | 239, 16         | 20 / 20                  |
 *
 * Horizontally every control already spans its whole grid cell — measured dead space of 0px on the
 * left and right of all seven data cells — so only the vertical strips are missing, and only those
 * are added. The checkbox is the sole exception: it draws at 16px inside a 32px cell, so its
 * activation area also grows 8px sideways.
 *
 * ## Why two mechanisms rather than one
 *
 * A `::before` overlay is the safer instrument and is used wherever it works, because it changes no
 * box at all. It cannot be used on `<input>`: a replaced element renders no pseudo-element. That is
 * measured rather than assumed — with the overlay applied to the date input, the edge click still
 * landed on the row and the input's box was unchanged.
 *
 * The three text inputs therefore grow their own border box and give the space straight back as
 * padding. The added height and the negative vertical margin cancel exactly, so the row's layout is
 * untouched: measured, every anchor rect in the row is byte-identical and a screenshot of a resting
 * row differs by 0 pixels out of 73,758.
 *
 * The padding is worth being precise about, because the obvious explanation is wrong. It does NOT
 * hold the text in place. An `<input>` centres its single line of text within its content box, so
 * what fixes the text's position is the padding being SYMMETRIC, not its value. Measured, with the
 * content-band centre read relative to the row:
 *
 * | padding        | content-band centre | text moves? |
 * | -------------- | ------------------- | ----------- |
 * | 18px / 18px    | 28                  | shipped     |
 * | 4px / 4px      | 28                  | no          |
 * | 30px / 6px     | 40                  | yes         |
 *
 * So dropping the compensation entirely changes 0 pixels, and only an asymmetric change moves the
 * glyphs. That is why the guard against it lives in `cell-hit-area.test.ts`'s arithmetic rather than
 * in any screenshot: on this particular mutation the unit test is the only instrument that fails.
 *
 * ## Consequences worth knowing
 *
 * Hover and focus feedback follow the enlarged control, which the frozen text requires explicitly:
 * "hover and focus feedback follow the enlarged control, so the whole cell reflects the state". A
 * row at REST is unchanged; a row under the pointer deliberately is not.
 *
 * ## The overlay stacks above its own descendants — a hazard for any future call site
 *
 * The overlay is positioned, so it paints above the in-flow content of the element carrying it. If
 * that element contains a SECOND interactive control, the overlay buries it: measured, the tag
 * pill's remove button became unclickable, the tag survived the click and the chooser opened
 * instead. The fix is to position the inner control too — see `TagPill` — never a `z-index` on the
 * overlay, since a negative one drops it behind the row and the cell-edge click stops arriving.
 *
 * Today exactly one of the five overlay sites contains a second interactive control (the tag
 * chooser's pills). The other four wrap only their own text and icons, and the three `<input>` cells
 * use the growth mechanism instead and so cannot have this defect at all. **Any new overlay call
 * site must check this**, and a test that clicks the inner control is the only thing that catches
 * it: the outer control keeps working, so the cell looks entirely healthy.
 *
 * A disabled control's enlarged area is inert, which was verified with a real mouse rather than
 * reasoned about: clicking the overlay strip toggles the checkbox while it is enabled and does
 * nothing once it is disabled. Note the mechanism is NOT `pointer-events`, which stays `auto` on a
 * disabled control here — the overlay still hit-tests, and a disabled `<button>` simply does not
 * dispatch the click. Worth knowing, because a synthetic `dispatchEvent` bypasses that and will
 * happily report the opposite.
 *
 * The overlay paints no background, so it cannot disturb {@link RESTING_CELL_CHROME}'s guarantee
 * that a resting cell paints `rgba(0, 0, 0, 0)` in both themes.
 *
 * Each constant enlarges the SAME element that already carried the role, name and state, so no cell
 * gains a second interactive node and assistive technology still sees exactly one control per cell.
 *
 * Every utility below is written out in full. Tailwind discovers classes by scanning source text,
 * so a class assembled from variables at runtime would never be generated — these must stay
 * literal.
 */

/**
 * Date, description and amount: `h-7` text inputs whose text must not move.
 *
 * 28px + 14px above + 14px below = 56px, returned as 14px of extra padding on top of the shared
 * `Input` base's own `py-1` (4px), giving 18px.
 */
export const INPUT_CELL_HIT_AREA = "h-[56px] -my-[14px] py-[18px]";

/** Account combobox trigger and the tag chooser's display area, both `h-7` in a 57px row. */
export const SHORT_CONTROL_HIT_AREA =
    "relative before:absolute before:content-[''] before:inset-x-0 before:-top-[14px] before:-bottom-[14px]";

/** Status select trigger and the person-percentage button, both `h-8` in a 57px row. */
export const TALL_CONTROL_HIT_AREA =
    "relative before:absolute before:content-[''] before:inset-x-0 before:-top-[12px] before:-bottom-[12px]";

/**
 * The checkbox, which keeps its 16px drawn size while its activation area covers its 32px cell.
 *
 * 8px horizontally per side is the exact measured gap between the drawn box and the cell edge; 20px
 * vertically reaches the row edge. This replaces an earlier `before:inset-[-4px]`, which enlarged
 * the target but stopped well short of the cell.
 */
export const CHECKBOX_HIT_AREA =
    "relative before:absolute before:content-[''] before:-top-[20px] before:-bottom-[20px] before:-left-[8px] before:-right-[8px]";
