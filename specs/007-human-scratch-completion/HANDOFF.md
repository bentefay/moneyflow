# HANDOFF — P20B pre-review reconciliation (revision 01 — HS-021 sweep) — to `p20b-implementer-01`

**To:** `p20b-implementer-01` (same implementer, resumed from your own transcript). **From:** root
coordinator. This is NOT a review verdict. Your committed range `659ca20..9ab6119` verifies clean at
the boundary level — but two things must be reconciled before an independent reviewer can be
dispatched, because a reviewer must read evidence that matches the code and run gates that reflect
the committed tree.

## Context — what root already saw

You self-committed the previously-uncommitted import work as
**`9ab6119 fix(P20B): make import config immutable and repair amount-format detection`** on top of
`5fbc0ed`. Root verified `9ab6119` read-only: it touches only import product/test files, no
root-owned files, frozen sources and `settlement.ts` are byte-identical (blob
`010f3c93582a2ce311594d4dde8464760ca49c43`), and it adds no `as`/`any`/non-null `!` to product code.
Good. The worktree is now clean of product drift. Two gaps remain.

## Gap 1 — evidence now contradicts the code (must fix)

`evidence/P20B/implementation-01.md §3 Q-P20B-11` still states that number-format auto-detection
"still fails; completing it needs a component file that was being edited concurrently" — i.e.
deferred. But `9ab6119` FIXES exactly that: `detectNumberFormat` now handles signed magnitudes and
space thousands separators, with `tests/unit/components/formatting-detection.test.ts` as regression
cover. The evidence and the tree disagree.

- Update `Q-P20B-11` (and the corresponding number-format row in your inventory, and any "deferred"
  tally) to state the fix is now LANDED in `9ab6119`, with the file:line and the regression test
  named. If any residual really is still deferred, scope it precisely to what remains, not the whole
  item.
- Root has already transcribed the Q-proposals into `QUESTIONS.md` as `Q-P20B-00..12`; do NOT edit
  `QUESTIONS.md` (root-owned). Just make your own evidence internally consistent — root will re-sync
  the QUESTIONS entry from your corrected evidence.

## Gap 2 — gates must reflect the committed tree (must re-run)

Your previously reported counts (typecheck clean; lint 0e/1w; test 2081/2 skip/110 files; build ok;
e2e 163; flake 213/213) were measured while these changes were uncommitted, so they describe a dirty
tree. Re-run everything against the clean committed HEAD `9ab6119` and report the REAL counts:

`pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e` plus `pnpm build`.
Re-run the affected import E2E journeys with retries disabled and re-sample flake. `format:check`
failing only on pre-existing `specs/**` markdown (including frozen `human-scratch.md`, which must
NOT be reformatted) is non-blocking; any touched `.ts`/`.tsx` failing oxfmt is blocking.

## Still binding

- No new `as`/`any`/non-null `!` in product code; net direction stays DOWN.
- Do NOT touch `specs/human-scratch.md`, `specs/008-.../spec.md`, or `src/lib/domain/settlement.ts`.
- Do NOT edit root-owned files (`PROGRESS.md`, `SCOPE.json`, `QUESTIONS.md`, `HANDOFF.md`,
  `DECISIONS.md`, `FINAL-AUDIT.md`, `reviews/**`, `tasks/**`). Your writes are
  product/test/`.claude`
    - your own `evidence/P20B/**`.
- No secret material anywhere. No parentheses in commit messages. No checkout/reset/branch/rebase.
- Leave the untracked stray `evidence/P08/implementation-01.md` alone — not yours; root tracks it.
- The tree must end clean: `git status --porcelain` (excluding `next-env.d.ts` generated churn and
  your own `evidence/P20B/**`) empty at re-handback.

## Handback

SendMessage to `main` with: the final HEAD SHA (a small `docs`/evidence commit on top of `9ab6119`
is expected for Gap 1) and the chain from `9ab6119`; confirmation the `Q-P20B-11` evidence now
matches the committed fix; the REAL re-run gate counts against the clean tree; and
`git status --porcelain` proof the tree is clean. Verify against git before handing back. After
this, root re-verifies the delta and dispatches a DISTINCT `p20b-reviewer-01` over the full range.
