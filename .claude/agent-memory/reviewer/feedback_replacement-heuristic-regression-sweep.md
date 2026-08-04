---
name: replacement-heuristic-regression-sweep
description:
    When a fix REPLACES a heuristic rather than extending it, A/B the old and new one over the input
    class the OLD one handled; the new tests only cover the reported case.
metadata:
    type: feedback
---

When a package replaces one detection/classification heuristic with a different one (header-name
matching -> value-driven matching), enumerate the inputs the OLD heuristic handled CORRECTLY and run
both through the real load path in two trees. The package's own tests are written from the reported
failure, so they prove the new case works and are silent on what the old one already did.

**Why:** P29/UR-008 replaced `autoDetectColumnMappings` (header names) with
`detectColumnMappingsFromValues` (values). Every new test passed and the whole suite was green, but
the new function picks the LEFTMOST column clearing its 0.8 threshold, so on
`Date,Check No,Description,Amount` it bound `amount` to the CHECK NUMBER, and on
`Date,Description,Balance,Amount` it bound `amount` to the RUNNING BALANCE. BASE got both right. The
one headered fixture in the suite happened to put Amount left of Balance, which is the only
arrangement that hides it. Silently wrong money, presented as success.

**How to apply:** for a replacement heuristic, write a probe that drives the REAL entry point (here
`useImportState.loadFile`, not the pure function) over a sweep of column arrangements, and run the
identical probe in a BASE worktree. Any input where BASE is right and HEAD is wrong is a regression
regardless of suite colour. Note that a "set X aside first" guard usually protects only ONE role —
check whether the role that actually carries the money is protected too. Related:
[[probe-real-module-across-inputs]], [[ab-on-one-renderer]].
