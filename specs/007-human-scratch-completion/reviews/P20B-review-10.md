# P20B revision 10 — remediating F-1, F-2 and F-3 of `reviews/P20B-review-09.md` — Independent Review

- **Reviewer:** `p20b-reviewer-10` — distinct from `p20b-implementer-10` and from
  `p20b-reviewer-01`, `-02`, `-03`, `-06`, `-07`, `-08`, `-09`. I wrote none of this code.
- **Package / revision:** P20B, revision 10.
- **Evidence reviewed:** `evidence/P20B/implementation-11.md`, uncommitted on disk by design
  (`PROCESS.md:58`), md5 `96c2d57bf17613ac7015c651bda3f1cd` at the time I read it — after root's
  post-handback update of its §4.3 and §4.4, so I read the current text, not the superseded one.
- **Date:** 2026-08-03.

**Reading convention.** Every claim is tagged **MEASURED** (I ran the command in this session, in
the message that quotes its output) or **INFERRED** (read from source with no discriminating
execution of my own). A bare `§` points at a section of **this** file; every reference to another
document names that document first. I re-derived every figure I was given rather than relaying it,
including the figures in the dispatch and in both of root's corrections. My logs are under
`/tmp/p20b-rev10-review/`; my worktree is `/tmp/mf-p20b-rev10-review`, outside the repository.

---

# VERDICT

# FAIL

**Two MEDIUM findings. All three findings of `reviews/P20B-review-09.md` are genuinely remediated —
I reproduced each remediation independently, in both directions — and the remaining work is small.**

- **F-1 is fixed.** MEASURED on the same pipeline in three builds: gated → **0** files under
  `.next/static` match `__moneyflowLocalPersistence`; the gate line alone removed → **1**, the same
  chunk `reviews/P20B-review-09.md` §8 named; gate restored → **0**. The disclosed residual in a
  server source map is real, and its INFERRED half — that such a map is not served — is now
  **MEASURED and confirmed** (§2).
- **F-2 is fixed, at both levels.** MEASURED: deleting the install line turns the two new provider
  guards red and every barriered E2E spec red with a named error; restoring turns both green (§3).
- **F-3's committed text is fixed.** The false universal is gone, no assertion was deleted, weakened
  or given a longer timeout, and every one of the twelve barrier calls targets the correct `Page`
  object (§4).

The two findings are:

- **F10-1 (Medium).** The production gate this revision added is itself unguarded. MEASURED by
  mutation: deleting the gate line leaves typecheck, lint, format and the whole unit suite green
  while the seam returns to the production bundle. This is the defect F-2 named, applied to F-1's
  own fix. MEASURED that a guard is feasible (§8).
- **F10-2 (Medium).** The in-vault enumeration is incomplete, and
  `evidence/P20B/implementation-11.md` §4.2's claim to have applied the criterion "to every `.goto(`
  in the suite" is false. MEASURED by runtime instrumentation: **at least four further raw
  teardowns** tear down a document with a live vault mounted, unbarriered — one of them in a file
  this revision edited (§8).

**Answering root's two corrections directly.** Root's "eleven" is better than the "five" it
replaced, and root was right to withdraw the over-reach framing — the breadth is justified. But
**eleven is itself an under-count, by at least four**, and that is the fourth successive refinement
of this number after 44, 52/five and eleven. **Root's specific worry — a barrier awaiting the wrong
context's seam — is refuted, exhaustively rather than by sample (§4.2).** And **naively barriering
the sites I found would be wrong at some of them**, which I only know because I measured rather than
read (§4.4); that materially narrows the remedy F10-2 asks for.

---

## 0. Range, ancestry and tree integrity — MEASURED

`git merge-base --is-ancestor` returns exit 0 for all four rev-10 commits — `7bfa4da`, `26450db`,
`76f81b2`, `67ea7a2`. None is an orphan of an amend. I re-derived each hash rather than trusting the
dispatch, as instructed.

**HEAD moved twice while I worked, and it does not disturb anything.** HEAD was
`c021849565c0bfab0e7cbddc1436a3f6b2a56fdc` when I started and
`e122a7f67576000960f34118225d9ef21c1634e7` when I finished. MEASURED,
`git diff --stat c021849..HEAD` is **one file, `PROGRESS.md`, +126 lines** — root's two correction
commits `58fe016` and `e122a7f`. `git diff --name-only c021849..HEAD -- src tests` is **empty**, and
`67ea7a2` is still an ancestor.

**Tree identity, MEASURED and constant throughout:**

| Digest command                                                                                                                 | Value                              | Where else it appears                                        |
| ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | ------------------------------------------------------------ |
| `find src tests/e2e -type f \( -name '*.ts' -o -name '*.tsx' \) \| sort \| xargs md5sum \| awk '{print $1}' \| md5sum` at HEAD | `850ac6d239fc7b19240f6750fda01b63` | `evidence/P20B/implementation-11.md` §0, and root's messages |

Identical in the shared checkout and in my worktree, and identical after every mutation experiment
below was reverted. **My E2E campaign therefore ran on the same tree the implementer validated**, so
pooling green runs across the two is legitimate. I make **no cross-campaign rate comparison**
anywhere in this file.

