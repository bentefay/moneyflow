# P20B revision 12 — remediating F11-1 of `reviews/P20B-review-11.md` — Implementation evidence

- **Implementer:** `p20b-implementer-12`, distinct from `p20b-implementer-07/-08/-09/-10/-11` and
  from every reviewer of this package.
- **Package / revision:** P20B, revision 12.
- **Date:** 2026-08-03.
- **Filename skew:** this file is `implementation-13.md` for revision 12 — the known one-ahead skew
  the dispatch names.

**Reading convention.** Every claim is tagged **MEASURED** — I ran the command in this session and
report its output — or **INFERRED**, read from source with no discriminating execution of my own. A
bare `§` points at a section of **this** file; every reference to another document names that
document first. Logs are under `/tmp/p20b-rev12-logs/`, outside the repository; my throwaway
worktree is `/tmp/mf-p20b-rev12`, also outside the repository. **This file is written, not
committed**, per the dispatch.

---

## 0. Range, tree identity and drift

| Item                     | Value                                                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| **BASE as I derived it** | `1eeb380dcab370cdd494a3fd081a15d71bcb31a9` — MEASURED with `git rev-parse HEAD` at start, not carried                  |
| **Parent of my commit**  | `69e557e672c960c916f3694302b916d9803ccf97` — root's ledger commit, landed while I worked (§0.1)                        |
| **HEAD (my commit)**     | `d80f0e459fea29e54d9b849deca987200d817b90`                                                                             |
| Commits in range, mine   | `d80f0e4` only                                                                                                         |
| **Tree digest at HEAD**  | **`59ded0a21ad08d3ed53f596eb0789915`**                                                                                 |
| Digest command           | `find src tests/e2e -type f \( -name '*.ts' -o -name '*.tsx' \) \| sort \| xargs md5sum \| awk '{print $1}' \| md5sum` |

### 0.1 HEAD moved once between my BASE read and my commit, and it was not me

MEASURED. `git rev-parse HEAD` returned `1eeb380` when I started. When I committed, the range
`1eeb380..d80f0e4` contained **two** commits: root's `69e557e` ("docs: correct root's HEAD
acceptance-test framing and record three post-handoff confirmations") and mine. MEASURED,
`git show --stat 69e557e` is **one file, `specs/007-human-scratch-completion/PROGRESS.md`, +38
lines**, so `git diff --name-only 1eeb380..d80f0e4 -- src tests` is exactly my one file. **The
reviewer's true parent for my change is `69e557e`**, and I record it rather than letting the range
look like two authors touched code.

MEASURED after every run in §4: `git rev-parse HEAD` is still `d80f0e4`,
`git diff --name-only d80f0e4..HEAD -- src tests` is **empty**, and
`git status --porcelain -- src tests` is **empty**. **All code was committed before the first
campaign run started.**

MEASURED, no drift during the campaign: all **six** START/END lines across the three runs carry
`59ded0a21ad08d3ed53f596eb0789915` (`/tmp/p20b-rev12-logs/changed-5x-run1.log`, `-run2.log`,
`-run3.log`).

---

## 1. What changed — one comment, in one file

| Commit    | File                        | Change                                   |
| --------- | --------------------------- | ---------------------------------------- |
| `d80f0e4` | `tests/e2e/passkey.spec.ts` | 6 insertions, 2 deletions — comment only |

**`src/` is untouched.** MEASURED, `git diff --name-only 69e557e..d80f0e4 -- src` is empty. No
barrier was moved, dropped or added; `tests/e2e/helpers/persistence.ts` is untouched, including its
retry-on-absence branch (§2.2).

**The diff contains no executable change — MEASURED, not asserted.**
`git show d80f0e4 -U0 -- tests/e2e/passkey.spec.ts | grep -E '^[+-]' | grep -v '^[+-][+-]' | grep -vE '^[+-]\s*//'`
returns **nothing**: every added and every removed line is a `//` comment line. **INFERRED from
that:** the compiled behaviour of this spec is identical at `69e557e` and at `d80f0e4`, so any E2E
outcome difference between the two trees cannot be attributed to this revision. The campaign in §4
is a demonstration of that, not the argument for it.

