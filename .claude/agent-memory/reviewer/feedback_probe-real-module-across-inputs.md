---
name: probe-real-module-across-inputs
description:
    Import the real product module and sweep inputs beyond the tests' own set; a rewritten formatter
    can regress a whole input class the tests never name.
metadata:
    type: feedback
---

When a package rewrites a formatting/parsing primitive, do not stop at auditing the tests it
shipped. Import the REAL module and sweep a wider input set than the tests cover.

**Why:** P28/UR-007 rewrote `formatTransactionDate` onto `Intl.formatToParts`, stripping padding
with `String(Number(part.value))`. Correct for the five locales the tests covered, all `latn`. For
any locale whose numbering system is not Latin (`fa-IR`, `ar-EG`, `bn-BD`, `my-MM`, `ne-NP`,
`ar-SA`) `Number("۵")` is `NaN`, so the cell rendered the literal string `"NaN/NaN"`. Every shipped
test passed. `typecheck`/`lint` were clean. Nothing in the diff looked wrong in isolation — the bug
lived in the gap between the code's input domain and the tests' input set. A second one hid in the
same gap: `th-TH` resolves to the **Buddhist** calendar, so the editing form round-tripped 2026
-> 2069.

**How to apply:** For any locale/encoding/format primitive, enumerate the axes the implementation
touches, then probe values off the tested path — non-Latin numbering systems, non-Gregorian
calendars (`buddhist`, `persian`), RTL marks, trailing-separator forms. Run it as
`node --experimental-strip-types` importing the actual `.ts` from the repo root so pnpm resolution
works, NOT a hand-copied reimplementation of the logic ([[copied-fixture-defeats-dependency-test]]).
Diff the behaviour against the BASE commit's version of the same function to prove regression vs.
pre-existing — here base rendered `"۵/۱۲"`, so `NaN` was newly introduced. This is cheap, needs no
dev server, and is safe to do while the machine is busy and a campaign is blocked
([[serialize-my-own-verification-load]]).
