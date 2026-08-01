# P22 revision 02 — independent review 02 (UR-001 focus intent consumed exactly once)

**Reviewer:** `p22-reviewer-02` (fresh context, distinct from `p22-implementer-01`,
`p22-implementer-02` and `p22-reviewer-01`) · **BASE == HEAD ==
`f97721a58a3a1878d890b49c48e49d7a9e0b5c65`** · **Commits under review:** `ed94edf` (fix + regression
test), `9b13f36` (evidence)

Both commits confirmed **ancestors of HEAD** via `git merge-base --is-ancestor` — neither is a
dangling amended commit.

## Verdict

**FAIL.**

The conformance fix itself is **correct, minimal, in scope, and genuinely guarded by a regression
test that I independently proved regresses**. Criteria 1, 2, 3, 4, 5, 6, 8 and 9 all pass, and on
criterion 4 I reached a stronger and more specific conclusion than either prior revision — see
Finding 4, which corrects the record for both rev 01 and rev 02.

The package fails on **criterion 7**. The evidence records `pnpm test:e2e` as "**PASS 3/3** — full
suite, `--retries=0`, `166 passed` every run". My own campaign on the identical tree, same command,
same digest, produced **1 failure in 6 runs**, and **both failing tests fail through this package's
own focus-based synchronisation point**, `addEmptyTransaction` / `newlyAddedRow`, introduced by rev
01's `e53a7a4`. That is not an incidental flake in another subsystem: it is a load-dependent flake
in the synchronisation primitive this package built, and it is exactly the P21 class. The evidence's
E2E claim is therefore not reproducible, and the tree is not green.

I want to be precise about what is and is not being failed. **Nothing in `ed94edf`'s six product
lines causes this.** I proved that directly: the failing locator is unchanged by rev 02, and the
duplicate-focus behaviour is identical with and without the fix. The defect is inherited from rev 01
and was not detected because rev 01's reviewer and both implementers each ran only three consecutive
passes and happened not to hit it. Root will need to decide whether to remediate under P22 or
charter it forward; my job is to report that the tree is not green and the evidence overstates.

## 1. Commands run and real output

Static gates ran in the main checkout at `f97721a`. E2E ran in the isolated worktree
`/tmp/mf-e2e-p22`, checked out at `ed94edf`, verified byte-identical to `main` — `diff -r` over
`src/` and `tests/` reported **`src IDENTICAL` / `tests IDENTICAL`**, and `git status --porcelain`
in the worktree showed only the generated `next-env.d.ts` (a Next 16 dev/build artifact, not
source).

| Command             | Result                                                                         |
| ------------------- | ------------------------------------------------------------------------------ |
| `pnpm typecheck`    | **PASS** — `tsc --noEmit`, exit 0, no output                                   |
| `pnpm lint`         | **PASS** — `1 problem (0 errors, 1 warning)`, pre-existing                     |
| `pnpm format:check` | **FAIL repo-wide** — 17 pre-existing `specs/**` files; none are this package's |
| `pnpm test`         | **PASS** — `113 passed (113)` files, `2102 passed \| 2 skipped (2104)`         |
| `pnpm test:e2e`     | **FAIL — 5/6 runs green, 1/6 red** — see below                                 |
| `pnpm build`        | **PASS** — production build in the worktree, all routes emitted                |

### Lint warning is pre-existing and unrelated

`react-hooks/incompatible-library` at `TransactionTable.tsx:422` on `useVirtualizer(...)`. The
change under review is in `page.tsx` and does not touch that call. Recorded identically by rev 01's
review.

### `format:check` — standing condition verified, not assumed

`oxfmt --check` fails on 17 files, all under `specs/**`. I verified the standing condition rather
than accepting the claim. `git diff --name-only 1e6a245 9b13f36` shows the two commits under review
touch exactly three files:

```
specs/007-human-scratch-completion/evidence/P22/implementation-02.md
src/app/(app)/transactions/page.tsx
tests/unit/transactions/add-transaction-focus-once.test.tsx
```

None of those three is among the 17. All three are format-clean:

```
$ pnpm exec oxfmt --check "src/app/(app)/transactions/page.tsx" \
    tests/unit/transactions/add-transaction-focus-once.test.tsx \
    specs/007-human-scratch-completion/evidence/P22/implementation-02.md
All matched files use the correct format.
Finished in 362ms on 3 files using 32 threads.
```

