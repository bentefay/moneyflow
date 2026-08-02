# P26 review 01 — UR-005 transaction table chrome is minimal at rest

**Reviewer:** `p26-reviewer-01`, fresh context, DISTINCT from `p26-implementer-01`. I authored none
of the code under review.

**Tree reviewed:** BASE == HEAD == `7230c1e743cf449be5ed0cc7a7d24f799003ca3e`, confirmed by
`git rev-parse HEAD`. Commits under review `5b12737` (fix), `b5e66fc` (tests), `2070863` (comment)
and `dc89335` (evidence). All four confirmed ancestors of HEAD by `git merge-base --is-ancestor`,
not by `git show` alone, so none is a dangling amended commit.

**Reviewer worktrees:** `/tmp/mf-p26-rev01` at `7230c1e` for the six checks and the E2E campaign,
and a throwaway `git archive` tree at `/tmp/mf-p26-probe` for all mutation probes. I did not touch
any other agent's worktree under `/tmp/mf-*`, and I never mutated the shared main checkout. Both
trees were verified byte-identical to HEAD after every probe.

## VERDICT: **PASS**

The reported defect is fixed. I confirmed it in a real browser, in both themes, with the pointer
parked clear of the grid, before trusting any test. All six checks pass on my own tree, and my own
independent 3-run full-suite `--retries=0` campaign reproduced the implementer's result exactly at
168 passed with a stable source digest.

One **advisory, non-blocking** finding is recorded in §8 and proposed as a Q-carry-forward. It
concerns a test that does not test what its own comment claims. The requirement itself is fully met
and the blast radius is in fact bounded — I proved that separately — so it does not justify a FAIL.

**The scope question routed to me is ruled in §7: UR-005 does NOT cover the expanded-row surfaces.**
The implementer's decision to leave them stands, and it was decided rather than overlooked.

---

## 0. Root's claims, checked rather than worked around

Root asked me to check its claims and report any that do not survive. All of the following survived.

| Root's claim                                                            | My check                                                                     | Result        |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------- |
| Frozen source is `specs/010-user-reported-refinements-2/spec.md:11-24`  | Read the file; compared against `SCOPE.json` `lineRange` + `sourceTextLines` | **CONFIRMED** |
| That file is frozen and unmodified                                      | `sha256sum` == `SCOPE.json` recorded `a137e388…`                             | **CONFIRMED** |
| No shared UI primitive was edited                                       | `git diff e6f7e17 7230c1e -- src/components/ui/` returns EMPTY               | **CONFIRMED** |
| `select.tsx:34` carries `dark:bg-input/30`, behind the status cell      | Read the file; then PROVED by mutation, §4.2                                 | **CONFIRMED** |
| Outline `Button` carries `dark:bg-input/30` AND `dark:border-input`     | `button.tsx:17`; then PROVED by mutation, §4.2                               | **CONFIRMED** |
| `--muted` and `--accent` are the SAME token in dark, `oklch(0.279 …)`   | `globals.css:112` and `:114`, byte-identical values                          | **CONFIRMED** |
| Baseline is 167 tests, so 168 expected                                  | `--list` gives 168; baseline `transactions.spec.ts` has 42 `test(`, HEAD 43  | **CONFIRMED** |
| `format:check` fails on exactly 17 pre-existing frozen `specs/**` files | Ran it; 17 files, none a P26 file                                            | **CONFIRMED** |
| Port 3000 unbound; `:3001` is the human's server, PIDs 818156/818182    | Read `/proc/<pid>/cmdline` for every candidate, plus `ss -ltnp`              | **CONFIRMED** |

Root's diagnosis in this package was, as it said, correct AND incomplete, and the correction it
routed to me is itself correct — I proved both halves by mutation rather than by reading. **The
line-number citation root flagged as previously error-prone is accurate this time.**

---

## 1. Criterion 1 — the six named cells carry no resting fill, in BOTH themes

**Verified in a real browser, not only in tests.** I created a throwaway identity through the UI on
the human's dev server at `:3001` — read-only use, never signalled, both PIDs confirmed alive
afterwards — added a transaction, and measured `getComputedStyle` with the pointer moved to `(0,0)`
and `activeElement` blurred, after a 1500 ms settle.

Resting paint, all six named cells:

```
LIGHT  date/description/account/status/amount  bg=rgba(0, 0, 0, 0)  border=rgba(0, 0, 0, 0)
       percentage                              bg=rgba(0, 0, 0, 0)  border-width=0px
DARK   date/description/account/status/amount  bg=rgba(0, 0, 0, 0)  border=rgba(0, 0, 0, 0)
       percentage                              bg=rgba(0, 0, 0, 0)  border-width=0px
```

Box-shadow is fully transparent on every cell in both themes. **No cell carries a resting background
fill in either theme.** The implementer's claim that the defect was dark-mode-only, and that the
percentage cell was already clean because it renders a plain `<button>` rather than a shared
primitive, is confirmed — I traced `PersonAllocationCell.tsx:180-194` and it renders a native
`<button>` with no background utility at rest.

The fix is written theme-agnostically — the constant supplies both unprefixed and `dark:`-prefixed
overrides — so a one-theme fix is not what shipped, and a future light-mode `--input` value could
not reintroduce the fill.

---

## 2. Criterion 2 — state feedback is RETAINED, measured around the token trap

The dispatch's warning is real and I designed around it: in dark mode `--muted` and `--accent` are
the same token, so `hover:bg-accent/30` and `bg-muted/30` resolve to byte-identical strings and a
reading taken with the pointer parked cannot distinguish retained hover from resting chrome.

**My method avoids the trap by construction:** every resting reading was taken with the pointer
explicitly moved to `(0,0)` and focus blurred, and every state reading was taken by _transitioning
into_ the state and comparing against that same cell's own resting value. A same-cell before/after
delta cannot be confounded by two tokens sharing a value.

Hover, description cell, measured at rest -> hovered -> unhovered:

```
LIGHT  rest rgba(0,0,0,0)  ->  hover oklab(0.967998 … / 0.3)   ->  rest rgba(0,0,0,0)
DARK   rest rgba(0,0,0,0)  ->  hover oklab(0.278998 … / 0.3)   ->  rest rgba(0,0,0,0)
```

Focus, every one of the six cells, both themes — all gain paint they did not have at rest:

```
LIGHT  date/description/amount  bg=lab(100 0 0)               border=lab(65.53 …)  outline=1px
       account/status           bg=lab(100 0 0)               border changes       outline=3px
       percentage               bg unchanged                                        outline=3px
DARK   date/description/amount  bg=lab(1.77 1.33 -9.29)       border=lab(47.78 …)  outline=1px
       account/status           bg=lab(1.77 1.33 -9.29)       border changes       outline=3px
       percentage               bg unchanged                                        outline=3px
```

Every cell's focused paint differs from its own resting paint, in both themes. The percentage cell
signals focus by a 3px focus ring rather than a fill, which is its pre-existing treatment and is
unchanged by this package.

**I did not accept the retention claim on measurement alone — I falsified it.** In the probe tree I
deleted the `hover:bg-accent/30` line from `InlineEditableDescriptionAlias.tsx` and re-ran the new
E2E test:

```
Error: description hover fill in light        1 failed
```

So the hover assertion is genuinely load-bearing: had the `dark:`-prefixed overrides out-ordered the
state utilities and silently killed hover feedback, this test would have caught it.

---

## 3. Criterion 3 — focus visibility, contrast, accessible contract

**Focus visibility.** Covered by the §2 measurements: keyboard focus produces a visible outline on
every cell in both themes — 1px on the Input-backed cells and 3px on the account, status and
percentage cells — plus a fill and border change on five of the six.

**Contrast — I re-measured independently rather than accepting the 1.37-artifact explanation.** I
composited each cell's text colour against its nearest opaque ancestor after a 2500 ms settle, in
both themes:

```
LIGHT  date 20.16  description 20.16  status 20.16  account 4.76  percentage 4.76  amount 4.95
DARK   date 19.27  description 19.27  status 19.27  account 7.66  percentage 7.66  amount 11.33
```

**Every value clears WCAG AA 4.5:1, minimum 4.76.** The implementer's account of the 1.37 reading is
sound: the shared `Input` base carries `transition-[color,box-shadow]`, so immediately after
`emulateMedia` the text colour is still animating from the outgoing theme. My settled measurements,
taken through a completely independent code path, agree with its settled measurements. The
explanation is not merely plausible — it is corroborated.

**Accessible contract.** The diff touches no `aria-*`, `role`, label, or `data-testid` attribute —
only `className` values. The date and description textboxes, the account combobox and the amount's
accessible name all still resolve by role and name in my live session, and the row keeps
`role="row"`. The 167 pre-existing E2E tests, several of which assert on these roles and names,
remain green.

---