My worktree: `git worktree add --detach /tmp/mf-p20b-rev10-review HEAD`, untracked `.env.local`
copied in, `pnpm install --frozen-lockfile` — **never `cp -a node_modules`**. Every build, dev
server, campaign and mutation ran there. In the shared checkout I ran only read-only commands.

## 1. Verification gates — MEASURED

Run strictly serially, one at a time, in my worktree. Nothing else was running during any unit run —
`tests/unit/import/duplicates.test.ts` asserts on a wall-clock ratio and will fail beside load.
Driver log `/tmp/p20b-rev10-review/gates-driver.log`.

| Gate                                | Result                                                                                                                                        | Log                   |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `pnpm typecheck`                    | exit 0, no output                                                                                                                             | `typecheck.log`       |
| `pnpm lint`                         | exit 0 — **0 errors, 1 warning**, the pre-existing `react-hooks/incompatible-library` at `TransactionTable.tsx:459`, a file not in the commit | `lint.log`            |
| `pnpm format:check` (bare)          | exit 1 — **32 files, every one under `specs/**`**; zero non-`specs/` paths                                                                    | `format-full.log`     |
| `pnpm exec oxfmt --check src tests` | exit 0                                                                                                                                        | `format-srctests.log` |
| `pnpm test` run 1                   | 132 files, **2489 passed / 1 failed / 2 skipped**                                                                                             | `unit1.log`           |
| `pnpm test` run 2                   | 132 files, **2489 passed / 1 failed / 2 skipped**                                                                                             | `unit2.log`           |
| `pnpm build`                        | exit 0 ×3, all routes emitted                                                                                                                 | see §2                |

The two unit failures are the two pre-classified pre-existing tests, one each:
`tests/unit/import/duplicates.test.ts` › "scales linearly with input size (O(n+m) complexity)" in
run 1, and `tests/integration/realtime-origin-controls.test.ts` › "reads only its own vault's ops
even when the request claims a hostile origin" (`Test timed out in 5000ms`) in run 2. **Neither is
this revision's**, root has directed that the revision not be failed for the latter, and I am not
doing so. I report counts only and make no rate claim.

**A consistency check the counts pass.** `reviews/P20B-review-09.md` §1 recorded 130 files and 2489
tests total; I measure **132 files and 2492 tests**. That is exactly +2 files and +3 tests — the two
new guard files and their three tests, and nothing else.

## 2. F-1 — the seam no longer reaches a production bundle — MEASURED, both directions

Reproduced independently, three builds on one pipeline in my worktree, `rm -rf .next` before each:

| Tree                                     | `grep -rl "__moneyflowLocalPersistence" .next/static` | Build log           |
| ---------------------------------------- | ----------------------------------------------------- | ------------------- |
| HEAD, gated                              | **0 files**                                           | `build-gated.log`   |
| HEAD with **only** the gate line removed | **1 file — `.next/static/chunks/2kti1-ybxn-5f.js`**   | `build-ungated.log` |
| gate restored, rebuilt                   | **0 files**                                           | `build-regated.log` |

All three exited 0. The middle row is the whole finding: the grep is a **discriminating**
instrument, it finds the property when the gate is absent, and it is the same chunk
`reviews/P20B-review-09.md` §8's F-1 named — so the gate is what removes the property, not a change
of bundler layout. The tree digest returned to `850ac6d2…` after the experiment.

### 2.1 The residual server source map — the INFERRED half is now MEASURED, and it holds

At HEAD the string still appears **once anywhere under `.next`**, in
`.next/server/chunks/ssr/src_app_(app)_layout_tsx_1yu5hom._.js.map`. I confirmed the implementer's
structural claims by parsing the map: the string is **not** in `names`, it appears in exactly one
`sourcesContent` entry (`../../../../src/lib/sync/local-persistence-seam.ts`), the emitted `.js`
beside it greps **0**, and `.next/static` contains **0** source maps. `next.config` sets no
`productionBrowserSourceMaps`.

**The deployment-topology claim was tagged INFERRED and root had not confirmed it. I confirmed it,
at the HTTP layer.** MEASURED: `pnpm start -p 3123` on the gated production build in my worktree,
then six candidate URLs for that map — under `/_next/static/chunks/ssr/`,
`/_next/server/chunks/ssr/`, `/_next/chunks/ssr/`, `/chunks/ssr/`, `/.next/server/chunks/ssr/`, and
one with a query string — all returned **404**. The control, a real asset at
`/_next/static/chunks/0cz1d0mv5g_q7.js`, returned **200, 112594 bytes**, so the instrument
discriminates. The server was killed by pid after `readlink /proc/594140/cwd` confirmed it was mine,
and `ss -ltn` confirmed `:3123` released.

**Conclusion: confirmed, not refuted.** No user's `window` carries the property, and the residual is
a build artifact that is not served. Port `:3123` was chosen so this never touched `:3000` or
`:3001`.

### 2.2 The barrel and the key

