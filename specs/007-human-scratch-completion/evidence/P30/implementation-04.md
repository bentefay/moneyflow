# P30 / UR-009 — implementation evidence, revision 04

- **Package/revision:** P30 / 04
- **Requirement:** `UR-009` (frozen source `specs/011-automations-conformance/spec.md`, markerless)
- **Implementer:** `p30-implementer-01`
- **BASE:** `a265e54` (revision 03's HEAD)
- **HEAD:** `5b0c441`
- **Commits, by explicit file list** (never `git add -A`, never a directory pathspec):
    - `b6950ca` — `fix: hold the rule proposal until the cell's edit surface closes`
    - `5b0c441` — `test: drop the unit cases for the removed Escape predicate`

**STATUS: VERIFIED.** `rule-creation-controls` runs **8 passed, 0 failed**, twice, against the final
tree. This is the first green run this suite has had.

## The defect, measured

The four failures that failed revisions 01–03 were never about Escape. They were a layout collision.

```
PROBE (real browser, /tmp/mf-p30 at a265e54):
  dropdownPresent: true   popoverPresent: true   overlap: TRUE
  tag dropdown  t=265 l=613 b=343 r=837
  proposal      t=257 l=613 …
```

`InlineEditableTags` renders its picker portaled, `fixed`, `z-[9999]`, opening at the cell's bottom
edge. That is the exact space the proposal popover anchors into. With both open, the picker's search
input sits on the click point of `proposal-apply-mode` — Playwright reports it verbatim:

```
e2e-run5.log:254 … <div data-owned-by-row="true" class="bg-popover fixed z-[9999] …">
                   subtree intercepts pointer events
50 × retrying click action
```

**Frozen-text violation on two clauses.** `:255-257` requires the four-mode select and the tick to
exist as usable controls; a control the user cannot click is not one. `:252-253` forbids occlusion.

## The fix

`TransactionRuleProposal` computes `shouldShow = isPending && !isEditing`, so the proposal waits for
the cell's own edit surface to close before appearing. The two surfaces never share space.

**Deferring rather than arbitrating.** A z-index bump or a keyboard-precedence rule would decide who
wins a collision; this avoids the collision, which is the actual defect. Revisions 02 and 03 both
tried to arbitrate — `data-owned-by-row` and `onEscapeKeyDown` — and both failed, which is the
evidence that arbitration was the wrong shape.

## What was removed, and why

**The `onEscapeKeyDown` guard from revision 03.** The discriminating experiment root mandated:

```
with guard:     4 failed, 4 passed
without guard:  4 failed, 4 passed    ← identical, same four tests
```

Inert. Per the standing ruling it comes out rather than being kept because it is harmless — an inert
guard carrying a confident comment suppresses the question for the next reader, which is the same
mechanism as revision 01's "never remounts" comment.

**The two unit cases pinning that guard's predicate.** They restated a decision rule the product no
longer contains, so they pinned nothing while reading as coverage of a deleted mechanism.

## Tests my own fix falsified, and what replaced them

Each encoded a belief formed before measuring:

| Test                  | Encoded belief                                       | Now asserts                                                                                                                  |
| --------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| F-1 pin (`:268`)      | proposal visible _while_ the picker is open          | the picker survives its own selection; a second tag is selectable without reopening; the proposal arrives once the edit ends |
| Escape suite (`:300`) | Escape closes the picker — not UR-009's to guarantee | the proposal stays clear while the picker is open, appears when it closes, **and every frozen control is clickable**         |
| `addTagToRow`         | picker state irrelevant to callers                   | ends the edit, since a caller left mid-edit finds no controls                                                                |

**The occlusion test clicks the controls rather than asserting they are visible.** The regression
left them rendered but covered, so a visibility assertion passed while the user could not reach
them. Clicking is the assertion that discriminates; `toBeVisible` is exactly the assertion that did
not.

The one remaining `Escape` press in the suite (`:349`) dismisses the **proposal's own** Radix
select, which is in scope and works.

## Recorded finding — NOT fixed, outside UR-009

**`InlineEditableTags`'s Escape handler is bound to the wrong element.**

Measured: after selecting an option, `document.activeElement` is a **`DIV`**, not the search input.
The Escape handler is bound at `InlineEditableTags.tsx:325` (`CommandInput onKeyDown`), so focus has
already left the element the handler is attached to and the key never reaches it. Pressing Escape on
an open tag picker therefore does nothing.

**Why it is out of scope**, per root's ruling: `human-scratch.md:248-295` contains no language about
Escape, dismissal or closing. It predates this package — my commits touch the file but not that
binding. And nothing in the rev 04 fix depends on it: once the proposal defers, the surfaces never
share space and the picker's dismissal is irrelevant to UR-009. (Root set a safeguard that a fix
depending on an out-of-scope fix signals a wrong boundary. This one does not.)

