# Amendment 002: Google Sheets Grid Treatment

**Authorized:** 2026-08-25 by direct user instruction.

The transaction grid must use a Google-Sheets-like resting surface: square contiguous cells, subtle
shared grid rules, and whole-gridcell focus/selection chrome. This instruction replaces the
`source-disposition.md` clause that preserved the prior resting appearance; it does not replace the
57px geometry, accessibility, dark-mode, row-selection, editor behavior, or one-control-per-cell
requirements.

This amendment authorizes the shared geometry/chrome subset only. Staged legacy controls may remain
live until their editor-family migrations, but their resting borders, radii, rings, and selection
paint must not compete with the outer gridcell. It does not claim that every editor family is
display-first. No additional human approval gate applies to this bounded styling slice.