MEASURED: both re-exports are gone from `src/lib/sync/index.ts`, replaced by a comment saying why;
`LOCAL_PERSISTENCE_SEAM_KEY` is no longer exported; `vault-provider.tsx:31` imports the install
directly from the module. The only other reader, `tests/unit/sync/local-persistence-seam.test.ts`,
was rewritten from `window[LOCAL_PERSISTENCE_SEAM_KEY]` to `window.__moneyflowLocalPersistence` —
MEASURED from the diff, a pure mechanical substitution: **same assertions, same count, nothing
weakened.**

## 3. F-2 — nothing can delete the fix silently — MEASURED by mutation, at two levels

### 3.1 Unit level

In my worktree I deleted **only** the `useEffect` at `vault-provider.tsx:95` and its import
specifier at `:31` (mutated digest `459e07e4c34c7815eb2920b2b7991c52`, 0 references left), then ran
the gates:

| Gate on the mutated tree            | Result                                                                                                        | Log                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------- |
| `pnpm typecheck`                    | exit 0 — still blind                                                                                          | `mut-typecheck.log` |
| `pnpm lint`                         | exit 0                                                                                                        | `mut-lint.log`      |
| `pnpm exec oxfmt --check src tests` | exit 0                                                                                                        | `mut-format.log`    |
| `pnpm test`                         | **3 failed / 2487 passed / 2 skipped** — **both** new provider guards, plus the pre-existing realtime timeout | `mut-unit.log`      |

Restoring the two lines returned the digest to `850ac6d2…` and the guards to **2 files / 3 tests
passed** (`restored-guards.log`). Before this revision the same mutation failed nothing.

### 3.2 Harness level — the more important one

On the same mutated tree I ran one in-vault spec on the repo's own config:
`pnpm exec playwright test tests/e2e/accounts.spec.ts --retries=0` → **7 failed**
(`harness-mut.log`), each with:

```
Error: Vault never acknowledged its local writes within 15000ms: no durability seam on /settings,
which VaultProvider must install (src/components/providers/vault-provider.tsx,
src/lib/sync/local-persistence-seam.ts)
   at helpers/persistence.ts:96
```

Restored: **7 passed (9.4s)** (`harness-restored.log`), digest back to `850ac6d2…`. **The barrier is
no longer a silent no-op, and the error names the file that must be fixed.**

### 3.3 The route list is a real guard, not a restatement

`tests/unit/e2e-harness/vault-route-segments.test.ts` **reads `src/app/(app)/` from disk** with
`readdirSync` and compares the sorted directory names to `VAULT_ROUTE_SEGMENTS`. It does not restate
the constant. MEASURED independently of the test: `src/app/(app)/` contains exactly the ten
directories in the list, and `VaultProvider` (the sync one) has **exactly one mount site**,
`src/app/(app)/layout.tsx:98` — the only other `VaultProvider` in the tree is the unrelated Loro
context provider at `src/lib/crdt/context.tsx:192`. `/unlock`, `/new-user` and `/invite` live under
`(onboarding)`, which mounts nothing. The `assert appRoutes.length > 0` guard means an empty read
fails rather than passing vacuously.

## 4. F-3 — what is now true, what was not weakened, and what is still missing

### 4.1 The universal is gone

MEASURED at HEAD, `tests/e2e/helpers/persistence.ts:12-18` no longer claims universality; it states
that helpers barrier and that a raw `page.goto`/`page.reload` in a spec does not unless the spec
calls `awaitVaultPersistence` itself. MEASURED: `tests/e2e/*.spec.ts` contains **53** raw `.goto(`
calls and **0** raw `.reload(` calls; **12** of the 53 are immediately preceded by an explicit
`awaitVaultPersistence`, leaving **41** unbarriered.

### 4.2 Root's worry about multi-context sites — refuted exhaustively, not by sample

Root asked me to verify this across all eleven rather than accept its six-line sample. MEASURED, by
pairing every `awaitVaultPersistence` call in `tests/e2e/*.spec.ts` with the **next line**:

| Site                              | Barrier argument         | Immediately-following teardown                    |
| --------------------------------- | ------------------------ | ------------------------------------------------- |
| `accounts.spec.ts:87`             | `page`                   | `page.goto("/people")`                            |
| `description-aliases.spec.ts:568` | `duplicate`              | `duplicate.goto("/transactions")`                 |
| `invite-redemption.spec.ts:54`    | `member`                 | `member.goto(inviteUrl)`                          |
| `invite-redemption.spec.ts:112`   | `member`                 | `member.goto(inviteUrl)`                          |
| `passkey.spec.ts:76`              | `page`                   | `page.goto("/settings")`                          |
| `passkey.spec.ts:429`             | `page`                   | `page.goto("/settings")`                          |
| `people-settlement.spec.ts:790`   | `page`                   | `page.goto("/transactions?transaction=…")`        |
| `realtime-security.spec.ts:69`    | `member`                 | `member.goto("/transactions")`                    |
| `realtime-security.spec.ts:182`   | `owner`                  | `owner.goto("/tags")`                             |
| `tab-duplication.spec.ts:132`     | `onboardingDuplicate`    | `onboardingDuplicate.goto(".../transactions")`    |
| `tab-duplication.spec.ts:134`     | `authenticatedDuplicate` | `authenticatedDuplicate.goto(".../transactions")` |
| `vault-settings.spec.ts:423`      | `page`                   | `page.goto("/dashboard")`                         |

