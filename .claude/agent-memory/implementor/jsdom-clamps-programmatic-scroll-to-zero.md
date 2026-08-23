---
name: jsdom-clamps-programmatic-scroll-to-zero
description:
    react-virtual's scrollToIndex clamps to scrollHeight - clientHeight, both 0 in jsdom, so every
    programmatic scroll lands on offset 0 and any assertion about it passes on a scrollToIndex that
    does not work
metadata:
    type: feedback
---

`virtualizer.scrollToIndex(n)` reaches `getOffsetForAlignment`, which ends in
`Math.max(Math.min(this.getMaxScrollOffset(), toOffset), 0)`. `getMaxScrollOffset()` is
`scrollElement.scrollHeight - scrollElement.clientHeight`, and jsdom has no layout, so **both are
0** — the target clamps to 0 and `scrollTo({top: 0})` is what actually gets called. Stubbing only
`offsetHeight`/`offsetWidth` (which is what `tests/unit/transactions/virtual-grid-harness.ts` did)
is not enough; `Element.prototype.scrollTo` is also absent or a no-op, so nothing moves either way.

**Why:** this is the eleventh can't-fail instrument found in this project. A test asserting "the
grid scrolled to index 4000" passes identically against a `scrollToIndex` that silently did nothing,
because the observable it reaches for — mounted `data-index` values, or `scrollTop` — never moved
and the assertion was written loosely enough to tolerate it. I only caught it because I asserted
`scrollTop > 0` and got `expected 0 to be greater than 0`; a `toContain(4000)` on the mounted range
would have looked like an ordinary virtualization miss.

**How to apply:** any jsdom test of a _programmatic_ scroll (`scrollToIndex`, `scrollIntoView`,
`scrollTo`) must stub `clientHeight` and `scrollHeight` on the scroll container as well as the
element sizes, and must stub `scrollTo` itself. Derive `scrollHeight` from something the product
declared — the harness reads the `[role="rowgroup"]` inline height the virtualizer itself sets —
rather than a constant, so the stub cannot disagree with the component. Then assert on the resulting
`scrollTop` **numerically**, not just on which rows mounted: the numeric assertion is the one that
goes red when the clamp eats the scroll. See [[a-test-that-cannot-fail-proves-nothing]] and
[[instrument-must-be-able-to-contain-the-defect]].