### 1.1 The old comment, at `tests/e2e/passkey.spec.ts:60-61` before this commit

```
// Every caller arrives from a settings page whose vault is still mounted, so this navigation is
// a teardown of a live document.
```

### 1.2 The new comment, at `tests/e2e/passkey.spec.ts:60-65` at `d80f0e4`

```
// All four callers reach this line on /settings, but only some have a live vault at that
// instant — both instrumented samples of this line were mixed (§6 of
// specs/007-human-scratch-completion/reviews/P20B-review-11.md; §4.4 of
// reviews/P20B-review-10.md, before the barrier existed), and the same predicate measured at
// other lines in this file moved between those runs. The barrier is in the helper so the live
// case is covered on all four; where no vault is mounted it resolves as a no-op.
```

---

## 2. Why each clause of the new comment is defensible

### 2.1 Clause by clause

| Clause                                                                             | Basis                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "All four callers reach this line on /settings"                                    | **MEASURED by the reviewer** — `reviews/P20B-review-11.md` §6: all 12 entries resolved on `/settings`. Also **MEASURED by me statically** (§2.3): three callers arrive from `createAccountWithPasskey`, which ends at `waitForURL("**/settings")`; the fourth from `addPasskeyFromSettings`, which ends at `goto("/settings")`. |
| "only some have a live vault at that instant"                                      | **MEASURED by the reviewer** — `reviews/P20B-review-11.md` §6 records 6 present-and-`persisted`, 2 present-and-`no-active-vault`, 4 absent, of 12 entries. Deliberately not quantified in the comment (§3).                                                                                                                     |
| "both instrumented samples of this line were mixed"                                | **MEASURED by two reviewers, cross-file.** `reviews/P20B-review-10.md` §4.4 (pre-barrier, at `passkey.spec.ts:60`): `persisted` ×2, `no-active-vault` ×1, absent ×1. `reviews/P20B-review-11.md` §6 (post-barrier): as above.                                                                                                   |
| "the same predicate measured at other lines in this file moved between those runs" | **MEASURED by two reviewers, cross-file.** `reviews/P20B-review-10.md` §4.4 records `passkey.spec.ts:177` (the pre-barrier form of the `:180` site) as present + **`persisted`**; `reviews/P20B-review-11.md` §6 records that same site, at `:180`, as **3/3 `no-active-vault`**.                                               |
| "the barrier is in the helper so the live case is covered on all four"             | **INFERRED** — a design statement about placement, matching the file's own treatment of `addPasskeyFromSettings`, which barriers internally at `passkey.spec.ts:83` (`:79` in `reviews/P20B-review-11.md`'s numbering).                                                                                                         |
| "where no vault is mounted it resolves as a no-op"                                 | **MEASURED from source.** `src/lib/sync/local-persistence-seam.ts:66` returns `"no-active-vault"` when `readActiveManager()` is null, without throwing; `tests/e2e/helpers/persistence.ts:79-84` treats any non-throwing return as `failure == null` and returns.                                                               |

**Numbering caveat for the table above.** Every `passkey.spec.ts:NNN` in it is quoted **in the cited
review's numbering** (`:60`, `:177`, `:180`), which is the tree before my comment grew by four
lines. MEASURED, the same sites at `d80f0e4` are: review-10's `:60` — the pre-barrier
`goto("/unlock")` inside `unlockWithPasskey` — is now `:67`, with the barrier above it at `:66`;
review-10's `:177` is now `:185`, and review-11's `:180`, the barrier immediately above it, is now
`:184`. I re-derive my own citations at `d80f0e4` in §2.3.

