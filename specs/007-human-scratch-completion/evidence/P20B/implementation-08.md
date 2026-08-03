# P20B rev 07 — E2E stability fix (Class 1 test-instrument defect) — Implementation Evidence

- **Implementer:** `p20b-implementer-07`
- **Package:** P20B, revision 08 (evidence file `implementation-08.md`)
- **Date:** 2026-08-03
- **BASE (re-derived, not carried from the dispatch):** `c15be1289bad2c9743f8d7169e2048dc65f5c0ac`
- **HANDBACK COMMITS:** `6061ef7836df52760a9c4b6e8c0f82a1970e54f4` (the three changes) and
  `c5151734899af13cbc6f5a468bd7a3b2d2738911` (fixes a regression the first one introduced, §4.3f)
- **Routed from:** `reviews/P21-review-06.md` finding **F-1** (BLOCKING), classified
  test-instrument, owner P20B.

**Reading convention.** Every claim is tagged **MEASURED** (I ran the command in this session and
its output is reproduced) or **INFERRED** (read from code without a discriminating execution). Per
the dispatch's method note I re-derived every figure I was given rather than relaying it. Where my
measurement contradicts the dispatch, I say so explicitly — and it does, on the central point.

---

## 0. Bottom line, stated first

**The defect the review identified is real and is fixed, with a two-directional control. It was not
the whole cause, and the validation bar is NOT met.** Both statements are load-bearing; neither
should be read without the other.

| Claim                                                            | Status                                                             |
| ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| `expect()` ran on a 5 s default; `playwright.config.ts` set none | **CONFIRMED**, re-derived                                          |
| The fix moves bare assertions to 15 s                            | **PROVEN**, 5005 ms → 15006 ms, control                            |
| A `goToPeople` content wait closes the window                    | **REFUTED by measurement** — see §3.2                              |
| The 5 s window was the cause of the settlement failures          | **REFUTED** — failures persist at 15 s                             |
| A weak `setAllocation` substring barrier explains the failures   | **REFUTED by my own experiment** — §4.3c                           |
| The barrier change was safe as first written                     | **NO — it regressed one caller 10/10**, fixed in `c515173` (§4.3f) |
| Zero settlement failures across ≥10 runs                         | **NOT MET** — see §4                                               |

**I am handing back a partial fix and saying so.** Widening scope mid-campaign to chase a green run
would have produced an unvalidated change; the alternative — reporting a fix that works alongside a
class it does not close — is the honest one.

---

## 1. Summary of the change

Three files, all test-instrument. **No product code changed.**

| File                              | Change                                                                                                                |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `playwright.config.ts`            | added `expect: { timeout: 15_000 }` — closes a real 5 s defect (§3.3)                                                 |
| `tests/e2e/helpers/nav.ts`        | `goToPeople` waits for `settlement-summary` — **defence in depth, not the fix** (§3.2)                                |
| `tests/e2e/helpers/settlement.ts` | `setAllocation` asserts the `Explicit:` clause — **assertion hardening, not a fix for the observed failures** (§4.3d) |

**None of these three closes the settlement failure class.** The first two are stated above; the
third was made on the strength of a hypothesis I subsequently refuted (§4.3c) and is retained only
because it is a strictly stronger assertion with a red-then-green proof.

---

## 2. Re-derivation of the dispatch's measurements

**MEASURED — every static figure in the dispatch reproduces exactly:**

```
$ grep -c 'toBeVisible()' tests/e2e/helpers/settlement.ts   -> 9   (bare)
$ grep -c 'toBeVisible({' tests/e2e/helpers/settlement.ts   -> 0   (none with a timeout)
$ grep -n  'expect'       playwright.config.ts              -> exit 1, no expect block at all
```

`goToPeople` (`nav.ts:41-44`) waited only for the h1; `goToAutomations` (`:46-51`) waits for the h1
**and** a content element. Both confirmed by reading the file.

**MEASURED — `BalanceSummary.tsx` renders `settlement-summary` in ALL FOUR states**, and contains
**no** `return null`:

```
$ grep -c 'data-testid="settlement-summary"' src/components/features/people/BalanceSummary.tsx -> 4
$ grep -n  'return null|return undefined'    src/components/features/people/BalanceSummary.tsx -> exit 1
```

The four `SettlementViewState` kinds (`settlement-view.ts:78-81`) are `incomplete`,
`no-qualifying-transactions`, `settled`, `obligations`. **This fact drives the whole analysis
below.**

---

## 3. The lever choice, justified by measurement — and where I contradict the dispatch

The dispatch offered two levers and required me to justify the choice by measurement. **I
implemented both, but the measurement shows they are not co-equal: the config lever is the fix, and
the `goToPeople` content wait is defence in depth that would NOT on its own have fixed anything.**

### 3.1 The discriminating experiment

I could not reproduce the window on an idle machine — the h1 and the currency section flip within
the same few milliseconds. A lighter run answering a load-dependent question proves nothing, so I
used CDP `Emulation.setCPUThrottlingRate` to open the window deterministically.

**MEASURED — gap between `goToPeople`'s h1 wait resolving and the currency section appearing, on a
vault whose settlement state genuinely contains an obligation:**

| CPU throttle | h1 resolves at | section appears at | **gap**    |
| ------------ | -------------- | ------------------ | ---------- |
| 1× (idle)    | 308–452 ms     | 311–454 ms         | **2–8 ms** |
| 20×          | 4040 ms        | 4105 ms            | **65 ms**  |
| 20×          | 4938 ms        | 5014 ms            | **76 ms**  |
| 20×          | 3986 ms        | 4051 ms            | **65 ms**  |
| 30×          | 7319 ms        | 7429 ms            | **110 ms** |

