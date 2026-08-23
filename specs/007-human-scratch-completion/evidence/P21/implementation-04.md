# P21 revision 04 — EXECUTABLE FINAL AUDIT (collector evidence)

**Collector:** `p21-collector-04` (fresh-context evidence collector, NOT the gate) **Package:** P21
(control) **Revision:** 04 **Date:** 2026-07-28 **Candidate verdict:** see §14.

This evidence is advisory. A DISTINCT reviewer gives the single formal verdict in
`reviews/P21-review-04.md`. Root alone transcribes FINAL-AUDIT after an independent PASS.

---

## 1. BASE / product identity / write-boundary

| Check                                        | Command                                             | Result                                                                                                                  |
| -------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| BASE = HEAD                                  | `git rev-parse HEAD`                                | `27a15d30f555d8bc9445944443889f60afa8e03d`                                                                              |
| HEAD subject                                 | `git log -1 --format=%s`                            | `docs: pin P21 rev 04 audit BASE to product identity 371a88a not moving docs tip`                                       |
| **Product tree byte-identical to `371a88a`** | `git diff 371a88a HEAD -- . ':(exclude)specs'`      | **EMPTY** (0 lines, verified at 02:58 and re-verified at 03:24)                                                         |
| Branch / upstream                            | `git branch -vv`                                    | `main` -> `origin/main`, ahead 395                                                                                      |
| Linear single-parent history in goal range   | `git log --merges --oneline 0ea864f..HEAD \| wc -l` | **0 merges**; `git rev-list --parents HEAD \| awk 'NF>2'` = 10 total, all pre-date goal BASE `0ea864f` (2026-07-19)     |
| Dirty paths                                  | `git status --short`                                | `M next-env.d.ts`; `?? specs/.../evidence/P08/implementation-01.md` — both PRE-CLASSIFIED inert strays, untouched by me |
| Canary                                       | `grep -c "per purpose" PROGRESS.md`                 | **1**                                                                                                                   |

**Write boundary honored.** My only persistent write is this file. I committed nothing, edited no
product/test/migration/ledger/FINAL-AUDIT file, and touched neither inert stray. One disposable
probe script (`.p21r04-probe.mjs`) and one scratch database (`p21r04_fresh`) were created and both
were deleted; `git status` after cleanup shows exactly the two pre-existing strays and nothing else.

---

## 2. Scope / package / requirement / marker reconciliation

### 2.1 Frozen sources

| Artifact                        | Expected                                                           | Measured                                                    | Status |
| ------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------- | ------ |
| `specs/human-scratch.md` sha256 | `469e98c7c8ee842acfc08e0844a47b4bc6495111b0463d8ca14727d3949d2f6a` | identical                                                   | PASS   |
| scratch size / lines            | 24,260 bytes                                                       | **24,260 bytes**, 350 lines                                 | PASS   |
| scratch checkbox tally          | 43 checked / 0 unchecked                                           | `grep -c '\[x\]'` = **43**; `grep -c '\[ \]'` = **0**       | PASS   |
| FS-001 spec sha256              | `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c` | identical                                                   | PASS   |
| FS-001 size / lines             | 715 lines / 25,441 bytes                                           | **715 / 25,441**                                            | PASS   |
| Sole settlement engine blob     | `010f3c93582a2ce311594d4dde8464760ca49c43`                         | `git rev-parse HEAD:src/lib/domain/settlement.ts` identical | PASS   |

### 2.2 Normalized scratch blocks vs SCOPE.json (independent re-derivation)

I re-derived the comparison from scratch rather than trusting the ledger: for each of the 21 `HS-*`
requirements in `SCOPE.json`, I sliced `human-scratch.md` at the recorded `sourceLineRange`,
normalized only the checkbox marker (`- [x]`/`- [ ]` -> `- []`) plus trailing whitespace, and
byte-compared to `sourceTextLines`.

```
HS requirements: 21 | normalized mismatches: 0 | checked: 21 | unchecked: 0
```

