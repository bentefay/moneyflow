# HANDOFF — P20B REVIEW dispatch (revision 01 — HS-021 full-codebase sweep) — to `p20b-reviewer-01`

**To:** `p20b-reviewer-01` — a DISTINCT, fresh-context reviewer who did NOT implement P20B.
**From:** root coordinator. This is an independent review dispatch, not an integration. Your job is
to adversarially verify the P20B revision-01 committed range and return a single **VERDICT: PASS**
or **VERDICT: FAIL** with blocking findings enumerated. Root has already run a boundary-level
verify-not-trust and found it clean; you must re-derive everything yourself and go deeper — root's
pass is not yours to inherit.

## Scope under review

- **Package:** P20B — HS-021, "Full-codebase style-guide/code-quality sweep after all feature work."
- **Committed range:** `659ca20..f058a98` (BASE `659ca20` is the P20A Commit-B HEAD; 20
  single-parent commits, no merges). The implementer reported "23 commits" — that is a benign
  miscount; git shows 20. Confirm the count yourself.
- **Evidence to read:** `evidence/P20B/implementation-01.md` (inventory + fixes + Q-proposals §3),
  `implementation-02.md` (E2E + manual charter), `implementation-03.md` (findings B-13/B-14/B-15,
  re-run gate counts, the reverted `pnpm format` incident, Q-13).
- **Requirement text is frozen:** read HS-021 in `specs/human-scratch.md` and the mapped 008 spec
  section. Judge PASS/FAIL against the FROZEN requirement, not against the implementer's evidence.

## What you must independently do

1. **Re-run ALL gates** against a clean checkout of HEAD `f058a98`:
   `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e` plus
   `pnpm build`. Report the REAL counts you observe; do not copy the implementer's. `format:check`
   failing ONLY on pre-existing `specs/**` markdown (including frozen `human-scratch.md`, which must
   NOT be reformatted) is non-blocking; any touched `.ts`/`.tsx` failing oxfmt is blocking.
2. **Re-derive the cast counts** across the range yourself (`as`, `any`, non-null `!` in PRODUCT
   code, excluding tests). Cast counts are grep-PATTERN-sensitive, so state the exact pattern you
   use and compare BASE `659ca20` to HEAD `f058a98` with that SAME pattern. The claim that matters
   is DIRECTIONAL and per-commit-checkable regardless of pattern: net direction DOWN and NO new
   `as`/`any`/`!` introduced into product code by any commit in the range. For reference, root
   re-derived with `git grep -hEn ' as [A-Za-z_{(]' <ref> -- 'src/**/*.ts' 'src/**/*.tsx'`: `as`
   420->369, and `any` (`: any`/`<any>`/`as any`) 9->6, non-null `!` flat — but do NOT try to
   reconcile against any specific figure whose pattern is unstated; use your own pattern and confirm
   the direction.
3. **Verify each behaviour-changing fix is real AND regression-tested** — walk the commits and
   confirm the claimed defect existed and the fix addresses it with a test that fails without it.
   Non-exhaustive list to check: `compareTransactionOrder` NaN for manual rows; snapshot base64
   `RangeError` past ~125 KB; OFX negative-UTC off-by-one; `minDescriptionSimilarity` unenforced;
   module-level import-config mutation (now `readonly` + `structuredClone`); async `beforeunload`;
   dead `dark:` utilities; `detectNumberFormat` sign/space-separator repair
   (`FormattingTab.tsx:138` + `tests/unit/components/formatting-detection.test.ts`); the B-15
   unlock-journey pre-hydration flake fix in `identity.spec.ts` (commit `3a241f8`).
4. **Hunt for missed or newly-introduced violations** — this is a full-codebase style/quality sweep,
   so a spot-check is not enough. Look for style-guide breaches the sweep should have caught but
   didn't, and for any regression the sweep itself introduced.
5. **Explicitly rule on EVERY deferral Q-P20B-00..13** (root has transcribed them into
   `QUESTIONS.md`; the implementer's rationale is in `evidence/P20B/implementation-01.md §3` and
   `implementation-03.md`). For each: is deferral acceptable for HS-021 to be considered met, or
   does it block? Two need special attention:
    - **Q-P20B-00 — `pruneBuckets` concurrent-write data loss** (blocker-class, deliberately left
      unfixed and surfaced). Reproduce the two-peer scenario (including the `moveTransaction` path).
      Decide accept-defer-with-tracked-followup vs bounce. State your reasoning against the frozen
      requirement — HS-021 is a style/quality sweep, so whether a latent CRDT data-loss bug is in
      scope for THIS package is itself a judgement you must make and defend.
    - **Q-P20B-13 — residual `import.spec.ts:301` vault-session-init flake** (~1-in-489, test
      byte-identical to BASE, deliberately not retry-papered). Decide accept vs bounce.
    - Note also Q-P20B-06 (ts-pattern mandated but not installed) and Q-P20B-08 (branded key types
      mandated but absent) are root rule-vs-reality items; assess whether their deferral is honestly
      surfaced, but you need not resolve the rule conflict — flag it to root.

## Boundaries you must confirm untouched (blocking if violated)

- Frozen `specs/human-scratch.md` — byte-identical across the whole range (git blob at HEAD
  `e1c9a8654dc85c051334e0ea57a5a2f50f889d95`, on-disk sha256 `f46c2d35…`).
- `specs/008-.../spec.md` — canonical, unchanged.
- `src/lib/domain/settlement.ts` — blob MUST remain `010f3c93582a2ce311594d4dde8464760ca49c43`
  (FS-001 hard boundary).
- Root-owned files (`PROGRESS.md`, `SCOPE.json`, `QUESTIONS.md`, `HANDOFF.md`, `DECISIONS.md`,
  `FINAL-AUDIT.md`, `reviews/**` except your own file, `tasks/**`) untouched by any implementer
  commit in the range. (Root's own commits `47e197f` and `fd0729c` touched ledgers — that is
  expected and not an implementer violation.)
- No secret material anywhere in code/tests/evidence (no vault master key, invite-fragment bearer
  secret, `crypto_box` secret material, seed phrase, recovery material, `SUPABASE_JWT_SECRET`,
  vault-derived presence key, or vault plaintext). Tests use public/synthetic vectors only. Any real
  leak is BLOCKING and must be reported to root immediately.

## Your write boundary

You may write ONLY `reviews/P20B-review-01.md` and notes under `evidence/P20B/**`. Do NOT edit any
other root-owned file, product code, or tests. Do NOT touch `specs/human-scratch.md`. Do NOT
`checkout`/`reset`/`branch`/`rebase`. No parentheses in any commit message. If you commit your
review, use an explicit pathspec so nothing else is swept in.

## Handback

SendMessage to `main` with: **VERDICT: PASS** or **VERDICT: FAIL**; the exact HEAD you reviewed and
the gate counts you observed; your independently-derived cast counts; a per-fix
real/regression-tested confirmation; a per-deferral ruling for Q-P20B-00..13 (with your Q-P20B-00
and Q-P20B-13 reasoning spelled out); and any blocking findings. Verify every claim against git
before handing back — do not trust the implementer's evidence where you can re-derive from the
commits themselves.