**The gap the content wait would close is 65–110 ms. The 5s budget is consumed by `page.goto` plus
navigation and hydration reaching the h1 at all — 4.0–7.3 s — not by the h1-to-content gap.**

### 3.2 Why the `goToPeople` content wait could not have been the fix

**MEASURED — at the instant the h1 wait resolves under 20× throttle, the vault is ALREADY
selected:**

```
{"addPerson":true,"peopleCountHeader":"People\n(2)","card":true,"section":false}   ×3 runs
```

The Add Person button is present, the people count reads `(2)` (real vault data), and
`settlement-summary` is rendered. **The `goToAutomations` pattern keys on "a vault is selected" —
and that condition is already true when `goToPeople` returns.** A wait mirroring it is satisfied
immediately and closes nothing.

**INFERRED, from §2 and confirmed against call sites — a currency-section wait is not available
either.** `settlement-currency-section-*` renders only in the `obligations` state, but **10 call
sites in `people-settlement.spec.ts` legitimately terminate in a state where no currency section
ever appears** (`expectNoQualifyingTransactions` ×5, `expectEveryoneSettled`,
`expectSettlementIncomplete`). Waiting on a currency section in a shared navigation helper would
hang every one of them for the full timeout. **The only element common to all four states is
`settlement-summary`** — which is what I waited for.

### 3.3 Why the config lever is the actual fix, with a control

The failure signature is a bare `expect()` exhausting Playwright's 5s default while `page.goto` +
hydration takes 4.0–7.3 s under load. I verified the lever reaches bare assertions, **and ran the
control to prove the probe would have failed before the fix**:

```
with    expect: { timeout: 15_000 }   ->  PROBE_BARE_EXPECT_MS=15006
without (expect block deleted)        ->  PROBE_BARE_EXPECT_MS=5005
```

**MEASURED, both directions.** The probe was a throwaway spec asserting a non-existent element; it
was deleted before the campaign and is not part of the handback. The 5005 ms control is the
mechanism the review described, reproduced directly.

### 3.4 What a repo-wide `expect.timeout` affects — stated as the dispatch required

- **1408 `expect()` calls** exist under `tests/e2e/`. The new default applies to any without an
  explicit timeout.
- **206 assertions/waits already carry an explicit timeout of ≥10 s**, against **12** below 5 s and
  **1** at exactly 5 s. Explicit values **override** the default, so all 12 deliberately-short waits
  (the 3 s "is the inline editor still open" probes, the 1 s reveal-overlay check, the 2 s
  `not.toBeVisible`) are **unchanged**. 15 s is not a new invention — it is the value the suite
  independently converged on in 206 places.
- **147 absence assertions** (`toHaveCount(0)` ×115, `.not.toBeVisible()` ×34, minus overlap) carry
  no explicit timeout. **These are the real cost and I state it plainly:** a _passing_ absence
  assertion returns as soon as the condition holds and pays nothing, but a _genuinely failing_ one
  now takes 15 s instead of 5 s to report.
- **Interaction with `timeout: 30000`:** a test with two independently failing bare assertions could
  now exhaust the 30 s test budget and report a test timeout rather than the assertion's own error,
  which is a less precise diagnostic. This is a **real trade-off**, not a free change. It is
  bounded: 39 `test.setTimeout` calls already raise the budget to 120–180 s on the heaviest specs,
  including 19 in `people-settlement.spec.ts` itself.

---

## 4. Campaign results

PLACEHOLDER-CAMPAIGN

### 4.0 An independent reproduction of the rev 06 reviewer's central warning

**MEASURED — on the timeout-fix-only tree (digest `2dcac604bc4e`, stable across both runs):**

```
RUN 1   193 passed   2 failed    (people-settlement :197, :525)
RUN 2   195 passed   0 failed    FULLY GREEN
```

**Same tree, same digest, one run failing two settlement tests and the next passing all 195.** That
campaign was superseded (§4.1a) and is not offered as validation evidence — but the green run is
worth recording on its own account.

**The rev 06 reviewer observed exactly this** (its run 4 of 5 was 195/195 green on a tree where the
other four runs failed) and warned that any revision offering one green run should be rejected on
that basis alone. **Two agents have now independently produced a fully green run on a tree known to
fail.** That is what makes the 10-run bar defensible rather than arbitrary, and it is the most
transferable fact this revision produced: **at n=1 a green run is indistinguishable from a fix.**

### 4.1 A tree-drift abort, and the digest correction it forced

**MEASURED — my first campaign attempt was ABORTED after run 1 and restarted from run 1.** The
digest moved between the run's start and end:

```
=== RUN 1 START digest=2dcac604bc4e ===
=== RUN 1 END   digest=e3e7cbf83e6b ===
```

A repeated-run campaign is evidence only for the tree it ran on, so I killed it rather than
continuing on a moved tree. **Cause, MEASURED:** `next-env.d.ts` — a **Next.js-generated** file
carrying `// NOTE: This file should not be edited` — is rewritten from `./.next/types/routes.d.ts`
to `./.next/dev/types/routes.d.ts` whenever a dev server starts. Playwright's `webServer` starts one
every run, so this would have recurred on all ten.

