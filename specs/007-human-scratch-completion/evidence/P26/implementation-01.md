# P26 / revision 01 — UR-005 transaction table chrome is minimal at rest

- **Package / revision:** P26 / 01
- **Requirement:** UR-005 (`tasks/ur-005.md`, package contract `tasks/P26-ur-005.md`)
- **Frozen source:** `specs/010-user-reported-refinements-2/spec.md` lines 11-24 (markerless,
  immutable, not edited)
- **BASE / dispatch HEAD at start:** `750be4ca7146d9cb92237094c88fc468dc9dc0b9`
- **Rebased onto:** `e6f7e17103f404de4f9c3ab1c7962f261e290da1` — main advanced during implementation
  with four docs-only commits touching `PROGRESS.md`, `QUESTIONS.md`, `reviews/P25-review-01.md` and
  `tasks/ur-006.md`. No overlap with any file in this package; the rebase was clean.
- **Product/test commits:**
    - `5b12737` — `fix: clear resting chrome from transaction table data cells`
    - `b5e66fc` — `test: assert transaction cells rest chrome-free while keeping state feedback`
    - `2070863` — `docs: describe what the chrome constant does and cite where it is verified`
- **Evidence commit:** this file, committed on top of `2070863`. Its own hash is not quoted here,
  since a commit cannot contain its own hash.
- **Worktree:** `/tmp/mf-e2e-p26` on branch `p26-ur-005`

> **Secret-safety statement.** No key material, seed phrase, recovery material,
> `SUPABASE_JWT_SECRET` value, presence key, invite fragment or vault plaintext appears in this
> file, in the code, or in the tests. The manual reproduction used a throwaway identity created in
> my own worktree's dev server; its recovery phrase was never revealed on screen and is not recorded
> anywhere. All test data is synthetic.

---

## 0. Dispatch claims I was asked to check

The dispatch told me five of root's readings had been corrected by workers in this goal and asked me
to check its claims rather than work around them. I checked every one. **All of root's claims in
this dispatch survived**, which is itself worth recording — the correction rate did not continue.

| Claim                                                                  | Verdict                                             |
| ---------------------------------------------------------------------- | --------------------------------------------------- |
| Frozen source is `specs/010-user-reported-refinements-2/spec.md:11-24` | **Confirmed.** Lines 11-24 are exactly `## UR-005`. |
| That file is the frozen source in `SCOPE.json`                         | **Confirmed.** `SRC-USER-REPORTED-REFINEMENTS-2`.   |
| `Input` base carries `dark:bg-input/30` unconditionally                | **Confirmed**, `src/components/ui/input.tsx:11`.    |
| `twMerge` does not let `bg-transparent` cancel `dark:bg-input/30`      | **Confirmed empirically**, §2.1.                    |
| `--input` is `oklch(1 0 0 / 15%)` in dark                              | **Confirmed**, `src/app/globals.css:118`.           |
| Cells' `bg-accent/30` is `hover:`-scoped, not resting                  | **Confirmed** at all four cited line numbers.       |
| Row container is hover/focus-scoped, no zebra striping                 | **Confirmed**, `TransactionRow.tsx:314-324`.        |
| E2E suite has 167 tests at BASE                                        | **Confirmed.** 168 now = 167 + my 1 new test.       |

Two additions of my own, neither contradicting root:

**0.1 — The fill is not only the `Input` primitive.** Root named `input.tsx`. Two further shared
primitives contribute the same resting decoration to cells in scope, and a fix touching only the
`Input`-backed cells would have left them visibly filled:

- `src/components/ui/select.tsx:34` — `dark:bg-input/30`, behind the **status** cell.
- the outline `Button` variant, `src/components/ui/button.tsx:17` — `dark:bg-input/30` **and**
  `dark:border-input`, behind the **account** cell. This is the only one that also draws a border.

**0.2 — `SCOPE.json` gained a sixth source since the dispatch was written.**
`SRC-TRANSACTION-SELECTION` (`specs/012-transaction-selection/spec.md`, frozen 2026-08-02). It does
not bear on UR-005; noted only so root knows I saw current scope, not a stale copy.

