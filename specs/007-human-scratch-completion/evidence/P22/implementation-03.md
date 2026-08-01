# P22 revision 03 — implementation-03 (UR-001 Add synchronisation hardened off transient focus)

**Implementer:** `p22-implementer-03` (fresh context, distinct from `p22-implementer-01` and
`p22-implementer-02`) · **Base HEAD at start:** `0f7392574fea69b16e207d48038e5b2b341760b4` (root
ledger commit) · **Commit:** `476f26f`

## Scope / charter

This revision is a **test-infrastructure fix**, not a product fix. It remediates `Q-P22-R02-01` from
`reviews/P22-review-02.md`: the reviewer's six-run full-suite campaign at a stable digest produced
**5 green / 1 red**, and both failures in run 3 entered through this package's own synchronisation
primitive, `addEmptyTransaction` / `newlyAddedRow`, introduced by rev 01's `e53a7a4`.

**No product code was changed.** The UR-001 conformance work from revisions 01 and 02 is correct and
independently reviewed — review 02 passed criteria 1-6, 8 and 9 — so I did not redo or redesign it.
`git diff --name-only 0f73925 476f26f` returns exactly two paths, both tests:

```
tests/e2e/helpers/settlement.ts
tests/e2e/transactions.spec.ts
```

No presence file, no `page.tsx`, no reveal-intent model, no deep-link path, no
`playwright.config.ts`, no `next.config.ts`. No ledger, marker, scratch, `SCOPE.json`, frozen spec,
`FINAL-AUDIT.md` or `reviews/**` file was written.

## The defect, and why it is not merely a short timeout

`Q-P22-R02-01` suggested raising the helper's `expect` timeout to `15_000`. I looked at the failure
first, and concluded that a larger timeout alone would have been the wrong fix — it would have made
the flake rarer without removing its cause. I state the reasoning below as **analysis of the
recorded evidence**, and mark separately what I verified by reading the code.

The old helper was:

```ts
await page.getByTestId("add-transaction-button").click();
const row = newlyAddedRow(page); // [data-transaction-id]:has([data-testid="description-editable"]:focus)
await expect(row).toHaveCount(1); // default 5s expect timeout
```

**Focus is transient; a row count is monotonic.** `toHaveCount` polls, and polling converges only if
the predicate, once true, stays true. `[…]:has(…:focus)` is true only while the caret is still in
that input. So this locator can go true and then false again, and a poll that samples on either side
of that window sees zero both times. That is a materially different failure mode from "the deadline
was too short": the assertion can fail after the behaviour under test has already succeeded.

What I verified in the code rather than inferred:

- `InlineEditableDescriptionAlias.tsx:146-151` — the focus effect runs on mount and calls
  `onFocusRequestApplied()` immediately, so the intent is retired in the same commit the caret
  lands. Nothing re-asserts it afterwards; if focus leaves, it does not come back.
- `TransactionTable.tsx:422-429` — the grid is virtualized (`useVirtualizer`, `overscan: 5`,
  `useFlushSync: true`) and rows are keyed by `transaction.id`. A row scrolled out of the window is
  unmounted, taking its focused input with it.
- `page.tsx:563-612` — Add resets the filters, extends `displayCount`, inserts into the CRDT and
  sets the reveal intent. The scroll effect at `:316-339` then moves `scrollTop` directly.

So between the click and the poll there is a filter reset, a page extension, a CRDT insert, a
virtualizer mount and a programmatic scroll. **Inference, not observation:** any of these completing
in an order that leaves the row briefly unmounted, or any later commit remounting the input, ends
the focus window. I did not instrument the browser to catch the window closing — I did not need to
in order to choose a synchronisation primitive that is immune to it, and I do not claim to have
observed the specific interleaving that produced the reviewer's run-3 failure.

The reviewer's evidence is consistent with this and hard to explain by deadline alone:
`14 × locator resolved to 0 elements` across the full 5s window. A row that was simply slow would
show the locator resolving late; a run that never resolves once, on a tree that passed five other
times, is what a closed window looks like.