**My two authored files never changed**, verified by explicit hash across the abort:

```
a47dd0a3d9dcfacc6f777e1e7f753970  playwright.config.ts   (identical before and after)
130bb0cc44cef455e638a8d24245e7c7  tests/e2e/helpers/nav.ts (identical before and after)
```

The restarted campaign therefore excludes that one generated path from the digest and **additionally
hashes the files under test directly**, so a real edit to any of them is still caught. With the
correction, the pre-campaign tree reproduces `2dcac604bc4e` exactly.

### 4.1b A THIRD restart — the campaign tree was never a commit

**The defect: I ran two campaigns against working-copy state.** The three changed files were
uncommitted in the shared primary checkout for the whole session. The code under test was correct —
I verified by md5 that the worktree and primary copies were byte-identical, and again against
`git show` before discarding anything — **but no commit contained them, so the validated tree could
not be checked out by anyone.** Every campaign in this goal is evidence for a _commit_; mine was
evidence for a state only I could see.

**Root caught this, not me.** It is a real defect in the evidence independent of what the bits were,
and it also left my fix one careless pathspec away from being swept into another agent's commit in a
shared checkout.

**Fixed:** committed as **`6061ef7836df52760a9c4b6e8c0f82a1970e54f4`**, staged by explicitly naming
the three paths — never `git add -A`, never a directory pathspec, since other agents' uncommitted
work sits in that checkout and remained untouched. The worktree is now
`git checkout --detach 6061ef7` with an empty `git status`.

**All prior runs are discarded as validation evidence** — the 2 on `2dcac604bc4e` and the 1 on
`5bdd30322604`. The campaign reported below is the only one offered, and it runs against a hash.

### 4.1a A second, deliberate restart — the barrier change superseded the tree

The campaign at `2dcac604bc4e` covered only the timeout fix and the `goToPeople` wait. When the
`setAllocation` barrier change landed (§4.3d) **the tree it had been validating no longer existed**,
so that campaign was stopped after 2 runs and restarted from run 1 at the final digest.

```
superseded tree   2dcac604bc4e   files=351f8b8739c3   (2 runs, then discarded)
FINAL tree        5bdd30322604   files=e53e6e7e0bd5   (the campaign reported in §4.2b)
```

**Ten runs on the final tree are worth more than ten on a superseded one plus an argument.** The
`files=` column hashes `playwright.config.ts`, `tests/e2e/helpers/nav.ts` and
`tests/e2e/helpers/settlement.ts` together, so any edit to the three changed files moves it
independently of the whole-tree digest.

### 4.2 The run-1 failure — and why it REFUTES the dispatch's mechanism

The aborted run 1 finished 194 passed / 1 failed before I killed the campaign. Its artifact is the
single most important measurement in this revision, and I preserved it before the next run could
overwrite `test-results/`.

**MEASURED — failing step name, read from Playwright's failure header:**

```
people-settlement.spec.ts:281 › People page settlement journey ›
  mandatory journey: allocate, settle, trace, persist, exclude, restore and reverse
  › 6. verify Bob owes Me $50 on People
```

**MEASURED — the failure detail, from the preserved `error-context.md`:**

```
Error: expect(locator).toBeVisible() failed
Locator: getByTestId('settlement-currency-section-USD')
Timeout: 15000ms          <-- the fix IS active; the 5s default is gone
Error: element(s) not found
  at helpers/settlement.ts:394   (expectObligation)
```

**MEASURED — what the page actually showed at the failure instant** (accessibility snapshot):

```
- heading "People" [level=1]
- heading "People" [level=2]
- text: Settlement Summary No outstanding balances between members.
- paragraph: Everyone is settled up
```

**This is `settlement-settled`, a TERMINAL state — not the pre-hydration
`no-qualifying-transactions` transient the review described.** The distinction is decisive and it is
structural, not interpretive: `buildSettlementView` (`settlement-view.ts:186-193`) returns `settled`
only when `obligations.length === 0` **and** `qualifyingTransactionCount > 0`, and
`qualifyingTransactionCount` is incremented at `settlement.ts:1227` **after** `commitCalculation`.
So the transaction existed, carried its Treat-as-Paid status, and **was fully processed by the
settlement engine, which computed zero obligations.**

**No timeout can fix this.** The page had already converged on a final answer; waiting longer only
waits longer. The test expected "Bob owes Me $50.00" after step 5 set Me 50% / Bob 50%; a zero-net
result is what the engine produces if Bob's allocation is absent while Me holds 100% ownership.

**What this means for the classification, stated carefully.** The 5s instrument defect the review
identified is **real and now closed** — §3.3 proves the budget moved 5005 ms → 15006 ms with a
control. But it was **not the (only) cause of the settlement failures.** At least one failure in
this class is a _wrong settlement result_, not a late render.

**What I am NOT asserting.** One observation. I have already caught myself once this session
reporting a contaminated measurement (§6), and the standing lesson from rev 06 is that a single run
carries no information. I am **not** upgrading this to a product data-loss finding, and I am **not**
dismissing it because the timeout fix is sound. The campaign in §4 establishes the rate and the
per-run membership; the conclusion is drawn there, not here.

### 4.3 A weak commit-barrier in `setAllocation` — the hypothesis I raised and then REFUTED

> **RESULT FIRST: this hypothesis is WRONG, refuted by my own experiment in §4.3c.** The reasoning
> below is preserved because a future agent will otherwise re-derive it — it is genuinely plausible
> from source and it is genuinely false. **§4.3c is the measurement that kills it. Read it before
> giving any weight to this section.** The barrier change was still made, on narrower grounds
> (§4.3d).

