# P20B revision 09 — D-021 Component 1: a durability barrier before every E2E teardown — Independent Review

- **Reviewer:** `p20b-reviewer-09` — distinct from `p20b-implementer-09` and from
  `p20b-reviewer-01`, `-02`, `-03`, `-06`, `-07`, `-08`. I wrote none of this code and I am not the
  Q-P20B-26 diagnostician nor the P21 scope adjudicator.
- **Package / revision:** P20B, revision 09.
- **Evidence reviewed:** `evidence/P20B/implementation-10.md` — uncommitted on disk by design
  (`PROCESS.md:58`); the filename-one-ahead skew is known and is not an error.
- **Range:** BASE `21f5715d7b7e62a615608e488619d95054243bc9` → HEAD
  `0a94be8839de2bc2db90781d2c75b408918d1755`.
- **Date:** 2026-08-03.

**Reading convention.** Every claim is tagged **MEASURED** (I ran the command in this session, in
the message that quotes its output) or **INFERRED** (read from source or a log with no
discriminating execution of my own). Bare `§` references point at sections of **this** file; every
reference to another document names that document first. I re-derived every figure I was given
rather than relaying it, including the figures in the dispatch and in
`adjudications/P21-scope-02.md`. Log paths are named in every claim that rests on one; my own logs
are under `/tmp/p20b-rev09-review/`.

---

# VERDICT

# FAIL

**Three MEDIUM findings. The measurement is sound and I could not break it; the defect is in what
the fix ships and in what nothing tests.**

Everything the dispatch asked me to verify about the _measurement_ survives independent
re-derivation, to the digit — all five arm counts, the 350/350 discriminator, the campaign digests,
both conditions of D-021, and the counts of reload sites and nav call sites. I re-ran the whole
suite three more times and the frozen journey ninety-five more times, all green. Arm C, the control,
is byte-identical between the two campaigns, which is what makes the zeros mean something.

The three findings are:

- **F-1 (Medium).** The test seam is installed on `window` in **production builds for real users**,
  with no environment gate. MEASURED in the emitted bundle. `PROCESS.md:167-168` directs me to
  reject test-only hooks; D-021 authorises the _mechanism_ but is silent on shipping it ungated; the
  gate is provably free because the E2E harness runs against `pnpm run dev`.
- **F-2 (Medium).** Nothing detects the fix being deleted. Removing the single install line leaves
  typecheck, lint, format and 2486/2489 unit tests green, and the harness barrier degrades to a
  **silent no-op** — MEASURED by mutation, with losses returning on the arm that exercises the
  barrier.
- **F-3 (Medium).** A committed source comment and the commit subject both assert that **every**
  deliberate teardown is barriered. Fifty-two raw `page.goto` teardowns remain unbarriered, five of
  them with a vault mounted. The universal is false as written.

F-1 and F-2 are **coupled and must be fixed in the order given in §8.1** — gating first would _add_
a silent failure mode rather than remove one.

**Both of root's judgement questions are answered on the merits in §6 and §7.** My answer to the
second is that **Component 1 IS discharged by shape (b) alone** and P21 may reopen on it once these
findings are cleared; the residual "fidelity gap" is materially narrower than the dispatch states,
and I say why with a count root does not have.

---

## 0. Range, ancestry and tree integrity — MEASURED

