# P22 revision 03 — independent review 03 (UR-001 Add synchronisation hardened off transient focus)

**Reviewer:** `p22-reviewer-03` (fresh context, distinct from `p22-implementer-01/02/03` and from
`p22-reviewer-01` and `p22-reviewer-02`; I authored none of this code) · **BASE == HEAD ==
`4933e4b02af04d11c4f27ca033f4e435f6842f8a`**, confirmed by `git rev-parse HEAD` · **Commits under
review:** `476f26f` (test-infra fix), `a8bd52b` and `c8be6d0` (evidence)

All three, plus the six context commits `e53a7a4`, `e924eea`, `e04afe0`, `b40052d`, `ed94edf`,
`9b13f36`, confirmed **ancestors of HEAD** via `git merge-base --is-ancestor` — none is a dangling
amended commit.

## Verdict

**PASS.**

The rev 02 FAIL is remediated at the level of the class, not the two failing sites. The
non-converging wait no longer exists: `:has(:focus)` is gone from the synchronisation path entirely,
replaced by a one-shot `focusin` latch whose result is written to an attribute on `<html>` that only
ever goes absent → present. I verified the monotonicity argument by reading the code rather than
accepting the evidence's account of it, audited all 62 focus-related occurrences in `tests/e2e/` and
found **zero** remaining transient-state synchronisations, reproduced the falsifiability mutation
myself in a throwaway tree, ran all six checks, ran my own 6-run full-suite campaign, and manually
exercised the UR-001 flow in a browser. UR-001's focus coverage is retained, not silently dropped.

Two **non-blocking accuracy defects** in the evidence are recorded below as `Q-P22-R03-01` and
`Q-P22-R03-02`. Neither changes a conclusion, neither is a mechanism claim, and both concern counts
rather than behaviour — which is why they are Q-proposals rather than a FAIL. I also record a
**correction to root's dispatch** at criterion 8(c): the disclosure root instructed me to confirm
does not exist in the evidence, and there is no defect for it to have disclosed.

---

## 1. Commands run and real output

All six commands were run by me. E2E ran in my own worktree `/tmp/mf-e2e-p22rev3`, detached at
`4933e4b`, seeded from the main checkout's `.env.local` and a copy of `node_modules` at the
identical `pnpm-lock.yaml` (md5 `648f7b350ae4fc7a9300274aabb192e1` in all three trees). Not
`/tmp/mf-e2e-p22`, not `/tmp/mf-e2e-p22r3`, not `/tmp/mf-e2e-p23`.

| Command             | Result                                                                |
| ------------------- | --------------------------------------------------------------------- |
| `pnpm typecheck`    | **PASS** — `tsc --noEmit`, exit 0, no output                          |
| `pnpm lint`         | **PASS** — `1 problem (0 errors, 1 warning)`, pre-existing            |
| `pnpm format:check` | **FAIL repo-wide** — 17 pre-existing `specs/**` files; none are P22's |
| `pnpm test`         | **PASS** — `114 passed (114)` files, `2117 passed \| 2 skipped`       |
| `pnpm test:e2e`     | **PASS 6/6** — full suite, `--retries=0`, `166 passed` every run      |

### Lint

The single warning is `react-hooks/incompatible-library` at `TransactionTable.tsx:422` on
`useVirtualizer(...)` — a file `476f26f` does not touch, recorded identically by both prior reviews.
Zero errors.

### `format:check`