The step-5 → step-6 gap has a second candidate mechanism, and this one I established from source
rather than inferring it.

`helpers/settlement.ts:188` commits each allocation with:

```ts
await expect(cell).toContainText(`${value}%`);
```

**`toContainText` is a substring match against the button's full text content — and the button
contains a screen-reader description span as a CHILD** (`PersonAllocationCell.tsx:211-215`:
`{presentation.display}` followed by
`<span id={descriptionId} className="sr-only">{presentation.description}</span>`, all inside the
`<button>` closed at `:216`). That description is built at `:73-74` as:

```
`Explicit: ${...}. Effective: ${effective}%. Owner remainder: ${...}%.`
```

**Consequence, MEASURED from my own manual session.** A cell whose explicit value never committed
renders `display` as `"—"` (`:70`) while its description still reads
`"Explicit: not stored. Effective: 50%. Owner remainder: 50%."` — and I observed exactly this shape
live: `"— | Explicit: not stored. Effective: 100%. Owner remainder: 100%."`. **So
`toContainText("50%")` can pass on the `Effective:` substring while the explicit allocation the test
believes it wrote was never stored.**

That makes `setAllocation` a weaker barrier than it reads as: it can return successfully having
proven only that the _derived_ value is 50%, which for a two-person 50/50 ownership split is true
**before** any explicit allocation is entered at all. This is a coherent mechanism for a settlement
that computes zero obligations from a test that believes it set two allocations.

### 4.3a A STALE obligation, not a missing one — the observation stands, its old interpretation does not

A later run produced the single most diagnostic artifact of this revision. **The observation below
is solid and MEASURED; the reading I originally gave it — as support for §4.3 — is withdrawn by
§4.3c.** What survives is the stale-vs-absent distinction, which remains the key discriminator.

**MEASURED — failing step, `people-settlement.spec.ts:525`:**

```
People page settlement matrices ›
  editing an existing transaction's allocation updates settlement without rewriting it
```

That test creates Bob 50 / Me 50 on −$100.00, asserts "Bob owes Me $50.00", then edits **Bob 50 →
25** via `setAllocation` and asserts the obligation becomes **$25.00**.

**MEASURED — the accessibility snapshot at the failure instant:**

```
- text: Settlement Summary Based on transactions marked with a Treat-as-Paid status. …
- region "USD":
  - heading "USD" [level=3]
  - button "Bob Me $50.00"
- paragraph: Balances involving you are highlighted.
```

**The currency section EXISTS. One obligation is rendered. It reads `$50.00` — the pre-edit value.**
This is not an element that failed to appear, and it is not a page that failed to hydrate: the page
is fully rendered and internally consistent with a vault in which **Bob's 50 → 25 edit never
landed**. The failing locator was the `$25.00` filter, not the section.

**This discriminates the two mechanisms decisively.** A hydration race predicts an _absent_ section;
a lost write predicts a _stale but correct-looking_ one. The observation matches the second. And it
is the same shape as §4.2's "Everyone is settled up": both are terminal, self-consistent renders of
a vault missing exactly one allocation write.

**WITHDRAWN — see §4.3c.** The chain below reads plausibly and is **false**: I later measured the
pre-commit cell text for this exact case and it contains no `25%` at all. Preserved only so the
refutation in §4.3c has something to refute.

**~~Combined with §4.3, the chain is coherent for this failure:~~** `setAllocation` asserts
`toContainText("25%")`, which the cell's `sr-only` child can satisfy via `Effective: 25%` or
`Owner remainder: 25%` **without the explicit write committing**; the helper returns; the test
navigates away; the edit is lost; the People page renders the stale $50.00 obligation. **Every link
except the last is established from source or from a preserved artifact.**

**What remains unproven, stated plainly.** I have not instrumented the cell to catch the barrier
returning on a `sr-only` match — that experiment needs the port, which the campaign holds, and it is
the right first move for whoever owns this next. **I am not asserting a product data-loss defect: on
this evidence the likeliest cause is the test helper's own weak barrier, which is P20B's territory,
not the CRDT's.**

### 4.3c THE REFUTATION — I ran the experiment that could kill my hypothesis, and it did

I proposed the substring mechanism, root endorsed a decision partly on it, and then I tested it
against the cases that could refute it. **It is refuted for all three failures. It is not a partial
miss; it is wrong.**

#### First disconfirmation: example E has no matching substring at all

| Failure                       | Observed page state         | Substring that must pre-exist | Present pre-write? |
| ----------------------------- | --------------------------- | ----------------------------- | ------------------ |
| `:525` edit Bob 50→25         | stale obligation **$50.00** | `25%`                         | see below          |
| `:281` journey Me 50 / Bob 50 | "Everyone is settled up"    | `50%`                         | see below          |
| `:197` example E, Bob **−20** | "Everyone is settled up"    | `-20%`                        | **NO**             |

**MEASURED — example E's cell with the write genuinely dropped**, printed by Playwright:

```
Expected substring: "-20%"
Received string:    "—Explicit: not stored. Effective: 0%. Owner remainder: 100%."
```

No `-20%` anywhere. The old barrier could not have passed early there. **MEASURED from the original
failure artifact:** Bob _is_ in the people list at the failure instant, so the **person** write
landed and only the **allocation** did not.

