---
name: mutation-probe-test-gaps
description:
    Prove a suspected test gap by deleting the plumbing line in a throwaway git archive tree and
    running the checks, rather than asserting the gap from inspection.
metadata:
    type: feedback
---

When you suspect coverage is missing for a code path, do not report it from reading alone. Delete
the one line that would break it in a disposable `git archive` tree, run typecheck and the unit
suite, and report the observed result. "tsc exit 0, 1810 unit tests passed with the plumbing line
deleted" is a finding; "this looks untested" is a guess.

**Why:** In the P24/UR-003 review the strongest finding was that `resolveMemberName` is optional all
the way down, so deleting `TransactionTable.tsx`'s single plumbing line was invisible to both
typecheck and the entire unit suite. Stated from inspection that would have been a Low-confidence
style note and probably dropped under the 90% rule; demonstrated, it cleared the bar and justified a
carry-forward Q-proposal. It also cut the other way — the mutation confirmed shipped behaviour was
correct, so the finding stayed advisory rather than blocking a PASS.

**How to apply:** Reach for this when a required-prop or discriminated-union argument is claimed to
"make the illegal state unrepresentable". Check the whole plumbing chain for an optional prop with a
`?? default`, which silently reintroduces the bad state. Never mutate the shared checkout — use
`git archive <sha> | tar -x -C /tmp/probe`, symlink `node_modules` from an existing worktree, copy
in any gitignored `.env.local`, run, then delete the probe and verify the shared tree is still clean
and at its original HEAD. Related: [[ab-on-one-renderer]], [[absence-proof-by-grep]].
