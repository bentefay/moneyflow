---
name: radix-open-select-hides-page-from-role-queries
description:
    While a Radix Select listbox is open the rest of the page is aria-hidden, so a Playwright
    getByRole toHaveCount(0) passes for a button that is still there
metadata:
    type: feedback
---

A Playwright `getByRole(...)` absence assertion made right after picking a Radix Select option can
pass against a control that never disappeared: Radix sets `aria-hidden` outside the open listbox and
the close animates, so role queries see nothing for a moment. An inspector Split-gate step passed
with the gate deleted until it waited for `getByRole("listbox")` to reach count 0 and queried the
buttons by test id.

**Why:** an absence assertion is satisfied by any instant, so a transient accessibility-tree hole
makes it unfalsifiable. See [[mutate-both-directions-to-grade-a-guard]] and
[[test-that-cannot-fail-proves-nothing]].

**How to apply:** after any Radix Select/Popover/Dialog interaction, wait for the overlay to close
before asserting absence, prefer test-id locators for absence, and mutate the guard away once to
prove the step fails.
