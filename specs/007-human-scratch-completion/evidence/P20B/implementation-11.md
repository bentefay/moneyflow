# P20B revision 10 — remediating F-1, F-2 and F-3 of `reviews/P20B-review-09.md` — Implementation Evidence

- **Implementer:** `p20b-implementer-10`. I reviewed nothing and I am not
  `p20b-implementer-07/-08/-09`.
- **Package / revision:** P20B, revision 10.
- **Brief:** `specs/007-human-scratch-completion/dispatches/P20B-rev10-fix.md`.
- **BASE:** `9a256fb7569dcb1b4260d52b848b367cd81a16c4` — re-derived with `git rev-parse HEAD` at
  start, not carried from the dispatch.
- **HEAD:** `67ea7a29bad132917e6e0859021ee79b5ff16a14`.
- **Date:** 2026-08-03.

**Reading convention.** Every claim is tagged **MEASURED** (I ran the command in this session) or
**INFERRED** (read from source with no discriminating execution). A bare `§` points at a section of
**this** file; every reference to another document names that document first. My logs are under
`/tmp/p20b-rev10/`; my validation worktree is `/tmp/mf-p20b-rev10`, both **outside** the repository.

---

## 0. Range, ancestry and tree identity — MEASURED

`git merge-base --is-ancestor 9a256fb HEAD` → exit 0. Three code commits in `9a256fb..HEAD`:

| Commit    | Subject                                                                                | Files              |
| --------- | -------------------------------------------------------------------------------------- | ------------------ |
| `7bfa4da` | fix: gate the durability seam out of production builds and make an absent seam loud    | 13 files, +215 −61 |
| `26450db` | test: assert the seam is present before awaiting it so a missing install reads clearly | 1 file, +3 −3      |
| `67ea7a2` | test: hold the barrier route list in step with the app routes that mount the provider  | 2 files            |

**Four commits landed between my BASE derivation and my first commit, all root's and all
documentation** — `50c31cc`, `9311261`, `a1a084f`, `46b2727`. MEASURED with `git show --stat`: they
touch only `PROGRESS.md`, `RISKS.md` and `reviews/P20B-review-09.md`. My commits sit on top of them.
**One is materially relevant to me and I read it after the fact — see §4.4.**

**Tree identity.** MEASURED,
`find src tests/e2e -type f \( -name '*.ts' -o -name '*.tsx' \) | sort | xargs md5sum | awk '{print $1}' | md5sum`
at HEAD = **`850ac6d239fc7b19240f6750fda01b63`**. That value appears in all ten START/END lines of
§5's campaign logs.

**Every campaign in §5 ran on this tree.** An earlier campaign on `7bfa4da`/`26450db` (digest
`4ab00bf4d88e24890a8824e484826e05`) is **discarded as evidence** and not tabulated here: `67ea7a2`
changes a file under `tests/e2e`, so the tree moved and the campaign was restarted from run 1.

**Working files.** Committed by explicit pathspec, never `git add -A`. No `git stash` and no
`git checkout --` in the shared checkout. The shared checkout is clean under `src` and `tests`.

## 1. What changed

| File                                                             | Change                                                                                                         | Finding |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------- |
| `src/lib/sync/local-persistence-seam.ts:60`                      | `if (process.env.NODE_ENV === "production") return () => undefined;`                                           | F-1     |
| `src/lib/sync/local-persistence-seam.ts:47`                      | `LOCAL_PERSISTENCE_SEAM_KEY` is no longer exported, so the string has no live reference outside the gated body | F-1     |
| `src/lib/sync/index.ts`                                          | both seam re-exports dropped from the `@/lib/sync` barrel; a comment says why                                  | F-1     |
| `src/components/providers/vault-provider.tsx:31`                 | imports the install from the module directly, the barrel no longer carrying it                                 | F-1     |
| `src/components/providers/vault-provider.tsx:90`                 | the comment above the install now states what actually enforces it                                             | F-2     |
| `tests/e2e/helpers/persistence.ts:35`                            | `VAULT_ROUTE_SEGMENTS` — the ten segments `src/app/(app)/` serves                                              | F-2     |
| `tests/e2e/helpers/persistence.ts:62-100`                        | an absent seam on those routes is retried and then **thrown**, not treated as success                          | F-2     |
| `tests/e2e/helpers/persistence.ts:12-18`                         | the false universal replaced                                                                                   | F-3     |
| `tests/unit/components/vault-provider-persistence-seam.test.tsx` | new — the provider must publish the seam                                                                       | F-2     |
| `tests/unit/e2e-harness/vault-route-segments.test.ts`            | new — the route list must match `src/app/(app)/`                                                               | F-2     |
| `tests/unit/sync/local-persistence-seam.test.ts`                 | reads `window.__moneyflowLocalPersistence` directly; header comment corrected                                  | F-1/F-2 |
| seven `tests/e2e/*.spec.ts`                                      | eleven raw teardowns that fire with a vault mounted now call the barrier                                       | F-3     |