#### Second disconfirmation, and this one kills it outright: `:525` has none either

This is the case I was most confident about — I predicted the pre-commit cell would contain
`Owner remainder: 25%`. **I reasoned about what the DOM would contain instead of printing it.**

**MEASURED — I dropped ONLY the 50→25 write (`Escape` instead of `Enter` for that value) and ran the
OLD barrier against it. It FAILED, and printed the actual string:**

```
Expected substring: "25%"
Received string:    "50%Explicit: 50%. Effective: 50%. Owner remainder: 50%."
```

**`Owner remainder` reads 50%, not 25%.** The 25% remainder comes into existence only _after_ the
write commits — it is a _consequence_ of the edit, not a precondition available to be matched early.

**Conclusion, against my own hypothesis and against the reasoning root endorsed:** the old barrier
could **not** have passed early in **any** of the three failures. `setAllocation` was reporting
correctly. **The substring mechanism explains nothing, and this evidence file previously said it
explained two of three — that was wrong and this section supersedes it.**

**What that leaves.** Three failures, all fully-hydrated terminal renders consistent with exactly
one allocation write not landing, with the instrument correctly reporting the absence at a 15 s
budget. **No test-instrument mechanism now explains any of them. I am not naming the upstream
mechanism — I have not measured it**, and this is precisely the point where prior revisions in this
goal wrote down confident wrong answers. **Including, in this file, mine.**

### 4.3e Step 11 — checked against my dead hypothesis one more time, and it stays dead

A discarded run failed at a **third** distinct step of `:281`:

```
people-settlement.spec.ts:281 › 11. restore paid, enter Bob -20% and verify the reversal
```

This step is worth singling out because it contains `setAllocation(row, "Me", "0")` — **the exact
caller whose em-dash display made me reject an anchored-display barrier** (§4.3d) — and because
explicit **zero** is the one value where display and stored state genuinely diverge.

**So I re-tested the refuted substring theory against it rather than assuming §4.3c settled every
case.** At step 11, `Me` holds 50 from step 5, so the pre-write cell reads
`50%Explicit: 50%. Effective: 50%. Owner remainder: 50%.` — **the old barrier's target `0%` does not
appear anywhere.** After the write it reads `Explicit: 0%. Effective: 0%. Owner remainder: 100%.`

**The old barrier had no early match here either. The theory is dead at step 11 too.** Recorded
because this is the case most likely to look like a survivor, and a future reader should not have to
re-derive that it is not one.

> **CORRECTION — what I originally wrote here was wrong and the campaign proved it.** I claimed the
> new barrier "has the most real bite" at this caller. **It had the most real bug.** See §4.3f.

**What I asserted, and why it was wrong.** I wrote the barrier to expect `Explicit: 0%.` for a zero
allocation, reasoning from `PersonAllocationCell.tsx:73` that a stored key renders
`Explicit: ${explicitDisplay}.`. **I never checked whether writing zero stores the key at all — it
does not.** The conditional at `:70` that I did read (display shows an em dash for zero) told me the
_display_ diverges, and I stopped there instead of asking what the description would say.

**No conclusion is drawn from the discarded run itself.** Step 11 did recur in the campaign, and its
artifact is read in §4.3f.

### 4.3f MY REGRESSION — the barrier expected a string the product can never render

**The 10-run campaign at `6061ef7` failed `:281` step 11 in 10 of 10 runs. That was my change, not a
flake, and it is the clearest result of this revision.**

**MEASURED — the artifact, verbatim:**

```
Locator: getByRole('button', { name: 'Edit Me allocation' })
Expected substring: "Explicit: 0%."
Received string:    "—Explicit: not stored. Effective: 50%. Owner remainder: 50%."
```

**`Explicit: not stored.` — after writing `0`.** And the product says why, in a comment at the write
path (`src/lib/crdt/allocations.ts:294-303`):

```ts
// Zero means removal at the CRDT boundary, so prepareAllocationReplacement omits it.
if (preparedValue == null) {
    if (Object.prototype.hasOwnProperty.call(allocations, input.personId)) {
        delete allocations[input.personId];
```

**Entering zero CLEARS the allocation rather than storing a zero, so `Explicit: 0%.` is unreachable
by design. The product is correct; my assertion demanded a string it can never produce.** That is
why this failure was deterministic while every other failure rotated — 10/10 is the signature of a
broken assertion, not of load.

**The reasoning error, named.** I read `PersonAllocationCell.tsx:70` and correctly saw that the
_display_ diverges for zero (em dash, not `0%`). **I concluded the description would therefore be
the reliable field and stopped — without checking what the description says when the key is
absent.** I designed a barrier around a value I never observed. **This is the third time this
session the same error shape has cost me: reasoning about what the DOM will contain instead of
printing it.**

**Was the write LOST rather than CLEARED? No — and the discriminating field is `Owner remainder`,
not `Effective`.** The received string shows `Effective: 50%`, which looks like the pre-step-11
state and would mean the write never landed. It is not. Two Playwright-printed strings settle it:

```
zero write DROPPED (my Escape probe):  "50%Explicit: 50%. Effective: 50%. Owner remainder: 0%."
zero write LANDED  (campaign artifact): "—Explicit: not stored. Effective: 50%. Owner remainder: 50%."
```

Account `Default` is owned by Me 100%. **Pre-write:** Me 50 explicit + Bob 50 explicit = 100, so the
owner remainder is **0%**. **Post-clear:** Me's key is deleted, Bob's 50 remains, so 50% falls to
the owner as remainder — **50%** — and Me's _effective_ share becomes that remainder.