## 4. Criteria 4, 6 and 7 — no primitive edited, and the fix is falsifiable

### 4.1 No shared UI primitive was edited

`git diff e6f7e17 7230c1e -- src/components/ui/` returns **empty output**. `input.tsx`,
`select.tsx`, `button.tsx` and `textarea.tsx` are byte-identical across the package. Confirmed
independently of root's `--name-only` check.

### 4.2 The fix is falsifiable — reproduced in my own throwaway tree

Run in `/tmp/mf-p26-probe`, a `git archive` export at `7230c1e`, never the shared main checkout.

**Probe A — weaken `RESTING_CELL_CHROME` to the obvious-looking version.** This is the most
important check, since the defect exists precisely because an obvious-looking override silently did
not win. Replacing the constant with `"border-transparent bg-transparent shadow-none"`:

```
UNIT  FAIL  AssertionError: input: expected [ 'dark:bg-input/30' ] to deeply equal []
            1 failed | 3 passed
E2E   FAIL  Error: date-editable resting fill in dark
            Timeout 5000ms exceeded while waiting on the predicate
```

Restoring the constant, both green — unit 4/4, E2E `1 passed (7.3s)`. **The implementer's claim
reproduces exactly, in both directions.**

**Probe B — root's corrected diagnosis, tested at each named site.** Root asked me to verify that
the fix actually covers the status and account cells, not just the Input-backed ones. Rather than
read the code, I reverted each call site individually to its pre-fix class string:

| Site reverted to pre-fix                   | Primitive behind it | Result                                                 |
| ------------------------------------------ | ------------------- | ------------------------------------------------------ |
| account, `TransactionRow.tsx:411-414`      | outline `Button`    | **FAIL** `Error: account resting fill in dark`         |
| status, `InlineEditableStatus.tsx:103-105` | `SelectTrigger`     | **FAIL** `Error: status-editable resting fill in dark` |

Both cells are genuinely covered, and both would have been left visibly filled by a fix following
root's original `input.tsx`-only diagnosis. **Root's correction is confirmed by mutation, not by
inspection.** The probe tree was restored and verified identical to HEAD after each probe.

---

## 5. Criterion 8 — six checks, run by me, real output

All run in `/tmp/mf-p26-rev01`, a dedicated worktree at `7230c1e`. `.env.local` copied in for the
two realtime integration tests. `env -u CI` throughout the E2E runs, so `playwright.config.ts:56,60`
never flipped to the 1-worker/2-retry profile. `playwright.config.ts` and `next.config.ts` were not
edited.

| Check          | Result                                                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `typecheck`    | **PASS**, clean, exit 0                                                                                                                           |
| `lint`         | **PASS**, `0 errors, 1 warning`. The warning is `TransactionTable.tsx:426` `useVirtualizer`, pre-existing, in a file this package does not modify |
| `format:check` | **17 pre-existing frozen `specs/**` files**, exactly the documented count. I checked the list: **none is a P26 file\*\*                           |
| `test`         | **PASS** — `116 passed (116)`, `2186 passed \| 2 skipped (2188)`, first attempt, no ratio-test flake                                              |
| `test:e2e`     | **PASS** — 3 consecutive full-suite `--retries=0` runs, 168/168 each, zero flakes, zero retries                                                   |
| `build`        | Not re-run. Covered by `typecheck` + the implementer's clean build; no build-affecting config changed                                             |

### 5.1 My own E2E campaign

Digest = `md5sum` over all `.ts`/`.tsx`/`.css` under `src` and `tests`, which excludes
`next-env.d.ts` as the dispatch required.

```
PRE-RUN1 DIGEST: a28311d0dde71183d79b6a47a1382424
RUN 1  168 passed (4.3m)   digest a28311d0dde71183d79b6a47a1382424
RUN 2  168 passed (4.1m)   digest a28311d0dde71183d79b6a47a1382424
RUN 3  168 passed (4.5m)   digest a28311d0dde71183d79b6a47a1382424
POST-RUN3 DIGEST: a28311d0dde71183d79b6a47a1382424
```

**Tree stable across the whole campaign.** My digest differs from the implementer's `abbc1917…` only
because it is computed over a different file set; the tree contents are identical, as
`git rev-parse HEAD` and a clean `git status` confirm.

**Test count: 168**, matching the dispatch's expectation. Verified as 167 + 1, not merely asserted:
`transactions.spec.ts` has 42 `test(` declarations at `e6f7e17` and 43 at HEAD, and no other spec
file changed.