`PROGRESS.md` is among the 17 and is touched by root's ledger commits, not by these two. I confirmed
it already failed at the package base `1e6a245`:

```
$ git show 1e6a245:specs/007-human-scratch-completion/PROGRESS.md > /tmp/p22r02fmt/PROGRESS.md
$ pnpm exec oxfmt --check /tmp/p22r02fmt/PROGRESS.md
Format issues found in above 1 files.
```

### E2E campaign — full suite, `--retries=0`, 6 consecutive runs

Run in `/tmp/mf-e2e-p22` with `CI=true pnpm test:e2e --retries=0 --workers=4`, 166 tests across 22
spec files. Digest is `md5sum <7 load-bearing product+test files> | md5sum`, taken before every run.

| Run   | Digest                             | Result                   | Duration |
| ----- | ---------------------------------- | ------------------------ | -------- |
| 1     | `3a3c610723e1d415c516a15930512d7c` | 166 passed               | 4.3m     |
| 2     | `3a3c610723e1d415c516a15930512d7c` | 166 passed               | 4.4m     |
| 3     | `3a3c610723e1d415c516a15930512d7c` | **164 passed, 2 FAILED** | 4.4m     |
| 4     | `3a3c610723e1d415c516a15930512d7c` | 166 passed               | 4.2m     |
| 5     | `3a3c610723e1d415c516a15930512d7c` | 166 passed               | 4.4m     |
| 6     | `3a3c610723e1d415c516a15930512d7c` | 166 passed               | 4.0m     |
| after | `3a3c610723e1d415c516a15930512d7c` | —                        | —        |

**5/6 green, 1/6 red.** The digest was identical before every run and after the campaign, so this is
valid evidence for one unchanging tree. Note that runs 1-3 alone would have reproduced the
implementer's "3/3" only if run 3 had gone the other way — a 3-run campaign has roughly even odds of
missing a 1-in-6 flake, which is why the implementer's and rev 01 reviewer's green campaigns are not
in conflict with mine. Neither failure is the documented incidental `passkey.spec.ts` WebAuthn
flake.

**Run 3 failure 1** — `transactions.spec.ts:347` "Add reveals an ordinary row through every
excluding filter class":

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('[data-transaction-id]:has([data-testid="description-editable"]:focus)')
Expected: 1
Received: 0
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for locator('[data-transaction-id]:has([data-testid="description-editable"]:focus)')
    14 × locator resolved to 0 elements
       - unexpected value "0"

   at helpers/settlement.ts:215

  213 |     await page.getByTestId("add-transaction-button").click();
  214 |     const row = newlyAddedRow(page);
> 215 |     await expect(row).toHaveCount(1);
      |                       ^
    at addEmptyTransaction (/tmp/mf-e2e-p22/tests/e2e/helpers/settlement.ts:215:23)
    at /tmp/mf-e2e-p22/tests/e2e/transactions.spec.ts:373:39
    at /tmp/mf-e2e-p22/tests/e2e/transactions.spec.ts:418:9
```

**Run 3 failure 2** — `transactions.spec.ts:2126` T028a "bulk edit toolbar disappears when selection
cleared", downstream of the same helper:

```
Test timeout of 30000ms exceeded.
Error: locator.press: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('[data-transaction-id="1311d4f6-…"]').getByTestId('amount-editable')
    - locator resolved to <input … data-testid="amount-editable" …/>
  - elementHandle.press("Enter")
  - element was detached from the DOM, retrying

  52 |     const amountInput = addedRow.getByTestId("amount-editable");
  53 |     await amountInput.fill(data.amount);
> 54 |     await amountInput.press("Enter");
    at createTestTransaction (/tmp/mf-e2e-p22/tests/e2e/transactions.spec.ts:54:23)