`git merge-base --is-ancestor 0a94be8839de2bc2db90781d2c75b408918d1755 HEAD` → exit 0. HEAD is
`6366a16` (root's handback ledger commit). `0a94be8` is a genuine ancestor carrying one code commit,
not an orphan of an amend. The two intervening commits in BASE..HEAD are root's own control-artifact
commits `ac2a70f` and `e0de39e`; I read both and neither asserts anything the code contradicts.

`git show --stat 0a94be8`: **17 files, +324 −40**, exactly the list
`evidence/P20B/implementation-10.md` §1 gives. `src/lib/sync/manager.ts` is **not** among them.

Tree identity, MEASURED three ways:

| Digest command                                                                                                 | Value                              | Where else it appears                                                            |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------- |
| `find src tests/e2e/helpers -type f \| sort \| xargs md5sum \| awk '{print $1}' \| md5sum` at HEAD             | `745d707342030773eee2746eeb7aba88` | `evidence/P20B/implementation-10.md` §8                                          |
| the same at BASE, via the diagnostic's own value                                                               | `e7662f03b51f3415fc5ec4b2e1eec062` | `adjudications/P21-scope-02.md` §1 and `evidence/P21/diagnostic-Q-P20B-26.md` §7 |
| `find src tests/e2e -type f -name '*.ts' \| sort \| xargs md5sum \| awk '{print $1}' \| md5sum` in my worktree | `e2cc5da363672638d744b26c37662929` | every START/END line of the implementer's campaigns 4, 6 and 7                   |

The third is the important one: **my campaign ran on a byte-identical tree to the implementer's**,
so pooling green runs across the two is legitimate. I make no cross-campaign _rate_ comparison
anywhere in this review — `PROGRESS.md`'s 2026-08-03 entry is right that the between-campaign spread
on one fixed tree exceeds the effects people want to read out of it.

My worktree: `/tmp/mf-p20b-rev09`, `git worktree add --detach` at `0a94be8`, untracked `.env.local`
copied in, `pnpm install --frozen-lockfile` (no `cp -a node_modules`). I ran nothing heavy in the
shared checkout: MEASURED, `readlink /proc/818182/cwd` is `/home/ben-agents/Code/moneyflow`, so the
human's `:3001` dev server shares that directory's `.next` and a build or a second dev server there
would have disturbed it.

## 1. Verification gates — MEASURED

Run strictly serially in the shared checkout, one at a time, because
`tests/unit/import/duplicates.test.ts` asserts on a wall-clock ratio. Driver log
`/tmp/p20b-rev09-review/gates-driver.log`.

| Gate                | Result                                                                                                                                        | Log             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `pnpm typecheck`    | exit 0, no output                                                                                                                             | `typecheck.log` |
| `pnpm lint`         | exit 0 — **0 errors, 1 warning**, the pre-existing `react-hooks/incompatible-library` at `TransactionTable.tsx:459`, a file not in the commit | `lint.log`      |
| `pnpm format:check` | exit 1 — 31 files, **every one under `specs/**`**; zero non-`specs/` paths                                                                    | `format.log`    |
| `pnpm test` run 1   | 130 files, **2487 passed / 2 skipped**                                                                                                        | `unit1.log`     |
| `pnpm test` run 2   | 130 files, **2487 passed / 2 skipped**                                                                                                        | `unit2.log`     |
| `pnpm test` run 3   | **1 failed** / 2486 passed / 2 skipped                                                                                                        | `unit3.log`     |

The run-3 failure is `tests/integration/realtime-origin-controls.test.ts` › "reads only its own
vault's ops even when the request claims a hostile origin", `Test timed out in 5000ms` at
`realtime-origin-controls.test.ts:126`. This is the same test the implementer disclosed and I
reproduced it independently. MEASURED, and I checked this myself rather than accepting it: that file
imports only `node:crypto`, `vitest` and `./helpers/realtime-stack`, and `helpers/realtime-stack.ts`
imports nothing from `@/lib`. There is no import path from it to any file in this commit.

**I am not treating that failure as a finding, and I want the reason on the record rather than
implied.** It is not caused by the change and no reachable code connects them; the dispatch
pre-classified it as expected; and it is a real WebSocket round trip to the local Realtime stack.
But the tree is **not uniformly green**, `.claude/CLAUDE.md` says to fix test issues "even if you
didn't create them", and this is now the third agent to hit it. It belongs in the goal's flake
register, not in this package. I report counts only and make no rate claim.

`pnpm build` in my worktree: **exit 0**, all routes emitted (`build.log`). See §6 for what I found
in the output.

## 2. The measurement — every figure re-derived, none relayed

MEASURED, from the implementer's raw logs in `/tmp/p20b09-logs/`, counting `bobLost=true` over each
arm's `VERDICT` lines:

| Arm   | Path through the harness                    | Pre-fix (`campaign2-prefix-70.log`) | Post-fix (`campaign3-postfix-70.log`) |
| ----- | ------------------------------------------- | ----------------------------------- | ------------------------------------- |
| **C** | raw `page.reload()` — **untouched control** | **11 / 70**                         | **20 / 70**                           |
| C2    | reload through `reloadPage()`               | not present                         | **0 / 70**                            |
| D     | `goToTransactions()` then reload            | **18 / 70**                         | **0 / 70**                            |

Every cell reproduces the evidence table exactly. The earlier 35-run campaign also reproduces: C
6/35, D 5/35 (`campaign1-prefix.log`). START and END lines carry matching `head`, `digest` and
`probe` values within each campaign, so no tree or instrument drift occurred mid-run.

**The op-count discriminator holds 350/350 with zero counterexamples.** MEASURED over `campaign2` +
`campaign3` verdict lines:

```
pre-fix  (140 runs):  111 bobLost=false ops=7    29 bobLost=true ops=6
post-fix (210 runs):  190 bobLost=false ops=7    20 bobLost=true ops=6
```

Both sub-tables match the evidence to the unit. Every loss is an op row that was never created;
every survival has the row.

### 2.1 The control is genuinely a control — the check the dispatch asked for

The zeros are worth nothing if the instrument stopped being able to fail, and this goal has been
misled by exactly that twice. Two independent facts establish that it can:

1. **Arm C still loses 20/70 on the fixed tree**, in the same campaign, same worker pool, same probe
   binary as the two zeros.
2. **Arm C's source is byte-identical across the two campaigns.** MEASURED — I diffed the preserved
   pre-fix probe `evidence/P21/diagnostic-Q-P20B-26-probe.spec.ts.artifact`
   (`md5 4e209d3a7ecb873cea99ae9b97030033`) against the post-fix probe
   `/tmp/p20b09-logs/zz-q26-idb.spec.ts.postfix-artifact` (`md5 dc3c6abad2ee8dfa7502c1a7e2977eff`).
   The **entire** difference is one import line and the appended arm-C2 test. Arm C's and arm D's
   bodies are untouched.

This second check matters more than it may look. `evidence/P20B/implementation-10.md` §2 says it
reused the preserved probe "byte-for-byte" and then says arm C2 was added — two sentences that sit
awkwardly together, and the md5 values differ. The diff resolves it in the implementer's favour:
what was reused byte-for-byte is the part that carries the comparison. Worth stating plainly rather
than leaving a reader to wonder at two different hashes.

### 2.2 The bound is not over-claimed — with one wording note

`evidence/P20B/implementation-10.md` §2 records 0/70 as a **bound, not a clearance**, with a 95%
rule-of-three upper bound of **4.3%** per fixed arm. I checked every other section for drift beyond
that and found no figure claiming more. §3, §5 and §7 of that file are all correctly bounded, and
§7's explicit non-claim of crash safety is exactly right.

One sentence is looser than the rest and I record it as a **flag**, not a finding: that file's §6
says, under a **MEASURED** tag, "The lost write is gone." Read against its own §2 that is shorthand
for "0/70, ≤4.3%", and §2 is two pages earlier. But this evidence file becomes the durable record
and that sentence is the one most likely to be quoted alone. Root should tighten it to the bounded
form before persisting it. No figure moves and no conclusion changes.

## 3. Condition 1 — not a suppression — MEASURED

I checked this two ways, because reading a diff can miss a weakening that a count catches.

**Line by line.** I read the full diff of all ten spec files. Every change is one of exactly two
shapes: an added import, or `page.reload()` → `reloadPage(page)`. No assertion is deleted, no
matcher is loosened, no locator is broadened, no timeout is touched.

**Mechanically, over the whole of `tests/e2e` at both ends of the range:**

| Metric                  | BASE `21f5715` | HEAD `0a94be8` |
| ----------------------- | -------------- | -------------- |
| `expect(`               | 1408           | 1408           |
| `toHaveCount(`          | 180            | 180            |
| `timeout: <n>` literals | 220            | 220            |
| `test.setTimeout(`      | 39             | 39             |

and `git diff 21f5715 0a94be8 -- tests/e2e | grep -E "^[-+].*(timeout|setTimeout)"` returns
**nothing at all**. No assertion was added or removed; no timeout budget moved in either direction.

**Frozen step 9 survives.** MEASURED at HEAD: `people-settlement.spec.ts:345-346`, test step **"9.
reload and verify allocations and settlement persist"**, is `await reloadPage(page)` — which is
`awaitVaultPersistence()` followed by the same `page.reload()`. The assertion rev 08 hardened is
intact at `:350-352`: `reloaded.getByRole("button", { name: "Edit Bob allocation" })` must
`toContainText("Explicit: 50%.")`. I record the step name beside the line number per the campaign
line-drift discipline.

**Twenty-two reload sites across ten spec files**, re-derived: `undo-redo` (`:178`, `:320`),
`identity` (`:191`), `sync-persistence` (`:60`), `description-aliases` (`:307`, `:460`, `:548`,
`:576`, `:577`), `onboarding-vault` (`:257`), `vault-settings` (`:125`, `:284`), `presence`
(`:201`), `import` (`:843`), `people-settlement` (`:346`, `:632`), `transactions` (`:269`, `:352`,
`:564`, `:654`, `:707`, `:912`). MEASURED: the only remaining `.reload(` anywhere in `tests/e2e` is
the one inside `helpers/persistence.ts:67` that `reloadPage` itself calls.

Condition 1 is satisfied.

## 4. Condition 2 — no allocation product-behaviour change, so no ownership flip — MEASURED

- `src/lib/sync/manager.ts` is **not in the commit**. The barrier
  `SyncManager.awaitLocalPersistence()` (`manager.ts:367-377`) is unchanged: it awaits
  `localPersistenceWorkQueue`, rethrows a recorded failure, and throws if `pendingLocalUpdates` is
  non-empty.
- **No application code reads the seam.** MEASURED by grep across `src` and `tests`: the only
  consumers of `__moneyflowLocalPersistence` / `LOCAL_PERSISTENCE_SEAM_KEY` /
  `installLocalPersistenceSeam` are the seam module, its unit test, the E2E helper, and the one
  install site at `vault-provider.tsx:92`.
- Nothing under `src/app/(app)/` or the sync-status hooks is in the commit, so persistence timing,
  the indicator and `beforeunload` are untouched.
- The seam's only statement is `await manager.awaitLocalPersistence()`. It schedules no work.
- The effect ordering the harness depends on is real. MEASURED: the install effect is
  `vault-provider.tsx:92`; the effect that creates the manager is `:148` and calls
  `createSyncManager` at `:183`. React runs mount effects in declaration order, so a live manager
  always implies a live seam.
- The implementer's correction to the ruling is right: the provider's own barrier calls are at
  `vault-provider.tsx:49` and **`:237`** at HEAD, not `:232` — this change inserts five lines above
  the second.

**Allocation product behaviour does not change, so `PROCESS.md:128-129` does not flip ownership to
P16A–E.** That said, the honest statement is not "no product behaviour changes at all": production
pages now carry a new `window` property. That is F-1, and it is a P20B defect, not an ownership
question.

I also record what the barrier _does_ narrow, because it is the strongest thing that could be called
a suppression and it should be named rather than left for someone to discover. Before this change,
every `reload()` assertion incidentally tested "durable by the time the DOM committed". Now it tests
"durable after an explicit barrier". D-021 authorised precisely this — it required the risk record
to carry the reproduction _because_ "Component 1's fix removes the suite's ability to surface this
class" — and `RISKS.md#R-LOSTWRITE-01`'s addendum already records it with arm C as the live
reproduction at 20/70 on the fixed tree. That obligation is discharged; I checked the risk file.

**Not a hidden retry.** `awaitVaultPersistence` retries the barrier for up to 15 s at 50 ms
intervals. This is not the pattern `PROCESS.md:168` forbids: it retries a _barrier_ that rejects for
a benign, documented reason (a write landing mid-call drains the snapshot while newer updates are
outstanding), no test outcome depends on it succeeding, and a genuinely stuck queue still throws
with the underlying message. I considered failing it and concluded it is correct.

## 5. My own campaign — MEASURED

Full suite on the repo's **unmodified** `playwright.config.ts`, on `:3000`, `env -u CI`,
`--retries=0`, in `/tmp/mf-p20b-rev09`. Digest recorded before and after every run.

| Run               | Result                                                                                     | Log                                       |
| ----------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------- |
| 1                 | **195 / 195 passed** (4.6m)                                                                | `/tmp/p20b-rev09-review/e2e-run1.log`     |
| 2                 | **195 / 195 passed** (4.6m)                                                                | `/tmp/p20b-rev09-review/e2e-run2.log`     |
| 3                 | **195 / 195 passed** (4.6m)                                                                | `/tmp/p20b-rev09-review/e2e-run3.log`     |
| frozen journey ×5 | **95 / 95 passed** (2.8m) — `people-settlement.spec.ts --repeat-each=5`, 19 distinct tests | `/tmp/p20b-rev09-review/e2e-people5x.log` |

Zero Playwright failure markers (`^ +[0-9]+\) `) in any of the four logs. Digest
`e2cc5da363672638d744b26c37662929` in all eight START/END lines
(`/tmp/p20b-rev09-review/e2e-driver.log`); nothing drifted.

**Pooled with the implementer's three runs on the byte-identical tree, that is six retry-free
full-suite runs and 285 executions of the frozen journey's spec, all green.** One green run proves
little on this tree; six is the number the goal's own guidance asks for. This is a count of a binary
outcome across identical trees, not a rate comparison between campaigns.

I also reproduce the implementer's disclosed instrument failure rather than taking it on trust:
`/tmp/p20b09-logs/campaign5-full-suite-run1.log` shows **15 failed / 180 passed** with **15**
`ERR_CONNECTION_REFUSED` lines, and MEASURED at HEAD, `invite-redemption.spec.ts:22` and
`presence.spec.ts:63` create contexts with a hard-coded `baseURL: "http://localhost:3000"` that no
config override reaches, while `tab-duplication.spec.ts:88` hard-codes the URL outright. That log is
a port artifact, exactly as disclosed. Disclosing it was the right call and I would have found it
anyway.

`FS-001 :668` and `:705` — "Run changed E2E journeys repeatedly with retries disabled" / "Relevant
E2E journeys pass repeated runs with retries disabled" — are met on this tree.

## 6. Judgement question 1 — the seam ships to production ungated

**My answer: it must be gated. This is finding F-1.** I did not reach it by deferring to D-021 and I
did not reach it because "test hook in src" sounds wrong. Here is the whole of my reasoning,
including the case against me.

**What is actually exposed — and it is genuinely inert.** The seam takes no argument, returns
`"persisted"` or `"no-active-vault"`, and its only statement awaits a promise the application
already had in flight. It cannot mutate anything. It exposes no vault data, no key, no identity, no
ciphertext. Any script able to call it is already same-origin JavaScript, which by then has the DOM,
IndexedDB, `localStorage` and the decrypted Loro document in memory — so it hands an attacker no
capability they did not already have. A cross-origin page cannot read another origin's `window`. It
is not a fingerprinting surface for third parties. Calling it in a loop schedules no work.

**There is no security finding here and I will not dress one up.** Anyone reading this review should
not record a vulnerability that does not exist.

**Why it is still a defect.**

1. **It ships. MEASURED, not inferred.** `pnpm build` succeeds and `__moneyflowLocalPersistence` is
   present in the emitted client bundle `.next/static/chunks/2kti1-ybxn-5f.js`
   (`/tmp/p20b-rev09-review/build.log`). Real users' browsers get this property.
2. **`PROCESS.md:167-168` instructs me to reject test-only hooks.** This is one, in product code, in
   the production bundle. D-021 authorises "exposing the existing `awaitLocalPersistence()` to the
   harness through a **test seam**" — but it was answering an _ownership_ question (does the fix
   flip to P16A–E?), not reviewing a design. Its silence on gating is not authorisation.
