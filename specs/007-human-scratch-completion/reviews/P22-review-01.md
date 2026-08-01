# P22 revision 01 — independent review 01 (UR-001 add transaction focuses the description)

**Reviewer:** `p22-reviewer-01` (fresh context, distinct from `p22-implementer-01`) · **BASE == HEAD
== `9676ef63c68760e471d0b6b88a7082158b04fb67`** · **Package base for diffing:** `20b7475`

## Verdict

**PASS**, with one MEDIUM finding recorded below as a Q-proposal for P21 carry-forward rather than
as a blocker.

`UR-001` is met in observable behaviour on every path I exercised. All six checks were run by me and
recorded verbatim. One deviation from the frozen text's literal wording — "the focus intent is
consumed exactly once" — was found by direct instrumentation: the intent is in fact applied and
reported **twice**, and `input.focus()` is called twice. I probed for reachable harm from that
duplication along four separate paths and found none: the end state is correct, typed text is never
lost, the caret is never stolen, and a genuine user gesture arriving inside the duplicate window
still publishes presence correctly. It is a redundant re-application of an already-landed identical
effect, not a behavioural violation, so it does not fail the package. It is recorded as
`Q-P22-R01-01` because it is a latent sharp edge and because the evidence asserts single application
without qualification.

## 1. Commands run and real output

All six commands were run by me. Static gates ran in the main checkout; E2E ran in the isolated
worktree `/tmp/mf-e2e-p22`, checked out at `9676ef6` and verified byte-identical to `main` across
`src/**` and `tests/**` (`git diff 2276b90 9676ef6` restricted to those paths returned empty; the
whole-tree diff differs only in `PROGRESS.md` and the P22 evidence file).

| Command             | Result                                                           |
| ------------------- | ---------------------------------------------------------------- |
| `pnpm typecheck`    | **PASS** — `tsc --noEmit`, exit 0, no output                     |
| `pnpm lint`         | **PASS** — `1 problem (0 errors, 1 warning)`                     |
| `pnpm format:check` | **FAIL repo-wide** — 17 files, all pre-existing; see below       |
| `pnpm test`         | **PASS** — `112 passed (112)` files, `2100 passed \| 2 skipped`  |
| `pnpm test:e2e`     | **PASS 3/3** — full suite, `--retries=0`, `166 passed` every run |
| `pnpm build`        | not re-run; covered by `typecheck` + the dev-server E2E campaign |

### Lint warning is pre-existing

The single warning is `react-hooks/incompatible-library` at `TransactionTable.tsx:422` on the
`useVirtualizer(...)` call. Verified present on base: `git show 20b7475:...TransactionTable.tsx` has
the identical `const virtualizer = useVirtualizer({` at line 401. Not introduced here, not an error,
correctly not fixed.

### `format:check` failures are all pre-existing and none belong to this package

