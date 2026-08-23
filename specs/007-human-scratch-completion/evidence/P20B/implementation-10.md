# P20B rev 09 — Component 1 of D-021: E2E harness durability before document teardown

**Implementer:** `p20b-implementer-09`. **BASE:** `21f5715d7b7e62a615608e488619d95054243bc9`
(re-derived with `git rev-parse HEAD`, not carried from the dispatch). **HEAD:**
`0a94be8839de2bc2db90781d2c75b408918d1755`, one commit, not amended.

Every claim below is tagged **MEASURED** or **INFERRED**. References to sections are to sections of
_this_ file unless they name another file explicitly.

---

## 1. What I changed and why that shape

The measured defect (`evidence/P21/diagnostic-Q-P20B-26.md`) is that a write confirmed in the DOM is
not yet in IndexedDB, and a full document teardown inside that window discards it. The harness
issues such teardowns at every `nav.ts` helper and at every `page.reload()`.

I took **shape (b)** of D-021's two legitimate shapes: **a durability barrier before every
deliberate teardown**, built on the `SyncManager.awaitLocalPersistence()` that already exists, made
reachable from the harness through a test seam. I did **not** take shape (a), the client-side
sidebar navigation; §6 states that choice and its reason, which is a coverage argument rather than a
preference.

**Three files carry the fix:**

- `src/lib/sync/local-persistence-seam.ts` (new, 67 lines) — publishes
  `window.__moneyflowLocalPersistence.awaitLocalPersistence()`, which delegates to the live
  `SyncManager`'s existing barrier and returns `"persisted"`, or `"no-active-vault"` when no manager
  is mounted. It reads the active manager on every call rather than capturing one, so a vault switch
  replaces the manager without stranding the seam. It schedules no work and alters none: it awaits
  work the app already had in flight.
- `src/components/providers/vault-provider.tsx` — installs the seam. **MEASURED** by reading the
  file at HEAD: the install effect is at `:92` and the effect that creates the `SyncManager` is at
  `:148`, so a live manager always implies a live seam. That ordering is what licenses the harness
  to treat an absent seam as "nothing could have queued a write" rather than as a race it lost.
- `tests/e2e/helpers/persistence.ts` (new, 68 lines) — `awaitVaultPersistence(page)` and
  `reloadPage(page)`. The barrier rejects when the queue it snapshotted drains while newer updates
  are outstanding, which a write landing mid-call produces routinely; the helper retries within a 15
  s budget and then throws with the underlying message, so a genuinely stuck queue still fails
  loudly.

**Applied at:** all ten `nav.ts` helpers (via one private `gotoAfterPersistence`), all 22 `reload()`
call sites across ten spec files, and the deep-link `page.goto` in `people-settlement.spec.ts`'s
`openSourceTransaction`.

**Not a suppression — condition 1 of D-021.** No assertion was deleted, weakened or given a longer
timeout. Frozen step 9's `page.reload()` survives: `people-settlement.spec.ts:346` still reloads,
now as `reloadPage(page)`, which is `awaitVaultPersistence()` followed by the same `page.reload()`.
All 22 reload sites still reload.

**Not a product-behaviour change — condition 2 of D-021.** No application code reads the seam; the
`SyncManager` is untouched; when a persistence attempt becomes durable, when the indicator changes,
and what `beforeunload` sees are all exactly as before. **INFERRED** from the diff and from the fact
that the seam's only statement is `await manager.awaitLocalPersistence()`, a method the provider
already calls at `:49` and `:237`. (D-021 and the dispatch cite `vault-provider.tsx:232` for the
second call; that was its line before this change, which inserts five lines above it. MEASURED at
HEAD: `:49` and `:237`.)

**Full file list of commit `0a94be8`** (17 files, +324 −40):
`src/lib/sync/local-persistence-seam.ts`, `src/lib/sync/index.ts`,
`src/components/providers/vault-provider.tsx`, `tests/unit/sync/local-persistence-seam.test.ts`,
`tests/e2e/helpers/persistence.ts`, `tests/e2e/helpers/nav.ts`, `tests/e2e/helpers/index.ts`, and
the reload sweep in
`tests/e2e/{description-aliases,identity,import,onboarding-vault,people-settlement,presence,sync-persistence,transactions,undo-redo,vault-settings}.spec.ts`.

---

## 2. The measurement, in both directions

I reused the preserved probe rather than building an instrument:
`evidence/P21/diagnostic-Q-P20B-26-probe.spec.ts.artifact`, byte-for-byte, with its config.

- **Arm C** — `setAllocation(Bob)` then a raw `page.reload()`. **It goes through no harness helper,
  so my change cannot touch it.** It is the control.