## The fix

### 1. Synchronise on monotonic state (`helpers/settlement.ts`)

Identification and synchronisation are now separate concerns. The caret is captured **the instant it
lands**, by a one-shot `focusin` listener armed before the click; everything after that waits on the
row's stable `data-transaction-id`.

```ts
await latchNextDescriptionFocus(page);
await page.getByTestId("add-transaction-button").click();
const latched = await page.waitForFunction(
    (attribute) => document.documentElement.getAttribute(attribute),
    LATCHED_ROW_ATTRIBUTE,
    { timeout: 15_000 }
);
…
await expect(rowById(page, transactionId)).toHaveCount(1, { timeout: 15_000 });
```

`focusin` is the right primitive for two independent reasons:

- **It is delivered, not sampled.** A focus that lands and moves on between two polls cannot be
  missed, because the listener runs on the event loop at the moment focus lands.
- **It converts an instant into monotonic state.** The ID is written to an attribute on `<html>` —
  outside React's tree, so no re-render or remount can clear it. The attribute only ever goes absent
  → present, so `waitForFunction` on it genuinely converges.

The latch **ignores rows already on screen** when it is armed. Only a row that does not exist yet
can be the one Add is about to create, so a caret returning to a row the caller was previously
editing cannot be mistaken for the new row. Without this the helper would be correct only when
called on an empty grid, and `transactions.spec.ts:253-255` calls it three times in a row.

`newlyAddedRow` is **retained and still exported**, with its docstring corrected to say it is a
locator over transient state, to be asserted rather than synchronised on. It is used that way at
`transactions.spec.ts:304`, where `toHaveCount(0)` asserts the caret is _no longer_ in the created
row — an assertion about transient state that is correct precisely because the intent is
consume-once.

`readTransactionId` was **deleted**. It existed only to serve the old focus-locator path, and after
this change had zero call sites repo-wide, verified by grep over `tests/` and `src/`.

### 2. Sized waits, with rationale

Both waits carry an explicit `15_000` ceiling in the style of `helpers/auth.ts:32` and `:43`, with a
comment naming the chain that can exceed the 5s default under full-suite parallel load. These are
**ceilings on converging waits**, not sleeps and not retries: there is no `waitForTimeout`, no
polling loop, no `--retries` dependence anywhere in the change. Raising a ceiling on a monotonic
latch cannot convert a failing assertion into a passing one, because the latch is only ever set by a
real focus event on a real new row.

### 3. The second failure: detach on commit

Run 3's second failure was a 30s test timeout at `createTestTransaction:54` with
`element was detached from the DOM, retrying`, downstream of the same helper. This is a distinct
mechanism from the first and needed its own fix. Committing a description with `Enter` re-sorts the
grid and remounts the row, invalidating handles resolved against the pre-commit DOM. Both
description-then-amount sequences now settle on the committed value before addressing the next
field:

```ts
await descriptionInput.press("Enter");
await expect(descriptionInput).toHaveValue(data.description);
```

Fixed at `transactions.spec.ts:51-54` (`createTestTransaction`, the exact failing site — the
assertion is at `:54` post-change) and at `helpers/settlement.ts` in `addTransaction`, which had the
identical unguarded sequence.

**Honest characterisation:** review 02 attributed this second failure to `createTestTransaction`
having "proceeded past a marginal focus landing". I do not think that is the whole story, and I did
not verify it. The detach is explained by the commit-driven remount on its own, independently of how
the row was located. I have fixed it as its own defect rather than assuming the helper fix resolves
it.

## Class audit

`Q-P22-R02-01` required hardening the whole class, not the two failing sites. I enumerated every
call site and every other helper synchronising on transient state.

**`addEmptyTransaction` — 17 call sites across 5 spec files**, all of which inherit the fix with no
change at their call sites, because the return type is unchanged:

| File                          | Sites                                                  |
| ----------------------------- | ------------------------------------------------------ |
| `transactions.spec.ts`        | `45, 129, 194, 221, 222, 259, 276, 331, 381, 507, 872` |
| `import.spec.ts`              | `807, 982`                                             |
| `description-aliases.spec.ts` | `272`                                                  |
| `people-settlement.spec.ts`   | `500`                                                  |
| `tab-duplication.spec.ts`     | `150`                                                  |

Plus `addTransaction` → `createTransaction` in the helper itself, and `createTestTransaction` in
`transactions.spec.ts`, which together cover roughly 60 further transaction creations.

**`newlyAddedRow` — 1 remaining call site**, `transactions.spec.ts:304`, which is an assertion of
absence and is correct as-is (see above).

**Other transient-state synchronisation, checked and left alone.** `grep` for `:focus`,
`activeElement` and `toBeFocused` across `tests/e2e/` returns 40 hits. I inspected them and did not
change any, because none is used as a _synchronisation primitive for a subsequent step_ — they are
all terminal assertions about focus after a deliberate keyboard or pointer gesture the test itself
just performed (grid arrow navigation, Tab, click-to-edit), where the caret is not going anywhere.
The distinguishing property of the defect was a `:focus` locator standing between a click and the
rest of a helper. That pattern existed in exactly one place and is now gone.

`readSelectedRowIds` and `helpers/presence.ts` read state at a point in time but are called only
inside `expect.poll` or after an already-settled condition, so they are not in this class.

## UR-001 focus coverage is retained, not silently dropped

Removing focus from the _synchronisation_ path would be worthless if it also removed focus from the
_assertions_. It does not. The E2E layer still asserts UR-001's focus clause at four sites, all
unchanged by this revision:

| Site                            | What it asserts                                                          |
| ------------------------------- | ------------------------------------------------------------------------ |
| `transactions.spec.ts:205`      | Add focuses the new row's description                                    |
| `transactions.spec.ts:284`      | …while a pre-existing multi-row selection survives verbatim              |
| `transactions.spec.ts:333`      | …and the peer is told nothing about it (presence guard)                  |
| `transactions.spec.ts:397, 520` | …through every excluding filter class, and past the first virtual window |

I added a comment at `:280-283` recording _why_ focus is asserted there but not synchronised on in
the helper, so a future reader does not "helpfully" reunify them.

**Why the E2E layer keeps this rather than delegating entirely to the unit tests, as the dispatch
invited me to consider.** `add-transaction-focus.test.tsx` controls the focus request as a prop, so
it cannot prove the page produces one; `add-transaction-focus-once.test.tsx` renders the real page
and does prove consume-once, but in jsdom, where there is no virtualizer, no scroll container and no
real focus manager. UR-001's last clause — "the row is virtualized: focus must occur only when the
row is actually mounted, and the scroll-into-view must not leave the row unmounted or the focus
lost" — is a statement about exactly the machinery jsdom lacks. `transactions.spec.ts:507-520` adds
a row at index 51, well past the first virtual window, and asserts the caret is in it. That
assertion has no unit-level substitute, so dropping the E2E focus coverage would have left the
frozen text's most environment-dependent clause unguarded. `toBeFocused` as an _expectation_ is also
not the defect: the defect was making a passing test's progress depend on transient state, not
asserting that state.

## Checks

Static gates run in the main checkout at `476f26f`.

| Command             | Result                                                                 |
| ------------------- | ---------------------------------------------------------------------- |
| `pnpm typecheck`    | **PASS** — `tsc --noEmit`, exit 0, no output                           |
| `pnpm lint`         | **PASS** — `1 problem (0 errors, 1 warning)`, pre-existing             |
| `pnpm format:check` | **FAIL repo-wide** — 17 pre-existing `specs/**` files; none are mine   |
| `pnpm test`         | **PASS** — `114 passed (114)` files, `2117 passed \| 2 skipped (2119)` |
| `pnpm test:e2e`     | see campaign section below                                             |

The lint warning is `react-hooks/incompatible-library` at `TransactionTable.tsx:422` on
`useVirtualizer(...)` — pre-existing, in a file this revision does not touch, and recorded
identically by both prior reviews.