**For whoever fixes it:** the useful part is that `activeElement` is a `DIV`. That says the handler
is on the wrong element, not that Escape is mishandled — a distinction that would cost a
rediscovery.

## E2E campaign — three complete runs

Isolated worktree `/tmp/mf-p30` off `5b0c441`, `env -u CI`, `--retries=0`, full suite.

```
                    result              rule-creation-controls
run 1   188 passed, 1 failed   (4.6m)   0 failures
run 2   189 passed, 0 failed   (4.6m)   0 failures
run 3   186 passed, 3 failed   (4.5m)   0 failures

pre-digest   d31581fd3af896128dfd7f43a5fe8f5a
post-digest  d31581fd3af896128dfd7f43a5fe8f5a   identical
```

**P30's own result: zero failures across three complete runs.** The four originally-failing tests are
green in every run, and `rule-creation-controls` is clean throughout. That is the package's result and
it is not affected by anything below.

**Every failure in the campaign is in `people-settlement.spec.ts`, a spec this package never touched,
and the membership ROTATES:**

```
        run1  run2  run3
:145     ✘     ✓     ✓
:166     ✓     ✓     ✘
:281     ✓     ✓     ✘
:596     ✓     ✓     ✘
```

**No test fails consistently; every failing test passes in at least two runs of the identical tree.**
Counts of 1, 0 and 3 on one unchanged commit with matching digests. All three logs are on disk at
`/tmp/p30-campaign/run-{1,2,3}.log`.

## The campaign tree is not P30-only, and one commit in it is P31's

Recorded because it changes what the campaign is evidence for.

`git log a265e54..5b0c441` — the range this campaign validates — contains **two `src` changes, and
only one is mine**:

```
b6950ca  P30   TransactionRuleProposal.tsx     the rev 04 fix
b138894  P31   table-selection.ts (-2 lines)   "drop an unreachable identity guard
                                                from reconcileToMatchingRows"
```

So a green campaign here is evidence for my fix **and** for P31's selection refactor jointly; a red
one does not attribute itself to either. This is the second fusion between these two packages — the
first was the commit boundary in `e97b3f7`, fixed by the explicit-file-list rule. **That rule fixes
the commit boundary but not the TREE boundary:** in a shared checkout a campaign validates whatever
else has landed, regardless of how carefully each commit was staged. Worth naming as a distinct
hazard rather than a repeat of the first.

## Mechanisms proposed and falsified for the settlement failures

Kept as a list because the pattern is the finding. Each was internally coherent and each died to a
measurement, not to an argument.

| # | Mechanism | Proposed by | Falsified by |
| --- | --- | --- | --- |
| 1 | P31's `b138894` selection refactor | me | bisect: `b138894` runs 2/2 clean; the people page never imports the selection model |
| 2 | UR-004 timezone-derived currency vs hardcoded USD | root | timing: `d6567f6` runs clean on the same host with the same TZ. **Not fully retired** — see below |
| 3 | Load / contention | both | five isolated single-spec runs at the parent are clean and five at the child are not, same machine, minutes apart |
| 4 | Pure flake, therefore unattributable | root | the failure RATE is deterministic (0/5 vs 5/5) even though the failure SET is not; root withdrew it |
| 5 | Mount cost — three always-mounted proposal anchors per row | me | **the component was ALREADY mounted unconditionally at `b6950ca^`**; `shouldShow` is strictly narrower than `isPending`, so rev 04 mounts it LESS. Falsified by narrowing, NOT by reachability |
| 7 | UR-004 runtime currency inference (the only candidate predicting variance) | root's reviewer | **falsified by probe.** `TZ=UTC` — removing Brisbane entirely — still gives 19 then 17 passes on consecutive isolated runs. Failures persist AND still vary, so the TZ input is not the varying quantity |
| 6 | Concurrent scheduling — the spec rewrite changed durations, altering what runs beside `people-settlement` | root | **falsified by the bisect data itself.** Those runs were `people-settlement` ALONE — `rule-creation-controls` never executed. Removing the perturbing spec entirely should have erased the difference; it did not. Concentration also predicts AGAINST concurrency: a scheduling effect perturbs whatever is scheduled beside it, which varies per run, so it should smear across unlucky specs rather than select one file every time |

**Two notes on how #5 and #2 were falsified, because the route matters.**

Root's first falsification of #5 was that the people page renders no transaction rows. **That argument
is wrong**: `people-settlement.spec.ts` references `goToTransactions|createTransaction|addTransaction`
33 times — those journeys create transactions on `/transactions` and then navigate to `/people`, so
the component does render during them. The mechanism dies to the narrowing argument instead, which
holds regardless of which pages are visited. **Any future explanation resting on "the people page does
not touch transactions" is wrong for the same reason.**

My own error in #5 is worth naming: I reasoned about my diff in isolation rather than against its
parent, so I attributed to my change a property that predated it. Same shape as reading a renamed
symbol's absence as a missing guard.