**At all twelve the barrier's argument is byte-identical to the receiver of the teardown it guards.
The ambient `page` is never used at a multi-context site.** The failure mode root warned about — a
barrier awaiting the wrong context's seam, which would still go green — **is not present anywhere.**

### 4.3 Nothing was weakened — D-021 condition 1 holds

MEASURED from the literal diff `46b2727..67ea7a2`:

- The **only** removed `expect(...)` lines in the whole diff are the six in
  `tests/unit/sync/local-persistence-seam.test.ts` that were mechanically rewritten (§2.2). No E2E
  assertion was deleted.
- **Zero** added lines under `tests/e2e/` contain `timeout`. No assertion was given a longer budget.
- `reloadPage` has **22** call sites across 10 spec files, unchanged.
- Frozen step 9 is intact: `people-settlement.spec.ts:346` is `await reloadPage(page);` inside
  `test.step("9. reload and verify allocations and settlement persist", …)`.

**D-021 condition 2 also holds.** The change touches three `src` files and nothing else: a gate line
and comments in `src/lib/sync/local-persistence-seam.ts`, two comment lines and an import path in
`src/components/providers/vault-provider.tsx`, and a barrel comment in `src/lib/sync/index.ts`. **No
allocation product behaviour is changed, so no ownership flip to P16A–E arises.** The one production
behaviour change is the removal of a harness-only `window` property that no application code reads —
MEASURED, the barrel no longer exports it and `vault-provider.tsx` is its only importer.

### 4.4 The classification, MEASURED rather than read — and it corrects me as well as root

Root asked whether each of the eleven is _genuinely_ a teardown of a document with a vault mounted,
noting that "in-vault on its face" is a reading and not a measurement. I measured it. In my worktree
only, I instrumented `awaitVaultPersistence` to append the caller's spec line, the page's pathname
and whether the seam was present, and added a **probe-only** call — which asserts nothing — before
each unbarriered site I suspected. I then ran the nine affected specs on the repo's own config: **66
passed**, `instrumented-run.log`, **137 barrier entries and 11 probe entries**, `barrier-probe.log`.
The tree was restored afterwards to `850ac6d2…`, verified clean.

**Result for the twelve barrier sites:** every one resolved on an `(app)` route. Three of the 137
entries observed the seam **absent at entry** — `passkey.spec.ts:429`,
`people-settlement.spec.ts:150` and `:633` — and succeeded anyway, because the helper retries. That
is worth recording: **the retry-on-absence branch is load-bearing, not defensive padding**, and it
is what keeps the new throw from firing on a document that simply has not hydrated yet.

**Result for the sites I suspected — this is where measurement corrected my own reading:**

| Unbarriered raw teardown | Path at teardown | Seam                    | `awaitLocalPersistence()`                           | In-vault?                  |
| ------------------------ | ---------------- | ----------------------- | --------------------------------------------------- | -------------------------- |
| `identity.spec.ts:173`   | `/settings`      | present                 | **`persisted`**                                     | **yes**                    |
| `passkey.spec.ts:177`    | `/transactions`  | present                 | **`persisted`**                                     | **yes**                    |
| `passkey.spec.ts:232`    | `/settings`      | present                 | **`persisted`**                                     | **yes**                    |
| `passkey.spec.ts:60`     | `/settings`      | mixed over 4 call paths | **`persisted` ×2**, `no-active-vault` ×1, absent ×1 | **yes, on 2 of 4 paths**   |
| `passkey.spec.ts:406`    | `/settings`      | present                 | `no-active-vault`                                   | no — provider up, no vault |
| `passkey.spec.ts:468`    | `/settings`      | present                 | `no-active-vault`                                   | no — provider up, no vault |
| `identity.spec.ts:339`   | `/settings`      | **absent**              | —                                                   | not established            |
| `identity.spec.ts:614`   | `/settings`      | **absent**              | —                                                   | not established            |

`persisted` proves a **live `SyncManager` was mounted** at the teardown; it does not prove a write
was outstanding, and I claim only the former. The three absent-seam readings are a single sample
taken right after a `waitForURL`, so they are indistinguishable from the pre-hydration transient the
retry branch exists for — I do not read them as "no provider", and I do not count them.

**Two consequences, and the second one matters more than the first.**

1. **At least four unbarriered raw teardowns meet the implementer's own criterion**, so
   `evidence/P20B/implementation-11.md` §4.2's "I applied the reviewer's criterion … to every
   `.goto(` in the suite" is false. Its own §7 concedes the opposite — "the residual class at raw
   teardowns nobody has enumerated as in-vault" is listed as **Open** — and §7 is the accurate one.
   Three of the four sit in `passkey.spec.ts`, a file this revision edited: it barriered `:76` and
   `:429` while leaving `:60`, `:177` and `:232` of the same shape untouched.