```

`createTestTransaction:45` obtains its row via `await addEmptyTransaction(page)`, so both failures
enter through the same primitive.

### Environment discipline

The human's dev server on :3001 (PIDs 818156/818182) was verified alive at the end and answered
`200`; it was never signalled. `.next/dev/lock` was never touched. `playwright.config.ts` and
`next.config.ts` are unmodified in both checkouts. Every process I stopped was first confirmed via
`readlink /proc/<pid>/cwd` to have cwd `/tmp/mf-e2e-p22`; **no process under
`/home/ben-agents/Code/moneyflow` was signalled at any point.** My browser probing used a separate
port (:3458) and a separate build server (:3457), both in the worktree, both stopped afterwards, and
all three Playwright sessions were closed with `delete-data`.

## 2. Criterion findings

### Finding 1 — UR-001 conformance is now actual; the call-site enumeration is complete · PASS

`grep -n "setRevealIntent" src/app/(app)/transactions/page.tsx` returns exactly five hits, and I
checked each rather than trusting the evidence's four-row table:

| Line   | Form                                              | Verdict                                      |
| ------ | ------------------------------------------------- | -------------------------------------------- |
| `:181` | `useState<TransactionRevealIntent \| null>(null)` | the declaration, not a write                 |
| `:275` | `setRevealIntent(revealExistingTransaction(id))`  | fresh intent from an argument; no state read |
| `:333` | functional, `retireScroll`                        | **fixed here**                               |
| `:340` | functional, `retireFocusDescription`              | already correct on base                      |
| `:605` | `setRevealIntent(revealCreatedTransaction(id))`   | fresh intent from an argument; no state read |

The enumeration is complete and correct. `grep -n "revealIntent\|RevealIntent"` over the whole file
confirms nothing else writes this state. The two constructor calls take the transaction ID as an
argument and return a value computed only from it — `revealExistingTransaction` and
`revealCreatedTransaction` in `transaction-reveal-intent.ts` are total pure functions over their
argument — so neither has a stale closure to capture. The implementer's claim about `:275`, `:339`
(actually `:340`) and `:600` (actually `:605`) is accurate apart from the line-number drift, which
is immaterial.

The fix itself is right. `retireScroll` has signature
`(intent: TransactionRevealIntent) => TransactionRevealIntent | null`, so the
`currentIntent == null` guard exists to satisfy the nullable state type rather than to add
behaviour, exactly as the evidence states; and the null branch is genuinely reachable because
`setRevealIntent(null)` can land between this effect being scheduled and applied. The result is now
symmetric with the focus retirement seven lines below.

**Observable UR-001 conformance verified in a real browser**, not merely read:

- Focus intent does not re-assert on later renders. After Add I typed 25 characters — a re-render
  per keystroke, the hostile case — and the focus-call count stayed at its post-Add value with
  `value: "Coffee at the corner cafe"` and `caret: 25`. No caret theft, no lost text.
- Pre-existing selection is preserved. I built a genuine two-row selection
  (`["02c4a232","7ce29972"]`), clicked Add, and afterwards the selection was byte-identical
  (`selectionAfter: ["02c4a232","7ce29972"]`) while focus was in the **new** row's description
  (`activeIsDesc: true`, `activeRowIsNew: true`).
- The created row is never selected: `selected: 0` on every Add I performed.

### Finding 2 — the dependency array is correctly left unchanged · PASS, not a latent stale-read

The effect at `page.tsx:313-336` genuinely **reads** `revealIntent` three times before the write:
the null/`scrollPending` guard at `:314`, and `revealIntent.transactionId` at `:317`. Dropping it
from `[displayedTransactions, revealIntent]` would make those reads stale — the same defect class
just fixed, relocated. Only the _write_ needed to become functional, and only the write was changed.
This is the right call, and `react-hooks` lint agrees: the sole warning is the pre-existing
`useVirtualizer` one in a different file.

There is no latent stale-read introduced. The functional updater receives React's current state
rather than the captured binding, so the write is now independent of the closure's age; the reads
remain correctly re-run because the dependency was retained.

### Finding 3 — the regression test genuinely regresses · PASS, independently reproduced

I did **not** rely on root's or the implementer's word. I extracted `ed94edf` into a throwaway tree
(`git archive ed94edf | tar -x`), confirmed `page.tsx` matched `main`, and established a baseline:

```
$ node <repo>/node_modules/vitest/vitest.mjs run tests/unit/transactions/add-transaction-focus-once.test.tsx
 Test Files  1 passed (1)
      Tests  2 passed (2)
   Duration  3.37s
```

Then I reverted **only** the six product lines back to `setRevealIntent(retireScroll(revealIntent))`
— confirming the substitution matched exactly once — and re-ran:

```
 Test Files  1 failed (1)
      Tests  2 failed (2)
   Duration  5.66s