**The artifact shows remainder 50%, i.e. the post-clear state. The write landed and cleared the key,
exactly as designed.** `Effective: 50%` is an arithmetic coincidence: Me's effective share is 50%
both when she holds an explicit 50 and when she holds no explicit value but absorbs a 50% owner
remainder. **Two different vault states, one identical `Effective` figure — which is precisely why
`Effective` cannot be read as stored state, and why the old substring barrier was weak.**

**Confirmed from source, not from my arithmetic.** `src/lib/domain/allocation.ts:259` computes
`const ownerRemainder = new ExactDecimal(100).minus(explicitTotal)` — the remainder is a direct
function of the explicit total, so the two strings resolve unambiguously and the reading above is
not an inference about intent.

#### The substantive finding: `Effective` is not a state field

**This is worth more than the answer it produced.** Me's effective share reads **50% in two
different vault states**: when she holds an explicit 50, and when she holds _no_ explicit value and
absorbs a 50% owner remainder. The figure is identical; the stored state is not.

**So any assertion reading `Effective` is ambiguous by construction** — it cannot distinguish "this
value was written" from "this value was derived because nothing was written". That is the real
reason the old substring barrier was weak, and it is a better justification for the new one than
either ground on which the change was originally made (§4.3d). **`Explicit:` is the only field in
that cell that reports stored state; `Effective:` and `Owner remainder:` are both derived and both
reachable without any write at all.**

#### Method note: a control answers every question its variable was confounding

I built the drop-probe to prove the new barrier discriminates a landed write from a dropped one. It
then answered a **different** question — lost-vs-cleared — that I had not been asked when I built
it, and did so without needing the port.

**That is not luck and it was not foresight.** A control that fixes one variable becomes evidence
for every question that variable was confounding. **Worth building controls with that in mind:** the
probe cost one run and has now settled two independent questions.

**FIX, committed as `c515173`:**

```ts
const committedExplicit = Number(value) === 0 ? "Explicit: not stored." : `Explicit: ${value}%.`;
await expect(cell).toContainText(committedExplicit);
```

**MEASURED — verified in both directions:**

- the previously 10/10-failing test **passes** (1 passed, 10.8s)
- **discrimination retained for zero:** with the zero write deliberately dropped, the barrier fails
  **at its own line** receiving `Explicit: 50%.` where `Explicit: not stored.` was required — so it
  distinguishes a _cleared_ allocation from an _uncommitted_ edit rather than passing on either

**What the `6061ef7` campaign is worth after stripping my regression.** 19 failures over 10 runs, of
which 10 were mine. The remainder is **9 failures across 10 runs, rotating over 4 distinct tests**
(`:596` ×4, `:166` ×2, `:145` ×2, `:525` ×1), **zero green runs, zero non-settlement failures** — no
F-2 grid failures at all. Against rev 06's pre-fix settlement rates of 1.29 and 1.60 per run, that
remainder is 0.90 per run. **I am not claiming that as an improvement on one campaign** — it is the
number to watch in the rerun at `c515173`, reported in §4.2b.

### 4.3d The barrier change was still made — on narrower grounds, with a red-then-green proof

The change ships, but **not** as a fix for the observed failures. It is an **assertion hardening**:
the old barrier verified a substring that could in principle be satisfied by derived text, the new
one verifies stored state directly. That is strictly stronger and costs nothing.

**MEASURED — red-then-green, with a genuinely dropped write** (`Escape` instead of `Enter`, i.e. the
write is really absent rather than the assertion doctored):

```
at helpers/settlement.ts:202
> await expect(cell).toContainText(`Explicit: ${value}%.`);
Received: "—Explicit: not stored. Effective: 0%. Owner remainder: 100%."
```

**The barrier fails AT ITSELF and names its own line** — not a settlement assertion three steps
downstream. That is the discrimination property root required.

**A correctness bug I found in my own first draft, before shipping it.** I initially planned an
anchored display assertion,
`toHaveText(new RegExp(\`^${value}%\`))`. **Checking every caller rather than assuming, I found `setAllocation(row,
"Me",
"0")`at`people-settlement.spec.ts:371`** — and `PersonAllocationCell.tsx:70`renders an explicit **zero** as the em dash`"—"`, not `"0%"`. **The anchored display form would have broken that caller.** The `Explicit:`clause is exact for every value the callers use:`Explicit:
0%.`for zero,`Explicit: -20%.` for negatives.

**Blast radius, MEASURED:** 8 direct call sites plus 17 spec-level uses of the `allocations:`
shorthand routing through `addTransaction`. All are covered by the 10-run campaign in §4.

### 4.5 F-2 did not reproduce — a datum, explicitly NOT a clearance

**F-2 is not mine and I did not investigate it.** But the 10-run campaign at `6061ef7` is a large
sample at the exact profile that produced it, so the result is worth stating plainly for whoever
picks it up.

**MEASURED — derived from the run logs, not assumed:**

```
$ for i in 1..10; grep '^\s+[0-9]+) \[chromium\]' run$i.log | grep -c transactions.spec.ts
  -> 0 in every run,  total 0

non-settlement failures across all 10 runs  -> none
executions: 195 tests x 10 runs             -> 1,950
```

**Zero grid failures, zero non-settlement failures of any kind, across 1,950 executions.** Every one
of the 19 failures was in `people-settlement.spec.ts`.

