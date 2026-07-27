# P20B — HS-021 sweep: E2E results and manual Playwright CLI charter

Companion to `implementation-01.md` (inventory, fixes, Q-proposals). This file records the
executable evidence: automated E2E, the flake sample, and the manual browser charter.

## 1. Automated E2E

| Run                   | Result                           | Notes                           |
| --------------------- | -------------------------------- | ------------------------------- |
| Baseline at `47e197f` | **163 passed, 0 failed**, exit 0 | Pre-sweep reference             |
| Final at HEAD         | **163 passed, 0 failed**, exit 0 | Clean tree, no concurrent edits |

The count is unchanged at 163 because the sweep both added and removed one test: the new `/statuses`
lifecycle journey (+1) and the deleted vacuous "shows Saving state during active edits" test (−1),
which asserted only the resting `Saved` state and duplicated the test above it.

### Intermediate runs and why they are not evidence of breakage

Three earlier full-suite runs reported failures (10, 7 and 17) with **almost no overlap between
their failure sets** — a signature of interference, not defect. Each overlapped either a subagent
editing `src/**`/`tests/**` or a concurrent vitest run. The dev-server logs confirm it directly:
`Uncaught ChunkLoadError: Failed to load chunk ...src_app_(app)_layout_tsx...` and

```
./src/components/features/automations/rule-editor-model.ts:53:10
the name `assertNever` is defined multiple times
```

— the Turbopack dev server compiled a file mid-edit, between an import being added and the local
declaration being deleted. Once the tree was quiescent the suite was green. I am recording this
rather than quietly reporting only the final number, because "the failures were environmental" is
exactly the claim a reviewer should be able to check: the transient-compile log lines above are the
proof, and the current-state check `rg -n 'function assertNever|import.*assertNever' src` shows one
definition and six importers.

### Two real defects the intermediate runs did surface

Not everything was environmental. Running the **new** `/statuses` journey found two genuine bugs in
the new test code, both deterministic and both since fixed (commit `0d4c8d6`):

1. `statusRow` located rows by rendered text, but opening a row's editor moves the name out of the
   row text into an input value, so the locator stopped matching the row it had just opened. And
   because the add form renders its own `status-name-input`, a create that silently failed still
   satisfied the wait — the test could have passed while creating nothing.
2. The `aria-controls` assertion built a bare CSS `#id` selector from an id embedding
   colon-separated UUIDs. That is not a valid selector, so `querySelectorAll` threw:
   `'#settlement-sources-USD:ecf368a3-...:person-default-me' is not a valid selector`.

After both fixes: `people-settlement.spec.ts` passes **19/19 single-worker**.

That journey also paid for itself by exposing a live production defect — the `BehaviorSelector`
sentinel leak documented in `implementation-01.md` §2.3.

## 2. Flake sample

Retries disabled throughout (`--retries=0`); the config already sets `forbidOnly` in CI. Repeat
sampling targeted the specs with the largest blast radius from this sweep — `identity` and
`sync-persistence` because `createNewIdentity` changed and runs in ~150 setups, `transactions`
because of the grid ARIA and keyboard-shortcut changes, and `people-settlement` because it carries
the new `/statuses` coverage:

```
pnpm exec playwright test tests/e2e/identity.spec.ts tests/e2e/sync-persistence.spec.ts \
  tests/e2e/transactions.spec.ts tests/e2e/people-settlement.spec.ts \
  --retries=0 --workers=4 --repeat-each=3 --reporter=line
```

**The first sample found a real flake: 1 failed / 212 passed of 213.** It is worth recording in
full, because the first two explanations were both wrong and the third was a genuine defect the
sweep introduced.

`identity.spec.ts:570` "unlock via canonical credential fill" left `unlock-button` disabled forever.
The assertion had a 5 s budget, so the obvious reading was parallel-worker load — but raising it to
15 s failed identically, with the button still disabled after 34 polls. Not a timing budget.

The second reading was that the sweep's `src/**` changes broke unlock. Testing that without a
checkout — writing the BASE copy of the spec over the working file, running it against current
source, then restoring — gave **5/5 passing**, clearing the source changes.

That comparison was not sound, though: the base run used a `-g` filter (5 executions) while the HEAD
run executed the whole file (45). Re-running both under identical load settled it — **BASE 45/45,
HEAD 44/45** — so the regression was mine, in the spec edits. Bisecting by restoring only the three
removed `networkidle` waits returned 45/45, which identified them without yet explaining anything:
all three sit in a _different test_ from the one that failed.

The real cause is a defect those waits had been masking. `recovery-phrase-credential` is a
controlled React input, so a `fill()` landing before hydration is **dropped outright** — the DOM
value is overwritten by the next render and `onChange` never fires, so the word grid stays empty and
the button can never enable. The removed `networkidle` waits had been incidentally serialising the
run enough to hide the race. The step immediately above deliberately tests that pre-hydration race;
the failing step is the ordinary path and should not have been racing it at all.

Fixed at the cause — wait for the grid to be editable, fill, then assert the value propagated —
rather than by restoring the incidental waits or inflating the timeout, either of which would have
left a real race in place. Verified **90/90** with retries disabled at
`--workers=4 --repeat-each=10` (commit `9de7285`).

### A second, pre-existing flake

Re-running the sample after that fix produced **1 failed / 212 passed** again — but a _different_
test: `transactions.spec.ts:1882` "T026 bulk edit tags", timing out in `createTestTransaction` while
waiting for `amount-editable` inside `getByRole("row", { selected: true })`.

This one is **not attributable to the sweep**. The spec is byte-identical to BASE (`diff` over the
helper confirms it), the locator was introduced by `b5d5252` on 2026-07-25, and `aria-selected` is
untouched by this package. The header row I gave `role="row"` carries no `aria-selected`, so it
cannot match the selection filter. In isolation the bulk-edit block passes 15/15 and the whole
transactions spec passes 120/120 at `--repeat-each=3`.

The cause is a latent race in the helper: `getByRole("row", { selected: true })` is unscoped, and
Add selecting the new row while deselecting the previous one does not land in a single frame, so the
locator can briefly resolve against a stale selected row whose cells are already being torn down by
the virtualiser. Hardened by waiting for exactly one selected row before reading its cells — a
correctness fix for the helper, cheap and independent of whether this package caused the failure.

Final sample result: see §5. Every affected journey was additionally re-run individually with
retries disabled.

## 3. Manual Playwright CLI charter

Executed headless via the repository-installed `pnpm exec playwright-cli` — never `--debug`, `--ui`,
`--headed` or `show`. Sessions are uniquely named and non-persistent, and are closed with
`delete-data` afterwards; no `.playwright-cli/` artifacts remain.

See §5 for what was exercised and what was found.

## 4. Secret-safety in evidence

No vault master key, invite bearer secret, seed phrase, recovery material, `SUPABASE_JWT_SECRET`,
presence key or vault plaintext appears in this file, in captured console/network output, or in any
fixture. Console and request inspection below reports shapes and status codes, never payload
contents. The sweep also **removed** the one piece of identifying logging it found: the vault UUID
console log on registration (`ensure-default.ts`).
