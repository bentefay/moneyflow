---
name: obvious-assertion-passes-on-the-design-it-rejects
description: "index 9,999 is addressable" stayed green against the paginated grid it was written to reject, because act() chains the load-more effect until it converges; only the bound on the row model caught it
metadata:
  type: feedback
---

Replacing the transaction grid's pagination with true virtualization, I wrote two assertions for the
same change: (a) a row ten thousand deep renders after a single scroll, and (b) the table's row
model stays bounded. Mutating the fix away — restoring `cursor.slice(0, growingCount)` — turned
**(b)** red with `expected 10000 to be less than or equal to 601` and left **(a)** green.

The reason (a) survives: under `act()` React flushes effects repeatedly until quiescent, so the old
load-more effect chains ~200 times and the deep row does eventually mount. In a browser that is 200
round trips and 34–37 seconds; in a test it is one `act()`.

**Why:** (a) is the assertion anyone would reach for first — it is the feature stated as a user
would state it. It passes on the exact design it exists to reject, so a suite containing only (a)
reads as full coverage of the change and has none.

**How to apply:** when a change replaces an incremental mechanism with a direct one, the
reachability assertion is not the test — the _bound_ is. Ask what the old mechanism would eventually
achieve if allowed to iterate, and assert the thing it could never achieve (a size, a step count, a
number of re-renders) rather than the outcome it reaches slowly. Keep the two as separate assertions
with the reason written down, or someone will later merge them and keep the wrong one. See
[[a-test-that-cannot-fail-proves-nothing]] and [[mutate-both-directions-to-grade-a-guard]].
