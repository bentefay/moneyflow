---
name: rewritten-primitive-regresses-untested-classes
description:
    Rewriting a formatting/parsing primitive can regress an entire input class no test names;
    enumerate the classes and diff against the base implementation.
metadata:
    type: feedback
---

When rewriting a formatting or parsing primitive, enumerate the **input classes** it must handle and
test one representative of each — then run the base implementation side by side on those same inputs
to separate a regression from a pre-existing defect.

**Why:** in P28 I rewrote `formatTransactionDate` onto `Intl.formatToParts` and stripped padding
with `String(Number(part.value))`. `Number("۵")` is `NaN`, so every locale numbering outside `latn`
rendered the literal string `"NaN"` as its date — a regression against base, which had rendered a
real date. All five test locales were Latin and Gregorian, so 2291 unit tests, typecheck, lint and
three green 175-test E2E campaigns all passed while the function was broken for a large class of
users. An independent reviewer caught it by importing the real module and sweeping off the tested
path.

**How to apply:** for dates/numbers/text the classes are at minimum — non-Latin numbering systems
(`fa-IR`, `bn-BD`, `ar-EG`), non-Gregorian default calendars (`th-TH` Buddhist, `fa-IR` Persian),
RTL marks, and year-first field order (`ja-JP`). Pin `calendar: "gregory"` whenever a displayed
value will be parsed back by a Gregorian-only parser such as date-fns, and remember date-fns reads
Latin digits only, so locale numerals must be normalised before parsing. Extending the round-trip
locale table from 5 to 9 found a third defect neither I nor the reviewer had named. See
[[locale-defect-check-parse-not-just-display]] and [[host-locale-is-en-us-in-brisbane]].