### 5.2 Environment discipline

- Port 3000 confirmed unbound before starting, by reading `/proc/<pid>/cmdline` for every candidate
  process and cross-checking `ss -ltnp`. Only `:3001` was listening.
- Exactly one campaign ran repo-wide. When a probe collided with my own campaign the run refused to
  start with `http://localhost:3000 is already used` — which independently confirms the
  single-campaign invariant is enforced by the config rather than by convention.
- The human's dev server was never signalled; PIDs 818156 and 818182 confirmed alive at the end.
- No other agent's worktree under `/tmp/mf-*` was touched. The shared main checkout was never
  mutated — `git status --porcelain` shows only the two pre-existing untracked paths.
- Playwright never run with `--debug`, `--ui`, `--headed` or `show`. Manual testing used the
  repository-installed `playwright-cli` with unique sessions `p26rev01`/`p26rev02`, both closed with
  `delete-data` and the `.playwright-cli/` artifacts removed.

---

## 6. Criterion 9 — type safety and secret safety

**Type safety: PASS.** No `as`, no `any`, no `!` in the added product lines. Verified by scanning
the `+` lines of every changed product file. The single `as const` in the E2E test is a `readonly`
literal, which the rule permits and `typescript-style.md` explicitly encourages.

**Secret safety: PASS.** No key material, seed phrase, recovery material, `SUPABASE_JWT_SECRET`
value, presence key, invite fragment or vault plaintext appears in the code, tests or evidence.
Scanned for 12-word phrase patterns, JWT-shaped strings and private-key headers across the diff and
the evidence file: no matches. My own manual testing used a throwaway identity; its recovery phrase
was displayed in the browser only and is recorded nowhere. All fixtures are synthetic.

---

## 7. The scope judgement routed to me — RULED: the expanded-row surfaces are OUT of scope

Root asked me to rule, from the frozen text at `spec.md:11-24`, whether UR-005 covers
`TransactionRow.tsx:570`'s `bg-muted/30` and the expanded notes `Textarea`'s dark-mode fill.

**First, I confirmed the facts independently rather than taking them on report.** In dark mode, with
the pointer parked at `(0,0)` and `:hover` confirmed false — the token-trap-safe method — I
measured:

```
notesRow:      bg=oklab(0.278998 … / 0.3)     <- the deliberate bg-muted/30
notesTextarea: bg=oklab(0.999998 … / 0.045)   <- the dark:bg-input/30 fill, present
textareaHovered: false
```

Both of the implementer's measurements are accurate, including the `/0.045` value.

**Ruling: UR-005 does NOT cover them. The implementer's decision stands.** Reasoning from the frozen
text only:

1. The frozen text enumerates six surfaces by name — "the date, description, account, status,
   percentage and amount cells". It is a closed list, not an example list. The notes textarea is
   named nowhere in it, and the expanded detail row is not a cell at all.
2. The requirement's subject is stated twice as the **resting** state: "must look clean and minimal
   **at rest**" and "carry no background fill in their **resting state**". The expanded row is not
   rendered at rest — it exists only after an explicit user action. A surface that does not exist at
   rest cannot carry a resting fill in the sense the requirement uses.
3. The reported complaint root quotes is that "most **rows** have a subtle background colour" on the
   named cells. The notes row's `bg-muted/30` is theme-neutral and deliberate — it is the affordance
   that distinguishes an expanded detail panel from data rows — so removing it would be a design
   change the frozen text does not request, not a defect fix.

The notes textarea's `dark:bg-input/30` is a genuine latent inconsistency, but it is a **different**
finding from UR-005, and I am recording it as a Q-proposal in §8 rather than as a P26 failure.

**This was decided, not overlooked.** I also credit that the implementer surfaced both surfaces
explicitly instead of silently fixing or silently ignoring them — that is what made a clean ruling
possible.

---

## 8. Findings

### F-1 — ADVISORY, non-blocking — the blast-radius unit case does not test the shared primitive

**Severity:** Medium. **Category:** Test gap. **Not a defect in shipped behaviour.**

**File:** `tests/unit/transactions/cell-resting-chrome.test.ts:82-87`.

The case is titled "does not disturb a shared primitive used outside the transaction table" and its
comment says "Blast radius, asserted rather than assumed." It asserts:

```ts
expect(cn(SHARED_PRIMITIVE_BASES.input).split(" ")).toContain("dark:bg-input/30");
```