**The unresolved tension, stated rather than resolved.** Two facts are in conflict and no surviving
mechanism accounts for both:

- **A commit boundary that I over-claimed and must correct.** I reported `d6567f6`/`b138894` as 5/5
  clean and `b6950ca`/`5b0c441` as 0/5, and called it sharp. **The restarted campaign's run 2 is a
  fully clean 189/189 run at `5b0c441`**, so that side is 1/3 rather than 0/3. The boundary is a
  difference in RATE, not the categorical split I presented. My bisect samples were 2 and 3 runs, and
  a single further sample flipped one — **the same small-sample weakness root flagged about the
  `b138894` side, which I applied to root's half of the table and not to my own.**
- **A failure COUNT that varies widely on an identical tree.** Across complete runs of `5b0c441`
  with matching digests: **5 failures, then 1, then 0.** All logs intact and checkable.

**A third possibility, named as untested rather than proposed as a mechanism.** The isolated bisect
runs and the full-suite runs differ in more than which specs execute: worker count, total duration,
server warm-up state, and vault-creation ordering all differ. **A result that holds in isolation and
vanishes in the full suite is at least as consistent with the ISOLATION being the unusual condition
as with the commit being the cause.** That reading would make the bisect's 0/3 the anomaly requiring
explanation rather than the finding. Root raised it; neither of us has tested it, and it is recorded
here so a later reader does not treat the bisect as settled evidence.

A deterministic defect does not select different tests on each run.

**On whose early reading was right: neither was supported, and that is the accurate statement.** Root
first read this as a flake, but from a comparison between a complete run and a truncated one — an
invalid comparison, which root retracted. **That the flake direction now looks right does not make
that reading well-founded when it was made**; a conclusion drawn from a bad measurement is not
vindicated by later evidence agreeing with it. My defect reading came from a ten-run bisect, so it
was better-founded and is the one the evidence has moved against. **Being wrong from better evidence
is a different failure from being wrong from worse**, and collapsing the two would misrecord both.

Recorded as open. **Inventing a seventh mechanism here would repeat the error that produced the
previous six.**

**#2 is now falsified, having survived one round as "unproven".** The reviewer's point was right in
principle — a runtime inference is the class that fails intermittently — so it was worth the probe.
The probe kills it: with `TZ=UTC` exported, removing Brisbane from the equation entirely, the spec
still gives **19 passed then 17 passed** on consecutive isolated runs. **The failures persist and
still vary**, so whatever quantity is varying between runs, it is not the timezone-derived currency.

## An observation whose evidence no longer exists

Recorded under the same standard revision 01's F-5 applied to me: a claim that was true when written
but cannot be re-derived is not the same as a claim a reviewer can check.

During the FIRST campaign attempt I reported that `people-settlement.spec.ts:145`, `:281` and `:525`
executed and PASSED in run 2, having failed in run 1 — i.e. the failure set moved. I read that from
`/tmp/p30-campaign/run-2.log` at the time. **Those logs were deleted when I restarted the campaign**,
correctly, so a partial run could not be mistaken for a result. The consequence is that **the claim is
now unfalsifiable from outside.** I stand by it as an observation; it is no longer evidence.

The restarted three-run campaign supersedes it either way, and its logs are the ones that should be
cited.

## Gate results

| Gate                | Result                                                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`    | PASS, clean                                                                                                                                     |
| `pnpm lint`         | PASS, 0 errors, 1 pre-existing `useVirtualizer` warning. I introduced an unused-var warning removing the guard and cleared it before committing |
| `pnpm format:check` | `oxfmt --check src tests` clean                                                                                                                 |
| `pnpm test`         | PASS — 126 files, 2443 passed, 2 skipped (shared checkout; not a P30-only signal)                                                               |
| `pnpm test:e2e`     | `rule-creation-controls` **8/8**, run twice. Full-suite campaign pending                                                                        |

## Method note: three wrong diagnoses before this one

Portal markers (falsified by `:237`), Escape precedence (inert), and "the guard is actively harmful"
(falsified by the revert experiment). Each was a mechanism constructed to explain a partial signal
and reported before being measured. **Eight minutes of measurement once the port was available
settled what three constructed mechanisms could not.**

Root noted a mitigating half honestly: for most of that time I did not have the port, and was asked
to write revision 03 unverified. The part that is mine is reporting unmeasured explanations with
more confidence than they deserved. The correct order is **measure, then explain**.

## Secret-safety

No vault master key, invite-fragment secret, `crypto_box` material, seed phrase, recovery material,
`SUPABASE_JWT_SECRET` or vault plaintext appears in any code, test, fixture or this file. E2E
fixtures remain synthetic inline CSV buffers. The probe used to measure the overlap read only
element bounding rects and `activeElement.tagName`; it was deleted after use.
`specs/human-scratch.md` is unmodified at
`469e98c7c8ee842acfc08e0844a47b4bc6495111b0463d8ca14727d3949d2f6a`.
