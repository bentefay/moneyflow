# P21 review 04 — independent FORMAL verdict (EXECUTABLE FINAL AUDIT)

- **Reviewer:** `p21-reviewer-04` (distinct independent reviewer; NOT the collector
  `p21-collector-04`; implemented no package)
- **Date:** 2026-07-28
- **BASE / HEAD:** `e94a4b9532701a0257c6c99da577db5f3e08fdfc` (root docs commit)
- **Product identity:** `git diff 371a88a HEAD -- . ':(exclude)specs'` → **EMPTY (0 lines)**,
  verified at start and re-verified mid-audit. Product tree is byte-identical to product commit
  `371a88a`.
- **Writes:** this file only. **Nothing committed.** No product/test/migration/ledger/FINAL-AUDIT
  edit.

## VERDICT: **FAIL**

**Blocker F-2 (NEW, raised by this review):** `tests/e2e/identity.spec.ts:282` — the very test P20B
revision 02 was dispatched to fix, and whose fix was signed off as resolved — **failed again** under
full-suite load in this reviewer's campaign. It has **no accepted-flake ticket**. Under the frozen
contract (`tasks/P21-final-audit.md` §71: "any failing check, unexplained flake … is FAIL") this is
a failing check on a closed fix, which is strictly stronger than an untracked flake.

Owner routing: **P20B** (rev 06), Q-number required. The correct fix is to harden the _whole_
controlled-input/eager-assertion cohort under load, and — critically — to **validate under
full-suite load, not in isolation**.

F-1 (the collector's advisory blocker, `import.spec.ts:1512`) did **not** reproduce in this
reviewer's runs, but its mechanism is real and it remains untracked. See §6.

**Campaign basis for this verdict:** 8 full-suite `--retries=0` runs (1,304 test executions) — 7
green, 1 failed. `identity.spec.ts:282` failed 1/8; `import.spec.ts:1512` failed 0/8.

**Every other clause of the audit contract §29-56 and of FINAL-AUDIT passed independently**,
including `pnpm audit --prod` clean at exit 0, the HS-002 `next`/`sharp` fix, the P03/HS-018
external gate (now genuinely released and enabled), a fresh migration bootstrap from empty, all
static gates, the full unit/property/integration suite plus both performance benchmarks, the
security probes, and the exhaustive FS-001 audit at 16/16 canonical-example gates. **This audit
fails on E2E stability alone.**

---

## 1. Entry conditions — all independently re-confirmed (PASS)

| Item                   | Command                                           | Result                                                                                             |
| ---------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| HEAD                   | `git rev-parse HEAD`                              | `e94a4b9532701a0257c6c99da577db5f3e08fdfc`                                                         |
| Product identity       | `git diff 371a88a HEAD -- . ':(exclude)specs'`    | EMPTY                                                                                              |
| Scratch SHA            | `sha256sum specs/human-scratch.md`                | `469e98c7c8ee842acfc08e0844a47b4bc6495111b0463d8ca14727d3949d2f6a` ✅ matches rolling PROGRESS SHA |
| Scratch size           | `wc -c -l`                                        | 24,260 bytes / 350 lines ✅                                                                        |
| Scratch markers        | `grep -c`                                         | 43 checked / 0 unchecked ✅                                                                        |
| FS-001 SHA             | `sha256sum .../008-.../spec.md`                   | `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c` ✅                              |
| FS-001 size            | `wc -c -l`                                        | 25,441 bytes / 715 lines ✅                                                                        |
| Settlement engine blob | `git rev-parse HEAD:src/lib/domain/settlement.ts` | `010f3c93582a2ce311594d4dde8464760ca49c43` ✅                                                      |
| Canary                 | `grep -c "per purpose" PROGRESS.md`               | `1` ✅                                                                                             |
| History linearity      | `git log --format='%h %p' -60`                    | no multi-parent commits — linear ✅                                                                |
| Package statuses       | PROGRESS table                                    | 52 `passed`, 1 `changes_requested` (control P21 only) ✅                                           |

**Worktree drift:** only the pre-classified inert strays. Note `next-env.d.ts` is _no longer_
modified — `pnpm build` regenerated it to match HEAD. That is a reduction in strays, not new drift.
Final `git status --porcelain` shows only the two untracked evidence files (P08, P21) named as inert
in HANDOFF. **No unclassified drift.**

### 1.1 Scope / package / review / question / marker reconciliation (PASS)

- **22/22 first-class requirement rows `passed`** in the PROGRESS requirement ledger (21 `HS-*` +
  whole-file `FS-001`), each with an integration commit, a named independent review artifact, and a
  logged marker SHA transition. Alias P11A–C and automation P17A–D are all `passed`; P16A–E are all
  `passed` and precede FS-001's completion.
- **HS-002's §275 history is fully drained.** `RB-P21-03` (raised by the P21 rev-03 FAIL) is
  recorded as **activated → COMPLETED + cleared**, HS-002 then re-passed via a forward marker after
  P01 rev 03 landed `next@16.2.11` + the `sharp` override, with the rolling scratch SHA returning
  `c10dc0b5… -> 469e98c7…`. That end-state SHA is exactly what I measured on disk, and the file is
  byte-identically back to all-checked at 24,260 bytes. **No prepared/active rollback batch, no
  `rollback_pending` requirement, and no open `completion_pending` event remains** — every
  `completion_pending` string in PROGRESS is a historical `-> passed` transition.
- All 21 HS markers are authorized; 43 checked / 0 unchecked; normalized blocks byte-match SCOPE
  (per the rolling-SHA identity above).
- QUESTIONS.md carries 69 Q entries; the flake-relevant ones (Q-P20A-05, Q-P20B-13, -14, -15, -17)
  are internally consistent, and -17's subsumption into -14 is correctly reasoned (`:1573` really
  does sit inside the `:1527` declaration). **Both of my blockers require NEW Q numbers** — neither
  is covered by an existing entry.

