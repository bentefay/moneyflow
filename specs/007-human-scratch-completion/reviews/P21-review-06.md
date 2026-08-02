# P21 rev 06 — Executable Final Audit — Independent Review

- **Reviewer:** `p21-reviewer-06`
- **Date:** 2026-08-03
- **Verdict:** **FAIL** (single, unconditional)

## 0. Identity and independence

I am `p21-reviewer-06`. I am **not** `p21-collector-06`, and I am not any of `p21-collector-01`–`05`
or `p21-reviewer-01`–`05`. I did not collect this evidence, did not author any package under audit,
and had no part in producing the artifacts I am reviewing.

**Write boundary observed.** I wrote exactly one file — this one. I committed nothing. I did not
edit `FINAL-AUDIT.md`, any ledger, any product file, any test, any migration, or any other spec
file. I created and destroyed a throwaway database and disposable browser/test state, which the
contract permits.

**Reading convention.** Every claim below is tagged **MEASURED** (I ran the command in this session
and its output is reproduced or summarised faithfully) or **INFERRED** (derived by reading code or
artifacts without a discriminating execution). Per the dispatch's method note I re-derived every
figure rather than relaying it from the dispatch, the evidence, or `PROGRESS.md`. Where my
measurement disagrees with a figure I was given, I say so explicitly in §9.

---

## 1. BASE / HEAD — my own ancestry and drift output

**Assigned BASE** `5260c152e7cf92359d7db41e4505404cfe088e16`, **assigned HEAD**
`234e1e4391e1c3535c09ca5f3301193e29b9b935`.

**MEASURED — ancestry:**

```
$ git merge-base --is-ancestor 5260c152e7cf92359d7db41e4505404cfe088e16 234e1e4391e1c3535c09ca5f3301193e29b9b935
YES-ancestor

$ git log --oneline 5260c15..234e1e4
234e1e4 docs: correct the stale current-position tally in PROGRESS.md

$ git diff --stat 5260c15 234e1e4
 specs/007-human-scratch-completion/PROGRESS.md | 15 +++++++++++----
 1 file changed, 11 insertions(+), 4 deletions(-)

$ git diff 5260c15 234e1e4 -- src tests supabase package.json pnpm-lock.yaml
(empty)
```

A literal `BASE == HEAD` check fails, as the dispatch warned. **The reconciliation is sound and I
verified it myself rather than accepting it:** exactly one commit, touching exactly one file, under
`specs/`, with an empty product diff. The contract's `BASE == HEAD` intent — that no
product/migration/test change entered the range — is satisfied. **This is not, and was never, a
reason to approve; see the verdict.**

### 1.1 Mid-review drift — MEASURED and classified

`HEAD` moved **while I was reviewing**, from `234e1e4` to `8e5383b`:

```
$ git log --oneline 234e1e4..HEAD
8e5383b docs: commit the collector's retraction of an unverifiable non-recurrence claim
597a9e7 docs: persist P21 rev 06 collection evidence and dispatch its independent review

$ git diff 234e1e4 HEAD -- src tests supabase package.json pnpm-lock.yaml
(empty)

$ git diff --stat 234e1e4 HEAD
 HANDOFF.md | 3 +-  PROGRESS.md | 2 +-  dispatches/P21-rev06-review.md | 151 +
 evidence/P21/implementation-06.md | 1527 +   (4 files, +1681 -2)
```

**Documentation-only; product tree still byte-identical to BASE.** My E2E campaign ran in a worktree
pinned `--detach` at `234e1e4` with an unchanged digest across all runs, so it remains valid
evidence for the audited tree. **Classified, not unclassified** — this is not the drift that drives
the verdict.

### 1.2 A process deviation I must record — MEASURED

`PROCESS.md:57-58` states: _"Implementation evidence and review output remain uncommitted while
being independently reviewed. Root persists them in an exact-path control/integration commit after
FAIL or PASS."_ My dispatch told me the evidence was uncommitted on disk and that this was correct
per that line.

**The evidence was committed mid-review at `597a9e7`, and amended in substance at `8e5383b`, before
any verdict existed.** `8e5383b` retracts a claim the committed evidence carried. I do not treat
this as a write-boundary breach by an implementer — it is root's own artifact handling, and the
retraction it carried was corrective rather than self-serving. I record it because the audit
contract requires drift to be classified rather than passed over, and because a reviewer reading the
committed file between `597a9e7` and `8e5383b` was reading a retracted line. **Non-blocking on its
own.**

### 1.3 The retracted claim, re-derived on my own evidence — MEASURED

The retraction restated rev-04 blocker non-recurrence by file rather than by line, because the line
numbers no longer name tests. **My independent campaign reproduces the restated conclusion:**

```
$ grep -h "^  [0-9]*) \[chromium\]" /tmp/p21r06/e2e/run*.log | grep -cE "import\.spec|identity\.spec"
0
```

Zero failures in `import.spec.ts` and `identity.spec.ts` across every run of my campaign. The
conclusion survives on evidence I generated.

---

## 2. Verdict

# FAIL

**Driving trigger, stated exactly.** The audit contract's `## PASS and failure routing` makes _"any
failing check, unexplained flake"_ a FAIL, and `FINAL-AUDIT.md` requires _"Full E2E suite passes
with retries disabled"_ and _"Changed critical journeys pass repeated flake runs with retries
disabled."_

**MEASURED — my own independent 5-run campaign, `--retries=0`, 4 workers, `env -u CI`, one unchanged
tree digest `234e1e43…-25ade545`, worktree pinned `--detach` at the audited HEAD:**

| Run   | Passed  | Failed | Failing tests                                           |
| ----- | ------- | ------ | ------------------------------------------------------- |
| 1     | 193     | 2      | `people-settlement.spec.ts:525`, `:559`                 |
| 2     | 191     | 4      | `people-settlement.spec.ts:145`, `:166`, `:281`, `:596` |
| 3     | 194     | 1      | `people-settlement.spec.ts:145`                         |
| 4     | **195** | **0**  | — **fully green**                                       |
| 5     | 194     | 1      | `people-settlement.spec.ts:166`                         |
| Total | 967     | 8      | 8 failures across **6 distinct tests**, 99.18%          |

