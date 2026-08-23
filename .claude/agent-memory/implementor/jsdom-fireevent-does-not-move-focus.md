---
name: jsdom-fireevent-does-not-move-focus
description:
    fireEvent.click and fireEvent.focus do not move document.activeElement in jsdom, so any
    assertion downstream of focus silently tests nothing; call element.focus() inside act instead.
metadata:
    type: feedback
---

In jsdom, `fireEvent.click(element)` and `fireEvent.focus(element)` dispatch the event but **do not
move `document.activeElement`**. Any test whose assertion depends on focus having landed somewhere
must drive focus with `act(() => element.focus())` instead.

**Why:** this has now produced a passing-but-vacuous test twice in this project. The earlier case
was `fireEvent.focus()` leaving `document.activeElement` unmoved, which made **five** tests pass for
the wrong reason: every cell then looked like a non-text control to the grid's caret-boundary rule,
so the rule was never exercised at all. The second case was the portal regression test in
`tests/unit/transactions/cell-selection-gestures.test.tsx`, which did `fireEvent.click(tagsTrigger)`
and then asserted the cell-selection anchor had moved to that cell. The anchor never moved, because
the trigger never took focus — the assertion was about a state the gesture could not produce.

**How to apply:** any time a test's assertion sits downstream of focus, print
`document.activeElement` before asserting rather than reasoning about it — that is what found both
cases. Watch for the tell that the focusable node is not the one you clicked: in the tags cell the
`data-testid` is on the container and the focusable node is an inner `[tabindex="0"]` display div,
so even a real `.focus()` on the wrong element proves nothing. Then confirm the test can fail, since
this gap produces exactly the failure mode where it cannot. See
[[test-that-cannot-fail-proves-nothing]] and [[mutate-both-directions-to-grade-a-guard]].
