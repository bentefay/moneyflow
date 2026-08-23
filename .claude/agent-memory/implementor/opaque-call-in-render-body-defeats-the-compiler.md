---
name: opaque-call-in-render-body-defeats-the-compiler
description:
    A method call on an opaque object in the raw render body makes React Compiler stop treating the
    component's useState setters as stable and skip optimising the whole component, reporting
    preserve-manual-memoization errors at unrelated useCallback sites that never name the cause
metadata:
    type: project
---

`cursor.includes(id)` in the **raw render body**, next to this file's render-phase `setState`
adjustments, made the React Compiler stop treating `TransactionsPageContent`'s `useState` setters as
stable and **skip optimising the whole component**. It reported five
`react-hooks/preserve-manual-memoization` errors at unrelated sites — `clearSelection`,
`handleFocusDescriptionApplied`, `handleLoadMore`, `handleAddTransaction` — each of the shape
`useCallback(() => setX(...), [])`, each saying "the inferred dependency was `setFilters`" or
`setRevealIntent` etc. **None of them names the real cause.**

HEAD was clean with the same five callbacks because the code it replaced called
`filteredTransactions.findIndex(...)` — an _array_ method the compiler knows is pure. A call on an
object it cannot see into is one it must assume may mutate anything.

**Fix:** contain each such call in a `useMemo`, and say in a comment that the memo is there for the
compiler rather than for the cost, or the next reader will delete it as noise.

**How to apply:** if `preserve-manual-memoization` fires at several
`useCallback(() => setState(...), [])` sites at once, do not start with those callbacks — they are
symptoms. Look for a call on a non-array, non-plain value sitting in the render body near a
render-phase `setState`. Bisecting my change hunk-by-hunk against HEAD found it in one pass;
removing any single suspicious construct never reproduced it, because the trigger is the
_combination_ of the opaque call and the render-phase state adjustment. Related:
[[react-compiler-does-not-bail-on-usetable]], [[claims-that-decay-silently]].
