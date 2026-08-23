---
name: harness-artefact-mimics-product-failure-signature
description:
    a synchronous scroll stand-in in jsdom emitted the exact flushSync warning the E2E scale test
    fails the whole run on, so a harness shortcut produced the product's own failure signature
metadata:
    type: feedback
---

Standing in for jsdom's missing `Element.prototype.scrollTo` by writing `scrollTop` and dispatching
`scroll` **synchronously** produced:

```
flushSync was called from inside a lifecycle method. React cannot flush when React is already
rendering.
```

`tests/e2e/transactions.spec.ts` fails the entire run on
`/flushSync|ResizeObserver|hydration|Maximum call stack/`. The product never does this: a browser
fires `scroll` for a programmatic scroll in a _later_ task, so react-virtual's `useFlushSync: true`
flushes from a scroll handler. My stand-in delivered it while React was still inside the `useEffect`
that had asked for the scroll.

**Why:** a harness artefact that reproduces the product's own tracked failure string is the worst
kind of false signal. Nobody reads it as "the fake is impatient"; three weeks later someone greps
the warning, finds it attributed to the grid, and goes hunting in `TransactionVirtualRows` for a bug
that is not there. The fix was one `setTimeout(…, 0)` — the expensive part would have been the
misattribution.

**How to apply:** when standing in for a browser API, copy its **timing** as well as its effect —
especially for anything that ends in a React state update, because sync-vs-async is the difference
between an event handler and a lifecycle. Before accepting a warning as a finding, ask whether any
stand-in in the harness could have produced it, and say plainly in the write-up which side it came
from. Related: [[jsdom-clamps-programmatic-scroll-to-zero]] (the same stub, the other trap) and
[[instrumentation-in-a-render-body-masks-the-defect]].