**The fix was not redesigned.** The seam, `awaitVaultPersistence`, `reloadPage` and the choice of a
durability barrier over client-side navigation are untouched in substance.

## 2. F-2 — an absent seam is loud, and deleting the install fails something

**Fixed first, as `reviews/P20B-review-09.md` §8.1 requires.** Gating before this would have made
every E2E run pass with the barrier inert.

### 2.1 The change

`awaitVaultPersistence` no longer returns on an absent seam. It resolves the barrier inside the page
to _the reason to keep waiting, or null_, so there is no third value that can be mistaken for
success:

- seam present → await it; `"persisted"` and `"no-active-vault"` both mean nothing is outstanding.
- seam absent, and `window.location.pathname`'s first segment is **not** one of
  `VAULT_ROUTE_SEGMENTS` → resolve. No provider mounts there, so nothing could have queued a write.
- seam absent **on** such a route → keep waiting, and on budget expiry throw, naming the file that
  must install it.

Absence is retried rather than thrown immediately because a document that has just loaded has not
hydrated yet; the same 15 s budget covers it.

**The route list is exactly right, and cannot silently rot.** MEASURED: `VaultProvider` has exactly
one mount site, `src/app/(app)/layout.tsx:98`, and `src/app/(app)/` contains exactly the ten
directories in the list. `tests/unit/e2e-harness/vault-route-segments.test.ts` compares the two by
reading the directory. MEASURED that it can fail: deleting `"statuses"` from the constant turns it
red (`expected [ 'accounts', 'automations', …(7) ] to deeply equal [ …(8) ]`); restoring it turns it
green.

### 2.2 The mutation proof — the finding's own method, on the final tree

In `/tmp/mf-p20b-rev10` at HEAD `67ea7a2` I deleted **only** the `useEffect` at
`vault-provider.tsx` and its import specifier, exactly as `reviews/P20B-review-09.md` §8's F-2 did,
then restored it. MEASURED:

| Gate on the mutated tree            | Before this revision (reviewer)   | On my tree                                                                                                                       | Log                                  |
| ----------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `pnpm typecheck`                    | exit 0                            | **exit 0** — still blind, as expected                                                                                            | `/tmp/p20b-rev10/mut3-typecheck.log` |
| `pnpm lint`                         | exit 0                            | **exit 0**                                                                                                                       | `/tmp/p20b-rev10/mut3-lint.log`      |
| `pnpm exec oxfmt --check src tests` | exit 0                            | **exit 0**                                                                                                                       | `/tmp/p20b-rev10/mut3-format.log`    |
| `pnpm test`                         | 2486 passed, nothing attributable | **4 failed / 2486 passed** — my two guard tests, plus the two known flakes, `realtime-origin-controls.test.ts` (§6.1) and `duplicates.test.ts` (§6.2) | `/tmp/p20b-rev10/mut3-unit.log`      |
| the two guard tests, named          | did not exist                     | `AssertionError: expected undefined to be defined`, twice                                                                        | `/tmp/p20b-rev10/mut3-unit.log`      |

Restoring the line, in the same worktree, digest back to `850ac6d2…`: all three tests in the two new
guard files pass (`/tmp/p20b-rev10/mut3-restored-guard.log`). A guard I could not demonstrate failing would be
the defect I was sent to fix, so this was run in both directions.

An identical mutation run one commit earlier, at `26450db`, gave the same picture — typecheck, lint
and format all exit 0, the two guard tests red — and its logs are preserved as
`/tmp/p20b-rev10/mut2-*.log`.

### 2.3 The same mutation, through the harness — MEASURED