---

## 1. Which theme carries the defect — observed, and it matters

The dispatch required me to confirm in the running app which theme shows the reported chrome, and to
say so explicitly if it is theme-scoped, because the frozen text is not theme-scoped.

**Observed: the resting fill appears in dark mode only. Light mode is already clean at rest.**

Method: I started a dev server on port **3005 in my own worktree** — never the human's server on
:3001, which I only read process state from and left running (PIDs 818156/818182 confirmed alive
afterwards) — created a throwaway identity, added a transaction, blurred focus, and read
`getComputedStyle` on each cell.

Light mode, at rest, every cell in scope:

```
date/description/account/status/amount  backgroundColor: rgba(0, 0, 0, 0)
```

Dark mode (`documentElement.classList.add("dark")`), same rows, same rest:

```
date          bg: oklab(0.999998 ... / 0.045)   border: rgba(0, 0, 0, 0)
description   bg: oklab(0.999998 ... / 0.045)   border: rgba(0, 0, 0, 0)
account       bg: oklab(0.999998 ... / 0.045)   border: lab(100 0 0 / 0.15)   <- also a border
status        bg: oklab(0.999998 ... / 0.045)   border: rgba(0, 0, 0, 0)
amount        bg: oklab(0.999998 ... / 0.045)   border: rgba(0, 0, 0, 0)
```

`0.045` is `0.15 × 0.30` — the `--input` token at 15% white, through the `/30` opacity modifier.
That is root's predicted value, arrived at from the pixels rather than from the source.

The percentage and tags cells measured `rgba(0, 0, 0, 0)` at rest in **both** themes before any
change: they render a plain `button` and a `div`, not a shared primitive, so they never carried the
fill. They are in the requirement's list, so the tests assert their resting state too; they simply
needed no code change. **This is an observation, not an inference.**

The fix is nonetheless written to be theme-agnostic: it cancels the resting paint in both themes, so
a cell cannot regain a resting fill if a future theme change gives `--input` a light-mode value.

---

## 2. Mechanism — reproduced before designing

### 2.1 The twMerge behaviour, reproduced

Run against this repo's own `tailwind-merge`, using the real class strings:

```
CURRENT   dark:bg-input/30 present: true    <- cell's own bg-transparent did NOT remove it
FIXED     dark:bg-input/30 present: false   dark:bg-transparent present: true
```

Root's claim holds exactly. The reason: `twMerge` groups by variant prefix, so `dark:bg-input/30`
and an unprefixed `bg-transparent` are treated as different states and never collide. Cancelling a
`dark:`-prefixed utility requires a `dark:`-prefixed override.

I verified the same for the `select` and outline-`Button` bases before writing any code, and checked
in each case that no `dark:bg-input`/`dark:border-input` utility survived while every `hover:`,
`focus:`, `focus-visible:` and `aria-invalid:` utility did.

### 2.2 Why an "obvious" fix fails silently

This is the trap the dispatch warned about, and it is worth stating plainly for a future reader: the
cells' source already said `bg-transparent`. Reading the source, they look correct. Only the
rendered paint reveals otherwise, and only in one theme. That is why the E2E assertions read
computed style rather than class lists — a class-list assertion would have passed against the
defect.

---

## 3. The change

New shared constant `src/components/features/transactions/cells/cell-chrome.ts`:

```
export const RESTING_CELL_CHROME =
    "border-transparent bg-transparent shadow-none dark:border-transparent dark:bg-transparent";
```

Applied at the **cell layer** in five places — the amount, date, description and status cells, and
the account combobox's class in `TransactionRow.tsx`. `src/components/ui/input.tsx` was **not
edited**, and neither were `select.tsx` or `button.tsx`; the dispatch's hard constraint is respected
and the blast radius stays inside the transaction table.

**Blast radius is asserted, not assumed.** A unit case checks that an ordinary `Input` outside the
table still merges to `dark:bg-input/30`, so the shared primitive is provably unchanged for
settings, dialogs, filters and the import wizard.

