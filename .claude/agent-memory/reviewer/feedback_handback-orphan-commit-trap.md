---
name: handback-orphan-commit-trap
description:
    A handback commit hash in the review brief may be an orphan; verify it is an ancestor of HEAD
    before diffing/campaigning
metadata:
    type: feedback
---

When a review brief names a handback commit hash, verify it is actually reachable from HEAD before
basing any diff, campaign, or verdict on it.

**Why:** Implementors in this multi-agent `specs/007-human-scratch-completion` goal amend their
handback commit after first committing (e.g. to fix the evidence header), which rewrites the hash.
The original hash becomes a DANGLING/ORPHAN commit — `git show <orphan>` still resolves (the trap),
but the commit is not on the branch. In P20B rev 06 the brief named `3f8e2f2`; the real in-history
handback was `ea8f927` (same parent `95dea1b`, same subject). Their trees differed only by the
evidence-file header (7 ins/1 del, zero code).

**How to apply:** Run `git merge-base --is-ancestor <handback> HEAD` (exit 0 = real, non-zero =
orphan). Find the real handback with `git log --oneline <base>..HEAD`. Confirm code equivalence with
`git diff <orphan> <real> --stat` (expect evidence-only delta). Run the load campaign against HEAD's
tree and prove it is constant during the run with `git diff <real> HEAD -- tests/` → 0 lines. See
also [[e2e-load-dependent-flake-validation]] for the campaign method.