3. **The gate is free, and I verified the thing that would have made it expensive.** MEASURED:
   `playwright.config.ts`'s `webServer.command` is `pnpm run dev`, and there are no
   `.github/workflows` in the repository. **The suite never runs against a production build**, so a
   non-production gate invalidates none of §2's measurements and costs nothing.
4. **The idiom is already in the file being edited.** MEASURED: `vault-provider.tsx:390` passes
   `debug={process.env.NODE_ENV === "development"}`.
5. **There is no precedent to inherit.** MEASURED: no `window.__*` test hook exists anywhere in
   `src/` at BASE. The `__moneyflow_gc_*` names are CRDT document keys, not window properties. This
   revision establishes the precedent, which is the moment to decide it.
6. **`.claude/CLAUDE.md`** — "Don't add features, configurability, or error handling beyond what's
   needed for the current task." Production users are beyond what the task needs. The same applies,
   more mildly, to re-exporting `installLocalPersistenceSeam` and `LOCAL_PERSISTENCE_SEAM_KEY` from
   the public `@/lib/sync` barrel.

**The strongest argument against me, and why it does not hold.** Gating on `NODE_ENV` creates a
dev/prod divergence: if anyone ever runs E2E against `next start`, the seam vanishes and — because
`awaitVaultPersistence` returns silently when the seam is absent — the entire barrier becomes a
no-op with nothing reporting it. That is a real objection, and it is why **F-2 must be fixed with or
before F-1** (§8.1). Once absence is loud, gating is safe in every direction; a prod-build E2E run
would fail visibly instead of silently reopening the class.

