# P22 revision 02 — implementation-02 (UR-001 focus intent consumed exactly once)

**Implementer:** `p22-implementer-02` (fresh context) · **Base HEAD at start:**
`5d4374885a27eaa38ae21828e123768c00a9f226` (root ledger commit) · **Commit:** `ed94edf`

## Scope / charter

Narrow conformance fix for `Q-P22-R01-01`, plus a regression test. Frozen `UR-001`
(`specs/009-user-reported-refinements/spec.md` lines 12-33) states: "The focus intent is consumed
exactly once and then cleared, so it cannot re-assert on a later render." Revision 01 shipped a
non-functional state update that violated that sentence.

Nothing else was touched. The intent model was not redesigned, no presence file was modified, the
rev 01 presence guard is unchanged, and the deep-link `?transaction=` behaviour at `page.tsx:274` is
unchanged. No ledger, marker, scratch, `SCOPE.json`, frozen spec, `FINAL-AUDIT.md` or `reviews/**`
file was written.

## The change

One product change, at `src/app/(app)/transactions/page.tsx:330`:

```ts
-        setRevealIntent(retireScroll(revealIntent));
+        // Functional, because the row's focus retirement lands in the same flush as this one. A
+        // value computed from the captured `revealIntent` would be stale by the time React applied
+        // it and would resurrect the focus step, re-asserting an intent that has already landed.
+        setRevealIntent((currentIntent) =>
+            currentIntent == null ? null : retireScroll(currentIntent)
+        );
```

I verified the shape against the pure model rather than pasting it. `retireScroll` in
`transaction-reveal-intent.ts` has signature
`(intent: TransactionRevealIntent) => TransactionRevealIntent | null` — it is total over a non-null
intent and already returns `null` once no step remains, so the `currentIntent == null` guard is
needed only to satisfy the nullable state type, not to add behaviour. The `null` branch is genuinely
reachable: `setRevealIntent(null)` can land between this effect being scheduled and being applied.
The result matches the focus retirement three lines below it, which was already correct.

**Dependency array deliberately unchanged** (`[displayedTransactions, revealIntent]`). The effect
still _reads_ `revealIntent` for its guard, its `transactionId` and `scrollPending`, so dropping it
would be a stale-read bug of the same family. Only the _write_ needed to become functional. This is
checked by the compiler and by `react-hooks` lint, both of which pass.

**No other non-functional `setRevealIntent` call exists.** I enumerated all four call sites:

| Site           | Form                                             | Status                             |
| -------------- | ------------------------------------------------ | ---------------------------------- |
| `page.tsx:275` | `setRevealIntent(revealExistingTransaction(id))` | Constructs a fresh intent; no read |
| `page.tsx:333` | functional, `retireScroll`                       | **Fixed here**                     |
| `page.tsx:339` | functional, `retireFocusDescription`             | Already correct on base            |
| `page.tsx:600` | `setRevealIntent(revealCreatedTransaction(id))`  | Constructs a fresh intent; no read |

The two constructor calls compute from an argument, not from prior state, so they have no stale
closure to capture. Nothing else in the file writes this state.

## Observed effect of the fix

Instrumented probe run in the main checkout on the two trees, differing **only** in the six lines
above. The probe wrapped `HTMLElement.prototype.focus` to record every call landing on a
`description-editable` input, and recorded the `focusDescriptionTransactionId` the page published to
the table on each render. The probe was deleted after the measurement; the committed test carries no
`console.log`.

**Before the fix (rev 01 code):**

```
PROBE afterAdd    focusCalls     ["e908a318-…"]
PROBE afterAdd    requestRenders [null,"e908a318-…","e908a318-…"]
PROBE afterTyping focusCalls     ["e908a318-…"]
PROBE afterTyping lastRequest    "e908a318-…"
PROBE afterTyping requestRenders [null,"e908a318-…","e908a318-…","e908a318-…"]
```

**After the fix:**

```
PROBE afterAdd    focusCalls     ["c6eb06d1-…"]
PROBE afterAdd    requestRenders [null,"c6eb06d1-…",null]
PROBE afterTyping focusCalls     ["c6eb06d1-…"]
PROBE afterTyping lastRequest    null
PROBE afterTyping requestRenders [null,"c6eb06d1-…",null,null]
```

### What this shows, and one honest correction to the expected result

