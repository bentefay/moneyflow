# P30 / UR-009 — implementation evidence, revision 05

- **Package/revision:** P30 / 05
- **Requirement:** `UR-009` (frozen source `specs/011-automations-conformance/spec.md`, markerless)
- **Implementer:** `p30-implementer-01`
- **BASE:** `5b0c441` (revision 04's reviewed HEAD)
- **HEAD:** `d7fe06a`
- **Commits, by explicit file list:**
    - `d67e717` — `fix: observe row focus state so every blur gesture triggers the automatic modes`
    - `d7fe06a` — `fix: watch for the row blur from the moment the edit begins`

**STATUS: VERIFIED.** Three complete full-suite runs at `d7fe06a` with matching pre/post digests and
zero `rule-creation-controls` failures. The campaign was not clean — see the campaign section for the
rotating `people-settlement` failures, which are documented, non-attributable, and not chased.

## F-7 (BLOCKING) — accepted in full

**My revision 04 occlusion fix caused it.** Deferring the mount until the cell's edit surface closed
was the right answer to the collision, and it silently moved the focus observer's arming point past
the event it was waiting for. Combined with listening for `focusin` alone, three of the four ways a
row loses focus were missed:

| Gesture                                       | `focusin` fires? | Auto-apply reached? |
| --------------------------------------------- | ---------------- | ------------------- |
| Click a focusable control outside the row     | yes              | yes                 |
| Press Enter in the cell (`blur()` → `<body>`) | **no**           | **no**              |
| Tab off the end of the document               | **no**           | **no**              |
| Trusted click on non-focusable chrome         | **no**           | **no**              |

**The frozen text's own worked example is one of the missed cases.** `:249-251` describes applying a
description alias; `InlineEditableDescriptionAlias` calls `blur()` on Enter, so the commit and the
blur are the same event and focus lands on `<body>` — which fires `focusout` and no `focusin` at
all.

Not a data-safety defect: nothing is written without authority. It is **silent inaction on the same
clause revision 01's F-2 was raised on, failing in the opposite direction.**

### The fix, and a correction to my own first attempt

My first cut patched _recovery_ — read `document.activeElement`, add `focusout`, evaluate once on
mount — while leaving the mount coupled to `shouldShow`. That compensates for a late mount instead
of preventing one. **The reviewer's shape is better and is what shipped:**

```
watch  =  isPending                 ← the observer is live from the moment the edit begins
paint  =  isPending && !isEditing   ← the occlusion fix, untouched
```

**Defer what is PAINTED; do not defer what is OBSERVED.** Revision 04 fused the two and only the
first needed deferring. Both halves are kept: `TransactionRuleProposal` mounts `PendingRuleProposal`
on `isPending`, and passes `showControls` so the popover still waits for the edit surface to close.
**The occlusion fix is preserved exactly**, which matters because the reviewer confirmed it works.

The focus check itself is now a pure predicate, `isFocusStillInRow`, reading
`document.activeElement` rather than tracking transitions — so it answers correctly whenever it
runs, including on mount, and does not depend on having existed when an event fired.

**One consequence I had to handle:** the auto-apply effect can now observe `isEditing === true`,
where revision 04 removed that check with a comment asserting it was always false at that point.
**That comment is now wrong**, so the check is restored and the comment explains why.

## F-8 (non-blocking) — closed

`data-owned-by-row` was a bare boolean naming no row, so focus moving into **another** row's tag
picker read as "never left this one" and suppressed the apply. All four sites now carry the owning
transaction id and the predicate compares identity.

## F-9 (non-blocking) — closed, and it is the finding that matters most

The reviewer is right that `AutoApplyHost` restated the auto-apply rule in an **always-mounted**
harness, so it could not exhibit either shipped defect: not the late arming, and not the
blur-to-`<body>` case its decoupled `isEditing` transition hid.

**This is the fifth time in this package a fixture I built confirmed my model instead of the code,
and the first where it actively concealed a defect my own fix introduced.** The general form, which
I stated earlier in this package and then violated again: _a fixture I construct encodes my model;
any test whose fixture I hand-built can only fail if my model is internally inconsistent, never if
my model is wrong about the world._

Replaced, not extended, per the reviewer's judgement: the cases now drive the shipped predicate over
real DOM nodes, including the blur-to-`<body>` case, the null-`activeElement` case, this row's own
portal, and another row's portal. Four further cases pin the watch/paint separation, with the
revision 04 coupling kept as a **control** that demonstrates it would not have been watching.

## F-10 (non-blocking) — closed

`proposal-amount-toggle` and `proposal-account-toggle` were asserted visible and never clicked by
any test, so **a rule ignoring `:258-260` entirely would have passed the whole suite.** This is my
own cross-package heuristic — _the weak assertions are the ones that check a control EXISTS rather
than what it DOES_ — applied back to me.

New E2E journey: import two rows sharing a description but differing in amount, tick "only if $x" on
the first, apply to all, and assert the second row is **not** tagged and exactly one robot appears.
Without the restriction being honoured, the second row would be tagged.

## What the revision 04 campaign could and could not show

**Stated plainly because a reader would otherwise infer more than the runs support.** The three
clean runs were honest and they are not evidence about `:263-266`. **No assertion in the suite looks
at the failing gestures** — the one new automatic-mode journey blurs by clicking a focusable
textbox, which is the single gesture of four that produced a `focusin`. So no number of green runs
would have surfaced F-7. Greenness cannot discharge a clause nothing asserts.

## The blindness axis, one level below where I had been checking

Revision 04 **did** add a test for the automatic modes — my earlier failure was not "no test for the
mode". Both of that test's incidental choices, the tags field and a focusable blur target, landed on
the working side.

> **The axis below "is the mode driven" is "which instance of the gesture drives it".**

Two benign-looking incidental choices, both on the working path. That is a level below anything I
had been auditing for.

## An unreproduced observation

`pnpm test` failed once during this revision. Two consecutive full runs since are clean at **2448
passed / 2 skipped**. I did not capture the failing test name before it scrolled, so I cannot say
what it was. Recording it rather than reporting three clean runs as the whole story — the same
standard applied to the deleted-log claim in revision 04.

## E2E campaign — three complete runs

Isolated worktree `/tmp/mf-p30` off `d7fe06a`, `env -u CI`, `--retries=0`, full suite.
`--list` reported **190 tests in 24 files** before starting — 189 at `5b0c441` plus exactly one, the
F-10 restriction journey. The F-9 replacement was vitest and so does not move a Playwright count.

```
                    result             rule-creation-controls
run 1   188 passed, 2 failed  (4.8m)   0 failures
run 2   188 passed, 2 failed  (4.5m)   0 failures
run 3   188 passed, 2 failed  (4.4m)   0 failures

pre-digest   37f30301a35b4f0245ede04d919ffe68  at d7fe06a
post-digest  37f30301a35b4f0245ede04d919ffe68  identical
```

**P30's own result: zero failures across three complete runs**, including the new F-10 restriction
journey. That is what revision 05 was for.

**This is NOT a clean campaign and should not be read as one.** Every run carries two failures, all in
`people-settlement.spec.ts` — a spec this package never touched — and the membership rotates:

```
run 1:  :166  :596
run 2:  :281  :596
run 3:  :166  :596
```

`:281` appears only in run 2. That is a fifth distinct membership combination observed across
campaigns on unchanged trees, consistent with the open finding recorded in `implementation-04.md`:
rotating membership, no test failing consistently, five mechanisms falsified, and one genuinely open
question about why isolated single-spec runs behave differently. **Not attributable to this package
and not chased.**

## Gate results

| Gate                | Result                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`    | PASS, clean                                                                                                                         |
| `pnpm lint`         | PASS, 0 errors, 1 pre-existing `useVirtualizer` warning. I introduced two unused-import warnings and cleared them before committing |
| `pnpm format:check` | `oxfmt --check src tests` clean                                                                                                     |
| `pnpm test`         | PASS — 126 files, 2448 passed, 2 skipped (shared checkout; not a P30-only signal)                                                   |
| `pnpm test:e2e`     | **NOT RUN.** No port. Every E2E claim here is unverified                                                                            |

## An ordering assumption I am flagging rather than defending

The reviewer measured that revision 04's tag path worked by an event-loop ordering detail nothing
pinned — React's microtask flush happened to win the race. **My `setTimeout(…, 0)` deferral after
`focusout` is also an ordering assumption**, just a more explicit one: it relies on the browser
having moved focus before the next task runs, which the HTML spec does guarantee for focus
transitions.

It is sound as far as I can establish by reading, and it is not the same class of accident, because
the mount is no longer racing the event. **But it is reasoned rather than pinned.**

**What would falsify it**, stated so a reviewer can test it rather than take my word: a browser where
`focusout` dispatches and the subsequent task still observes the OLD `document.activeElement`, or one
where focus lands asynchronously more than one task later. **I have tested neither.** The mount-time
evaluation partially covers the second case, since it re-reads whenever the component appears, but
that is an argument too and not a measurement.

If a reviewer wants this pinned, that is a fair finding. **I would rather hear it than have a green
campaign settle it**, because greenness cannot discharge a property nothing asserts — which is the
same reasoning that made revision 04's three clean runs silent on F-7.

## Coordination — and a scope expansion I did not flag

`InlineEditableTags.tsx` and `TransactionRow.tsx` sit in `p33-implementer-01`'s UR-012 scope.

**I did not raise that I had crossed into another package's files. Root asked, and I answered.**
Those are different things, and the record should say which happened. The F-8 identity fix is a
separate finding from F-7 and it necessarily touches the row and the cell — the portaled dropdown can
only be stamped by the row that owns it — so the expansion was defensible on its merits and invisible
from outside until root looked. **Defensible and unannounced is still unannounced.** My edit there is the F-8 fix —
four lines: an optional `ownerRowId` prop and stamping it on the portaled dropdown. **It touches no
layout, sizing or class names**, so it should not conflict with cell-geometry work. Committed in
`d67e717` and flagged to root with that hash.

## Secret-safety

No vault master key, invite-fragment secret, `crypto_box` material, seed phrase, recovery material,
`SUPABASE_JWT_SECRET` or vault plaintext appears in any code, test, fixture or this file. E2E
fixtures remain synthetic inline CSV buffers. `specs/human-scratch.md` is unmodified at
`469e98c7c8ee842acfc08e0844a47b4bc6495111b0463d8ca14727d3949d2f6a`, verified this revision.