**Finally, a disclosure gap.** `evidence/P20B/implementation-10.md` does not mention production
exposure anywhere. Shipping a new `window` API to users is a decision that should have been stated
and defended, not left for a reviewer to find in a bundle.

## 7. Judgement question 2 — is Component 1 discharged by shape (b) alone?

**My answer: yes.** Shape (b) discharges Component 1, and P21 may reopen on it once F-1 to F-3 are
cleared. I reason it out rather than leaning on "and/or", because "and/or" alone would settle
nothing if the frozen text asked for navigation fidelity as such.

**1. Go to what the frozen text actually commits.** Component 1's two anchors are FS-001 `:668` and
`:705`, quoted verbatim in `adjudications/P21-scope-02.md` §3: "Run changed E2E journeys repeatedly
with retries disabled" and "Relevant E2E journeys pass repeated runs with retries disabled". Both
are **outcome** clauses about journeys passing. Neither commits a navigation primitive. The second
anchor is HS-021 `:159` via `tasks/HS-021-code-quality-sweep.md` and
`.claude/skills/e2e/SKILL.md:13`, which says "Fix flaky tests immediately, regardless of when
introduced" — again an outcome. **"E2E harness navigation/durability fidelity" is the adjudicator's
name for the defect class, not a frozen requirement.** A fix that delivers the outcome delivers the
requirement. §5 shows the outcome delivered.

**2. Shape (a) could not have discharged it alone, and the ruling says so implicitly.** Frozen step
9 is a reload; a reload is a teardown by definition. `people-settlement.spec.ts:632`'s reload
follows a delete confirmation directly. Shape (a) reaches none of the 22 reload sites. Shape (b)
reaches every teardown it is applied to. **Of the two permitted shapes, only (b) can cover the
frozen journey end to end** — which is a strong reason the ruling wrote "and/or" rather than "and".

**3. The implementer's refusal of shape (a) is sound, and it protects condition 1.** Converting the
nav helpers to sidebar clicks would turn 211 spec-level call sites from a full document load that
re-derives state from IndexedDB into a client-side transition that reads the in-memory document. No
assertion would be deleted, but a large number would begin checking something strictly weaker —
`people-settlement.spec.ts:518-521`, where allocations entered on a new row are verified on the
People page, would stop crossing a document boundary at all. Condition 1 exists to stop this fix
weakening what the suite checks. The trade is the wrong way round, and the implementer tagged the
argument INFERRED and invited an override, which is the right way to raise it.