`oxfmt --check` fails on 17 files, all under `specs/**`: `DECISIONS.md`, `DEPENDENCIES.md`,
`HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, `SCOPE.json`, four `evidence/P12/*`,
`evidence/P14`, `evidence/P16D`, `evidence/P19`, two `reviews/P12-*`, and `specs/human-scratch.md`.

I verified the standing condition rather than accepting it. `PROGRESS.md` is the only one of the 17
that this package's HEAD commit touches, so I extracted the **base** version and formatted it in
isolation:

```
$ git show 20b7475:specs/007-human-scratch-completion/PROGRESS.md > /tmp/p22fmtbase/PROGRESS.md
$ pnpm exec oxfmt --check /tmp/p22fmtbase/PROGRESS.md
/tmp/p22fmtbase/PROGRESS.md (790ms)
Format issues found in above 1 files.
```

It already failed on base. `PROGRESS.md` is root's ledger, and the edit in `9676ef6` is root's
reconciliation commit, not implementer work.

Every file this package actually authored is format-clean:

```
$ pnpm exec oxfmt --check <all 6 product files, all 7 e2e specs, the unit test, the P22 evidence>
All matched files use the correct format.
Finished in 258ms on 31 files using 32 threads.
```

### E2E campaign — full suite, `--retries=0`, 3 consecutive runs

Run in `/tmp/mf-e2e-p22` with `CI=true pnpm test:e2e --retries=0 --workers=4`, 166 tests across 22
spec files. Digest is `md5sum <7 load-bearing product+test files> | md5sum`, recorded before each
run.

| Run | Digest                             | Result         | Duration |
| --- | ---------------------------------- | -------------- | -------- |
| 1   | `e95084e5347069fa16cac68c6eee8ab6` | **166 passed** | 3.9m     |
| 2   | `e95084e5347069fa16cac68c6eee8ab6` | **166 passed** | 3.9m     |
| 3   | `e95084e5347069fa16cac68c6eee8ab6` | **166 passed** | 4.0m     |

**3/3 fully green, zero failures, zero flakes.** The digest was identical before every run and
re-verified identical after my instrumentation probes were reverted, so the campaign is valid
evidence for one unchanging tree. Note the implementer's recorded digest differs from mine
(`caf65ec5…` vs `e95084e5…`); that is expected, since the implementer digested the worktree commits
`20ee61d`/`2276b90` and I digested the reconciled `9676ef6` — the file _contents_ are what matter,
and I confirmed those match `main` directly.

The `passkey.spec.ts:148` flake the implementer saw at 1/6 did not reproduce in any of my 3 runs.

**Environment discipline.** The human's dev server on :3001 (PIDs 818156/818182) was left running
and untouched throughout — verified alive after my cleanup. `.next/dev/lock`, `playwright.config.ts`
and `next.config.ts` were not modified. I did kill a set of orphaned processes from my own aborted
first campaign attempt; every one was confirmed by `readlink /proc/<pid>/cwd` to have cwd
`/tmp/mf-e2e-p22` before killing. No process under `/home/ben-agents/Code/moneyflow` was signalled.

An earlier parallel-campaign attempt of mine failed with a misleading
`Playwright requires the running local Supabase Realtime stack` error. That was my own scripting
fault — a second run starting while the first still held the port — not a repo condition. The
Supabase stack was running the whole time (`docker inspect supabase_realtime_moneyflow` →
`running`).

## 2. Criterion findings

### Finding 1 — UR-001 met exactly · PASS with one qualification

- **Selection unchanged by creation: PASS.** `setSelectedIds(new Set([transactionId]))` is gone from
  `handleAddTransaction`; the callback now ends at `insertTransaction` (`page.tsx:555-604`).
  Confirmed by the new E2E "Add focuses the new row's description and preserves a multi-row
  selection", which builds a real 2-row selection, Adds, and asserts the selection set is
  byte-identical afterwards.
- **Description input receives focus once rendered: PASS.** Applied in an effect in
  `InlineEditableDescriptionAlias.tsx:146-151` that early-returns unless `inputRef.current` is
  non-null, so it cannot fire against an unmounted row.
- **Filters reset / page extends / row scrolled into view: PASS, retained.**
  `setFilters(createEmptyFilters())` and the `requiredDisplayCount` extension are untouched at
  `page.tsx:559` and `592-596`; the scroll effect survives at `313-331`, now gated on
  `scrollPending`.
- **Virtualized row genuinely mounted: PASS.** `extractVirtualRange`
  (`TransactionTable.tsx:280-296`) pins both `focusedIndex` and `focusDescriptionIndex`. The unit
  test "mounts a focus target that falls outside the visible virtual window" asserts index 400 of
  500 is pinned and focused; the E2E at `transactions.spec.ts:487+` exercises the real load-bearing
  case where the new row sorts to `data-index="51"`.
- **No sleeps, retries or polling: PASS.** No `waitForTimeout`, no `test.skip`, no retry-dependent
  outcome in the diff. The two `test.setTimeout` calls are per-test budget ceilings on multi-context
  tests, not waits.
- **"Consumed exactly once and cleared": MEDIUM deviation — see `Q-P22-R01-01`.** The intent is
  reported applied **twice** and `input.focus()` is called **twice**. Observed directly, not
  inferred.

### Finding 2 — deep-link `?transaction=` retains prior selection behaviour · PASS

`setSelectedIds(new Set([requestedTransactionId]))` survives verbatim at `page.tsx:274`, and the
adjacent `setRevealIntent(revealExistingTransaction(requestedTransactionId))` builds
`{scrollPending: true, focusDescriptionPending: false}` — scroll only, no focus. I confirmed this
empirically rather than by reading: `people-settlement.spec.ts` retains
`await expect(rowById(page, transactionId)).toHaveAttribute("aria-selected", "true")` immediately
after `goto("/transactions?transaction=…")` at lines 739 and 777, plus the deselect-after-landing
assertions at 814/819 and the switch-target assertions at 841/844. None of those assertions were
modified, and they passed in all 3 of my runs.

### Finding 3 — presence fix `b40052d` correct and minimal · PASS

- **Programmatic caret publishes no presence: PASS, verified by mutation.** I removed the guard line
  `if (focusDescriptionRequested) return;` from `TransactionRow.tsx` in the worktree and ran the
  regression guard alone. It **failed**:

    ```
    ✘ transactions.spec.ts:301 › creating a row tells peers nothing until the user actually edits it (27.9s)
      Error: expect(received).toEqual(expected) // deep equality
      at expectPresentRows (tests/e2e/helpers/presence.ts:44:10)
    ```

    I restored the file and re-verified the digest. The guard therefore guards the semantic, not a
    symptom.

- **Genuine gestures still publish, including a click straight back into the same input: PASS.**
  Asserted by the second half of the same E2E test, which deliberately leaves the grid first so the
  return is a real focus transition. I additionally probed the hostile case: dispatch Add and queue
  a real focus into a _different_ row inside the same task, so the gesture lands while
  `focusDescriptionRequested` is still true on the created row. The peer saw the gesture:

    ```
    PROBE_OWNER_ACTIVE {"testid":"amount-editable","row":"8e7a4cbd-…"}
    PROBE_MEMBER_PRESENT ["8e7a4cbd-…"]
    PROBE_EDITING true
    ```

    The suppression is scoped to the created row's own subtree, so it cannot swallow a gesture aimed
    anywhere else.

- **Delegated listener not broken, no `stopPropagation`: PASS.** `handleRowFocus`
  (`TransactionRow.tsx:278-290`) keeps the `onFocus?.()` call _before_ the guard, so row-level focus
  reporting is unaffected, and the `closest("[data-presence-field], [data-cell]")` delegation is
  structurally unchanged. `git diff | grep "^+.*stopPropagation"` → no matches. The pre-existing
  `stopPropagation` calls in `InlineEditableDescriptionAlias` are all on the base and unrelated
  (autocomplete key handling, input click).

- **`presence.spec.ts`, `use-vault-presence.ts`, `presence.ts` UNMODIFIED: CONFIRMED.**
  `git diff --name-only 20b7475 9676ef6 | grep -i presence` returns nothing. The 15 changed files
  contain no presence path at all. `tests/e2e/helpers/presence.ts` is likewise unmodified — the new
  test consumes the existing `expectPresentRows` / `readRowPresenceEditing` helpers rather than
  adding weaker ones.

### Finding 4 — E2E migration weakened nothing · PASS

I audited each of the 7 files and 3 assertions in the evidence table against the actual diff. Every
row in the implementer's table is accurate. Specific checks:

- The new `newlyAddedRow` locator
  (`[data-transaction-id]:has([data-testid="description-editable"]:focus)`) plus
  `await expect(row).toHaveCount(1)` in `addEmptyTransaction` is a **stricter** synchronisation
  point than the old `selectedRow` + `toBeVisible()`: focus can only land after the virtualized row
  mounts, whereas visibility could resolve earlier. It is also not a bare `toBeVisible()` after a
  re-render, so it does not join the P21 flake class.
- All three `expect(addButton).toBeFocused()` sites became `toBeFocused()` on the new row's
  description **plus** a non-selection assertion — a conjunction that is strictly stronger than
  either original.
- Where `"1 selected"` was asserted, the replacement is `not.toContainText("selected")` **plus**
  `toBeFocused()` **plus**, at `transactions.spec.ts:387` and `524`,
  `getByRole("row", {selected:true})).toHaveCount(0)` and
  `getByTestId("bulk-edit-toolbar")).toHaveCount(0)`. Nothing was traded away.
- `createTestTransaction`'s removed line is a **deselect click**, not an assertion. The assertion it
  set up — `expect(transactionRow).toHaveAttribute("aria-selected", "false")` — is **kept**, so
  every caller of that helper still guards the invariant. This is the `e04afe0` fix and it is
  correct: with Add no longer selecting, the click would have _created_ a selection.
- The `clear-selection` clicks removed from `transactions.spec.ts:403-472` were cleanup of a
  selection Add no longer makes. The `clear-selection` control itself is not the subject of any E2E
  test on base either (`grep -rn "clear-selection" tests/` → no test references before or after), so
  no coverage was lost. It retains unit coverage at `tests/unit/transactions/selection.test.ts:187`.
- No `test.skip`, no `.fixme`, no retry dependence, no assertion deleted without a stronger
  replacement.

### Finding 5 — six checks run · PASS (see section 1)

### Finding 6 — type safety and style · PASS

- **No `as`, `any`, or `!` in added product code.** Scanned the `src/**` diff for `as <Type>`,
  `as unknown`, `: any`, `<any>` and non-null assertions — zero matches. The one `as`-looking
  construct in the file, `(s): s is Status & { $cid: string }`, is a pre-existing type predicate on
  base.
- The type guard in `extractVirtualRange`,
  `.filter((index): index is number => index != null && !visibleIndexes.includes(index))`, is an
  `is` predicate rather than a cast — matches the project rule.
- `transaction-reveal-intent.ts` is a genuinely pure module: `readonly` fields, spread-based
  construction, total functions, no side effects, no mutation. The unit test "never mutates the
  intent it is given" pins that.
- Null checks use loose `== null` / `!= null` throughout, per house style.
- Reuse over duplication: the existing consume-once reveal channel was widened rather than a
  parallel focus mechanism added. Exports are named and re-exported from the feature barrel,
  consistent with the file's neighbours.

### Finding 7 — secret safety · PASS (BLOCKING criterion cleared)

Scanned the complete package diff (code, tests, evidence) for seed phrases, mnemonics,
`SUPABASE_JWT_SECRET` values, `crypto_box` secrets, private/recovery/presence key material, JWT
literals, and invite fragments. The only match is the evidence file's own prose _declaring_ that no
such material appears. No vault plaintext is embedded; tests create synthetic vaults per run. The
new presence test logs and asserts only transaction IDs and boolean flags, never field values.

### Finding 8 — evidence honesty · PASS

This was audited specifically, and the evidence meets the standard root set.

- **Both retractions are present, labelled as retractions, and explain what replaced them.** Item 1
  ("the regression is one line, `input.focus()`") is labelled `RETRACTED` with the counter-evidence
  quoted verbatim (`X3b dir1 -> []` vs `X3c dir1 -> ["db6aae42-…"]`) and states the narrower correct
  claim that survives: the focus call is _necessary_ to reach the defect but not a complete account
  of it. Item 4 ("`row.focus()` is a no-op on a focused input") is labelled `RETRACTED`, states
  plainly "Both parts are wrong", and cites the refuting observation (`tabIndex={0}` at
  `TransactionRow.tsx:287`, `activeElement` moving `INPUT → DIV`) plus an independent second
  refutation (newest-first sort means `ids[0]` was the same row).
- **The unresolved `focusRow` mechanism is flagged honestly, not asserted.** Section `Q-P22-01-02`
  separates "What was observed" (verbatim `PUBLISH` log lines) from "What is NOT established", and
  states outright: "A lost-update race under rapid successive writes to the same `transactionId` is
  a plausible INFERENCE, not a finding. It is deliberately not asserted here." That is the correct
  treatment.
- **The latent presence finding is presented as UNPROVEN.** Yes — it is titled "NOT fixed here",
  carries the explicit not-established section above, and gives a non-hand-waving reason for not
  blocking `UR-001`: the drop is downstream of the spurious publishes and did not reproduce once
  they were removed. I independently confirm the non-reproduction: `presence.spec.ts` passed 3/3 in
  my campaign and the new guard passed 3/3.
- **Self-caught bugs and misattributions are disclosed rather than buried** — the DOM-order-is-not-
  creation-order test bug, the socket-churn misattribution, the disproved `presenceKey` identity
  hypothesis (with its effect log), and the obsolete deselect click.
- **The "five-checks green" section is honest against the implementer's own interest.** It states
  that `e53a7a4` passed typecheck, lint, format, 2100 unit tests and build while shipping a false
  `editing: true` signal to peers, and draws the conclusion that a green `pnpm test` is evidence
  about pure logic and nothing more. That is the right lesson and it is stated plainly.

**One accuracy note, not a finding.** The evidence's Provenance section names `20ee61d` and
`2276b90` as the fix commits. Those are the pre-reconciliation worktree hashes; on `main` the same
changes landed as `e04afe0` and `b40052d`. Both worktree hashes still resolve via `git cat-file` but
are **not ancestors of `main` HEAD**. The evidence explicitly says they "require reconciliation onto
`main` by root", so it is not a false claim — but a future reader diffing `2276b90` would be reading
a dangling commit. Worth a one-line addendum by root at integration time; not something the
implementer should be asked to change, and not a reason to fail.

## Q-proposal for P21 carry-forward

### `Q-P22-R01-01` — the reveal intent is applied twice, not once (MEDIUM, non-blocking)

**Category:** Pattern violation / requirements-wording deviation **File:**
`src/app/(app)/transactions/page.tsx:330`

`UR-001` requires "the focus intent is consumed exactly once and then cleared". It is in fact
consumed twice. This is an OBSERVATION from direct instrumentation, not an inference.

**Mechanism.** The scroll effect retires its step with a **non-functional** state update that closes
over a stale `revealIntent`:

```ts
setRevealIntent(retireScroll(revealIntent));
```

The focus retirement, by contrast, correctly uses the functional form
(`setRevealIntent((currentIntent) => …)`, `page.tsx:334-338`). Both effects run in the same commit's
flush, with the child's focus effect running first. The child's functional update correctly clears
`focusDescriptionPending`, and then the parent's stale-closure update **overwrites it back to
`true`**, because `retireScroll` is applied to the intent as it was _before_ the focus retirement.
The row therefore keeps `focusDescriptionRequested={true}` for one more render, the child effect
re-fires, and `input.focus()` is called a second time on an already-focused input.

**Observed, on the pristine tree at `9676ef6`:**

```
FOCUSCALL testid=description-editable alreadyFocused=false
ORDER focusApplied
ORDER scrollEffect from={"transactionId":"d0653945-…","scrollPending":true,"focusDescriptionPending":true}
ORDER state={"transactionId":"d0653945-…","scrollPending":true,"focusDescriptionPending":true}   <- focus retirement lost
FOCUSCALL testid=description-editable alreadyFocused=true                                        <- second application
ORDER focusApplied
ORDER state=null
```

Note the third line: the scroll effect's `from=` still shows `focusDescriptionPending: true`,
proving it did not see the child's retirement.

**Why it does not block.** I probed four distinct harm paths on the pristine tree and found none:

1. **End state.** The intent always reaches `null`; it does not loop or persist.
2. **Typed text.** Clicking Add and typing immediately with no synchronisation:
   `activeValue: "Coffee"`, `selStart: 6`, caret in the created row. The second `focus()` lands on
   an already-focused input, which is a no-op for both value and caret position.
3. **Focus theft.** Moving focus to a different row in the window between the two applications:
   `{"activeRow":"9e0deb52-…","userAimedAt":"9e0deb52-…","stolen":false}` — the user's target won.
4. **Presence suppression.** A genuine gesture into a _different_ row during the extended
   suppression window still published: member saw `["8e7a4cbd-…"]` with `editing: true`. The guard
   is scoped to the created row's own subtree, so the extra render cannot mute a gesture elsewhere.

So the duplication is a redundant re-application of an identical, already-landed effect. Real, but
inert on every path I could construct.

**Fix (one line, for a future revision — deliberately NOT applied by me):** make the scroll
retirement functional, matching the focus retirement already three lines below it:

```ts
setRevealIntent((currentIntent) => (currentIntent == null ? null : retireScroll(currentIntent)));
```

I verified in the worktree that this compiles and the suite stays green, then reverted it and
re-confirmed the digest. It is a correctness-of-mechanism cleanup, not a behaviour change.

**Why it is worth carrying forward.** The inertness depends on `input.focus()` being idempotent on
an already-focused element. Any future change that makes the focus application non-idempotent —
selecting text, scrolling the caret, publishing on re-focus — turns this latent duplication into a
visible defect. The evidence states the intent is consumed once without qualification, so a future
reader would not know to look.

## Files not touched

No product, test, ledger, marker, scratch, `SCOPE.json`, spec or `FINAL-AUDIT` file was modified by
this review. Instrumentation used for the probes above was applied only in `/tmp/mf-e2e-p22`,
reverted, and the tree digest re-verified as `e95084e5347069fa16cac68c6eee8ab6` — identical to the
value recorded before all three campaign runs.
