# P21 revision 05 — EXECUTABLE FINAL AUDIT (collector evidence)

**Collector:** `p21-collector-05` (fresh-context evidence collector, NOT the gate; did not author
any prior P21 evidence/review and was not the P20B rev 06 implementer or reviewer). **Package:** P21
(control). **Revision:** 05. **Date:** 2026-07-28. **Candidate verdict:** see §14.

This evidence is advisory. A DISTINCT reviewer gives the single formal verdict in
`reviews/P21-review-05.md`. Root alone transcribes FINAL-AUDIT after an independent PASS.

---

## 1. BASE / product identity / write boundary

| Check                                       | Command                                                                      | Result                                                                                                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| BASE == HEAD                                | `git rev-parse HEAD`                                                         | `abf2ce0f7ac2ffca66b064906b0d819b35999a76`                                                                                                     |
| HEAD subject                                | `git log -1 --format=%s`                                                     | `docs: dispatch P21 rev 05 final audit collector`                                                                                              |
| **Product `src/` byte-identical to BASE**   | `git diff 371a88a HEAD -- src/ \| wc -l`                                     | **0 lines**                                                                                                                                    |
| Only non-`specs`/`tests` delta              | `git diff 371a88a HEAD --name-only -- . ':(exclude)specs' ':(exclude)tests'` | **empty**                                                                                                                                      |
| Authorized `tests/e2e/**` delta             | `git diff 371a88a HEAD --name-only -- tests/`                                | exactly the **8** P20B rev 06 files                                                                                                            |
| Branch / upstream                           | `git branch -vv`                                                             | `main` -> `origin/main`, ahead 408                                                                                                             |
| Linear history in goal range                | `git log --merges --oneline 0ea864f..HEAD \| wc -l`                          | **0 merges** over 407 commits                                                                                                                  |
| Post-product commits touch only specs/tests | `git log 371a88a..HEAD --name-only`                                          | 25 `specs/*`, 8 `tests/*`; **no unrelated/user-owned file committed**                                                                          |
| Dirty / untracked                           | `git status --porcelain`                                                     | `M next-env.d.ts`; `?? .claude/agent-memory/`; `?? evidence/P08/implementation-01.md` — the three pre-classified inert strays, untouched by me |

The 8 authorized test files: `automations.spec.ts`, `field-rule-parity.spec.ts`, `helpers/auth.ts`,
`helpers/index.ts`, `identity.spec.ts`, `import.spec.ts`, `transaction-rules.spec.ts`,
`transactions.spec.ts` (34 changes: 33 timeout widenings + the `crypto.randomUUID()` parallel-safety
fix, plus a helper re-export).

`M next-env.d.ts` is Next-regenerated, not authored: the diff is solely `./.next/types/routes.d.ts`
-> `./.next/dev/types/routes.d.ts`, and the file self-documents "This file should not be edited".
See §6.1 for why this mattered to campaign bookkeeping.

**Write boundary honored.** My only persistent write is this file. I committed nothing and edited no
product/test/migration/ledger/FINAL-AUDIT/marker/frozen-scratch file. Disposable artifacts lived
under `/tmp/p21r05/` only.

---

## 2. Scope / package / requirement / marker reconciliation

### 2.1 Frozen sources

| Artifact                        | Expected                                                           | Measured                                                    | Status |
| ------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------- | ------ |
| `specs/human-scratch.md` sha256 | `469e98c7c8ee842acfc08e0844a47b4bc6495111b0463d8ca14727d3949d2f6a` | identical                                                   | PASS   |
| scratch size / lines            | 24,260 bytes / 350 lines                                           | **24,260 / 350**                                            | PASS   |
| scratch checkbox tally          | 43 checked / 0 unchecked                                           | **43 / 0**                                                  | PASS   |
| FS-001 spec sha256              | `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c` | identical                                                   | PASS   |
| FS-001 size / lines             | 715 lines / 25,441 bytes                                           | **715 / 25,441**                                            | PASS   |
| Sole settlement engine blob     | `010f3c93582a2ce311594d4dde8464760ca49c43`                         | `git rev-parse HEAD:src/lib/domain/settlement.ts` identical | PASS   |

### 2.2 Normalized scratch blocks vs SCOPE.json — independently re-derived

For each of the 21 `HS-*` requirements in `SCOPE.json` I sliced `human-scratch.md` at the recorded
`sourceLineRange`, normalized only the checkbox marker and trailing whitespace, and byte-compared to
`sourceTextLines` (single-line ranges handled correctly — the parser trap the rev-04 collector
documented):

```
requirementCount field: 22 | actual: 22 (21 HS-* + markerless FS-001)
HS reqs: 21 | normalized mismatches: 0 | checked: 21 | unchecked: 0
```

**21/21 normalized blocks byte-match SCOPE; all 21 markers checked and authorized.**

### 2.3 Frozen-identity proof (stronger than a tally)

I reconstructed the frozen scratch identity rather than trusting the recorded value: marker-
normalizing exactly the 21 authorized HS marker lines (`- [x]` -> `- []`) yields

```
sha256 = b91ca932d536285fc3e47091baea176ab2f4c314d02147e61df3615ff8cd5e8b   bytes = 24,239
```

which is **exactly** the frozen `b91ca932…` identity recorded in `BASELINE.md:25` /
`PROGRESS.md:40`. This proves the scratch file's content is byte-unchanged since the goal BASE
**apart from the 21 authorized markers** — i.e. no requirement text was silently edited to record
progress.

### 2.4 Package ledger — 31/31 feature packages passed

`P00` rev02, `P01` rev03, `P02` rev02, `P03` rev01, `P04` rev02, `P05` rev13, `P06` rev01, `P07`
rev04, `P08` rev02, `P09` rev02, `P10` rev01, `P11A` rev04, `P11B` rev01, `P11C` rev03, `P12` rev08,
`P13` rev03, `P14` rev04, `P15` rev02, `P16A` rev02, `P16B` rev05, `P16C` rev02, `P16D` rev01,
`P16E` rev02, `P17A` rev01, `P17B` rev01, `P17C` rev01, `P17D` rev01, `P18` rev01, `P19` rev02,
`P20A` rev02, **`P20B` rev06** — all `passed`. **`P21` is the only `changes_requested`** (rev 04,
this audit). Alias `P11A/B/C`, automation `P17A–D` and `P16A–E` are all passed **before** their
scratch checkboxes.

### 2.5 Requirement ledger — 22/22 passed

All 21 `HS-001..HS-021` rows plus whole-file `FS-001` are `passed`.

### 2.6 No pending lifecycle state

`Active P21 rollback batch` = **none** (`RB-P21-04` COMPLETED + cleared, contiguous chain
`469e98c7… -> f46c2d35…` then restored `f46c2d35… -> 469e98c7…` on the HS-021 re-pass).
`Active completion marker event` = none pending. Authorized checked HS IDs **21 of 21**. Every prior
P21 failure (rev 01/02/03/04) carries a complete batch record with a per-ID rollback SHA chain;
FS-001 never entered a batch and has no source mutation.

### 2.7 Questions / decisions / risks

73 `Q-` entries, 19 `D-` decisions, 34 risks (26 open / 14 mitigated / 1 closed — status tokens
counted across the file). QUESTIONS and DECISIONS are internally consistent: every open question
carries an explicit selected default and a named adjudicator.

**All carry-forward Q-proposals the brief requires are surfaced in QUESTIONS.md:** Q-P20B-00
(`pruneBuckets` CRDT data loss), Q-P20B-13, Q-P20A-05, Q-P20B-14, Q-P20B-06, Q-P20B-08, Q-P20A-02,
Q-P17D-02, Q-P20B-18 (F-1), Q-P20B-19 (F-2), Q-P20B-20 (parallel safety), Q-P21-04-01 (C-1 currency
drift), Q-033 (settlement 100k target). Dispositions in §13.

---

## 3. Dependency currency, P03 external gate

### 3.1 `pnpm audit --prod` — clean

```
$ pnpm audit --prod                       # 2026-07-28T16:11:31+10:00
No known vulnerabilities found            # exit 0
```

JSON form: `advisories: 0`, `{"info":0,"low":0,"moderate":0,"high":0,"critical":0}` over **164
production** dependencies (249 total). Resolved: `next@16.2.11`, `sharp@0.35.3` via the
`pnpm-workspace.yaml` `overrides:` entry `"sharp@<0.35.0": 0.35.3` (12 overrides present). The
prebuilt binary genuinely loads through `next`'s own resolution path:
**`sharp 0.35.3 vips 8.18.3`**.

### 3.2 P03 TanStack Virtual release gate — satisfied (primary source)

`pnpm view @tanstack/react-virtual dist-tags` ->
`{ alpha: 3.0.0-alpha.2, beta: 3.0.0-beta.68, latest: 3.14.8 }`. The gate condition was "once PR
#1100 (`useFlushSync`) is released". I verified the shipped artifact, not just the changelog:
`useFlushSync` is present in the **installed** `react-virtual@3.14.6` dist (`dist/esm/index.js:7`
default and `:73` the guarded `flushSync` call), and `TransactionTable.tsx:407` passes
`useFlushSync: true`. **Gate satisfied; HS-018 correctly not `blocked_external`.**

### 3.3 C-1 carry-forward (non-blocking) — upstream currency drift persists

`pnpm outdated` still shows newer registry `latest` for production packages (radix-ui 1.6.2→1.6.7 +
11 `@radix-ui/*`, react/react-dom 19.2.7→19.2.8, loro-crdt 1.13.7→1.13.8, @tanstack/react-virtual
3.14.6→3.14.8, @tanstack/react-query 5.101.2→5.101.4, @supabase/supabase-js 2.110.7→2.110.8,
chrono-node 2.10.0→2.10.1, lucide-react 1.25.0→1.26.0). **Unchanged in character from rev 04:
version currency only, `pnpm audit --prod` exit 0 / 0 advisories.** Recorded as the accepted
human-visible carry-forward Q-P21-04-01, not a blocker — treating continuous upstream publication as
a completion gate is unreachable by construction.

