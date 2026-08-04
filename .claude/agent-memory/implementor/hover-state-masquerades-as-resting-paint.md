---
name: hover-state-masquerades-as-resting-paint
description:
    Measuring resting background paint is invalid while the pointer is parked over the element,
    because in dark mode --muted and --accent are the same token and hover fill is byte-identical to
    a resting fill
metadata:
    type: project
---

When measuring an element's _resting_ background with `getComputedStyle`, park the pointer clear
first and assert `el.matches(":hover") === false` — otherwise the reading is worthless.

**Why:** In this repo's dark theme, `--muted` and `--accent` resolve to the _same_ token
(`oklch(0.279 0.041 260.031)`, `src/app/globals.css`). So a cell's retained `hover:bg-accent/30`
serialises byte-identically to a deliberate resting `bg-muted/30`. A reading taken while hovering
cannot distinguish "correct state feedback" from "unwanted resting chrome" — the two produce the
same string. During P26/UR-005 this produced contradictory measurements of the expanded-notes area
and briefly led me to the wrong conclusion about what carried a fill; only re-measuring on a
detached clone, free of `:hover`, resolved it.

**How to apply:** Any time a requirement is about what an element looks like _at rest_ — chrome,
fills, borders, zebra striping — the measurement needs the pointer moved away _and_ focus blurred.
Playwright CLI `hover`/`click` invocations do not persist pointer state across separate process
invocations, so do the move and the read inside one `page.evaluate`, or measure a
`node.cloneNode(false)` appended to `document.body`, which can carry neither `:hover` nor `:focus`.

Two related traps in the same measurement class:

- Elements carry `transition-colors` / `transition-[color,box-shadow]`, so the first frame after a
  state flips still shows the _old_ paint. Poll to the settled value; never sample once.
- After `page.emulateMedia({ colorScheme })`, text colour animates from the outgoing theme and
  momentarily reads dark-on-dark. A contrast assertion sampled immediately reports a false WCAG
  failure.

See [[e2e-catches-what-unit-tests-cannot]] and [[verify-dispatch-site-enumerations]].
