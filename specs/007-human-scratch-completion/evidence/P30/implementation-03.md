# P30 / UR-009 — implementation evidence, revision 03

- **Package/revision:** P30 / 03
- **Requirement:** `UR-009` (frozen source `specs/011-automations-conformance/spec.md`, markerless)
- **Implementer:** `p30-implementer-01`
- **Branch:** `main`
- **BASE:** `1040bba` (revision 02's HEAD)
- **HEAD:** `a265e54` — `fix: leave Escape to the cell while its edit is still in progress`
- **Files, committed by explicit path** (not a directory pathspec — see revision 02's note):
  `FieldRuleProposal.tsx`, `TransactionRuleProposal.tsx`, `rule-creation-controls.spec.ts`,
  `rule-proposal-stability.test.tsx`

**STATUS: E2E UNVERIFIED.** Every claim about browser behaviour below is unconfirmed.
`p31-implementer-01` held port `:3000` throughout this revision, and `playwright.config.ts` pins
that port with `reuseExistingServer: false`, so no worktree can raise a second server. Claims are
marked accordingly.

## What triggered revision 03

Four E2E journeys failed in P31's campaign, which was running against my `1040bba`. All four are the
**same assertion in one shared helper**, `addTagToRow` at `:88`:

```
Locator: getByPlaceholder('Search tags...')   Expected: 0   Received: 1
```

`:104`, `:237`, `:288`, `:328` are exactly the four tests that call that helper. The three that do
not, passed.

## Two readings, and how the second was eliminated

**Reading A (root's):** revision 02's F-1 fix succeeded, the picker now legitimately survives, and
the assertion encodes the pre-fix behaviour where opening a proposal remounted the cell and closed
the picker as a side-effect.

**Reading B (mine, initially):** the picker is genuinely stuck open and should not be.

**What settled it.** The assertion sits after an **explicit `Escape`**, not after the tag selection
— so it was never asserting a remount side-effect. It asserts that Escape closes the picker. Both
readings are therefore partly right: the helper _did_ encode pre-fix behaviour (A), **and** Escape
genuinely stopped closing the picker (B), because revision 02 mounts a Radix `Popover` on tag
selection and Radix closes popovers on Escape at the document level.

**A claim of mine that was wrong, retracted.** I told root that "Escape closes the picker" was a
contract predating this package. It is not a _tested_ contract: `grep 'Search tags'` over
`tests/e2e/` gives five hits — two mine, three in `transactions.spec.ts` — and **none of the
pre-existing three presses Escape**. I had inferred the contract from the component owning an Escape
handler, which is a statement about the code, not about anything anyone relies on. That is why my
change broke it silently.

## The ruling this revision implements

The frozen text never mentions Escape, so this is not directly citable. Root ruled it from
`human-scratch.md:253-254`, which requires the controls to be an **unfocused** popup that does not
interrupt the edit: **a surface specified as unfocused cannot claim a keystroke ahead of the surface
that actually has focus.** Escape belongs to the innermost focused thing — the picker, which has
focus and covers content. That reasoning is root's and is better than the UX-intuition argument I
offered.

## Changes

1. **Escape precedence** — `TransactionRuleProposal` adds `onEscapeKeyDown` with `preventDefault`
   while the anchored cell is still editing, so the key propagates to the cell that owns it. Once
   editing has finished, the proposal takes Escape normally.
2. **The helper corrected** — `addTagToRow` now asserts the tag LANDED, which is what the helper is
   for. It no longer asserts the picker closed; that was an incidental requirement imposed on every
   journey that happens to add a tag. The reasoning is recorded in the code, not only here, so a
   later reader sees why the assertion changed rather than suspecting it was loosened to go green.
3. **A dedicated Escape test** — first Escape closes the picker and leaves the proposal; a second
   dismisses the proposal; **and dismissing writes no rule**. That last assertion is the one that
   matters: Escape is a dismissal, not a confirmation.
4. **Select portals marked** — the two `SelectContent` instances in `FieldRuleProposal` carry
   `data-owned-by-row`. Marked on my own instances rather than the shared `select.tsx` primitive,
   because marking the primitive would assert row-ownership for every select in the application,
   which is false. This gap was found by reading and is real, but note it did **not** cause the four
   failures — see the retraction below.

## A hypothesis I raised and then disconfirmed

I proposed that the failures came from the apply-mode `Select` portaling outside my marked region,
so focus entering it read as the row losing focus. **`:237` disconfirms it**: that journey never
opens the mode select, yet fails identically to the other three. I flagged `:237` as not fitting
before the assertion text arrived, and the fit failure is what made the hypothesis decidable rather
than something to explain away.

The portal gap is nonetheless real, so it is fixed (change 4) — recorded as **real but unproven as a
cause**, rather than either promoted to a diagnosis or quietly dropped.

## An uncertainty about my own fix, raised before verification

**I do not know whether change 1 is the operative mechanism**, and I would rather say so than let
three green runs make it look established.

`InlineEditableTags.tsx:234-236` — the picker's own Escape handler calls `e.preventDefault()` and
closes. It is bound to the `CommandInput` (`:325`), which holds focus while the picker is open. So:

- **If React's synthetic handler runs first**, the picker was already closing on its own, my
  `onEscapeKeyDown` guard never fires meaningfully, and the four failures had a different proximate
  cause than I diagnosed — my fix would be a no-op sitting beside the real one.
- **If Radix's document listener sees the event first** (capture phase, or attached earlier), it
  closes the popover and the picker never receives the key — my diagnosis holds and the fix is
  correct.

**A third possibility, raised by root and which neither of us had named:** both handlers run, the
picker closes itself AND the popover closes, and the four failures had some other proximate cause
entirely.

**One piece of source evidence favours my diagnosis without settling it.** `InlineEditableTags.tsx:234-240`
is asymmetric: the Escape branch calls `preventDefault()` only, while the Enter branch calls
`preventDefault()` AND `stopPropagation()` with the comment `// Prevent double-firing`. So the author
stopped propagation deliberately where they wanted it stopped and did not on Escape — the event keeps
propagating, and Radix's dismissable-layer listener acts regardless of `defaultPrevented`. That is
consistent with my diagnosis. It is not confirmation of it, and treating "consistent with" as
"confirmed" is the substitution that produced the earlier defects in this package.

**The new Escape test already discriminates the third case**, though not by design. After the FIRST
Escape it asserts both `searchInput` count 0 (picker closed) and `proposal` still visible. If both
surfaces closed, the second assertion fails. So the test separates "picker closed, proposal survived"
(correct) from "both closed" (the third case) from "neither closed" (the original defect). Recording
that this was not foresight: the second assertion was written to pin the ruling's ordering
requirement, and its power to separate the third case is incidental.

Reading cannot distinguish these. **The discriminating experiment, to run first on getting the
port:** run `rule-creation-controls` alone; if the new Escape test passes, revert ONLY the
`onEscapeKeyDown` guard and run again. **If it still passes, my fix was a no-op** and the real cause
is elsewhere. Roughly four minutes, and it converts a plausible mechanism into a measured one.

## Gate results

| Gate                | Result                                                                         |
| ------------------- | ------------------------------------------------------------------------------ |
| `pnpm typecheck`    | PASS, clean                                                                    |
| `pnpm lint`         | PASS, 0 errors. 1 pre-existing `useVirtualizer` warning, untouched by this pkg |
| `pnpm format:check` | `oxfmt --check src tests` clean                                                |
| `pnpm test`         | PASS — 126 files, 2445 passed, 2 skipped                                       |
| `pnpm test:e2e`     | **NOT RUN.** No port. Every E2E claim in this file is unverified               |

The unit count again spans the shared checkout and is not a P30-only signal; see revision 02's note
and its scoped 11-file / 181-test alternative.

## On the new unit test, stated as a limitation

`rule-proposal-stability.test.tsx` gains two cases pinning the Escape decision rule. **They restate
my own predicate and prove only that.** They cannot show that Radix respects `preventDefault` on
`onEscapeKeyDown`, nor that the key then reaches the picker — both are framework and browser
behaviour that only the E2E can establish. That caveat is written into the test file itself.

This is the general form of why five defects in this package survived unit testing and died on the
first full-suite run: **a fixture I construct encodes my model; a fixture the framework constructs
encodes the framework. Any test whose fixture I hand-built can only fail if my model is internally
inconsistent, never if my model is wrong about the world.**

## Named follow-up, not carried in this revision

The `data-owned-by-row` allowlist is fragile by construction — every portaled control added later is
a silent hole, and change 4 above is the second patch to it already. The durable design inverts the
test: treat focus as having left the row only when it lands somewhere **positively identifiable as
outside**, rather than maintaining a list of exceptions. That touches focus semantics for every
portaled surface in the table and cannot be verified in the same breath as this fix, so it is
recorded here as a follow-up rather than smuggled into a revision that already carries three
changes.

## Secret-safety

No vault master key, invite-fragment secret, `crypto_box` material, seed phrase, recovery material,
`SUPABASE_JWT_SECRET` or vault plaintext appears in any code, test, fixture or this file. E2E
fixtures remain synthetic inline CSV buffers. `specs/human-scratch.md` is unmodified at
`469e98c7c8ee842acfc08e0844a47b4bc6495111b0463d8ca14727d3949d2f6a`.
