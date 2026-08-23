---
name: portal-tests-need-a-resizeobserver-stub
description:
    The tags chooser is a cmdk command list that observes its own size, so a unit test of that
    portal throws "ResizeObserver is not defined" while mounting and the dropdown never opens; stub
    it with the existing ResizeObserverMock pattern.
metadata:
    type: reference
---

Any unit test that opens `InlineEditableTags`' chooser needs a `ResizeObserver` stub. The chooser is
a `cmdk` command list which observes its own size on mount, and jsdom provides no `ResizeObserver`,
so the dropdown throws **while mounting** — `ReferenceError: ResizeObserver is not defined`, raised
from `cmdk/dist/index.mjs` inside a passive mount effect.

The established stand-in is in `tests/unit/components/description-alias-interactions.test.tsx`: a
three-no-op `ResizeObserverMock` class installed with
`beforeAll(() => vi.stubGlobal("ResizeObserver", ResizeObserverMock))` and
`afterAll(() => vi.unstubAllGlobals())`.

Why this is worth knowing rather than re-deriving: the failure names `ResizeObserver`, not the tags
cell, and the stack is entirely library frames — so it reads like a harness problem in the test
runner rather than "this component cannot mount here". The consequence is that the portal never
opens, which means a test _about_ the portal is not merely red, it is untestable until the stub is
in place. Once stubbed, Radix genuinely does move focus into the portaled dropdown under jsdom
(`document.activeElement` is the cmdk search input, outside the row's DOM), so the portal hazard
really is reproducible at unit level — worth checking, because the alternative is
[[instrument-must-be-able-to-contain-the-defect]]. Related: [[jsdom-fireevent-does-not-move-focus]].