2. **Barriering all of them would be wrong**, and I would have recommended it had I not measured.
   `:406` and `:468` have no active vault, and at `:339`/`:614` the seam was absent at the sampling
   instant; adding a barrier where the seam can be genuinely absent on an `(app)` route is exactly
   the 15-second hang the implementer said would have changed its mind. **The remedy F10-2 asks for
   is therefore the small one — make the record true — not eleven more barrier calls.**

## 5. My own E2E campaign — MEASURED

Repo's **unmodified** `playwright.config.ts`, on `:3000`, `env -u CI`, `--retries=0`, no
`--debug`/`--ui`/`--headed`/`show`. Digest recorded at the start and end of every run; **all six
START/END lines carry `850ac6d239fc7b19240f6750fda01b63`**, so nothing drifted mid-campaign.

| Run | Result                | Playwright failure markers (`^ +[0-9]+\) `) | Log            |
| --- | --------------------- | ------------------------------------------- | -------------- |
| 1   | 194 passed / 1 failed | **1**                                       | `e2e-run1.log` |
| 2   | **195 / 195 passed**  | **0**                                       | `e2e-run2.log` |
| 3   | **195 / 195 passed**  | **0**                                       | `e2e-run3.log` |

I counted Playwright's own markers rather than grepping for the word "failed", which matches
WebServer noise and test names.

**The single failure is not a durability failure, and the discriminator is inside the same test.**
`transactions.spec.ts:573` › "clear an excluding filter and focus the canonical row", at `:669`:
`toHaveAttribute("data-index", …)` expected `"51"`, received `"50"`. It is downstream of a
`reloadPage(page)` at `:654`, which is why I looked hard at it. But the assertion **immediately
after that reload** — `await expect(toolbar).toContainText("52 transactions")` at `:655` —
**passed**, and the row itself resolved. **The count is intact, so nothing was lost;** the row
rendered at a different virtual index. `reviews/P20B-review-09.md` §9 already records this test as
untouched, unowned and not this package's, and I agree — but the tree is not uniformly green and it
belongs in the goal's flake register with an owner.

**Three green runs are a count, not a clearance.** The 10-green bar is untouched by this campaign,
and I make no rate claim from three runs; `PROGRESS.md`'s own guidance on between-campaign spread
applies.

## 6. Manual browser verification — PERFORMED

Root's dispatch pre-authorised this and I completed it. Session `p20b10rev`, unique and disposable,
driven with the repository-installed `pnpm exec playwright-cli` — no MCP, no `npx`, no ad-hoc
script, no temporary spec or config, no headed mode. Server: `pnpm dev -p 3000` from my own worktree
with its own `.next`, `SUPABASE_JWT_SECRET` derived from the running Realtime container by the same
routine `playwright.config.ts:5-47` uses, held only in a shell variable and never printed.
**Ordering respected:** the campaign finished and `ss -ltn` showed `:3000` released before the dev
server started; the two never overlapped. Server log `/tmp/p20b-rev10-review/devserver.log`.

**The route invariant, measured in my own hands:**

| Route                            | `window.__moneyflowLocalPersistence` | `awaitLocalPersistence()` |
| -------------------------------- | ------------------------------------ | ------------------------- |
| `/` (landing)                    | **absent**                           | —                         |
| `/unlock` (session cleared)      | **absent**                           | —                         |
| `/settings` after vault creation | **present**                          | `"persisted"`, 0 ms       |
| `/transactions` after navigation | **present**                          | `"persisted"`             |

`Object.getOwnPropertyNames(seam)` is exactly `["awaitLocalPersistence"]`, corroborating
`reviews/P20B-review-09.md` §11's finding that the surface reaches no key, document or manager. **I
record no CVE-shaped finding; there is no vulnerability here.**

**The measurement that anchors §4.4.** On `/settings` after vault creation I ran
`sessionStorage.clear()` and re-probed: `sessionKeys: 0`, **seam still present, outcome
`"persisted"`**. Clearing the session does not, by itself, unmount the vault — which is what makes
the `sessionStorage.clear()`-then-`goto` pattern in `passkey.spec.ts` and `identity.spec.ts` an
in-vault teardown rather than a clean one. This was reachable only in a browser.

**Console and network.** `console` reports **5 messages, 0 errors, 0 warnings** — React DevTools
notice, `[HMR] connected`, and three `SyncManager` info logs. Every request returned 200 except one
`POST /api/trpc/realtime.revoke?batch=1` with no status.

**One pre-existing behaviour I am recording rather than reporting as a finding.** MEASURED from the
dev-server log, that revoke returned **401 "Missing authentication headers"** and produced
`[browser] ⨯ unhandledRejection: TRPCClientError`, correlated exactly with my artificial
`sessionStorage.clear()` followed by a navigation (log lines 22–26); with the session intact the
same call returned **200** (line 40). It is not caused by this diff — the barrier reads a window
property and awaits, and touches no realtime code — but it **is** reachable by the suite's own
clear-then-navigate pattern, so it should not later be mistaken for a barrier-induced failure.