### 3.1 After the change, observed in the running app

Dark mode, at rest, all five previously-filled cells:

```
date/description/account/status/amount
  bg: rgba(0, 0, 0, 0)   border: rgba(0, 0, 0, 0)   shadow: none
```

And state feedback measured in the same session, rest vs focused:

```
date         rest bg rgba(0,0,0,0)  ->  focused bg lab(1.77 ...)   border lab(47.78 ...)
description  rest bg rgba(0,0,0,0)  ->  focused bg lab(1.77 ...)   border lab(47.78 ...)
amount       rest bg rgba(0,0,0,0)  ->  focused bg lab(1.77 ...)   border lab(47.78 ...)
status       rest bg rgba(0,0,0,0)  ->  focused bg lab(1.77 ...)   border lab(100 0 0 / 0.15)
```

Focus remains obvious on every cell: it gains both a fill and a border where it previously had
neither.

---

## 4. Scope decision on `TransactionRow.tsx:566` — `bg-muted/30`

**Decision: out of scope. Left unchanged.** Justification, as the dispatch required:

1. The frozen text names six cells specifically — "date, description, account, status, percentage
   and amount". The expanded-row detail area is none of them. It is a **separate row**
   (`data-testid="notes-row"`, its own `role="row"`), revealed only by an explicit user action.
2. Its `bg-muted/30` is a deliberate, theme-neutral affordance distinguishing an expanded detail
   panel from data rows — it is present in both themes by design, unlike the defect, which was an
   unintended dark-only artifact of a shared primitive. Removing it would be a design change the
   frozen text does not ask for.
3. The reported complaint is that "most rows have a subtle background colour" — a resting property
   of ordinary rows. The notes row is not present at rest.

**A measurement trap I fell into, recorded because it would mislead anyone re-measuring.** My first
readings of the notes area looked contradictory. The cause: the pointer had been parked over the
textarea, and in dark mode `--muted` and `--accent` are the _same_ token
(`oklch(0.279 0.041 260.031)`), so the textarea's `hover:bg-accent/30` resolves to a string
**byte-identical** to the row's `bg-muted/30`. A reading taken while hovering cannot distinguish
retained hover feedback from resting chrome. Re-measured on detached clones, free of `:hover`:

```
restingTextarea: oklab(0.999998 ... / 0.045)   <- the dark:bg-input/30 fill, still present
restingRow:      oklab(0.278998 ... / 0.3)     <- the deliberate bg-muted/30, retained
```

**So the expanded notes textarea does carry the same dark-mode resting fill, and I deliberately did
not fix it.** `src/components/ui/textarea.tsx:10` contributes `dark:bg-input/30` on the same
mechanism as §2.1, and I did not apply `RESTING_CELL_CHROME` there. The reason is scope: the notes
textarea is not one of the six cells the frozen text names, and it lives in the expanded detail row,
which is not present at rest. I am surfacing it to root rather than silently widening the change:
**if root reads UR-005 as covering it, it is a one-line follow-up using the same constant.**

---

## 5. Tests

Both are new. No existing test was weakened, and no assertion was relaxed.

**E2E** — `tests/e2e/transactions.spec.ts`,
`"UR-005: data cells rest without chrome in both themes yet keep every state"`. Runs the whole
battery **twice, once per theme** via `page.emulateMedia({ colorScheme })`, so a one-theme fix
cannot pass. Asserts, on the real grid:

- every named cell — date, description, status, amount, account, **percentage** — paints nothing at
  rest, background _and_ border;
- no resting box-shadow;
- text contrast ≥ 4.5 (WCAG AA) at rest **and** while focused;
- hover still fills;
- focus still changes the paint _and_ leaves a non-transparent fill, on every cell;
- selecting the row still fills it;
- the accessible contract is unchanged — the date/description textboxes and account combobox still
  resolve by role and name, the amount keeps its accessible name, the row keeps `role="row"`.