**What the new comment deliberately does NOT say.** It asserts no universal over the callers'
**vault state**; it attributes no fixed vault state to this site or any other; it names no count;
and it makes no crash-safety claim. The one universal it does keep — that all four callers are on
`/settings` — is the clause `reviews/P20B-review-11.md` §11 explicitly records as true (12/12) and
which is additionally decidable by reading the four call paths (§2.3).

### 2.2 The two things the dispatch required to survive, and they did

1. **The retry-on-absence branch in `tests/e2e/helpers/persistence.ts` is untouched.** MEASURED,
   `git diff --name-only 69e557e..d80f0e4` is one file and it is not this one.
2. **No sentence in this file or in the committed comment asserts a site's vault state as a fixed
   property.** The load-dependence is stated explicitly in §1.2's committed text and in §2.1's
   fourth row.

### 2.3 The `/settings` half, checked by me rather than inherited

MEASURED, `grep -n "unlockWithPasskey" tests/e2e/passkey.spec.ts` gives the definition at `:59` and
**four** call sites — `:153`, `:177`, `:220`, `:264`. **All line numbers in this section are
re-derived at `d80f0e4`, after my comment shifted everything below `:61` down by four**; the same
sites are `:149`/`:173`/`:216`/`:260` in `reviews/P20B-review-11.md`'s numbering. Reading each:
`:153` and `:264` follow `createAccountWithPasskey(page)`, which ends
`await page.waitForURL("**/settings")` at `:53`; `:177` follows `addPasskeyFromSettings(...)`, which
reaches `/settings` by `goto` at `:84`; `:220` follows a `revoke` step performed on the `/settings`
page. **Four callers, all on `/settings`** — consistent with the reviewer's 12/12.

---

## 3. Counts I did not issue

I state **no** count of in-vault teardowns. The ledger's bound — _"at least fifteen; the sweep is
not complete"_ — is untouched by me, and I neither instrumented the suite nor re-derived it. The
only numbers in this file are: my own campaign's execution counts (§4), the reviewer's 6/2/4-of-12
and 2/1/1-of-4 samples quoted **with attribution to their source documents** (§2.1), and the diff's
6-insertions/2-deletions.

---

## 4. Validation — proportionate to a comment-only change, and stated as such

**Why this shape.** MEASURED (§1), the diff has **zero non-comment changed lines**, so no execution
can distinguish this tree's behaviour from its parent's. A full-suite campaign would therefore add
runtime cost without adding discriminating power. I ran the static gates in full, plus the two specs
the dispatch names, three times each at `--repeat-each=5`. **This is a demonstration that nothing
moved, not a clearance of the suite.**

All runs: `env -u CI`, `--retries=0`, `--reporter=line`, the repository's **unmodified**
`playwright.config.ts` on `:3000`, **no port override**, no `--debug` / `--ui` / `--headed` /
`show`, from my worktree `/tmp/mf-p20b-rev12`.

### 4.1 Static gates — run in the shared checkout, before any campaign started