- **Arm D** — the captured journey: `setAllocation(Bob)` → `goToTransactions()` → `reload()`. This
  is the arm that exercises `nav.ts`.
- **Arm C2** — added for the post-fix campaign only: arm C with `reloadPage(page)` in place of
  `page.reload()`, identical in every other line. It exercises the reload barrier.

Verdict oracle unchanged: the cell's `Explicit: 50%.` clause after the reload, cross-checked against
the IndexedDB op count the probe dumps at each checkpoint.

| Arm | Path through the harness                    | Pre-fix (BASE `21f5715`) | Post-fix (HEAD `0a94be8`) |
| --- | ------------------------------------------- | ------------------------ | ------------------------- |
| C   | raw `page.reload()` — **untouched control** | **11 / 70**              | **20 / 70**               |
| C2  | reload through `reloadPage()`               | not present              | **0 / 70**                |
| D   | `goToTransactions()` then reload            | **18 / 70**              | **0 / 70**                |

**MEASURED.** Pre-fix: `/tmp/p20b09-logs/campaign2-prefix-70.log`. Post-fix:
`/tmp/p20b09-logs/campaign3-postfix-70.log`. An earlier pre-fix campaign at 35 runs per arm on the
same tree agreed: C 6/35, D 5/35 (`/tmp/p20b09-logs/campaign1-prefix.log`). Pooled pre-fix over both
campaigns: C 17/105, D 23/105.

**Arm C still losing 20/70 on the fixed tree is the load-bearing number here.** It is what
distinguishes "the class is closed" from "the probe stopped being able to fail". The two zeros were
produced by the same probe binary, in the same campaign, on the same tree, in the same worker pool
as the 20 losses.

**The op-count discriminator held 350/350 across both campaigns, zero counterexamples.** Every run
verdicted as a loss reported 6 op rows after the teardown; every survival reported 7. MEASURED:

```
pre-fix  (140 runs):  111 KEPT opsAfterReload=7    29 LOST opsAfterReload=6
post-fix (210 runs):  190 KEPT opsAfterReload=7    20 LOST opsAfterReload=6
```

**On the zeros.** 0/70 is a bound, not a clearance — rule of three puts the 95% upper bound on each
fixed arm's true rate at 4.3%. What carries the conclusion is the contrast: under arm D's measured
pre-fix rate of 0.257, seeing 0 losses in 70 post-fix runs has probability 9.2 × 10⁻¹⁰; under arm
C's _same-tree, same-campaign_ rate of 0.286, arm C2's 0/70 has probability 5.9 × 10⁻¹¹.

**Smoke evidence that the control bites, before the campaign:** one run of each arm on the fixed
tree, `/tmp/p20b09-logs/smoke-postfix.log` — `C/VERDICT bobLost=true opsAfterReload=6` alongside
`C2/VERDICT bobLost=false opsAfterReload=7` and `D/VERDICT bobLost=false opsAfterReload=7`.

---

## 3. The suite: is the class closed or moved?

**`people-settlement.spec.ts`, `--retries=0`, 10 repeats: 190 / 190 passed.** MEASURED,
`/tmp/p20b09-logs/campaign4-people-settlement-10x.log`. 19 distinct tests × 10. The tree digest over
`src` + `tests/e2e/**/*.ts` was `e2cc5da363672638d744b26c37662929` in both the START and the END
line, so nothing drifted mid-campaign.

Because the change touches ten spec files and all ten navigation helpers, I also ran the **whole**
suite, three times, `--retries=0`, on the repo's own unmodified `playwright.config.ts`:

| Run | Result                      | Log                                                     |
| --- | --------------------------- | ------------------------------------------------------- |
| 1   | **195 / 195 passed** (4.6m) | `/tmp/p20b09-logs/campaign6-full-suite-3000-run1.log`   |
| 2   | **195 / 195 passed** (4.5m) | `/tmp/p20b09-logs/campaign7-full-suite-3000-runs23.log` |
| 3   | **195 / 195 passed** (4.6m) | `/tmp/p20b09-logs/campaign7-full-suite-3000-runs23.log` |

MEASURED. Same digest `e2cc5da363672638d744b26c37662929` on all six START/END lines.

### A failure I caused and then explained — do not skip this

My **first** full-suite attempt reported **15 failed / 180 passed**
(`/tmp/p20b09-logs/campaign5-full-suite-run1.log`). That run used a config of my own on port 3100.
All 15 failures were `net::ERR_CONNECTION_REFUSED at http://localhost:3000/...`. MEASURED cause:
`invite-redemption.spec.ts:22`, `presence.spec.ts:63` and their siblings create their own contexts
with `browser.newContext({ baseURL: "http://localhost:3000" })` — a hard-coded port that no config
override reaches. Exactly the multi-context tests failed and nothing else. Re-running the identical
tree on `:3000` with the repo's own config gave 195/195 three times over. The 15 failures are an
artifact of my port choice, not of the change; I am recording them because the log exists and a
reader who finds it should not have to guess.

