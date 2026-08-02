# Reviewer Memory Index

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