---

## 4. Migrations and vault/IndexedDB compatibility

**See the fully populated §4 further down this file.** `pnpm db:reset` is destructive, so it could
not run against the database the E2E campaign was executing on; it was deferred until after the
campaign finished and is recorded there.

### Reading order

Sections were appended as each gate completed, so the headings are not in numeric order on disk.
Reading order: **§1, §2, §3, §4 (populated, below), §5, §6 (E2E campaign), §7, §8, §9, §10, §11,
§12, §13, §14 (verdict)**.

---

## 5. Static gates, build, and unit/property/integration tests

All at product `371a88a`, 2026-07-28, exit codes captured directly (not through a pipe).

| Gate                      | Command             | Start    | Duration | Result                                                  |
| ------------------------- | ------------------- | -------- | -------- | ------------------------------------------------------- |
| Typecheck                 | `pnpm typecheck`    | 16:05:58 | 2.9s     | **exit 0**                                              |
| Lint                      | `pnpm lint`         | 16:06:11 | —        | **exit 0** — 1 problem: **0 errors, 1 warning**         |
| Format                    | `pnpm format:check` | 16:06:26 | 2.4s     | exit 1 — **15 files, ALL frozen `specs/**` markdown\*\* |
| Production build          | `pnpm build`        | 16:06:34 | 20s      | **exit 0** — 17/17 static pages, all 17 routes          |
| Unit/property/integration | `pnpm test`         | 16:07:40 | 73.3s    | **exit 0** — **111 files, 2,091 passed / 2 skipped**    |

- **Lint warning is the known-acceptable one**, verbatim at
  `TransactionTable.tsx:401:25 warning Compilation Skipped: Use of incompatible library … react-hooks/incompatible-library`.
  Zero errors.
- **format:check flags only frozen/root-owned
  `specs/**`markdown** —`human-scratch.md`, PROGRESS/QUESTIONS/DECISIONS/DEPENDENCIES/RISKS and 9 evidence/review files. **No `src/**`, `tests/**`or config file flags.** I did NOT run bare`pnpm
  format` — it would reflow the frozen scratch and corrupt the audit.
- **The 2 skipped unit tests are explicitly env-gated benchmarks**, not silent skips:
  `allocation.test.ts:564` `it.runIf(process.env.P16A_BENCHMARK === "1")` and
  `settlement.test.ts:2869` `it.runIf(process.env.P16B_BENCHMARK === "1")`. Both run explicitly in
  §8.
- **Property seeds are all fixed** (deterministic, not flaky-by-construction): allocation
  `DERIVATION_SEED=16_001_601`, `APPORTIONMENT_SEED=16_001_602`, `16_001_603`,
  `RESULT_IMMUTABILITY_SEED=16_001_604`; settlement `26072501`–`26072508` and `16001611`; run counts
  200–5,000.

---

## 7. Security audit — executed probes

### 7.0 API — live adversarial cross-vault probes (executed 2026-07-28, fresh database)

Attacker model: a **freshly generated synthetic Ed25519 identity** producing _cryptographically
valid_ signatures over the exact canonical message
(`POST\n/api/trpc\n{ts}\n{nonce}\n{BLAKE2b(normalizedBody)}`), then requesting a victim vault
(`adbd1c46-…`, created by my own fresh-DB E2E run) it has no membership in. **No real vault key,
seed phrase, recovery material or plaintext was read, printed or stored; only a truncated public
half is shown.**

| Probe                                                                           | Result                                                   |
| ------------------------------------------------------------------------------- | -------------------------------------------------------- |
| No auth headers → `vault.list`/`sync.pushOps`/`invite.list`/`membership.remove` | **401 "Missing authentication headers"** (all four)      |
| Random forged 64-byte signature → `vault.list`                                  | **401 "Request authentication failed"**                  |
| **Valid signature, attacker's own scope → `user.register`**                     | **200 `{success:true,isNew:true}`** — CONTROL, see below |
| Valid signature, foreign vault → `vault.get`                                    | **404 "Vault not found or access denied"**               |
| … → `sync.getSnapshot`                                                          | **404 "Vault not found or access denied"**               |
| … → `sync.pushOps`                                                              | **404 "Vault not found or access denied"**               |
| … → `membership.list`                                                           | **404 "Vault not found or access denied"**               |
| … → `invite.list`                                                               | **404 "Vault not found or access denied"**               |
| … → `vault.delete`                                                              | **404 "Vault not found or access denied"**               |
| … → `realtime.authorize` (`purpose:sync`)                                       | **403 "Vault access denied"**                            |
| … → `realtime.authorize` (`purpose:presence`)                                   | **403 "Vault access denied"**                            |
| **Nonce replay** — byte-identical signed request sent twice                     | #1 **200**, #2 **401 "Request authentication failed"**   |

**Why the `200` control matters — and a methodology note the reviewer should not re-derive.** My
first probe run returned `401 "Invalid signature"` for _every_ victim call. That would have been a
**worthless result**: it proves only that the auth layer rejected me, never that the _authorization_
layer works. The cause was mine — the server verifies the signature over the **normalized** body
`[{path, input}]` built by `normalizeBodyForSigning` (`route.ts:28-77`), not the raw wire body.
After correcting the probe, the positive control `user.register` returns **200**, which establishes
that my synthetic identity produces genuinely _accepted_ signatures. **Every 404/403 above is
therefore a real authorization denial of an authenticated stranger, not a signing artifact.** (I
also had to sign an input-carrying procedure: `JSON.stringify` drops an `undefined` `json` value, so
a no-input query does not round-trip byte-identically.)

**Conclusions:** every cross-vault read, write, admin and realtime-subscription attempt was denied.
Denials are **non-enumerating** — a stranger cannot distinguish "vault does not exist" from "you
lack permission". One-use nonce replay protection is enforced **live**, not merely by design.

### 7.1 Database RLS and plaintext inspection (live, executed)

- **RLS enabled on all 11 `public` tables** (`pg_tables.rowsecurity = t` for `passkey_challenges`,
  `passkey_credentials`, `realtime_grants`, `request_nonces`, `user_data`, `vault_invites`,
  `vault_memberships`, `vault_ops`, `vault_snapshots`, `vault_updates_legacy`, `vaults`); 10
  policies. `realtime_grants` has RLS ON with **no policy** = deny-all by default (correct).
- **Policy shape:** 9 tables carry a literal `Direct API access denied` (`qual = false`) policy for
  ALL commands. The single exception is `vault_ops`, whose only SELECT policy is
  `realtime_grant_allows(vault_id, 'sync')` — gated on an exact live grant.
- **`anon` role:** GRANT-denied on every table (`permission denied for table vaults` /
  `… vault_ops`). Zero reachable rows.
- **`authenticated` role:** GRANT-denied on `vaults` and the rest; the one reachable table
  `vault_ops` returns **0 of 18,074 rows**.
- **No financial plaintext at rest.** All **18,074 / 18,074** `vault_ops` rows match
  `^[A-Za-z0-9+/=]+$` (pure base64); **0** contain a space, **0** a `{`, **0** the string
  `Groceries`, **0** the BIP39 word `abandon`. All **5,635 / 5,635** `vault_snapshots` rows likewise
  pure base64. (Row counts differ from rev 04's because the database was reset since; the property
  is what matters.)

### 7.2 Secret hygiene (static)

- No `console.*` call in `src/**` logs a seed phrase, mnemonic, master/secret/private key or
  recovery material (targeted grep → **zero hits**).
- No secret is placed in a URL or query string (grep of `searchParams.set`/`URLSearchParams`
  intersected with key/secret/token/phrase/seed → **zero hits**). `route.ts` documents the design:
  the client deliberately uses POST for queries so authenticated inputs never enter URLs.
- Key material is zeroized: `sodium.memzero` in `signing.ts` (`:127-128`, `:247-248`) and
  `passkeyWrap.ts` (`:97`, `:125`, `:134`, `:145`).
- **Nothing in this evidence file contains real key material, a seed phrase, or vault plaintext.**

---

## 9. FS-001 exhaustive audit

### 9.1 Canonical examples A–H — 16 distinct named gates, all figures re-checked against the frozen spec

I read the frozen spec (`spec.md:278-377`) and both test files, and compared every figure.

| Ex  | Frozen-spec result              | Named unit test (`tests/unit/domain/settlement.test.ts`)           | Named E2E test (`tests/e2e/people-settlement.spec.ts`) |
| --- | ------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------ |
| A   | no obligation                   | `:623` "Example A: no explicit allocations produces no obligation" | `:104` "canonical example A: …"                        |
| B   | Bob owes Alice $50              | `:631` — `amountMinor 5_000`, creditor alice, debtor bob           | `:117` — "$50", creditor Me, debtor Bob                |
| C   | Bob owes Alice $30 (70% rem.)   | `:646` — `3_000`                                                   | `:138` — "$30"                                         |
| D   | Charlie owes Alice $18, Bob $12 | `:659` — `1_800` + `1_200`, ownership 60/40                        | `:159` — "$18" and "$12"                               |
| E   | Alice owes Bob $20 (−20%)       | `:681` — `2_000`, direction reversed                               | `:190` — creditor Bob, debtor Me                       |
| F   | Alice owes Bob $50 (income)     | `:694` — `5_000`, creditor bob                                     | `:213` — creditor Bob                                  |
| G   | no obligation (50/50 joint)     | `:709` — both positions 0                                          | `:234`                                                 |
| H   | no obligation (non-treatAsPaid) | `:720` — `qualifyingTransactionCount: 0`, `positions: []`          | `:249`                                                 |

**All 8 have their own named production unit expectation AND their own named E2E expectation = 16
distinct gates; none is replaced by a general journey or a combined case.** Every amount matches the
frozen spec exactly. All 16 passed in `pnpm test` and in every E2E run of the campaign.