| Gate                                                | Result                                                                                                                                               |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`                                    | **clean**, no output                                                                                                                                 |
| `pnpm lint`                                         | **0 errors, 1 warning** — the pre-existing `react-hooks/incompatible-library` at the `useVirtualizer()` call, in a file this revision does not touch |
| `pnpm exec oxfmt --check tests/e2e/passkey.spec.ts` | **"All matched files use the correct format"** — scoped to my own file, never a bare `pnpm format`                                                   |
| `pnpm test`                                         | **132 files passed, 2492 passed / 2 skipped**, 73.7s — `/tmp/p20b-rev12-unit.log`                                                                    |

**No unit test was run beside a campaign** — the unit run finished before the first Playwright run
started. MEASURED: `realtime-origin-controls.test.ts` and `duplicates.test.ts`, the two
intermittents the dispatch names, both **passed** in this run. I claim nothing further about either.

### 4.2 E2E — `passkey.spec.ts` + `identity.spec.ts`, three runs at `--repeat-each=5`

| Run | Result                           | Playwright failure markers | Digest at START and END            | Log                   |
| --- | -------------------------------- | -------------------------- | ---------------------------------- | --------------------- |
| 1   | **104 passed / 1 failed** (3.6m) | 1                          | `59ded0a21ad08d3ed53f596eb0789915` | `changed-5x-run1.log` |
| 2   | **105 passed** (3.3m)            | 0                          | `59ded0a21ad08d3ed53f596eb0789915` | `changed-5x-run2.log` |
| 3   | **105 passed** (3.3m)            | 0                          | `59ded0a21ad08d3ed53f596eb0789915` | `changed-5x-run3.log` |

**315 executions, 1 failure.** Markers counted with `grep -cE '^ +[0-9]+\) '` rather than the word
"failed", which also matches WebServer noise and test names.

### 4.3 The one failure, reported rather than smoothed

**Where.** Run 1, repeat 2:
`passkey.spec.ts:162 › Passkey › a passkey added to a recovery identity unlocks the SAME identity`,
inside its **fourth** `test.step` ("the recovery phrase still unlocks the same identity too"), at
`passkey.spec.ts:187` — `locator.click` 30s timeout on `getByTestId("unlock-button")`, the element
resolved but **`disabled`** for the whole budget.

**It is not at the line I edited.** The barrier inside `unlockWithPasskey()` — the site of the
comment — is exercised by this test's _third_ step, which **passed**; the failing step is the
separate raw-teardown-plus-barrier sequence at `:184-:187`, and the failure is a click on a disabled
button several statements after the barrier returned.

**Mechanism, MEASURED from the preserved error context** (copied out of `test-results/` before any
re-run, to
`/tmp/p20b-rev12-logs/error-context-run1/passkey-Passkey-a-passkey--05857-y-unlocks-the-SAME-identity-chromium-repeat2/error-context.md`
— a path **outside** the repository): the page snapshot shows the recovery-phrase credential fill
landed as a **single space-stripped token in "Word 1"**, which is marked `[invalid]`, with the
counter reading **"1 of 12 words entered"**. The unlock button is disabled because 11 word fields
are empty. **INFERRED:** the `fill()` at `:186` was split into per-word inputs by the page's
paste/spread handling on the other 314 executions and was not on this one. I did not investigate
further — it is outside this revision's scope.

**Class.** This is the **documented pre-existing WebAuthn unlock-button flake**: the same signature
— `locator.click` timeout on `getByTestId("unlock-button")` on a recovery-phrase unlock path — is
recorded at `evidence/P20B/implementation-05.md:74-80` and corroborated by root at
`PROGRESS.md:6490`. **Two differences I am flagging rather than glossing:** the prior records place
it at **two other sites** — `evidence/P20B/implementation-05.md:77-78` at the
`passkey.spec.ts:387/:401` test ("passkey-only creation … unlocks the same identity"), and
`PROGRESS.md:6490` at `passkey.spec.ts:148` during the P22 campaign — whereas this is a **third**
site, `:162/:187` (line numbers as they stand at `d80f0e4`; the prior two are in their own reports'
numbering); and neither record states the concatenated-fill mechanism above. **MEASURED**,
`grep -rl "recovery identity unlocks the SAME identity"` across `evidence/` and `reviews/` returns
**no** prior sighting of this test failing. So: same class and same signature, **new site**, and a
mechanism observation that is new as far as the committed record shows. Root may want it in the
flake register; it is not mine to fix.

**Why it cannot be attributed to this revision.** MEASURED (§1), the diff contains no executable
line. **INFERRED from that:** the tree at `d80f0e4` and the tree at `69e557e` compile to the same
test program, so this failure was available at BASE. I did not attempt to reproduce it at `69e557e`:
at 1 in 315 the run count needed to distinguish presence from absence is far beyond what a
comment-only change warrants, and I would rather state that plainly than pad the campaign.

---

## 5. Scope — what I did not touch

- **`src/`** — MEASURED empty diff. No product change of any kind.
- **`tests/e2e/helpers/persistence.ts`**, including the retry-on-absence branch.
- **Any barrier call site** — none moved, dropped or added; the four measured-unsafe sites remain
  bare, as `reviews/P20B-review-10.md` §8 requires.
- **Ledgers, reviews, frozen sources, `RISKS.md`, `QUESTIONS.md`** — not edited. Root transcribes.
- **The out-of-scope list from the dispatch** — Component 2 / crash safety (D-025), the raw-teardown
  lint rule (`Q-P20B-30`), `realtime-origin-controls.test.ts`, `transactions.spec.ts:573`,
  `duplicates.test.ts`, and the vacuously-surviving seam test. I neither fixed nor argued about any
  of them, and I make **no crash-safety claim anywhere**.

---

## 6. For root to transcribe

1. **F11-1 is remediated by one comment, in one file, with no executable change** — MEASURED, the
   diff's non-comment line count is zero (§1). The new text is quoted verbatim at §1.2 and defended
   clause by clause at §2.1.
2. **The new comment asserts no vault-state universal and no count.** The `/settings` half is kept
   because it is both measured (12/12, `reviews/P20B-review-11.md` §6) and statically decidable
   (§2.3). The bound _"at least fifteen; the sweep is not complete"_ is untouched.
3. **The load-dependence is now recorded in the code itself**, not only in the reviews — the comment
   states the predicate moved between runs at other lines in the file, so the next author cannot
   read any site's vault state as fixed.
4. **A flake-register candidate, a third site:** the documented WebAuthn unlock-button flake
   appeared at `passkey.spec.ts:162/:187` — a test with no prior recorded failure, and a site
   distinct from the two the register already carries (§4.3) — 1 in 315 executions, with a newly
   observed mechanism (the recovery-phrase `fill()` landing as one space-stripped token in Word 1,
   counter "1 of 12 words entered"). Context preserved at `/tmp/p20b-rev12-logs/error-context-run1/`
   (§4.3).
5. **Root's own ledger commit `69e557e` is the parent of my commit** (§0.1), so the review range for
   this revision is `69e557e..d80f0e4`, one file.
6. **A hygiene note on preserved E2E artifacts:** the error context in §4.3 contains the recovery
   phrase of the disposable vault that run created, carried as the credential field's accessible
   value — the `RISKS.md#R-SNAPSHOT-PHRASE-01` hazard applies to `test-results/` artifacts too, not
   only to manual `playwright-cli snapshot`. It is outside the repository, and I quote no part of it
   here.