**Clauses that are vacuous rather than skipped.** Deterministic accessible role/name/state
snapshots, contrast, zoom/reflow, dark/reduced-motion and responsive sizes (`PROCESS.md:172-176`):
MEASURED, the diff changes no component markup, no styling and no rendered control — the `src`
changes are a gate line, an import path and three comments — so there is no changed control to
snapshot and no changed colour to measure. The checkpoint qualifies these as _task-relevant_. I did
cover the two that are task-relevant: refresh/persistence and multiple tabs/contexts (§4.2, §4.4).

**Cleanup verified by state, not by exit code.** The browser process (pid 651381) is gone; no
process matching the session survives, checked while excluding my own shell; no residual profile
directory exists. The dev server was killed by pid after `readlink /proc/<pid>/cwd` confirmed both
pids were mine, and `ss -ltn` then showed `:3000` released.

## 7. Judgement on `evidence/P20B/implementation-11.md` §4.3, which root asked me to weigh on its merits

**It justifies the breadth adequately, and I would not have it undone.** It states the argument
against itself first and correctly — no loss is demonstrated at any of the eleven, arm F lost 0/28,
and `evidence/P21/diagnostic-Q-P20B-26.md` §4 says the class is not demonstrated beyond allocations.
Its three reasons hold up: the barrier resolves immediately where nothing is queued, so a
non-in-vault site pays one `evaluate` and asserts nothing unmeasured; the alternative would leave an
accurate sentence sitting beside teardowns in the measured shape; and the cost is bounded by green
runs rather than assumed. **My §4.2 and §5 are independent confirmation of the third reason** — 137
barrier entries across nine specs and three full-suite runs, with no barrier-attributable failure.

Its one over-claim is §4.2's completeness, which is F10-2, and its §7 already contradicts it.

## 8. Findings

### F10-1 — MEDIUM — Test gap — the production gate this revision added is itself unguarded

- **Where:** `src/lib/sync/local-persistence-seam.ts:60` —
  `if (process.env.NODE_ENV === "production") return () => undefined;`
- **Finding:** nothing detects this line being deleted. **MEASURED by mutation, not by inspection:**
  with only that line removed, `pnpm typecheck` exit 0, `pnpm lint` exit 0,
  `pnpm exec oxfmt --check src tests` exit 0, and `pnpm test` gives **2489 passed / 1 failed**, the
  one failure being the pre-existing `realtime-origin-controls.test.ts` timeout — **zero tests
  attributable to the gate** (`/tmp/p20b-rev10-review/gate-mut-*.log`). The seam is back in the
  production bundle at that point (§2, middle row). E2E cannot catch it either: the harness runs
  against `pnpm run dev`, where the gate is inactive in both directions, so deleting it changes
  nothing the suite can see. MEASURED, `grep -rn "stubEnv\|NODE_ENV" tests/` returns **nothing** —
  no test anywhere exercises this branch.
- **Why this is Medium and not a nit:** it is the exact defect `reviews/P20B-review-09.md` §8's F-2
  named, applied to F-1's own fix, and this revision adopted the principle explicitly for the
  sibling line. A revision that fails for an unguarded install and passes with an unguarded gate
  applies two standards to one change. The consequence of silent deletion is the recurrence of a
  Medium finding with nothing red.
- **Reproduction:** in a throwaway worktree at HEAD, delete the one line, then run
  `pnpm typecheck && pnpm lint && pnpm exec oxfmt --check src tests && pnpm test`. All green but the
  known flake. Then `pnpm build && grep -rl "__moneyflowLocalPersistence" .next/static` → 1 file.
- **Fix, and MEASURED to be feasible before recommending it:** a unit test that stubs the
  environment. I verified the branch is reachable from vitest — a throwaway probe using
  `vi.stubEnv("NODE_ENV", "production")` around `installLocalPersistenceSeam(() => null)` asserted
  `window.__moneyflowLocalPersistence === undefined` and **passed**
  (`/tmp/p20b-rev10-review/gate-probe.log`); the probe file was removed and left no trace. Roughly
  eight lines beside the existing seam tests, asserting both directions: stubbed production installs
  nothing and returns a callable teardown, unstubbed installs. A build-time grep check would also
  work but is a heavier instrument for the same guarantee.

### F10-2 — MEDIUM — Requirements / accuracy — the in-vault enumeration is incomplete and the evidence claims otherwise

- **Where:** `evidence/P20B/implementation-11.md` §4.2; the affected code sites are
  `passkey.spec.ts:60`, `:177`, `:232` and `identity.spec.ts:173`.
- **Finding:** §4.2 states "I applied the reviewer's criterion — a raw teardown of a document that
  has a vault mounted — to every `.goto(` in the suite and read the surrounding test for each", and
  reports eleven. **MEASURED by runtime instrumentation (§4.4), at least four further raw teardowns
  meet that criterion and are unbarriered**, each observing a present seam and
  `awaitLocalPersistence()` → `"persisted"`, i.e. a live `SyncManager` mounted at the teardown.
  Three of the four are in `passkey.spec.ts`, which this revision edited: it barriered `:76` and
  `:429` while leaving `:60`, `:177` and `:232` of identical shape. The same document's §7 lists
  "the residual class at raw teardowns nobody has enumerated as in-vault" as **Open**, which
  contradicts §4.2 and is the accurate statement.
