---
name: hook-in-a-child-reads-a-null-ancestor-ref
description:
    Extracting a hook into a child component to satisfy the React Compiler breaks any handshake
    where that hook reads an ancestor's ref, because React attaches host refs child-first —
    useVirtualizer measured nothing on mount and scheduled no retry
metadata:
    type: project
---

Moving `useVirtualizer` out of `TransactionTable` into a child (`TransactionVirtualRows`) to confine
the React Compiler's bail-out **introduced a live defect**: React attaches a host element's `ref`
during the layout phase in **child-first** order, so the child's own layout effect — where
`useVirtualizer` first calls `getScrollElement()` — runs _before_ the ancestor scroll `div`'s ref is
attached. It read `null`, and `useVirtualizer` **schedules no retry**: it measured nothing,
`getVirtualItems()` returned `[]`, and the grid rendered a correctly-sized 440,000px row group
containing **zero rows**.

Before the extraction this was impossible: the hook was in an _ancestor_ of the div, so its layout
effect ran after the ref was attached.

**Why:** the fix for one tool's constraint moved the hook across the boundary that the ref handshake
depended on. Nothing about the extraction looks like it touches measurement.

**Why nothing caught it:** the app always re-renders shortly after mount (vault hydration), and
`useVirtualizer`'s `_willUpdate` layout effect has no dependency array, so the second render
silently repaired it — the empty frame never survived to an assertion. And the five unit tests
replaced `useVirtualizer` with a fake that ignored `getScrollElement` entirely, so the mocks made it
structurally invisible. It was real in the code and absent from both harnesses.

**How to apply:** when a hook is extracted into a child for any reason, check whether it reads a DOM
node owned by an ancestor. If it does, pass the **element**, not a ref — hold it in the parent's
`useState` via a callback ref, which costs one extra render on mount and guarantees the first read
is against a real node. And write the regression guard as "renders rows after exactly one render",
since anything that permits a second render hides it. Related:
[[e2e-catches-what-unit-tests-cannot]], [[test-that-cannot-fail-proves-nothing]],
[[instrument-must-be-able-to-contain-the-defect]].