---

## 4. Cheap gates, at HEAD `0a94be8`

- `pnpm typecheck` — **clean**, no output. MEASURED.
- `pnpm lint` — **0 errors, 1 warning**. The warning is the pre-existing
  `react-hooks/incompatible-library` on `TransactionTable.tsx:459` (TanStack Virtual), in a file I
  did not touch. MEASURED.
- `pnpm format:check` — 31 files reported, **all under `specs/**`**, none in `src/`or`tests/`.
  MEASURED: `pnpm format:check 2>&1 | grep -vE "^specs/"`lists no file. I did not run a
  bare`pnpm format`; I ran `pnpm exec oxfmt` against my own 17 files only.
- `pnpm build` — **succeeded**, all routes emitted. MEASURED (run before the commit, on identical
  file content).
- `pnpm test` — **6 runs at this HEAD: 4 green at 2487 passed / 2 skipped / 130 files, 2 with a
  single failure each.** MEASURED, and reported rather than smoothed over:
    - Run at 14:25 — `tests/integration/realtime-origin-controls.test.ts` › "reads only its own
      vault's ops even when the request claims a hostile origin": `Test timed out in 5000ms`. It is
      a real WebSocket round trip to the local Realtime stack. **MEASURED: that file imports nothing
      from `@/lib/sync` — it imports only `node:crypto`, `vitest` and `./helpers/realtime-stack`** —
      so there is no import path from it to any file in my commit. 0 failures in 5 isolated re-runs
      and 0 in the next full run.
    - Run at 14:32 — `tests/unit/import/duplicates.test.ts` › "scales linearly with input size
      (O(n+m) complexity)". A wall-clock ratio assertion; load average was 5.4–6.5 as three
      back-to-back E2E suites wound down. 0 failures in the two subsequent full runs.
    - Both are load-dependent timing flakes in files unrelated to this change, and they were
      different files on the two occasions. I am not claiming they are impossible; I am reporting
      what I measured. Logs: `/tmp/p20b09-logs/final-gates.log`, `/tmp/p20b09-logs/unit-rerun.log`.

---

## 5. The new unit test, and proof it can fail

`tests/unit/sync/local-persistence-seam.test.ts`, 6 tests. The harness treats an absent seam as "no
vault could have queued a write" and proceeds straight to the teardown, so a seam that silently
stopped delegating would restore the lost-write class without failing anything. These cover both
directions: install/teardown, delegation, re-reading the manager on each call, the distinct
`"no-active-vault"` outcome, rejection propagation, and that an older installer's teardown leaves a
newer seam alone.