**4 of 5 runs failed. Run 4 was fully green, and that is the point.** A single clean run of this
suite carries **no** information — the dispatch says so and my campaign demonstrates it directly.
Had I run once and stopped on run 4, I would have reported a passing E2E clause on the identical
tree that failed four other times. **Any future revision that offers one green run as evidence of
stability should be rejected on that basis alone.**

The 8 failures spread across **6 distinct tests** (`:145` ×2, `:166` ×2, `:281`, `:525`, `:559`,
`:596`), and every one of those tests passed in the majority of runs. That is the signature of a
shared load-dependent helper, not a defective test and not a product defect.

This independently reproduces the collector's reported clause failure on a **different set of
failing test IDs** — the strongest available evidence that the class is real and load-dependent
rather than an artifact of one campaign.

**Tree stability — MEASURED.** The worktree remained pinned at `234e1e4` with an unchanged digest
recorded at the start of every run, verified again after run 5. The campaign is evidence for exactly
one tree.

This verdict does **not** rest on the empty diff, on the collector's evidence, or on any prior
revision. It rests on gates I ran.

---

## 3. Audit-contract clauses — command, actual output, pass/fail

All static gates run in the primary checkout at the audited tree.

| Clause                  | Command             | Exit  | Result                                                 |
| ----------------------- | ------------------- | ----- | ------------------------------------------------------ |
| Typecheck               | `pnpm typecheck`    | **0** | **PASS** — `tsc --noEmit`, 2.94s                       |
| Lint                    | `pnpm lint`         | **0** | **PASS** — 1 problem: **0 errors, 1 warning**          |
| Format                  | `pnpm format:check` | **1** | see §4 — **PASS on my ruling**                         |
| Production build        | `pnpm build`        | **0** | **PASS** — compiled in 6.5s                            |
| Unit/property/integ.    | `pnpm test`         | **0** | **PASS** — 129 files, **2,481 passed**, 2 opt-in skips |
| Dependency audit (prod) | `pnpm audit --prod` | **0** | **PASS** — "No known vulnerabilities found"            |
| Full E2E, retries=0, ×5 | see §5              | **1** | **FAIL** — 4 of 5 runs failed                          |

**MEASURED — the single lint warning**, reproduced verbatim, is React Compiler declining to memoize
a `useVirtualizer` component (`TransactionTable.tsx:459`, `react-hooks/incompatible-library`). Zero
errors. Not a defect; it is the upstream interaction P03 tracks.

