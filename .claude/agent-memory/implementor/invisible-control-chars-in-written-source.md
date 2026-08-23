---
name: invisible-control-chars-in-written-source
description:
    A file I Write can contain literal control characters (NUL) that render as spaces — the test
    passes for a reason I cannot see, and grep silently treats the file as binary.
metadata:
    type: feedback
---

When writing a string that logically contains a control character (MoneyFlow's maintenance-shadow
ids join their parts with U+0000), the Write/Edit tool can emit the **literal** byte rather than an
escape. The source then looks like `"prefix:epoch cid tx-real"` on screen while actually holding
NULs, and:

- the test passes, but not for the reason the source appears to state;
- `grep` classifies the whole file as binary and returns **nothing** for every pattern — including
  `grep -c ""` — which reads exactly like "the file does not contain that text".

**Why:** I lost about fifteen minutes on this. My reasoning said the test must fail; it passed. I
chased vitest caching, a stale worktree, and a reverted file before `od -c` showed the NULs. The
sequence that finally worked was: canary the assertion (change the expected value, confirm red),
then `od -c` the exact line.

**How to apply:** Never put a control character directly in written source — write `\u0000` in a
template literal and build the value from the exported constant. If grep returns nothing at all for
a file you just wrote (especially `grep -c ""`), run `od -c` before doubting anything else. Related:
[[a-test-that-cannot-fail]], and always canary a surprising green with a deliberate break.
