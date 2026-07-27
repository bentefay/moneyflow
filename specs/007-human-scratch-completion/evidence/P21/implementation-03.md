# P21 Final-Audit Evidence — Revision 03 (executable completion gate; collector phase)

- **Package:** P21 (control; final-audit evidence collector; no scratch requirement/marker)
- **Role:** `human_scratch_implementer` acting ONLY as FINAL-AUDIT EVIDENCE COLLECTOR (candidate;
  not the formal verdict — a DISTINCT reviewer reruns high-risk gates next).
- **BASE (charter):** `127990a`. **Actual HEAD at audit:** `28858e2` — see §0 drift note.
- **Environment:** Node `v22.21.1`, pnpm `11.13.1`, Linux. All UTC timestamps.
- **Candidate verdict:** **FAIL** — one blocking finding **F-1** (production dependency-currency /
  security: 9 known `next` advisories, 5 HIGH, fixed by an available compatible-safe-chain patch
  bump). All other gates GREEN. See §13.

---

## 0. Range / drift reconciliation (contract 1; charter start/end HEAD check)

- `git rev-parse HEAD` at start AND end = `28858e203bbd1e169195731f3ac776a3c9d4b4f6` (`28858e2`).
- `28858e2` = root's own dispatch commit **"docs: dispatch P21 rev 03 collector at BASE 127990a"**.
  `git diff --name-only 127990a..HEAD` = **exactly one file, `HANDOFF.md`** (docs). No product,
  migration, test, ledger, marker or spec-under-audit changed between BASE `127990a` and HEAD.
- Product provenance `git diff --stat 5576175..HEAD -- . ':(exclude)specs'` = exactly the two
  test-only files from the entry state (`tests/e2e/passkey.spec.ts`,
  `tests/e2e/transactions.spec.ts`). **No product-source change** since the last audit BASE.
- History linear: `git log --merges 5576175..HEAD` empty; `git rev-list --parents` shows all
  single-parent (no merge commits).
- Working tree at start and end: only the two inert strays (` M next-env.d.ts`,
  `?? evidence/P08/ implementation-01.md`) — left untouched. My scratch logs are under a gitignored
  `*.log` path and were removed at the end (§14).
- **Assessment:** The audited product/test/migration tree is byte-identical to `127990a`; the only
  delta is root's docs dispatch commit to `HANDOFF.md`. This is the expected "root dispatched on top
  of BASE" pattern, NOT product/commit drift. **Reported to root** as a start-of-audit note; not a
  disqualifying drift. Root must confirm HEAD==BASE convention before dispatching the reviewer.

## 1. Scope / package / review / requirement / marker reconciliation (contract 1)

- **21 feature packages P00–P20B all `passed`** (PROGRESS.md package ledger). Only control **P21**
  is `changes_requested` (rev 02 FAILED; this rev 03 is its successor).
- **22 first-class requirement rows all `passed`**: HS-001..HS-021 (`authorized` marker + `passed`)
  and whole-file `FS-001` (`passed`).
- **Rollback batch drained:** rev-02 failure (blocking flake `transactions.spec.ts:696`, Q-P20B-15)
  batched HS-021 via RB-P21-02; HS-021 rolled back to `[]`, P20B fixed (test-only), independently
  confirmed by DISTINCT `p20b-reviewer-03` (8/8 clean `--retries=0` runs), then HS-021 re-applied
  forward (`f46c2d35… -> 469e98c7…`, authorized IDs 20 -> 21). No `rollback_pending`,
  `completion_pending`, prepared/active batch, or `changes_requested` feature package remains.
- **Scratch checksum:** `sha256sum specs/human-scratch.md` =
  `469e98c7c8ee842acfc08e0844a47b4bc6495111b0463d8ca14727d3949d2f6a` (== rolling PROGRESS SHA);
  **24,260 bytes**, **43 checked `[x]` / 0 unchecked `[ ]`**. Matches entry state exactly.
- **Normalized-block identity:** `norm_check.py` (canonicalize checkbox token, byte-compare each
  SCOPE `sourceTextLines` block) → **21 blocks checked, 0 mismatches** (FS-001 skipped — no
  sourceTextLines).
- **Frozen source identity** `b91ca932…` recorded consistently in SCOPE.json
  `frozenWorkingCopySha256`, BASELINE, PROGRESS, DECISIONS (original 350 lines / **24,239 bytes**).
  Current 24,260 bytes = 24,239 + **exactly 21 bytes** = the 21 authorized `[ ]`→`[x]` single-char
  marker flips. Reconciles.
