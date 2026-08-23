---
name: no-resizeobserver-disables-all-measurement
description:
    without a ResizeObserver that actually reports, react-virtual measures a row only when not
    scrolling, so dynamic measurement, resizeItem, total-size correction and every scroll adjustment
    are unreachable in jsdom
metadata:
    type: feedback
---

react-virtual's `measureElement` ref ends with:

```js
if ((!this.isScrolling || this.scrollState) && this.shouldMeasureDuringScroll(index)) {
    this.resizeItem(index, this.options.measureElement(node, void 0, this));
}
```

So a row mounted **during a scroll** is only `observer.observe(node)`d — its measurement comes from
the ResizeObserver and nowhere else. jsdom has no `ResizeObserver`, and the instance's `observer`
getter returns `null` when `targetWindow.ResizeObserver` is absent, so those rows are **never
measured**. A no-op stub (`observe(){}`) is no better: `observe` succeeds and nothing is ever
reported.

The consequence is total and silent: `resizeItem` never runs, so no `delta`, no `itemSizeCache`
writes, no total-size correction and **no `applyScrollAdjustment`** — every measurement-driven
behaviour the virtualizer has, unreachable, while the virtualizer is otherwise completely real and
the test looks like it exercises it.

I found this only because my harness reported `offsetHeight` of 57/75/103 while the rendered rows
stayed spaced at the 44px _estimate_. If the harness reports a uniform height equal to the estimate
— which this repo's did — `delta` is 0, `resizeItem` early-returns, and the two states are
indistinguishable. The harness was flattering the product on exactly the mechanism under
investigation.

**Why:** it turned a reproduction attempt into a false negative. My first run showed zero scroll
adjustments across 60 steps and I nearly reported "the adjustment path does not fire" — when the
truth was that nothing could fire at all.

**How to apply:** any jsdom test of a virtualizer with dynamic measurement needs (a) a
`ResizeObserver` that actually invokes its callback with `borderBoxSize`, and (b) row heights that
_differ_ from `estimateSize`. Without both, a test of "the grid measures its rows" cannot fail.
`installVirtualGridLayout` now provides both — heights via `measuredRowHeight`, and a reporting
observer by default. Related: [[jsdom-clamps-programmatic-scroll-to-zero]],
[[instrument-must-be-able-to-contain-the-defect]].