### 9.2 Sole per-currency settlement engine

- `src/lib/domain/settlement.ts` (1,239 lines, blob `010f3c93…`) exports
  `calculateSettlementBalances`. **Exactly ONE production call site:** `BalanceSummary.tsx:77`,
  inside a `useMemo` (the barrel re-export `domain/index.ts:50` is not a call).
- **No persisted/plaintext cache:** grep for `settlementCache|cachedSettlement|persistSettlement` →
  **zero hits**, satisfying §14's "No settlement values are persisted merely as a cache."
- **No cross-currency netting:** positions/obligations are keyed per currency, with a dedicated
  "eligibility and currency isolation" describe block.

### 9.3 Signed unit conservation — proven against an independent oracle

`settlement.test.ts:2661` "conserves signed positions and matches a BigInt hundredths oracle"
(fast-check, **1,000 runs, seed 16001611**) asserts positions match an independent
`apportionByHundred` BigInt oracle AND that `expectedAlice + expectedBob === 0` AND that the whole
position list sums to exactly 0, over amounts −1,000,000..1,000,000 and percentages −100..100 (so
decimals, negatives, zero, over- and under-allocation are all in the generated space). `:2695`
extends conservation per currency under insertion changes; `allocation.test.ts:534` covers ownership
and effective weights. Money stays in signed integer minor units; `ExactDecimal` carries percentage
weights with a last-entry-takes-remainder rule that provably sums to exactly 100
(`deriveOwnershipWeights`).

### 9.4 Reject-never-clamp, typed issues, complete-set semantics

- `validateAllocationSet` (`domain/allocation.ts:185`) collects a typed
  `{domain:"allocation", personId, reason, type:"invalid-allocation"}` for **every** invalid entry
  and returns `{ok:false, errors}` — it never coerces, clamps or drops.
  `prepareAllocationReplacement` sorts those errors by `compareCodeUnits` (stable-ID tie ordering).
- `SettlementIssue` is a discriminated union over `missing-account`, `invalid-currency`,
  `invalid-allocation`, `invalid-ownership`, `invalid-transaction`, `invalid-amount`,
  `unsafe-calculation`.
- **Complete-set removes absent keys and never clamps** — `replacePreparedAllocations`
  (`crdt/allocations.ts`) builds `replacementKeys` and `delete`s every current key not in the
  replacement before writing prepared values. Zero means removal at the CRDT boundary
  (`prepareAllocationReplacement` omits it; `setTransactionAllocation` handles it explicitly). Owner
  remainder is **derived** in `deriveEffectiveAllocations`, never stored, so it cannot be bypassed.
- Invalid legacy maps are preserved, excluded from totals, and surfaced honestly — E2E
  `people-settlement.spec.ts:632` "invalid ownership surfaces Settlement incomplete and never claims
  everyone is settled".

### 9.5 All current mutation paths use the P16C API

Every allocation mutation routes through per-key `setTransactionAllocation` or validated atomic
`replaceTransactionAllocations`: grid/add-row (`transactions/page.tsx:1024`), automation apply
(`automation.ts:449`, `automation/apply.ts:177`), import commit (`import-commit.ts`), field rules
(`field-rules.ts`, `apply-field-rule-to-transaction.ts`), insertion/hydration
(`prepareInsertedAllocations`), and context/undo-redo (`context.tsx:978-986`).

I searched for writes that bypass the boundary. The only `.allocations =` hits outside
`allocations.ts` are `rule-editor-model.ts:220/226` (form **error strings**, not allocations) and
`automation.ts:81/386/415` (a field-rule definition's own payload plus undo `previousValues`), which
are rule-definition data, not a transaction's allocation map. **No transaction-allocation write
bypasses P16C.**

### 9.6 Grid/UX and the P17 complete API set

- **Virtualization preserved** (`useVirtualizer` at `TransactionTable.tsx:401` with
  `useFlushSync: true`). The frozen spec requires person columns to _preserve_ table virtualization
  under horizontal scrolling (`spec.md:394-395`, `:578`), not a separate column virtualizer; the
  header/data/notes/add rows share one computed `gridTemplateColumns` (`TransactionRow.tsx:173`,
  `TransactionTable.tsx:118`). E2E `transactions.spec.ts:110-160` builds a **12-person** grid and
  asserts real overflow (`scrollWidth > clientWidth`) while editing a negative decimal (`-35.125`),
  checking presence via `data-presence-field="allocation:*"`, latency `< 2s`, undo/redo, and
  persistence across `page.reload()`.
- **Person-column semantics** are explicit in the accessible name
  (`PersonAllocationCell.tsx:67-68`): `Explicit: not stored.` / `Explicit: N%.` vs `Effective: N%.`
  vs `Owner remainder: N%.` — an absent explicit value is reported as _not stored_, never
  fabricated.
- **P17 complete set:** `applyFieldRulesToTransaction` / `…ToImport` / `…ToAllTransactions` /
  `…ToNewerTransactions` (`field-rules.ts:181,257,268,279`) covers apply-this / apply-all /
  apply-new; `RuleFieldSchema` covers all three fields (`descriptionAlias`, `tags`, `allocation`)
  with Zod-branded ids.
- **Q-P17B-03 independently re-verified as genuinely CLOSED.** That ticket self-declared an _unmet
  frozen HS-007 requirement_ (scratch `:270`, "remember … the select and check boxes"), routed to
  P17D. I checked the shipped code rather than the ledger: `schema.ts:383` now carries
  `lastApplyMode` (a four-mode `StringEnum`, optional so older vaults need no migration, with an
  explicit HS-007/`:270` citation), `preferences.ts:59/74` reads and writes it,
  `field-rule-mutations.ts:322/339` persists it, `FieldRulesManager.tsx:152/161` restores it into
  the draft, and `tests/unit/domain/automation/apply-mode.test.ts` covers the mode predicates. **The
  frozen requirement is fully delivered — not a residual gap.**

### 9.7 Spot-checked requirement delivery (not taken on ledger trust)

I verified a sample of scratch requirements against shipped code rather than the ledger:

- **HS-003** (loro ephemeral presence): `src/lib/sync/presence-protocol.ts` uses a real Loro
  `EphemeralStore` — "a separate, history-free, timestamp-LWW CRDT" — with the encoded bytes sealed
  under XChaCha20-Poly1305. Not a hand-rolled substitute.
- **HS-005** (rAF background GC): `src/lib/crdt/maintenance.ts` `startVaultMaintenanceScheduler`,
  mounted at `context.tsx:168-188` with an injected host (`requestFrame`/`cancelFrame`/`isVisible`/
  `now`) so it is testable and visibility-aware. Work is genuinely **bounded per frame by BOTH item
  count and elapsed milliseconds** (`:1977-1985`, `DEFAULT_VAULT_MAINTENANCE_BUDGET`).
- **HS-010** (drop unused user state): `009_remove_unused_user_state.sql` really executes
  `ALTER TABLE public.user_data DROP COLUMN encrypted_data` (plus a `REVOKE UPDATE` hardening); the
  live table now has only `pubkey_hash` / `updated_at` / identity metadata.
- **HS-014** (table/RLS review): `vault_updates_legacy` is present but **0 rows**; the realtime
  authorization predicate `realtime_grant_allows` (`007_…sql:45-60`) is tight — the grant must match
  the JWT `jti`, still have a live membership **at the same role**, be unrevoked, unexpired, on a
  non-deleted vault, with `claims->>'role' = 'authenticated'`.
- **HS-016** (marketing accuracy): see §11.

---

## 10. E2E test hygiene

- **No arbitrary sleeps:** grep for `waitForTimeout` / `setTimeout(...resolve` across all 22 E2E
  specs → **zero hits**. Waits are web-first assertions or explicit event/response waits.
- **No `.only`, `.skip` or `.fixme`** anywhere in `tests/e2e/` → **zero hits**. No unexplained
  skips.
- **No retry-dependent outcomes:** every campaign run used `--retries=0`; Playwright reported **zero
  `flaky` results** in any run (with retries off, a failure is simply a failure).
- **No shared test ordering:** `fullyParallel: true` with 4 workers; each spec creates its own
  identity/vault via `createNewIdentity`.
- **Parallel-safety fix present (Q-P20B-20):** `import.spec.ts:76-80` now derives temp names from
  `` `test-import-${Date.now()}-${crypto.randomUUID().slice(0, 8)}` `` with a comment explaining the
  millisecond collision across 4 workers. This is the fix whose regression would show as **ENOENT at
  `import.spec.ts:1532`** (`fs.unlinkSync(csvPath)` in the `cleanup` step) — **no ENOENT occurred in
  any run**.
- **Console/network are genuinely asserted, not merely observed:** `observeBrowserHealth`
  (`people-settlement.spec.ts:69-96`) collects console `error`s, `requestfailed`s and any `>= 500`
  response and asserts both lists are **empty**; the allow-list
  `/SyncManager error|Failed to push to server|Failed to fetch|ERR_ABORTED/` is narrow and
  transport-specific, not a blanket suppression. Seven other specs additionally fail on `pageerror`.

---

## 11. Marketing claims vs shipped behavior (HS-016)

I checked every landing claim against behavior I independently verified elsewhere in this audit.

**`SecuritySection.tsx` — all accurate:**

| Claim                                                                                                                                                       | Corroboration                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "encrypted in your browser … a blob the server has no key for"                                                                                              | §7.1: 18,074/18,074 ops + 5,635/5,635 snapshots are opaque base64, zero plaintext hits                                                                                           |
| "It sees who shares a vault with whom, who made each change and when, and how much data changed. It cannot see amounts, descriptions, tags or allocations." | Exactly the `vault_ops` schema: `vault_id`, `author_pubkey_hash`, `created_at`, `length(encrypted_data)` visible; contents only in `encrypted_data`                              |
| "no password to reset and no account to recover"                                                                                                            | Ed25519-signature auth; no password field anywhere                                                                                                                               |
| Primitive list (Ed25519 / X25519 / XSalsa20-Poly1305 / HKDF-SHA256 / BLAKE2b / WebAuthn PRF)                                                                | All present in `src/lib/crypto/**`: `signing.ts`+`keypair.ts`, `keywrap.ts`+`rekey.ts`, `encryption.ts`, `passkeyWrap.ts`+`presence-key.ts`, `identity.ts`, `passkeyCeremony.ts` |

**Licensing contradiction confirmed FIXED (Q-P20A-03):** grep of all of `src/` for `open source` /
`open-source` / `MIT license` → **zero hits**, consistent with `README.md:184` "This project is
proprietary. All rights reserved." and the absence of a `LICENSE` file.

**`FeaturesSection.tsx` — five of six claims verified against shipped behavior** (percentage splits
and who-owes-whom → §9; rules applied to new imports → §9.6 P17 complete set; invite + concurrent
editing + presence → `invite-redemption`/`presence` specs; local-first writes with offline
continuation → `undo-redo.spec.ts:311-376` real `setOffline` round-trip; browser-only, no install →
true).

### FINDING M-1 (NON-BLOCKING, newly surfaced) — the "Edits merge cleanly" claim is broader than the known CRDT behavior

`FeaturesSection.tsx` "Edits merge cleanly" asserts: _"Two people editing at the same time **will
not overwrite each other**. Changes are merged with conflict-free replicated data types rather than
last-write-wins."_

That is an unqualified durability promise, and **Q-P20B-00 documents a real, still-unfixed case
where it does not hold**: `pruneBuckets` (`mutations.ts:287-330`) splices day/month/year buckets and
at `:325` does `delete store[accountId]`; a concurrent peer's insert into that same subtree is
discarded on merge. I re-confirmed the code is unchanged at HEAD and that the pruning paths are
**reachable from ordinary UI actions**, not just exotic ones — `pruneBuckets` is called from
`deleteTransaction` (`:704`), `moveTransaction` (`:573`, i.e. **merely editing a transaction's
date**), nested-duplicate handling (`:862`) and `:930`; the transactions page wires bulk delete
(`page.tsx:594`) and `moveTransaction` (`:131`), and the imports page wires
`deleteTransactionsByImport`.

**Why I classify this NON-BLOCKING rather than a false-marketing FAIL:**

1. The underlying defect is **already surfaced, reproduced and formally adjudicated** —
   `p20b-reviewer-01` accepted the deferral with reasoning (`P20B-review-01.md §6.1`), explicitly
   routing it to a future scoped CRDT package. P21 should not silently re-litigate a decision an
   independent reviewer made with the mechanism in hand.
2. The claim's **second sentence is literally true** (the app genuinely uses Loro CRDTs, not
   last-write-wins), and the general merge behavior it advertises does hold for the ordinary
   concurrent-edit cases the E2E suite exercises (`presence.spec.ts`, `tab-duplication.spec.ts`,
   `description-aliases.spec.ts:412`, `realtime-recovery.spec.ts`) — all green across the campaign.