Transparency is decided by rendering the colour to a canvas and reading its alpha, so the assertion
does not depend on whether the browser serialises a colour as `rgba(...)` or `oklab(... / 0.045)` —
the defect's own value was the latter, which a naive `=== "rgba(0, 0, 0, 0)"` check would have
mishandled.

Per `Q-P24-01`, every accessible-name locator I added passes `exact: true`.

**Unit** — `tests/unit/transactions/cell-resting-chrome.test.ts`, 4 cases: the constant cancels the
resting decoration of all three shared bases; **it would not do so without its `dark:` halves** (the
regression asserted directly); state utilities survive the merge; an `Input` outside the table is
untouched.

### 5.1 Both tests were proved to fail on the defect

I weakened the constant back to `"border-transparent bg-transparent shadow-none"` — the
obvious-looking version — and re-ran:

```
E2E   FAILED  "date-editable resting fill in dark"  (5s poll exhausted, expected true got false)
UNIT  FAILED  1 of 4  (dark:bg-transparent missing from merge)
```

Then restored the constant and re-confirmed both green. The tests detect the reported defect; they
are not merely passing alongside it.

### 5.2 Two genuine test races I found and fixed — labelled as such

Neither is a product defect; both were flaws in my first draft, found because the test failed:

1. **Transition race.** The row and cells carry `transition-colors`; the first frame after a state
   flips still shows the old paint. Fixed by polling to the settled paint rather than sampling once.
2. **`emulateMedia` colour race.** The `Input` base carries `transition-[color,box-shadow]`, so
   immediately after a theme switch the _text_ colour is still animating from the outgoing theme and
   momentarily reads dark-on-dark. Measured: `IMMEDIATE: oklab(0.128998 ...)` →
   `AFTER 300ms: lab(98.1434 ...)`, stable thereafter. The initial 1.37 contrast reading was this
   artifact, **not** a real AA failure; the settled value passes. Fixed by polling the contrast.

I record these because a reviewer re-reading the first failure log would otherwise see a contrast
number below AA and reasonably suspect the fix.

---

## 6. Six checks

All run in `/tmp/mf-e2e-p26`, never in the shared main checkout.

| Check          | Result                                                                                                                                 |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `typecheck`    | **PASS**, clean                                                                                                                        |
| `lint`         | **PASS**, 0 errors. 1 pre-existing warning, `TransactionTable.tsx:426`, `useVirtualizer` — present at BASE, in a file I did not modify |
| `format:check` | **17 pre-existing frozen `specs/**` files\*\*, exactly the documented count. Verified none is a P26 file                               |
| `build`        | **PASS** — `✓ Compiled successfully`, 17/17 static pages                                                                               |
| `test`         | **PASS** — 2186 passed, 2 skipped, 116 files                                                                                           |
| `test:e2e`     | **PASS** — 3 consecutive full-suite `--retries=0` runs, 168/168 each                                                                   |

**Unit-suite honesty note.** Two earlier `pnpm test` invocations failed on
`tests/unit/import/duplicates.test.ts:749` — the documented wall-clock **ratio** assertion
(`expected 4.198... to be less than 4`). Both occurred while my own dev server or an E2E campaign
was loading the machine. Re-run in a quiet window the file passes 43/43 and the suite passes
2186/2186. This is the known load-sensitive flake, not a regression. Reported rather than omitted.

### 6.1 E2E campaign — the full sequence, including the restart

`env -u CI` throughout, so `playwright.config.ts:56,60` never flips to 1-worker/2-retries.
`playwright.config.ts` and `next.config.ts` were not edited. Digest excludes `next-env.d.ts` per the
dispatch's P25 lesson; `next dev` rewrote it on every run and I restored it each time, so it never
entered a commit.

**First campaign** — tree `17e8b6afd4dfc7a25593d354492c1369`:

| Run | Result           | Digest after                       |
| --- | ---------------- | ---------------------------------- |
| 1   | 168 passed, 4.0m | `17e8b6afd4dfc7a25593d354492c1369` |
| 2   | 168 passed, 3.9m | `17e8b6afd4dfc7a25593d354492c1369` |
| 3   | 168 passed, 4.0m | `17e8b6afd4dfc7a25593d354492c1369` |

**That campaign was then voluntarily discarded.** While it was running, main published `Q-P25-01` —
a comment that paraphrases frozen text can assert a flow the code does not implement. Re-reading my
own constant's doc comment against that rule, its last paragraph restated UR-005's guarantee as
though describing the code, and asserted state utilities win by "higher specificity", which is
wrong: Tailwind variants win by emission order, not specificity. I rewrote it to describe what the
code does and cite where the guarantee is verified. That is a comment-only change, but it changed
the tree, so **per campaign discipline I restarted from run 1 rather than carrying the old runs
forward.**

**Final campaign** — tree `abbc1917f364430a1b52dd9262f5f723`, verified before run 1 and after run 3:

| Run | Result           | Digest after                       | UR-005 test |
| --- | ---------------- | ---------------------------------- | ----------- |
| 1   | 168 passed, 3.9m | `abbc1917f364430a1b52dd9262f5f723` | ✓ passed    |
| 2   | 168 passed, 4.0m | `abbc1917f364430a1b52dd9262f5f723` | ✓ passed    |
| 3   | 168 passed, 3.9m | `abbc1917f364430a1b52dd9262f5f723` | ✓ passed    |

Zero failures, zero flakes, zero retries across all six full-suite runs. **168 = 167 at BASE + 1 new
test**, as the dispatch predicted.

### 6.2 Environment discipline

- Port 3000 confirmed unbound immediately before starting, by reading `/proc/<pid>/cmdline` for
  every candidate rather than `pgrep -f`. Only `:3001` was listening, held by the human's server.
- The human's dev server was never signalled. Both PIDs confirmed alive after my own server on :3005
  was stopped.
- No other agent's worktree under `/tmp/mf-*` was touched. The shared main checkout was never
  mutated to test anything.
- Repo hard rules: no `as`, no `any`, no `!` in the product change. Playwright never run with
  `--debug`/`--ui`/`--headed`/`show`. No parentheses in commit messages.

---

## 7. Requirement-by-requirement

| Frozen clause                                                                          | Where met                                                          | Evidence                                                          |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Six named cells carry no resting background fill                                       | `RESTING_CELL_CHROME` at five cell sites; percentage never had one | §1, §3.1, E2E both themes                                         |
| Hover/focus/focus-visible/selected/editing/presence/validation keep existing treatment | No state utility altered; all survive the merge                    | §3.1, E2E hover + focus + selected steps, unit case 3             |
| Focus indication clearly visible, keyboard focus obvious                               | Focus gains fill _and_ border on every cell                        | §3.1, E2E focus step asserts paint changes and is non-transparent |
| Contrast ≥ WCAG AA for text and retained states                                        | Measured contrast ≥ 4.5 at rest and focused, both themes           | E2E, §5.2 note 2                                                  |
| Accessible role/name/state unchanged                                                   | No `aria-*`, `role`, label or `data-testid` touched                | E2E accessible-contract step; 167 pre-existing tests still green  |

---

## 8. For the reviewer

Three things I would look at hardest if I were reviewing this:

1. **The notes textarea in §4.** I left a measured, known dark-mode resting fill in place on the
   expanded notes textarea because it is not one of the six cells the frozen text names and does not
   appear at rest. If you read UR-005 more broadly, this is the one thing to push back on. One line,
   same constant.
2. **`shadow-none` in the constant.** It was already present at every cell site I edited, so this is
   a faithful move rather than a new behaviour — but it is bundled into a constant now, so a future
   cell adopting the constant inherits it. Intentional; flagging it.
3. **The contrast helper walks to the nearest opaque ancestor.** A fully transparent cell has no
   background of its own, so its true backdrop is whatever ancestor actually paints. If the table
   ever gains an intermediate translucent layer, that helper would need to composite the stack
   rather than stop at the first opaque one.