---

## 7. Secret safety and hygiene

No vault master key, recovery phrase, `crypto_box` secret, `SUPABASE_JWT_SECRET`, presence key,
invite bearer secret or vault plaintext appears in this file. I ran **no** manual browser session
and took **no** `playwright-cli snapshot`. The only phrase-bearing artifact I handled is the
preserved error context noted in §6 item 6; it belongs to a disposable vault the suite itself
created, it lives outside the repository, and nothing from it is reproduced here.

**No database command of any kind was run** — no `db:reset`, no migration, nothing destructive.

**`:3001` was never touched.** MEASURED before and after every phase: pid 818182, cwd
`/home/ben-agents/Code/moneyflow`, alive throughout. My only port was **`:3000`**, taken and
released by Playwright's own `webServer`; MEASURED free from `ss -ltn` before run 1 and between
runs. I killed no process. Every run used `env -u CI` and `--retries=0`.

**Worktree hygiene.** `git worktree add --detach /tmp/mf-p20b-rev12 d80f0e4`; the untracked
`.env.local` copied in; `pnpm install --frozen-lockfile` — **never `cp -a node_modules`**. In the
shared checkout I ran only read-only commands plus the one `git add` / `git commit` naming my single
file explicitly — never `git add -A`, never `git stash`, never `git checkout --`.