## 2. Dependency currency + HS-002 fix (PASS)

- `pnpm audit --prod` → **`No known vulnerabilities found`, exit 0, 0 advisories.** Independently
  re-run. HS-002's security condition is satisfied.
- `next@16.2.11` installed; `pnpm view next dist-tags` → `latest: '16.2.11'`. The registry's
  safe-chain-visible latest **is** 16.2.11; 16.2.12 is age-suppressed (safe-chain explicitly reports
  "Some package versions were suppressed … due to minimum package age"). Installing 16.2.11 is
  therefore correct, not stale.
- `sharp@0.35.3` resolved via the `pnpm-workspace.yaml` override `"sharp@<0.35.0": 0.35.3`
  (`pnpm ls --prod` → `next@16.2.11 └── sharp@0.35.3`). **Prebuilt binary verified to actually load
  and work**, not merely resolve: loading the package from its store path reports
  `sharp 0.35.3 / libvips 8.18.3` and a real 4×4 PNG encode returns 94 bytes.
  `@img/sharp-linux-x64@0.35.3` and `@img/sharp-libvips-linux-x64@1.3.2` are present.

### P03 / HS-018 TanStack Virtual release gate — recheck from the installed package source (PASS)

The gate is no longer blocked, and the requirement is genuinely met — verified against the package
source rather than assuming a semver bump:

- Installed `@tanstack/react-virtual@3.14.6` **does ship PR #1100's API**: `dist/esm/index.d.ts:12`
  declares `useFlushSync?: boolean` on `ReactVirtualizerOptions`, and `dist/esm/index.js:7,73`
  contains the real implementation (`useFlushSync = true` default; `if (useFlushSync && sync)`).
- The product **explicitly enables it**:
  `src/components/features/transactions/TransactionTable.tsx:407` → `useFlushSync: true` on the sole
  `useVirtualizer` call site (`:401`). HS-018 is satisfied by a real released API, not
  vendored/unreleased code.

## 3. Migrations / fresh bootstrap (PASS)

Authentic `pnpm db:reset` from empty (the collector had left the DB empty), 03:51:31→03:51:49:
recreated the database and applied `005_vault_ops` → `006_rls_hardening` →
`007_realtime_authorization` → `008_realtime_authorization_lifecycle` →
`009_remove_unused_user_state` → `010_passkey_credentials` cleanly. The two
`NOTICE … policy does not exist, skipping` lines are idempotent-drop guards, not errors. Post-reset
the E2E suite bootstrapped 261 vaults / 798 ops / 275 memberships, so IndexedDB/vault hydration
against a fresh schema is exercised end to end.

## 4. Static gates (PASS)