`format:check`'s repo-wide failure is the documented standing condition on frozen `specs/**` files.
My two changed files are format-clean, checked directly:

```
$ pnpm exec oxfmt --check tests/e2e/helpers/settlement.ts tests/e2e/transactions.spec.ts
All matched files use the correct format.
```

## Type safety and secret safety

**Type safety.** No `as`, no `any`, no `!` anywhere in the diff. The browser-side latch narrows with
`target instanceof HTMLElement` rather than casting, and reads attributes through `getAttribute`,
which is typed `string | null` and is null-checked with loose `== null` per house style. The
`waitForFunction` result is null-checked before use and the handle is disposed. No product types
were touched.

**Secret safety (BLOCKING — cleared).** The diff contains no key material, seed phrase, recovery
material, `SUPABASE_JWT_SECRET` value, presence key, invite fragment or vault plaintext. The change
adds no fixtures; the only new literals are a DOM attribute name
(`data-e2e-latched-description-focus`), a `data-testid` value, and a timeout integer. No transaction
IDs are hardcoded — every one is read from the DOM at runtime, which is the point of the helper.

## E2E campaign

Run in the isolated worktree `/tmp/mf-e2e-p22r3`, detached at `476f26f`, verified `src IDENTICAL` /
`tests IDENTICAL` against the main checkout before starting. **8 consecutive full-suite runs, all
green.** The bar was raised to 8 for this revision because every prior campaign ran only 3 and each
one missed the flake.

Command, identical every run:

```
env -u CI pnpm exec playwright test --retries=0 --workers=4 --reporter=line
```

`env -u CI` is load-bearing and not cosmetic. `playwright.config.ts:56,60` gives **1 worker and 2
retries** when `CI` is set — the inverse of the required profile, and retries would launder a flake
into a pass. `CI=true` was used for `pnpm install` only.

Digest is `md5sum <the 7 load-bearing product+test files> | md5sum`, captured before run 1, at the
top of every individual run, and after run 8:

| Run    | Digest                             | Exit | Duration | Result           |
| ------ | ---------------------------------- | ---- | -------- | ---------------- |
| before | `93d8e0e188d51feb7917840532782843` | —    | —        | 0 modified paths |
| 1      | `93d8e0e188d51feb7917840532782843` | 0    | 259s     | **166 passed**   |
| 2      | `93d8e0e188d51feb7917840532782843` | 0    | 234s     | **166 passed**   |
| 3      | `93d8e0e188d51feb7917840532782843` | 0    | 232s     | **166 passed**   |
| 4      | `93d8e0e188d51feb7917840532782843` | 0    | 238s     | **166 passed**   |
| 5      | `93d8e0e188d51feb7917840532782843` | 0    | 234s     | **166 passed**   |
| 6      | `93d8e0e188d51feb7917840532782843` | 0    | 232s     | **166 passed**   |
| 7      | `93d8e0e188d51feb7917840532782843` | 0    | 234s     | **166 passed**   |
| 8      | `93d8e0e188d51feb7917840532782843` | 0    | 237s     | **166 passed**   |
| after  | `93d8e0e188d51feb7917840532782843` | —    | —        | —                |

The digest never drifted, so this is valid evidence for one unchanging tree. Per-run logs are on
disk at `/tmp/p22r3-logs/run-1..8.log`, with the sequence at `/tmp/p22r3-campaign.out`. The runner
script was deliberately kept in `/tmp` rather than inside the worktree, so no untracked file could
appear in `git status` and undercut the unchanging-tree claim.

### I did not accept my own green at face value

A deliberately broad failure grep matched **all eight** logs, so I ran it to ground rather than
reporting green over an unexamined match. It was 402 occurrences of the string `" failed"`, every
one benign, in two classes:

- `[WebServer] ⚠️ tRPC failed on realtime.revoke: Request authentication failed` and siblings —
  server-log noise from the unauthenticated phases of onboarding tests, present in passing runs.