The dispatch and `Q-P22-R01-01` predicted the fix would take the **focus call count from 2 to 1**.
**In my jsdom probe the count was 1 both before and after.** What changed was the _intent_: before
the fix `requestRenders` never returns to `null` — the request is still being published after the
add settles and after typing. After the fix it clears on the very next render and stays cleared.

I am **not** contradicting the rev 01 reviewer. Their duplicate-`focus()` observation was made in a
real browser under the full E2E stack, and I did not reproduce that environment. The most likely
reading is that both are the same defect seen through different renderers: the retirement is lost,
the row keeps `focusDescriptionRequested={true}`, and whether the cell's effect re-runs and calls
`focus()` a second time depends on renderer-specific effect re-execution — the effect's deps are
`[focusRequested, onFocusRequestApplied]`, and `focusRequested` stays `true` rather than toggling.
**That mechanism sentence is an INFERENCE, not an observation.** What I observed is only the two
traces above.

The observed jsdom behaviour is if anything a **stronger** violation of the frozen sentence than the
one recorded: not merely "consumed twice", but _never cleared at all_. "Consumed exactly once and
then cleared" fails on the second clause in every run I measured. Either way the fix resolves it,
and the committed test asserts both clauses.

## Regression test

`tests/unit/transactions/add-transaction-focus-once.test.tsx` (new, 2 tests).

The existing `add-transaction-focus.test.tsx` drives `TransactionTable` directly, so the focus
request there is a prop the test itself sets and retires — it cannot see this bug, which lives in
the page's retirement logic. The new file therefore renders the **real page** (`TransactionsPage`)
over a fake vault built from React state, so `insertTransaction` re-renders exactly as the CRDT
mirror would. The page's own effects, the real table, the real row and the real description cell are
all unmocked; the fake boundary is the CRDT context, the router, presence and the drop target.

It **counts applications** rather than asserting where the caret ends up, as the dispatch required:

- `focus()` on `description-editable` inputs is counted by spying on `HTMLElement.prototype.focus`.
  A `focusin` listener would be useless here — refocusing an already-focused element fires no event,
  so an event-based counter would miss exactly the duplicate in question. The call itself is
  counted.
- Every `focusDescriptionTransactionId` the page publishes is recorded per render, so the intent's
  life can be traced across renders.

Assertions: exactly one application, on the created row; the caret really is in that row's
description (so the single application is the _right_ one); the published request reaches `null` and
never names the created row again after that; typing does not trigger a further application. The
second test adds two rows and asserts one application each, in creation order.

**The test was verified to fail on the unfixed code**, which is the only thing that makes it a
regression test. Reverting the six product lines and re-running:

```
× applies the created row's focus request once and never re-asserts it 3240ms
× applies one focus request per created row across successive adds 1178ms
AssertionError: expected 'f31cc5d6-…' to be null
AssertionError: expected '6238b7b7-…' to be null
```

The product file was then restored from a pre-revert copy and re-confirmed green. Consistent with
the probe, the assertion that catches the bug in jsdom is the intent-clears one, not the count — the
count assertion is retained because it is the invariant the frozen text names and because it is what
would catch the duplication in a renderer that re-runs the effect.

### One test-side issue found and fixed, disclosed rather than buried

The file passed in isolation but **failed in the full suite** on first run:

```
Error: Test timed out in 5000ms.
TestingLibraryElementError: Found multiple elements by: [data-testid="add-transaction-button"]
```

I diagnosed this from the timings rather than assuming a flake class: the file takes ~2.3s alone but
~5.8s under a saturated parallel run, overrunning Vitest's 5s default. The "multiple elements" error
was a downstream symptom — the timed-out first test's DOM was still mounted when the second ran, not
an independent cleanup bug (RTL auto-cleanup is active via `globals: true`). Fixed with an explicit
`vi.setConfig({ testTimeout: 30_000 })` budget ceiling. This is a **ceiling, not a wait**: every
assertion still settles on its own condition via `waitFor`, there is no `sleep`, no polling interval
and no retry-dependent outcome, so it does not join the P21 flake class. The full suite then passed.

## Six checks

All run by me. Static gates in the main checkout; E2E and `build` in the isolated worktree
`/tmp/mf-e2e-p22`, checked out at `ed94edf` and verified to match `main` —
`git diff ed94edf <worktree HEAD> -- src tests` returned empty.