AssertionError: expected '9a0e6a28-fbda-481b-ad96-1a2a1bab9838' to be null
 ❯ tests/unit/transactions/add-transaction-focus-once.test.tsx:337:64
AssertionError: expected '5ea2ccf3-ea04-4ddf-a00f-c7e5b00586dc' to be null
 ❯ tests/unit/transactions/add-transaction-focus-once.test.tsx:369:64
```

**2 failed / 2 tests**, matching root's independent result. The scratch tree was then deleted. The
test is a real guard, not a test that cannot fail.

The assertion that catches the bug is the intent-clears one at `:337` and `:369`
(`expect(focusRequestRenders.at(-1)).toBeNull()`), not the count assertion — precisely as the
evidence discloses at lines 141-144. Retaining the count assertion anyway is the right choice: it is
the invariant the frozen text names, and Finding 4 shows the count is renderer-dependent, so a count
guard is worth having even where it currently cannot fail.

The test's design is sound. It renders the **real page** with only the CRDT context, router,
presence and drop target faked, so the page's own retirement effects, the real table, row and
description cell are all under test — the one level that `add-transaction-focus.test.tsx`
structurally cannot reach, because there the focus request is a prop the test itself controls.
Counting `focus()` calls rather than listening for `focusin` is also correct, and the file says why:
refocusing an already-focused element fires no event, so an event-based counter would miss exactly
the duplicate in question.

### Finding 4 — ADJUDICATION of the duplicate-`focus()` claim · resolved, and it is NOT a failure

This is the criterion root asked me to settle. I settled it by experiment, and the answer corrects
**both** prior revisions.

**The duplicate is real in a real browser — and it is unaffected by the fix.**

First, I reproduced rev 01's observation against the human's dev server on :3001 (which serves the
main checkout, i.e. the **fixed** code), wrapping `HTMLElement.prototype.focus`:

```
callCount: 2
focusCalls: [ {row:"318cf618-…", alreadyFocused:false},
              {row:"318cf618-…", alreadyFocused:true} ]
activeTestid: "description-editable"   selectedRows: 0
```

Reproduced on four separate Add clicks. So the rev 02 implementer's jsdom finding — "the count was 1
both before and after" — **does not generalise to the browser**, and their INFERENCE that the
duplicate would be resolved by the fix is **not borne out**.

But that does not make it a UR-001 violation, and this is where both prior revisions were wrong. I
ran the **A/B on one renderer**: an isolated dev server on port :3458 in `/tmp/mf-e2e-p22`, same
browser, same session, measuring three Adds with the fix and three Adds with only the six fix lines
reverted:

```
WITH_FIX add#1 => {"count":2,"already":[false,true],"rows":1,"activeIsDesc":true,"selected":0}
WITH_FIX add#2 => {"count":2,"already":[false,true],"rows":1,"activeIsDesc":true,"selected":0}
WITH_FIX add#3 => {"count":2,"already":[false,true],"rows":1,"activeIsDesc":true,"selected":0}