**4. The residual "fidelity gap" is materially narrower than the dispatch states — this is my own
count and root does not have it.** MEASURED at HEAD: the suite performs **16 in-app client-side link
navigations across six spec files** — `import.spec.ts` (11: `:380`, `:649`, `:696`, `:962`, `:987`,
`:990`, `:1088`, `:1108`, `:1112`, `:1123`), `transactions.spec.ts` (`:2319`, `:2326`),
`people-settlement.spec.ts` (`:337`), `tags.spec.ts` (`:199`), `description-aliases.spec.ts`
(`:186`) and `vault-settings.spec.ts` (`:408-409`, the test "should access settings via sidebar
navigation", which exists for exactly this purpose). **One of them is frozen step 8 of the mandatory
journey itself**: `people-settlement.spec.ts:337`, test step "8. navigate back to that transaction",
clicks the real "View transaction" link.

So the accurate statement is not "the harness does not navigate the way a user does". It is: **the
ten `nav.ts` helpers navigate by full document load, while the client-side transition a real user
gets is separately exercised in six spec files, including inside the frozen mandatory journey.** The
gap is that the helpers are stronger than a user's path, not that the user's path is untested. A
suite that only ever full-loads would be a real coverage hole; this one is not that suite.

**5. What remains.** The gap that genuinely remains is that no _helper_ offers a client-side
navigation, so a test author who wants one must hand-roll it. That is a convenience and consistency
matter, it is pre-existing, it traces to no frozen line, and closing it by converting `nav.ts` would
breach condition 1. It belongs in the record as a tracked observation, not in another revision —
`Q-PROPOSAL-P20B-09-2`.

**Conclusion on Component 1: discharged.** Not "half delivered". The half that was not taken is the
half that could not have covered the frozen journey and would have weakened the suite.

## 8. Findings

### F-1 — MEDIUM — Pattern violation / production surface — the test seam ships to real users ungated

- **Where:** `src/lib/sync/local-persistence-seam.ts:45-67`, installed unconditionally at
  `src/components/providers/vault-provider.tsx:92`; re-exported from `src/lib/sync/index.ts:1-5`.
- **Finding:** `window.__moneyflowLocalPersistence` is installed on every `(app)` route in
  **production builds**. MEASURED: after `pnpm build` the key is present in
  `.next/static/chunks/2kti1-ybxn-5f.js`. `PROCESS.md:167-168` directs the reviewer to reject
  test-only hooks; D-021 authorises the mechanism but not shipping it to users; the repository has
  no prior `window.__*` hook in `src/`, so this sets the precedent. Full reasoning, including the
  security analysis that finds **no** vulnerability and the counter-argument, is in §6.
- **Reproduction:**
  `cd <worktree at 0a94be8> && pnpm build && grep -rl "__moneyflowLocalPersistence" .next/static`
- **Fix:** the seam must not be installed on `window` in production builds. Mechanism is the
  implementer's choice; two that work:
    - `process.env.NODE_ENV !== "production"` around the install — provably compatible, because
      MEASURED, `playwright.config.ts`'s `webServer.command` is `pnpm run dev` and no CI workflow
      runs E2E against a production build; or
    - an explicit flag such as `NEXT_PUBLIC_ENABLE_TEST_SEAM`, set in `playwright.config.ts`'s
      `webServer.env` — this one survives a future prod-build E2E run. Also consider dropping the
      two re-exports from the `@/lib/sync` barrel; nothing outside the seam's own test imports them
      by that path.
- **Ordering: fix F-2 first or in the same change.** See §8.1.

### F-2 — MEDIUM — Test gap — nothing detects the fix being deleted, and the barrier fails silently

- **Where:** `src/components/providers/vault-provider.tsx:92` (the only install site);
  `tests/e2e/helpers/persistence.ts:39-56` (the silent `no-seam` path).
- **Finding:** `awaitVaultPersistence` returns without asserting anything when the seam is absent —
  `if (outcome.kind !== "rejected") return;` treats `"no-seam"` as success. Nothing anywhere asserts
  that `VaultProvider` installs the seam: MEASURED by grep, the only consumers are the seam's own
  unit test (which calls `installLocalPersistenceSeam` directly) and the E2E helper. So an unrelated
  refactor of `vault-provider.tsx` that drops one line silently restores the measured lost-write
  class, with every gate green.
- **Reproduction — MEASURED by mutation, not by inspection.** In a throwaway worktree at `0a94be8` I
  removed only the `useEffect` at `:92` and its import specifier, then ran the gates:

    | Gate on the mutated tree            | Result                                                                                           | Log                                        |
    | ----------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------ |
    | `pnpm typecheck`                    | exit 0                                                                                           | `/tmp/p20b-rev09-review/mut-typecheck.log` |
    | `pnpm lint`                         | exit 0                                                                                           | `/tmp/p20b-rev09-review/mut-lint.log`      |
    | `pnpm exec oxfmt --check src tests` | exit 0                                                                                           | `/tmp/p20b-rev09-review/mut-format.log`    |
    | `pnpm test`                         | 2486 passed / 2 skipped; the **only** failure is the known `duplicates.test.ts` wall-clock flake | `/tmp/p20b-rev09-review/mut-unit.log`      |

    Then, on that same mutated tree, the preserved probe with its own config,
    `--repeat-each=12 --retries=0` (`/tmp/p20b-rev09-review/mut-armC2.log`):

    | Arm                              | Unmutated fixed tree | **Mutated tree** |
    | -------------------------------- | -------------------- | ---------------- |
    | C2 — goes through `reloadPage()` | 0 / 70               | **2 / 12 lost**  |
    | C — raw reload, control          | 20 / 70              | **5 / 12 lost**  |

    All 24 probe executions **passed**; `awaitVaultPersistence` raised nothing. The barrier became a
    no-op and said so to no one.

- **Fix:** make an absent seam loud where it cannot legitimately be absent. MEASURED and available
  as a clean invariant: `VaultProvider` mounts in `src/app/(app)/layout.tsx:98`, so on any `(app)`
  route the seam must exist once hydrated. Have `awaitVaultPersistence` distinguish "not an app
  route / pre-vault, proceed" from "app route, seam missing, fail". A single E2E assertion that the
  seam is present after a vault opens would also close it, and is cheaper.

### F-3 — MEDIUM — Requirements / accuracy — a committed universal that is false as written

- **Where:** `tests/e2e/helpers/persistence.ts:22-23`; also the commit subject of `0a94be8`.
- **Finding:** the module comment states "**Every** deliberate teardown in this harness therefore
  waits for the running vault to acknowledge its local writes first", and the commit subject reads
  "wait for durable local persistence before **every** E2E document teardown". MEASURED at HEAD:
  `tests/e2e/*.spec.ts` contains **53** raw `.goto(` calls, of which exactly one — the deep link at
  `people-settlement.spec.ts:791` — was put behind the barrier by this change (at `:790`). **52
  remain unbarriered**, and **five of those fire with a vault mounted in that same page** —
  `accounts.spec.ts:85` (`page.goto("/people")` straight after `createNewIdentity`),
  `vault-settings.spec.ts:421` (`page.goto("/dashboard")`, likewise), `realtime-security.spec.ts:67`
  (`member.goto("/transactions")`), `realtime-security.spec.ts:177` (`owner.goto("/tags")`), and
  `description-aliases.spec.ts:565` (`duplicate.goto("/transactions")`). MEASURED:
  `createNewIdentity` (`tests/e2e/helpers/auth.ts`) ends by waiting on a `localStorage` key, which
  is not a durability barrier. `evidence/P20B/implementation-10.md` §1 accurately scopes what was
  applied — ten helpers, 22 reloads, one deep link — but neither the comment nor the commit subject
  matches that scope.
- **Why it is Medium and not a nit:** this is the one comment a future contributor will read before
  adding a teardown. Told that coverage is universal, they will add a raw `page.goto` after a write,
  get an intermittent failure, and have no pointer to the cause. The whole point of this revision is
  that this class is invisible when it bites.
- **I am _not_ claiming those five sites currently lose writes.** They are structurally the same
  shape, but the only measured non-allocation analogue points the other way: arm F,
  "`createTransaction()` → `reload()` immediately", lost **0/28**, and
  `evidence/P21/diagnostic-Q-P20B-26.md` §4 says in terms "Does the class extend beyond allocations?
  Not demonstrated." Below my confidence bar to report as a defect; above it as a false universal.
- **Fix:** either barrier those five sites, or narrow the sentence to what is true — e.g. "every
  teardown that goes through these helpers". Whether to do the former is `Q-PROPOSAL-P20B-09-1`.

### 8.1 The order these must be fixed in

**F-2 first, then F-1** — or both in one change. Gating the seam while `awaitVaultPersistence` still
treats an absent seam as success would mean that any future run against a production build silently
loses the barrier and reopens the class with nothing failing. Fixing F-2 first makes the gate safe
in every direction. F-3 is independent and can land with either.

**On re-verification for the next revision:** a full re-run of the arm C / C2 / D campaign should
not be necessary if the gate is shown active under the E2E config. A smoke of arms C and C2 on the
gated tree, plus one retry-free full-suite run, would establish that the barrier still engages and
the control still bites.

## 9. Things I checked and am deliberately not reporting as findings

Recorded so nobody re-litigates them, and so it is clear they were examined rather than missed.

- **Component 2 / crash-safe durability.** Untouched, out-of-goal by D-021. The implementer claims
  no crash safety anywhere; `evidence/P20B/implementation-10.md` §7 states the non-claim explicitly
  and correctly. I found no sentence in the commit, the evidence or the code asserting crash safety.
- **The refuted `Saved`-over-a-non-durable-write premise.** I do not repeat it. 350/350 samples read
  `Saving...` while already durable, and `hasUnsavedChanges` is a 2 s poll
  (`src/app/(app)/layout.tsx:161`).
- **The 15-failure port-3100 log.** A disclosed instrument failure; reproduced in §5.
- **`format:check` under `specs/**`.** Pre-existing, `Q-P20B-25`.
- **F-2 / `transactions.spec.ts:572`.** Untouched, unowned, unclaimed. Not this package's.
- **The 15 s retry loop.** Considered against `PROCESS.md:168`'s bar on hidden retries and judged
  correct — see §4.
- **The `typeof window === "undefined"` guard** in an effect that can never run on the server. Dead
  defensive code against `.claude/CLAUDE.md`'s "beyond what's needed", but a single line and
  harmless. Not worth a revision.
- **StrictMode double-mount.** The install/teardown identity check (`local-persistence-seam.ts:63`)
  handles it, and the unit test covers the interleaved case.

## 10. The 137 / 217 / 211 discrepancy — resolved

The dispatch left this open. MEASURED, from a clean `git archive 21f5715 tests/e2e` into a temporary
directory, summing `grep -roE "\b<helper>\("` over the ten helpers:

| Collection scope                                                          | Total   |
| ------------------------------------------------------------------------- | ------- |
| `tests/e2e/**/*.spec.ts`                                                  | **211** |
| all `tests/e2e/**/*.ts` excluding `helpers/nav.ts` and `helpers/index.ts` | **217** |

Per helper, matching the implementer's ten numbers exactly: `goToTransactions` 83, `goToPeople` 37,
`goToImportNew` 27, `goToTags` 20, `goToAccounts` 15, `goToTxDescriptions` 10, `goToSettings` 9,
`goToImports` 7, `goToAutomations` 6, `goToStatuses` 3.

**Both figures are correct under their own definition** — they differ only by whether helper modules
that themselves call nav helpers are counted. **137 is reproduced by neither**, and nothing in D-021
or in this revision depends on it. Root should correct `adjudications/P21-scope-02.md` §1/§4/§7 and
`DECISIONS.md#D-021` to a figure with its scope stated, or drop the number.

## 11. Manual browser verification — PERFORMED, and it changed nothing in the verdict

Root authorised me to start my own dev server, so this clause is **complete**. Session `p20b09rev`,
unique and disposable, driven with the repository-installed `pnpm exec playwright-cli` — no MCP, no
`npx`, no ad-hoc script, no temporary spec or config, and no `--headed`/`--debug`/`--ui`/`show`.
Server: `pnpm dev -p 3000` from my own worktree `/tmp/mf-p20b-rev09` with its own `.next`,
`SUPABASE_JWT_SECRET` derived from the running Realtime container exactly as `playwright.config.ts`
derives it, so the app under my hands matched the app the suite runs against. Server log
`/tmp/p20b-rev09-review/devserver.log`.

**What the seam actually is, in a real browser — this replaces the reading in §6 with measurement.**
On `/settings` after vault creation:

```
{ present: true, keys: ["awaitLocalPersistence"], type: "function", arity: 0,
  outcome: "persisted", ms: 0 }
```

and probing the whole reachable surface: `Object.getOwnPropertyNames(seam)` is exactly
`["awaitLocalPersistence"]`, the function carries no own properties beyond `length`/`name`, the
prototype is plain `Object.prototype`, and `Object.values(seam)` is one function. **Nothing reaches
the `SyncManager`, the Loro document, or any key through it.** §6's conclusion — a real but inert
surface, no vulnerability — is now measured rather than argued.

**The `(app)`-route invariant F-2's fix depends on is real.** MEASURED in one session:

| Route                                                           | `window.__moneyflowLocalPersistence` |
| --------------------------------------------------------------- | ------------------------------------ |
| `/settings`, `/transactions` (after reload)                     | **present**                          |
| `/` (landing)                                                   | **absent**                           |
| `/unlock` (a second tab, which has no `sessionStorage` session) | **absent**                           |

So `awaitVaultPersistence` can distinguish "legitimately absent" from "should be here and is not" by
route. F-2's remedy is implementable, not merely proposable.

**The frozen journey's shape, by hand, with no probe spec.** Created an identity, added person Bob,
added a transaction, set Bob's allocation to 50 through the real grid cell — the cell read
`Explicit: 50%. Effective: 50%. Owner remainder: 50%.` — then called the barrier (`"persisted"`),
reloaded, and read the cell again: **`Explicit: 50%.` survived**, and the seam was re-installed
after the reload. This is the third independent agreement with §2, after the probe campaign and the
mutation probe.

**An unmeasured claim in the ruling is now measured, and it favours the ruling.**
`adjudications/P21-scope-02.md` §5 says, tagged INFERRED and explicitly "Not measured", that a
user-initiated teardown "should hit `beforeunload`, where `hasPendingWorkSync()` is true while
`pendingLocalUpdates` is non-empty, so that path raises the unsaved-changes dialog rather than
silently dropping the write". **I hit it.** Navigating to `/transactions` immediately after adding
Bob raised a `beforeunload` dialog and blocked the navigation until I accepted it. Later, reloading
_after_ the barrier returned `"persisted"` raised **no** dialog. That is the mechanism behaving
exactly as the adjudicator inferred, in both directions, and it strengthens
`RISKS.md#R-LOSTWRITE-01`: the user-initiated path is guarded; only an unaimed teardown loses. Root
should upgrade that INFERRED line to MEASURED with this citation.

It also explains a timeout I very nearly misread. Two `goto` calls failed with
`TimeoutError: Timeout 60000ms exceeded` while `curl` fetched the same route in **121 ms** and the
dev-server log showed `GET /transactions 200`. The cause was the modal, not the app. **A browser
probe failure is a claim about my harness before it is a claim about the product**, and had I
reported that timeout it would have impersonated a serious defect.

**Console and network — clean.** `console` reports **2 messages, 0 errors, 0 warnings**: a React
DevTools info notice and `[HMR] connected`, both dev-server artifacts. No request failed. One
`POST /api/trpc/realtime.revoke` appears without a status because it was fired during the page's own
unload as I navigated away and the navigation cancelled it; its `referer` is the page being left,
the commit touches no realtime code, and the dev-server log shows that call returning `200` on every
other occasion.

**Cleanup, verified by state rather than by exit code.** Session closed and `delete-data` run; no
browser process matching the session survives, checked while excluding my own shell from the match.
Dev server killed by pid after `readlink /proc/<pid>/cwd` confirmed both pids were mine
(`/tmp/mf-p20b-rev09`); `ss -ltn` then showed `:3000` released. **The human's `:3001` (pid 818182,
cwd `/home/ben-agents/Code/moneyflow`) was alive and untouched before and after.** My worktree's
digest is back to `745d707342030773eee2746eeb7aba88` with only the expected `next-env.d.ts` rewrite,
which `next dev` performs on every start and which I excluded from every digest.