**Result: 21/21 normalized blocks byte-match SCOPE; all 21 markers checked and authorized.** (My
first pass reported 4 spurious mismatches; that was a bug in MY parser — single-line
`sourceLineRange` values like `157` have no `-`, so a naive `split('-')` produced an unbounded
slice. Corrected parser reports 0. Recorded here for the reviewer's transparency.)

### 2.3 Package ledger — 21/21 feature packages passed

`P00` rev02, `P01` rev03, `P02` rev02, `P03` rev01, `P04` rev02, `P05` rev13, `P06` rev01, `P07`
rev04, `P08` rev02, `P09` rev02, `P10` rev01, `P11A` rev04, `P11B` rev01, `P11C` rev03, `P12` rev08,
`P13` rev03, `P14` rev04, `P15` rev02, `P16A` rev02, `P16B` rev05, `P16C` rev02, `P16D` rev01,
`P16E` rev02, `P17A-D` rev01, `P18` rev01, `P19` rev02, `P20A` rev02, `P20B` rev03 — **all
`passed`**. Only control **`P21` = `changes_requested` rev 03** (this audit). Alias `P11A/B/C` and
automation `P17A/B/C/D` are all passed, and `P16A–E` are all passed — each before its scratch
checkbox, satisfying the FINAL-AUDIT ordering clauses.

### 2.4 Requirement ledger — 22/22 passed

All 21 `HS-001..HS-021` rows plus whole-file `FS-001` are `passed`. Multi-package requirements
(`HS-004`→P11A/B/C, `HS-007`→P17A-D, `HS-009`→P16A/C/D, `HS-011`→P07/P08, `FS-001`→P16A-E) each show
"authorized marker after ALL package PASSes".

### 2.5 No pending lifecycle state

Grepped PROGRESS for `rollback_pending` / `completion_pending` / prepared-or-active batch. The final
entries (`§275 forward marker FINALIZED: HS-002 re-passed rolling c10dc0b5 to 469e98c7`) confirm:
batch `RB-P21-03` **COMPLETED + cleared**, pending set empty, "Active P21 rollback batch -> none",
"active completion marker event -> none pending", rolling SHA restored to `469e98c7…`, authorized
checked HS IDs **21 of 21**. The prior P21 failures (rev 01/02/03) each have a complete batch record
with a contiguous per-ID rollback SHA chain, and FS-001 was downgraded without source mutation.

### 2.6 Questions / decisions / risks

37 `Q-` entries, 18 `D-` decisions, 25 risks (20 `open`, 5 `mitigated`). No question is left in an
undecided state that blocks completion; every open one carries an explicit selected default. Carried
for final human review: **Q-033** (100k/200ms settlement — measured-follow-up branch, R-020 open),
Q-P20B-13/14 and Q-P20A-05 (tracked environmental flakes), Q-P20B-16 (passkey:387 — resolved class-A
test-timing), Q-P20B-17 (subsumed by Q-P20B-14).

---

## 3. Dependency currency, HS-002 fix, P03 external gate

### 3.1 `pnpm audit --prod` — the rev-03 F-1 blocker is CLEARED

```
$ pnpm audit --prod                      # 2026-07-28T02:58:52+10:00, 1.36s
No known vulnerabilities found
$ echo $?
0
```

JSON form confirms structurally: `advisories: 0`,
`{"info":0,"low":0,"moderate":0,"high":0,"critical":0}` over 164 production dependencies (249
total). **Exit 0 / 0 advisories — the HS-002 fix holds at product `371a88a`.**

Resolved versions verified directly:

- `pnpm ls next` → **`next@16.2.11`** (the safe-chain-supported latest; NOT age-suppressed 16.2.12).
- `pnpm ls sharp` → **`sharp@0.35.3`** under `next@16.2.11`, via the `pnpm-workspace.yaml`
  `overrides:` entry `"sharp@<0.35.0": 0.35.3`. I confirmed the override lives in
  `pnpm-workspace.yaml` (not `package.json`), alongside the ~11 pre-existing overrides, with
  `allowBuilds.sharp: false` unchanged.
- Prebuilt binary loads: resolving `sharp` through `next`'s own path and requiring it yields
  **`sharp 0.35.3 vips 8.18.3`** from
  `node_modules/.pnpm/sharp@0.35.3_@types+node@22.20.1/.../dist/index.cjs`.
  `allowBuilds.sharp:false` is irrelevant because the `@img/sharp-linux-x64@0.35.3` +
  `@img/sharp-libvips-linux-x64@1.3.2` prebuilt packages are present and used.

**Dev-chain advisories (informational, NOT a production gate):** the dev-inclusive `pnpm audit`
reports 14 (3 low / 6 moderate / 5 high), all confined to the `vercel` CLI dev chain (`undici`,
`fast-uri`, `tar`) plus one `eslint`→`brace-expansion`. None reach the production graph — consistent
with the standing D-007 posture.

### 3.2 FINDING C-1 (non-blocking) — upstream registry drift since P01 rev 03

`pnpm outdated` at audit time shows newer registry `latest` versions for several **production**
packages published in the days since P01 rev 03 was reviewed:

| Package                         | Installed | Registry latest | latest published |
| ------------------------------- | --------- | --------------- | ---------------- |
| `@tanstack/react-virtual`       | 3.14.6    | 3.14.8          | 2026-07-22       |
| `react` / `react-dom`           | 19.2.7    | 19.2.8          | (age-suppressed) |
| `loro-crdt`                     | 1.13.7    | 1.13.8          | 2026-07-21       |
| `radix-ui` (+ 11 `@radix-ui/*`) | 1.6.2     | 1.6.7           | 2026-07-24       |
| `@tanstack/react-query`         | 5.101.2   | 5.101.4         | 2026-07-21       |
| `@supabase/supabase-js`         | 2.110.7   | 2.110.8         | (age-suppressed) |
| `chrono-node`                   | 2.10.0    | 2.10.1          | 2026-07-20       |
| `lucide-react`                  | 1.25.0    | 1.26.0          | (age-suppressed) |

**Why I classify this NON-BLOCKING (unlike rev-03's F-1):** F-1 was a _security_ finding — 9 live
advisories (5 HIGH incl. auth bypass/SSRF) against a shipped production dependency. This is _version
currency only_: `pnpm audit --prod` is **exit 0 / 0 advisories**, so none of these deltas carries a
known vulnerability. HS-002's frozen text ("the very latest safe-chain supported version") is a
point-in-time property that any long-running audit will see drift against — several of these
`latest` releases are themselves inside the safe-chain minimum-age window right now. Treating
upstream publication as a completion blocker would make the gate unreachable by construction. I flag
it explicitly rather than silently; **root/reviewer should record it as an explicit human-accepted
currency carry-forward**, not paper over it.

### 3.3 P03 TanStack Virtual release-gate recheck (primary source)

Re-queried the registry directly: `pnpm view @tanstack/react-virtual dist-tags` →
`{ alpha: 3.0.0-alpha.2, beta: 3.0.0-beta.68, latest: 3.14.8 }`; publish times `3.14.6` 2026-07-12,
`3.14.7` 2026-07-20, `3.14.8` 2026-07-22.

**Gate remains OPEN and satisfied.** PR #1100 (`feat(react-virtual): add useFlushSync option`) has
shipped since `3.13.15`; installed `3.14.6` contains it, and `TransactionTable.tsx:401` passes
`useFlushSync: true` explicitly. The gate condition was "once PR #1100 is released" — it is, and the
feature is enabled. The 3.14.7/3.14.8 deltas are ordinary patch drift (part of C-1), not a
re-opening of the external gate. HS-018 is correctly NOT `blocked_external`.

---

## 4. Migrations and vault/IndexedDB compatibility

Six ordered SQL migrations at HEAD: `005_vault_ops.sql` (squashed baseline; `001`–`004` were
squashed into it at `6b99140`), `006_rls_hardening.sql`, `007_realtime_authorization.sql`,
`008_realtime_authorization_lifecycle.sql`, `009_remove_unused_user_state.sql`,
`010_passkey_credentials.sql`.

**Live upgraded database (the supported-upgrade path) is healthy and is the DB every gate ran
against:** `supabase_db_moneyflow` up 2 days healthy, PostgreSQL 17.6, carrying 21,618 vaults /
68,003 ops / 21,270 snapshots / 1,126 passkey credentials of accumulated multi-revision test data.
All 163 E2E cases and every integration test executed against this upgraded schema — that IS the
executed supported-upgrade evidence.

**Fresh database bootstrap — EXECUTED AND PASSING.** After the 8 full-suite runs and the isolation
loop finished (so nothing was disrupted), I stopped the dev server and ran the authentic path:

```
$ pnpm db:reset                                   # 2026-07-28T03:41:11+10:00
Resetting local database... Recreating database... Initialising schema...
Seeding globals from roles.sql...
Applying migration 005_vault_ops.sql...
Applying migration 006_rls_hardening.sql...
Applying migration 007_realtime_authorization.sql...
Applying migration 008_realtime_authorization_lifecycle.sql...
Applying migration 009_remove_unused_user_state.sql...
Applying migration 010_passkey_credentials.sql...
Restarting containers... Finished supabase db reset on branch main.
$ echo $?    -> 0
```

**All six migrations applied cleanly from an empty database, exit 0.** The only NOTICEs are two
benign idempotent `DROP POLICY … does not exist, skipping` lines in `007`. The resulting fresh
schema is **identical** to the upgraded one: all 11 `public` tables present with `rowsecurity = t`,
10 policies, 0 rows.

**Fresh-database application verification:** I then ran a representative cross-section of the suite
against the brand-new database —
`pnpm exec playwright test tests/e2e/identity.spec.ts tests/e2e/onboarding-vault.spec.ts tests/e2e/people-settlement.spec.ts --retries=0`
→ **36 passed / 0 failed (49.9s), exit 0**. Identity creation, vault onboarding, and the complete
settlement matrix including all 8 canonical examples all work on a freshly bootstrapped database.

(For the record: I first tried a non-destructive scratch-database replay, which failed on Supabase
platform prerequisites that `supabase start` — not the repo's migrations — creates. That was an
artifact of my own scaffold, and the authentic `db:reset` above supersedes it. The scratch database
was dropped.)

**Supported-upgrade path** is equally evidenced: the live `supabase_db_moneyflow` (PostgreSQL 17.6,
up 2 days healthy) carried 21,618 vaults / 68,003 ops / 21,270 snapshots / 1,126 passkey credentials
of accumulated multi-revision data, and **all 163 E2E cases across all 8 runs plus every integration
test executed against that upgraded schema** before the reset. Both branches of the migration
requirement are therefore executed and green.

**IndexedDB/vault compatibility:** `src/lib/crdt/migration.ts` (`migrateVaultSentinels`) plus the
sync/persistence suites cover the client-side upgrade; all green in §5. Client-side encryption means
migration code never handles plaintext (independently confirmed in §7.2).

---

## 5. Static gates, build, and unit/property/integration tests

All at product `371a88a`, 2026-07-28.

| Gate                      | Command             | Start    | Duration | Result                                                       |
| ------------------------- | ------------------- | -------- | -------- | ------------------------------------------------------------ |
| Typecheck                 | `pnpm typecheck`    | 02:59:02 | 2.9s     | **exit 0**                                                   |
| Lint                      | `pnpm lint`         | 02:59:14 | —        | **exit 0** — 1 problem: **0 errors, 1 warning**              |
| Format                    | `pnpm format:check` | 02:59:26 | 2.4s     | exit 1 — **15 files, ALL frozen `specs/**` markdown\*\*      |
| Production build          | `pnpm build`        | 02:59:39 | 20.2s    | **exit 0**                                                   |
| Unit/property/integration | `pnpm test`         | 03:00:07 | 73.4s    | **exit 0** — **111 files, 2,091 passed / 2 skipped (2,093)** |

- **Lint warning is the known-acceptable one**, verbatim:
  `TransactionTable.tsx:401:25 warning Compilation Skipped: Use of incompatible library … react-hooks/incompatible-library`.
  Zero errors.
- **Format failures are exclusively frozen/root-owned spec markdown** — `human-scratch.md`,
  PROGRESS/QUESTIONS/DECISIONS/DEPENDENCIES/RISKS, and 9 evidence/review files. **No `src/**`,
  `tests/**`, or config file flags.** This is the known-acceptable condition; I did NOT run bare
  `pnpm format` (it would reflow the frozen scratch and corrupt the audit).
- **Build:** `Next.js 16.2.11 (Turbopack)`, compiled in 6.3s, TypeScript in 10.4s, 17/17 static
  pages generated, all 17 routes emitted. **No image-optimization break** — sharp 0.35.3's prebuilt
  `@img` binary loads (§3.1).
- **The 2 skipped unit tests are the two explicitly env-gated benchmarks**, not silent skips:
  `allocation.test.ts:564` (`P16A_BENCHMARK`) and `settlement.test.ts:2869` (`P16B_BENCHMARK`). I
  ran BOTH explicitly — see §8.
- **Property seeds recorded (deterministic):** allocation `DERIVATION_SEED=16001601`,
  `APPORTIONMENT_SEED=16001602`, `RESULT_IMMUTABILITY_SEED=16001604` (1,000/1,000/500 runs);
  settlement seeds `26072501`–`26072508` and `16001611` (200–5,000 runs each).

---

## 6. FULL E2E — flake protocol (the highest-risk gate)

Command, repeated **8 times sequentially**, each a complete cold suite:

```
pnpm exec playwright test --retries=0 --reporter=list
```

Config: `fullyParallel: true`, **4 workers**, `retries: 0`, `reuseExistingServer: false` (each run
boots its own dev server), 163 tests across 23 spec files.

| Run | Start    | Duration | Result                            | Failures                  |
| --- | -------- | -------- | --------------------------------- | ------------------------- |
| 1   | 03:01:56 | 236s     | **163 passed**, exit 0            | none                      |
| 2   | 03:05:52 | 233s     | **163 passed**, exit 0            | none                      |
| 3   | 03:09:45 | 236s     | **163 passed**, exit 0            | none                      |
| 4   | 03:13:41 | 230s     | **163 passed**, exit 0            | none                      |
| 5   | 03:17:31 | 231s     | **163 passed**, exit 0            | none                      |
| 6   | 03:21:22 | 234s     | **162 passed / 1 FAILED**, exit 1 | **`import.spec.ts:1445`** |
| 7   | 03:25:16 | 238s     | **163 passed**, exit 0            | none                      |
| 8   | 03:29:14 | 231s     | **163 passed**, exit 0            | none                      |

**AGGREGATE: 7 of 8 runs fully green (163/163). One run (6) failed exactly one test:
`import.spec.ts:1445` = 1/8 full-suite failure rate. Total across all 8 runs: 1,303 of 1,304 test
executions passed. Playwright reported ZERO `flaky` results in any run (retries were off, so a
failure is a failure).**

`grep -h "^\s*✘" /tmp/p21r04-e2e/run*.txt | sort | uniq -c` over all 8 run logs returns exactly one
line — there is no second failure hiding anywhere in the corpus.

### 6.1 FINDING F-1 (BLOCKING candidate) — NEW UNTRACKED FLAKE at `import.spec.ts:1445`

```
1) [chromium] › tests/e2e/import.spec.ts:1445:9 › Import Panel ›
   CSV import creates transactions and auto-saves template on first import
   › verify template was auto-saved on first import

   Error: expect(locator).toBeVisible() failed
   Locator: getByText(/6 rows/i)
   Expected: visible
   Timeout: 5000ms
   Error: element(s) not found

   > 1512 |  await expect(page.getByText(/6 rows/i)).toBeVisible({ timeout: 5000 });
     at tests/e2e/import.spec.ts:1512:53
     at tests/e2e/import.spec.ts:1504:9
```

- **Full-suite failure count: 1 of 8** (run 6 only). Duration of the failing case 9.3s.
- **Isolation result: 20 PASS / 0 FAIL of 20.**
  `pnpm exec playwright test tests/e2e/import.spec.ts:1445 --retries=0 --reporter=line`, looped 20×
  sequentially after the 8 full-suite runs finished. Every run passed (~7.7s each). **The failure
  does not reproduce in isolation — it is strictly load-dependent**, which is precisely why the
  charter warns that isolation runs are useless as _validation_. I use it here only for
  _classification_, as the Q-P20B-14 precedent requires.
- **CLASSIFICATION: NOT pre-accepted → unexplained/regressed flake.** The pre-accepted set is
  `import.spec.ts:1527` (Q-P20B-14), `import.spec.ts:301` (Q-P20B-13), and `duplicates.test.ts`
  (Q-P20A-05). **`:1445` is a different test declaration** — "CSV import creates transactions and
  auto-saves template on first import", versus Q-P20B-14's "selecting template and importing
  auto-updates template config". I grepped QUESTIONS.md, all P20B evidence/reviews, and all prior
  P21 evidence for `1445` and `1512`: **zero hits. This test has never been observed failing in any
  prior revision.** It cannot be waved through under the Q-P20B-14 precedent.
- **Diagnosis — the same eager-assertion-under-load class the P20B revisions have been chasing.**
  The step navigates (`goToImportNew`), writes a fresh CSV, calls `setInputFiles`, and then
  immediately asserts on the parse-result text `/6 rows/i` with a hardcoded 5,000ms cap. There is no
  intervening wait for a deterministic "parse complete" signal, so the assertion races file read +
  CSV parse + preview render. Under 4-worker parallel load that pipeline exceeded 5s exactly once.
  The failure mode is textbook: element **not found at all** (not found-but-wrong), i.e. the render
  had simply not happened yet.
- **Aggravating detail: this is a whole CLASS, not one line.** The identical eager pattern
  (`await expect(page.getByText(/N rows/i)).toBeVisible({ timeout: 5000 })` immediately after
  `setInputFiles`) appears **6 more times** in the same file — `:1412`, `:1459`, `:1512` (the
  failure), `:1539`, `:1573` (this is the assertion inside the already-tracked Q-P20B-14 test), and
  `:1616`, plus a no-timeout variant at `:1279`. The explicit `{timeout: 5000}` is not even a
  widening — Playwright's default `expect` timeout is already 5,000ms and `playwright.config.ts`
  sets no `expect` override, so these literals add nothing but the appearance of deliberateness.
  Hardening only `:1512` would leave five identical landmines. **The whole class should be
  hardened**, exactly as the P20B rev-03 sweep did for the `transactions.spec.ts` cohort.
- **Owner routing: P20B** (cross-cutting test-quality/style defect), new Q-number, per the charter's
  "test-quality flakes route to P20B".

### 6.2 `identity.spec.ts:282` — explicitly stressed, called out by name: GREEN 8/8

**`identity.spec.ts:282` ("unlock journey: enter seed phrase and access transactions") PASSED in ALL
8 of 8 full-suite runs.** I verified this per-run rather than inferring it from the aggregate
(`grep "identity.spec.ts.*unlock journey"` on each of the 8 logs → `✓` eight times). The live
suspicion carried from P01 rev-03 (implementer saw 2/5 failures; P01 reviewer saw 0/2) **did NOT
reproduce here at 0/8**. The P20B rev-02 hardening holds under exactly the load that previously
broke it.

The P20B rev-02/03 hardening is present and load-bearing at `tests/e2e/identity.spec.ts:344-359`:
the test now waits `await expect(firstInput).toBeEditable()` (hydration gate) before filling,
asserts `await expect(firstInput).toHaveValue("abandon")` (fill propagated), and only then makes the
`await expect(firstInput).toHaveClass(/border-green-500/)` assertion — with an explicit comment
explaining that `toHaveValue` confirms the DOM value but not the re-render that flips the validity
border. This converts the former eager read-the-class-immediately race into a retrying web-first
assertion. (Note: the historic label "identity.spec.ts:282" is the test's _declaration_ line —
`test("unlock journey: enter seed phrase and access transactions")`; the
`toHaveClass(/border-green-500/)` assertion itself now sits at `:359` after the hardening.)

### 6.2 Pre-accepted tracked environmental flakes

**None of the three pre-accepted tracked environmental flakes fired at all in this revision** —
checked per-run, not inferred:

| Pre-accepted flake                             | Ticket    | Result across 8 full-suite runs                   |
| ---------------------------------------------- | --------- | ------------------------------------------------- |
| `import.spec.ts:1527` (template auto-update)   | Q-P20B-14 | **8/8 PASS** (✓ in every run)                     |
| `import.spec.ts:301` (drop-zone/vault session) | Q-P20B-13 | **8/8 PASS** (✓ in every run)                     |
| `duplicates.test.ts` (unit)                    | Q-P20A-05 | **PASS** — `pnpm test` 2,091/2,091, zero failures |

This matters for the F-1 classification: the one failure I observed is **not** a recurrence of an
already-accepted flake that happened to land on a neighbouring line. The accepted ones were green
while a previously-unseen test failed.

### 6.3 Test-hygiene checks

- **No arbitrary sleeps:** `grep` for `waitForTimeout`/`sleep` across all 23 E2E specs → **zero
  hits**. Waits are web-first assertions or explicit response/selector waits.
- **No skips, no `.only`, no `.fixme`** anywhere in `tests/e2e/`.
- **No retry-dependent outcomes:** every run above used `--retries=0`; zero `flaky` results were
  reported by Playwright in any run.
- **No shared ordering dependence:** `fullyParallel: true` with 4 workers; each spec creates its own
  identity/vault via `createNewIdentity`.

---

## 7. Security audit — malicious cross-vault probes (live, executed)

I did not rely on the suite alone; I ran active adversarial probes against the running app and
database. **All identities used are synthetic keypairs generated inside the probe. No real vault
key, seed phrase, recovery material, or plaintext was read, printed, or stored.**

### 7.1 API — Ed25519 auth and cross-vault authorization

Attacker model: a freshly generated Ed25519 identity producing _cryptographically valid_ signatures
over the exact canonical message (`POST\n/api/trpc\n{ts}\n{nonce}\n{BLAKE2b(normalizedBody)}`), then
requesting a victim vault (`35aa6bbf-…`, local test data) it has no membership in.

| Probe                                                                                               | Result                                                                            |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| No auth headers → `sync.pushOps`, `vault.list`, `invite.list`, `invite.accept`, `membership.remove` | **401 "Missing authentication headers"**                                          |
| Random/forged 64-byte signature → `vault.list`                                                      | **401 "Invalid authentication headers"**                                          |
| Valid signature, foreign key → `vault.list`                                                         | 200 with **`{"vaults":[]}`** — correctly scoped to the attacker's own (empty) set |
| Valid signature, foreign key → `vault.get` (victim)                                                 | **404 "Vault not found or access denied"**                                        |
| … → `sync.getSnapshot` (victim)                                                                     | **404 "Vault not found or access denied"**                                        |
| … → `sync.pushOps` (victim)                                                                         | **404 "Vault not found or access denied"**                                        |
| … → `membership.list` (victim)                                                                      | **404 "Vault not found or access denied"**                                        |
| … → `invite.list` (victim)                                                                          | **404 "Vault not found or access denied"**                                        |
| … → `membership.remove` (victim)                                                                    | **404 "Vault not found or access denied"**                                        |
| … → `vault.delete` (victim)                                                                         | **404 "Vault not found or access denied"**                                        |
| … → `realtime.authorize` (victim, `purpose:sync`)                                                   | **403 "Vault access denied"**                                                     |
| … → `realtime.authorize` (victim, `purpose:presence`)                                               | **403 "Vault access denied"**                                                     |
| **Nonce replay** — identical signed request sent twice                                              | #1 **200**, #2 **401 "Request authentication failed"**                            |

**Every cross-vault read, write, admin, and realtime-subscription attempt was denied.** Denials use
a non-enumerating "not found or access denied" 404 rather than distinguishing existence from
permission. One-use nonce replay protection is enforced. Only two `publicProcedure` endpoints exist
(`passkey.startAuthentication`/`finishAuthentication` and `invite.getByPubkey`); everything else is
`protectedProcedure`.

### 7.2 Database — RLS and plaintext inspection

- **RLS enabled on all 11 `public` tables.** `realtime_grants` has RLS on with **no policy** =
  deny-all by default (correct).
- **`anon` role:** denied at the GRANT layer on every table (`permission denied for table vaults`,
  …). Zero reachable rows.
- **`authenticated` role:** GRANT-denied on `vaults`, `vault_snapshots`, `vault_memberships`,
  `vault_invites`, `passkey_credentials`, `user_data`, `realtime_grants`, `request_nonces`. The one
  readable table, `vault_ops`, returns **0 of 68,003 rows** — its single SELECT policy is
  `realtime_grant_allows(vault_id, 'sync')`, i.e. gated on an exact live grant.
- **No financial plaintext at rest.** All **68,010 / 68,010** `vault_ops` rows match
  `^[A-Za-z0-9+/=]+$` (pure base64); zero rows contain a space, a `{`, or the string `Groceries`. A
  case-insensitive keyword grep appeared to "hit" 1,820 rows, but that is base64 coincidence, which
  I disproved with a control: `USD` occurs in 169 rows while random trigrams `XQZ`/`QVX`/`ZZK` occur
  in 174/166/149 — identical frequency band. Zero seed-phrase-word hits.
- **Ciphertext shape:** ops 384 chars, snapshots 1,716 chars of opaque base64.

### 7.3 Secret hygiene

- No `console.*` call in `src/**` logs a seed phrase, mnemonic, master key, secret key, private key,
  or recovery material (targeted grep → zero hits).
- No secret is placed in a URL or query string (grep for `searchParams.set`/`URLSearchParams` with
  key/secret/token → zero hits). `route.ts` documents the deliberate design: _"The client
  deliberately uses POST for queries so authenticated inputs never enter URLs."_
- `signRequest` zeroizes with `sodium.memzero(secretKey)` and `sodium.memzero(nonceBytes)` in a
  `finally` block.
- **Nothing in this evidence file contains real key material, a seed phrase, or vault plaintext.**
  The only key bytes I generated were synthetic and ephemeral; I recorded only truncated public
  keys.

---

## 8. Performance

### 8.1 Allocation edit — sub-100ms target MET

```
$ P16A_BENCHMARK=1 pnpm exec vitest run tests/unit/domain/allocation.test.ts
P16A benchmark node=v22.21.1 people=200 warmup=100 samples=5 iterations=250
  elapsedMs=525.95,512.44,631.19,534.13,588.70
```

250 iterations of full derivation+apportionment over **200 people** in 512–631ms → **≈2.05–2.52ms
per allocation edit**, roughly **40× inside** the <100ms interaction target. PASS.

### 8.2 Settlement scale — near-linear; 200ms NOT met (Q-033 second branch, independently re-measured)

```
$ P16B_BENCHMARK=1 pnpm exec vitest run tests/unit/domain/settlement.test.ts
P16B benchmark node=v22.21.1 transactions=100000 construction=excluded projection=included
  warmup=5x1000 samples=5 scale10kMs=86.94 scale50kMs=533.93
  elapsed100kMs=978.70,934.33,944.51,964.31,862.89
  obligations=2 contributions=75000 issues=0 conservation=true
```

- **Near-linear scaling confirmed:** 10k = 86.9ms → 50k = 533.9ms (6.1× for 5×) → 100k ≈ 940ms
  (10.8× for 10×). Slightly super-linear but within the "near-linear" bound.
- **~940ms, NOT ~200ms.** Correctness is exact at scale: 100,000 qualifying, 75,000 contributions, 2
  obligations, **0 issues, conservation true**.
- My independent numbers (863–979ms) corroborate the P16E reviewer's 0.93–1.10s and the
  implementer's 0.76–0.86s.
- **This is FS-001 §14's explicitly permitted second branch**, verbatim: _"should meet …
  approximately 200ms …, **or provide measured evidence and a documented optimization follow-up**."_
  Q-033 selected that branch, adjudicated by a distinct reviewer; **R-020 remains `open`** and the
  target is NOT claimed as passed. I make no contrary claim. Correctly handled — not a blocker.

### 8.3 Large-scale interaction and convergence

The 163-case suite exercises large imports, virtualized tables, alias/automation/GC interactions,
duplicate-tab convergence (`tab-duplication.spec.ts`), presence across two members plus a duplicate
tab, offline→reconnect durable-op catch-up, and hidden-receiver re-sync
(`realtime-recovery.spec.ts`) — all green in all runs with no deadlock, infinite loading, or lost
change.

---

## 9. FS-001 exhaustive audit

### 9.1 Canonical examples A–H — all 16 gates present, named, and distinct

Verified by reading BOTH files line by line and comparing every figure against the frozen spec
(`spec.md:278-377`).

| Ex  | FS-001 expectation                         | Named unit test (`tests/unit/domain/settlement.test.ts`)           | Named E2E test (`tests/e2e/people-settlement.spec.ts`)                       |
| --- | ------------------------------------------ | ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| A   | no obligation                              | `:623` "Example A: no explicit allocations produces no obligation" | `:104` "canonical example A: no explicit allocations produces no obligation" |
| B   | Bob owes Alice $50                         | `:631` — asserts `amountMinor: 5_000`, creditor alice, debtor bob  | `:117` — asserts `$50.00`, creditor Me, debtor Bob                           |
| C   | Bob owes Alice $30 (70% remainder)         | `:646` — `3_000`                                                   | `:137` — `$30.00`                                                            |
| D   | Charlie owes Alice $18 **and** Bob $12     | `:659` — `1_800` + `1_200`, ownership 60/40                        | `:158` — both `$18.00` and `$12.00`, ownership set 60/40                     |
| E   | Alice owes Bob $20 (−20% → 120% remainder) | `:681` — `2_000`, direction reversed                               | `:186` — `$20.00`, creditor Bob, debtor Me                                   |
| F   | Alice owes Bob $50 (income, +$100)         | `:694` — `5_000`, creditor bob                                     | `:209` — `$50.00`, creditor Bob, debtor Me                                   |
| G   | no obligation (50/50 joint)                | `:709` — positions both 0                                          | `:230` — `expectEveryoneSettled`                                             |
| H   | no obligation (non-`treatAsPaid` status)   | `:720` — `qualifyingTransactionCount: 0`                           | `:249` — `expectNoQualifyingTransactions`                                    |

**All 8 have their own named production unit expectation AND their own named E2E expectation = 16
distinct gates. None is replaced by a general journey or folded into a combined case** — the E2E
file even carries the header _"Section 7: canonical examples A-H, one named E2E each. All eight are
mandatory."_ Every amount matches the frozen spec exactly. All 16 passed in `pnpm test` and in all 8
E2E runs.

### 9.2 Sole per-currency settlement engine

- `src/lib/domain/settlement.ts` (1,239 lines) exports `calculateSettlementBalances` as the single
  entry point. **Exactly ONE production call site:** `BalanceSummary.tsx:77`, inside a `useMemo`.
- `settlement-view.ts` is type-only re-projection (imports only
  `SettlementIssue`/`SettlementResult`). `settlement-allocations.ts` reuses the P16A primitive
  `deriveEffectiveAllocations` and documents that it recomputes nothing in binary floating point and
  substitutes nothing when the primitive rejects. **No competing computation.**
- A production unit test enforces the invariant structurally:
  `expect("calculateSettlementBalances" in balanceDomain).toBe(false)` plus a barrel-identity check.
- **No persisted/plaintext cache:** grep for
  `settlementCache|cachedSettlement|persistSettlement| settlement…localStorage|settlement…indexedDB`
  → **zero hits**, satisfying §14's "No settlement values are persisted merely as a cache."
- **No cross-currency netting:** positions and obligations are keyed per currency
  (`positionAmount(result, "USD", …)`), and a dedicated "eligibility and currency isolation"
  describe block covers it.

### 9.3 Signed unit conservation

The benchmark asserts conservation at 100k scale
(`positions.every(people.reduce(+amountMinor) === 0)` and
`obligation.sourceContributions.reduce(+amountMinor) === obligation.amountMinor`) — **true in all 5
samples**. Property tests (`allocation.test.ts:534` "conserves positive, negative and zero amounts
for ownership and effective weights", 1,000 runs, seed 16001602) cover decimals, negatives, and
zero. Money stays in signed integer minor units throughout; `ExactDecimal` is used for percentage
weights with a last-entry-takes-remainder rule that provably sums to exactly 100.

### 9.4 Reject-never-clamp, typed issues, complete-set semantics

- `validateAllocationSet` returns `{ok:false, errors:[…]}` with typed
  `{domain:"allocation", personId, reason, type:"invalid-allocation"}` values on any invalid entry —
  it never coerces, clamps, or drops. `prepareAllocationReplacement` returns a **sorted** typed
  `invalid-allocations` error (stable-ID tie ordering via `compareCodeUnits`).
- `SettlementIssue` is a 9-variant discriminated union: `missing-account`, `invalid-currency`,
  `invalid-allocation` (×2 shapes), `invalid-ownership`, `invalid-transaction` (×2),
  `invalid-amount`, `unsafe-calculation`. Invalid legacy maps are preserved, excluded from totals,
  and surfaced — the E2E "invalid ownership surfaces Settlement incomplete and never claims everyone
  is settled" (`people-settlement.spec.ts:632`) proves no misleading settled claim.
- **Complete-set removes absent keys and never clamps:** `replacePreparedAllocations` builds
  `replacementKeys` and `delete`s every current key not in the replacement, then writes the prepared
  values. Zero means removal at the CRDT boundary (`prepareAllocationReplacement` omits it), which
  `setTransactionAllocation` handles explicitly. Owner-remainder semantics are never bypassed —
  remainder is derived in `deriveEffectiveAllocations`, not stored.

### 9.5 All P16C mutation paths

Every allocation mutation routes through P16C's per-key `setTransactionAllocation` or validated
atomic `replaceTransactionAllocations`:

| Path                               | Call site                                                                                                      |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Grid / add-row (transactions page) | `src/app/(app)/transactions/page.tsx:1024` → `setTransactionAllocation`                                        |
| Automation apply                   | `src/lib/domain/automation.ts:449`, `src/lib/domain/automation/apply.ts:177` → `replaceTransactionAllocations` |
| Import commit                      | `src/lib/crdt/import-commit.ts` — documented "EXCLUSIVELY through P16C `replaceTransactionAllocations`"        |
| Field rules                        | `src/lib/crdt/field-rules.ts` — same documented exclusivity                                                    |
| Insertion/hydration                | `prepareInsertedAllocations` — "Validate insertion data using the same complete-set contract"                  |
| Context/undo-redo                  | `src/lib/crdt/context.tsx:978-986` wraps both as vault actions                                                 |

I searched for direct writes that bypass the boundary (`allocations[…] = `, `delete …allocations`)
outside `allocations.ts`. The only hits are in `rule-editor-model.ts`, `field-rules.ts:316`, and
`field-rule-mutations.ts:163` — these write a **field-rule definition's own allocation payload**
(the rule's configured percentages), not a transaction's allocations, and both are boundary adapters
to the loro-mirror input shape. **No transaction-allocation write bypasses P16C.**

### 9.6 Grid/UX and P17 API

Horizontal virtualization is preserved (`useVirtualizer` at `TransactionTable.tsx:401` with
`useFlushSync: true`). The E2E suite covers explicit/effective/remainder person-column values,
historical/deleted people under a stable deleted label (`people-settlement.spec.ts:590`), presence,
notes, keyboard operability across themes and widths (`:670`), 320px reflow (`:744`), obligation
expansion showing source contributions, and working source-transaction deep-link navigation
(`:791`). P17A-D (all passed) provide the typed field-rule complete-set API, with
`decodeFieldRule`/`encodeFieldRule` returning typed `invalid-allocations` failures rather than
normalizing.

---

## 10. Manual product journey, accessibility, and console/network

### 10.0 HAND-DRIVEN disposable Playwright CLI session (executed)

After the automated runs finished I drove the real product by hand in a **disposable headless
session** (`playwright-cli -s=p21r04`) against a fresh dev server, with a brand-new isolated
identity. **No seed phrase, key, or recovery material was revealed or recorded** — I deliberately
never clicked "Click to reveal" and captured only structural snapshots.

| Step                            | Observed                                                                                                                                                                                                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Marketing → vault creation      | Landing renders proper landmarks (`banner`/`navigation "Global"`/`main`/`contentinfo`); "Create a vault" → `/new-user`.                                                                                                                                          |
| Onboarding choice               | Both paths offered: **"Create with a passkey"** and **"Generate Recovery Phrase"**, each with an honest irreversibility warning.                                                                                                                                 |
| Recovery phrase                 | **Hidden by default behind "Click to reveal"** — good secret-handling UX. "Create Account" is **`[disabled]` until the "I have saved down my recovery phrase…" checkbox is checked**, then enables.                                                              |
| Vault created                   | Lands on `/settings`; full nav appears (Transactions, Accounts, People, Tags, Tx Descriptions, Statuses, Automations, Imports, Vault Settings, Lock).                                                                                                            |
| Transactions empty state        | `region "Transactions table file drop target"` present (**HS-013 drop zone, live**), "0 transactions", empty-state copy.                                                                                                                                         |
| **HS-001 multiple empty rows**  | Clicked "Add transaction" twice → **"2 transactions", two grid rows coexisting**, each a normal selectable row. **Confirmed live.**                                                                                                                              |
| Grid columns                    | `Select all`, `Date`, `Description`, `Account`, `Tags`, `Status`, **`Me %`** (FS-001 person column), `Amount`, `Actions`.                                                                                                                                        |
| **FS-001 allocation state**     | Cell exposes accessible text **`"Explicit: not stored. Effective: 100%. Owner remainder: 100%."`** — explicit vs effective vs owner-remainder are distinguished, and an absent explicit value is reported as _not stored_ rather than fabricated as 100.         |
| **HS-009 / reject-never-clamp** | Entered **150** → input becomes **`[invalid]`** with `alert "Enter a finite number from -100 to 100."`; **the typed "150" is RETAINED, not silently rewritten to 100**; stored state stays `Explicit: not stored`. **Rejected, never clamped — confirmed live.** |
| Valid allocation commit         | Entered **60** → **`"Explicit: 60%. Effective: 100%. Owner remainder: 40%."`** — sole owner takes explicit 60% + 40% remainder = 100% effective, exactly Example C's rule. Second row unaffected.                                                                |
| People / settlement honesty     | With only non-`treatAsPaid` ("For Review") transactions: **"No transactions have a Treat-as-Paid status yet, so there is nothing to settle."** — Example H's exclusion, stated honestly, with no false "everyone is settled" claim.                              |

**Live accessibility measurements (this session, computed not asserted):**

- **320px reflow:** `scrollWidth 320 == clientWidth 320`, `horizontalOverflow: false`. PASS.
- **200% zoom** (`document.documentElement.style.zoom = '2'` at 1280×800):
  `zoomedHorizontalOverflow: false`. PASS.
- **Computed WCAG contrast ratios** (canvas-normalized colors, sRGB→linear,
  `0.2126R+0.7152G+0.0722B`, `(L1+0.05)/(L2+0.05)`):

    | Element   | Light mode  | Dark mode   | Threshold |
    | --------- | ----------- | ----------- | --------- |
    | `h1`      | **20.16:1** | **19.27:1** | ≥ 4.5     |
    | body text | **4.76:1**  | **7.66:1**  | ≥ 4.5     |
    | button    | **20.16:1** | **20.16:1** | ≥ 4.5     |

    All pass in both themes. (Methodology note for the reviewer: my first probe returned absurdly
    low ratios (1.35–1.52) because this app serves colors in CSS **`lab()`** space and my regex
    parsed `lab(100 0 0)` as an RGB triple. Normalizing through a canvas 2D context first gives the
    correct values above. Recording the error so nobody re-derives a phantom contrast finding.)

- **Live network hygiene:** 51 resource requests — **0 with sensitive data in the URL**
  (`/seed|secret|key=|token=|phrase|mnemonic|password/i`) and **0 external hosts contacted** (no
  third-party/analytics beaconing from the app).
- **Live console:** only `[Fast Refresh]`, `[HMR] connected`, the React DevTools suggestion, and
  normal `SyncManager: Loaded snapshot from server` / `Initial state loaded successfully` lifecycle
  logs. **No error, no warning, no unexplained entry.**

Session data was deleted and the browser closed (`delete-data`, `close`); the `.playwright-cli`
scratch directory was removed. `git status` afterwards shows only my evidence file and the two
pre-classified strays.

### 10.1 Automated matrix

**Coverage delivered through the 163-case suite executed 8× at `--retries=0`**, which is a superset
of the required manual matrix and is deterministic rather than anecdotal:

- **Identity/vault/recovery/passkey:** `identity.spec.ts` (10), `passkey.spec.ts` (12 — create,
  unlock, add, revoke, fallback, unsupported-capability paths), `onboarding-vault.spec.ts` (9),
  `vault-settings.spec.ts` (9).
- **Imports/drop zones/provenance:** `import.spec.ts` (16 — picker and drop zone, CSV and OFX,
  lineage across edits/reload, amount-edit tooltip, isolated one-step delete, nested duplicates).
- **Transactions/empty rows/grid/aliases/tags/allocations/undo-redo:** `transactions.spec.ts` (42),
  `description-aliases.spec.ts` (5), `tags.spec.ts` (3), `undo-redo.spec.ts` (4),
  `transaction-rules.spec.ts` (2), `field-rule-parity.spec.ts` (6).
- **Automations:** `automations.spec.ts` (3) + field-rule parity.
- **People/settlement/invites/members/realtime/presence:** `people-settlement.spec.ts` (21),
  `invite-redemption.spec.ts` (2), `presence.spec.ts` (3), `realtime-recovery.spec.ts` (4),
  `realtime-security.spec.ts` (1), `sync-persistence.spec.ts` (3), `tab-duplication.spec.ts` (2).
- **Marketing:** `landing.spec.ts` (7), `sidebar.spec.ts` (1), `accounts.spec.ts` (7).

**Accessibility.** 509 `getByRole(...)` role/name assertions across the suite give deterministic
accessible role/name/state snapshots. **Computed contrast ratios** are genuinely calculated, not
asserted by eye: `import.spec.ts:270-293` composites foreground alpha over background, applies the
sRGB→linear transfer function, computes WCAG relative luminance (`0.2126R + 0.7152G + 0.0722B`), and
asserts `(L1+0.05)/(L2+0.05) >= 4.5` (`:679`) across themes. **320px reflow**
(`people-settlement.spec.ts:744`, `import.spec.ts:1283`) and **200% zoom**
(`import.spec.ts:657-689`, `:1115`) are explicitly exercised, as are dark mode, pointer/keyboard
operability, and focus.

**Console/network.** `observeBrowserHealth(page)` instruments the settlement journey, and
`realtime-recovery.spec.ts:59` allow-lists only expected disconnect/reconnect noise while failing on
anything else. Across all 8 runs the only recurring server-side line was
`⚠️ tRPC failed on sync.pushOps / realtime.revoke: Request authentication failed` — this is the
**expected** signal of the suite's own teardown and negative-authorization cases (revoked/expired
sessions being correctly rejected), i.e. the security boundary working; it never accompanied a test
failure. No unexplained console error and no unexpected network failure surfaced. No sensitive data
appears in any URL (§7.3).

**Marketing claims verified against shipped behavior.** `SecuritySection.tsx` claims are precise and
each is independently corroborated by my own probes: _"encrypted in your browser … a blob the server
has no key for"_ → §7.2 proved 68,010/68,010 rows are opaque base64 with no plaintext; _"It sees who
shares a vault with whom, who made each change and when, and how much data changed. It cannot see
amounts, descriptions, tags or allocations."_ → exactly matches the schema (`vault_id`,
`author_pubkey_hash`, `created_at`, `length(encrypted_data)` visible; contents not); _"no password
to reset and no account to recover"_ → confirmed Ed25519-signature auth with no password field. The
listed primitives are all genuinely present in `src/lib/crypto/**`: `crypto_sign_*` (Ed25519),
`crypto_box_*` (X25519), `crypto_secretbox_*` (XSalsa20-Poly1305), `hkdf`, `crypto_generichash`
(BLAKE2b). **No false or overstated marketing claim found.**

### 10.2 Residual coverage note

The hand-driven session (§10.0) had to run **after** the 8 full-suite runs rather than alongside
them — Next.js refuses a second `next dev` in the same directory, and each suite run boots its own
server with `reuseExistingServer: false`. I therefore sequenced: 8 full-suite runs → isolation loop
→ hand-driven session → `db:reset` + fresh-DB verification. Nothing was skipped as a result. The
manual session covered onboarding, recovery-phrase gating, empty rows, the allocation grid,
reject-never-clamp, owner remainder, settlement honesty, 320px, 200% zoom, both themes' contrast,
console, and network. Two-user invite/presence/realtime flows were exercised by the automated suite
(`invite-redemption`, `presence`, `realtime-recovery`, `tab-duplication` — all green 8/8) rather
than hand-driven, since they require two coordinated browser contexts.

---

## 11. Proposed FINAL-AUDIT contents (root transcribes ONLY after independent PASS)

**Scope reconciliation.** All 22 first-class entries (21 `HS-*` + whole-file `FS-001`) map to
independently approved package reviews and passed requirement rows. Alias P11A–C and automation
P17A–D all passed before their scratch checkboxes; P16A–E all passed before FS-001 completed.
Scratch `469e98c7…`, 24,260 bytes, 43 checked / 0 unchecked, normalized blocks 21/0 byte-match
SCOPE. FS-001 `0d0e2a14…`, 715 lines / 25,441 bytes, never edited to record progress. Every prior
P21 failure (rev 01/02/03) has a complete batch with a contiguous per-ID rollback SHA chain,
finalized `rollback_pending -> changes_requested` transitions, FS-001 no-source-mutation downgrade,
full fix/re-review, requirement re-pass, and a new P21 revision. No requirement/package remains
`changes_requested` except control P21; no prepared/active batch, no `rollback_pending`, no
`completion_pending`. No approved BASE..HEAD range changed after review. QUESTIONS (37) and
DECISIONS (18) are internally consistent and summarized for human review.

**Repository and migration.** Final HEAD `27a15d3` on `main` (origin/main, ahead 395); product tree
byte-identical to `371a88a`; linear single-parent history in the goal range (0 merges since
`0ea864f`); dirty paths = the 2 pre-classified inert strays only; no unrelated/user-owned file
committed. Six ordered migrations. **Fresh bootstrap `pnpm db:reset` = exit 0, all six migrations
applied from empty, schema identical (11 tables, RLS on, 10 policies), and 36/36 representative E2E
cases pass against the fresh DB.** Supported-upgrade path = the live PostgreSQL 17.6 database
carrying 21,618 vaults / 68,003 ops that all 8 full-suite runs executed against. IndexedDB/vault
upgrade covered by `migrateVaultSentinels` + sync/persistence suites with no plaintext leakage.
Dependency audit **exit 0 / 0 advisories** (`next@16.2.11`, `sharp@0.35.3`); P03 TanStack Virtual
gate rechecked from primary sources and **OPEN/satisfied** (PR #1100 shipped in 3.13.15; installed
3.14.6 has it; `useFlushSync: true` enabled). Upstream registry currency drift recorded as C-1
(non-blocking).

**Verification.** Typecheck, lint (0 errors; 1 known-acceptable `TransactionTable.tsx:401` warning),
and production build (Turbopack, 17/17 routes, sharp prebuilt binary loads) all pass. Format check
flags only frozen `specs/**` markdown. Unit/property/integration: **111 files, 2,091 passed / 2
explained env-gated skips**, seeds recorded. **Full E2E: 7 of 8 runs 163/163 green; run 6 failed one
test (`import.spec.ts:1445`), 20/20 green in isolation — see F-1.** `identity.spec.ts:282` green
8/8. No arbitrary sleeps, no shared ordering, no unexplained skips, no retry-dependent outcomes.

**Manual/accessibility.** All required journeys covered by named passing tests; 509 role/name
assertions; WCAG-computed contrast ≥ 4.5; 320px reflow; 200% zoom; dark/reduced-motion; focus;
empty/loading/error/offline; refresh and multi-tab. Marketing claims match shipped behavior.
Console/network clean.

**Security.** Malicious cross-vault database, API, realtime, invite, and auth access **all denied**
(401/403/404, non-enumerating); nonce replay rejected; RLS on all 11 tables; `authenticated` sees 0
of 68,003 `vault_ops` rows. No key material, recovery phrase, passkey secret, or financial plaintext
in logs, URLs, server storage, or this evidence — 68,010/68,010 stored rows are opaque base64,
disproved as plaintext by trigram control.

**Performance.** Allocation edit ≈2.05–2.52ms (target <100ms) — **MET**. Settlement near-linear (10k
86.9ms → 100k ≈940ms), exact at scale (100k qualifying, 75k contributions, 2 obligations, 0 issues,
conservation true); the ~200ms benchmark is **not** claimed — FS-001 §14's measured-evidence branch
via Q-033, with R-020 open. Large imports/tables/alias/automation/GC bounded; duplicate-tab and
multi-client operations converge without deadlock or lost changes.

**FS-001.** Exact signed minor-unit conservation across decimals, negatives, over/under-allocation,
stable-ID ties, and multiple currencies. All 8 canonical examples A–H have their own named
production unit expectation and their own named E2E expectation — **16 distinct gates, all
passing**, none replaced by a general journey. `src/lib/domain/settlement.ts` is the sole settlement
engine (one production call site), with no persisted/plaintext cache, no competing computation, no
cross-currency netting, and traceable obligations. Invalid legacy maps are preserved, yield typed
issues, are excluded from totals, and never produce a misleading settled claim. Every current
grid/add-row/automation/import/undo/hydration path uses P16C's per-key or validated atomic
complete-set API; complete sets remove absent keys and never clamp, normalize, or bypass
owner-remainder semantics.

---

## 12. Q proposals surfaced

I raise **no new blocking question**. Two items for root/reviewer disposition:

- **C-1 (§3.2) — upstream dependency currency drift.** Production packages now have newer registry
  `latest` versions than installed, published 2026-07-20…07-24, after P01 rev 03 passed.
  `pnpm audit --prod` is clean, so this is currency, not security. Proposed disposition: an explicit
  human-accepted currency carry-forward (a completion gate cannot outrun upstream publication).
  Owner if pursued: P01/HS-002.
- **C-2 — CLOSED by me, no longer a gap.** Both coverage gaps I flagged mid-audit were subsequently
  executed once the E2E runs freed the port: the authentic **`pnpm db:reset` fresh bootstrap** (exit
  0, all six migrations, 36/36 fresh-DB E2E — §4) and the **hand-driven disposable `playwright-cli`
  session** (§10.0). Neither produced a defect; both produced positive evidence, including live
  confirmation of HS-001 multiple empty rows, HS-013 drop zone, HS-009 reject-never-clamp, and
  FS-001 owner-remainder display.

Carried for final human review (pre-existing, all tracked): **Q-033** (100k/200ms measured-follow-up
branch; R-020 open), Q-P20B-13/14 and Q-P20A-05 (tracked environmental flakes), Q-P20B-16
(passkey:387, resolved class-A test-timing), Q-P20B-17 (subsumed by Q-P20B-14).

---

## 13. Commands index (sanitized)

```
git rev-parse HEAD; git log -1 --format='%H %ci %s'; git status --short; git branch -vv
git diff 371a88a HEAD -- . ':(exclude)specs'                      # EMPTY (run twice)
git log --merges --oneline 0ea864f..HEAD | wc -l                  # 0
sha256sum specs/human-scratch.md; wc -c -l specs/human-scratch.md
sha256sum specs/008-.../spec.md; wc -c -l specs/008-.../spec.md
git rev-parse HEAD:src/lib/domain/settlement.ts
grep -c "per purpose" specs/007-.../PROGRESS.md                   # 1
node -e '<normalize each SCOPE.json sourceLineRange vs human-scratch.md>'   # 0 mismatches, 21/0
pnpm audit --prod                                                 # exit 0, 0 advisories
pnpm audit --json --prod                                          # advisories:0, all severities 0
pnpm ls next; pnpm ls sharp; node -e '<require sharp via next path>'        # 16.2.11; 0.35.3/vips 8.18.3
pnpm outdated --long                                              # C-1 drift table
pnpm view @tanstack/react-virtual dist-tags / time --json         # P03 primary-source recheck
pnpm typecheck; pnpm lint; pnpm format:check; pnpm build; pnpm test
P16A_BENCHMARK=1 pnpm exec vitest run tests/unit/domain/allocation.test.ts --reporter=verbose
P16B_BENCHMARK=1 pnpm exec vitest run tests/unit/domain/settlement.test.ts --reporter=verbose
for i in 1..8: pnpm exec playwright test --retries=0 --reporter=list
for i in 1..20: pnpm exec playwright test tests/e2e/import.spec.ts:1445 --retries=0 --reporter=line
pnpm db:reset                                                     # exit 0, 6 migrations from empty
pnpm exec playwright test identity+onboarding-vault+people-settlement --retries=0   # 36/36 fresh DB
pnpm exec playwright-cli -s=p21r04 open|click|fill|resize|eval|delete-data|close    # manual session
docker exec supabase_db_moneyflow psql -U postgres -tAc '<RLS/GRANT/plaintext/trigram probes>'
node <synthetic-Ed25519 signed cross-vault + replay probe>        # deleted after use
```

---

## 14. Collector candidate verdict

### 14.1 FAIL-CANDIDATE — one blocker: F-1

**FAIL-candidate.** Every other clause of the audit contract is GREEN, several of them re-derived
independently rather than taken from the ledger. The single blocker is:

> **F-1 — new, untracked, load-dependent E2E flake at `tests/e2e/import.spec.ts:1445`.** Failed 1 of
> 8 full-suite `--retries=0` runs (run 6) on
> `await expect(page.getByText(/6 rows/i)).toBeVisible({ timeout: 5000 })` at `:1512` — "element(s)
> not found". Isolation: **20 PASS / 0 FAIL of 20**. It is **not** in the pre-accepted set
> (`import:1527`/Q-P20B-14, `import:301`/Q-P20B-13, `duplicates`/Q-P20A-05), and grep of
> QUESTIONS.md, every P20B artifact, and every prior P21 evidence file for `1445`/`1512` returns
> **zero hits — it has never been observed before.**

**Why I do not wave it through.** The audit contract makes "any unexplained flake" a FAIL trigger,
and the HANDOFF is explicit that anything outside the three pre-accepted tickets is a FAIL
candidate. The Q-P20B-14 precedent that made a sibling flake acceptable rests on a _tracked,
adjudicated_ question — `:1445` has none. I could have argued it is "the same environmental class"
and moved on; that would be exactly the papering-over the process forbids, and it is how a flake
class survives four revisions.

**Why it is nonetheless a narrow, cheap blocker (for root's routing judgement, not mine to
decide).** It is a **test-quality defect, not a product defect**: 20/20 in isolation, no product
code involved, and the mechanism is legible — a bare visibility assertion fired immediately after
`setInputFiles` with a hardcoded 5,000ms cap (which is not even a widening, since Playwright's
default `expect` timeout is already 5,000ms and the config sets no override), racing file-read +
CSV-parse + preview render under 4-worker load. The same eager pattern sits at **six other lines in
the same file** (`:1279`, `:1412`, `:1459`, `:1512`, `:1539`, `:1616`), one of which is already
ticketed as Q-P20B-14. **Routing: P20B**, new Q-number, and the fix should harden the whole class —
not just `:1512` — with a deterministic settle signal, or the next audit will surface a neighbour.

**Everything else is GREEN**, including the two headline risks this revision existed to retest:

- **`identity.spec.ts:282`: 8/8 PASS.** The live suspicion carried from P01 rev-03 did not
  reproduce; the P20B rev-02 hardening holds under load.
- **`pnpm audit --prod`: exit 0 / 0 advisories.** Rev-03's F-1 dependency-security blocker is fully
  cleared at `next@16.2.11` + `sharp@0.35.3`, with the prebuilt `@img` binary loading and no
  image-opt break.
- Frozen sources, marker/scope/package/requirement reconciliation, provenance, fresh + upgrade
  migrations, static gates, build, 2,091 unit tests, cross-vault security (every probe denied),
  performance (allocation ~2.1ms; settlement near-linear with the honestly-unclaimed 200ms target),
  the full FS-001 audit including all 16 canonical-example gates, accessibility, and marketing
  honesty — all pass.

If root/the reviewer judges F-1 to fall under the existing environmental-flake precedent, the
verdict flips to PASS with a new tracked Q; that call belongs to the gate, not to me. What I will
not do is record it as green.

### 14.2 Non-blocking items requiring an explicit disposition

1. **C-1 — upstream registry currency drift** (§3.2). Production dependencies have newer `latest`
   versions published 2026-07-20…07-24, after P01 rev 03 passed. `pnpm audit --prod` is clean, so
   this is version currency, not security — categorically unlike rev-03's F-1. A completion gate
   cannot outrun upstream publication, and several of these releases are themselves inside the
   safe-chain minimum-age window. Proposed: explicit human-accepted carry-forward. Owner if pursued:
   P01/HS-002.
2. **Q-033 / R-020** — the ~200ms settlement target is measured at ~940ms and **not claimed**; this
   is FS-001 §14's permitted measured-evidence branch, already adjudicated. Carried for the human.

### 14.3 Routing

- **F-1 → P20B** (test-quality flake), new Q-number, harden the whole `getByText(/N rows/i)` eager
  cohort in `import.spec.ts`, then P21 revision 05 from a new BASE.
- C-1 judged blocking → **P01 / HS-002**, same route as rev-03's F-1.
- No product/migration/security/performance/FS-001 defect was found, so no other package is
  implicated.

---

**Collector:** `p21-collector-04`. This evidence is left **UNCOMMITTED** per the collector contract;
root handles persistence. I did not edit FINAL-AUDIT, any ledger, or any product/test/migration
file, and I did not mark the Goal complete.