Fails on exactly 17 files, all under `specs/**`: `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`,
`PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, `SCOPE.json`, four `evidence/P12/*`, `evidence/P14`,
`evidence/P16D`, `evidence/P19`, two `reviews/P12-*`, and `specs/human-scratch.md`. This is the
documented standing condition. The two files this package changed are format-clean, which I checked
directly rather than inferring:

```
$ ./node_modules/.bin/oxfmt --check tests/e2e/helpers/settlement.ts tests/e2e/transactions.spec.ts
All matched files use the correct format.
Finished in 167ms on 2 files using 32 threads.
```

### E2E campaign — my own, 6 consecutive full-suite runs

Bar for this revision was **at least 5**. I ran 6. Command per run, identical every time:

```
env -u CI pnpm test:e2e --retries=0
```

`env -u CI` is load-bearing: `playwright.config.ts:56,60` gives 1 worker and **2 retries** under
`CI`, which would invert the required 4-worker retries-disabled profile and launder a flake into a
pass. My runner logged the environment to prove it: `=== CI env var: [<unset>] ===`.

Digest is `md5sum` over every tracked file in `src`, `tests`, `playwright.config.ts` and
`next.config.ts`, piped to `md5sum` — captured before run 1, at the top of every run, and after
run 6.

| Run    | Digest                             | Exit | Duration | Result           |
| ------ | ---------------------------------- | ---- | -------- | ---------------- |
| before | `88ff29ae54945ac0cbcf9e3bde63eff6` | —    | —        | 0 modified paths |
| 1      | `88ff29ae54945ac0cbcf9e3bde63eff6` | 0    | 255s     | **166 passed**   |
| 2      | `88ff29ae54945ac0cbcf9e3bde63eff6` | 0    | 242s     | **166 passed**   |
| 3      | `88ff29ae54945ac0cbcf9e3bde63eff6` | 0    | 234s     | **166 passed**   |
| 4      | `88ff29ae54945ac0cbcf9e3bde63eff6` | 0    | 235s     | **166 passed**   |
| 5      | `88ff29ae54945ac0cbcf9e3bde63eff6` | 0    | 237s     | **166 passed**   |
| 6      | `88ff29ae54945ac0cbcf9e3bde63eff6` | 0    | 242s     | **166 passed**   |
| after  | `88ff29ae54945ac0cbcf9e3bde63eff6` | —    | —        | —                |

The digest never drifted, so this is evidence for one unchanging tree. Sequence at
`/tmp/p22rev3-campaign.out`, per-run logs at `/tmp/p22rev3-logs/run-1..6.log`. The runner script
lives in `/tmp`, not in the worktree, so no untracked file could appear in `git status`. The only
dirty path throughout was the generated `next-env.d.ts`.

I did not accept my own green at face value. A grep for Playwright's actual failure formats and for
every rev-02 signature returns **zero occurrences in all six logs**: no `N failed`, no `N flaky`, no
`did not run`, no `interrupted`, no `Test timeout of`, no `element was detached`, no
`resolved to 0 elements`.

**Run 3 is green.** That is the run number on which rev 02's campaign failed. It proves nothing on
its own — run index is not a property of the defect — but it is worth recording that the campaign
did not stop short of the point where the previous one broke.

**What 6 green runs does and does not establish.** Against the 1-in-6 per-run rate rev 02 observed,
6 clean runs have roughly a **33% chance** (`0.833^6`) of showing zero failures by luck alone. My
campaign therefore **corroborates** the fix; it does not carry it. Combined with the implementer's
independent 8, the pooled 14 clean runs sit near 8%. I agree with the implementer that the
load-bearing argument is structural rather than statistical, and I reached that judgement by
verifying the structure myself (Finding 1) rather than by counting runs.

### Verification subagent

Verification was run through a subagent per my charter, and I re-ran the load-bearing commands
myself; the outputs above are mine.

---

## 2. Findings

### Finding 1 — the fix is correct and addresses the class · PASS

**The mechanism is genuinely monotonic.** I checked the claim rather than the prose. Three
properties have to hold, and each does:

1. **The latch is armed before the click**, `settlement.ts:284-285`. There is no window in which Add
   could focus a row before the listener exists.
2. **`focusin` is delivered, not sampled.** A caret that lands and moves on between two polls cannot
   be missed, which is precisely the failure mode `toHaveCount` on a `:focus` locator has.
3. **The recorded value is monotonic.** The ID is written to `data-e2e-latched-description-focus` on
   `document.documentElement`. `<html>` is outside React's tree, so no re-render, remount or
   virtualizer recycle can clear it; the attribute only ever goes absent → present.
   `waitForFunction` over it is therefore a converging wait in the way the old one was not.

**The pre-existing-row filter is necessary and correct.** The latch snapshots every
`[data-transaction-id]` on screen when armed and ignores focus landing in any of them. Without it
the helper would be correct only on an empty grid — and `transactions.spec.ts:259` calls it three
times in a row, `:276` a fourth with a live selection. I confirmed the filter cannot exclude the new
row: rows are keyed by `transaction.id` and render `data-transaction-id={effectiveData.id}`
(`TransactionRow.tsx:300`), and a newly inserted CRDT transaction has an ID that by construction was
not on screen a moment earlier.

**The `addTransaction` detach fix is a real second defect, correctly separated.** Enter commits and
calls `inputRef.current?.blur()` (`InlineEditableDescriptionAlias.tsx:211-214`), which re-sorts the
grid and remounts the row, detaching handles resolved against the pre-commit DOM. Settling on
`toHaveValue` before addressing the amount field is the right fix, and the implementer is right that
this is independent of how the row was located. I credit the evidence for explicitly declining to
adopt rev 02's attribution of that failure to "a marginal focus landing" — that attribution was not
verified, and saying so is the correct call.

**Class audit — verified complete, and I extended it.** The evidence claims 17 `addEmptyTransaction`
sites across 5 spec files, 1 remaining `newlyAddedRow` site, and `readTransactionId` deleted. All
three are exactly right:

- **17 call sites** across `transactions.spec.ts` (11:
  `45, 129, 194, 221, 222, 259, 276, 331, 381, 507, 872`), `import.spec.ts` (2: `807, 982`),
  `description-aliases.spec.ts` (1: `272`), `people-settlement.spec.ts` (1: `500`),
  `tab-duplication.spec.ts` (1: `150`), plus the internal call in `addTransaction`
  (`settlement.ts:294`). Every one inherits the fix unchanged, because the return type is unchanged.
- **`newlyAddedRow` has exactly 1 call site**, `transactions.spec.ts:304`, and it is
  `toHaveCount(0)` — an assertion of **absence**. This is safe in exactly the way waiting for
  presence is not: a `:focus` locator that can spuriously read 0 is a hazard only when you need it
  to read 1.
- **`readTransactionId` has zero call sites** repo-wide across `tests/` and `src/`. Correctly
  deleted rather than left as dead code.

I did not stop at the evidence's enumeration. I had every one of the **62** occurrences of
`toBeFocused`, `:focus` and `activeElement` in `tests/e2e/` classified against the distinguishing
property — _does anything later depend on this focus check having resolved in order to locate or
address a subsequent element?_ Result: **57 terminal assertions, 0 synchronisation primitives, 5
other** (the helper definition, its docstring, the `expect.poll` in `presence.spec.ts:50`, the
`blur()` reset at `import.spec.ts:1167`, and the comment at `transactions.spec.ts:279`).

The sub-pattern worth naming, because it is the closest call: roughly 20 grid-navigation and
dialog-trap sites do `await expect(x).toBeFocused()` followed by `page.keyboard.press(...)`, which
dispatches to `document.activeElement`. Mechanically the press depends on focus. I agree with
leaving them, for a reason more specific than "they are terminal assertions": in every case the
element is **named in advance** and the focus was moved by a gesture the test itself just performed,
so the check can only be racy in the benign converging direction. The pathological direction
requires a locator that _discovers_ an element through focus, and after this change no such locator
is waited on anywhere in the suite.

**No transient-state synchronisation remains in the helper path.** Confirmed.

### Finding 2 — UR-001 focus coverage is retained, not silently dropped · PASS

All five assertions exist at the claimed line numbers and assert what UR-001 requires:

| Site   | Assertion                                                       | UR-001 clause                  |
| ------ | --------------------------------------------------------------- | ------------------------------ |
| `:205` | new row's description is focused, checkbox not checked          | focus on render; not selected  |
| `:284` | focused **and** pre-existing 2-row selection survives verbatim  | selection unchanged            |
| `:333` | owner's caret is in the row while the peer is told nothing      | focus without presence leakage |
| `:397` | focused through every excluding filter class, nothing selected  | filters reset, no selection    |
| `:520` | row at index 51, past the first virtual window, holds the caret | **virtualized clause**         |

The comment at `:279-283` exists and correctly distinguishes expectation from sync primitive.

The retention argument is not merely present, it is **load-bearing and I verified why**. UR-001's
last clause is about the virtualizer, the scroll container and a real focus manager — exactly the
machinery jsdom lacks. `add-transaction-focus-once.test.tsx:51` says so in terms: "jsdom gives the
scroll container no height, so the real virtualizer mounts no rows at all", and both unit files mock
`useVirtualizer`. So `transactions.spec.ts:507-520`, which adds a row at index 51 and asserts the
caret is in it, genuinely **has no unit-level substitute**. Had this revision dropped the E2E focus
assertions, the frozen text's most environment-dependent clause would have been left unguarded. It
did not.

One observation, not a defect: `:333` uses the unscoped `owner.getByTestId("description-editable")`
rather than scoping to `createdId`. It is exact there because the preceding line pins the row count
to 1, so exactly one description input exists. Correct as written; noted only because the same line
would be ambiguous if the test later grew a second row.

### Finding 3 — scope discipline · PASS

`git show --name-only 476f26f` returns exactly two paths, both tests:

```
tests/e2e/helpers/settlement.ts
tests/e2e/transactions.spec.ts
```

No product code, no presence file, no `page.tsx` reveal-intent code, no deep-link change, no
`playwright.config.ts`, no `next.config.ts`, no `package.json`, no ledger, marker, scratch,
`SCOPE.json`, frozen spec, `FINAL-AUDIT.md` or `reviews/**` file. `a8bd52b` and `c8be6d0` touch only
`evidence/P22/implementation-03.md`, the exact dispatched path.

### Finding 4 — no arbitrary sleeps, polling loops or retry-dependence · PASS

Grep over the added lines for `waitForTimeout`, `sleep`, `setTimeout`, `retries`, `repeat-each`,
attempt loops and `while` returns **one hit, and it is the word "sleep" inside the rationale
comment**. No `--retries` dependence anywhere.

The two `15_000` values are **ceilings, not waits**, and the distinction is structural rather than
rhetorical. Both sit on genuinely converging conditions — a latch that only ever sets, and a row
count that only ever goes 0 → 1 for an ID already proven to exist. Raising a ceiling on a monotonic
condition cannot convert a failing assertion into a passing one; it can only extend how long a
_correct_ run is allowed to take. A sleep, by contrast, spends its whole budget unconditionally.
These match the sizing precedent at `helpers/auth.ts:32` and `:43` in both value and
comment-with-rationale style, and the comment names the specific chain that can exceed the 5s
default. Correctly done.

### Finding 5 — falsifiability mutation · PASS, reproduced independently

I did not accept the implementer's transcript. I reproduced it in **my own throwaway tree**
(`git archive 4933e4b` into `/tmp/mf-p22rev3-mut`, never the shared main checkout, deleted
afterwards), removing `input.focus()` from `InlineEditableDescriptionAlias.tsx:149` — verified as
exactly one changed line by diffing against `git show 4933e4b:` for that file.

```
$ env -u CI ./node_modules/.bin/playwright test tests/e2e/transactions.spec.ts \
    --grep "each Add click immediately creates a distinct ordinary empty row" \
    --retries=0 --workers=1 --reporter=line

  1) [chromium] › tests/e2e/transactions.spec.ts:189:9 › Transactions › each Add click immediately creates a distinct ordinary empty row

    TimeoutError: page.waitForFunction: Timeout 15000ms exceeded.

       at helpers/settlement.ts:270

    > 270 |     const latched = await page.waitForFunction(
        at addEmptyTransaction (/tmp/mf-p22rev3-mut/tests/e2e/helpers/settlement.ts:270:32)
        at /tmp/mf-p22rev3-mut/tests/e2e/transactions.spec.ts:194:33

  1 failed
```

**Identical to the reported result**: it fails at the latch itself, `settlement.ts:270`, for the
right reason — no `focusin` ever reaches a new row's description, so the attribute is never set. The
hardened sync point can still fail when the guarded behaviour breaks. It is not an unfalsifiable
assertion.

I also independently reproduced the honest qualification. Against the same mutation:

```
 ❯ tests/unit/transactions/add-transaction-focus.test.tsx (9 tests | 2 failed)
 ❯ tests/unit/transactions/add-transaction-focus-once.test.tsx (2 tests | 2 failed)
      Tests  4 failed | 7 passed (11)
```

**4 of 11** — exactly as disclosed. The E2E run confirms this regression rather than uniquely
discovering it, and the evidence says so unprompted.

### Finding 6 — manual feature testing · PASS

Separate from the automated suite, using the repository-installed Playwright CLI in a unique
non-persistent session (`p22rev3-manual`), against the already-running dev server on `:3001`. I did
not start or stop any server, and PID 818156 was confirmed alive and serving `200` afterwards.

I created a vault via the recovery-phrase path **without ever revealing the phrase** — the flow only
requires checking the confirmation box, so no recovery material was displayed, read or recorded.

Observed on the real Transactions page:

- **Add focuses the new row's description, and selects nothing.** After one click:
  `{focusedTestId: "description-editable", focusedRow: "7fcfaa49-…", rowCount: 1, selectedRows: 0}`.
- **Three consecutive Adds produce three distinct rows** — the pre-existing-row filter works in a
  real browser, not just in principle.
- **The selection-preservation clause holds.** With rows `7fcfaa49-…` and `f37bd860-…` selected via
  their checkboxes, clicking Add gave:
  `{focusedRow: "895a2e13-…", selectedAfter: ["7fcfaa49-…", "f37bd860-…"], newRowIsSelected: false, rowCount: 4}`.
  The prior selection survived **verbatim** and the new row was focused but unselected.
- **The caret is genuinely usable.** I typed "Manual review probe" through the real keyboard
  immediately after Add, with no intervening click, and it landed in the new row's description. That
  is the user-facing point of UR-001, and it works.
- **Persistence verified with `reload`**: the description survived, `rowCount: 4`.
- **`console error`: 0 errors, 0 warnings across 5 messages.** All tRPC calls returned `200`; the
  two requests listed without a status were in flight at teardown, not failures.

Session closed, `delete-data` run, and `.playwright-cli/` artifacts removed —
`git status --porcelain` shows the tree exactly as I found it.

### Finding 7 — type safety and secret safety (BLOCKING) · PASS

**Type safety.** No `as`, no `any`, no `!` anywhere in the diff — and no product code was touched at
all. The browser-side latch narrows with `target instanceof HTMLElement` rather than casting, reads
attributes through `getAttribute` (typed `string | null`) and null-checks with loose `== null` per
`.claude/rules/typescript-style.md`. The `waitForFunction` result is null-checked before use and the
handle is disposed with `latched.dispose()` — no leaked `JSHandle`. `pnpm typecheck` exits 0.

**Secret safety (BLOCKING — cleared).** I scanned all three commits across code and evidence for
seed phrases, mnemonics, `SUPABASE_JWT_SECRET` values, `crypto_box`/private/recovery/presence key
material, JWT literals, invite fragments and vault plaintext. The only match is the evidence's own
prose _declaring_ that no such material appears. The change adds no fixtures; its only new literals
are a DOM attribute name, a `data-testid` value and a timeout integer. No transaction IDs are
hardcoded — every one is read from the DOM at runtime. The transaction UUIDs quoted in Finding 6 are
from my own throwaway browser session against a vault I created and then deleted; they address no
persistent record and no vault of the human's. I never revealed a recovery phrase.

### Finding 8 — evidence honesty · PASS, with two count defects and one correction to the dispatch

Rev 03's evidence meets the standard. It consistently separates observation from inference, and does
so where it costs the implementer something:

- **The mechanism claim is explicitly labelled.** "**Inference, not observation:** any of these
  completing in an order that leaves the row briefly unmounted … ends the focus window. I did not
  instrument the browser to catch the window closing." Given that rev 01 and rev 02 each had a
  mechanism claim disproved and survived only because it was labelled, this restraint is exactly
  right — and this time the structural argument does not depend on the unverified interleaving.
- **(a) The statistical caveat is disclosed, unprompted and against interest.** Line 309: 8 clean
  runs have "roughly a **23% chance** (`0.833^8`) of showing zero failures by luck alone", followed
  by "it is not proof of absence, and I decline to present it as one", and the explicit statement
  that the load-bearing argument is structural. **Confirmed.** I re-derived `0.833^8 ≈ 0.232`.
- **(b) The mutation-probe qualification is disclosed.** Line 353: the probe "also fails **4 of 11**
  tests", so the E2E run "**confirms** this regression rather than uniquely discovering it". I
  independently reproduced this and got exactly 4 of 11 (Finding 5). It also records that a tidier
  mutation was tried and rejected for failing 6 unit tests. **Confirmed.**
- **It declines to inherit rev 02's unverified attribution**, saying so plainly rather than quietly
  adopting a convenient explanation.
- **The per-run table matches `/tmp/p22r3-campaign.out` exactly** — all 8 digests, exit codes and
  durations, verified field by field. I also cross-checked each on-disk log's own tail summary
  (`166 passed`, 4.3m then 3.9m ×7) and found zero failure signatures in any of the 8.

**Correction to the dispatch, criterion 8(c).** Root instructed me to confirm the evidence discloses
"a self-caught transposition of run 6/7 durations". **It does not, and there is nothing to
disclose.** Searches for `transpos`, `self-caught`, `swapped`, `transcription error` and similar
return no match anywhere in the evidence file or in the goal directory. More importantly, I checked
whether a transposition exists: for runs 6 and 7 the committed table reads 232s and 234s, and
`/tmp/p22r3-campaign.out` reads 232s and 234s — **identical, in order**. Both on-disk logs report
`166 passed (3.9m)`. There is no error, corrected or otherwise. I record this rather than passing
over it because root's framing invited me to confirm a disclosure whose absence would otherwise look
like a gap in the evidence, when in fact the evidence is accurate and the framing is not. This is
consistent with root's standing instruction that its framing is orientation, not authority.

Two real defects, both **counts, not claims**, recorded as Q-proposals below: the "40 hits" figure
(`Q-P22-R03-01`) and the four/five focus-site mismatch (`Q-P22-R03-02`). Neither is a mechanism
claim, neither changes a conclusion, and in both cases the substantive assertion is independently
verified correct. They do not rise to a FAIL, but they are the kind of imprecision that a future
reader could mistake for a verified enumeration.

---

## 3. Q-proposals for P21 carry-forward

### `Q-P22-R03-01` — the class-audit hit count is wrong, though the audit's conclusion is right (LOW, non-blocking)

**Category:** Evidence accuracy · **File:** `evidence/P22/implementation-03.md:169`

The evidence states: "`grep` for `:focus`, `activeElement` and `toBeFocused` across `tests/e2e/`
returns **40 hits**." The actual count at this HEAD is **62** — 57 `toBeFocused`, 2 `:focus`, 3
`activeElement`. I tried every plausible variant of the command that could produce 40 (restricting
to `*.spec.ts`, excluding `transactions.spec.ts`, excluding the helper, counting unique matched
texts, counting at the parent commit `0f73925`) and none yields 40. The nearest arithmetic match is
`62 − 17 − 5 = 40`, i.e. the total minus the 17 `addEmptyTransaction` sites and the 5 UR-001
assertions, which suggests a figure that was reasoned to rather than read off a command.

**This does not affect the conclusion.** I had all 62 classified independently and found **zero**
remaining synchronisation primitives, which is the claim that matters, and the evidence's
characterisation of the leftovers as terminal assertions is correct for every one of them.

**Remediation:** re-state the figure as the command's actual output, or drop the number and keep the
classification. No code change.

### `Q-P22-R03-02` — "four sites" heading over a five-row table (LOW, non-blocking)

**Category:** Evidence accuracy · **File:** `evidence/P22/implementation-03.md`, UR-001 retention
section

The prose says focus is asserted "at **four sites**", above a table whose final row lists
`transactions.spec.ts:397, 520` as one entry — five assertions in four rows. Elsewhere the dispatch
and the fix commit both correctly speak of five. All five exist and all five are correct (Finding
2); this is a row-count-versus-site-count slip in one sentence.

**Remediation:** say five, or split the last row. No code change.

---

## 4. What I did not find

No blocking issue. No product-code change smuggled into a test-infrastructure revision. No sleep, no
polling loop, no retry dependence. No `as`, `any` or `!`. No secret material. No dropped UR-001
coverage. No remaining transient-state synchronisation anywhere in `tests/e2e/`. No unlabelled
mechanism claim. No drift between the committed evidence table and the on-disk campaign output.

**P22 revision 03: PASS.**