**MEASURED — test-hygiene clauses** ("no arbitrary sleeps, shared test ordering, unexplained skips,
or retry-dependent outcomes"):

```
$ grep -rn "\.skip(\|\.todo(\|test\.fixme" tests/ src/     -> nothing
$ grep -rn "waitForTimeout\|sleep(" tests/e2e/             -> nothing
$ ls tests/e2e/*.spec.ts | wc -l                           -> 24
$ grep -rhcE "^\s*test\(" tests/e2e/*.spec.ts | paste -sd+ | bc  -> 195
```

Zero skips, zero todos, zero arbitrary sleeps. **PASS.**

---

## 4. Ruling 1 of 3 — strict `format:check`

**MEASURED:**

```
$ pnpm format:check
Format issues found in above 27 files.   exit 1

flagged by location:
  specs/007-human-scratch-completion/**   26
  specs/human-scratch.md (FROZEN)          1
  src/**                                   0
  tests/**                                 0
```

**I re-derived the pre-existence claim rather than accepting it — MEASURED:**

```
$ git show 0ea864f:specs/human-scratch.md > /tmp/p21r06-fmt/specs/human-scratch.md   (21,904 bytes)
$ cd /tmp/p21r06-fmt && oxfmt --check specs/
specs/human-scratch.md (168ms)
Format issues found in above 1 files.    exit 1
```

The frozen scratch was **already format-dirty at the P00 baseline `0ea864f`**, before any package
ran.

**RULING: this clause PASSES.** Reasons, in order of weight:

1. **Zero product or test files are flagged.** The clause exists to keep shipped code formatted;
   that condition is met exactly.
2. **The only remedy would be a scope violation.** Reformatting `specs/human-scratch.md` changes its
   SHA-256, which is the rolling checksum the entire requirement ledger is chained to. The audit
   would break the invariant it exists to verify. A gate whose only satisfying action is prohibited
   cannot be read as failing the work.
3. **It is pre-existing and not a regression.** The 15 → 27 growth is new specification and evidence
   documents authored by P22–P33, not product regression. Revisions 04 and 05 both accepted the
   identical condition at 15 files, under two distinct independent reviewers.

**This is a ruling, not a measurement, and I own it.** I endorse `Q-P21-06-02`'s substance: the bare
`oxfmt` invocation has no ignore configuration, so it sweeps frozen and root-owned markdown that
must not be reformatted. Scoping oxfmt away from `specs/**`, or recording the exemption durably,
would stop every future revision re-litigating this. That is a follow-up, not a blocker.

---

## 5. The E2E campaign — MEASURED, and the classification work

**Environment.** `:3000` claimed and announced to root before use and released after; `:3001` (the
human's dev server, 3-day uptime) never touched; `ss -ltn` used for all port questions; `env -u CI`
on every run; no `--debug`/`--ui`/`--headed`/`show`; no `pkill`. I used an isolated worktree
`/tmp/mf-p21r06` pinned `--detach` at the audited HEAD, **copied `.env.local` into it** per the
recorded hazard, and ran a real `pnpm install --frozen-lockfile` (exit 0) rather than
`cp -a node_modules`. No journey failed at `createNewIdentity`, so the environment signature that
hazard describes is absent.

### 5.1 Class 1 — the settlement rotation. **CONFIRMED test-instrument defect.**

Every settlement failure in every run of my campaign was `expectObligation` at Playwright's **5s
default**, at `tests/e2e/helpers/settlement.ts:394` or `:401`, with `Error: element(s) not found`.

**MEASURED — the instrument:**

```
$ grep -c 'toBeVisible()'  tests/e2e/helpers/settlement.ts   -> 9    (bare, 5s default)
$ grep -c 'toBeVisible({'  tests/e2e/helpers/settlement.ts   -> 0    (none with a timeout)
$ grep -n  'expect'        playwright.config.ts              -> no expect block at all
```

`playwright.config.ts:62` sets `timeout: 30000` for the test but **never sets `expect.timeout`**, so
every bare assertion in that helper runs on 5s regardless.

**MEASURED — why the element is genuinely absent, not merely late.** `goToPeople`
(`tests/e2e/helpers/nav.ts:43`) waits only for the page **heading**:

```ts
export async function goToPeople(page: Page): Promise<void> {
    await page.goto("/people");
    await page.getByRole("heading", { name: "People", level: 1 }).waitFor({ timeout: 15000 });
}
```

Its sibling `goToAutomations` (`:47-52`) additionally waits for a **content** element
(`[data-testid="new-rule-btn"]`) with the comment "only renders once a vault is selected" — the
correct pattern, present one function away.

Before CRDT hydration, `buildSettlementView`
(`src/components/features/people/settlement-view.ts:184-192`) returns
`{ kind: "no-qualifying-transactions" }`, and `BalanceSummary.tsx:168` takes an **early return** on
that branch that renders **no currency section at all**. So `settlement-currency-section-USD`
genuinely does not exist yet, and Playwright's "element(s) not found" is literally accurate. **The
test asserts on content before waiting for the content to exist.**

**Discriminating evidence, from my own runs:** the failing membership **rotates** and no test is
consistently bad. Across five runs I observed `:145` ×2, `:166` ×2, `:281`, `:525`, `:559`, `:596` —
**a different set from the collector's** (`:197` ×4, `:166` ×3, `:596`, `:281`). Tests that failed
in one run passed in others on the identical tree digest. That is the signature of a shared
load-dependent helper, not of a defective test or a product defect.

**And run 4 passed 195/195 on that same tree** — which is the clearest possible demonstration that
the class is load-dependent rather than deterministic, and the clearest possible warning against
accepting a single green run as evidence.

**Classification: test-instrument defect. Owner P20B. `Q-P21-06-03` is correct and I endorse it.**
The fix is to give the helper explicit waits (or set `expect.timeout`) and to make `goToPeople` wait
for a content element the way `goToAutomations` already does. **No product defect is implicated.**

### 5.2 Class 2 — the virtualized grid. **I reproduced it and I am classifying it as UNRESOLVED.**

This was the dispatch's single highest-value request. I did the work; I am reporting the outcome
honestly, including the part I could not settle.

**Isolation runs — MEASURED, both green:**

```
$ playwright test transactions.spec.ts --workers=1 --repeat-each=3 -g "Add reveals its canonical row..."
  3 passed (28.1s)
$ playwright test transactions.spec.ts --workers=1 --repeat-each=3 -g "virtualized large list preserves position"
  3 passed (1.5m)
$ playwright test transactions.spec.ts --workers=4 --repeat-each=4 -g "virtualized large list preserves position"
  4 passed (34.0s)
```

Neither reproduces in isolation, at 1 worker or at 4. **Isolation is therefore not evidence of
health here** — the recorded campaign memory for this repository says exactly that, and my results
confirm it.

**Reproduced under whole-file parallel load — MEASURED:**

```
$ playwright test transactions.spec.ts --workers=4 --repeat-each=3 --retries=0
  1 failed  149 passed (3.0m)

1) transactions.spec.ts:726 › ... › filter the large list and restore its edited row
   Error: expect(locator).toBeVisible() failed
   Locator: getByText('500 transactions', { exact: true })
   Timeout: 15000ms   Error: element(s) not found
   at transactions.spec.ts:899
```

**This is a NEW symptom the collector never saw, and it is the most informative one yet.** The
Playwright accessibility snapshot captured at failure shows the toolbar reading:

```
- region "Transactions table file drop target":
  - button "Add transaction"
  - text: 499 transactions
```

**A stable `499` where `500` is asserted, held for the full 15s window.** This is not a timeout on a
correct value. Three facts make it worth taking seriously:

- `totalCount` is `filteredTransactions.length` (`transactions/page.tsx:1314`) — **live derived
  state**, recomputed from the vault each render, with no cache to go stale.
- The grid counts **parent-only** logical transactions: `useActiveTransactions`
  (`src/lib/crdt/context.tsx:878-882`) → `getAllTransactions` → `getCanonicalTransactions`
  (`src/lib/crdt/queries.ts:169-182`), which de-duplicates by `id` and drops any row failing
  `isPublicTransaction`.
- `isPublicTransaction` (`src/lib/crdt/schema.ts:531`) excludes **GC maintenance shadows** — rows
  temporarily invisible while `src/lib/crdt/maintenance.ts` relocates them. A row transiting that
  machinery is, by construction, absent from the count until promotion completes
  (`maintenance.ts:1935-1938`).

**What I established (MEASURED):** the failure is real, reproducible under load, and presents as a
_wrong count_ rather than a slow one. **What I did NOT establish (and will not assert):** whether
that 499 is (a) a genuinely lost transaction, (b) a row parked in the GC-shadow state longer than
the window, or (c) a test that resumes asserting before the vault settles. Duplicate nesting is
**ruled out** — `detectDuplicates` runs only at import time (`src/lib/import/processor.ts:219,346`),
never after an edit, and the failure follows an edit. `pruneBuckets` is **ruled out** for this
symptom — it removes only _empty_ buckets (`src/lib/crdt/mutations.ts:305-329`).

**Classification: UNRESOLVED, and it must be treated as potentially product-side.** The dispatch is
right that Class 1 turning out test-side is no evidence about Class 2, and I have honoured that: I
did not absorb these into Class 1, and I am not calling them benign. They land on the
reveal-and-focus and virtualized-scroll paths and bear directly on the FINAL-AUDIT clause **"Large
imports/tables remain responsive and bounded,"** which I therefore cannot mark PASS.

I extend `Q-P21-06-05` to cover this third symptom (`transactions.spec.ts:899`, stable `499`), which
is distinct from both symptoms the collector recorded.

#### 5.2a Follow-up after the port was released — the discriminating experiment, run

Once the campaign released `:3000` I built the experiment this section recommended, in a **second
throwaway worktree** (`/tmp/mf-p21r06b`, pinned `--detach` at the audited HEAD) so that no product
or test file in the repository under review was ever modified — verified by
`git diff --stat HEAD -- tests/ src/` being empty throughout. The instrumented copy printed, at the
failure instant: the settled toolbar text, the DOM row count, whether a reload restores 500, and
whether the edited row is the missing one.

**MEASURED — it did not reproduce. 3 runs × 150 executions at the exact profile that produced it
(`--workers=4 --repeat-each=3 --retries=0`): 150 passed, 150 passed, 150 passed. Zero diagnostic
triggers in 450 executions.**

**An instrument failure of my own, reported rather than quietly corrected.** My first attempt ran
`--workers=4` on the spec file _without_ `--repeat-each`, i.e. 50 tests rather than 150. It passed
50/50. **Load is the suspected variable, so a 3× lighter run returning "no repro" answers a narrower
question than the one asked** — precisely the failure shape this audit keeps producing. I discarded
that result and re-ran at the original profile rather than reporting it.

**What the source analysis then established — MEASURED from code, and it revises my own earlier
inference.** I had offered the GC maintenance shadow as the most likely mechanism. **It is not, and
I withdraw that suggestion.** Reading the relocation path end to end:

- `createAttachedTransactionShadow` (`maintenance.ts:1578`) **inserts** the shadow at the target
  while the source row remains in place — the operation is additive.
- The source is deleted only _after_ promotion: `plannedShadow.set("id", transaction.id)` at `:1934`
  precedes `sourceList.delete(transactionIndex, 1)` at `:1939`.
- On the `"invalid"` branch (`:1923-1928`) the shadow is discarded and the source is **not**
  deleted.

So during a relocation window the row is transiently **duplicated**, never absent — and
`getCanonicalTransactions` de-duplicates by `id`. A GC window therefore yields **500, not 499**. It
cannot produce the observed symptom.

Also ruled out from source since: `updateTransaction` (`mutations.ts:507`) mutates in place and
cannot relocate a row, so the description edit is not a move; CRDT `doc.import` is a merge and is
additive; and `filters.search` is `undefined` once cleared, so `filterTransactions` applies no
predicate at all — consistent with the failing snapshot showing `499 transactions` **without** the
`(filtered)` suffix, which `hasActiveFilters` only omits when every filter is clear.

**Net position, stated plainly.** The 499 is a real, once-observed, load-dependent symptom that I
could not reproduce in 450 further executions, and every mechanism I could enumerate from source is
now eliminated. **I am not upgrading it to a data-loss finding on one observation, and I am not
downgrading it to benign because it did not recur.** It remains **UNRESOLVED**, and the honest
statement is that it is rarer than 1-in-450 at this profile rather than absent. The FINAL-AUDIT
clause "Large imports/tables remain responsive and bounded" still cannot be marked PASS on my
evidence.

**For whoever inherits it:** the instrumented reproduction is worth rebuilding only alongside a
longer campaign, and the three numbers to capture remain `getAllTransactions().length`, the raw
physical row count, and the count failing `isPublicTransaction`. Given the mechanism eliminations
above, the next hypothesis to test is the **`loro-mirror` state projection** rather than the CRDT
document — i.e. whether the mirrored snapshot the React tree reads can transiently lag the document
by one row under scheduler pressure.

---

## 6. Ruling 2 of 3 — fresh database bootstrap. **DISCHARGED, non-destructively.**

The collector marked this NOT VERIFIED; root declined to authorise `pnpm db:reset`. **I did not run
`pnpm db:reset` either, and I did not touch the shared database.** That restraint was correct — but
it was not the only way to test the clause.

The collector's bare-`CREATE DATABASE` probe failed because it lacked the platform objects Supabase
provisions _before_ user migrations. **That diagnosis was right but incomplete:** it identified
`extensions` and `realtime`, and stopped there. Provisioning **all** of them makes the probe work.

**MEASURED — I created a throwaway database in the same container, provisioned the full platform
preamble (schemas `extensions`, `realtime`, `auth`, `graphql`, `vault`; extensions `uuid-ossp` and
`pgcrypto`; roles `anon`, `authenticated`, `service_role`; `realtime.messages`, `realtime.topic()`
and the two baseline policies; and `PUBLICATION supabase_realtime`), then replayed every migration
in order with `ON_ERROR_STOP=1`:**

```
005_vault_ops.sql                       rc=0
006_rls_hardening.sql                   rc=0
007_realtime_authorization.sql          rc=0
008_realtime_authorization_lifecycle.sql rc=0
009_remove_unused_user_state.sql        rc=0
010_passkey_credentials.sql             rc=0
```

**All six apply cleanly to a genuinely empty database, in order.** And the result is not merely
error-free — it is _correct_:

```
$ diff live.schema fresh.schema
(identical)

11 tables, each with matching rls / force / policy counts:
passkey_challenges|rls=true|force=true|pol=1     ...  vaults|rls=true|force=false|pol=1

public function count:  live 20   fresh 20
```

**MEASURED — the fresh database is deny-by-default from a clean bootstrap**, not merely inheriting
the live database's accumulated state:

```
anon           all 7 tested tables        DENIED (grant layer)
authenticated  vaults/snapshots/memberships/invites/passkey_credentials/user_data  DENIED
authenticated  vault_ops                  ALLOWED rows=0   (RLS-filtered, no valid grant claims)
```

**Cleanup MEASURED:** throwaway database dropped, temp files removed, no `p21r06%` database remains,
and the live database is untouched (`vaults` count unchanged and still growing under other agents'
activity).

**RULING: the fresh-bootstrap clause PASSES on measurement, not on proxy.** `Q-P21-06-04` can be
closed on the migration-replay question. The narrow residue — that a full `supabase db reset`
additionally exercises the CLI's own seeding and container wiring — is not something the frozen text
requires and is not worth destroying 30k+ shared vaults to observe.

**The upgrade-path half is INFERRED, not measured.** `src/lib/sync/persistence.ts:116` implements an
IndexedDB `upgrade(db)` handler and `:139` documents multi-tab handling; the E2E suite exercises
real IndexedDB via `sync-persistence.spec.ts`, `tab-duplication.spec.ts` and
`realtime-recovery.spec.ts`, all of which passed in every run of my campaign. I did not construct an
old-version IndexedDB database and upgrade it. I mark that sub-clause **PASS\*** and say so plainly
rather than letting the bootstrap result cover it.

---

## 7. Ruling 3 of 3 — complete manual product journey. **DISCHARGED after the campaign released the port.**

**During the campaign this clause was NOT discharged**, because `playwright.config.ts` pins
`baseURL`/`webServer.url` to `:3000` with `reuseExistingServer: false`, so exactly one Playwright
process can run repo-wide and my five-run campaign held it throughout. Once the campaign finished I
took the port and ran the journey. **What follows is a human-driven pass in a disposable headless
Playwright CLI session against a real dev server, with an isolated new identity.**

**Environment:** dev server started from the throwaway worktree at the audited HEAD; session
`p21r06manual`; all artifacts deleted afterwards; only my own dev-server pid killed, resolved via
`readlink /proc/<pid>/cwd` — **the human's `:3001` was never touched**, verified before and after.

**MEASURED — the journey, step by step:**

| Matrix clause                          | What I did                                            | Result                                                                                                                           |
| -------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Marketing / landing                    | loaded `/`                                            | **PASS** — renders; copy matches §8's source audit                                                                               |
| New identity by recovery phrase        | `/new-user` → Generate → acknowledge → Create Account | **PASS** — 12-word phrase issued, vault created, landed on `/settings`                                                           |
| Loading-state correctness              | observed Generate button on first paint               | **PASS** — renders `[disabled]` until passkey capability resolves, then enables. Correct, not a defect                           |
| Acknowledgement gating                 | inspected Create Account before/after the checkbox    | **PASS** — `[disabled]` until the "I have saved my recovery phrase" checkbox is checked                                          |
| **UR-004** timezone-primary currency   | read Default Currency on `/settings`                  | **PASS** — **AUD / Australian Dollar**, correctly derived for an `Australia/Sydney` host                                         |
| **UR-006** members by name             | read the Members list                                 | **PASS** — **"Me(you)" + "owner"**. A name and a role, **no pubkey hash**                                                        |
| Import by **drop zone**, CSV           | dropped a 4-row synthetic CSV onto the drop target    | **PASS** — accepted, parsed as **"CSV • 5 rows"**                                                                                |
| **UR-008** column detection            | opened Columns tab                                    | **PASS** — **"All required fields mapped"** with no user action                                                                  |
| Import commit                          | clicked "Import 4 Transactions"                       | **PASS** — redirected to `/transactions`, **4 transactions**                                                                     |
| **UR-007** locale dates                | read the date cells                                   | **PASS** — `1/18`, `1/17`, `1/16`, `1/15` — day/month order, matching the AU locale                                              |
| Grid ordering                          | read row order                                        | **PASS** — date-descending, all four rows present                                                                                |
| People / settlement                    | loaded `/people`                                      | **PASS** — "No transactions have a Treat-as-Paid status yet, so there is nothing to settle"                                      |
| **UR-001** add-row focus and selection | clicked Add, read `document.activeElement`            | **PASS** — active element is the new row's `Transaction description` input, value `""`, inside a real row, **`selectedRows: 0`** |
| Undo / redo                            | Undo then Redo the add                                | **PASS** — 5 → **4** with Redo enabled → **5**. Clean round trip                                                                 |
| Refresh persistence                    | full page reload                                      | **PASS** — **5 transactions** survive; console shows snapshot loaded from IndexedDB then ops applied from server                 |
| **320px reflow**                       | resized to 320×720 on `/transactions`                 | **PASS** — `scrollWidth == innerWidth == 320`, **no horizontal overflow**                                                        |
| **200% zoom**                          | `document.documentElement.style.zoom = "2"`           | **PASS** — no horizontal overflow                                                                                                |
| Dark mode                              | added the `dark` class, read computed paint           | **PASS** — light text on dark surface; no unstyled or inverted region                                                            |
| **Console hygiene**                    | swept every console log of the whole session          | **PASS** — **zero** `[ERROR]` and **zero** `[WARNING]`. Only HMR/Fast-Refresh notices and SyncManager success logs               |
| **Network hygiene**                    | listed every request                                  | **PASS** — **no failed requests, no 4xx, no 5xx**                                                                                |
| **Secrets in URLs**                    | inspected every request URL                           | **PASS** — only `trpc` endpoints and static chunks. **No secret material in any URL**                                            |

**Secret safety during the journey.** The flow displayed a real 12-word recovery phrase on screen.
It is disposable test material for a throwaway vault, and **I did not record it in this artifact, in
any log, or in any message.** I used a **synthetic** 4-row CSV I generated myself and deleted
afterwards — **the principal's `~/Downloads/CSVData.csv` and `~/Downloads/OFXData.ofx` were never
opened, read, or referenced.**

**RULING: the clause is DISCHARGED for the areas above, and `Q-P21-06-06` can close on them.** I
found **no** UX, accessibility, or data defect in the manual pass — the two loading-state
observations both turned out to be correct behaviour once I checked rather than assumed.

**What I did NOT cover, stated rather than implied:** passkey create/unlock/revoke (needs a virtual
authenticator), the two-user invite/presence/realtime flow, automations drift and apply-all, alias
change-all, and multi-tab convergence. Those retain automated coverage that passed in every run of
my campaign, and I am **not** claiming a manual pass over them.

**The ordering lesson stands and is now proven in both directions:** run the manual matrix
**first**, before any campaign claims `:3000`. Doing it after only worked here because the campaign
had already finished; had it still been running, this clause would have failed a third consecutive
revision for purely procedural reasons.

---

## 8. Remaining FINAL-AUDIT clauses — what I re-derived

### Scope reconciliation and frozen values — MEASURED, all match

```
$ sha256sum specs/human-scratch.md
469e98c7c8ee842acfc08e0844a47b4bc6495111b0463d8ca14727d3949d2f6a
$ wc -l -c specs/human-scratch.md            ->  350 24260
$ grep -c '^- \[x\]' specs/human-scratch.md  ->  43
$ grep -c '^- \[ \]' specs/human-scratch.md  ->  0        (and '^- \[\]' -> 0)

$ sha256sum specs/008-.../spec.md
0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c
$ wc -l -c specs/008-.../spec.md             ->  715 25441
```

FS-001 matches the contract's required SHA-256, **715 lines** and **25,441 bytes** exactly.

**FS-001 was never edited — MEASURED, and stronger than a hash:**

```
$ git log --oneline --follow -- specs/008-transaction-percentage-allocations-settlement/spec.md
0ea864f Add durable implementation orchestration scaffold
```

**Exactly one commit in the file's entire history** — the commit that introduced it. There is no
commit in which it _could_ have been edited to record progress. **PASS by construction.**

**MEASURED — ledger state:** 34 requirement rows, all `passed`; `P21` is the only package row not
`passed` (`reviewing`).

### Security — MEASURED, live probes with a control

RLS is enabled on **all 11** public tables (`force=true` on 3). Live malicious probes:

```
anon           all 9 tables tested         DENIED at the GRANT layer
authenticated  8 of 9 tables               DENIED at the GRANT layer
authenticated  vault_ops                   ALLOWED rows=0  (RLS-filtered)
```

**Control against the "measurement that cannot fail" trap — MEASURED.** A zero proves nothing
against an empty table, so I confirmed the data exists (superuser bypasses RLS):

```
vaults=31872  vault_ops=121398  memberships=32811  snapshots=31152
```

The zeros are **genuine denial of 121,398 real rows**. Denied at the grant layer _before_ RLS is
reached — defence in depth. **PASS.**

**Plaintext absence — MEASURED, and I corrected the collector's figure by running its control.**
`vault_ops` carries no plaintext column (`encrypted_data` only; `vaults` holds just
`id/created_at/deleted_at`). A strict case-sensitive scan for financial vocabulary returns **4**,
all of them `Rent` — not the **0** the evidence reports. Printing the matches and running the
discriminating control resolves it:

```
Rent=4      Zqxj=4   Xrtq=4   Bxkz=5   Wjbn=2   Vghm=2   Kfpv=1      (of 121,561 rows)
```

**`Rent` at 4 is indistinguishable from meaningless capitalized 4-character controls in base64.**
`encrypted_data` decodes to opaque bytes. **Conclusion: zero plaintext leakage — PASS.** The
collector's conclusion is right; its stated figure is not. See §9.

**Secret safety — MEASURED, clean.**

```
$ git log --all --oneline -- '*CSVData*' '*OFXData*'   -> (empty, never committed)
$ git ls-files | grep -i env.local                     -> .env.local.example only
$ grep -rlniE "BEGIN .*PRIVATE KEY|SUPABASE_JWT_SECRET=[A-Za-z0-9+/]{20,}" evidence/ reviews/  -> (empty)
```

Twelve-word-pattern hits in the artifacts are ordinary English prose (I read them); the only long
base64-ish strings are the two published SHA-256 checksums. **No vault key, invite fragment secret,
seed phrase, recovery material, JWT secret value, presence key or vault plaintext appears in any
log, URL, fixture, evidence file or review — including this one. No real personal financial data was
read, copied or committed. PASS, and no leak to report to root.**

### Marketing claims — MEASURED, no false claim

The rev-05 blocker **M-1 is remediated** (`a823457`, "fix: soften HS-016 landing durability claim to
be truthful"); the copy now reads "Saves locally first" with no durability absolute. My absolutes
sweep across all landing copy matched **only CSS `clip-path` polygon coordinates** — zero prose
hits.

Because a keyword sweep answers a narrower question than the claim, **I read the copy directly** and
checked the strongest assertions against shipped code:

- _"The invite secret stays in the link fragment and never reaches the server"_ — **TRUE**:
  `InviteLinkGenerator.tsx:125` builds `` `${origin}/invite/${id}#${secret}` ``; the redemption page
  reads `window.location.hash.slice(1)` (`:90,166`). Fragments are not transmitted.
- _"Removing a member cuts off access to future changes; the vault key is not rotated, so anything
  they already downloaded stays readable to them"_ — **TRUE, and candid against its own interest.**
- The seven crypto claims (Ed25519, X25519, XSalsa20-Poly1305, HKDF-SHA256, BLAKE2b, WebAuthn PRF,
  CRDT) — **all 7 located in shipped `src/lib/crypto/**`.\*\*

**No false marketing claim. PASS.**

### FS-001 gates — MEASURED

**16 of 16 canonical gates exist and are separately named**, verified by counting both halves rather
than trusting either:

```
$ grep -cE '^\s+it\("Example [A-H]' tests/unit/domain/settlement.test.ts   -> 8
$ grep -c 'test("canonical example'  tests/e2e/people-settlement.spec.ts   -> 8
```

No example is merged into a general journey. The unit half passes; the E2E half is subject to the
Class 1 helper defect (§5.1) — the assertion times out, it does not compute a wrong value.

**Sole settlement engine — MEASURED.** `calculateSettlementBalances` is defined **only** at
`src/lib/domain/settlement.ts:1060` and imported by exactly one consumer (`BalanceSummary.tsx`) plus
the barrel. A grep for `settlementCache|cachedSettlement|settlement.*(localStorage|indexedDB)`
returns **nothing** — no persisted or plaintext cache.

**P16C complete-set API — MEASURED.** Exactly two entry points exist (`allocations.ts:274` per-key,
`:314` validated atomic complete set), and **every** mutation path routes through them —
grid/add-row, automation apply, automation engine, import commit, field rules, context/hydration,
barrel. No path bypasses them.

### Console, network and accessibility — MEASURED

Console cleanliness is **enforced by the suite, not merely inspected**:
`people-settlement.spec.ts:76-104` collects every `console` error, every `requestfailed` and every
`status >= 500`, then asserts `expect(consoleErrors).toEqual([])` and the equivalent for failed
requests, against one narrow documented transport-noise allowlist. **PASS.**

Accessibility coverage is genuine computed measurement, not screenshot comparison — I read the
implementation: `import.spec.ts:328-358` builds a canvas, reads back pixels, composites foreground
alpha over background, applies the sRGB linearisation
(`normalized <= 0.04045 ? /12.92 : ((n+0.055)/1.055)**2.4`) and asserts
`toBeGreaterThanOrEqual(4.5)`. 320px reflow, 200% zoom and dark/reduced-motion emulation are all
present and passing. **PASS.**

### Dependency and P03 gate — MEASURED

`pnpm audit --prod` exits **0**. `@tanstack/react-virtual` **3.14.6** pinned in `package.json:44`
and installed; the gated `useFlushSync: true` is in shipped product code at
`TransactionTable.tsx:465`. `next` **16.2.11** pinned and installed. **PASS.**

### Q-proposals — MEASURED, all surfaced

66 question entries, 24 decision entries, **31 flagged Yes** / 32 No for "does a human still need to
decide after completion" — the deferred set for final human review is explicitly enumerable. All
**16** carry-forward proposals named in my dispatch are surfaced in the spec tree:

```
Q-P20B-00 (17 files)  Q-P20B-13 (15)  Q-P20B-14 (10)  Q-P20A-02 (11)  Q-P20A-05 (12)
Q-P17D-02 (11)  Q-P20B-06 (10)  Q-P20B-08 (5)  Q-P21-04-01 (7)  Q-P21-05-01/02/03 (8/4/4)
Q-PROPOSAL-P32-01-01 (7)  Q-PROPOSAL-P30-07-01/02 (3/3)  Q-033 (12)
```

**Zero missing.** `Q-P20B-00` (`pruneBuckets` CRDT data loss) is surfaced and correctly carried as a
**tracked live risk, not a closed one** — `D-019` ruled the engine fix OUT-OF-GOAL via independent
adjudication at `f290246` while explicitly recording that the data-loss risk "remains a genuine,
tracked" issue routed to a future package. That is the right treatment and I confirm it is intact.

### Known-open items — NOT counted as new findings

Per the dispatch, and confirmed still open: the `InlineEditableTags` Escape handler bound to a
`CommandInput` that has lost focus; and the settlement rotation itself. I did not use any green
settlement result as evidence of stability.

---

## 9. Where my measurements disagree with what I was given

The dispatch instructed me to treat unmarked claims as inferred and to re-derive rather than relay.
Three figures did not reproduce. **None changes a verdict; all are recorded because a later reader
re-running these commands will see the discrepancy and should not have to re-derive the
explanation.**

| Claim                                              | Source              | My measurement                                                                   | Effect                                                                 |
| -------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Strict case-sensitive plaintext scan returns **0** | evidence §6.2       | **4**, all `Rent`; controls `Zqxj`=4, `Xrtq`=4, `Bxkz`=5 make it base-rate noise | Conclusion (zero leakage) **stands**; the figure as written is wrong   |
| Production build generates **17 routes**           | evidence §4         | **16** route lines in my build output                                            | Both exit 0; cosmetic                                                  |
| Live DB holds 30,587 vaults / 112,475 vault_ops    | dispatch + evidence | **31,872 / 121,398**, rising during my session                                   | Expected — other agents are writing. The _control_ (data exists) holds |

**On the collector's method.** It disclosed five of its own failed instruments rather than quietly
correcting them, including one that would have produced a false blocking "missing evidence" FAIL. I
verified the two most consequential disclosures independently — the `oxfmt` pre-existence at
`0ea864f` and the carry-forward proposal locations — and both hold. **That disclosure discipline is
the reason this review could be efficient, and it should be said plainly given the verdict is
FAIL.** The FAIL is not a judgement on the collection; the collector reported this same clause as
failing.

---

## 10. What I re-derived versus what I accepted

**RE-DERIVED (I ran the command; output above):** BASE/HEAD ancestry, range contents and empty
product diff; mid-review drift; all four frozen values and the FS-001 single-commit history;
typecheck; lint; build; `format:check` and its 27-file breakdown; the `0ea864f` pre-existence proof;
`pnpm audit --prod`; the full E2E suite ×5 with retries disabled; both grid failures in isolation
and under load, including a new symptom; the settlement helper's 9 bare assertions and absent
`expect.timeout`; `goToPeople` vs `goToAutomations`; the pre-hydration render branch; RLS on all 11
tables; live anon/authenticated probes with a non-empty control; the plaintext scan **and its
discriminating control**; the fresh-database migration replay and schema diff; secret-safety sweeps;
marketing copy and all 7 crypto claims; the 16 A–H gates counted on both halves; sole-engine and
no-cache greps; both P16C entry points and every call site; suite inventory, skip/sleep hygiene;
accessibility instrument implementation; console-health observer; P03 versions and `useFlushSync`;
question/decision counts and human-decision flags; all 16 carry-forward proposals; `D-019`.

**ALSO RE-DERIVED, deliberately deferred until the campaign released the CPU.** `pnpm test` is
**not** load-independent — `duplicates.test.ts:743-749` is a wall-clock **ratio** assertion the
collector itself tripped at 4.09 vs `< 4` while running beside its campaign. So I ran none of these
during mine, and all of them after. **MEASURED, on an idle machine:**

```
$ pnpm test
Test Files  129 passed (129)      Tests  2481 passed | 2 skipped (2483)      73.71s   exit 0

$ vitest run <the 7 security integration files>
Test Files  7 passed (7)          Tests  71 passed (71)                      72.19s   exit 0

$ P16B_BENCHMARK=1 vitest run settlement.test.ts -t "benchmark"
P16B benchmark node=v22.21.1 transactions=100000 scale10kMs=78.32 scale50kMs=393.95
elapsed100kMs=824.21,791.62,879.17,763.60,780.66
obligations=2 contributions=75000 issues=0 conservation=true

$ vitest run tests/integration/allocation-crdt.test.ts
P16C_BENCHMARK seed=0x16c2026 transactions=1000 allocationKeys=250 warmup=20 samples=100
oneKey: mean 0.0634ms  p50 0.0619ms  p95 0.0713ms  max 0.1063ms
completeReplacement: mean 0.389ms  p50 0.372ms  p95 0.507ms  max 0.960ms
```

- **Unit/property/integration — PASS.** 2,481 passed, reproducing the collector's count exactly. The
  2 skips are `it.runIf(process.env.P16A_BENCHMARK|P16B_BENCHMARK === "1")`
  (`allocation.test.ts:564`, `settlement.test.ts:2869`) — env-gated benchmarks, which I then ran.
  **Not unexplained skips.**
- **Security integration — PASS**, 71/71, corroborating the live database probes in §8.
- **Allocation edit sub-100ms — PASS**, one-key p95 **0.071ms**, max **0.106ms**: roughly **1,400×
  inside** the target.
- **Settlement near-linear + 100k — PASS via the spec's own disjunction.** 10k=78ms → 100k≈808ms is
  **10.3× wall for 10× input** — near-linear, and correctness at scale is exact (75,000
  contributions, **0 issues, conservation=true**). It does not meet ~200ms. FS-001 §14 is an
  explicit disjunction ("…**or** provide measured evidence and a documented optimization
  follow-up"), and `Q-033` records the follow-up with R-020 kept **open**. My range (0.76–0.88s)
  sits **below** the collector's (0.95–1.14s) — consistent, since mine ran on a fully idle machine.

**ACCEPTED WITHOUT INDEPENDENT RE-EXECUTION (declared, not hidden):**

- **Prior-revision history** (RB-P21-01..05 batch completion, P16A–E ordering, alias/automation
  package ordering by commit timestamp). I read the ledger and confirmed terminal state — 34/34 rows
  `passed`, no `changes_requested`, no `rollback_pending` — but did not re-walk each historical
  rollback chain commit by commit.
- **The IndexedDB upgrade path** — read, not executed (§6).
- **Parts of the manual matrix I did not reach** — passkey create/unlock/revoke, the two-user
  invite/presence/realtime flow, automations drift and apply-all, alias change-all, and multi-tab
  convergence. The rest of the matrix I performed by hand after the campaign released the port (§7);
  these five retain automated coverage only, and I do not claim a manual pass over them.

---

## 11. Findings

**F-1 — BLOCKING. Full E2E suite does not pass with retries disabled.** _Clause violated:_
FINAL-AUDIT "Full E2E suite passes with retries disabled" and "Changed critical journeys pass
repeated flake runs with retries disabled"; contract FAIL trigger "any failing check, unexplained
flake." _Measured reproduction:_ 5 runs, `--retries=0`, 4 workers, `env -u CI`, unchanged tree
digest. Runs 1/2/3/5 failed 2/4/1/1; run 4 was green. **8 failures across 6 distinct tests; 4 of 5
runs failed.** _Class 1, file:line:_ `tests/e2e/helpers/settlement.ts:394` and `:401` — bare
`toBeVisible()` on Playwright's 5s default, reached via `tests/e2e/helpers/nav.ts:43` which waits
only for the page heading. **Test-instrument defect. Owner P20B.**

**F-2 — BLOCKING, and UNRESOLVED as to owner.** Virtualized grid failures under parallel load.
_Clause violated:_ FINAL-AUDIT "Large imports/tables remain responsive and bounded." _Measured
reproduction:_ `transactions.spec.ts:726` failing at **`transactions.spec.ts:899`** with the toolbar
showing a **stable `499 transactions`** where 500 is asserted, held for the full 15s window and
captured in the accessibility snapshot. Green in isolation at both 1 and 4 workers, and — after the
port was released — **not reproduced in 450 further executions at the exact profile that produced
it** (§5.2a). _Why it cannot be dismissed:_ `totalCount` is live derived state
(`transactions/page.tsx:1314`), and with filters cleared it equals the vault's active transaction
count outright, so a stable 499 means a row genuinely absent from derived state. _Mechanisms ruled
out from source (§5.2a):_ duplicate nesting, `pruneBuckets`, `updateTransaction` relocation, CRDT
merge, and — reversing my own earlier inference — the **GC maintenance shadow**, whose relocation is
additive and would yield 500, not 499. **Product-vs-test ownership is NOT established. Not upgraded
to a data-loss finding on one observation; not downgraded to benign because it did not recur. Rarer
than 1-in-450 at this profile, not shown absent.**

**F-3 — NON-BLOCKING, process.** Evidence was committed (`597a9e7`) and materially amended
(`8e5383b`) during the independent review, contrary to `PROCESS.md:57-58`. The amendment was a
correct retraction, and I re-derived its restated conclusion on my own evidence (§1.3).

**F-4 — NON-BLOCKING, documentation.** Three figures in the evidence do not reproduce (§9). The
plaintext-scan one matters most: the conclusion is right, the stated `0` is not.

---

## 12. Routing recommendation

Per the contract, root preserves this failed review, moves P21 to `changes_requested`, and persists
the complete ordered rollback batch before downgrading anything.

- **F-1 → P20B.** Cross-cutting test-instrument defect; the contract routes cross-cutting style
  defects to P20B and `Q-P21-06-03` already names that owner. The fix is bounded: explicit timeouts
  on the 9 bare assertions (or an `expect.timeout` in `playwright.config.ts`), and a content wait in
  `goToPeople` mirroring `goToAutomations`.
- **F-2 → do NOT route yet, and do NOT route to P20B by analogy.** I ran the discriminating
  experiment (§5.2a) and it did not reproduce in 450 executions; every mechanism I could enumerate
  from source is now eliminated. **Carry it as an open, tracked risk against the responsiveness
  clause rather than assigning an owner on one observation.** The next hypothesis worth testing is
  the `loro-mirror` state projection lagging the CRDT document by one row under scheduler pressure —
  not the document itself. If it ever proves product-side on the allocation or settlement path, the
  contract routes it to P16A–E / P17A–D.
- **Clauses now discharged that need not be re-run:** fresh DB bootstrap (§6 — measured, not
  proxied) and the bulk of the manual product journey (§7 — performed by hand after the campaign
  released the port; five named areas remain uncovered).
- **Ordering instruction for rev 07:** run the manual matrix **first**, before any campaign claims
  `:3000`. This revision only got it done because the campaign had already finished.

**Port released.** `:3000` free; `:3001` never touched.

---

## 13. Verdict restated

# FAIL

Unconditional. The empty product diff is not approval; the security, FS-001, marketing, dependency
and accessibility clauses genuinely pass on my own measurements; the fresh-bootstrap clause is now
discharged by measurement rather than proxy; the manual product journey is discharged by hand for
every area I reached, with the five I did not reach named; and the E2E stability clause fails on
evidence I generated, with a second failure class whose ownership remains unresolved and which
touches a responsiveness clause directly.

**The verdict did not move as the investigation went on, and it was never contingent on the 499.**
It rests on one thing: **4 of 5 full-suite runs failed with retries disabled**, on a tree whose
digest never changed. Everything discharged after the fact — the bootstrap, the manual matrix, the
450-execution non-reproduction — narrowed the routing, not the outcome. Run 4's clean 195/195 is the
standing reminder of why a single green run must never be accepted as the counter-evidence.