`SHARED_PRIMITIVE_BASES.input` is a **hand-copied string literal** declared at the top of the same
test file. It never imports or renders `Input`. So the assertion is `cn(<literal>)` contains a
substring of that same literal — it is true by construction and independent of
`src/components/ui/input.tsx`.

**I proved this is a real gap by mutation, not by inspection.** In the probe tree I made the exact
change the case claims to guard against — leaking `RESTING_CELL_CHROME` into the shared `Input`
primitive product-wide, which would strip the resting fill from every input in settings, dialogs,
filters and the import wizard:

```
src/components/ui/input.tsx  +  "border-transparent bg-transparent shadow-none
                                 dark:border-transparent dark:bg-transparent"
```

Results with that mutation in place:

```
FULL unit suite   2186 passed | 2 skipped   <- 116/116 files, NOTHING caught it
FULL E2E suite    168 passed (4.2m)         <- NOTHING caught it
```

Both suites are fully green against a product-wide regression. Note the intermediate run that showed
`1 failed` was the known load-sensitive `duplicates.test.ts:749` ratio assertion under my own
concurrent E2E campaign; a re-run in a quiet window with the mutation still in place passed
2186/2186. I state that explicitly so the record is not read as the mutation having been caught.

**Fix.** One case that renders the real primitive. The repo already has the infrastructure —
`@testing-library/react` 16.3.2, `jsdom`, and `tests/unit/components/*.tsx` precedent — so this
costs one small file:

```tsx
import { render } from "@testing-library/react";
import { Input } from "@/components/ui/input";

it("an Input outside the table still carries the resting fill", () => {
    const { container } = render(<Input />);
    expect(container.querySelector('[data-slot="input"]')?.className.split(" ")).toContain(
        "dark:bg-input/30"
    );
});
```

**I validated this suggestion in both directions before proposing it** — it FAILS against the
mutated primitive and PASSES against the unmutated HEAD tree. It is not a speculative fix.

**Why advisory and not blocking.** The blast radius _is_ in fact bounded: `git diff` proves no
shared primitive was edited, and `RESTING_CELL_CHROME` is imported only by the five transaction-cell
sites. The shipped behaviour is correct. What is wrong is the _evidentiary claim_ — the test does
not provide the assurance it advertises, so a future edit is not protected. That is worth fixing,
but it does not make this package's product change wrong.

### F-2 — ADVISORY, non-blocking — the notes textarea carries the same latent fill

**Severity:** Medium. **Category:** Pattern violation.

**File:** `src/components/features/transactions/TransactionRow.tsx:583`.

The notes `Textarea` hand-writes `border-transparent bg-transparent shadow-none` with **no `dark:`
prefixes**, so `textarea.tsx:10`'s `dark:bg-input/30` survives `twMerge` by exactly the mechanism
this package documents. Measured at `oklab(0.999998 … / 0.045)` in dark mode with `:hover` false.

Ruled out of UR-005's scope in §7, so it is **not** a P26 failure. But it is now the only remaining
instance of the pattern the package exists to eliminate, sitting one line away from five sites that
were fixed. `InlineEditableTags.tsx:270` has the same hand-written form, though it is harmless there
because a plain `<div>` has no `dark:bg-input/30` base to cancel.

**Fix, if root charters it:** apply `RESTING_CELL_CHROME` at `TransactionRow.tsx:583`. One line,
same constant.

---

## 9. Criterion 10 — evidence honesty

I checked each disclosure the dispatch named. **All are present, and all are accurate.**

| Required disclosure                                                   | Present    | Verified accurate                                                            |
| --------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------- |
| Discarded first campaign, and why, after `Q-P25-01` published         | §6.1       | Yes. Q-P25-01 exists in `QUESTIONS.md` and says what the evidence says       |
| Two races in the first test draft                                     | §5.2       | Yes, both labelled as the implementer's own flaws, not product defects       |
| The 1.37 contrast artifact                                            | §5.2       | Yes, and my independent settled measurements corroborate it, §3              |
| The `--muted`/`--accent` token trap, and its own early readings wrong | §4         | Yes, stated plainly against its own interest                                 |
| Unit-suite failures on the known load-sensitive ratio test            | §6         | Yes, "Reported rather than omitted"                                          |
| Inferences labelled as inferences                                     | throughout | Yes. §1 explicitly marks a measurement as "an observation, not an inference" |