NO_FIX   add#1 => {"count":2,"already":[false,true],"rows":1,"activeIsDesc":true,"selected":0}
NO_FIX   add#2 => {"count":2,"already":[false,true],"rows":1,"activeIsDesc":true,"selected":0}
NO_FIX   add#3 => {"count":2,"already":[false,true],"rows":1,"activeIsDesc":true,"selected":0}
```

**Identical.** The worktree was then restored with `git checkout --` and the digest re-verified as
`3a3c610723e1d415c516a15930512d7c`, unchanged from the campaign.

The count is 2 with or without the fix, so the duplicate **cannot** be caused by the lost retirement
that `Q-P22-R01-01` blamed. Corroborating structural evidence, all measured on the fixed code:

- **Same DOM node.** Node identity tracked through a `WeakMap` gave the same `nodeId` for both
  calls.
- **One mount.** A `MutationObserver` counted `descMounts: 1` across the Add — the input is not
  remounting.
- **Same animation frame.** A `requestAnimationFrame` counter gave `frameSpan: 0`, the two calls
  6.2ms apart within one frame. A re-render-driven re-assertion would have to cross a frame
  boundary.
- **A `react.strict_mode` fiber is an ancestor** of the description input
  (`inputHasStrictModeAncestor: true`), and the page is served by a React development build
  (`reactDevBuild: true`).
- The child effect's deps are `[focusRequested, onFocusRequestApplied]`
  (`InlineEditableDescriptionAlias.tsx:146-151`), so a re-render on which `focusRequested` merely
  _stays_ `true` cannot re-fire it — which is why an "intent survived one more render" story cannot
  produce this signature.

Every one of these is the signature of **React's development-mode StrictMode effect double-invoke**,
not an intent re-assertion. I state the mechanism as a **strongly-evidenced conclusion from the A/B
plus the structural probes**, not as a bare inference: the load-bearing fact is the A/B, which is an
observation and is sufficient on its own to show the duplicate is not this package's defect. I
attempted to close the loop with a production build, where StrictMode double-invoke is absent; the
build succeeded (`pnpm build`, all routes emitted) but the production server could not create an
identity in my environment
(`Unable to create account — Unexpected token 'S', "Secure tra"… is not valid JSON`), an unrelated
API/env issue. **I therefore did not observe the production count, and I do not claim it.** The A/B
stands without it.

**Conclusion on criterion 4.** UR-001 is satisfied in both environments as a _behavioural_
requirement — the intent is consumed and cleared and does not re-assert on later renders, which I
verified in jsdom (via the regression test) and in a real browser (via typing and selection probes
above). The residual duplicate `focus()` is a dev-renderer artifact that predates this package's
fix, is invisible in the shipped product, and is inert regardless: both calls target the same
already-focused input in the same frame. **I do NOT believe the browser-level duplicate constitutes
a failure, and I explicitly do not fail the package on it.**

`Q-P22-R01-01` should be **closed as resolved-with-correction**: the wording defect it identified
was real and is now fixed, but its stated _mechanism_ ("the row keeps
`focusDescriptionRequested={true}` for one more render, the child effect re-fires, and
`input.focus()` is called a second time") is disproved by the A/B, since removing the fix does not
change the count. Rev 02's evidence should not be asked to assert the mechanism either — see
Finding 9.

### Finding 5 — scope discipline · PASS

`git diff --name-only 1e6a245 f97721a` returns exactly four paths: `PROGRESS.md` (root's ledger),
the P22 evidence file, `page.tsx`, and the new test. Specifically:

- **Intent model not redesigned.** `transaction-reveal-intent.ts` is unmodified; `git diff` over
  `src/components/features/transactions/` is empty.
- **No presence file touched.**
  `git diff --name-only 1e6a245 f97721a | grep -iE "presence|use-vault"` returns nothing.
  `presence.spec.ts`, `use-vault-presence.ts`, `presence.ts` and `helpers/presence.ts` are all
  untouched, and rev 01's presence guard in `TransactionRow.tsx` is unchanged.
- **Deep-link `?transaction=` unchanged.** `setSelectedIds(new Set([requestedTransactionId]))`
  survives verbatim at `page.tsx:274`, with the adjacent
  `setRevealIntent(revealExistingTransaction(...))` at `:275` building a scroll-only intent
  (`focusDescriptionPending: false`). Neither line is in the diff.
- `src/**` diff is 7 lines in one file; `tests/**` diff is one new file.

### Finding 6 — the `testTimeout` characterisation · CONFIRMED as a ceiling, not a wait

`vi.setConfig({ testTimeout: 30_000 })` at `add-transaction-focus-once.test.tsx:315` is correctly
characterised. I checked the file rather than accepting the label:

- Every assertion settles on its own condition through `waitFor`. There is no `sleep`, no
  `setTimeout`, no polling interval, no `vi.advanceTimers`, and no retry-dependent outcome anywhere
  in the file.
- The timeout is a per-test budget ceiling for a file that mounts the whole page twice per test. It
  changes how long a _hung_ test waits before being declared failed; it does not change what any
  passing test asserts, and it cannot convert a failing assertion into a passing one.
- This is therefore **not** a member of the P21 load-dependent flake class, which is about bare
  `toBeVisible()`-after-re-render assertions and retry-dependent outcomes. Raising a ceiling for a
  deterministic condition-settled test is the opposite pattern: it removes a load-dependent failure
  without weakening an assertion.

The file passed in all of my `pnpm test` runs, in the full 113-file suite, under the same parallel
load that originally provoked the 5s overrun.

### Finding 7 — six checks · FAIL, on `test:e2e` (see section 1)

This is the sole failing criterion and the sole reason for the verdict. Detail and verbatim output
in section 1; the finding is written up as `Q-P22-R02-01` below.

### Finding 8 — type safety and secret safety · PASS

**Type safety.** No `as`, `any`, or `!` in the product change — the diff is seven lines and
introduces none; the only `grep` hit in the `src` diff is the word "A" ending a prose comment. Null
checks use loose `== null`, per house style. The added updater is pure and immutable: `retireScroll`
is the existing pure total function and the updater returns a new value rather than mutating.

In the test file, the four `as` occurrences are all in test scaffolding, not product code, and none
is an unsound narrowing: `import type { TransactionTable as TransactionTableComponent }` is an
import alias; `[] as string[]`, `[] as Array<string | null>` and `[] as unknown[]` are empty-literal
annotations. `orderKey` — the one place reading untyped fake-vault values — narrows with `typeof`
and `instanceof` checks that **throw** on mismatch rather than casting. Borrowing the production
`compareTransactionOrder` instead of hand-rolling a sort is the right call and is load-bearing: two
adds in one test land on the same date, so the `creationInstant` tie-break is exactly what the
page's nanosecond bump exists to satisfy.

**Secret safety (BLOCKING criterion — cleared).** I scanned the full diff across code, tests and
evidence for seed phrases, mnemonics, `SUPABASE_JWT_SECRET` values, `crypto_box`/private/recovery/
presence key material, JWT literals and invite fragments. The only match is the evidence file's own
prose _declaring_ that no such material appears. Test fixtures are synthetic: two fake transactions,
one fake account "Cheque", one status "For review", integer minor units.

On the UUIDs in the evidence probe traces — I verified the implementer's claim rather than accepting
it. They are `crypto.randomUUID()` values from a jsdom run against a fake in-memory vault; the fake
`insertTransaction` in the test file builds transactions in a plain array with no persistence, and
the seeded IDs are the literals `existing-newer` / `existing-older`. They address no real record and
are not vault identifiers. I also deliberately **did not reveal the recovery phrase** in any of my
browser sessions, and all three sessions were closed with `delete-data`.

### Finding 9 — evidence honesty · PASS on labelling, with one required correction

Rev 02's evidence meets the honesty standard that rev 01 had to be corrected into, and in one
respect exceeds it.

- **The failed prediction is disclosed against the implementer's own interest.** Section "What this
  shows, and one honest correction to the expected result" states plainly that the dispatch and
  `Q-P22-R01-01` predicted a 2→1 focus-count change and that "**In my jsdom probe the count was 1
  both before and after.**" Burying that would have been easy and was not done.
- **The inference is labelled as an inference, in terms.** "**That mechanism sentence is an
  INFERENCE, not an observation.** What I observed is only the two traces above." They also state
  explicitly that they did not reproduce the browser environment and are not contradicting rev 01.
  Given Finding 4, this restraint was well-judged: the inference turned out to be wrong, and because
  it was labelled, no false claim entered the record.
- **The test-timeout issue is disclosed rather than hidden**, under a heading that says so,
  including the verbatim first-run failure, the diagnosis from timings rather than an assumed flake
  class, and the reasoning for why the downstream "multiple elements" error was a symptom.
- **The regression proof is recorded with its real output**, and the evidence is candid that the
  assertion which actually catches the bug in jsdom is the intent-clears one, not the count.
- **No retraction was needed** in rev 02, because no unsupported mechanism claim was asserted.

**Required correction (this is part of the FAIL, not a separate nit).** The evidence's E2E row —
"**PASS 3/3** — full suite, `--retries=0`, `166 passed` every run" — is **not reproducible**. I do
not allege bad faith: a 3-run campaign will miss a 1-in-6 flake about half the time, the digest
confirms we ran the same tree, and rev 01's reviewer independently got 3/3 too. But the sentence as
written tells a future reader the E2E suite is green on this tree, and it is not. Any re-issued
evidence must record the observed instability.

## Q-proposals

### `Q-P22-R02-01` — `newlyAddedRow` focus synchronisation is load-dependent (HIGH, BLOCKING)

**Category:** Test gap / P21 load-dependent flake class · **Files:**
`tests/e2e/helpers/settlement.ts:212-216`, consumed by
`transactions.spec.ts:45,125,190,217,255,272, 323,373` and `createTestTransaction:45`

`addEmptyTransaction` synchronises on the caret landing in the new row:

```ts
await page.getByTestId("add-transaction-button").click();
const row = newlyAddedRow(page); // [data-transaction-id]:has([data-testid="description-editable"]:focus)
await expect(row).toHaveCount(1); // default 5s expect timeout
```

The helper's own docstring argues this is deterministic because "focus can only land after the row
has mounted, so the caller never races the virtualizer". The mount ordering is sound, but the
_deadline_ is not: the assertion carries the default 5s `expect` timeout, and under a saturated
4-worker full-suite run the Add → CRDT insert → filter reset → page extension → virtualizer mount →
focus chain can exceed it. Observed: `14 × locator resolved to 0 elements` before timeout, i.e. it
never landed within the window, on a run where the identical tree passed five other times.

It is a genuine member of the P21 class — a bare presence-style assertion after a re-render, with a
retry-dependent outcome — and it sits in a **shared helper**, so every Add-based test inherits it.
The second run-3 failure demonstrates the blast radius: `createTestTransaction` proceeded past a
marginal focus landing and then died 30s later on `element was detached from the DOM, retrying`.

**Suggested remediation, deliberately NOT applied by me** (I am the reviewer; this needs an
implementer and a fresh review):

1. Give the focus wait an explicit, sized timeout in the helper, matching the sizing rationale
   already used at `helpers/auth.ts:32` and `:43` (`15_000`, with the comment explaining that the
   re-render can exceed the 5s default under full-suite parallel load). This is a ceiling, not a
   sleep, and does not weaken the assertion.
2. Harden the **whole class**, not this one call site, per the P21 discipline: audit every
   Add-derived synchronisation point that inherits the default `expect` timeout.
3. Validate with a **many-run full-suite `--retries=0` campaign, never in isolation** — a 1-in-6
   flake needs well more than 3 runs to call green. My 6 runs found it once; a remediation campaign
   should be sized accordingly.

**Root decision required:** whether this is remediated inside P22 (it is P22's own helper, authored
by rev 01) or chartered forward to P21 as a carry-forward. I record it as blocking the P22 rev 02
handback either way, because the tree is not green.

### `Q-P22-R02-02` — close `Q-P22-R01-01` with a mechanism correction (MEDIUM, documentation)

Per Finding 4, `Q-P22-R01-01`'s _defect_ is fixed and its _stated mechanism_ is disproved: reverting
the fix does not change the browser focus count (2 both ways). The residual duplicate is a dev-only
StrictMode artifact, is inert, and does not appear in the shipped product. Rev 01's review records
the mechanism as fact ("This is an OBSERVATION from direct instrumentation, not an inference") — the
focus-count observation was real, but the causal attribution to the stale closure was not tested by
A/B and is wrong. A future reader diffing this history would otherwise inherit a false mechanism.
Worth a one-line correction by root at integration time; not something either implementer should be
asked to change.

## Files not touched

No product, test, ledger, marker, scratch, `SCOPE.json`, spec or `FINAL-AUDIT` file was modified by
this review. The only file I wrote is this review. My mutation probe for Finding 3 ran in a
throwaway `git archive` tree outside both checkouts, since deleted. My A/B probe for Finding 4
temporarily reverted six lines in `/tmp/mf-e2e-p22` only; it was restored with `git checkout --` and
the tree digest re-verified as `3a3c610723e1d415c516a15930512d7c`, identical to the value recorded
before all six campaign runs.

**Concurrent tree drift, disclosed.** Partway through my review a concurrent P23 agent advanced
`main` past my BASE (`6e82c70`, `391bee6` for UR-002 alias-resolved search) and left a
`MUTATION-CHECK-TEMPORARY` edit in the main checkout's working tree. This does **not** contaminate
my evidence: all six E2E runs and both browser campaigns ran in the isolated worktree
`/tmp/mf-e2e-p22` pinned at `ed94edf`, whose digest was identical before and after; and I confirmed
all four focus-path files (`page.tsx`, `TransactionRow.tsx`, `InlineEditableDescriptionAlias.tsx`,
`transaction-reveal-intent.ts`) were byte-identical to `ed94edf` at the time my static gates ran.
The drift is P23's, is in the search/alias path, and is unrelated to UR-001. Root should be aware
that a `MUTATION-CHECK-TEMPORARY` line was present in the working tree of the main checkout.
