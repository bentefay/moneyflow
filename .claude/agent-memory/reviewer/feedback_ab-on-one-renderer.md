---
name: ab-on-one-renderer
description:
    Adjudicate a "does the fix change behaviour X" claim by A/B on ONE renderer, not by comparing
    two agents' observations from different environments.
metadata:
    type: feedback
---

When two agents report conflicting observations of the same symptom from different renderers (jsdom
vs real browser, dev vs prod), do not adjudicate by reasoning about which is more authoritative. Run
the A/B yourself on a single renderer: measure with the fix, revert ONLY the fix lines in an
isolated worktree, measure again, restore, and re-verify the tree digest.

**Why:** In P22 rev 02 both prior revisions attributed a duplicate `focus()` call to a lost state
retirement. The A/B showed the browser count was 2 with AND without the fix — identical — proving
the duplicate was a React dev-mode StrictMode double-invoke that predated the fix entirely. No
amount of cross-environment reasoning would have reached that; one A/B did it in minutes.
Corroborate with structural probes (same DOM node via WeakMap, mount count via MutationObserver,
same frame via requestAnimationFrame counter) — a re-render-driven re-assertion must cross a frame
boundary, a StrictMode double-invoke does not.

**How to apply:** Any time a dispatch asks "is defect X still present after the fix", the answer is
an A/B, not an inspection. If the A/B shows no delta, the fix is not the cause and the prior
revision's _mechanism_ claim is disproved even if its _observation_ was real — say so explicitly,
and separate the two in the write-up. See [[e2e-flake-needs-many-runs]].