**MEASURED that the suite bites.** I mutated the seam's single load-bearing line from
`await manager.awaitLocalPersistence()` to `void manager.awaitLocalPersistence()` — the exact defect
of a barrier that returns before the work is done — and re-ran: **2 of 6 tests failed** ("awaits the
live manager's local persistence" and "propagates a rejecting barrier"). Restoring the line returned
6/6 green. This was a scratch mutation in my own new file; it is not in any commit.

---

## 6. The shape I did not take, and why

D-021 permits shape (a) — navigating the way the user navigates, the real `next/link` sidebar click
measured at J1 0/70 — either instead of or alongside shape (b). I considered it and did not take it.
**This is an argument, not a measurement, and I flag it as INFERRED so root can overrule it.**

**One figure first, because it diverges from the ruling.** D-021 and the dispatch state that
`nav.ts` is `page.goto` at **137 call sites**. I re-derived it at BASE and get **217**: summing
`grep -roE "\b<helper>\(" tests/e2e --include='*.ts'` outside `helpers/nav.ts` gives
`goToTransactions` 83, `goToImportNew` 27, `goToPeople` 37, `goToTags` 20, `goToAccounts` 15,
`goToTxDescriptions` 10, `goToSettings` 9, `goToImports` 7, `goToAutomations` 6, `goToStatuses` 3.
MEASURED. I did not reconstruct how 137 was arrived at and I am not asserting the ruling is wrong —
only that a reader comparing the two numbers should know they were counted differently. Nothing in
this revision depends on which is right; both are "most of the suite".

Converting `nav.ts` to click the sidebar would change every one of its **217** call sites from a
full document load, which re-derives the destination from persisted state, into a client-side
transition that derives it from the document already in memory. No assertion would be deleted, but a
large number of them would begin checking something weaker than they check today — for instance
`people-settlement.spec.ts:518-521`, where allocations entered on a new row are verified on the
People page after a `goToPeople`, would stop crossing a document boundary at all. Given that
condition 1 exists precisely to stop this fix from weakening what the suite checks, I judged that
trade to be the wrong way round, and the barrier closes the class on both primitives anyway.

Two things follow that root should weigh:

- **MEASURED:** the harness still navigates by full teardown, so it still does not navigate the way
  a user does. The lost write is gone; the fidelity gap named in the dispatch is not.
- **INFERRED:** shape (a) could not have covered frozen step 9 regardless — a reload is a teardown
  by definition, and `people-settlement.spec.ts:632`'s reload directly follows a delete
  confirmation. Shape (b) is the only one of the two that reaches those sites.

---

## 7. Explicit non-claims

- **I make no claim of crash-safe durability, anywhere.** Component 2 is untouched. A crash, an OS
  kill or a force-quit inside the window after a write still loses it; that is D-021's OUT-OF-GOAL
  risk, recorded in `RISKS.md#R-LOSTWRITE-01`, and this change neither fixes nor partially fixes it.
  What it does is stop the _test harness_ from tearing the document down inside that window.
- **I did not touch the sync indicator.** No file under `src/app/(app)/` or the sync-status hooks is
  in the commit.
- **F-2 / `transactions.spec.ts:572` is untouched and unclaimed.** I did not investigate it.
- **One consequence root should note:** because the harness now waits for durability before its own
  teardowns, the suite can no longer surface this class by accident. The reproduction that can still
  surface it is arm C of the preserved probe, which loses 20/70 on the fixed tree (§2) — that is the
  live reproduction the risk record should carry.

---

## 8. Provenance

- **Worktree:** `/tmp/mf-p20b09`, created with `git worktree add --detach`, untracked `.env.local`
  copied in, `pnpm install --frozen-lockfile` (no `cp -a node_modules`). Detached at `21f5715` for
  the pre-fix campaign, moved to `0a94be8` for everything after. Remove with
  `git worktree remove /tmp/mf-p20b09 --force`.
- **The pre-fix tree is byte-identical to the tree the diagnostic measured.** MEASURED:
  `find src tests/e2e/helpers -type f | sort | xargs md5sum | awk '{print $1}' | md5sum` gives
  `e7662f03b51f3415fc5ec4b2e1eec062` at `21f5715`, the same value
  `evidence/P21/diagnostic-Q-P20B-26.md` §7 records at `10a290d`. Post-fix the same digest is
  `745d707342030773eee2746eeb7aba88`.
- **Every campaign log opens with a `START head=… digest=… probe=…` line and closes with a matching
  `END` line**, so each is identified by its own head rather than by a completeness marker. All
  START/END pairs match within their campaign.
- **Ports and flags:** `:3100` for the Q26 campaigns and the people-settlement campaign, `:3000` for
  the three canonical full-suite runs. Port `:3001` was never touched — it stayed bound to the
  human's dev server (pid 818182) throughout. Every run used `env -u CI`, `--retries=0`. No
  `--debug`, `--ui`, `--headed` or `show`. **No database command of any kind was run.**
- **Config deltas.** The Q26 config is the preserved
  `evidence/P21/diagnostic-Q-P20B-26-config.ts.artifact` unmodified. The people-settlement config
  differs from the repo's `playwright.config.ts` in exactly four lines: `testMatch`, `reporter`,
  `baseURL`/`url` port, and the dev-server command's port. The three canonical full-suite runs used
  the repo's `playwright.config.ts` with **no** modification (`--reporter=line` passed on the
  command line), with the untracked probe moved out of `tests/e2e/` first.
- **Artifacts, all outside the repo, under `/tmp/p20b09-logs/`:** `campaign1-prefix.log`,
  `campaign2-prefix-70.log`, `campaign3-postfix-70.log`, `campaign4-people-settlement-10x.log`,
  `campaign5-full-suite-run1.log` (the port-3100 run with the 15 artifactual failures),
  `campaign6-full-suite-3000-run1.log`, `campaign7-full-suite-3000-runs23.log`, `smoke-prefix.log`,
  `smoke-postfix.log`, `final-gates.log`, `unit-rerun.log`, the post-fix probe
  `zz-q26-idb.spec.ts.postfix-artifact`, its config `playwright.q26.config.ts.artifact`, and the
  generator `build-postfix-probe.py`.
- **Nothing was committed from the worktree.** The only commit is `0a94be8` on `main` in the main
  checkout, made by listing all 17 paths explicitly — never `git add -A`, never `git stash`, never
  `git checkout --` in the shared checkout. This evidence file is written and left uncommitted, per
  the dispatch.
