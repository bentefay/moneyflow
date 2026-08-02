# P33 — UR-012 implementation evidence, revision 03

Revision 02 failed independent review on one blocking finding, F-2. This revision fixes it, fixes
the non-blocking M-2, and measures the item the reviewer flagged as inferred. Everything the
reviewer verified in revisions 01 and 02 is carried forward unchanged and not restated here; see
[`implementation-02.md`](implementation-02.md) and
[`../../reviews/P33-review-02.md`](../../reviews/P33-review-02.md).

- **Package / revision:** P33 / 03
- **Requirement:** UR-012, frozen source `specs/013-transaction-cell-hit-area/spec.md` (markerless)
- **Diff base:** `f397da178a94b0c31170c680e5e8b4e8f45d01f0`, the merge-base with `main`
- **HEAD:** `4a6e23fd5df79f843e7f0214257170d75f140695` on branch `p33-ur-012`
- **Commits in range:** the five carried from revisions 01–02, plus `00dd682` (F-2 fix, M-2) and
  `4a6e23f` (test fixture faults, below)
- **Worktree:** `/tmp/mf-p33`, clean apart from `next-env.d.ts`

**On registers.** Every number and table below is an observed result from the running app or a
command's output. Anything reasoning from structure rather than execution says so in the sentence
that makes it.

## F-2 — fixed

**Reproduced independently before changing anything**, at the reviewer's coordinates:

```text
band dy=0..7   "Select all transactions"    <- the header's control, inside the data row
band dy=8..15  "Select transaction "
click (313,221)   aria-selected ["false","false"] -> ["true","true"]   header -> "true"

header row   37px   gaps 10 / 11
data row     57px   gaps 20 / 21
```

Identical to the review. The finding is correct and the defect is this package's.

### The fix

`CHECKBOX_HIT_AREA` is now keyed by row geometry — `dataRow` at 20/21, `header` at 10/11 — and
`CheckboxCell` takes the key as a **required prop with no default**.

A second constant would have fixed the instance. The defect was **silent inheritance**: a component
applied a hit area internally, so every mount received a reach measured for one of them. A required
prop is the only form the type system enforces — a third mount cannot compile without stating its
geometry. The defect is recorded in the prop's own docblock, where it will be read.

### Verified in the browser, all four directions

```text
row 1 checkbox at rowTop+2   -> ["true","false"], header "mixed"      this row only
row 1 at rowTop+1            -> ["true","false"]                      edge still live
header at its own top edge   -> 16/16 rows selected                   select-all still works
resting: header cb 16x16 @ top 10, row cb 16x16 @ top 20, all paints rgba(0, 0, 0, 0)
```

### The inferred item, now measured

The reviewer flagged the sticky-header scroll case as inferred rather than measured. Measured:
scrolled until two rows sat under the header, every pixel below its bottom edge returns
`"Select transaction "`. **The band does not follow the header.**

## The class sweep, redone with mount count

The rev 02 sweep asked _does this overlay owner contain a second interactive control_ — a question
about the **subtree**. F-2 is a question about the **ancestor**. Both are needed.

| component         | mounts                                              | carries a hit area?        | safe because                                           |
| ----------------- | --------------------------------------------------- | -------------------------- | ------------------------------------------------------ |
| `CheckboxCell`    | **2** — `TransactionRow`, `TransactionTable` header | applies its own            | **was not** — this was F-2; now keyed by geometry      |
| `AccountCombobox` | **2** — `TransactionRow`, `AccountTab`              | receives one from a caller | the import mount is a different caller and passes none |
| the other six     | 1 each                                              | —                          | one mount, one geometry                                |

**`AccountCombobox` is the one this sweep would otherwise have missed**, and it is safe for a
structural reason rather than luck. That yields the general rule, now on the primitive's docblock:

> A hit area applied INSIDE a component travels to every mount of it; one applied at the call site
> does not. Prefer the call site. Where the component must own it, key it by geometry and make the
> key required.

**Why this rule is worth more than the fix it came from.** Three defects in this goal share one
shape, across two packages: P33's F-1 (a fixture with no tag), P33's F-2 (a constant measured in one
of two geometries), and P30's `Q-PROPOSAL-P30-07-02` (a mock hard-coding one value of the
discriminating input, leaving the whole unit suite green against a frozen-clause violation). **Each
instrument was correct in what it asserted and blind to the thing that mattered**, because each
examined a narrower object than the claim built on it.

The rule above is the only one of the three that generalises into something a future author can
apply before writing the defect, rather than a lesson about how it was found. It converts "check
whether this is mounted twice" — a census, which tells you where to look — into a structural
criterion that says which mounts *can* be wrong.

## M-2 — fixed

The retracted padding rationale survived in `tests/unit/transactions/cell-hit-area.test.ts` after
`2feb9b2` corrected the module doc and the E2E comment. The comment now states that the padding's
value moves nothing and only its asymmetry does; the assertion beneath it is untouched.