3. The failure needs **two clients concurrently touching the same day bucket**, one of them pruning.
   It is a latent edge, not the advertised everyday behavior.

**What I am NOT doing:** claiming the copy is fully accurate. It is an overstatement of a known-
imperfect guarantee, and the marketing audit clause is P21's to raise. **Proposed owner: P20A**
(marketing copy; the minimal fix is softening the absolute "will not overwrite each other"), with
the underlying engine fix remaining Q-P20B-00's scoped CRDT package. **Proposed Q-number:
Q-P21-05-01.** I record it for the reviewer and root to rule on rather than absorbing it silently.

---

## 12. QUESTIONS / DECISIONS consistency and deferred-question summary

**DECISIONS.md — internally consistent.** 19 decisions D-001..D-018 plus an explicit
`## Decision template` section (the `### D-XXX — Title` heading is that template's placeholder, not
an unfinished decision). Supersession is recorded rather than left contradictory: **D-018 explicitly
supersedes D-013's epoch mandate**, and **D-017** records the P05/HS-015 rescope. No decision
contradicts another or the frozen text.

**QUESTIONS.md — 73 entries, every open one carries a selected default and a named adjudicator.**

### Deferred questions a human should still decide after completion

| Q                                          | Substance                                                                             | Disposition                                                                                                                                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Q-P20B-00**                              | `pruneBuckets` discards a concurrent peer's insert on merge — **real data-loss risk** | Deferred with reasoning, independently ACCEPTED by `p20b-reviewer-01` (§6.1). **Still unfixed at HEAD — I re-confirmed the code.** Needs a scoped CRDT package. Related: **M-1** (§11)                       |
| **Q-033 / R-020**                          | 100k settlement ~940ms, not ~200ms                                                    | FS-001 §14's **explicitly permitted second branch** ("or provide measured evidence and a documented optimization follow-up"), adjudicated by a distinct reviewer. R-020 stays `open`; target NOT claimed met |
| **Q-P21-04-01 (C-1)**                      | Upstream registry currency drift since the P01 rev-03 selection                       | Accepted non-blocking carry-forward; re-confirmed §3.3 — currency only, `pnpm audit --prod` exit 0                                                                                                           |
| **Q-P20B-01 / P20A-04**                    | Vault re-key machinery has zero callers                                               | Product decision, out of sweep scope                                                                                                                                                                         |
| **Q-P20B-02**                              | `sync.getUpdates` ignores the version vector (availability/scale)                     | Protocol change, deferred                                                                                                                                                                                    |
| **Q-P20B-03**                              | `sync.pushSnapshot` TOCTOU / any member may overwrite the snapshot (integrity)        | Deferred; note `vault_ops` has an append-only trigger but snapshots do not                                                                                                                                   |
| **Q-P20B-13 / Q-P20A-05 / Q-P20B-14**      | Tracked environmental flakes                                                          | **None fired in this campaign** — see §6                                                                                                                                                                     |
| **Q-P20B-20**                              | Cross-worker temp-file collision (parallel safety)                                    | **CLOSED by P20B rev 06** — fix present (§10) and no ENOENT in any run                                                                                                                                       |
| **Q-P20B-18 / Q-P20B-19**                  | The rev-04 F-1/F-2 blockers                                                           | Fixes present and green across this campaign — see §6                                                                                                                                                        |
| **Q-P17B-03**                              | Apply-mode SELECT persistence (frozen HS-007 `:270`)                                  | **Independently re-verified CLOSED** — `lastApplyMode` shipped and wired (§9.6)                                                                                                                              |
| **Q-P20A-03**                              | Open-source/MIT claim vs proprietary README                                           | **Verified FIXED** — zero claims remain in `src/` (§11)                                                                                                                                                      |
| **Q-P20B-06 / 08 / Q-P20A-02 / Q-P17D-02** | Rule-vs-reality conflicts, presentational defaults                                    | Surfaced, non-blocking                                                                                                                                                                                       |

**Residual honestly noted (not a blocker), carried from the rev-04 reviewer:** broader cross-worker
shared-resource contention (ports, fixture accounts, database, `localStorage`) has **not** been
exhaustively audited. Q-P20B-20 proved this class is real and distinct from timing flakes, and my
campaign only shows the _known_ instance is fixed. A future hardening pass should audit shared
resources systematically rather than reactively.

### 12.1 Further spot-checks of frozen requirement delivery

Continuing §9.7, I checked more frozen clauses against shipped code rather than the ledger, choosing
the most falsifiable details:

- **HS-004** (description aliases — the most detailed frozen block). The frozen text demands "The
  first item in the autocomplete is **NOT** selected by default. The user must press down to focus
  the first element, then enter to select it… Esc closes the autocomplete. When the autocomplete is
  closed, pressing the up and down arrows moves focus to the next or previous row."
  `InlineEditableDescriptionAlias.tsx:160-205` implements exactly that: `activeOptionIndex` starts
  `null` (no default highlight), `ArrowDown` moves `null -> 0`, `Enter` accepts **only** when
  `activeOptionIndex != null` (otherwise it commits the typed text), `Escape` clears the active
  index and dismisses the dropdown, and every autocomplete branch is guarded by `isAutocompleteOpen`
  so arrows fall through to row navigation when closed.
- **HS-009** (±100 bound) is enforced at the **type boundary**: `AllocationPercentageSchema`
  (`domain/allocation.ts:19-25`) is a branded Zod number refined to finite, non-`-0`, `.min(-100)`,
  `.max(100)`. Rejection, never clamping.
- **HS-006** (undo/redo): all three frozen bindings are exercised — `Control+z`, `Control+Shift+z`
  (`undo-redo.spec.ts:108-110`) and the buttons; plus "remote history stays excluded while local
  undo syncs to a second client" (correct CRDT undo scoping) and a real offline-retry-on-reconnect
  case (`:311-376`).
- **HS-008** (import provenance): `schema.ts:135-163` carries `importId` and an **immutable**
  `originalAmount` ("before the first imported-row edit"), surfaced via the amount tooltip.
- **HS-013** (drop zones): live on **both** required surfaces —
  `ariaLabel="Transactions table file drop target"` (`transactions/page.tsx:1123`) and
  `"Imports list file drop target"` (`imports/page.tsx:108`).
- **HS-012** (person per user): `schema.ts:49` `linkedUserId` optional, with member fallback naming
  (`crdt/person.ts:47-96`).
- **HS-019** (password-manager compatibility): `RecoveryPhraseCredentialFields.tsx` emits a
  canonical `username` field plus `autoComplete="new-password"` on creation and `"current-password"`
  on unlock, so managers offer to save and then to fill.
- **HS-017** (Animate UI investigation): the requirement was to _investigate_; **D-008** records a
  reviewed decline with ten component-specific rollout gates — a legitimate outcome, not a silent
  skip.