**This is NOT a clearance and must not be read as one.** The rev 06 reviewer observed the symptom
directly and then could not reproduce it in 450 diagnostic executions; **this campaign adds 1,950
more non-reproductions from an independent agent on a different tree.** Two independent campaigns
have now failed to reproduce it.

**What that licenses:** the honest statement remains the reviewer's — **rarer than the sample can
resolve, not shown absent.** A defect observed once and not seen in ~2,400 subsequent executions is
still a defect. It bears on the FINAL-AUDIT clause "Large imports/tables remain responsive and
bounded", which I am not in a position to mark either way.

---

## 4.4 Static checks — all at the handback commit `6061ef7`

**MEASURED.** The unit suite and the build were deliberately run with **no campaign holding the
CPU**, per the recorded hazard that `duplicates.test.ts` "performance scales linearly" is a
wall-clock ratio assertion that trips under load.

| Check                | Command             | Exit  | Result                                                                                                            |
| -------------------- | ------------------- | ----- | ----------------------------------------------------------------------------------------------------------------- |
| Typecheck            | `pnpm typecheck`    | **0** | `tsc --noEmit`, clean                                                                                             |
| Lint                 | `pnpm lint`         | **0** | **0 errors, 1 warning** — pre-existing P03 upstream one                                                           |
| Format, my files     | `oxfmt --check`     | **0** | all 4 of my files clean                                                                                           |
| Format, repo         | `pnpm format:check` | **1** | **27 files, all under `specs/`, 0 under `src/`/`tests/`** — pre-existing, ruled acceptable by the rev 06 reviewer |
| Unit/property/integ. | `pnpm test`         | **0** | **129 files, 2481 passed**, 2 env-gated skips                                                                     |
| Production build     | `pnpm build`        | **0** | compiled in 5.9s, 17 static pages                                                                                 |

The 2,481 figure reproduces the rev 06 reviewer's count exactly. The 2 skips are the
`P16A_BENCHMARK`/`P16B_BENCHMARK` env-gated benchmarks, not unexplained skips. `git status` was
empty after the build, so no generated artifact leaked into the tree.

**The single lint warning** is React Compiler declining to memoize a `useVirtualizer` component
(`TransactionTable.tsx:459`, `react-hooks/incompatible-library`) — the tracked P03 upstream
interaction, unchanged by this work.

---

## 5. Manual product matrix — RUN FIRST, before the campaign claimed :3000

Per the ordering instruction that cost two prior revisions, the manual matrix ran **before** any
campaign started. Environment: dev server started from an isolated worktree `/tmp/mf-p20b07` pinned
`--detach` at BASE, with `.env.local` copied in per the recorded hazard; disposable CLI session
`p20b07manual`; headless; no `--debug`/`--ui`/`--headed`/`show`.

**MEASURED:**

| Matrix clause                        | Result                                                                                                                                             |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Marketing / landing                  | **PASS** — renders, correct title                                                                                                                  |
| New identity by recovery phrase      | **PASS** — 12 words issued, vault created, landed on `/settings`                                                                                   |
| Acknowledgement gating               | **PASS** — Create Account `[disabled]` until the checkbox is checked                                                                               |
| **UR-004** timezone currency         | **PASS** — **AUD/Australian Dollar** for an `Australia/Brisbane` host                                                                              |
| **UR-006** members by name           | **PASS** — **"Me(you)" + "Owner"**; no pubkey hash anywhere in the page                                                                            |
| Import by **drop zone**, CSV         | **PASS** — real `drop` event on `file-dropzone`, parsed **"CSV • 5 rows"**                                                                         |
| **UR-008** column detection          | **PASS** — **"All required fields mapped"** with no user action                                                                                    |
| Import commit                        | **PASS** — redirected to `/transactions`, **4 transactions**                                                                                       |
| **UR-007** locale dates              | **PASS** — `1/15`–`1/18` for an `en-US` Chromium locale                                                                                            |
| **UR-001** add-row focus/selection   | **PASS** — active element is the new row's description input, `value=""`, inside a real row, **selectedRows: 0**                                   |
| Undo / redo                          | **PASS** — 5 → **4** with Redo enabled → **5**                                                                                                     |
| Refresh persistence                  | **PASS** — 5 transactions survive a full reload                                                                                                    |
| People — no-qualifying state         | **PASS** — renders the no-qualifying description                                                                                                   |
| People — **per-currency obligation** | **PASS** — `settlement-currency-section-AUD`, "Alex \| Me \| A$120.00"                                                                             |
| Expandable source contributions      | **PASS** — `aria-expanded` false→true, source row with per-person explicit/effective detail, working "View transaction" link                       |
| **320px reflow**                     | **PASS** — `scrollWidth == clientWidth == 320`, `maxScrollLeft = 0`                                                                                |
| **200% zoom**                        | **PASS** — at 1280×800, `scrollWidth == clientWidth == 1280`, no overflow                                                                          |
| Dark mode                            | **PASS** — card `lab(7.8 …)` bg with `lab(98.1 …)` text; correct polarity                                                                          |
| Reduced motion                       | **PASS** — `prefers-reduced-motion: reduce` matches                                                                                                |
| **Console hygiene**                  | **PASS** — **zero** `[ERROR]`, **zero** `[WARNING]` across the session                                                                             |
| **Network hygiene**                  | **PASS** — 586 requests, **zero 4xx, zero 5xx**                                                                                                    |
| **Secrets in URLs**                  | **PASS** — only `_next` assets, `__nextjs_font`, and `api/trpc` endpoints; auth material is in **headers** (`x-pubkey`/`x-signature`), never a URL |