- **Why this is Medium and not a nit:** root is asked to transcribe §4.2, and this goal has now
  propagated four successive wrong values for this quantity — 44, then 52/five, then eleven. A fifth
  wrong number entering the ledger as MEASURED is the failure mode `reviews/P20B-review-09.md` §10
  was written to stop. Second, the code is now internally inconsistent within one file, so a future
  author reading `passkey.spec.ts` will infer from the barrier's absence at `:60` that the site was
  classified as not-in-vault, which is the same trap F-3 named in weaker form. The **committed
  comment is true** — this finding is against the evidence and the inconsistency, not against
  `helpers/persistence.ts:12-18`.
- **Reproduction:** `/tmp/p20b-rev10-review/barrier-probe.log`, produced by the instrumented run in
  §4.4; `grep "^PROBE" barrier-probe.log`.
- **Fix — the small one, and deliberately not "barrier all of them".** Correct §4.2 to state what
  was swept and what was not, so root transcribes a bounded claim rather than a universal one.
  Optionally barrier the four measured sites. **Do not barrier `passkey.spec.ts:406`/`:468` or
  `identity.spec.ts:339`/`:614`** — MEASURED, the first two have no active vault and the second two
  showed an absent seam at the teardown instant, so a barrier there risks the 15-second hang
  `evidence/P20B/implementation-11.md` §4.3 correctly identifies as the failure mode to avoid. The
  durable answer remains the lint rule already tracked as `Q-P20B-30`, which is out of scope here.

## 9. Things I checked and am deliberately not reporting as findings

Recorded so nobody re-litigates them, and so it is clear they were examined rather than missed.

- **Component 2 / crash-safe durability.** Untouched and out-of-goal by `DECISIONS.md#D-021`. I
  found **no sentence** in the commits, the evidence or the code claiming crash safety, and I reject
  none because none exists. I make no claim about it myself.
- **`tests/integration/realtime-origin-controls.test.ts`.** Pre-existing, fails at BASE, no import
  path to anything changed; root has directed that the revision not be failed for it and I am not
  doing so. I agree with how the implementer handled the `.claude/CLAUDE.md` conflict — it neither
  silently fixed out-of-scope code nor quietly ignored a red test.
- **`tests/unit/import/duplicates.test.ts`.** Wall-clock ratio assertion; failed once in my two
  serial runs. No claim made. I ran no unit tests beside my E2E campaign.
- **`format:check` under `specs/**`.** Pre-existing, `Q-P20B-25`. I scoped the formatter to
  `src`and`tests`and never ran bare`pnpm format`.
- **The 1 lint warning.** Pre-existing, `TransactionTable.tsx:459`, untouched by this commit.
- **`transactions.spec.ts:573`.** §5 — a flake, and MEASURED not a lost write.
- **The 15 s retry budget and the retry-on-absence branch.** Considered against
  `PROCESS.md:167-168`'s bar on hidden retries. It is not a hidden retry: it converges a documented
  race and now **fails loudly** instead of returning silently, and §4.4 measures it doing real work
  at three of 137 entries.
- **The `typeof window === "undefined"` guard** in an effect that cannot run on the server. Still
  dead defensive code, still one line, still not worth a revision.
- **`0/70` as a bound.** The evidence states the 4.3% rule-of-three bound itself and does not write
  that the lost write is gone. Nothing drifted past it, in the evidence or in this file.
- **The refuted `Saved`-over-a-non-durable-write premise.** Not repeated; I make no claim about the
  sync indicator.
- **`VAULT_ROUTE_SEGMENTS` is not re-exported** from `tests/e2e/helpers/index.ts`; the unit test
  imports it by relative path, and `vitest.config.ts`'s `include` covers `tests/**/*.test.ts`, so
  the new directory is picked up. Verified because the guard is worthless if it never runs.

## 10. Question proposals

### Q-PROPOSAL-P20B-10-1 — should the barrier's route guard key on where `VaultProvider` mounts rather than on the directories under `src/app/(app)/`?

- **Raised by/package/revision:** `p20b-reviewer-10`, P20B, revision 10.
- **Context and evidence:** MEASURED, `tests/unit/e2e-harness/vault-route-segments.test.ts` reads
  `src/app/(app)/` from disk and holds `VAULT_ROUTE_SEGMENTS` in step with it, which is a genuine
  guard and not a restatement (§3.3). But the invariant the barrier actually depends on is "the
  routes where `VaultProvider` mounts", and the test asserts a **proxy** for it. MEASURED, that
  proxy is exact today — one mount site, `src/app/(app)/layout.tsx:98`, and `(app)` holds exactly
  the ten listed directories. If a second mount site were ever added outside `(app)` — the
  `(onboarding)` group already renders vault-adjacent flows — the barrier would silently return to a
  no-op **on that route only**, with this test still green. That is the precise decay mode
  `tests/e2e/helpers/persistence.ts:27-33`'s own comment says the test exists to prevent.
