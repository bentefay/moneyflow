# P21 Final-Audit Evidence — Revision 02 (executable completion gate)

- **Package:** P21 (control; final-audit evidence collector; no scratch requirement/marker)
- **Role:** `human_scratch_implementer` acting only as FINAL-AUDIT EVIDENCE COLLECTOR
- **Collector:** `p21-collector-02` (fresh context)
- **BASE == HEAD recorded at start (`git rev-parse HEAD`):**
  `453e9849e5455d2bb2393d667b417c5784802ca7`
- **Product/test tip:** `5576175` (P20B rev 02, test-only identity fix)
- **HEAD at handback:** `453e9849e5455d2bb2393d667b417c5784802ca7` — UNCHANGED. Collector made ZERO
  commits.
- **Date:** 2026-07-27. Node `v22.21.1`, pnpm `11.13.1`.

## TOP-LINE VERDICT: **FAIL-candidate (one blocking finding — the rev-02 headline fix does NOT hold)**

The rev-02 headline was to prove that P20B rev 02 (`5576175`, +4 test-only lines adding
auto-retrying `toHaveClass(/border-green-500/)` / `toHaveClass(/border-destructive/)` waits) fixed
the `tests/e2e/identity.spec.ts:282` flake. **It did not.** Across **five** full retries-disabled
E2E runs, **runs #3 and #5 both reproduced the exact flake at `identity.spec.ts:282`** (2 of 5; ~40%
under this 163-test 4-worker profile) at step "validate BIP39 words with visual feedback" — now
failing at the newly-added `toHaveClass(/border-green-500/)` assertion (5000ms timeout). Per the
dispatch flake rule ("`identity.spec.ts:282` reproducing again IS a FAIL — the fix must hold") and
GOAL DoD ("the complete E2E suite passes under the final audit with no accepted unexplained flake"),
this is a **FAIL**.

Every other audit dimension (reconciliation/provenance, FS-001 boundary, static gates, full
unit/property/integration suite, production build, performance, security/secret inspection,
migrations, A–H canonical coverage, console/network) is **GREEN** and byte-identical to rev 01. The
finding is a **test-quality hydration-timing race**, not a product/data/security/logic defect — the
product BIP39 visual-feedback styling is correct.

---

## 0. Write-boundary & HEAD provenance (VERIFIED)

- Start `git rev-parse HEAD` = end = `453e9849e5455d2bb2393d667b417c5784802ca7`. My only persistent
  write is this evidence file. I ran NO `git add/commit/checkout/reset/branch/rebase/stash`.
- `git diff --stat 5576175..HEAD` touches ONLY `specs/**` (6 files: `HANDOFF.md`, `PROGRESS.md`,
  `QUESTIONS.md`, `evidence/P20B/implementation-04.md`, `reviews/P20B-review-02.md`, and
  `specs/human-scratch.md` — the authorized HS-021 forward marker at `:159`). **NO
  `src/**`, NO `tests/**`.** Scope gate PASSES.
- `git log --format="%h %an %s" 5576175..HEAD` = 5 root-owned `docs`/`docs(P20B)` control-plane
  commits (`453e984`, `8a0631a`, `daf80ff`, `da60981`, `5ce72e4`), all `Ben Tefay`. No collector
  commit.
- `git log --merges` over the goal range = **0 merges**; strictly linear single-parent history.
- `git status --porcelain`: ` M next-env.d.ts` (Next-generated, benign churn),
  `?? evidence/P08/implementation-01.md` (inert untracked stray, see §Stray),
  `?? evidence/P21/norm_check.py` (reused reconciliation script), plus this evidence file. No
  product/test/migration change.

## 1. Reconciliation & provenance (GREEN)

- **Frozen scratch whole-file SHA:** `sha256sum specs/human-scratch.md` =
  `469e98c7c8ee842acfc08e0844a47b4bc6495111b0463d8ca14727d3949d2f6a` == PROGRESS rolling SHA. MATCH.