**A measurement I initially got wrong, corrected rather than quietly dropped.** My first 200%-zoom
reading showed `scrollWidth 524 > innerWidth 320` and looked like a finding. It was an artifact: I
had applied 200% zoom **on top of** an already-320px viewport, i.e. 160 effective CSS px — a profile
the clause does not require. Re-measured at the standard desktop profile it is clean. **I report
this because the direction an answer points is no guide to the health of the instrument that
produced it.**

**Secret safety.** The flow displayed a real 12-word recovery phrase for a throwaway vault. **It is
not recorded in this file, in any log, or in any message.** I used a synthetic 4-row CSV I generated
myself; **the principal's `~/Downloads/CSVData.csv` and `~/Downloads/OFXData.ofx` were never opened
or referenced.**

**NOT covered, stated rather than implied:** passkey create/unlock/revoke, the two-user
invite/presence/realtime flow, automations drift/apply-all, alias change-all, and multi-tab
convergence. These retain automated coverage in the campaign; I do not claim a manual pass over
them.

---

## 6. An instrument failure of my own, disclosed

**Mid-investigation I destroyed the vault state I was measuring against.** A probe that cleared
IndexedDB to force a cold-hydration path deleted the Paid/allocated transaction, leaving 4 rows all
in "For Review". Three subsequent readings showed `noQual=true, section=false` at the h1 instant —
which looked exactly like the pre-hydration transient I was hunting, and which I could have reported
as a dramatic confirmation of the dispatch's mechanism.

**It was not a transient. It was the true steady state of a vault I had broken.** I caught it when a
120 s wait for a currency section timed out and an unthrottled check still showed `section: false`
after 5 s of settling. I rebuilt the state (status Paid, amount −120.00, Alex 100%), re-confirmed
`section: true`, and **re-ran every throttled measurement in §3.1 from scratch**. The table in §3.1
contains only post-rebuild numbers.

**This is the failure mode this goal keeps producing, and it pointed the convenient way.** Had I not
checked, I would have reported a false confirmation of the very mechanism I was asked to fix.

---

## 7. Port and process hygiene

- **`:3000` claimed and announced to root before use, released and announced after.** `ss -ltn` used
  for every port question.
- **The human's dev server on `:3001` (pid 818182, 3-day uptime, cwd = the primary checkout) was
  never touched**, verified by `readlink /proc/818182/cwd` before and after.
- **A constraint worth recording for future revisions: Next.js 16 refuses to start a second dev
  server from a directory that already has one.** `pnpm dev` in the primary checkout exits 1 with
  "Another next dev server is already running" and points at the human's pid. **This makes an
  isolated worktree mandatory for any E2E work in this repo while the human's server is up** — it is
  not merely good hygiene.
- **No bare `pkill -f`.** I resolved candidate pids via `readlink /proc/<pid>/cwd`, killed only
  those whose cwd was `/tmp/mf-p20b07`, and **verified release by `ss -ltn` state, not by exit
  code** — the kill command itself returned 144, exactly the recorded hazard.
- Test-results artifacts were **copied out after every run** into
  `/tmp/p20b07-campaign/test-results-run<N>` before the next run could overwrite them, per the
  evidence-durability warning in the rev 06 review.

---

## 8. Scope — what I did not touch

**F-2, the virtualized-grid class (`transactions.spec.ts:572`, `:726`), is not mine.** I did not fix
it, route it, or treat it as adjacent. Its status is reported in §4 exactly as observed.

I changed **no product code**. `git diff --stat BASE HEAD -- src/` is empty.

---

## 9. Proposed questions

**Q-P20B-07-01 — Should `expect.timeout` be paired with a raised `timeout` for the 156 tests still
on the 30 s default?** A 15 s expect budget inside a 30 s test budget means two failing bare
assertions in one test can exhaust the test timeout and report a less precise error than the
assertion would have. Non-blocking, and the alternative (leaving expect at 5 s) is worse.

**Q-P20B-07-02 — The `goToPeople` content wait is defence in depth, not the fix.** §3.2 shows the
vault is already selected when the h1 resolves. If a future revision needs to trim test-instrument
surface, this is the line to reconsider — the config lever carries the load. Recorded so a later
reader does not mistake it for the load-bearing change.

**Q-P20B-07-04 — `setAllocation`'s commit barrier can pass without the explicit allocation being
stored.** `toContainText("50%")` matches the `Effective: 50%` substring inside the button's
`sr-only` description child, which for a 50/50 ownership split reads 50% **before** any explicit
allocation exists. See §4.3 — established from source, **not** demonstrated as the cause of the
observed failure. Tightening it touches every settlement journey, so it belongs in a revision that
can validate the change, not this one.

**Q-P20B-07-05 — `next-env.d.ts` churns on every dev-server start and will break any naive
campaign-digest check.** Next.js rewrites the generated import path whenever `pnpm dev` starts, so a
`git diff | md5sum` digest moves every run even when nothing was authored. Future campaigns should
exclude it and hash the files under test explicitly. See §4.1.

**Q-P20B-07-03 — `oxfmt` has no ignore configuration** and sweeps `specs/**`, including the frozen
`specs/human-scratch.md`. Pre-existing, endorsed by the rev 06 reviewer as a follow-up; unchanged by
this work.