**The one clause that remains vacuous rather than skipped.** Deterministic accessible
role/name/state snapshots, contrast, zoom/reflow, dark/reduced-motion and responsive sizes
(`PROCESS.md:172-176`): MEASURED, the commit changes no component that renders a control, no styling
and no markup, so there is no changed control to snapshot and no changed colour to measure. The
checkpoint qualifies these as _task-relevant_, and for this diff they are not. I did cover the two
that are — refresh/persistence and duplicate tabs — above.

Everything else in the checkpoint — the literal BASE..HEAD, acceptance mapping, `.claude` rules
audit, focused checks, retry-free repeats — is covered in §0 to §5.

**Nothing in the browser changed the verdict.** None of F-1, F-2 or F-3 was found here and all three
reproduce from the command line; the manual pass corroborated every one of them.

## 12. Question proposals

### Q-PROPOSAL-P20B-09-1 — should the five in-vault raw `page.goto` teardowns be barriered, or should raw teardowns be forbidden in specs?

- **Raised by/package/revision:** `p20b-reviewer-09`, P20B, revision 09.
- **Context and evidence:** MEASURED at HEAD, five raw `.goto(` calls fire with a vault mounted in
  the same page — `accounts.spec.ts:85`, `vault-settings.spec.ts:421`,
  `realtime-security.spec.ts:67` and `:177`, `description-aliases.spec.ts:565` — outside the barrier
  this revision installs. They are structurally the shape D-021's Component 1 names. But the only
  measured non-allocation analogue cuts against exposure: arm F lost 0/28 and
  `evidence/P21/diagnostic-Q-P20B-26.md` §4 states the class is not demonstrated beyond allocations.
  My six retry-free full-suite runs are green.