- Two **test names** that contain the word: `onboarding-vault.spec.ts:63` "failed registration
  leaves no signing session…" and `undo-redo.spec.ts:311` "a failed offline undo push retries on
  browser reconnect…".

Greps for Playwright's actual failure formats return **NONE in any of the eight logs**: no
`N failed`, no `N flaky`, no `did not run`, no `interrupted`. Nor any rev-02 signature — no
`Test timeout of`, no `element was detached`, no `resolved to 0 elements`. Exit codes were
`8 × exit=0`.

`next-env.d.ts` shows modified in the worktree throughout. It is a Next 16 dev artifact that
rewrites its own import from `./.next/types/routes.d.ts` to `./.next/dev/types/routes.d.ts` on first
dev-server boot. Generated, not source, not among the seven digest files, and recorded identically
by rev 02's reviewer.

### What 8 green runs does and does not establish

**It corroborates the fix; it does not carry it.** Against the 1-in-6 per-run failure rate the
reviewer observed, eight clean runs have roughly a **23% chance** (`0.833^8`) of showing zero
failures by luck alone. That is much stronger than the 3-run campaigns that repeatedly missed the
flake, but it is not proof of absence, and I decline to present it as one. Independently, P23's
implementer ran four full-suite runs on a tree containing rev 02 and saw zero occurrences — also
consistent with a low base rate rather than with absence.

The load-bearing argument is **structural, not statistical**: the wait that failed no longer exists.
`:has(:focus)` has been removed from the synchronisation path entirely and replaced by a latch that
cannot un-set. A campaign cannot prove a rare flake gone; removing the non-converging wait can.

### Falsifiability check — the hardened helper still fails when the behaviour breaks

8/8 green proves the suite passes. It does not prove the new sync point can still **fail**, and a
sync point that cannot fail is an unfalsifiable assertion rather than a fix. So I mutated the
behaviour the helper guards and confirmed it fails.

Run **after** the campaign, in my own worktree, never the shared main checkout. The mutation removes
`input.focus()` from the description cell's focus-request effect
(`InlineEditableDescriptionAlias.tsx:149`), leaving the intent still produced and still retired but
the caret never moving — exactly one line, verified by `git diff --stat` as
`1 insertion(+), 1 deletion(-)`.

```
$ env -u CI pnpm exec playwright test tests/e2e/transactions.spec.ts \
    --grep "each Add click immediately creates a distinct ordinary empty row" \
    --retries=0 --workers=1 --reporter=line

    TimeoutError: page.waitForFunction: Timeout 15000ms exceeded.

       at helpers/settlement.ts:270

      270 |     const latched = await page.waitForFunction(
          |                                ^
        at addEmptyTransaction (/tmp/mf-e2e-p22r3/tests/e2e/helpers/settlement.ts:270:32)
        at /tmp/mf-e2e-p22r3/tests/e2e/transactions.spec.ts:194:33

  1 failed
```

It failed at **the latch itself**, for the right reason: no `focusin` ever reaches a new row's
description, so the attribute is never set and `waitForFunction` exhausts its 15s ceiling. The
helper is falsifiable.

**Honest qualification, measured rather than assumed.** I initially expected this mutation to be
caught only in the browser. I checked, and it also fails **4 of 11** tests across
`add-transaction-focus.test.tsx` and `add-transaction-focus-once.test.tsx`, because jsdom has a real
focus manager. So the E2E run **confirms** this regression rather than uniquely discovering it. I
also tried the tidier-looking mutation — `revealCreatedTransaction` returning
`focusDescriptionPending: false` — and rejected it precisely because it fails 6 unit tests and so
never reaches the browser at all, making it useless for testing the E2E layer. The probe still
answers the question it was chosen for: whether the hardened helper fails when the guarded behaviour
breaks. It does.

The worktree was restored with the same script's `restore` action, and the digest re-verified as
`93d8e0e188d51feb7917840532782843` — identical to the value held throughout the campaign. Post-
restore `git status --porcelain` shows only the generated `next-env.d.ts`.