- **Why existing authority does not decide it:** `DECISIONS.md#D-021` (the lost-write one at
  `DECISIONS.md:611`) names the mechanism, not its guard. No frozen `sourceTextLine` commits a
  harness-internal invariant. FS-001 `:668`/`:705` commit an outcome that is currently met.
- **Options considered:** (a) leave it — the proxy is exact today and the failure needs a future
  second mount site; (b) add an assertion that `VaultProvider` has exactly one mount site, by
  grepping `src/app/**` for the import, so a second one fails loudly wherever it lands; (c) invert
  the barrier so absence is required to be justified by the _absence of the provider_ rather than by
  the route name — a larger change; (d) fold this into the `Q-P20B-30` lint rule.
- **Reversible default selected to continue:** (a). The proxy is measured exact, the residual needs
  a change nobody has proposed, and (b) is a five-line addition available at any time.
- **Decision-hierarchy basis:** 1 (the frozen outcome clause is met) then 4 (smallest reversible
  change).
- **Impact and risk:** low. (b) is additive, costs one test, and closes the last silent-decay path
  in F-2's remedy.
- **Reversal or migration path:** adding the second assertion later is free; nothing depends on its
  absence.
- **Human review still useful after completion:** yes — whether the harness should assert on
  application structure is a repository convention call.

## 11. What root must transcribe

1. **The verdict and the two findings** in §8, including that all three of
   `reviews/P20B-review-09.md`'s findings **are remediated** and reproduced independently. The
   remaining work is one small test and one corrected sentence.
2. **The in-vault count is not eleven.** §4.4 — at least four further sites meet the criterion,
   MEASURED. Transcribe it as a **bounded** claim ("at least fifteen; the sweep is not complete"),
   not as a new exact number. This is the fifth value this quantity has taken.
3. **Do not barrier the other four sites.** §4.4 and F10-2 — `passkey.spec.ts:406`/`:468` have no
   active vault and `identity.spec.ts:339`/`:614` showed an absent seam at the teardown; barriering
   them risks a 15-second hang. This is the part of my own initial reading that measurement refuted.
4. **F-1's INFERRED residual is now MEASURED and confirmed** (§2.1): six candidate URLs for the
   server source map return 404 from `next start` while a real `.next/static` asset returns 200.
   Root flagged that it had not confirmed this; it is confirmed, in the revision's favour.
5. **`DECISIONS.md` contains two decisions numbered `D-021`** — `DECISIONS.md:479` (UR-005..UR-008)
   and `DECISIONS.md:611` (the lost-write split). Every citation of "D-021" in this goal is
   ambiguous as written, and I had to disambiguate by content to verify the dispatch's two
   conditions. Worth an ID correction or an explicit qualifier in future citations.
6. **`DECISIONS.md:611`'s "137 call sites" is still wrong** and now appears in an accepted decision;
   `reviews/P20B-review-09.md` §10 resolved it to 211 / 217 under stated scopes. Unchanged by this
   revision, still outstanding.
7. **The flake register.** `transactions.spec.ts:573` (§5, MEASURED not a lost write) and
   `realtime-origin-controls.test.ts` (now the fifth agent to hit it) both need owners outside P20B.
8. **A pre-existing browser-side unhandled rejection** on the clear-session-then-navigate path (§6),
   recorded so it is not later misattributed to the barrier.
9. **The question proposal** in §10.

## 12. Secret safety and hygiene

No vault master key, seed phrase, recovery material, `crypto_box` secret, `SUPABASE_JWT_SECRET`,
presence key, invite bearer secret or vault plaintext was read, printed or committed; none appears
in this file. **I did not click "Click to reveal"** — the recovery phrase rendered as `•••••` for
the whole session and no seed word was ever displayed or captured. The two vaults I created in §6
were made through the normal UI, as the suite does, and their browser state is gone.

**No database command of any kind was run** — no `db:reset`, no migration, nothing destructive.

**`:3001` was never touched** — MEASURED before and after every phase: pid 818182, cwd
`/home/ben-agents/Code/moneyflow`, alive throughout. My ports were `:3000` (campaign, then the
manual dev server, never both — the campaign released it first, confirmed from `ss -ltn` state
rather than from a kill's exit code) and `:3123` (the one-off production-server probe in §2.1).
Every process I stopped was killed **by pid** after `readlink /proc/<pid>/cwd` confirmed it was
mine; never a bare `pkill -f`, which matches its own shell. Every run used `env -u CI` and
`--retries=0`; no `--debug`, `--ui`, `--headed` or `show`.

In the shared checkout I ran only read-only commands. I never used `git stash`, `git checkout --` or
`git add`. **I committed nothing and wrote exactly one file: this one.** All mutation — the F-2
install deletion, the F-1 gate deletion, the vitest gate probe and the §4.4 instrumentation — was
confined to my worktree `/tmp/mf-p20b-rev10-review` and reverted; MEASURED, its digest is back to
`850ac6d239fc7b19240f6750fda01b63` and `git status --porcelain src tests` is empty. The worktree can
be removed with `git worktree remove /tmp/mf-p20b-rev10-review --force`.