| Gate                | Result                                                                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`    | exit 0, clean                                                                                                                                             |
| `pnpm lint`         | **0 errors, 1 warning** — exactly the known-acceptable `TransactionTable.tsx:401` `react-hooks/incompatible-library`                                      |
| `pnpm format:check` | 15 files flagged — **all under `specs/**` frozen markdown; zero product/test files\*\* (verified by filtering the flagged list). Acceptable per contract. |
| `pnpm build`        | exit 0; 17 routes emitted                                                                                                                                 |
| `pnpm test`         | **111 files, 2091 passed, 2 skipped, 0 failed** (73.7s)                                                                                                   |

**The 2 skips are explained, not unexplained.** Extracted by JSON reporter:
`tests/unit/domain/allocation.test.ts` "signed minor-unit apportionment benchmarks production
derivation and apportionment primitives" and `tests/unit/domain/settlement.test.ts` "production
settlement scale benchmarks 100,000 deterministic transactions with complete output". Both are
`it.runIf(process.env.P16A_BENCHMARK === "1")` / `P16B_BENCHMARK === "1"` gates. **I ran them with
the flags set: 2 files, 188 passed, 0 failed** — so the performance clause is evidenced, not skipped
past. See §7.

## 5. Full-suite E2E campaign — `--retries=0`, repeated (FAIL)

Command per run: `pnpm exec playwright test --retries=0 --reporter=list` (config: 4 workers,
`fullyParallel`, `retries: 0`, fresh `webServer`, 163 tests). Isolation runs deliberately NOT used
as validation.

| Run | Result                          | Failure                    |
| --- | ------------------------------- | -------------------------- |
| 1   | 163 passed (3.8m)               | —                          |
| 2   | 163 passed (3.9m)               | —                          |
| 3   | **1 failed**, 162 passed (4.0m) | **`identity.spec.ts:282`** |
| 4   | 163 passed (3.9m)               | —                          |
| 5   | 163 passed (3.9m)               | —                          |
| 6   | 163 passed (3.9m)               | —                          |
| 7   | 163 passed (3.8m)               | —                          |
| 8   | 163 passed (3.8m)               | —                          |

A 9th run was started and stopped at 12/163 once the ≥8 requirement was met; it is **not counted**
in any figure above (no failures had occurred in it at that point).

**Campaign total: 8 full-suite runs, `--retries=0`, 1,304 test executions. 7 green, 1 failed.**

- **F-1 `import.spec.ts:1512`: 0 failures in 8 runs** (did not reproduce — see §6).
- **`identity.spec.ts:282`: 1 failure in 8 runs (~12.5%)** — contradicting the collector's 8/8
  green.

Note on measurement conditions: runs 1-6 overlapped with my own `pnpm build` / `pnpm test` /
benchmark gates on the same host, i.e. under _additional_ CPU pressure beyond the suite's own 4
workers. That makes this campaign, if anything, a slightly harsher load environment than the
collector's — which is consistent with me surfacing `identity:282` where the collector did not, and
is a further reason my non-reproduction of F-1 cannot be read as F-1 being absent.

### E2E hygiene clauses (PASS — verified by direct search, not assertion)

The FINAL-AUDIT clause "no arbitrary sleeps, shared test ordering, unexplained skips, or
retry-dependent outcomes remain" holds cleanly:

- **Arbitrary sleeps: ZERO.** `grep -rn "waitForTimeout\|sleep("` over `tests/e2e/**` returns no
  matches at all. Every wait is a condition-based Playwright assertion.
- **Skips / `.only`: ZERO.** No `test.skip`, `test.only`, `describe.only`, or `fixme` anywhere in
  `tests/e2e/`.
- **Shared ordering: NONE.** No `describe.serial` / `mode: "serial"`; config is
  `fullyParallel: true` with 4 workers, so tests cannot depend on each other's order.
- **Retry-dependent outcomes: excluded by construction** — every run in my campaign used
  `--retries=0`, and the config's non-CI default is already `retries: 0`.

This is worth stating plainly because it sharpens the two blockers: the suite is otherwise
disciplined, so the eager-assertion cohort is a genuinely isolated, fixable defect class rather than
a symptom of a loose test suite.

### The failure, in full

```
1) [chromium] › tests/e2e/identity.spec.ts:282:9 › Identity ›
   unlock journey: enter seed phrase and access transactions ›
   validate BIP39 words with visual feedback

   Error: expect(locator).toHaveClass(expected) failed
   Locator: locator('[data-testid="seed-word-input-0"]')
   Expected pattern: /border-green-500/
   Timeout: 5000ms
   14 × locator resolved to <input value="" ... data-testid="seed-word-input-0" ...>
   at tests/e2e/identity.spec.ts:359:38
```

## 6. THE VERDICT CALLS

### F-2 (NEW — this reviewer's blocker): `identity.spec.ts:282` regressed

This is the material finding of this audit, and it is worse than an untracked flake.

**It is not covered by any ticket.** `grep` over `QUESTIONS.md` for `identity.spec.ts:282` /
`identity:282` returns only two _incidental cross-references_ (line 1899 noting rev 02 changed that
file; line 1928 citing it as a _class_ comparison for Q-P20B-15). There is **no Q ticket accepting
`identity:282` as an environmental flake**. The three pre-accepted tracked flakes are
`import.spec.ts:1527` (Q-P20B-14), `import.spec.ts:301` (Q-P20B-13), `duplicates.test.ts`
(Q-P20A-05). `identity:282` is none of them.

**It is a closed fix that regressed.** P20B rev 02 was dispatched specifically to harden this test;
its fix is present at `tests/e2e/identity.spec.ts:344-359` and was accepted. So this is not "a flake
we never looked at" — it is a defect that was declared fixed and is not.

**Mechanism — the existing fix does not close the race (environment-independent analysis).** The
seed-word field is a _fully controlled_ React input:
`src/components/features/identity/SeedPhraseInput.tsx:329-332` renders `value={word}` bound to
`useState` (`:99`) with `onChange={(e) => handleWordChange(index, e.target.value)}`. The rev-02
hardening guards with `toBeEditable()` then `fill("abandon")` then `toHaveValue("abandon")`. Those
guards are insufficient, and the failure log proves it: at the moment of the `:359` class assertion
the element was observed **14 times** with `value=""`. That is, the DOM value was successfully set
(so `toHaveValue` passed), and then a subsequent React render **re-asserted empty component state
over it** — Playwright's `fill` dispatches an input event that a not-yet-hydrated (or mid-hydration)
React tree drops, so `handleWordChange` never runs, state stays `""`, and the next commit clobbers
the DOM value. `toBeEditable` only checks enabled+editable, which is true of server-rendered HTML
_before_ hydration attaches handlers; `toHaveValue` samples a transient DOM state that the
controlled component later overwrites. Neither guard proves the React state transition actually
happened. This is exactly the hazard the test's own comment (`:347-352`) describes — the comment
correctly identifies the mechanism, but the assertions chosen do not actually gate on it.

The robust gate is to assert on something that can only be true _after_ state propagated (the
validity class itself, or a hydration marker), with a load-tolerant timeout — not on the DOM value.

**Why `toBeEditable()` in particular cannot work here — a concrete asymmetry in the product.** The
codebase already has a hydration gate, and it is applied to buttons but **not** to inputs:
`src/components/ui/button.tsx:50-55` calls `useIsHydrated()` and computes
`isDisabled = disabled || !isHydrated`, with the comment "disable until hydrated to prevent clicks
before React event handlers are attached." `src/components/ui/input.tsx` has **no** `useIsHydrated`
usage at all. So a Playwright `toBeEnabled()`/`toBeEditable()` check is a genuine hydration proof
for a `Button` — and is _no proof whatsoever_ for an `Input`, which is editable from the moment the
server HTML paints. The rev-02 fix reached for the idiom that works elsewhere in this suite (see
`tests/e2e/helpers/auth.ts:20`, "Button is disabled until React hydration completes (via
useIsHydrated hook)") and applied it to a control that does not carry that gate. That is the precise
reason the fix looked right, reviewed clean in isolation, and still fails under load.

This also means the fix has two viable shapes, and root/P20B should pick deliberately: harden the
_test_ (assert on a post-propagation signal), or close the class at source by giving `Input` the
same `useIsHydrated` treatment `Button` already has. The latter would fix every controlled-input
race in the suite at once — but it is a product change, so it is P20B's call to scope, not mine to
prescribe.

**Why this was missed:** the P20B rev-02 review (`reviews/P20B-review-02.md:39-45`) validated the
fix with **`pnpm exec playwright test identity.spec.ts` run 9 times — isolation only** ("9/9 pass";
":45 no tracked-flake collisions (focused on identity.spec.ts only)"). Isolation cannot exercise a
4-worker load-dependent hydration race. This is the same validation-method error the P21 contract
warns about, and it is why the fix passed review while remaining broken.

### F-1 (collector's blocker): `import.spec.ts:1512` — did NOT reproduce here, mechanism is real, still untracked

- **Reproduction: 0 occurrences in my full-suite runs.** Per HANDOFF, **non-reproduction is not
  proof of absence** — the collector's 1/8 observation and my 0/N are both honest samples of an
  environment-dependent race (exactly as a collector saw `identity:282` 2/5 where a reviewer saw 0/5
  — and note that in _this_ audit the polarity flipped: I reproduced `identity:282`, which the
  collector saw green 8/8).
- **Novelty independently confirmed.** I re-ran the grep myself: `1445`/`1512` appear **nowhere** in
  `QUESTIONS.md`, and nowhere in `evidence/P20B/`, `evidence/P21/`, or `reviews/` outside the
  collector's own uncommitted evidence file. Zero prior hits.
- **It is NOT absorbable into Q-P20B-14.** Q-P20B-14 covers the test _declared at_ `:1527`
  ("selecting template and importing auto-updates template config"). The F-1 assertion at `:1512`
  lies inside the test _declared at_ `:1445` ("CSV import creates transactions and auto-saves
  template on first import") — verified by listing test declarations. Different declaration,
  different test. Q-P20B-17 was subsumed into -14 legitimately because `:1573` sits inside the
  `:1527` body; that precedent does **not** extend to `:1512`.
- **Mechanism assessment (environment-independent): the race is real.** `loadFile`
  (`src/hooks/use-import-state.ts:242-445`) is async: `await file.text()` → `detectFileType` →
  `parseRawRows` → template sort → config build → `setSession(newSession)` →
  `finally setIsLoading(false)`. `ImportPanel` renders the `"N rows"` text (`:297`) only after
  `session` exists and `isLoading` is false (`:262-290`). The assertion at `:1512` fires immediately
  after `setInputFiles` with `{ timeout: 5000 }` — which is Playwright's _default_ expect timeout,
  i.e. not a widening at all, unlike the deliberate `10_000`/`15_000` used elsewhere for heavier
  waits. Under 4-worker contention, file-read + CSV parse + React commit can exceed 5s. **The step
  at `:1512` also does strictly more work than its siblings** — it is the _second_ import in the
  test, preceded by a full import + redirect, so the template list is non-empty and `loadFile`
  additionally sorts templates and applies a matched template config. That makes `:1512` the most
  load-exposed instance of the pattern in the file, which is consistent with the collector seeing it
  fail there first.
- **The cohort is real and was never hardened.** Identical bare-`toBeVisible`-with-default-5000ms
  row-count assertions sit at `import.spec.ts:1279, 1412, 1459, 1512, 1539, 1573, 1616`. And
  `git log -- tests/e2e/import.spec.ts` shows **no P20B revision ever touched this file** — the P20B
  sweeps hardened `identity.spec.ts`, `transactions.spec.ts` and `passkey.spec.ts`, leaving
  `import.spec.ts`'s whole eager-assertion cohort untouched. F-1 is a real, untracked, unhardened
  member of that cohort.

**Cohort size, measured — the fix has a bounded, concrete scope.**
`grep -rn "toBeVisible({ timeout: 5000 })" tests/e2e/*.spec.ts` returns exactly **13 assertions in 2
files**: **8 in `import.spec.ts`** and **5 in `transactions.spec.ts`**. Every one of them pins the
_default_ expect timeout explicitly, which is the tell — it reads like a deliberate wait but grants
no extra time whatsoever over the bare default. That is the whole cohort P20B needs to address; it
is a small, enumerable, one-sitting change, not an open-ended sweep.

**Ruling on F-1:** it is **genuinely new/unexplained and not covered by any existing ticket**. My
non-reproduction does not clear it. It stands as a second blocker.

### Scope guardrail — observed

I have **not** granted any new environmental-flake carry-forward, and I do not have the authority
to. My verdict is FAIL with the block standing, per HANDOFF. For the record, and flagged explicitly
for root to adjudicate: I do **not** think acceptance-without-fix is warranted for either F-1 or
F-2, because unlike Q-P20B-14 (20/20 isolation, "no identifiable failing line or mechanism") both of
these have a **specific identified line and a specific mechanism with a clean deterministic fix** —
which is precisely the Q-P20B-15 distinction that made _that_ one a fixable defect rather than an
accepted flake. Hardening these is not "papering with a retry"; leaving them is.

## 7. Security probes (PASS)

Synthetic vectors only. **No real key material, seed phrase, recovery material, `crypto_box` secret,
`SUPABASE_JWT_SECRET`, presence key, or vault plaintext was printed, recorded, or committed.**

- **RLS posture:** all 11 public tables have `relrowsecurity = true`. Policy inspection shows
  `Direct API access denied` (`qual = false`, `cmd = ALL`) for `{anon,authenticated}` on
  `passkey_challenges`, `passkey_credentials`, `request_nonces`, `user_data`, `vault_invites`,
  `vault_memberships`, `vault_snapshots`, `vault_updates_legacy`, `vaults`. Grant inspection shows
  the _only_ grant to `anon`/`authenticated` anywhere in `public` is
  `authenticated vault_ops SELECT`.
- **Cross-vault probe (synthetic):** as role `authenticated` with **no** JWT claims → `vault_ops`
  visible rows = **0**. With **forged** claims for a vault held by nobody (`vault_id 0000…0001`,
  matching `realtime_table`/`realtime_purpose`/`realtime_topic`/`vault_role`, random `jti`) →
  visible rows = **0**. Per-table direct reads of all 9 other tables → `ERROR: permission denied` at
  the GRANT layer (defence in depth beneath RLS).
- **Gate function:** `realtime_grant_allows` requires a live `realtime_grants` row joined to a
  matching `vault_memberships` row _and_ the same role, with `revoked_at IS NULL`,
  `expires_at > clock_timestamp()`, vault not soft-deleted, and **every** JWT claim (`jti`,
  `vault_id`, `role`, `realtime_table`, `realtime_purpose`, `realtime_topic`, `vault_role`) bound to
  that same grant. Claim forgery alone cannot satisfy it without a real unrevoked grant row.
- **HTTP API probe (synthetic Ed25519 identity, freshly generated, no membership anywhere)** against
  the live dev server, targeting a victim vault holding 103 real ops: `vault.get`, `vault.list`,
  `sync.pushOps`, `realtime.authorize` all returned **HTTP 401 UNAUTHORIZED**, and **no response
  contained any vault ciphertext or data field**. `sync.pullOps` returned 404 (no such procedure —
  the pull path is named differently).

    **Honest limitation, stated rather than glossed:** I could not get my synthetic client's
    signature to _validate_, so these 401s read `"Invalid signature"` rather than a
    post-authentication authorization denial. The requests are therefore rejected at the signature
    gate, one layer _earlier_ than the membership check I was aiming to exercise. That is a real
    (and correct) denial — an attacker without the victim's private key genuinely cannot get past
    this layer, which is the actual threat model — but it does **not** by itself constitute a test
    of the membership authorization logic behind it. I attempted the canonical form four ways (raw
    wire body; normalized `[{path,input}]` per `route.ts:28-79`; literal `/api/trpc` signing path
    per `route.ts:187`; indexed-batch `?batch=1`) and did not reproduce a verifying signature;
    rather than assert a cross-vault authorization result I did not actually observe, I record the
    gap.

    **The authorization layer is nevertheless covered**, by two independent means that do not depend
    on my signing the request: (a) the DB-level forged-claims probe above, which _does_ bypass the
    signature layer entirely by acting as role `authenticated` with attacker-chosen JWT claims, and
    still yields 0 rows; and (b) code inspection showing every `sync` procedure filters on
    `.eq("pubkey_hash", ctx.pubkeyHash)`
    (`src/server/routers/sync.ts:62-65, 124-127, 225-228, 274-277, 320-323, 390`), where
    `ctx.pubkeyHash` is derived server-side from the _verified_ public key
    (`src/lib/crypto/signing.ts:210`) and is never client-supplied. Combined with
    `realtime-security.spec.ts` and `invite-redemption.spec.ts` passing in-suite, I am satisfied the
    clause holds; I simply did not personally land a signed cross-vault call.

- **Procedure exposure surface (audited, correct):** every procedure in `sync.ts` and `vault.ts` is
  `protectedProcedure` — `grep publicProcedure` over both returns nothing. The only public
  procedures in the whole API are `passkey.startAuthentication` / `passkey.finishAuthentication`
  (necessarily pre-auth) and `invite.getByPubkey`. I checked the last one specifically for an
  enumeration hole and it is sound: the lookup key is the invite's own high-entropy public key (a
  capability token — an attacker cannot enumerate vaults or users with it), and the returned
  `encrypted_vault_key` is a sender-bound `crypto_box` envelope, not a sealed box, so possessing the
  response without the recipient's secret key yields nothing. Notably it is also **not** a
  plaintext-key handoff: the owner's `enc_public_key` is fetched purely so the recipient can
  _authenticate_ the envelope.

- **Replay protection:** requests carry a 13-digit timestamp with a 5-minute freshness window and a
  one-use 32-byte nonce claimed atomically per verified pubkey hash
  (`src/server/trpc.ts:18-21, 84-89`), so a captured request cannot be replayed.

- **Plaintext/secret inspection of stored rows** (798 ops, 261 snapshots produced by the real E2E
  runs): searched `encrypted_data` for every E2E fixture string (`Coffee Shop`, `Direct Deposit`,
  `Grocery Store`, `Restaurant`, `Example B`, `Virtual Transaction`) → **0 hits in ops, 0 hits in
  snapshots**. Payloads are opaque base64 (`len` 352 / 2060).
  `vault_memberships.encrypted_vault_key` is uniformly 96 chars, matches `^[A-Za-z0-9+/=]+$` for
  every row, and contains **0** BIP-39 wordlist hits. `passkey_credentials.wrapped_secret` is
  likewise fully opaque. `vaults` stores only `id, created_at, deleted_at`; `user_data` only
  `pubkey_hash, updated_at`.

## 8. Performance (PASS)

- **Both gated benchmarks executed**
  (`P16A_BENCHMARK=1 P16B_BENCHMARK=1 pnpm exec vitest run tests/unit/domain/allocation.test.ts tests/unit/domain/settlement.test.ts`)
  → **2 files, 188 passed, 0 failed** (10.4s). This covers the sub-100ms allocation-edit target and
  the FS-001 §14 near-linear / ~100k settlement scaling branch (the named benchmark is "100,000
  deterministic transactions with complete output"). Q-033/R-020 remain the open measured-evidence
  follow-ups; nothing here contradicts them.
- Large-list/virtualization and duplicate-tab convergence are exercised in-suite
  (`transactions.spec.ts` 500-row virtualized journeys, `tab-duplication.spec.ts` "a
  browser-duplicated tab hydrates onboarding and an authenticated vault",
  `realtime-recovery.spec.ts` offline→reconnect catch-up) and passed in every green run.

## 9. Exhaustive FS-001 audit (PASS)

**Canonical examples A–H — 16/16 gates satisfied.** Each example has its OWN separately named unit
expectation AND its OWN separately named E2E expectation; none is folded into a general journey or
combined case. I checked the asserted values against the frozen spec §7 text, not just the names:

| Ex  | Unit (`tests/unit/domain/settlement.test.ts`)                            | E2E (`tests/e2e/people-settlement.spec.ts`)                                                    | Spec §7 expectation                    | ✓   |
| --- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | -------------------------------------- | --- |
| A   | `:623` "Example A: no explicit allocations produces no obligation"       | `:104` "canonical example A: no explicit allocations produces no obligation"                   | no obligation                          | ✅  |
| B   | `:631` "Example B: 50/50 expense makes Bob owe Alice $50"                | `:117` "canonical example B: basic 50/50 expense makes Bob owe Me $50"                         | Bob owes Alice $50                     | ✅  |
| C   | `:646` "Example C: owner remainder makes Bob owe Alice $30"              | `:138` "canonical example C: owner remainder makes Bob owe Me $30"                             | Bob owes Alice $30                     | ✅  |
| D   | `:659` "Example D: joint owners receive the third person's exact shares" | `:159` "canonical example D: joint owners split the third person's share $18 and $12"          | Charlie owes Alice $18 **and** Bob $12 | ✅  |
| E   | `:681` "Example E: a negative allocation reverses the expense direction" | `:190` "canonical example E: a negative allocation reverses the direction so Me owes Bob $20"  | Alice owes Bob $20                     | ✅  |
| F   | `:694` "Example F: income makes the receiving owner owe Bob $50"         | `:213` "canonical example F: income makes the receiving owner owe Bob $50"                     | Alice owes Bob $50                     | ✅  |
| G   | `:709` "Example G: equal joint ownership produces no obligation"         | `:234` "canonical example G: equal joint ownership with no allocations produces no obligation" | no obligation                          | ✅  |
| H   | `:720` "Example H: a non-paid status excludes the transaction"           | `:249` "canonical example H: a status without Treat-as-Paid produces no obligation"            | no obligation                          | ✅  |

The E2E cases drive real UI (ownership via `setAccountOwnership`, allocations via the grid) and
assert per-currency obligations by `data-testid`, including D's two distinct obligations.

**Sole per-currency settlement engine.** Exactly **one** production call site imports the engine:
`src/components/features/people/BalanceSummary.tsx:25` → `calculateSettlementBalances`. The only
other production references are type-only (`settlement-view.ts:14`) or documentation
(`people/README.md`). `settlement-view.ts` states and demonstrably keeps the
no-second-interpretation rule ("contains no settlement mathematics"; per-currency sections with "no
field capable of expressing a combined cross-currency total"), and `settlement-allocations.ts`
reuses the same P16A `deriveEffectiveAllocations` primitive rather than recomputing. No competing
engine, no persisted or plaintext settlement cache (nothing settlement-derived is written to the
CRDT/IndexedDB/server — `vault_ops`/`vault_snapshots` hold only opaque ciphertext), no
cross-currency netting.

**Reject-never-clamp / typed issues / complete-set API.** `validateAllocationSet`
(`src/lib/domain/allocation.ts:185`) collects typed `{domain, personId, reason, type}` errors and
returns `{ok:false, errors}` — it never coerces a bad value. `prepareAllocationReplacement`
(`src/lib/crdt/allocations.ts:210`) propagates that rejection with no mutation; zero is omitted
because zero _means removal_ at the CRDT boundary (documented, not a silent clamp).
`replacePreparedAllocations` (`:249`) implements true complete-set semantics — **keys absent from
the replacement are deleted**. Owner-remainder/effective totals live in one place
(`deriveEffectiveAllocations`), used by both engine and view. Typed invalid-data issues are heavily
covered (93 `issue` references in the settlement unit tests, asserting preserved-but-excluded legacy
maps). Obligations are traceable via `SettlementSourceContribution` / `sourceContributions`
(`settlement.ts:35,49,969-988`) with working source-transaction navigation E2E.

**All current mutation paths use the P16C API.** Allocation writes reach the CRDT _only_ through
`setTransactionAllocation` / `replaceTransactionAllocations`
(`src/lib/crdt/allocations.ts:274,314`), surfaced via `context.tsx:978-986`; the automation path
(`src/lib/domain/automation/apply.ts:27-28`) and the import path (`import-commit.ts`) both go
through `replaceTransactionAllocations`, and insertion validates through
`prepareInsertedAllocations` on the same contract. No direct allocation-key writes exist.

## 10. UX / a11y / responsive / console (PASS on available evidence)

Covered in-suite and green in every passing run: computed contrast ratios asserted `>= 4.5`
(`import.spec.ts:679`, with a real relative-luminance implementation at `:279-289`); 320px reflow
(`import.spec.ts:1283`, `people-settlement.spec.ts:744`); dark + reduced-motion
(`import.spec.ts:1067`, `people-settlement.spec.ts:754-760`); zoomed viewport geometry
(`import.spec.ts:629`, `:1064`); keyboard-only expansion/navigation
(`people-settlement.spec.ts:722`); console/`pageerror` capture asserted clean in
`identity.spec.ts:157-172`, `presence.spec.ts:72`, `realtime-recovery.spec.ts:36-43`,
`realtime-security.spec.ts:42`, `vault-settings.spec.ts:139`; offline→reconnect recovery
(`realtime-recovery.spec.ts:176-220`). Suite breadth is 163 tests across 22 spec files covering
every journey the checklist enumerates.

**Marketing honesty (PASS).** Every cryptographic claim on the landing pages maps to real code:
Ed25519 (`src/lib/crypto/session.ts:20-22`, `index.ts:6-9`), X25519/`crypto_box`
(`crypto/keywrap.ts`, `crypto/rekey.ts`), HKDF-SHA256 (`crypto/presence-key.ts:10,30`), BLAKE2b
(`crypto/identity.ts:28-44`). The "What the server can still see" disclosure — _"It sees who shares
a vault with whom, who made each change and when, and how much data changed. It cannot see amounts,
descriptions, tags or allocations."_ — is **exactly** what my schema and payload inspection found
(`vault_ops` = `vault_id, author_pubkey_hash, created_at`, opaque ciphertext; zero plaintext hits).
No false or overreaching claim identified.

### 10.1 Server-log warnings during E2E — investigated, benign (NOT a finding)

Green runs emit a recurring cluster of dev-server warnings that I did not want to wave through, so I
traced them: per run, ~11 × `tRPC failed on realtime.revoke: Request authentication failed`, ~4 ×
`vault.list: Request authentication failed`, ~3 × each of the `Missing authentication headers`
variants, 1 × `realtime.authorize`.

These are **teardown-ordering artifacts, not authorization defects**. `credentials?.revoke()` is
called from `VaultRealtimeSync`'s teardown path (`src/lib/supabase/realtime.ts:342`, reached after
`removeChannel` / `realtime.disconnect()`), and `revoke()` itself (`:128-146`) issues an
authenticated tRPC call. On lock/sign-out/page-close the signing session is already cleared by the
time that teardown call goes out, so the server correctly rejects an unsigned request — the client
is trying to be polite and release a grant it can no longer authenticate for. The security-relevant
direction is unaffected: the grant still expires and is still gated by `realtime_grant_allows`, and
`vault-settings.spec.ts:188-202` positively asserts that a lock/unlock cycle produces
`revoke.sync >= 1`, i.e. the revoke path is exercised and expected. Nothing here indicates a client
retaining access after removal — `realtime-security.spec.ts:24` ("…and stops after removal") covers
that case directly and passed in every green run.

Worth noting as a minor quality observation (explicitly **not** a blocker and **not** routed): these
lines are logged at warn level on every ordinary lock, so they are expected noise rather than
signal. A future cleanup could either revoke before clearing the session or downgrade the log level.
I raise it only so the next auditor does not have to re-derive that this cluster is benign.

## 11. C-1 — upstream registry currency drift (NON-BLOCKING; recommend accepted carry-forward)

Independently measured at the audit instant (installed vs safe-chain-visible `dist-tags.latest`):

| Package                   | Installed         | Registry latest | Drift |
| ------------------------- | ----------------- | --------------- | ----- |
| `next`                    | 16.2.11           | **16.2.11**     | none  |
| `sharp`                   | 0.35.3 (override) | 0.35.3          | none  |
| `zod`                     | 4.4.3             | 4.4.3           | none  |
| `motion`                  | 12.42.2           | 12.42.2         | none  |
| `react` / `react-dom`     | 19.2.7            | 19.2.8          | patch |
| `@tanstack/react-virtual` | 3.14.6            | 3.14.8          | patch |
| `loro-crdt`               | 1.13.7            | 1.13.8          | patch |
| `radix-ui`                | 1.6.2             | 1.6.7           | patch |
| `@supabase/supabase-js`   | 2.110.7           | 2.110.8         | patch |
| `lucide-react`            | 1.25.0            | 1.26.0          | minor |

**Recommendation: explicit human-accepted carry-forward, NOT a blocker.** Reasoning:

1. **It is currency, not security.** `pnpm audit --prod` is exit 0 / 0 advisories. This is
   categorically unlike rev-03's F-1, which was a live advisory.
2. **The drift postdates the fix.** These `latest` versions published 2026-07-20…24; the HS-002 fix
   commit `371a88a` landed 2026-07-28 02:27 but its dependency selection was made against the
   safe-chain-visible set at P01 rev-03 execution time. A completion gate cannot outrun upstream
   publication — chasing it re-opens P01 on every new npm publish, an unbounded loop with no
   terminating condition.
3. **HS-002's frozen text is satisfiable only relative to the safe chain**, and the safe chain is
   precisely what age-suppression enforces. The `next` case proves the principle is already applied
   correctly and is uncontested: 16.2.12 exists upstream but is age-suppressed, and installing
   16.2.11 is the _correct_ reading of "very latest safe-chain supported version."
4. Every drifted item is a patch bump except `lucide-react` (icon set minor). None is load-bearing
   for any HS requirement.

Root should record this as an explicitly human-accepted carry-forward with the measured table above.
I am recommending, not granting.

## 12. Collector-claim reconciliation

| Collector claim                                        | My independent finding                                                                                                     |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `pnpm audit --prod` clean                              | **Confirmed** — exit 0, 0 advisories                                                                                       |
| `next@16.2.11` is safe-chain latest (not 16.2.12)      | **Confirmed** — `dist-tags.latest` is 16.2.11; suppression message observed                                                |
| `sharp@0.35.3` via workspace override, prebuilt loads  | **Confirmed, and strengthened** — binary loads _and_ encodes (libvips 8.18.3)                                              |
| Lint 0 errors + 1 known warning                        | **Confirmed**                                                                                                              |
| Format flags only frozen specs md                      | **Confirmed** — 15 files, all under `specs/`                                                                               |
| F-1 `import.spec.ts:1512` is new, no prior hits        | **Confirmed** — my own grep: zero hits in QUESTIONS.md / P20B / P21 / reviews                                              |
| F-1 is a class (`:1279 :1412 :1459 :1512 :1539 :1616`) | **Confirmed, and extended** — also `:1573`; and `import.spec.ts` was **never touched by any P20B revision**                |
| F-1 observed 1/8 full-suite                            | **Not reproduced** — 0/8 in my campaign; but non-reproduction ≠ absence, and the mechanism is independently confirmed real |
| **`identity.spec.ts:282` green 8/8**                   | **CONTRADICTED — 1/8 FAILED in my campaign.** Honest sample difference; this is the audit's material finding (F-2)         |

The last two rows are the important pair, and they point the same way. The collector saw F-1 fail
and `identity:282` pass; I saw the exact inverse. Neither of us is wrong — that is the signature of
a _class_ of load-dependent races in which which member surfaces is environmental. It is also why
"run it again and see if it's green" is not a valid disposition for either one, and why I decline to
treat my own 0/8 on F-1 as exoneration.

## 13. Blockers and routing

1. **F-2 (primary, new):** `tests/e2e/identity.spec.ts:282` "unlock journey: enter seed phrase and
   access transactions", step "validate BIP39 words with visual feedback", assertion `:359`
   `await expect(firstInput).toHaveClass(/border-green-500/)`. Regression of a fix P20B rev 02
   already delivered and had accepted. No covering ticket. → **P20B (rev 06)**; needs a new
   Q-number. Fix must gate on post-state-propagation evidence rather than DOM value, and **must be
   validated under repeated FULL-SUITE load — isolation runs are what let this through the first
   time.**
2. **F-1 (carried, collector-raised, independently upheld as untracked):**
   `tests/e2e/import.spec.ts:1512` inside the test declared at `:1445`. Not covered by Q-P20B-14
   (which is the `:1527` declaration). → **P20B**, same Q-number batch, hardening the whole
   `import.spec.ts` eager-assertion cohort (`:1279 :1412 :1459 :1512 :1539 :1573 :1616`) — the one
   spec file every previous P20B sweep skipped.
3. **C-1 (non-blocking):** recommend explicit human-accepted carry-forward; root records
   disposition.

Everything else in the audit contract §29-56 and FINAL-AUDIT passed independently.

## 14. Cleanup

Disposable state created and removed: local DB re-bootstrapped from empty via `pnpm db:reset` (the
E2E-generated rows are ordinary test data in the local-only Supabase stack, containing no plaintext
— verified in §7); Playwright web servers are per-run and torn down by the runner; all scratch
artifacts (run logs, the synthetic probe script and its synthetic keypair, the vitest JSON report,
the campaign runner) lived under `/tmp` only and have been deleted. The synthetic Ed25519 keypair
existed only in that process's memory and was never written to disk or printed beyond a truncated
public half. No browser profile, session, or credential persisted into the repo.

**Final state, re-verified after all work:**

- HEAD `e94a4b9532701a0257c6c99da577db5f3e08fdfc` — unchanged from BASE.
- `git diff 371a88a HEAD -- . ':(exclude)specs'` → still **0 lines**; product never moved while I
  ran.
- `sha256sum specs/human-scratch.md` → `469e98c7…` unchanged; FS-001 → `0d0e2a14…` unchanged.
- Working tree: `M next-env.d.ts` (inert, Next-regenerated), the two pre-classified untracked
  evidence files, and **this review** — nothing else.
- **Nothing committed.** Last commit is still root's
  `e94a4b9 docs: dispatch P21 rev 04 independent review phase`.

One observation for root, not a finding: a stray `next-server (v16.2.6)` process is running on this
host from another agent's session. It is not on BASE's `next@16.2.11` and is not mine; I left it
alone. It did not hold port 3000 during my campaign.