On the same mutation applied at `26450db` I ran the preserved probe's arms C and C2 at
`--repeat-each=3 --retries=0`
(`/tmp/p20b-rev10/mut-armC-C2.log`). **All 6 executions failed**, each with:

```
Error: Vault never acknowledged its local writes within 15000ms: no durability seam on /settings,
which VaultProvider must install (src/components/providers/vault-provider.tsx,
src/lib/sync/local-persistence-seam.ts)
```

Before this revision the same mutation left arm C2 **passing while losing 2/12 writes** and the
helper raised nothing (`reviews/P20B-review-09.md` §8's F-2). Note that arm C failed too, at
`helpers/nav.ts:19` inside `goToPeople` — the loud absence propagates through every nav helper, not
only through `reloadPage`.

### 2.4 What the guard tests assert

`tests/unit/components/vault-provider-persistence-seam.test.tsx` renders `VaultProvider` inside the
real `ActiveVaultProvider` and `SyncStatusProvider`, mocking only `next/navigation` and
`@/lib/trpc/client`, and asserts that mounting publishes the seam, that unmounting removes it, and
that the published seam answers `"no-active-vault"` — which is only true if it is reading the
provider's own manager ref rather than a stub. The render stops at the provider's loading state
deliberately: the install effect is declared ahead of the initialization effect precisely so it does
not depend on a vault, and a test that needed a decrypted vault to reach it would assert something
weaker.

## 3. F-1 — the seam no longer reaches a production bundle

**This is a production-surface and precedent finding, not a security one.** I record no
vulnerability; `reviews/P20B-review-09.md` §6 analysed the seam and found none, and nothing in this
revision changes that analysis.

**Mechanism chosen: `process.env.NODE_ENV !== "production"`, not `NEXT_PUBLIC_ENABLE_TEST_SEAM`.**
Reasons: `playwright.config.ts`'s `webServer.command` is `pnpm run dev` and there are no
`.github/workflows`, so nothing runs E2E against a production build (MEASURED); the idiom is already
in the file being edited (`vault-provider.tsx:393`); and it needs no new configuration, which
`.claude/CLAUDE.md` prefers. The objection that a future prod-build E2E run would silently lose the
barrier is answered by §2: with F-2 landed, that run fails loudly instead. `playwright.config.ts` is
**unchanged**.

**Measured on the emitted bundle, in both directions.** `pnpm build` in `/tmp/mf-p20b-rev10`:

| Tree                                     | `grep -rl "__moneyflowLocalPersistence" .next/static` | Build log                               |
| ---------------------------------------- | ----------------------------------------------------- | --------------------------------------- |
| HEAD, gated                              | **0 files**                                           | `/tmp/p20b-rev10/final-build.log`       |
| HEAD with **only** the gate line removed | **1 file — `.next/static/chunks/2kti1-ybxn-5f.js`**   | `/tmp/p20b-rev10/mut-build-ungated.log` |
| gate restored, rebuilt                   | **0 files**                                           | `/tmp/p20b-rev10/build-gated-final.log` |

The middle row is the point: it is the same chunk `reviews/P20B-review-09.md` §8's F-1 named, so the
grep is a discriminating instrument and the gate is what removes the property, not a change of
bundler layout. All three builds exited 0 and emitted every route.

**One residual occurrence, disclosed rather than rounded off.** MEASURED: at HEAD the string still
appears once anywhere under `.next` — in `sourcesContent` of the **server-side** source map
`.next/server/chunks/ssr/src_app_(app)_layout_tsx_1yu5hom._.js.map`. I verified by parsing the map
that the string is present only in the original TypeScript text of
`src/lib/sync/local-persistence-seam.ts` and **not** in the map's `names` nor in the emitted `.js`
beside it (that file greps 0). `.next/static` contains **no** source maps at all. INFERRED, and
flagged as such: a server-side build source map is not served to a browser from `.next/static`, so
no user's `window` carries the property — the MEASURED part of that claim is the emitted-code grep,
not the deployment topology.

**Barrel.** Both re-exports are gone from `src/lib/sync/index.ts`. MEASURED: the only importer in
`src` was `vault-provider.tsx`, which now imports the module directly, and nothing else in `src` or
`tests` imported either name from `@/lib/sync`.

## 4. F-3 — the universal is gone, and the in-vault raw teardowns are barriered

### 4.1 The comment

`tests/e2e/helpers/persistence.ts:12-18` no longer claims universality. It now says what is true:
teardowns routed through `reloadPage` or a `nav.ts` helper always wait; a raw `page.goto` or
`page.reload` in a spec does not unless that spec calls `awaitVaultPersistence` itself, as the raw
teardowns identified as firing with a vault mounted do; and it tells the next author to check which
of the two they are writing. **It names no count**, deliberately — a number frozen in a comment
decays.

**I did not attempt to amend the pushed commit subject of `0a94be8`** ("…before **every** E2E
document teardown"). It is an ancestor of HEAD and rewriting it is not available to me. The record
of what is actually covered is the source comment and this file.

### 4.2 The barriered sites — my enumeration differs from the reviewer's, upward

MEASURED at HEAD: `tests/e2e/*.spec.ts` contains **53** `.goto(` call sites, reproducing root's
figure in `PROGRESS.md` (2026-08-03, "the raw-teardown count is resolved") exactly. Twelve of them
now sit behind an explicit barrier call — the one rev 09 added, plus these eleven:

| Site at HEAD                      | Page state at the teardown                                              | In the reviewer's five |
| --------------------------------- | ----------------------------------------------------------------------- | ---------------------- |
| `accounts.spec.ts:87`             | after `createNewIdentity`, on `/settings` with a new vault              | yes                    |
| `vault-settings.spec.ts:423`      | after `createNewIdentity`                                               | yes                    |
| `realtime-security.spec.ts:69`    | `member`, after `createNewIdentity` + `shareActiveVaultWithMember`      | yes                    |
| `realtime-security.spec.ts:182`   | `owner`, after writing transactions in that document                    | yes                    |
| `description-aliases.spec.ts:568` | `duplicate`, same vault mounted, merging remote renames                 | yes                    |
| `passkey.spec.ts:76`              | `addPasskeyFromSettings`, entered straight from account creation        | **no**                 |
| `passkey.spec.ts:429`             | after `createAccountWithPasskey`                                        | **no**                 |
| `tab-duplication.spec.ts:132`     | `onboardingDuplicate`, on Vault Settings with the vault it just created | **no**                 |
| `tab-duplication.spec.ts:134`     | `authenticatedDuplicate`, likewise                                      | **no**                 |
| `invite-redemption.spec.ts:54`    | `member`, after `createNewIdentity`, before opening the invite link     | **no**                 |
| `invite-redemption.spec.ts:112`   | `member`, likewise in the second test                                   | **no**                 |

**Root must know this: the in-vault set is six larger than the five in `reviews/P20B-review-09.md`
§8's F-3 and in root's own `PROGRESS.md` re-derivation.** I applied the reviewer's criterion — a raw
teardown of a document that has a vault mounted — to every `.goto(` in the suite and read the
surrounding test for each. MEASURED that `createNewIdentity` (`tests/e2e/helpers/auth.ts:52-65`) and
`createAccountWithPasskey` (`passkey.spec.ts:43-55`) both end on `/settings` with a created vault,
so the six extra sites are the same shape as the five. I have **not** re-litigated the 52-vs-44
count; that was resolved by root against root and is not mine.

**I am not claiming any of the eleven currently loses a write.**
`evidence/P21/diagnostic-Q-P20B-26.md` §4 says the class is not demonstrated beyond allocations and
arm F lost 0 / 28. This is a shape-matching change, and its cost is bounded by §5's three green
full-suite runs.

### 4.3 Why barrier at all, given the finding's lighter remedy

`reviews/P20B-review-09.md` §12's `Q-PROPOSAL-P20B-09-1` selected option (b), narrow the sentence,
as the reversible default, and root's correction (§4.4) makes barriering optional. I did **both**,
and the argument against me is the strong one, so I state it first: **no loss is demonstrated at any
of the eleven sites.** Arm F lost 0 / 28 and `evidence/P21/diagnostic-Q-P20B-26.md` §4 says the class
is not demonstrated beyond allocations, so barriering them buys no measured defect.

I did it anyway for three reasons. **First, the asymmetry.** The barrier resolves immediately unless a
vault is mounted on an `(app)` route, so a site where nothing is queued pays a single `evaluate` and
asserts nothing unmeasured; a site where something *is* queued is a loss nobody would attribute
correctly, because this class is silent by construction — that is the whole premise of the goal.
**Second, the comment.** (b) alone would have left the next author reading an accurate sentence
about raw teardowns while eleven of them sat in the suite in exactly the shape the goal measured
losing writes, which is a weaker position than the one F-3 objected to only because the sentence
would no longer be false. **Third, the cost is bounded and measured**, not assumed: §5's three
retry-free full-suite runs and 95 executions of the frozen journey are all green with the eleven in
place.

**What would have changed my mind:** if any of the eleven sat on a page where the seam can be absent,
the added call would convert a passing test into a 15 s hang and a hard failure. INFERRED from
reading each test, all eleven fire on an `(app)` route with `VaultProvider` mounted. **MEASURED, and
this is the check that matters:** every one of the eleven sits in a test that runs in the standard
suite, and the suite passed 195/195 three times (§5.2), so each barrier call returned rather than
threw on at least three independent executions. A seam that was absent at any of them would have
failed loudly by construction — that is what §2 built.

### 4.4 The correction — recorded before it arrived, and after

Root's `PROGRESS.md` entry of 2026-08-03 ("Rev 09 review closing report") records that root "sent
`p20b-implementer-10` a correction making the barriering **optional but requiring the choice to be
justified either way**, and told it not to undo work already done". **MEASURED, from my own
transcript: it had not reached me at the time I committed and wrote this file** — my only instruction
until then was the original brief, and I found the ledger entry by reading `git log` after committing.

**The correction has since arrived**, after I handed back, and this paragraph is updated rather than
left to decay. It carries the figures root re-derived — 53 `.goto(` sites, 52 unbarriered, five with
a vault mounted, the reviewer's 52 correct against root's 44 — and it instructs me to keep any
barriering already done and justify it. **Nothing in the code changed as a result:** the work was
complete, root asked that it not be undone, §4.3 is the justification in the terms the correction
asks for, and §4.2 records where my own enumeration runs ahead of root's five.

The correction also names the false universal at `tests/e2e/helpers/persistence.ts:22-23`, its
location before this revision. At HEAD it is `:12-18`; the line moved because the module comment was
rewritten, not because a different sentence was edited.

## 5. Validation — every run on tree `850ac6d239fc7b19240f6750fda01b63`, HEAD `67ea7a2`

`env -u CI`, `--retries=0`, no `--debug`/`--ui`/`--headed`/`show`. Digest recorded at the start and
end of every run; **all ten START/END lines carry the same digest**, so nothing drifted
mid-campaign.

### 5.1 The probe — the control still bites

Preserved probe `evidence/P21/diagnostic-Q-P20B-26-probe.spec.ts.artifact` plus arm C2, i.e.
`/tmp/p20b09-logs/zz-q26-idb.spec.ts.postfix-artifact`, md5 `dc3c6abad2ee8dfa7502c1a7e2977eff` —
MEASURED, identical to the md5 `reviews/P20B-review-09.md` §2.1 recorded. Its config artifact md5
`dc309f989d5c759d7416f3801d8839aa`, MEASURED identical to the copy in `evidence/P21/`. Port 3100,
`--repeat-each=70`, log `/tmp/p20b-rev10/final-probe-70.log`.

| Arm   | Path through the harness                    | Rev 09 post-fix | **This tree**    |
| ----- | ------------------------------------------- | --------------- | ---------------- |
| **C** | raw `page.reload()` — **untouched control** | 20 / 70 lost    | **11 / 70 lost** |
| C2    | reload through `reloadPage()`               | 0 / 70          | **0 / 70**       |
| D     | `goToTransactions()` then reload            | 0 / 70          | **0 / 70**       |

**210 executions, all passed.** Arm C losing on the gated tree is what makes the two zeros mean
something: the instrument can still fail, and the gate has not quietly disabled the seam in dev.

**The op-count discriminator holds, MEASURED over this campaign's own verdict lines:** arms C and C2
give `129 bobLost=false ops=7` and `11 bobLost=true ops=6`, **140/140 with no counterexample**; arm
D gives `70 bobLost=false ops=7`. Every loss is an op row that was never written.

I make **no cross-campaign rate comparison** with rev 09. The 11 and the 20 are counts on two
campaigns; this goal has measured a large between-campaign spread on a fixed tree.

### 5.2 Suite and frozen journey

Repo's **unmodified** `playwright.config.ts`, on `:3000` — not a custom port, which cost rev 09 a
15-failure phantom run through the seven specs that pin `baseURL: "http://localhost:3000"`.

| Run                    | Result                                                                  | Log                                      |
| ---------------------- | ----------------------------------------------------------------------- | ---------------------------------------- |
| full suite 1           | **195 / 195 passed** (4.5m)                                             | `/tmp/p20b-rev10/final-e2e-run1.log`     |
| full suite 2           | **195 / 195 passed** (4.5m)                                             | `/tmp/p20b-rev10/final-e2e-run2.log`     |
| full suite 3           | **195 / 195 passed** (4.5m)                                             | `/tmp/p20b-rev10/final-e2e-run3.log`     |
| frozen journey spec ×5 | **95 / 95 passed** (2.6m) — `people-settlement.spec.ts --repeat-each=5` | `/tmp/p20b-rev10/final-e2e-people5x.log` |

MEASURED, zero Playwright failure markers (`^ +[0-9]+\) `) and zero `N failed` lines in any of those
four logs or in §5.1's probe log. **Three green runs are a count, not a
clearance** — `PROGRESS.md`'s own guidance is that one green run on this tree proves little, and the
10-green bar remains open.

### 5.3 Cheap gates

| Gate                                  | Result                                                                                                                                      | Log                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `pnpm typecheck`                      | exit 0, no output                                                                                                                           | `/tmp/p20b-rev10/handback-typecheck.log`  |
| `pnpm lint`                           | exit 0 — 0 errors, **1 warning**, the pre-existing `react-hooks/incompatible-library` at `TransactionTable.tsx:459`, a file I did not touch | `/tmp/p20b-rev10/handback-lint.log`       |
| `pnpm exec oxfmt --check src tests`   | exit 0                                                                                                                                      | `/tmp/p20b-rev10/handback-format.log`     |
| `pnpm build`                          | exit 0, all routes emitted                                                                                                                  | `/tmp/p20b-rev10/final-build.log`         |
| `pnpm test` — worktree at HEAD        | **132 files, 2490 passed / 2 skipped, 0 failed**                                                                                            | `/tmp/p20b-rev10/final-unit-worktree.log` |
| `pnpm test` — shared checkout at HEAD | **1 failed / 2489 passed / 2 skipped** — see §6.1                                                                                           | `/tmp/p20b-rev10/handback-unit.log`       |

I did not run bare `pnpm format` or bare `pnpm format:check`: the first reflows frozen files under
`specs/**` and the second reports pre-existing failures there (`Q-P20B-25`). I scoped the formatter
to `src` and `tests`.

## 6. Failures and things I did not do

### 6.1 `tests/integration/realtime-origin-controls.test.ts` — pre-existing, MEASURED at BASE

"reads only its own vault's ops even when the request claims a hostile origin",
`Test timed out in 5000ms`. It failed in **6 of the 7** full unit runs I did today and passed in a
1-of-1 isolated run (9/9, `/tmp/p20b-rev10/realtime-rerun.log`).

**The decisive check: it fails at BASE too.** MEASURED — in my worktree at `9a256fb`, with none of
my change present, `pnpm test` gives `1 failed / 2486 passed / 2 skipped` and the failure is this
same test (`/tmp/p20b-rev10/base-unit.log`). MEASURED that it imports only `node:crypto`, `vitest`
and `./helpers/realtime-stack`, whose own imports are `node:child_process`, `node:crypto` and
`node:fs`; there is no import path from it to anything I changed.

**I did not fix it.** `.claude/CLAUDE.md` says to fix test issues even when you did not create them,
and my brief rules this file out of scope and does not authorise `tests/integration/**`. I am
reporting the conflict rather than resolving it unilaterally. This is now the fourth agent to hit
it.

### 6.2 `tests/unit/import/duplicates.test.ts`

Failed on the two mutated-tree runs only (§2.2), never on an unmutated tree in any of my seven
`pnpm test` runs. It asserts a wall-clock ratio; my brief pre-classifies it. No claim made.

### 6.3 Deliberately not done

- **Component 2 / crash-safe durability** — out-of-goal by `DECISIONS.md#D-021`. **I record no claim
  of crash safety anywhere.** A `beforeunload` path exists but I measured nothing about it.
- **Converting `nav.ts` to client-side navigation** — would breach D-021 condition 1; `Q-P20B-31`.
- **A lint rule forbidding raw `page.goto` in specs** — `Q-P20B-30`, out of scope.
- **Amending `0a94be8`'s subject** — not available (§4.1).
- **Manual `pnpm exec playwright-cli` browser testing** — not performed. `PROCESS.md:170-171` places
  that clause on the reviewer, and root's `PROGRESS.md` entry states the rev 10 reviewer MUST
  perform it. Stated here so the gap is visible: I left `:3000` free at handback for exactly that.

## 7. What is and is not established

**Established, bounded.** On tree `850ac6d2…`: arm C2 and arm D each lost **0 of 70** while the
untouched control lost 11 of 70. `0/70` is **a bound, not a clearance** — the 95% rule-of-three
upper bound is **4.3%** per fixed arm. I do not write that the lost write is gone;
`reviews/P20B-review-09.md` §2.2 flagged that wording in the prior evidence and it is not repeated.

**Established.** The seam is absent from the production client bundle, and the grep that shows it
can still find it when the gate is removed. Deleting the install line now fails two unit tests, and
MEASURED it failed all six probe executions I ran on the mutated tree — including through a
`nav.ts` helper, not only through `reloadPage` — where before it failed nothing.

**Open.** The 10-green full-suite bar; crash safety; the residual class at raw teardowns nobody has
enumerated as in-vault; whether the six sites beyond the reviewer's five should have been barriered
at all (§4.2, §4.3).

## 8. What root must transcribe

1. **The in-vault raw-teardown set is eleven, not five** (§4.2). Root's `PROGRESS.md` entry and
   `reviews/P20B-review-09.md` §8's F-3 both name five; six more meet the same criterion in
   `passkey.spec.ts`, `tab-duplication.spec.ts` and `invite-redemption.spec.ts`. All eleven are now
   barriered.
2. **Root's mid-revision correction on F-3 reached me only after handback** (§4.4). The outcome
   matches what root asked for and no code changed, but the delivery gap — the ledger recorded the
   correction as sent before it arrived — should be in the record.
3. **F-1's mechanism is `NODE_ENV`, and `playwright.config.ts` is unchanged** (§3), so no reviewer
   should look for a `NEXT_PUBLIC_ENABLE_TEST_SEAM`.
4. **The residual `sourcesContent` hit in a server-side source map** (§3) — disclosed, with the
   MEASURED and INFERRED parts separated.
5. **`realtime-origin-controls.test.ts` fails at BASE** (§6.1) — the flake register item now has a
   BASE measurement and a fourth sighting, and it conflicts with `.claude/CLAUDE.md`'s
   fix-everything rule. It needs an owner.
6. **The rev 10 manual browser checkpoint is outstanding** and `:3000` was left free for it (§6.3).

## 9. Hygiene

No vault master key, seed phrase, recovery material, `crypto_box` secret, `SUPABASE_JWT_SECRET`,
presence key, invite bearer secret or vault plaintext was read, printed or committed; none appears
in this file. **No database command of any kind was run** — no `db:reset`, no migration, nothing
destructive. **Port `:3001` was never touched**; I confirmed its dev server (pid 818182, cwd
`/home/ben-agents/Code/moneyflow`) is the human's and ran every build and campaign in
`/tmp/mf-p20b-rev10` so the shared `.next` was never disturbed. I killed no process and used no bare
`pkill`. My worktree was created with `git worktree add --detach`, given a copied `.env.local` and
`pnpm install --frozen-lockfile` — never `cp -a node_modules`. Every mutation lived in that worktree
and was restored from a commit hash; the shared checkout is clean under `src` and `tests`.

**Left in place for the reviewer, and outside the repository:** `/tmp/mf-p20b-rev10` (worktree,
carrying the gated production build the §3 grep ran against) and `/tmp/p20b-rev10/` (all logs). The
worktree can be removed with `git worktree remove /tmp/mf-p20b-rev10 --force`; I have not removed it
because it is what backs §3. Nothing is listening on `:3000` or `:3100`.