Worth naming: **that is the same failure as F-2 one level down** — the reported instance was fixed
and the class had another member.

## Coverage

### The unit guard, mutation-tested

Each variant's reach must equal its own row's measured gap, and a variant without measured geometry
fails. Reintroducing F-2 exactly — header back to 20/21:

```text
AssertionError: header reaches above its row: expected 20 to be less than or equal to 10
Tests  1 failed | 9 passed (10)
```

Restored: 10/10 green. **A guard never seen to fail is not a guard.**

### The E2E fixture, and three faults in it that the red-then-green caught

The fixture now builds **two rows** and asserts the untouched row and the header are unmoved. That
is the assertion a one-row fixture cannot make: select-all sets the clicked row's `aria-checked`
exactly as a per-row toggle does.

**The first three attempts at that fixture were each wrong, and each produced a failure that
impersonated something else.** All were found by running the red-then-green, none by reading the
test.

| fault                                 | symptom                                   | why it misleads                                                                                                          |
| ------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `hasText` matched 0 of 2 rows         | every `boundingBox` timed out             | a description lives in an `<input>`'s `value`, which is not text content. The run looks like a total product break       |
| `getByRole` stopped matching mid-test | `element(s) not found` on the status step | an open Radix select rewrites the surrounding accessible tree, so the row's own name changes and the locator re-resolves |
| the subject row was the wrong row     | **the reverted build passed**             | the grid sorts by date; the named row landed second. The header's overlay can only reach the row directly beneath it     |

Rows are now addressed by `data-transaction-id`, fixed for the row's lifetime, which is what the
repository's own `rowById` helper uses. The subject is `rows.first()`, read from the order the app
produced rather than assumed.

**And one wrong assertion:** the header was asserted to read `false` after selecting one of two
rows. `mixed` is correct there — that assertion would have failed on a working build.

**The generalisable point, since three of four faults share it:** a test that cannot resolve its own
fixture fails _identically_ to a broken product. "The red appeared" is worthless without checking
where it landed. Had the red-then-green been skipped, all three campaign runs would have been green
and the test would have been incapable of catching F-2.

### Red-then-green — PASS

```text
1. REVERT    header reach back to 20/21, exactly one line
2. unit      AssertionError: header reaches above its row      1 failed | 9 passed
3. E2E RED   Expected "false", Received "true"                 exit 1
             step: "top edge toggles only this row's checkbox"
             the BYSTANDER assertion, after setup completed
4. RESTORE   file matches HEAD exactly
5. E2E GREEN 1 passed (8.3s)                                   exit 0
6. TREE      only next-env.d.ts
```

The red is on the bystander assertion — the row the pointer never touched, selected anyway — which
is F-2's signature rather than a setup failure.

## Campaign

Full suite, `env -u CI`, `--retries=0`, 3 consecutive runs.

```text
run 1   194 passed   1 failed   people-settlement: canonical example D
run 2   194 passed   1 failed   people-settlement: canonical example C
run 3   194 passed   1 failed   people-settlement: canonical example D

digest before run 1   786716261177a7066adf4c387924d3ff
digest after  run 3   786716261177a7066adf4c387924d3ff
--list                195 tests in 24 files
```

**Zero non-settlement failures in any run.** Membership is reported from the failure header's step
name rather than the test ID, since the ID under-discriminates for multi-step journeys. The rotation
has previously produced a fully clean run, so **neither a failure nor a clean result in this suite
carries information**, and none is drawn.

**On the declared count:** 195, unchanged from revision 02, and all 24 per-file counts identical.
That is not corroboration of anything. `--list` counts `test()` declarations; this revision changed
a fixture and assertions, which a declaration count cannot see. **The one-row and two-row fixtures
declare identically — which is exactly why every count-based check in this goal was structurally
blind to F-2.**

## Checks

```text
pnpm typecheck                       clean
pnpm lint                            0 errors, 1 warning (pre-existing, TransactionTable.tsx)
pnpm exec oxfmt --check (my files)   all correctly formatted
pnpm test --run tests/unit/transactions   185 passed, 15 files
```

## Risks

- The two geometry variants encode measured pixel values. If either row's padding changes, its
  variant must change with it. The unit guard compares each reach against that row's recorded gap,
  so a mismatch fails there rather than in a browser — but the recorded gaps are themselves
  measurements, and a row height change would need both updated together.
- The E2E subject is `rows.first()`. If a future change makes the first rendered row something other
  than a transaction row, the test would silently move to a different subject. It asserts two rows
  exist and that their IDs differ, which bounds but does not eliminate that.

## Proposed questions

No new questions. `Q-PROPOSAL-P33-01-01` and `Q-PROPOSAL-P33-01-02` stand from revision 01; both
reviewers have concurred with each and neither blocks.