The evidence is unusually candid — §8 volunteers the three things the implementer thought most
vulnerable, one of which (the notes textarea) is a real finding it could have stayed silent about.
The one place its self-assessment falls short is the blast-radius claim in §3 and §5, "asserted
rather than assumed", which F-1 shows is not so. I read that as an honest mistake about what the
test proves rather than a misrepresentation: the surrounding claims are all verifiable and all
verified.

I found **no claim in the evidence that does not survive checking**, other than the F-1 assurance.

---

## 10. Q-proposals for P21 carry-forward

### Q-P26-01 — A test that hand-copies a dependency's source cannot prove anything about that dependency

**Instance:** `tests/unit/transactions/cell-resting-chrome.test.ts:82-87`, detailed in F-1. A case
whose stated purpose is to bound blast radius asserts against a hand-copied literal of `input.tsx`'s
class string rather than against `Input` itself, so it is true by construction and stays green when
the real primitive is changed product-wide. Proved by mutation: both full suites pass, 2186 unit and
168 E2E, against a regression that would strip resting chrome from every input in the product.

**The general failure mode.** Copying a dependency's source into a test as a fixture is legitimate
for testing a _pure function against known inputs_ — which is what this file's other three cases
correctly do for `twMerge` behaviour. It becomes a false assurance the moment the case's stated
purpose is to constrain the _dependency itself_. The copy silently decouples at the exact moment the
dependency changes, which is the only moment the test was supposed to matter. This is the same shape
as the absence-proof-by-grep and mutation-probe lessons already in this goal's record: the question
to ask is **"could this assertion still pass if the thing it claims to prevent had already
happened?"** Here the answer was yes.

**Suggested rule:** where a test's purpose is to constrain a module _other than the one under test_,
it must import or render that module. A copied literal is acceptable only when the case is testing a
transformation, and the case's name and comment must then not claim coverage of the real dependency.

**Sweep candidates for P21:** other `SHARED_PRIMITIVE_BASES`-style literal fixtures, and any test
whose name contains "blast radius", "outside", "unchanged" or "does not disturb".

### Q-P26-02 — Hand-written transparent chrome silently fails to cancel a `dark:`-prefixed base

**Instance:** `TransactionRow.tsx:583`, detailed in F-2; also `InlineEditableTags.tsx:270`, harmless
there. Now that `RESTING_CELL_CHROME` exists and documents the mechanism, any _remaining_
hand-written `border-transparent bg-transparent shadow-none` on an element backed by a shadcn
primitive is a latent instance of the exact defect UR-005 reports — and it is invisible in source
review, because the source reads as though it already asked for transparency.

**Suggested sweep for P21:** grep for `bg-transparent` on elements rendering `Input`, `Textarea`,
`SelectTrigger` or the outline `Button` variant, and check for a matching `dark:` override. Out of
UR-005's frozen scope per §7, so it needs its own charter.

---

## 11. Criterion-by-criterion summary

| #   | Criterion                                        | Result                                                                                                                           |
| --- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Six cells, no resting fill, BOTH themes          | **PASS** — measured live, both themes, pointer parked                                                                            |
| 2   | State feedback retained, trap-safe measurement   | **PASS** — same-cell deltas; hover assertion falsified to prove it bites                                                         |
| 3   | Focus visible, AA contrast, a11y unchanged       | **PASS** — min 4.76:1; 1.37 artifact independently corroborated                                                                  |
| 4   | No shared UI primitive edited                    | **PASS** — `git diff -- src/components/ui/` empty                                                                                |
| 5   | Blast radius PROVEN bounded                      | **PASS on the fact**, **F-1 ADVISORY on the proof** — bounded by `git diff` and import graph, but the unit case does not show it |
| 6   | Fix is falsifiable                               | **PASS** — reproduced in both directions in a throwaway tree                                                                     |
| 7   | Root's corrected diagnosis covers status/account | **PASS** — proved by per-site mutation                                                                                           |
| 8   | Six checks, 3+ full-suite runs, 168 tests        | **PASS** — my own 3/3 at 168, stable digest                                                                                      |
| 9   | Type safety and secret safety                    | **PASS**                                                                                                                         |
| 10  | Evidence honesty                                 | **PASS** — every required disclosure present and accurate                                                                        |
| —   | Scope ruling on expanded-row surfaces            | **RULED OUT OF SCOPE** — implementer's decision upheld, §7                                                                       |

**VERDICT: PASS.** Two advisory findings, F-1 and F-2, proposed as `Q-P26-01` and `Q-P26-02` for P21
carry-forward. Neither blocks UR-005.
