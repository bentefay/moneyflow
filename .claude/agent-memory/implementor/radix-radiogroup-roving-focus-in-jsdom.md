---
name: radix-radiogroup-roving-focus-in-jsdom
description:
    Radix RadioGroup's Tab stop is the radiogroup root, not the checked radio, and arrow-key focus
    lands in a setTimeout; a sync jsdom assertion on either fails.
metadata:
    type: feedback
---

In a Radix `RadioGroup`, every radio starts at `tabIndex = -1`. The **root** `role="radiogroup"` is
the one Tab stop: it has tabIndex 0, and when it receives focus it forwards focus to the checked
radio. Arrow-key navigation then moves focus inside a `setTimeout`, so asserting `toHaveFocus()`
synchronously after `fireEvent.keyDown(..., { key: "ArrowDown" })` fails.

**Why:** In grouped-rules phase 2a, a Tab-order test expected the checked radio in the tabbable
sequence and got the root div instead. An arrow-key test failed the same way until the assertion
waited.

**How to apply:** In a tab-sequence assertion, expect the radiogroup element itself. To test entry,
call `group.focus()` and assert the checked radio has focus. Wrap arrow-key focus assertions in
`await waitFor(...)`. See also [[jsdom-fireevent-does-not-move-focus]].
