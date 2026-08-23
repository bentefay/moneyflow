---
name: instrumentation-in-a-render-body-masks-the-defect
description:
    A console.log added to a component's render body to diagnose a bug made the buggy code pass,
    because the opaque call changes React Compiler output; instrument event handlers only.
metadata:
    type: feedback
---

When instrumenting a React component to diagnose a defect, put logs in **event handlers, effects and
callbacks only — never in the render body**. A bare `console.log` in a render body is an opaque
call, which changes how the React Compiler treats the whole component, and can make the defect
disappear.

**Why:** hunting the T014a date-picker regression, I added `console.log` to `InlineEditableDate`'s
render body plus handler logs elsewhere. The E2E test then **passed with the broken code in place**
— including with the fix deliberately mutated away. The defect depended on a synchronous re-render
replacing a DOM node mid-mousedown, and the changed compilation altered that timing. Handler-only
instrumentation reproduced it every time. This is the diagnostic face of
[[opaque-call-in-render-body-defeats-the-compiler]]: there the opaque call broke the build's lint,
here it silently repaired the bug I was trying to observe.

**How to apply:** before trusting any green result from an instrumented run, ask whether the
instrumentation sits in a render body. If it does, the run is void — move the log into a handler and
re-run. Corollary: a mutation experiment ("break the fix, prove it goes red") must be run on
instrument-free source, or the mutation and the instrument can cancel out. Verify the source is
clean with `grep -rn DIAG src/` before quoting any result. See also
[[instrument-must-be-able-to-contain-the-defect]].