- **Frozen scratch identity:** current file is 350 lines / **24,260 bytes**; the frozen pristine
  identity `b91ca932d536285fc3e47091baea176ab2f4c314d02147e61df3615ff8cd5e8b` is 350 lines / 24,239
  bytes. Byte delta is exactly **+21** = the 21 authorized `- [] -> - [x]` marker flips. Frozen
  identity intact.
- **Normalized SCOPE byte-match (`evidence/P21/norm_check.py`, reused):** **21 blocks checked, 0
  mismatches** (each human-scratch SCOPE block byte-matches `sourceTextLines` after canonicalizing
  the checkbox token). FS-001 correctly skipped (no marker). Exit 0.
- **FS-001 canonical:** `sha256sum 008/spec.md` =
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`; `wc -l` = **715**; `wc -c` =
  **25,441**. `git rev-parse HEAD:src/lib/domain/settlement.ts` blob =
  `010f3c93582a2ce311594d4dde8464760ca49c43`. ALL match the frozen boundary.
- **Requirement/package rows:** PROGRESS reconciliation table shows all **21 HS-\* rows + FS-001 =
  22/22 `passed`**, all 21 feature packages P00–P20B `passed`. HS-021 RE-PASSED after P20B rev 02
  (forward marker re-applied `[] -> [x]` at scratch `:159`, rolling `f46c2d35… -> 469e98c7…`). Only
  P21 open (the expected `changes_requested` under audit).
- **No active rollback batch:** `RB-P21-01` COMPLETED + cleared. No `rollback_pending`,
  `completion_pending`, or prepared/active batch remains. Canary invariant `canary==1` asserted in
  the ledger current-state and consistent (single canonical current-position/rolling-SHA state, no
  duplicated ledger state).
- **Carry-forward Q set surfaced in QUESTIONS.md:** Q-P20B-00 (`pruneBuckets` CRDT data loss),
  Q-P20B-14 (`import.spec.ts:1527` environmental), Q-P20B-13 (`import.spec.ts:301`), Q-P20A-05
  (`duplicates.test.ts`), Q-P17D-02 (dead `description-rule-state.ts`), Q-P20A-02 (stale XChaCha20
  comments), Q-P20B-06/08 (rule-vs-reality). All present.

## 2. Dependency currency + P03 release gate (GREEN, carried)

Pinned key deps (`package.json`): `next 16.2.10`, `react 19.2.7`, `@trpc/server 11.18.0`,
`zod 4.4.3`, `loro-crdt 1.13.7`, `loro-mirror 2.2.0`, `libsodium-wrappers 0.8.4`,
`@supabase/supabase-js 2.110.7`, `typescript 6.0.3`, `vitest 4.1.10`, `@playwright/test 1.61.1`.
Node `v22.21.1`, pnpm `11.13.1`. Byte-identical to rev 01 (no product range delta). P03 (HS-018)
remains the passed release-gate authority; no version changed.

## 3. Migrations & compatibility (GREEN)

Ordered SQL migrations present: `005_vault_ops.sql`, `006_rls_hardening.sql`,
`007_realtime_authorization.sql`, `008_realtime_authorization_lifecycle.sql`,
`009_remove_unused_user_state.sql`, `010_passkey_credentials.sql`. IndexedDB/vault compat:
`src/lib/crdt/migration.ts` (`migrateVaultSentinels`) and graceful cold-cache fallback
(`src/lib/sync/manager.ts` `disableLocalPersistence`, 10 call sites) — unchanged from rev 01
(byte-identical product). Exercised by unit/integration suite (env-gated realtime stack).

## 4. Static gates + full unit/property/integration tests (GREEN)

| Gate                      | Command                               | Exit | Result                                                                                                                                      |
| ------------------------- | ------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Format                    | `pnpm format:check` (`oxfmt --check`) | 1    | **NON-BLOCKING (out of scope)** — 15 files, ALL `specs/**` markdown (ledgers/evidence/reviews + `human-scratch.md`). **Zero `.ts`/`.tsx`.** |
| Lint                      | `pnpm lint` (`eslint`)                | 0    | 0 errors, **1 pre-existing warning** `TransactionTable.tsx:401` (react-compiler incompatible-library advisory).                             |
| Typecheck                 | `pnpm typecheck` (`tsc --noEmit`)     | 0    | 0 errors.                                                                                                                                   |
| Build                     | `pnpm build` (`next build`)           | 0    | Compiled 5.7s; TypeScript 10.3s; **17 static pages** generated.                                                                             |
| Unit/property/integration | `pnpm test` (`vitest run`)            | 0    | **111 files, 2091 passed, 2 skipped, 0 failed** (73.6s).                                                                                    |

The 2 skipped are the env-gated performance benchmarks (run explicitly in §7). The bare
`format:check` drift is pre-existing `specs/**` ledger churn only — out of scope per dispatch, not a
FAIL.

## 5. E2E — retries disabled + repeated critical journeys (BLOCKING FAIL)

`pnpm exec playwright test --retries=0 --reporter=list` (163 tests, 4 workers), repeated:

| Full run | Result                           | `identity.spec.ts:282`                                      |
| -------- | -------------------------------- | ----------------------------------------------------------- |
| #1       | **163 passed / 0 failed** (3.9m) | ✓ pass                                                      |
| #2       | **163 passed / 0 failed** (3.8m) | ✓ pass                                                      |
| #3       | **162 passed / 1 FAILED** (3.9m) | ✘ **FAILED** at "validate BIP39 words with visual feedback" |
| #4       | **163 passed / 0 failed** (3.9m) | ✓ pass                                                      |
| #5       | **162 passed / 1 FAILED** (3.8m) | ✘ **FAILED** (same test, same title, same assertion)        |

**Reproduction rate: 2 of 5 full retries-disabled runs failed at `identity.spec.ts:282`** (runs #3
and #5); runs #1, #2, #4 passed. Two independent reproductions at the identical test / line / step
title confirm this is a live, non-negligible (~40% under this 163-test 4-worker profile) flake — not
a one-off. Run #5 EXIT=1 with the identical single failing test
`tests/e2e/identity.spec.ts:282:9 … "unlock journey: enter seed phrase and access transactions"`
(the spec's `test.describe` title; the failing step is "validate BIP39 words with visual feedback").

**Focused isolation:** `identity.spec.ts:282 --repeat-each=20 --workers=1 --retries=0` → **20/20
passed** (1.7m). The step passes deterministically in isolation; it only fails under full 163-test
parallel load.

Both tracked residual flakes behaved as documented across the passing runs: `import.spec.ts:301`
(Q-P20B-13) and `import.spec.ts:1527` (Q-P20B-14) PASSED; `duplicates.test.ts` (Q-P20A-05) is a unit
test (passed in §4).

### 5A. BLOCKING finding — `identity.spec.ts:282` reproduces; the rev-02 fix does not hold

- **Failure (run #3):** `expect(locator).toHaveClass(/border-green-500/)` timed out after 5000ms at
  `tests/e2e/identity.spec.ts:359`. The captured `[data-testid="seed-word-input-0"]` had
  **`value=""`** (empty) and class stuck at `border-input` (neutral) across all 14 auto-retry polls;
  `aria-invalid="false"`.
- **Mechanism (product correct; test-timing race):** each word input is a **controlled** React input
  — `value={word}` bound to `words` state (`SeedPhraseInput.tsx:331`),
  `onChange={(e) => handleWordChange(index, e.target.value)}` (`:332`); the validity class derives
  from a `useMemo` on `words` (`:120`, applied at `:342-344`). When Playwright's `fill("abandon")`
  lands **before React hydration attaches the onChange handler**, the fill is dropped: `onChange`
  never fires, `words` stays empty, and the next controlled re-render **overwrites the DOM value
  back to `""`**. The preceding `toHaveValue("abandon")` (line 356) momentarily passes on the raw
  post-fill DOM value, then the state-driven re-render reverts it, so the class never flips to
  `border-green-500` and the new wait times out.
- **Why the fix does not hold:** P20B rev 02 added `toHaveClass(/border-green-500/)` /
  `toHaveClass(/border-destructive/)` waits, but these cannot succeed when the underlying `words`
  state is genuinely empty (the fill was dropped). The fix merely **relocated** the failure from the
  original `.not.toBe` class comparison to the new `toHaveClass` wait — same root cause
  (pre-hydration dropped fill), converting a fast comparison failure into a 5s-timeout failure at
  the same step.
- **Classification:** pre-existing hydration-timing E2E flake; product BIP39 feedback is correct;
  NOT a data/security/logic defect. Load-dependent (20/20 in isolation; reproduces in 2 of 5 full
  runs under the 163-test 4-worker profile — the same profile as the tracked `import.spec.ts:301`
  race, but a DISTINCT test that the audit explicitly requires to hold).
- **Why blocking:** the dispatch flake rule states `identity.spec.ts:282` reproducing again IS a
  FAIL; GOAL DoD requires a clean full-suite E2E under final audit. Both violated.
- **Recommended routing (root):** a genuine fix must guarantee the fill triggers `onChange` after
  hydration (e.g. gate the fill on a hydration signal, retry the fill until BOTH `toHaveValue` and
  the validity class stick, or use `pressSequentially` after confirming interactivity) rather than
  only waiting on the resulting class. No product change indicated. Owner: P20B (cross-cutting
  test-quality) / identity-onboarding E2E lineage. The residual should be tracked as a Q rather than
  silently retried.

## 6. Security & secret/plaintext inspection (GREEN — no exposure)

- **Cross-vault rejection (E2E, PASS in every passing run):** `realtime-security.spec.ts`,
  `realtime-recovery.spec.ts` ("a hidden client that was never entitled to a vault still sees
  nothing after foregrounding"), `invite-redemption.spec.ts`, `passkey.spec.ts` (revocation scoping,
  last-passkey guard, "no PRF output, master secret or phrase ever leaves the browser"). The
  `[WebServer] ⚠️ tRPC failed on realtime.revoke/vault.list/sync.pushOps: … authentication` lines
  are expected negative-path rejections of unauthenticated/torn-down sessions, not failures.
- **Secret/plaintext scan:** repo scan for
  `SUPABASE_JWT_SECRET|SERVICE_ROLE_KEY|BEGIN … PRIVATE KEY` and long base64/hex literals matched
  only env-var-NAME references in server/test code — no hardcoded secret values, no key literals in
  fixtures. Only synthetic public BIP39 vectors (`abandon…`) appear in tests. Tracked env files:
  `.env.local.example` (template), `.envrc`. **No vault master key, seed/recovery material, crypto
  secret, SUPABASE_JWT_SECRET, invite bearer or vault plaintext in any log/URL/fixture/evidence.**

## 7. Performance (GREEN — §14 measured-evidence branch)

- **Allocation (<100ms):** `P16A_BENCHMARK=1 vitest run allocation.test.ts -t benchmark` → **1
  passed** (internal conservation checksum + sub-100ms derive/apportion assertions hold). Product
  (`allocation.ts`) byte-identical to rev 01, whose measured figure was ≈**1.77ms** per full
  derive-effective + apportion cycle over 200 people (checksum `-246,913,580,250`). No regression.
- **Settlement scale (100k):** `P16B_BENCHMARK=1 vitest run settlement.test.ts -t benchmark` → **1
  passed** (per-position sum = 0, per-obligation source-sum conservation, 0 issues at 100k). Product
  (`settlement.ts` blob `010f3c93…`) byte-identical to rev 01, whose measured figures were 10k=78ms,
  50k=401ms, 100k≈790ms mean (near-linear). **§14 disposition:** the ~0.8s vs "approximately 200ms"
  is the frozen spec's explicit measured-evidence-with-follow-up branch (Q-033 / R-020 open); no
  marketing claims 200ms. Non-blocking, unchanged from rev 01.

## 8. Manual product journey (GREEN — via full suite; product byte-identical to rev 01)

No `src/**` changed since rev 01 (verified §0), so the shipped product surface is byte-identical.
The complete manual journey — recovery/passkey create/unlock/add/revoke/fallback, vaults,
imports/drop zones/provenance/amount-tooltip/delete, transactions/empty rows/grid keyboard UX,
aliases, tags, allocations, automations (apply-this/all/new), undo/redo, people/per-currency
obligations/source navigation, invites/two-user realtime/presence, duplicate/multi-tab convergence,
offline recovery, and marketing truthfulness (`landing.spec.ts` "advertises no budgeting capability"
/ "exposes no dead placeholder links") — is exercised by the 162 passing E2E journeys in each of my
runs and matches rev 01's live headless-CLI landing/role-name/contrast confirmation (byte-identical
product). No live CLI regression possible without a product change.

## 9. Responsive / state matrix (GREEN via suite)

Covered by passing E2E every run: mobile reflow & no horizontal overflow (`landing.spec.ts:73`,
mobile menu `:59`), theme contrast + zoomed visible geometry (`import.spec.ts:629`,
`people-settlement.spec.ts:670` "stable across themes and widths"), zoomed virtualized viewport
(`import.spec.ts:1064`), offline catch-up (`realtime-recovery.spec.ts:176`), duplicate/multi-tab
convergence (`description-aliases.spec.ts:412`, `tab-duplication.spec.ts`, `presence.spec.ts`),
refresh/persistence (`sync-persistence.spec.ts`, presence-after-reload), pointer/keyboard/focus
(`automations.spec.ts:134`, `passkey.spec.ts:445` keyboard-only unlock).

## 10. Accessibility — role/name/state + contrast (GREEN)

Deterministic accessible role/name/state assertions and applicable computed contrast are asserted
within the passing suite (theme-contrast tests §9; keyboard-operable obligations
`people-settlement.spec.ts:670`) and match rev 01's live CLI snapshot of the landing tree
(`navigation "Global"`, `heading[1] "Categorise and allocate shared money"`,
`link "Create a vault"`) and CTA contrast ≈15:1 (near-white on near-black), well above WCAG AA
4.5:1. Product byte-identical.

## 11. Exhaustive FS-001 audit (GREEN)

- **Signed unit conservation:** `settlement.test.ts` benchmark asserts per-position sum = 0 and
  per-obligation source-sum = obligation amount at 100k; `allocation.test.ts` conserves positive,
  negative and zero amounts for ownership/effective weights.
- **Canonical examples A–H — BOTH layers present and passing every run:**
    - **Unit/production:** `tests/unit/domain/settlement.test.ts` `Example A … Example H` (8 named,
      lines 623-720).
    - **E2E:** `tests/e2e/people-settlement.spec.ts` `canonical example A … H` (8 named journeys,
      lines 104-249) — all PASS in every full run.
- **Reject-never-clamp / typed issues:** `settlement.test.ts` rejects non-record
  allocation/ownership containers, hidden financial values, invalid Gregorian discriminators, etc.
  atomically with typed issues; allocation apportionment rejects weights not totalling exactly 100
  and non-integer/unsafe minor units.
- **Sole per-currency settlement engine:** `src/lib/domain/settlement.ts` exposes the single
  `calculateSettlementBalances` engine; `settlement.test.ts` "sole settlement authority > removes
  the competing balance implementation and compatibility alias" and "never nets obligations across
  currencies"; no competing computation in `src/lib/domain`. `settlement-view.test.ts` "No field
  anywhere in the view can express a cross-currency total."
- **Traceable obligations / navigation / P16C paths / P17 complete-set:**
  `people-settlement.spec.ts` mandatory journey (allocate, settle, trace, persist, exclude, restore,
  reverse), View-transaction deep link, add-row/edit/bidirectional/deleted-person/invalid-ownership
  matrices; `field-rule-parity.spec.ts` column-per-person whole-set grid + four-mode apply. FS-001
  boundary intact (§1).

## 12. Console / network + open Q proposals (restated so none is dropped)

- **Console/network:** the only recurring stderr lines are expected negative-path auth rejections
  (`tRPC failed on realtime.revoke/vault.list/sync.pushOps: … authentication`) during
  teardown/unauthenticated steps, plus benign `SyncManager error: Failed to fetch` /
  `Local vault cache unavailable; continuing with direct server sync` during the intentional
  offline/cold-cache tests. No unexpected suspicious network activity; no sensitive data in
  URLs/payloads.
- **Open Q proposals (all present in QUESTIONS.md, carried open):** Q-P20B-00 (`pruneBuckets` CRDT
  data loss), Q-P20B-14 (`import.spec.ts:1527` environmental), Q-P20B-13 (`import.spec.ts:301`
  vault-session bootstrap race), Q-P20A-05 (`duplicates.test.ts` timing), Q-P17D-02 (dead
  `description-rule-state.ts`), Q-P20A-02 (stale XChaCha20 comments), Q-P20B-06/08 (rule-vs-reality:
  ts-pattern / branded keys), Q-033 (100k/200ms measured-evidence branch, R-020 open).
- **NEW (proposed):** `identity.spec.ts:282` hydration-timing flake is NOT resolved by P20B rev 02
  and should be tracked as a Q and re-routed for a genuine fix (§5A).

## Stray classification — `evidence/P08/implementation-01.md`

Untracked (`git ls-files` empty), self-labeled "Intentionally UNCOMMITTED", references old BASE
`97d85844` (outside every committed range). Inert; harmless; not deleted (out of collector write
scope; PROGRESS records it as inert).

---

## PROPOSED FINAL-AUDIT DISPOSITION (root transcribes only after an independent P21 PASS)

> This audit returns **FAIL-candidate**, so FINAL-AUDIT.md must NOT be transcribed as PASS. The
> verdict line must remain FAIL until `identity.spec.ts:282` is genuinely remediated (not merely
> re-waited) and a clean full-suite retries-disabled E2E is obtained under a NEW P21 revision.

- Blocking: complete E2E did not pass clean under final audit — 5 full runs =
  pass/pass/FAIL/pass/FAIL, i.e. `identity.spec.ts:282` "validate BIP39 words with visual feedback"
  reproduced in **2 of 5 runs (#3, #5; ~40%)** at the newly-added `toHaveClass(/border-green-500/)`
  wait (5000ms timeout, `value=""`); 20/20 in isolation. The P20B rev-02 fix relocated but did not
  resolve the pre-hydration dropped-fill race. Violates the flake rule and GOAL DoD. All other 11
  dimensions GREEN.
- git: BASE == HEAD `453e9849…`; range `5576175..HEAD` = specs-only (root ledgers + HS-021 marker),
  product/test range EMPTY; goal range strictly linear, 0 merges.
- Frozen: human-scratch sha256 `469e98c7…` (350 lines / 24,260 bytes = frozen `b91ca932…` 24,239 +
  21 markers); 008 spec sha256 `0d0e2a14…` / 715 lines / 25,441 bytes; settlement.ts blob
  `010f3c93…`. All match. norm_check 21/0.
- Gates: format:check exit 1 (15 files ALL specs/\*\* markdown, non-blocking, 0 ts/tsx); lint exit 0
  (0 errors, 1 pre-existing warning); typecheck exit 0; build exit 0 (17 pages); test 111 files /
  2091 passed / 2 skipped / 0 failed.
- Performance: P16A + P16B benchmarks pass; measured figures byte-identical to rev 01 (~1.77ms
  allocation; ~790ms 100k settlement, near-linear); §14 measured-evidence branch.
- Security: cross-vault/realtime/invite/passkey rejections pass; secret/plaintext scan CLEAN.
- Reconciliation: 22/22 requirements passed; 21 authorized HS markers (HS-021 re-passed); FS-001
  markerless; no active rollback batch; no unclassified drift; canary==1.

## Handback checklist (collector)

- HEAD at handback `453e9849e5455d2bb2393d667b417c5784802ca7` == recorded BASE; ZERO collector
  commits.
- `git status --porcelain`: ` M next-env.d.ts` (generated), `?? evidence/P08/implementation-01.md`
  (inert stray), `?? evidence/P21/norm_check.py` (reused script),
  `?? evidence/P21/implementation-02.md` (this file). No product/test/migration change.
- Verdict: **FAIL-candidate** — single blocking finding (§5A: `identity.spec.ts:282` reproduces; the
  rev-02 fix does not hold). All other dimensions GREEN.
- Secret-safety: no exposure found. Disposable browser/test state cleaned up.