- **Why existing authority does not decide it:** FS-001 `:668`/`:705` commit an outcome, and the
  outcome is currently met, so the frozen text does not compel barriering sites that are not
  failing. HS-021 via `.claude/skills/e2e/SKILL.md:13` says to fix flaky tests, but these are not
  measured as flaky. D-021 names the class without enumerating sites.
- **Options considered:** (a) barrier all five; (b) leave them and narrow the false universal in
  `tests/e2e/helpers/persistence.ts:22-23` (F-3's lighter remedy); (c) add an ESLint rule forbidding
  raw `page.goto` / `page.reload` in `tests/e2e/*.spec.ts` so the barrier cannot be bypassed by
  accident; (d) measure them first with a probe arm before deciding.
- **Reversible default selected to continue:** (b) — narrow the sentence, which is required by F-3
  regardless and asserts nothing unmeasured. It leaves every other option open.
- **Decision-hierarchy basis:** 1 (frozen outcome clause is met) then 4 (smallest reversible
  change).
- **Impact and risk:** low either way. (c) is the durable answer and would have prevented this
  revision's own gap, but it touches lint configuration for every spec author and is larger than
  this package.
- **Reversal or migration path:** barriering a site later is a one-line change per site.
- **Human review still useful after completion:** yes — whether a lint rule is wanted is a
  repository convention call.

### Q-PROPOSAL-P20B-09-2 — should the harness gain a client-side navigation helper, given `nav.ts` is deliberately staying on full loads?

- **Raised by/package/revision:** `p20b-reviewer-09`, P20B, revision 09.
- **Context and evidence:** D-021 permitted shape (a), navigating as the user does, and it was not
  taken; the implementer's reason — that converting 211 call sites from a document load to an
  in-memory transition would weaken a large number of assertions — is sound and protects condition 1
  (§7). MEASURED, the fidelity gap is narrower than the dispatch states: the suite already performs
  16 in-app client-side link navigations across six spec files, one of them frozen step 8 of the
  mandatory journey (`people-settlement.spec.ts:337`). What is missing is only a _helper_, so an
  author wanting a client-side transition must hand-roll it.
- **Why existing authority does not decide it:** no frozen `sourceTextLine` commits a navigation
  primitive; `:668`/`:705` commit an outcome that is met. D-021's "and/or" makes shape (a) optional.
- **Options considered:** (a) add a `navigateViaSidebar(page, …)` helper beside `nav.ts` and leave
  every existing call site alone; (b) convert `nav.ts` [rejected — breaches condition 1]; (c) record
  the observation and do nothing.
- **Reversible default selected to continue:** (c) for this revision — the outcome clause is met and
  a new helper is scope this package was not given.
- **Decision-hierarchy basis:** 1 then 4.
- **Impact and risk:** low. (a) is additive and would let a future test assert on the transition
  path a user actually takes without weakening any existing assertion.
- **Reversal or migration path:** deleting an unused helper is free.
- **Human review still useful after completion:** yes.

## 13. What root must transcribe

1. **The verdict and the three findings**, with the ordering constraint in §8.1.
2. **The `137` correction** (§10): 211 in `*.spec.ts`, 217 across `tests/e2e/**/*.ts` excluding the
   two helper modules; both correct under their own scope; 137 reproduced by neither. This touches
   `adjudications/P21-scope-02.md` §1, §4 and §7 and `DECISIONS.md#D-021`.
3. **The wording flag in §2.2** — tighten `evidence/P20B/implementation-10.md` §6's "The lost write
   is gone" to the bounded form before persisting it.
4. **The `realtime-origin-controls.test.ts` flake** (§1) — three agents have now hit it; it belongs
   in the goal's flake register with an owner, not in P20B.
5. **Both question proposals** (§12).
6. **An INFERRED line in the ruling that is now MEASURED** (§11): `adjudications/P21-scope-02.md`
   §5's `beforeunload` claim, which it flagged "Not measured", is confirmed in both directions — the
   dialog fires on a teardown with work pending and does not fire after the barrier returns. It
   belongs in `RISKS.md#R-LOSTWRITE-01`, since it bounds the Component-2 exposure to unaimed
   teardowns.

## 14. Secret safety and hygiene

No vault master key, seed phrase, recovery material, `crypto_box` secret, `SUPABASE_JWT_SECRET`,
presence key, invite bearer secret or vault plaintext was read, printed or committed; none appears
in this file. **No database command of any kind was run** — no `db:reset`, no migration, nothing
destructive. The vault I created in §11 was made through the normal UI, as the suite does, and its
session data was deleted with the browser.

**Port `:3001` was never touched** — MEASURED before and after the manual session: pid 818182, cwd
`/home/ben-agents/Code/moneyflow`, alive throughout. My runs used `:3000` (full suite, then the
manual dev server) and `:3100` (the probe config), both from my own worktree. The two never
overlapped: the campaign released `:3000` before the manual server started, because
`reuseExistingServer: false` means Playwright stands up its own. The manual server was stopped by
pid after `readlink /proc/<pid>/cwd` confirmed both pids were mine — never a bare `pkill -f`, which
matches its own shell — and release was confirmed from `ss -ltn` state rather than from the kill's
exit code. Every run used `env -u CI` and `--retries=0`; no `--debug`, `--ui`, `--headed` or `show`.

The `SUPABASE_JWT_SECRET` for the manual server was derived from the running Realtime container by
the same routine `playwright.config.ts` uses, held only in a shell variable, and never printed —
only its byte length was. I did not click "Click to reveal" on the seed-phrase step: the recovery
phrase stayed masked for the whole session and no seed word was ever rendered or captured. The
`x-pubkey` and `x-signature` request headers I inspected are a public key and a per-request
signature, and I have not reproduced them here.

In the shared checkout I ran only read-only commands and the three serial gate runs. I never used
`git stash`, `git checkout --` or `git add`. **I committed nothing and wrote exactly one file: this
one.** All mutation was confined to my own throwaway worktree `/tmp/mf-p20b-rev09`, which I restored
to `0a94be8` afterwards — MEASURED, its digest is back to `745d707342030773eee2746eeb7aba88` with
only the known `next-env.d.ts` dev-start churn outstanding. It can be removed with
`git worktree remove /tmp/mf-p20b-rev09 --force`.
