---
name: locale-defect-check-parse-not-just-display
description:
    A "displays in the wrong locale format" report usually has a worse parsing bug behind it; check
    the write path before touching the render path.
metadata:
    type: feedback
---

When a defect is reported as "dates/numbers display in US format", check the **entry/parsing** path
before concluding anything about the **display** path. In P28 the display helper was already fully
locale-aware and needed no fix, while the input silently parsed with a US-ordered parser and wrote
the transposed date to storage — a data-corruption bug the report's framing pointed away from.

**Why:** display defects are cosmetic and self-evident; parsing defects are silent, invisible
whenever the day is 12 or lower, and survive an entire green test suite. Root's dispatch correctly
predicted the display code was fine, and the real damage was one layer down.

**How to apply:** for any locale/format requirement, enumerate BOTH directions — render and parse —
and prove the round trip (`parse(format(x)) === x`) across at least one day-first and one
month-first locale. Also test with day and month both <= 12, where a transposition produces a
valid-looking wrong date. See [[verify-dispatch-site-enumerations]] for the related habit of not
trusting a dispatch's surface list.
