# P30 / UR-009 — implementation evidence, revision 06

- **Package/revision:** P30 / 06
- **Requirement:** `UR-009` (frozen source `specs/011-automations-conformance/spec.md`, markerless)
- **Implementer:** `p30-implementer-01`
- **BASE:** `d7fe06a` (revision 05's reviewed HEAD)
- **HEAD:** `b777d3d`
- **Commits, by explicit file list:**
    - `6b3fb57` — `fix: decide the automatic apply from live focus, not a remembered flag`
    - `b777d3d` — `test: mount the real component so the auto-apply decision is actually pinned`

## F-11 (BLOCKING) — accepted; a write-direction defect my own revision 05 made reachable

`rowLostFocus` was a latch: set once, never cleared, and read directly as the frozen `:263-266`
condition. That was nearly harmless while the observer existed only after the edit surface closed.
**Revision 05 correctly moved the mount to `isPending` so the blur could be seen at all — and that
widened the window enough for the latch to be set DURING the edit.** Tabbing out of a still-open tag
picker does it. The apply then fired on the `isEditing` transition, with the row focused again, at
the instant the controls first painted: a rule written with no window to choose a mode or dismiss.

**Fix, as the reviewer recommended: re-evaluate at apply time rather than clearing the flag.**

```
:161  const [focusSeenOutside, setFocusSeenOutside] = useState(false);   ← a wake-up, not a decision
:197  const isRowFocusLost = useCallback(…)                              ← one live reader
:222  if (isRowFocusLost()) setFocusSeenOutside(true);                   ← listeners
:248  if (!isRowFocusLost()) return;                                     ← re-read before writing
```

Two properties matter beyond the single line at `:248`:

- **The flag is renamed.** `rowLostFocus` reads as a condition, which is how a latch gets trusted;
  `focusSeenOutside` cannot be misread the same way.
- **One shared reader serves both callers.** If the listener and the apply effect each implemented
  "is focus in the row", a later change could fix one and miss the other — which is exactly how F-7
  happened, with `focusin` in the listener and nothing at apply time.

The `isEditing` guard stays and is load-bearing now: the component mounts while the edit is still in
progress, so a blur mid-edit must not write.

## F-12 (non-blocking) — and a second instance of it, which I found in my own replacement

The reviewer showed revision 05's four unit cases defined local `watches`/`paints` helpers and
imported nothing from the component: **the fix they existed to pin could be reverted with the suite
green.**

The hierarchy I had not drawn, and which I record because it cost another revision:

- **A fixture encoding my MODEL** can still fail when the model meets the world.
- **A test restating my INTENTION over local definitions cannot fail at all.** It is not a weak
  test; it is not a test. Deleting rather than adapting was correct — an adapted tautology is a
  tautology.

**Then I ran the same check on my own replacement, and it failed too.**

```
with the fix:  11 passed
fix REVERTED:  11 passed    ← identical
```

The replacement drove the real shipped predicate — a genuine improvement — **but never the effect
that consumes it.** `isFocusStillInRow` answering correctly says nothing about whether the component
asks it before writing. The revert changed only the caller, so nothing under test moved. **The gap
moved one level along with the improvement.**

`b777d3d` adds `rule-proposal-auto-apply.test.tsx`, mounting the **real** `TransactionRuleProposal`
with only `use-field-rule-proposal` and the presentational body mocked — the reviewer's own
instrument, which I should have adopted when I read it rather than citing it and building something
weaker. It walks the measured F-11 sequence: focus leaves mid-edit, returns, edit closes.

**Verified by reverting, not by reasoning:**

```
fix REVERTED:  × does NOT apply when focus left during the edit but has returned
               AssertionError: expected "vi.fn()" to not be called at all,
                               but actually been called 1 times
fix RESTORED:  3 passed
```

Tree confirmed byte-identical to `6b3fb57` afterwards.

**The rule I have adopted, and it is mechanical rather than aspirational: revert the fix, run the
tests, require red.** Four consecutive revisions produced tests that could not fail for the right
reason, and in three of them I had already written the general lesson into evidence. **Naming the
failure mode had no protective effect. Deleting a line and watching for red caught it in thirty
seconds.**

**Caveat on the new file, stated rather than hidden:** it drives the deferred focus read with fake
timers, a jsdom approximation of the browser's focus pipeline. It discriminates on the defect it
targets. **It is not a substitute for the two E2E gestures**, which remain the real check.

## F-13 (non-blocking) — closed

Both gestures revision 02's review required, and both are the shapes that blur to `<body>` — firing
`focusout` and no `focusin`, so a transition-listening implementation is deaf to them:

- a description alias committed with **Enter** (the frozen text's own worked example at `:249-251`);
- a tag change dismissed by clicking a **column header** — non-focusable, so focus lands on
  `<body>`.

I checked for an `h1` to click first, found none in this page, and used `role="columnheader"` rather
than shipping a locator I had not verified.

## Two corrections to root's dispatch, both measured

Recorded because a reviewer would otherwise inherit them.

**1. "Rebase onto current HEAD — P33's UR-012 work has landed."** It had not landed on `main`.

```
main HEAD = b777d3d                            ← this package's commit IS main HEAD
git branch --contains 12cf55b  →  p33-ur-012   ← its own branch only
main..p33-ur-012 = 3 commits, unmerged
```

There was nothing to rebase onto. Campaigned on `main` at `b777d3d`, which is the tree a reviewer of
this package sees. A campaign against a temporary merge would produce digests describing a tree that
does not exist — the same category error as certifying a tree that changed mid-campaign.

**2. "P33's campaign ran with your changes present."** Measured false, and this one mattered.

```
p33-ur-012's TransactionRuleProposal.tsx  =  d7fe06a   ← revision 05
grep 'if (!isRowFocusLost()) return;' on that branch   →  ABSENT
```

**P33's campaign exercised revision 05, not 06. The live re-read — the entire substance of this
revision — has had no E2E exposure before this campaign.** Had the claim reached the review
dispatch, a reviewer would have been told revision 06 had coverage it does not have, and the two new
gestures are precisely the tests that would have been assumed covered.

Root's diagnosis of the mechanism is the recurring one for both of us: **a claim that was true when
formed, restated later without re-measuring.** It was true while the branches were closer; the
revision 06 commit falsified it and neither of us re-checked until asked.

## INTEGRATION RISK — P33 can invalidate the premise of one of this revision's new tests

**Named concretely because it is not a general worry: it targets a specific test, a specific gesture
and a specific predicate.**

- **The test:** `rule-creation-controls.spec.ts` — _"a tag change applies when the user clicks
  non-focusable page chrome"_.
- **The gesture it depends on:** clicking a `role="columnheader"` element, which today is a plain
  `div` with no `tabindex`. Focus therefore lands on `<body>`, firing `focusout` and no `focusin` —
  precisely the shape the test exists to exercise.
- **The predicate at stake:** `isFocusStillInRow`, which decides from what focus ACTUALLY lands on.

**UR-012 enlarges cell hit areas so every control fills its cell.** If that makes a previously
non-focusable region part of a focusable control, **the same user action lands focus somewhere else
and the predicate returns a different answer.** The test would then exercise a different gesture than
the one it was written for — passing or failing for reasons unrelated to the clause.

This is the axis three defects in this package have hidden behind: not _whether_ a gesture is driven,
but _which instance_ of it. **Neither branch can observe this**, because each contains only its own
half. It is visible only on a merged tree, which is root's to produce.

**What to check at integration:** whether `role="columnheader"` and the table's empty chrome remain
non-focusable after UR-012. If they do not, this test needs a different dismissal target — and the
change must be justified rather than swapped silently, because the point of the test is the
blur-to-`<body>` shape, not the particular element.

## Gate results

| Gate                | Result                                                                 |
| ------------------- | ---------------------------------------------------------------------- |
| `pnpm typecheck`    | PASS, clean                                                            |
| `pnpm lint`         | PASS, 0 errors, 1 pre-existing `useVirtualizer` warning                |
| `pnpm format:check` | `oxfmt --check src tests` clean                                        |
| `pnpm test`         | PASS — 2449 passed, 2 skipped (shared checkout; not a P30-only signal) |
| `pnpm test:e2e`     | Campaign section below                                                 |

**The unreproduced vitest failure from revision 05 is closed as unreproduced:** N=4 further full
runs, all clean at 2448–2449. The record is one unexplained failure observed, never reproduced, name
never captured.

## Secret-safety

No vault master key, invite-fragment secret, `crypto_box` material, seed phrase, recovery material,
`SUPABASE_JWT_SECRET` or vault plaintext appears in any code, test, fixture or this file. E2E
fixtures remain synthetic inline CSV buffers. `specs/human-scratch.md` unmodified at
`469e98c7c8ee842acfc08e0844a47b4bc6495111b0463d8ca14727d3949d2f6a`.