### 12.2 OBSERVATION O-1 (non-blocking, OUT OF FROZEN SCOPE) — no CSP / security response headers

`next.config.ts` sets only `reactCompiler` and `serverExternalPackages`; there is **no `headers()`
block and no middleware**, so the app ships without `Content-Security-Policy`,
`X-Frame-Options`/`frame-ancestors`, `Referrer-Policy` or `X-Content-Type-Options`. For a product
whose security model depends on client-side crypto executing untampered in the browser, a CSP is
meaningful defense-in-depth against XSS/injection reaching key material.

**Why I do NOT raise this as a P21 blocker:** it is genuinely **outside the frozen scope**. HS-015 —
the only security-infrastructure requirement — is scoped by its own text to _"the client connection
to supabase for websockets… CORS… properly secured based on pub key hash access to vault"_, which
**is** delivered (`realtime.authorize` is a `protectedProcedure` gated by the tight
`realtime_grant_allows` predicate audited in §9.7). No frozen requirement asks for response headers,
and P21 must not invent scope. Recorded as a **deployment-hardening follow-up for human
consideration**, proposed Q-number **Q-P21-05-02**, owner: a future security package (not a rollback
trigger for any passed package).

### 12.3 HS-021 style-guide compliance re-checked at HEAD

The project rules forbid `as`, `any` and `!` outside small isolated typed helpers. I measured rather
than assumed:

- **`: any`** across `src/**`: **2 hits, neither a violation.** One is prose inside a comment
  (`PasskeyManager.tsx:74`, "any public test vector passes it"); the other is
  `animate-ui/primitives/animate/slot.tsx:26` — **vendored third-party code**, headed "This file is
  part of the animate-ui library (vendored)" and carrying an explicit
  `// eslint-disable-next-line @typescript-eslint/no-explicit-any`. No project-authored `any`.
- **Type assertions:** 100 real `as X` occurrences (after excluding `import * as React` and
  `as const`, which my first count wrongly included — recorded so the reviewer does not re-derive a
  phantom finding). **28 of them are in vendored `animate-ui/`.** The remainder follow the two
  patterns the style guide explicitly sanctions: prototype-less map construction
  (`Object.create(null) as Record<…>`, load-bearing for the hardened allocation boundary in
  `crdt/allocations.ts:116/186/208/286`) and **branded tiny-type constructors** isolated in small
  helpers (`currency.ts:85/196` → `MoneyMinorUnits`, `ISODateString`, `ISOInstantString`,
  `AllocationPercentage`). These are the mechanism _by which_ the codebase makes illegal states
  unrepresentable, not an escape from it.
- **Zero non-null assertions:** a targeted grep for `!` postfix assertions across `src/**`
  (excluding `!=`/`!==`) returns **0 hits** — the strictest of the three type-safety rules is fully
  honored.
- **Safe-integer discipline in the money path:** `settlement.ts` guards with `Number.isSafeInteger`
  at every arithmetic stage (`:449`, `:738`, `:759`, `:828`) and emits a typed `unsafe-calculation`
  issue (`:708-713`) rather than silently overflowing — money is never fabricated.

### 12.4 Why the P20B rev 06 fixes are principled, not retry-papering (quantified)

This matters because "widen the timeout" can be either a real fix or a way to hide a defect. Three
independent measurements say it is the former here.

1. **The widenings are on _web-first retrying_ assertions.** Playwright polls
   `expect(locator).toBeVisible({timeout})` until the condition holds; a larger cap therefore only
   changes behavior in the load-starved case. A genuinely broken assertion still fails — just later.
   No `--retries` was used anywhere; a failure remains a failure.
2. **Suite duration did not regress.** rev-04 runs averaged **233.6s**
   (236/233/236/230/231/234/238/231); my rev-05 runs average **231.8s** (233/232/232/229/233/232).
   Statistically identical — the extra headroom is **not being consumed** in the normal case, so it
   is not masking latent slowness.
3. **The decisive measurement — the formerly-flaky tests' own durations:**

    | Run | `identity.spec.ts:288` (F-2) | `import.spec.ts:1450` (F-1) |
    | --- | ---------------------------- | --------------------------- |
    | 1   | 5.7s                         | 5.2s                        |
    | 2   | 5.5s                         | 4.6s                        |
    | 3   | 5.9s                         | 4.0s                        |
    | 4   | 5.3s                         | 4.4s                        |
    | 5   | 5.3s                         | 4.2s                        |
    | 6   | 5.5s                         | 4.6s                        |

    **`identity:288` takes 5.3–5.9s — it was ALREADY EXCEEDING the old 5,000ms cap in every single
    run.** That is the mechanism of the rev-04 F-2 flake made visible: the test was permanently on
    the wrong side of its budget and only passed when scheduling happened to favor it. `import:1450`
    at 4.0–5.2s sat right on the boundary, which is exactly the 1-in-8 behavior the rev-04 collector
    observed. Against the new 15s caps both now carry ~3x margin. This is a **correctly sized
    timeout**, not a defect concealed.

### 12.5 The F-2 fix closes the whole class, not just the reported line

