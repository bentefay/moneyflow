# Reviewer Memory Index

- [Own count reused across populations](feedback_own-count-reused-across-populations.md) — a number
  I derived minutes ago for a different population reads as MEASURED in the next sentence; re-run
  the grep per sentence.
- [Modal blocks navigation, not the app](feedback_modal-blocks-navigation-not-the-app.md) — a 60s
  goto timeout while curl returns the route in 121ms is a dialog owning the tab; `eval` reports
  modal state.
- [Handback orphan-commit trap](feedback_handback-orphan-commit-trap.md) — a named handback hash may
  be a dangling amended commit; `git merge-base --is-ancestor` before diffing/campaigning.
- [A/B on one renderer](feedback_ab-on-one-renderer.md) — settle "is the defect still there" by
  reverting only the fix and re-measuring, not by comparing two agents' environments.
- [E2E flakes need many runs](feedback_e2e-flake-needs-many-runs.md) — 3 green full-suite runs miss
  a 1-in-6 flake about half the time; run 6+ with a digest.
- [Absence proof by grep](feedback_absence-proof-by-grep.md) — a grep for a post-rename string
  cannot prove old-tree absence; ask if the command could return this result were the claim false.
- [Verify dispatch disclosure claims](feedback_verify-dispatch-disclosure-claims.md) — before
  failing a missing "self-caught error" disclosure, check the defect exists at all.
- [Mutation-probe test gaps](feedback_mutation-probe-test-gaps.md) — prove a coverage gap by
  deleting the plumbing line in a throwaway tree and running the checks, not by inspection.
- [Mutation probe must match claimed site](feedback_mutation-probe-must-match-claimed-site.md) —
  body stub vs call-site stub differ; mutating the wrong one fabricates a discrepancy that is yours.
- [Copied fixture defeats dependency test](feedback_copied-fixture-defeats-dependency-test.md) — a
  "blast radius" test asserting on a hand-copied literal constrains nothing; mutate the real module.
- [Serialize my own verification load](feedback_serialize-my-own-verification-load.md) — never run
  vitest during my own E2E campaign; it fabricates a red run and forces a restart.
- [Probe the real module across inputs](feedback_probe-real-module-across-inputs.md) — a rewritten
  formatter can regress a whole input class the tests never name; sweep off-path values.
- [Changed-assertion containment test](feedback_changed-assertion-containment-test.md) — enumerate
  what each version accepts and check containment; a loose regex can be written to accept the bug.
- [Re-verify my own manual failures](feedback_reverify-my-own-manual-failures.md) — a browser probe
  failure may be my harness; re-run 10+ times and probe the primitive before reporting it.
- [Node ICU is not browser ICU](feedback_node-icu-is-not-browser-icu.md) — Intl blast radius differs
  between vitest and Chromium; census both or misstate impact in either direction.
- [Replacement-heuristic regression sweep](feedback_replacement-heuristic-regression-sweep.md) —
  when a fix swaps one heuristic for another, A/B the input class the OLD one already handled.
- [Ordering fix serves two callers](feedback_ordering-fix-serves-two-callers.md) — a precedence
  change must be re-censused for every form the code serves; ordering moves a defect, it never
  removes it.
- [Round-trip discriminator blind spot](feedback_roundtrip-discriminator-blind-spot.md) — find what
  the round trip keys on, then build the input class where that key is constant.
- [Rigour proportional to authorisation](feedback_rigour-proportional-to-authorisation.md) — ask
  what a conclusion licenses before acting; destructive acts need proof, cheap ones need a cheap
  check.
- [Failure grep matches test names](feedback_failure-grep-matches-test-names.md) — count
  Playwright's own markers; a broad grep matches WebServer noise and tests whose names contain
  "failed".
- [Flake rate is not a tree property](feedback_flake-rate-is-not-a-tree-property.md) — two campaigns
  on one byte-identical tree differed 1.10 vs 2.25 failures/run; cross-campaign rate comparisons
  support nothing.
- [Predicates inherit unchecked](feedback_predicates-inherit-unchecked.md) — agents re-derive
  handed-down numbers but copy handed-down "the only X" claims forward and re-tag them MEASURED;
  enumerate the set.
- [Dispatch premise contradicts its citation](feedback_dispatch-premise-contradicts-its-own-citation.md)
  — I re-derive handed-down numbers but not handed-down prose; check premises against the artifact's
  own hedges.
- [Sample a transient from document start](feedback_sample-a-transient-from-document-start.md) — a
  post-`goto` poller cannot contain a pre-hydration transient; use `addInitScript` and report the
  window's width.
- [Measure sites before recommending a guard](feedback_measure-sites-before-recommending-a-guard.md)
  — the gap stands on a reading, but "add the guard here" needs a per-site measurement; the remedy
  can break what the gap only documents.
- [Is the new guard itself guarded](feedback_is-the-new-guard-itself-guarded.md) — a revision that
  fixes "nothing detects X being deleted" leaves its own new line unguarded; mutate it, then prove
  the remedy is even feasible.
- [Committed artifact outclaims its evidence](feedback_committed-artifact-outclaims-its-evidence.md)
  — the evidence hedges a mixed measurement while the comment it commits states the universal; grade
  the text the diff contains, not only the document arguing for it.
- [Snapshot leaks the recovery phrase](feedback_snapshot-leaks-recovery-phrase.md) — a bare
  `playwright-cli snapshot` on `/new-user` prints all twelve words as the credential field's
  accessible value, without ever clicking "Click to reveal".
- [Omission direction sets severity](feedback_omission-direction-sets-severity.md) — an incomplete
  enumeration is real, but whether it errs toward hazard or toward safety decides finding vs flag.
- [Probe control flow, not terminal state](feedback_probe-control-flow-not-terminal-state.md) — log
  iterations and elapsed ms, else a 280 ms retry loop reads as a no-op; count branches before
  grading a two-case comment.