- **FS-001 immutability:** `specs/008-.../spec.md` SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, **715 lines / 25,441 bytes** —
  exact match; source never edited. Alias P11A–C and automation P17A–D all `passed`; P16A–E all
  `passed` before FS-001 ledger completion.

## 2. Dependency currency + P03 primary-source release-gate recheck (contract 2) — **F-1 raised**

Pinned key deps: `next 16.2.10`, `react 19.2.7`, `@tanstack/react-virtual 3.14.6`,
`@trpc/server 11.18.0`, `zod 4.4.3`, `loro-crdt 1.13.7`, `loro-mirror 2.2.0`,
`libsodium-wrappers 0.8.4`, `@supabase/supabase-js 2.110.7`, `typescript 6.0.3`, `vitest 4.1.10`,
`@playwright/test 1.61.1`.

- **P03 external gate (TanStack Virtual PR #1100 / `useFlushSync`): GREEN.** Primary-source
  confirmed: PR #1100 shipped since `@tanstack/react-virtual@3.13.15`; installed `3.14.6` exposes
  `useFlushSync?: boolean` in `node_modules/@tanstack/react-virtual/dist/esm/index.d.ts:12`;
  `TransactionTable.tsx:407` legitimately passes `useFlushSync: true` on the real released API (not
  "pretending"). Latest 3.14.8 available; installed 3.14.6 is on the released-gate line. Gate closed
  correctly.
- **`pnpm audit --prod`: 10 advisories (5 HIGH, 5 MODERATE)** — the primary-source recheck this
  charter requires (prior collectors rev 01/02 explicitly did NOT run it: "no primary-source
  advisory re-fetch"). Breakdown:
    - **9× `next`** (installed `16.2.10`), all patched in **`>=16.2.11`**: HIGH — App Router
      middleware/proxy **auth bypass**, DoS via Server Components, **SSRF in Server Actions**, SSRF
      in rewrites; MODERATE — cache confusion of response bodies (×2), unbounded Edge Server-Action
      payload, image-optimization DoS, unauthenticated internal Server-Action disclosure.
    - **1× `sharp`** (transitive, image optimization), patched `>=0.35.0`.
- **Primary-source currency (registry.npmjs.org):** `next` `16.2.10` released 2026-07-01;
  **`16.2.11` released 2026-07-21**; **`16.2.12` (dist latest) released 2026-07-25** — BOTH
  available before this audit and before prior P21 rev 01/02 ran. The remedy is a **compatible
  safe-chain patch bump (16.2.10 → 16.2.12)** — precisely the P01/HS-002 mandate ("Upgrade
  dependencies by compatible safe chains"). See **F-1 (§13)**.

## 3. Migrations + IndexedDB/vault compatibility (contract 3)

- Ordered SQL migrations present: `supabase/migrations/005_vault_ops.sql`, `006_rls_hardening.sql`,
  `007_realtime_authorization.sql`, `008_realtime_authorization_lifecycle.sql`,
  `009_remove_unused_user_state.sql`, `010_passkey_credentials.sql`.
- Fresh + upgrade + RLS audit SQL present: `tests/database/legacy-upgrade-audit.sql` (179 lines),
  `legacy-upgrade-fixture.sql` (60), `rls-audit.sql` (483).
- IndexedDB/vault upgrade: `src/lib/crdt/migration.ts` (`migrateVaultSentinels`) + graceful
  cold-cache fallback (`src/lib/sync/manager.ts` `disableLocalPersistence`). Exercised by
  unit/integration suite (`tests/unit/sync/manager.test.ts`,
  `tests/unit/domain/automation/ migration.test.ts`, crdt migration tests) — all green in §4.
  Runtime SQL execution requires a live Supabase instance (not provisioned in this env); reconciled
  from passed P04/P16 reviews + the passing unit/integration coverage. No plaintext leakage path in
  migration code (client encrypts before persistence; sentinel migration operates on
  already-encrypted vault docs).

## 4. Static gates + unit/property/integration tests (contract 4) — **GREEN**

| Gate                      | Command                     | Exit                     | Duration | Result                                                                                                                                                                                                                                                                                      |
| ------------------------- | --------------------------- | ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck                 | `pnpm typecheck`            | **0**                    | ~3s      | clean                                                                                                                                                                                                                                                                                       |
| Lint                      | `pnpm lint` (eslint)        | **0**                    | ~11s     | 0 errors, **1 KNOWN-ACCEPTABLE warning** `TransactionTable.tsx:401` `react-hooks/incompatible-library` (TanStack `useVirtualizer` cannot be memoized safely; pre-existing)                                                                                                                  |
| Format                    | `pnpm format:check` (oxfmt) | **1 (KNOWN-ACCEPTABLE)** | ~4s      | **15 files, ALL under `specs/**`frozen markdown** (ledgers/evidence/reviews +`human-scratch.md`). **Zero `.ts`/`.tsx`/product/test source.** Known frozen-spec reflow hazard (the formatter WANTS to reflow frozen files but MUST NOT). Verified: no non-`specs/` file in the flagged list. |
| Unit/property/integration | `pnpm test` (vitest)        | **0**                    | 73.43s   | **111 files, 2091 passed, 2 skipped**                                                                                                                                                                                                                                                       |

- **The 2 skips are EXPLAINED (not unexplained):** opt-in perf benchmarks gated by env —
  `allocation.test.ts` (`it.runIf(P16A_BENCHMARK==="1")`) and `settlement.test.ts` 100k benchmark
  (`it.runIf(P16B_BENCHMARK==="1")`). Both run and pass under §7. No arbitrary sleeps / shared
  ordering / retry-dependent unit outcomes.

## 5. Full E2E, retries disabled, repeated for flake exposure (contract 5) — **GREEN**

Command (both runs): `pnpm exec playwright test --retries=0 --reporter=list` (config: 4 workers,
`retries:0` non-CI, 30s timeout, webServer `pnpm run dev`).

| Run   | Result                  | Duration | Failures | Flaky |
| ----- | ----------------------- | -------- | -------- | ----- |
| Run 1 | **163 passed** (EXIT 0) | 3.9m     | 0        | 0     |
| Run 2 | **163 passed** (EXIT 0) | 3.9m     | 0        | 0     |

- **326/326 test executions across two full `--retries=0` runs, 0 failures, 0 flaky, 0 `✘`.**
- **Load-dependent flake class FIXED THIS CYCLE — GREEN in BOTH runs:** `identity.spec.ts:282` ✓✓;
  `transactions.spec.ts:523` (contains the rev-02 blocking assertion at `:696`, "500 transactions"
  search-clear re-render; Q-P20B-15) ✓✓ (31.9s); `passkey.spec.ts:387` (Q-P20B-16) ✓✓.
- **Accepted environmental flakes did NOT flake here** (passed both runs): `import.spec.ts:301`
  (Q-P20B-13), `import.spec.ts:1527`/`:1573` (Q-P20B-14). `duplicates.test.ts` (Q-P20A-05) is a unit
  file — green in §4.
- **No unexplained flake observed.** Per `tasks/P21-final-audit.md:71`, only an unexplained flake is
  a FAIL. None arose. The `[WebServer] tRPC failed: ... authentication` lines are the expected
  negative-path rejections from auth/cross-vault tests (see §6), not test failures.

## 6. Security: cross-vault authorization + secret/plaintext inspection (contract 6) — **GREEN**

- **Auth:** `src/server/trpc.ts` Ed25519 signature-verification middleware; missing/invalid
  signature → `TRPCError UNAUTHORIZED` (`:137,:144,:157,:178`). All routers (`vault`, `sync`,
  `realtime`, `invite`, `membership`, `passkey`, `user`) run under it. E2E negative-path rejections
  observed live ("Missing authentication headers" / "Request authentication failed").
- **RLS:** `006_rls_hardening.sql`, `007/008_realtime_authorization*.sql` present; cross-vault
  denial reconciled from passed P04/P05/P08 reviews (runtime malicious two-vault harness needs live
  Supabase, not provisioned; structurally verified + covered by those passed packages and by the
  realtime-recovery/invite/passkey E2E specs, all green).
- **Secret/plaintext scan (product code):** no `console.*` logs seed/mnemonic/masterKey/secretKey/
  recovery/crypto_box/jwt-secret/presenceKey/passphrase. Sole hit
  `SeedPhraseDisplay.tsx:84 console.error("Failed to copy:", err)` logs a clipboard `DOMException`,
  NOT the seed. No secrets in URLs/query params. E2E `passkey.spec.ts` explicitly asserts "no PRF
  output, master secret or phrase ever leaves the browser" (green). Live smoke (§8): 0 sensitive
  URLs.
- **Evidence/log hygiene:** my gate logs scanned for
  `seed phrase|mnemonic|master key|-----BEGIN| SUPABASE_JWT|crypto_box_secret` → clean. No real key
  material printed anywhere. **No leak.**

## 7. Performance (contract 7) — GREEN with documented follow-up (Q-033 / R-020)

Benchmarks run via env gate (`--disable-console-intercept`), Node v22.21.1, under normal audit load:

- **Allocation (P16A):**
  `people=200 samples=5 iterations=250 elapsedMs=452.28,441.69,443.81,440.75, 444.87` → ~**1.78ms
  per derivation+apportionment iteration**, far under the **<100ms** allocation- edit target.
  Checksum-stable (correctness invariant held).
- **Settlement (P16B) 100k:**
  `scale10kMs=80.73 scale50kMs=385.48 elapsed100kMs=810.24,778.65,859.58, 754.74,764.69` (median
  ~778ms). **Near-linear** (10k→50k ≈ 4.77× for 5×; 50k→100k ≈ 2.02× for 2×). Exact correctness:
  100k qualifying, 75k contributions, 2 obligations, 0 issues, **conservation true** (signed minor
  units sum to 0 per position; each obligation == sum of its source contributions).
- **~100k/200ms line:** frozen spec §14 (008 `575-585`) states an **explicit disjunction** — meet
  ~200ms **OR** provide measured evidence + documented optimization follow-up. The measured-evidence
  branch is the **accepted, adjudicated** disposition: **Q-033** (raised P16E rev 01, adjudicated by
  DISTINCT `p16e-reviewer-01`) selected option (a) "report measured evidence + follow-up, target
  explicitly unclaimed"; **R-020 stays OPEN**, optimization carried forward. My independent ~778ms /
  near-linear measurement corroborates the recorded ~0.8s. **Not a FAIL** — spec-permitted branch;
  surfaced as a human-decision carry-forward (§12).
- **No persisted settlement cache:** `settlement.ts` is the sole engine; `BalanceSummary.tsx` /
  people README confirm settlement is a pure derived `useMemo` consumer, never persisted.
- Large import/table/alias/automation/GC responsiveness + duplicate-tab convergence: covered by the
  green E2E suite (`import`, `field-rule-parity`, `automations`, `realtime-recovery`,
  `people-settlement` deep-link/bulk) — no hangs/deadlocks/lost-change observed across 2 runs.

## 8. Manual product journey — disposable headless session + E2E reconciliation (contract 8)

**Live disposable headless Chromium smoke** (dev server; disposable /tmp script; context discarded):

- Landing `/` → 200, title "MoneyFlow — categorise and allocate shared transactions", h1 "Categorise
  and allocate shared money", **no open-source/MIT claim** (truthful marketing).
- Onboarding `/new-user` → 200; accessible controls: `button "Create with a passkey"`,
  `separator "or"`, `button "Generate Recovery Phrase"`, `link "Unlock it"` (the two equal
  OR-separated creation options with correct roles/names).
- **0 console errors, 0 page errors, 0 sensitive URLs** on both surfaces.

**Full manual matrix reconciled from the 163-test suite (green ×2)** — each FINAL-AUDIT manual
bullet maps to covering specs: recovery/passkey (`identity`, `onboarding-vault`, `passkey` —
create/confirm/ unlock/add/revoke/fallback, WebAuthn-unavailable, keyboard, PM credential save,
no-secret-leak); vaults + default person/account + locale currency (`onboarding-vault`);
imports/drop zones/provenance/ amount tooltip/delete (`import`); transactions/empty rows/grid
keyboard/inline editing (`transactions`); aliases (`description-aliases`); tags/allocations parity
(`field-rule-parity`); automations create/update/drift/apply-this/all/new (`automations`,
`transaction-rules`); undo/redo (covered in transactions/alias specs); people
obligations/issues/source navigation + virtualization/ historical/presence/320px/dark/reduced-motion
(`people-settlement`); invites/members/two-user/live sync (`invite-redemption`, realtime);
presence/refresh/multi-tab/offline reconnect (`realtime-recovery`); marketing (`landing`). All
green.

## 9–10. Responsive + accessibility + contrast (contracts 9–10) — GREEN (reconciled from suite)

- **320px reflow:** `people-settlement.spec.ts:744`, `import.spec.ts:1283`
  (`setViewportSize {width:320}`) — green.
- **Dark mode + reduced motion:** `page.emulateMedia({colorScheme, reducedMotion})` —
  `people-settlement.spec.ts:753-760`, `import.spec.ts:1067` — green.
- **Computed contrast ratios:** `import.spec.ts:259` `measuredContrastRatio()` with
  `:679 expect(...).toBeGreaterThanOrEqual(4.5)` and `:629` "drop guidance and alerts meet theme
  contrast and zoomed visible geometry" (200% zoom) — green.
- **Deterministic accessible role/name/state:** `getByRole(...,{name})` used throughout; live smoke
  confirmed real roles/names on onboarding. Empty/loading/error/offline/refresh/multi-tab: covered
  by realtime-recovery + identity (IndexedDB-blocked) + transactions empty-state specs — green.

## 11. FS-001 exhaustive audit (contract 11) — GREEN

- **Sole settlement engine:** `src/lib/domain/settlement.ts` only. `settlement-view.ts` /
  `BalanceSummary.tsx` import `SettlementResult`/`SettlementIssue` types and consume output — no
  competing computation, no cross-currency netting, no persisted cache. Per-currency engine.
- **Signed unit conservation:** verified by the 100k benchmark (§7) — positions sum to 0; obligation
  == Σ source contributions; exact over decimals/negatives/over-under-allocation/stable-ID ties/
  multiple currencies via the settlement + allocation property tests.
- **Canonical examples A–H:** each has its **own named production unit/property test**
  (`settlement.test.ts:623(A),631(B),646(C),659(D),681(E),694(F),709(G),720(H)`) **and its own named
  E2E test** (`people-settlement.spec.ts:104,117,138,159,190,213,234,249`). 8 + 8 distinct, not
  combined; all green (§4/§5).
- **Reject-never-clamp + typed issues:** `allocation.ts` returns typed `{ok:false, error}` with
  `invalid-weight`, `invalid-weight-total`, `invalid-allocation`, `invalid-amount` — no
  clamp/normalize. (The single `Math.min` in `settlement.ts:758` is standard debtor/creditor pairing
  in the netting algorithm, not allocation clamping.)
- **P16C complete-set / per-key API:** `allocations.ts` `setTransactionAllocation` (per-key),
  `replaceTransactionAllocations` (complete-set) → `replacePreparedAllocations` **deletes keys
  absent from the replacement set** (except Loro metadata key) and applies validated values with
  **no clamp/normalize**; `prepareAllocationReplacement` rejects invalid input with typed errors
  before any write. Insertion uses the same complete-set contract (`prepareInsertedAllocations`).
  Owner remainder/effective-share and virtualized/historical/presence grid + add-row UX reconciled
  from passed P16C/P16D/P16E reviews and the green `people-settlement` + `transactions` specs. Typed
  invalid-legacy-map issues preserved/excluded-from-totals, never a misleading "settled" claim
  (settlement view issue path). P17 complete-set API use reconciled from passed P17A–D reviews +
  `field-rule-parity` (allocation rules capture the whole set) green.

## 12. Console / network inspection + carry-forward Q proposals (contract 12)

- Console/network: 0 unexplained console errors in live smoke; E2E WebServer "auth failed" lines are
  expected negative-path rejections; no sensitive data in URLs/payload metadata.
- **Carry-forward Q-proposals surfaced for human decision:**
    - **Q-P20B-00 — `pruneBuckets` concurrent-merge data loss (HIGH, out of frozen scope):** genuine
      multi-client data-loss (two peers editing the same day/month/year bucket converge to `[]`,
      unrelated tx lost; also via `moveTransaction`). Deliberately left UNFIXED by P20B as out of
      scope for a style sweep; disposition explicitly routes severity to "reviewer + P21 audit".
      **My assessment:** real data-loss risk requiring a future bounded merge-safety package; maps
      to NO in-scope requirement (HS-021 is style; FS-001 is allocation/settlement) and was
      transparently adjudicated/deferred by the owning package. Flag for human/product
      prioritization — **not the basis of this FAIL** (that is F-1), but the most serious open
      carry-forward.
    - **Q-033 — 100k/200ms settlement (accepted measured-follow-up branch; R-020 open)** — §7.
    - Q-P20B-13/14 (import environmental flakes — did not flake here), Q-P20A-05 (`duplicates` unit
      — green), Q-P17D-02, Q-P20A-02, Q-P20B-01/02/06/08 (rekey-has-no-callers /
      sync-ignores-version-vector / etc. — standing product/security posture questions logged
      truthfully), settled Q-P20B-15/16 (this cycle's fixed flake class — now GREEN).
    - QUESTIONS/DECISIONS internally consistent; summarized here for final human review.

## 13. Blocking finding

**F-1 (BLOCKING candidate) — production dependency currency / security.** `pnpm audit --prod` at the
completion gate reports **9 known `next` advisories (5 HIGH incl. App Router middleware/proxy auth
bypass and SSRF in Server Actions/rewrites, 4 MODERATE)** against installed `next@16.2.10`, all
fixed in `next@16.2.11` (released 2026-07-21) and `16.2.12` (latest, 2026-07-25) — both available
before this audit. The remedy is a **compatible safe-chain patch bump**, which is the literal frozen
mandate of **P01/HS-002** ("Upgrade dependencies by compatible safe chains"). Prior P21 collectors
(rev 01/02) skipped `pnpm audit` ("no primary-source advisory re-fetch"), so this is newly surfaced
by the charter-required recheck. Plus 1 transitive `sharp` HIGH (fixed `>=0.35.0`).

- **Why FAIL-candidate:** a material, currently-true security exposure in a shipped production
  dependency of a security-centric financial app, with an available in-scope compatible-chain fix,
  at the completion gate. Per the charter FAIL triggers (any failing check / material security
  finding) I do not paper over it.
- **Counter-considerations for root/reviewer adjudication (I flag, I do not pre-decide):** the
  advisories were published AFTER P01/HS-002 passed; a final audit is a point-in-time snapshot and
  upstream advisory drift may be judged a maintenance/human-accept carry-forward; two prior DISTINCT
  P21 reviewers did not treat dependency-audit as a hard zero-vuln gate (they did not run it). Root
  may reasonably elect to (a) route a P01/HS-002 reopen for the `next 16.2.10→16.2.12` compatible
  bump + re-review, then P21 rev 04 from a new BASE, or (b) record an explicit human-accepted
  currency carry-forward. Either way it must be an explicit decision, not silence.

## 14. Proposed FINAL-AUDIT contents (root transcribes ONLY after independent PASS)

Scope reconciliation: all 22 entries map to approved reviews + passed rows; alias/automation passed
before checkboxes; scratch `469e98c7…` (24,260B, 43/0), norm 21/0; FS-001 `0d0e2a14…` 715L/25,441B
never edited; P16A–E passed before FS-001; rev-02 batch fully drained; no open
`changes_requested`/`rollback_pending`/`completion_pending`; BASE..HEAD unchanged (docs-only);
QUESTIONS/DECISIONS consistent. Repo/migration: HEAD `28858e2` (docs atop BASE `127990a`), linear,
strays inert; fresh+upgrade+RLS SQL + IndexedDB migration present/covered; **dependency audit = F-1
(5 HIGH/5 MOD, next 16.2.10)**; P03 gate GREEN. Verification: typecheck/lint/build GREEN (1 known
lint warn); format known frozen-spec-only; unit 2091 pass/2 explained-skip; **E2E 163×2 GREEN,
retries off, 0 flaky**; flake class fixed. Manual/a11y: green suite + live smoke, contrast≥4.5,
320px, zoom, dark/reduced-motion, roles/names. Security: cross-vault denied, no secret/plaintext
leak. Performance: <100ms alloc (~1.78ms), settlement near-linear ~778ms/100k conservation-true
(Q-033 measured-follow-up, R-020 open). FS-001: sole engine, A–H 8+8 named, reject-never-clamp,
complete-set removes-absent-never-clamps, no cache. **Verdict (collector candidate): FAIL on F-1;**
all else GREEN.

## 15. Commands index (sanitized)

- `git rev-parse HEAD`; `git diff --stat 5576175..HEAD -- . ':(exclude)specs'`;
  `git diff --name-only 127990a..HEAD`; `git log --merges 5576175..HEAD`;
  `git rev-list --parents 5576175..HEAD`.
- `sha256sum specs/human-scratch.md`; `wc -c/-l`; `grep -cE '^\s*- \[x\]'`;
  `python3 …/norm_check.py`; `sha256sum specs/008-.../spec.md`.
- `pnpm typecheck`; `pnpm lint`; `pnpm format:check`; `pnpm test`; `pnpm build`.
- `P16A_BENCHMARK=1 / P16B_BENCHMARK=1 pnpm exec vitest run … --disable-console-intercept`.
- `pnpm exec playwright test --retries=0 --reporter=list` (×2).
- `pnpm audit --prod [--json]`; `curl -sS https://registry.npmjs.org/next` (release dates).
- Disposable headless Chromium smoke (landing + onboarding; console/pageerror/URL scan).
- Cleanup: dev server killed, `/tmp/smoke.mjs` + gitignored `_gate_logs/*.log` removed. Committed
  nothing. Wrote only this file.