| Command             | Result                                                                 |
| ------------------- | ---------------------------------------------------------------------- |
| `pnpm typecheck`    | **PASS** — `tsc --noEmit`, exit 0, no output                           |
| `pnpm lint`         | **PASS** — `1 problem (0 errors, 1 warning)`, pre-existing             |
| `pnpm format:check` | **FAIL repo-wide** — 17 pre-existing `specs/**` files; none are mine   |
| `pnpm test`         | **PASS** — `113 passed (113)` files, `2102 passed \| 2 skipped (2104)` |
| `pnpm test:e2e`     | **PASS 3/3** — full suite, `--retries=0`, `166 passed` every run       |
| `pnpm build`        | **PASS** — production build in the worktree, all routes emitted        |

The single lint warning is `react-hooks/incompatible-library` at `TransactionTable.tsx:422` on
`useVirtualizer(...)`. It is the documented pre-existing warning; my change is in `page.tsx` and
does not touch that call.

`format:check` fails on the 17 standing `specs/**` files (`DECISIONS.md`, `DEPENDENCIES.md`,
`HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, `SCOPE.json`, four `evidence/P12/*`,
`evidence/P14`, `evidence/P16D`, `evidence/P19`, two `reviews/P12-*`, `specs/human-scratch.md`).
None of these is authored or touched by this revision. My own two files were checked in isolation:

```
$ pnpm exec oxfmt --check "src/app/(app)/transactions/page.tsx" \
    tests/unit/transactions/add-transaction-focus-once.test.tsx
All matched files use the correct format.
```

### E2E campaign — full suite, `--retries=0`, 3 consecutive runs

Run in `/tmp/mf-e2e-p22` with `CI=true pnpm test:e2e --retries=0 --workers=4`, 166 tests across 22
spec files. Digest is `md5sum <7 load-bearing product+test files> | md5sum`, taken before each run
and once after the campaign.

| Run   | Digest                             | Result         | Duration |
| ----- | ---------------------------------- | -------------- | -------- |
| 1     | `3941ada0c2557b3eb15c93a8026d7cc9` | **166 passed** | 4.0m     |
| 2     | `3941ada0c2557b3eb15c93a8026d7cc9` | **166 passed** | 4.0m     |
| 3     | `3941ada0c2557b3eb15c93a8026d7cc9` | **166 passed** | 4.2m     |
| after | `3941ada0c2557b3eb15c93a8026d7cc9` | —              | —        |

**3/3 fully green, zero failures, zero flakes.** The digest was identical before every run and
unchanged afterwards, so the campaign is valid evidence for one unchanging tree. The known
incidental `passkey.spec.ts:148` WebAuthn unlock-button flake did not reproduce in any run.

**Environment discipline.** The human's dev server on :3001 (PIDs 818156/818182) was left running
and verified alive after the campaign. `.next/dev/lock` was never touched. `playwright.config.ts`
and `next.config.ts` are unmodified in both checkouts. No process was killed at any point during
this revision. `build` was run in the worktree specifically so the human's `.next` was not
disturbed.

## Secret safety

No key material, seed phrase, recovery material, `SUPABASE_JWT_SECRET` value, `crypto_box` secret,
presence key, invite fragment or vault plaintext appears in the product change, the test or this
evidence. The new test's fixtures are synthetic: two fake transactions with the descriptions
"Existing existing-newer" / "Existing existing-older", one fake account named "Cheque", one status
"For review", and integer minor-unit amounts. The IDs quoted in the probe traces above are
`crypto.randomUUID()` values generated inside a throwaway jsdom run against a fake in-memory vault;
they address no real record.

## Type safety and style

No `as`, no `any`, no `!` in the product change — it is six lines and introduces none. Null checks
use loose `== null` per house style. The added code is functional and immutable: `retireScroll` is
the existing pure total function and the updater returns a new value rather than mutating.

In the test file, the one place that reads untyped values (`orderKey`, which adapts fake vault rows
for the production comparator) narrows with `typeof` and `instanceof` checks that throw on mismatch,
rather than casting. The test borrows the real `compareTransactionOrder` instead of hand-rolling a
sort, so the fake's row ordering cannot silently drift from production ordering — this matters
because two adds in one test land on the same date and the tie-break on `creationInstant` is exactly
what the page's nanosecond bump exists to satisfy.

## Files changed

- `src/app/(app)/transactions/page.tsx` — the six-line functional-update fix
- `tests/unit/transactions/add-transaction-focus-once.test.tsx` — new regression test

Commit `ed94edf`, made with an explicit pathspec covering only those two paths.