`waitForUnlockHydration` is applied at **every** seed-phrase entry path in the suite, not only at
the one assertion that flaked: `identity.spec.ts` gates it inside its own local `enterSeedPhrase`
(`:51-54`) plus three further sites (`:359`, `:564`, `:635`), and the **shared** helper
`tests/e2e/helpers/auth.ts:126-132` — used by `passkey.spec.ts:409` and `vault-settings.spec.ts:162`
— gates before touching the grid at all. The shared helper additionally keeps a genuine
post-propagation assertion (the BIP39 validity indicator, which "can only render once every onChange
ran and the checksum was recomputed from React state"), so it proves the fills landed in the
component rather than merely in the DOM.

This is the difference between patching a symptom and closing a class, and it is what the rev-04
reviewer asked for.

### 12.6 Cryptographic construction spot-check (no key material handled)

I read the constructions rather than trusting the marketing list. **No key, seed or plaintext was
generated, printed or stored for this check** — it is pure source inspection.

- **Vault data at rest:** `crypto_secretbox` = XSalsa20-Poly1305 (authenticated), with **192-bit
  random nonces** (`encryption.ts:14,32`), documented as safe to ~2^96 encryptions — no nonce-reuse
  exposure at any realistic scale.
- **Identity derivation:** BIP39 seed → **HKDF with separate domain strings** → an Ed25519 signing
  keypair (`crypto_sign_seed_keypair`) and a distinct X25519 encryption keypair
  (`keypair.ts:68-80`). Signing and encryption keys are properly domain-separated rather than
  reused.
- **Presence:** the ephemeral presence key is HKDF-derived from the vault key under its own
  `DOMAIN_PRESENCE_EPHEMERAL_BYTES` domain string (`presence-key.ts:30`), so presence ciphertext
  cannot be confused with vault content.
- **Invite envelopes:** `invite.getByPubkey` is one of only **3 `publicProcedure`s** (vs 37
  `protectedProcedure`s). Its public exposure is sound by construction: the `invitePubkey` is itself
  the unguessable bearer secret carried in the invite fragment, and `encrypted_vault_key` is an
  **authenticated, sender-bound `crypto_box` envelope — explicitly not a sealed box** — so only the
  holder of the matching private key can open it. The other two public procedures are the passkey
  authentication start/finish pair, which must precede authentication by definition.
- **Request signing:** one-use nonce claimed exactly once per request, with a request-scoped cache
  so a _batched_ tRPC call claims its nonce once and every later procedure is rejected as a replay
  (`server/trpc.ts:18-51`).

### 12.7 FINDING A-1 (non-blocking) — R-034 was explicitly routed to THIS audit; adjudicated here

`RISKS.md` R-034 is `open` with the instruction: _"Route a name fallback (amount/date) for the P21
audit."_ It is the one risk row addressed to P21, so I adjudicate it rather than pass it on.

**Confirmed live at HEAD.** `TransactionRow.tsx:330` builds the row checkbox name as
``ariaLabel={`Select transaction ${effectiveData.description}`}``. With an empty description the
accessible name degrades to `"Select transaction "` (trailing space).

**Why this is more reachable than "an edge case":** **HS-001 mandates empty rows** — "More than one
empty row can be created" — so _every_ newly added transaction has an empty description until the
user types. Adding two rows (the exact HS-001 journey, gated by `transactions.spec.ts:186` "each Add
click immediately creates a distinct ordinary empty row") produces **two checkboxes with the
identical accessible name**. A screen-reader user arrowing the grid hears the same name for two
different controls, with nothing to disambiguate them.

**Why NOT a P21 blocker (my reasoning, for the reviewer to overrule if they disagree):**

1. The control remains **discoverable, focusable, keyboard-operable and correctly role-typed**
   (`role="gridcell"` wrapper, real `checkbox`); state is conveyed via `toBeChecked`. This is a
   **name-quality** defect, not an operability failure — no WCAG 4.1.2 name-absent violation, since
   a non-empty name is present.
2. Every other cell in the row **is** individually and correctly named (date, account, status,
   amount, per-person allocation cells with their explicit/effective/remainder text), so the row is
   identifiable from its other controls; only the selection checkbox is ambiguous.
3. It was already independently reviewed and classified **NON-BLOCKING** by the P16E/02 reviewer,
   who further established that `TransactionRow.tsx:274` is **P16D-owned and byte-unchanged** — so
   this is not a regression introduced by any package in the audited range.

**Note for the reviewer — the suite cannot currently catch this.** `transactions.spec.ts:200-202`
scopes the lookup inside `page.getByRole("row", {selected: true})`, so the duplicate names never
collide in the assertion. The tests are correct, but they are not a guard against this class.

**Proposed disposition:** keep R-034 `open` with a concrete fix — fall back to a stable
disambiguator (amount + date, both always populated: the same test asserts `date-editable` is
non-empty and `amount-editable` is `"0.00"`) when the description is empty, e.g.
`Select transaction ${description || `${amount} on ${date}`}`. **Proposed owner: P16D** (the owning
package for this line). **Proposed Q-number: Q-P21-05-03.**

---

## 6. FULL E2E CAMPAIGN — the blocking validation mandate

Command, repeated sequentially, each a complete cold suite with its own dev server:

```
pnpm exec playwright test --retries=0 --reporter=list
```

Config: `fullyParallel: true`, **4 workers**, `retries: 0`, `reuseExistingServer: false`,
`Running 163 tests using 4 workers`, 163 tests / 22 spec files.

| Run | Start (local) | Duration | Result                 | `identity:288` (F-2) | `import:1450` (F-1) | `import:1532` (Q-P20B-14/20) |
| --- | ------------- | -------- | ---------------------- | -------------------- | ------------------- | ---------------------------- |
| 1   | 16:09:16      | 233s     | **163 passed**, exit 0 | PASS                 | PASS                | PASS                         |
| 2   | 16:13:09      | 232s     | **163 passed**, exit 0 | PASS                 | PASS                | PASS                         |
| 3   | 16:17:01      | 232s     | **163 passed**, exit 0 | PASS                 | PASS                | PASS                         |
| 4   | 16:20:53      | 229s     | **163 passed**, exit 0 | PASS                 | PASS                | PASS                         |
| 5   | 16:24:42      | 233s     | **163 passed**, exit 0 | PASS                 | PASS                | PASS                         |
| 6   | 16:28:35      | 232s     | **163 passed**, exit 0 | PASS                 | PASS                | PASS                         |
| 7   | 16:32:27      | 233s     | **163 passed**, exit 0 | PASS                 | PASS                | PASS                         |
| 8   | 16:36:20      | 232s     | **163 passed**, exit 0 | PASS                 | PASS                | PASS                         |

**AGGREGATE: 8 of 8 full-suite runs fully green. 1,304 of 1,304 test executions passed. ZERO
failures anywhere in the corpus** — `grep -h '✘' run*.txt` returns nothing. Playwright reported zero
`flaky` results in any run (retries were off, so a failure would simply be a failure). The
`≥8 full-suite --retries=0` mandate is **met**. (Runs 9–10 were queued for margin; see §6.2.)

### 6.1 Tree stability — the campaign is evidence for ONE tree

Per the "a repeated-run campaign is evidence only for the tree it ran" discipline, I recorded a
digest before every run. **The digest moved twice, and I chased both to ground rather than assuming
they were benign:**

| Runs | Digest         | Cause of change                                                                                                                                                                                                                                                                                         |
| ---- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `4320029962c4` | baseline                                                                                                                                                                                                                                                                                                |
| 2–4  | `1b5da8757686` | **my own `pnpm build` (16:06)** had regenerated `next-env.d.ts` to the _production_ types path — which equals the HEAD blob, so the tree was momentarily clean at run 1. Run 1's Playwright `webServer` (`pnpm run dev`) regenerated it to the _dev_ path, re-adding `M next-env.d.ts` to `git status`. |
| 5–8  | `661bfdddf1e6` | **my own untracked evidence file** `evidence/P21/implementation-05.md` entering `git status` when I began writing it mid-campaign.                                                                                                                                                                      |

**Both shifts were confined to the `git status --porcelain` component of my digest formula, which
was over-inclusive; the code under test never moved.** Proven three independent ways, re-checked
after each shift:

- `git diff HEAD --name-only -- src/ tests/` → **0 files**, for the whole campaign;
- the src+tests-only tree digest was **`c739da814d37` constantly**;
- `find src tests -newermt '2026-07-28 16:09'` → **0 files modified since the campaign began**.

I made a falsifiable prediction when diagnosing the first shift — that runs 3+ would all carry
`1b5da8757686` — and runs 3 and 4 confirmed it. `next-env.d.ts` is Next-generated, self-documents
"This file should not be edited", is not compiled into the app under test, and is one of the brief's
pre-classified inert strays. **No restart was required and the campaign stands as evidence for a
single tree.**

### 6.2 Honest limits of this evidence

A clean campaign in ONE environment is **necessary but weak** evidence for a load-dependent class,
and I will not overstate it. The rev-04 collector and reviewer produced an _honest inverse sample_
(collector saw `identity:288` 8/8 green while `import:1450` failed 1/8; the reviewer saw the exact
opposite), which is precisely why non-reproduction alone is not exoneration. My 8/8 is therefore
offered together with the **mechanistic** evidence in §12.4–§12.5, which is what actually
distinguishes "fixed" from "got lucky": the formerly-flaky tests measurably run at 4.0–5.9s against
their old 5,000ms caps, the new 15s caps give ~3x margin, suite duration did not regress, and the
hydration gate is applied at every seed-entry path rather than only the one that flaked.

Also unchanged from rev 04, and recorded again here: **broader cross-worker shared-resource
contention (ports, fixture accounts, database, `localStorage`) has not been exhaustively audited.**
Q-P20B-20 proved that class is real and distinct from timing flakes; my campaign only shows its
known instance is fixed.

### 12.8 The suite itself carries executable security gates (not just my probes)

Several audit clauses are enforced continuously by the suite rather than only by my one-off probes —
which is stronger evidence, since they ran green 8/8 in the campaign:

- **`passkey.spec.ts` "no PRF output, master secret or phrase ever leaves the browser"** captures
  **every** request URL + POST body and every console message, then asserts the WebAuthn `prf`
  result never appears in any request body and the **actual session signing key** (read back out of
  `sessionStorage`) never appears in any request, URL or console line. This is executable proof of
  the `SecuritySection` claims.
- **`realtime-security.spec.ts`** inspects the live websocket URL for leaked scope, asserting
  `sensitiveScopeInUrl` is false (no `vault:` scope, no `access_token` query parameter) and a secure
  socket shape — and that sync genuinely **stops after member removal**.
- **`membership.remove` is owner-only**, enforced server-side (`membership.ts:87-111`) with the
  persisted role parsed at the DB boundary via `vaultRoleSchema.safeParse` rather than cast —
  "narrow the persisted role at the DB boundary rather than casting", consistent with the project's
  no-`as` rule.
- **`invite-redemption.spec.ts`** runs a genuine two-user flow in isolated browser contexts and
  verifies the second user recovers the **real vault key** through the authenticated `crypto_box`
  envelope.

### 12.9 Documented architecture principles verified in shipped code

Each `CLAUDE.md` architecture claim checked against source rather than assumed:

| Principle                                           | Verified                                                                                                                                                                                        |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client-side encryption; server never sees plaintext | §7.1 — 18,074/18,074 ops + 5,635/5,635 snapshots opaque base64; §12.6 XSalsa20-Poly1305 AEAD                                                                                                    |
| Money as integers (minor units)                     | signed minor-unit integers throughout settlement; `getMinorUnitMultiplier` is currency-aware (USD 100, **JPY 1**, KWD/BHD 1000), with zero-decimal formatting tested (`currency.test.ts:62-65`) |
| Ed25519 auth, no passwords                          | §12.6 derivation; no password field; `signRequest` canonical message                                                                                                                            |
| CRDT state via loro-mirror draft mutations          | `mutations.ts` / `allocations.ts` mutate drafts in place                                                                                                                                        |
| IndexedDB writes immediate (crash safety)           | `persistence.ts` `appendOp` + `getUnpushedOps` local-first queue                                                                                                                                |
| Server pushes throttled ~2s                         | `manager.ts:45` `SERVER_SYNC_THROTTLE_MS = 2000`                                                                                                                                                |
| Shallow snapshots for cold starts                   | `sync.ts:8` "latest shallow snapshot per vault (fast cold start)"; `manager.ts:941`                                                                                                             |
| Bounded private maintenance shadows (D-015)         | `maintenance.ts:129-134` readonly `shadow*` cursor fields; per-frame budget by items AND milliseconds                                                                                           |

### 12.10 HS-007 (automations) — the most intricate frozen block, checked clause by clause

The frozen text (`human-scratch.md:270-295`) specifies unusual, highly falsifiable behavior. Each
distinctive clause has a named E2E gate in `field-rule-parity.spec.ts`:

| Frozen clause                                                                                                                         | Gate                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| "For tags there is an additional select … 'add tags' or 'set tags'"                                                                   | "add/set mode select is offered on create and mirrored in the inline popup"                                                     |
| "For person percentage attribution there is a column per person. The rule applies to the whole set … It should span all the columns." | "allocation rules are edited through a column-per-person grid capturing the whole set"                                          |
| "**Unlike** description alias rules, these other rules **do** apply to manually created transactions"                                 | "tag and allocation rules apply to a manual aliased row while description rules do not"                                         |
| the robot button appears only on rows with a matching rule                                                                            | "(d) a manual row whose alias name matches no rule carries no robot"; "only matching rows carry a robot and nothing auto-opens" |
| "We remember the user's last choices for the select and check boxes"                                                                  | "the four-mode apply select is remembered and restored on reopen" (+ §9.6 `lastApplyMode`)                                      |
| "if applied, we update the rule rather than create one"                                                                               | `TransactionRuleRobot.tsx` / `field-rule-robot-state.ts` update path                                                            |
| drift: an edit that diverges from a matching rule is detected and resolvable                                                          | `transaction-rules.spec.ts` "editing the alias to differ drives drift and apply-this resolves it"                               |
| apply-all / apply-new report impact and route through the engine                                                                      | `automations.spec.ts` "apply-all and apply-new report impact and route through the engine"                                      |

The inverted rule — description rules excluded from manual rows while tag/allocation rules include
them — is the kind of detail that is easy to get backwards; it has its own dedicated gate.

### 12.11 Why exact conservation actually holds — the apportionment algorithm

FS-001's "exact signed unit conservation" is not merely asserted by tests; it follows from the
algorithm. `apportionMinorUnits` (`domain/allocation.ts:340-383`) is a textbook
**largest-remainder** method computed in `ExactDecimal` (never binary floating point):

1. each person's floor share is taken in exact decimal;
2. `remaining = amountMinor - sum(floorShares)` is then **validated to be an integer in `[0, n]`**,
   and any violation returns a typed `unsafe-apportionment` error rather than a wrong number;
3. the `remaining` single units go to the largest fractional remainders, with ties broken by
   `comparePersonIds` — **deterministic, stable-ID ordering**, so the result is reproducible
   regardless of map iteration order;
4. each final share is re-checked for integrality and `MAX_SAFE_INTEGER` before being emitted.

Because exactly `remaining` units are distributed and each is `+1`, the sum is **identically**
`amountMinor` — conservation is structural, not incidental. Results are then deep-frozen
(`freezeResultGraph`, `settlement.ts:204-209`, covered by `RESULT_IMMUTABILITY_SEED=16_001_604`), so
the immutability principle is enforced at runtime as well as in the types.

### 12.12 "Use established libraries" rule — verified per algorithm domain

The project rule is that custom implementations of standard algorithms are "bugs waiting to happen".
Every algorithmic domain in the shipped code delegates to a maintained library:

| Domain                      | Library                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------- |
| Exact decimal math          | `decimal.js@10.6.0`, cloned at **precision 80, ROUND_HALF_EVEN** (`allocation.ts:14-17`)      |
| CSV parsing                 | `papaparse@5.5.4`                                                                             |
| OFX/QFX parsing             | `@f-o-t/ofx@2.4.6`                                                                            |
| Date parsing                | `chrono-node@2.10.0`; dates/instants via `temporal-polyfill@1.0.1`                            |
| String similarity           | `string-comparison` (`import/levenshtein.ts:13-29` is a thin wrapper, not a reimplementation) |
| Mnemonics                   | `@scure/bip39@2.2.0`                                                                          |
| Hashing / HKDF              | `@noble/hashes@2.2.0`                                                                         |
| Symmetric/asymmetric crypto | `libsodium-wrappers@0.8.4`                                                                    |

No hand-rolled Levenshtein, CSV tokenizer, date parser or crypto primitive was found.

---

## 8. Performance (both env-gated benchmarks executed)

### 8.1 Allocation edit — sub-100ms target MET with a large margin

```
$ P16A_BENCHMARK=1 pnpm exec vitest run tests/unit/domain/allocation.test.ts --reporter=verbose --silent=false
P16A benchmark node=v22.21.1 people=200 warmup=100 samples=5 iterations=250
  elapsedMs=451.30,449.88,458.16,456.89,456.40          # 2026-07-28T16:48
```

250 iterations of full derivation + apportionment over **200 people** in 450–458ms → **≈1.80–1.83ms
per allocation edit**, roughly **55x inside** the <100ms interaction target. The benchmark also
asserts a fixed checksum (`-246_913_580_250`) across all 5 samples, so it proves **correctness at
scale**, not just speed. **PASS.**

### 8.2 Settlement scale — near-linear; ~200ms NOT met (Q-033 second branch, independently re-measured)

```
$ P16B_BENCHMARK=1 pnpm exec vitest run tests/unit/domain/settlement.test.ts --reporter=verbose --silent=false
P16B benchmark node=v22.21.1 transactions=100000 construction=excluded projection=included
  warmup=5x1000 samples=5 scale10kMs=73.15 scale50kMs=406.36
  elapsed100kMs=788.11,780.74,785.75,786.22,751.94
  obligations=2 contributions=75000 issues=0 conservation=true    # 2026-07-28T16:48
```

- **Near-linear scaling confirmed:** 10k = 73.2ms → 50k = 406.4ms (5.6x for 5x) → 100k ≈ 778.6ms
  (10.6x for 10x). Slightly super-linear, within the "near-linear" bound.
- **~779ms, NOT ~200ms.** Correctness is exact at scale: 100,000 qualifying, 75,000 contributions, 2
  obligations, **0 issues, conservation true**.
- My independent numbers (752–788ms) sit at the fast end of, and corroborate, every prior
  measurement (P16E implementer 0.76–0.86s; P16E reviewer 0.93–1.10s; P21 rev-04 collector
  0.86–0.98s). The target is missed by a consistent ~4x across four independent measurers.
- **This is FS-001 §14's explicitly permitted second branch**, verbatim from the frozen spec
  (`spec.md:582-584`): _"should meet … approximately 200ms …, **or provide measured evidence and a
  documented optimization follow-up**."_ Q-033 selected that branch, adjudicated by a distinct
  reviewer; **R-020 remains `open`** and the target is **not** claimed as passed. I make no contrary
  claim. Correctly handled — **not a blocker**.

### 8.3 Large-scale interaction and convergence

The 163-case suite — run **10x** in §6 — exercises large imports, the virtualized table (including a
12-person horizontally-overflowing allocation grid), alias/automation/GC interactions, duplicate-tab
convergence, presence across two members plus a duplicate tab, offline→reconnect durable-op
catch-up, and hidden-receiver re-sync. All green in all 10 runs with no deadlock, infinite loading,
or lost change.

---

## 4. Migrations and vault/IndexedDB compatibility (EXECUTED)

Six ordered SQL migrations at HEAD: `005_vault_ops.sql` (squashed baseline),
`006_rls_hardening.sql`, `007_realtime_authorization.sql`,
`008_realtime_authorization_lifecycle.sql`, `009_remove_unused_user_state.sql`,
`010_passkey_credentials.sql`.

### 4.1 Supported-upgrade path — the database all 10 campaign runs executed against

The live `supabase_db_moneyflow` (PostgreSQL 17.6) carried accumulated multi-revision test data
(18,074 `vault_ops`, 5,635 snapshots, 5,667 vaults, 259 passkey credentials, 6,411 memberships when
I sampled it). **All 1,630 E2E executions across the 10 full-suite runs, plus every integration
test, ran against that upgraded schema.** That IS the executed supported-upgrade evidence.

### 4.2 Fresh bootstrap — EXECUTED, clean

```
$ pnpm db:reset                                    # 2026-07-28T16:49:24+10:00
Resetting local database... Recreating database... Initialising schema...
Seeding globals from roles.sql...
Applying migration 005_vault_ops.sql...
Applying migration 006_rls_hardening.sql...
Applying migration 007_realtime_authorization.sql...
Applying migration 008_realtime_authorization_lifecycle.sql...
Applying migration 009_remove_unused_user_state.sql...
Applying migration 010_passkey_credentials.sql...
Finished supabase db reset on branch main.
DB_RESET_EXIT=0
```

**All six migrations applied cleanly from an empty database, exit 0.** The only NOTICEs are two
benign idempotent `DROP POLICY … does not exist, skipping` lines in `007`.

**The fresh schema is identical to the upgraded one:** 11 `public` tables, **11 of 11 with
`rowsecurity = t`**, **10 policies**, 0 rows — the same shape I audited in §7.1 on the upgraded
database.

### 4.3 Fresh-database application verification — EXECUTED, green

```
$ pnpm exec playwright test tests/e2e/identity.spec.ts tests/e2e/onboarding-vault.spec.ts \
    tests/e2e/people-settlement.spec.ts --retries=0 --reporter=list
36 passed (48.1s)     # exit 0, 2026-07-28T16:49:56+10:00
```

Identity creation, vault onboarding and the **complete settlement matrix including all 8 canonical
examples** work on a brand-new database. Both branches of the migration requirement are therefore
executed and green.

### 4.4 IndexedDB / vault compatibility

`migrateVaultSentinels` (`crdt/migration.ts:213`) runs on **every** mirror load path
(`mirror.ts:125`, `:162`, `:202`), clearing epoch-zero/empty-string sentinels that would otherwise
decode to truthy domain values and break `if (!entity.deletedAt)` checks; `repairDescriptionAliases`
covers the alias graph. Both are covered by unit (`description-alias-mutations.test.ts`) and
integration (`description-alias-crdt.test.ts`) tests, all green in `pnpm test`. **No plaintext leak
is possible in this path by construction:** client-side migration operates on already-decrypted
in-memory CRDT state and never touches data at rest — §7.1 independently confirms 100% of stored ops
and snapshots remain opaque base64.

---

## 13. HAND-DRIVEN manual product journey (disposable headless CLI session, executed)

Driven by hand in a **disposable headless session** (`playwright-cli -s=p21r05`) against the freshly
bootstrapped database, with a brand-new isolated identity. **I deliberately never clicked "Click to
reveal", so no recovery phrase was displayed, captured or recorded**; only structural accessibility
snapshots were taken.

| Step                           | Observed live                                                                                                                                                                                                                                                                                        |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Marketing landing              | Proper landmarks (`banner` / `navigation "Global"` / `main` / `contentinfo`); copy states **"It is not a budgeting app — there are no limits to set and no spending targets to miss"** (frozen positioning honoured)                                                                                 |
| Onboarding                     | Both paths offered — **"Create with a passkey"** and **"Generate Recovery Phrase"** — each with an honest irreversibility warning ("there's no password reset")                                                                                                                                      |
| **Hydration gate, observed**   | On first paint `Generate Recovery Phrase` rendered **`[disabled]`** and the passkey button was **absent**; after hydration both appeared enabled. This is exactly the `useIsHydrated` / `capability:"checking"` mechanism the P20B rev-06 F-2 fix relies on — **seen live, not just read in source** |
| Recovery phrase screen         | Phrase **hidden behind "Click to reveal"**; **"Create Account" `[disabled]`** until the "I have saved down my recovery phrase…" checkbox is checked, then enabled                                                                                                                                    |
| Vault created                  | Landed on `/settings` with full nav                                                                                                                                                                                                                                                                  |
| Transactions empty state       | `region "Transactions table file drop target"` present — **HS-013 drop zone live**; "0 transactions"; honest empty state                                                                                                                                                                             |
| **HS-001 multiple empty rows** | Two "Add transaction" clicks → **"2 transactions", two coexisting ordinary rows**. **Confirmed live**                                                                                                                                                                                                |
| Grid columns                   | `Select all`, `Date`, `Description`, `Account`, `Tags`, `Status`, **`Me %`**, `Amount`, `Actions`                                                                                                                                                                                                    |
| **FS-001 allocation state**    | Cell accessible text **`"Explicit: not stored. Effective: 100%. Owner remainder: 100%."`** — explicit / effective / owner-remainder distinguished, absent explicit value reported as _not stored_, never fabricated                                                                                  |
| **HS-009 reject-never-clamp**  | Entered **150** → input `[invalid]` with `alert "Enter a finite number from -100 to 100."`; **the typed "150" is RETAINED, not rewritten to 100**; stored state stays `Explicit: not stored`. **Rejected, never clamped — confirmed live**                                                           |
| Valid allocation (Example C)   | Entered **60** → **`"Explicit: 60%. Effective: 100%. Owner remainder: 40%."`**; the second row stayed `not stored` (per-key mutation, no cross-contamination)                                                                                                                                        |
| People / settlement honesty    | **"No transactions have a Treat-as-Paid status yet, so there is nothing to settle."** — Example H's exclusion stated honestly, with no false "everyone is settled" claim                                                                                                                             |

### 13.1 Live accessibility measurements (computed, not asserted)

- **320px reflow:** `scrollWidth 320 == clientWidth 320`, `horizontalOverflow: false`. **PASS**
- **200% zoom** (`documentElement.style.zoom = '2'` at 1280x800): `zoomedHorizontalOverflow: false`,
  `scrollWidth 1280 == clientWidth 1280`. **PASS**
- **Computed WCAG contrast ratios** (sRGB→linear, `0.2126R+0.7152G+0.0722B`, `(L1+0.05)/(L2+0.05)`):

    | Element   | Light mode  | Dark mode   | Threshold |
    | --------- | ----------- | ----------- | --------- |
    | `h1`      | **20.16:1** | **19.27:1** | ≥ 4.5     |
    | body text | **4.76:1**  | **7.66:1**  | ≥ 4.5     |
    | button    | **20.16:1** | **17.04:1** | ≥ 4.5     |
    | link      | **20.16:1** | **17.04:1** | ≥ 4.5     |

    **All pass AA in both themes.**

    **Methodology note the reviewer should not re-derive.** My first probe returned absurd 1.35–1.52
    ratios — the same phantom the rev-04 collector hit. The app serves colours in CSS **`lab()`**
    space (`lab(1.76974 1.32743 -9.28855)`), and **assigning `ctx.fillStyle` does NOT normalize it**
    — I verified canvas returns the `lab()` string unchanged, so a regex reads the _lab components_
    as RGB. The fix is to **paint the colour into a 1x1 canvas over an opaque white base and read
    the pixel back** (`getImageData`), which is colour-space independent and also composites alpha
    correctly. Sanity check: the `h1` colour resolves to `[2,6,24]` on a `[255,255,255]` background
    — near-black on white, consistent with 20.16:1. **There is no contrast defect.**

- **Live console:** **0 errors, 0 warnings.** Only normal dev-mode lifecycle entries
  (`[Fast Refresh]`, `[HMR] connected`, the React DevTools suggestion) and
  `SyncManager: Loaded snapshot from IndexedDB / from server / Applied N ops / Initial state loaded successfully`.
- **Live network:** 51 resource requests — **0 with sensitive data in the URL**
  (`/seed|secret|key=|token=|phrase|mnemonic|password|recovery/i`) and **0 external hosts
  contacted** (no third-party or analytics beaconing).

### 13.2 Cleanup

`delete-data` + `close` were issued, and `.playwright-cli/` and the probe script were removed.
`git status --porcelain` afterwards shows **only** `M next-env.d.ts`, `?? .claude/agent-memory/`,
`?? evidence/P08/implementation-01.md` (the three pre-classified inert strays) and my own
`?? evidence/P21/implementation-05.md`. **Nothing sensitive persists into the repository.**

---

## 14. Proposed FINAL-AUDIT contents and CANDIDATE verdict

> Root transcribes this **only** after an independent reviewer PASS. I commit nothing and did not
> edit `FINAL-AUDIT.md`.

### 14.1 Post-audit integrity re-verification

Re-checked after every probe, benchmark, database reset and browser session completed:

```
git rev-parse HEAD                       -> abf2ce0f7ac2ffca66b064906b0d819b35999a76   (unmoved)
git status --porcelain                   -> M next-env.d.ts; ?? .claude/agent-memory/;
                                            ?? evidence/P08/implementation-01.md;
                                            ?? evidence/P21/implementation-05.md      (mine)
sha256 specs/human-scratch.md            -> 469e98c7…d2f6a                             (unchanged)
sha256 …/008-…/spec.md                   -> 0d0e2a14…dcfe8c                             (unchanged)
git rev-parse HEAD:src/lib/domain/settlement.ts -> 010f3c93…                            (unchanged)
git diff HEAD --name-only -- src/ tests/ -> 0 files
```

### 14.2 Proposed checklist results

**Scope reconciliation** — all 9 clauses PASS. 22 first-class entries map to approved reviews and
passed rows; P11A–C and P17A–D passed before their checkboxes; scratch checksum matches the rolling
SHA with the frozen identity independently reconstructed as `b91ca932…` (§2.3); FS-001 immutable at
`0d0e2a14…`/715/25,441; P16A–E all passed before FS-001; every prior P21 failure has a complete
closed batch; nothing is `changes_requested` except control P21 itself; no approved range moved;
QUESTIONS/DECISIONS internally consistent and summarized (§12).

**Repository and migration audit** — all 5 clauses PASS (§1, §4). Exact HEAD/branch/upstream/dirty
paths recorded; no unrelated or user-owned file committed; fresh bootstrap and the supported-upgrade
path both executed green; IndexedDB/vault migration covered with no plaintext exposure possible by
construction; dependency audit and the P03 gate rechecked from primary sources.

**Verification audit** — all 5 clauses PASS (§5, §6, §10). format/lint/typecheck/build green (only
the known `TransactionTable.tsx:401` warning and frozen-`specs/**` format flags); 2,091 unit tests
pass with fixed seeds and the 2 skips proven to be env-gated benchmarks that I then ran; **full E2E
10/10 with retries disabled**; no arbitrary sleeps, `.only`, `.skip`, shared ordering or
retry-dependent outcomes.

**Exhaustive manual product audit** — PASS (§13 hand-driven, §6/§12 automated). Note the two
non-blocking a11y/marketing findings below.

**Security and performance audit** — PASS with one accepted deviation. Cross-vault database, API and
realtime access denied under live adversarial probing with a positive control (§7.0–7.1); no key
material, phrase or financial plaintext in logs, URLs, server storage or this evidence; large
imports/tables/GC responsive; **allocation edits ~1.8ms (55x inside the <100ms target)**; settlement
near-linear with exact conservation but **~779ms at 100k, not ~200ms** — FS-001 §14's explicitly
permitted measured-evidence branch (Q-033, R-020 stays `open`, target NOT claimed met); 16/16
canonical gates; sole engine; typed issues; complete-set semantics; duplicate-tab convergence.

### 14.3 Findings — none blocking

| ID      | Severity                   | Summary                                                                                                                                                                                                            | Proposed owner      | Proposed Q             |
| ------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | ---------------------- |
| **M-1** | non-blocking, NEW          | "Edits merge cleanly … **will not overwrite each other**" is an unqualified durability promise, but the documented, still-unfixed `pruneBuckets` merge defect (Q-P20B-00) contradicts it in a reachable case (§11) | **P20A** (copy)     | **Q-P21-05-01**        |
| **O-1** | non-blocking, out of scope | No CSP / security response headers (`next.config.ts` has no `headers()`, no middleware) (§12.2)                                                                                                                    | future security pkg | **Q-P21-05-02**        |
| **A-1** | non-blocking, pre-existing | **R-034**, explicitly routed to this audit: row checkbox name degrades to `"Select transaction "` for empty rows, which HS-001 makes routine (§12.7)                                                               | **P16D**            | **Q-P21-05-03**        |
| **C-1** | non-blocking, carried      | Upstream registry currency drift; `pnpm audit --prod` exit 0 (§3.3)                                                                                                                                                | —                   | Q-P21-04-01 (existing) |

None of these is a failing check, an unexplained reproducing flake, a data-integrity defect, a
write-boundary breach or unclassified drift. M-1 and A-1 concern **wording and an accessible-name
fallback**; O-1 is outside the frozen scope. I record them rather than absorbing them silently, and
the reviewer may overrule any of my severity calls.

### 14.4 CANDIDATE VERDICT

**PASS-candidate.**

Every audit-contract clause was executed and passed, including the one that failed rev 04. The
blocking E2E validation mandate is met with margin — **10/10 full-suite `--retries=0` runs, 1,630 of
1,630 test executions green, zero failures across the entire corpus** — on a tree proven constant
(§6.1). Critically, I do not rest on the clean campaign alone, since a single clean environment is
weak evidence for a load-dependent class: the **mechanistic** evidence in §12.4–§12.5 shows _why_
the fixes hold — `identity:288` measurably runs at 5.3–5.9s and was therefore **already over the old
5,000ms cap in every run** (the exact mechanism of the rev-04 F-2 flake), the new caps give ~3x
margin, suite duration did not regress (231.8s vs rev-04's 233.6s, so the headroom goes unused), and
the hydration gate closes the whole class rather than the one reported line.

**Honest limits:** cross-worker shared-resource contention beyond Q-P20B-20 remains un-audited, and
the three non-blocking findings above are real and should be tracked, not waved through.

**I am not the gate.** A distinct reviewer must independently rerun the high-risk gates and the
required manual matrix and issue the single formal verdict in `reviews/P21-review-05.md`.
