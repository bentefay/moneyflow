# P23 review 01 — UR-002 search matches alias-resolved descriptions

**Verdict: PASS** — with one MEDIUM documentation finding requiring a corrected sentence in the
evidence, non-blocking for integration.

**Reviewer:** `p23-reviewer-01`, fresh context, distinct from the implementer. I authored none of
the commits under review. **BASE == HEAD:** `908ec17db123e0f3569e5d2b38ecac274706edc5`, confirmed by
`git rev-parse HEAD`.

**Commits reviewed:** `391bee6` product + query tests, `c041795` page-level test, `5027787`
evidence, `11a01f4` E2E journey step, `22f8f59` and `715ad06` evidence updates.

All verification ran in my own worktree `/tmp/mf-p23rev-01`; every mutation ran in a second
throwaway worktree `/tmp/mf-p23mut`. The shared checkout was never modified.

---

## Verification — real commands, real output

### The four portless checks

| Check               | Result                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `pnpm typecheck`    | **PASS**, exit 0                                                                          |
| `pnpm lint`         | **PASS**, exit 0, 0 errors. 1 pre-existing warning, `TransactionTable.tsx:422`, untouched |
| `pnpm format:check` | **PASS for this package** — fails on 17 files, all `specs/**`, none belonging to P23      |
| `pnpm test`         | **PASS**, five consecutive clean runs                                                     |

`pnpm format:check` reported exactly these 17: `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`,
`PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, `SCOPE.json`,
`evidence/P12/implementation-0{3,4,5,6}.md`, `evidence/P14/implementation-01.md`,
`evidence/P16D/implementation-01.md`, `evidence/P19/implementation-01.md`,
`reviews/P12-review-0{5,6}.md`, `specs/human-scratch.md`. No `src/**` or `tests/**` file appears.
The documented standing condition, confirmed rather than assumed.

Five `pnpm test` runs, each `Test Files 114 passed (114)` / `Tests 2117 passed | 2 skipped (2119)`.

### E2E campaign — 3 consecutive full-suite `--retries=0` runs

Run with `env -u CI`, verified `CI=unset` in the shell beforehand. `CI=true` would have given 1
worker and 2 retries per `playwright.config.ts:56,60`, inverting the required profile.

| Run | Result              | Window            | Digest before                      | Digest after                       |
| --- | ------------------- | ----------------- | ---------------------------------- | ---------------------------------- |
| 1   | `166 passed (4.3m)` | 18:13:15–18:17:34 | `fad5caecaf75e94e032764a8f7d46c4f` | `fad5caecaf75e94e032764a8f7d46c4f` |
| 2   | `166 passed (4.0m)` | 18:17:34–18:21:33 | `fad5caecaf75e94e032764a8f7d46c4f` | `fad5caecaf75e94e032764a8f7d46c4f` |
| 3   | `166 passed (4.0m)` | 18:21:33–18:25:32 | `fad5caecaf75e94e032764a8f7d46c4f` | `fad5caecaf75e94e032764a8f7d46c4f` |

Zero failed, zero flaky, 166/166 each run. The digest is over `src` + `tests` `.ts`/`.tsx`, captured
six times across the campaign with no drift, so no tree-drift restart was required. It independently
reproduces the implementer's recorded campaign digest and matches HEAD's `src`+`tests` exactly.

**Two honest caveats on my own instrumentation.**

1. My `EXIT=` capture came out empty in all three runs. This is a defect in my script — I placed an
   `echo` between the pipeline and `${PIPESTATUS[0]}`, clobbering it. **I therefore did not observe
   exit codes and do not claim them.** The substantive evidence is Playwright's own summary line,
   `166 passed (4.Nm)`, with no `failed` and no `flaky` count in any run.
2. Each run logged `SyncManager error: TRPCClientError: Failed to fetch` and
   `Failed to push to server` around `undo-redo.spec.ts:311`, the test that deliberately exercises a
   failed offline push. Application log noise from an intentional offline path, not test failures.
   This is the same trap the implementer documented honestly: a loose grep for "failed" is not a
   classification, the summary line is.

---

## Which tree these numbers describe — the pre-hardening `addEmptyTransaction`

Stated plainly so no future reader is misled: **this campaign ran against BASE `908ec17`, which
predates P22 rev 03's commit `476f26f`.** That commit replaced `addEmptyTransaction`'s
transient-focus synchronisation with a monotonic `focusin` latch.
`tests/e2e/description-aliases.spec.ts` — the file carrying the UR-002 journey step — calls that
helper, so the helper underneath this spec changed on `main` after I pinned.
`git diff --name-only 908ec17 HEAD -- src/ tests/` returns exactly `tests/e2e/helpers/settlement.ts`
and `tests/e2e/transactions.spec.ts`; no P23 product file moved.

**One correction of fact.** The coordinator's dispatch stated the spec calls `addEmptyTransaction`
twice. It calls it **once**, at `description-aliases.spec.ts:272`, with a single import at `:11`.
The second call site existed in the standalone UR-002 test that `11a01f4` deleted when it folded the
coverage into the journey. Recorded because the surface area is half what was assumed.

**Judgement: the change affects test TIMING, not UR-002 BEHAVIOUR.** Reasoning from the diff:

1. The new helper writes exactly one thing — `data-e2e-latched-description-focus` on `<html>`, via
   `setAttribute`/`removeAttribute`. `<html>` sits outside React's tree and the attribute is
   harness-namespaced. The helper performs no `fill`, no `press`, and no click beyond the same Add
   button; it touches no transaction field, no description and no alias. It is observation plus a
   wait strategy.
2. It returns the same stable `data-transaction-id` as before. The old code read that ID off a
   `:focus` locator; the new code latches it from a `focusin` event. Same identifier, different
   route to learning it.
3. The vault state reaching the UR-002 step is therefore identical either way: one manual row with
   `description: ""` carrying an alias. UR-002's behaviour is a function of vault state and the
   search predicate, and `476f26f` changes neither.
4. The call site is upstream of the UR-002 step — `:272` versus `:315` — and separated from it by
   the undo/redo and hard-refresh steps, including a `page.reload()` at `:301`. Any focus-timing
   subtlety the latch addresses is flushed by a full page reload before the search assertions run.

The one thing the change could do to this step is make it more or less stable, and it points the
safe way: the hardening makes the precondition more reliable, not less. A UR-002 behaviour
regression would have to arrive through the search predicate or the alias graph, and `476f26f`
reaches neither.

**No re-verification is warranted, and this PASS carries forward on UR-002's merits.** P22 rev 03's
own campaign runs full-suite, so it exercises `description-aliases.spec.ts` against the
post-hardening helper directly — independent evidence for the combined tree that this reviewer did
not need to generate.

---

## Findings against criteria 1-9

### 1. UR-002 met exactly — PASS

Each clause of the frozen text (`spec.md:44-53`) is satisfied and covered:

| Frozen clause                            | Verified                                                                    |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| Matches alias-resolved text when aliased | `queries.ts:580` ORs `matchesSearch(aliasName)`; unit + page + E2E          |
| Raw stored description stays matchable   | `matchesSearch(tx.description)` retained as first disjunct                  |
| Notes stay matchable                     | `matchesSearch(tx.notes)` retained                                          |
| Follows the one-hop symlink relationship | resolution runs through the real `createDescriptionAliasLookup`, not a stub |
| Case-insensitive and substring           | both sides `.toLowerCase()`, `.includes()`; untouched by this change        |

The strongest single piece of evidence that the three fields are genuinely OR-ed **on one row**
rather than one shadowing another is the `tx-imported` fixture
(`search-alias-resolved-description.test.tsx:291-307`): that row carries a raw description, notes,
_and_ a different alias, and is found by `safeway`, `weekly` and `groceries` alike.

### 2. Design, purity, backwards compatibility — PASS

`resolveDescriptionAliasName?: DescriptionAliasNameResolver` is optional on
`TransactionQueryOptions`, and the predicate short-circuits to exactly the previous two-field
expression when it is absent. I enumerated the callers rather than accepting the claim:
`page.tsx:224` the wired one, `queries.ts:662` inside `queryTransactions`, `queries.ts:701` via the
account-scoped wrapper, and the unit tests. No other in-repo call site. **Absent the option, every
existing caller is unchanged.**

`filterTransactions` remains pure — it reads only its arguments and still builds a new array via
`filter`, mutating nothing. **No React import leaked into the query layer**: `grep` for `react` in
`queries.ts` and `description-aliases.ts` returns nothing. The resolver is a caller-supplied pure
function, so no I/O or React scope enters the query.

No `as`, `any` or `!` in the added product code.

### 3. The `page.tsx` change is minimal and does not collide with P22 — PASS

The diff is 3 lines inside the `filteredTransactions` `useMemo`: the resolver, `aliasLookup` in the
dep array, and a 2-line comment.

**No overlap with P22, proven at hunk level.** P23's only `page.tsx` hunk is
`@@ -235,13 +235,16 @@`. P22's `ed94edf` is `@@ -327,7 +327,12 @@`; `e53a7a4`'s hunks are at 37,
170, 264, 300, 317, 577 and 1151. Disjoint, and no shared identifier is redefined.

**The dep-array addition is REQUIRED, not incidental — verified empirically rather than argued.** I
changed the deps to `[transactions, filters]` in the throwaway tree and ran lint:

```
247:8  warning  React Hook useMemo has a missing dependency: 'aliasLookup'.
                Either include it or remove the dependency array  react-hooks/exhaustive-deps
```

### 4. Tests genuinely regress — PASS, verified myself, and stronger than claimed

I did not accept either mutation claim. All five checks below are mine, run in `/tmp/mf-p23mut`.

**Page level, resolver removed** — 3 failed / 3, reproducibly across 3 separate runs. Confirms the
implementer's claim.

**The discrimination evidence, which is the most important result in this review.** With the
resolver removed, page test 2 fails at line 303 — `searchFor("groceries")`, the alias case — and
**not** at 296 or 299, the `safeway` and `weekly` raw-description and notes cases. Those still
passed. The test therefore discriminates field by field rather than passing or failing wholesale.
**A single-field predicate cannot satisfy it**, which is precisely what makes UR-002's "alongside,
not instead of" requirement enforceable rather than merely asserted.

**Query predicate mutated** (my own additional check, `|| matchesSearch(aliasName)` dropped): 6 of
the new query tests fail and the page test fails 3/3.

**E2E mutation A, resolver removed from `page.tsx`:**

```
  1 failed
    [chromium] › tests/e2e/description-aliases.spec.ts:188:9 › Description Aliases › transaction cell
    pointer, keyboard, seamless commit and provenance journey
  4 passed (34.8s)

    Expected: "Manual alias only"
    Timeout: 15000ms
    Error: element(s) not found
    > 324 |  await expect(descriptionInputFor(page, /Manual alias only/)).toHaveValue(
        at /tmp/mf-p23mut/tests/e2e/description-aliases.spec.ts:324:74
```

Fails at line 324, the reported-case assertion, with the other four alias tests still passing — so
it fails for the right reason rather than breaking the file. The implementer's claim is exact.

**E2E mutation B, query predicate instead:** same single failure at the same line,
`1 failed / 4 passed (26.4s)`. Both halves of the wiring are independently load-bearing at E2E
level.

### 5. E2E lives as a `test.step()` and the fixture is discriminating — PASS

The coverage is a `test.step()` on the existing journey at `description-aliases.spec.ts:315`, per
`.claude/skills/e2e/SKILL.md:11`. The file holds **5** tests, not 6 — the restructure in `11a01f4`
folded a standalone test into the journey rather than adding one. The now-unused `rowById` import
was correctly dropped; `addEmptyTransaction` remains used at `:272`.

The fixture pair is genuinely discriminating, and I checked the mechanism rather than the comment.
"Manual alias only" is created via `addEmptyTransaction`, and manual rows are stored with
`description: ""` (`page.tsx:582`). Typing in the description cell never writes `tx.description` —
`handleDescriptionCommitText` (`page.tsx:777-836`) only ever assigns, renames or changes
**aliases**. So that row's sole findable text really is its alias. "Imported novel" carries raw
imported text under the _different_ alias "Fresh renamed" and is asserted findable by **both**. Each
search asserts the other row absent (`:328`, `:342`, `:351-352`).

**Could a single-field predicate pass it? No.** Raw-description-only fails `searchFor("manual")`;
alias-only fails `searchFor("novel")`. The two assertions are jointly unsatisfiable without both
fields, which mutation B confirms empirically.

### 6. The declared symlink E2E gap — UPHELD, on my own reasoning

I was asked to form an independent view and to overturn root freely. **I uphold the decision**, and
not merely because root did.

I traced how a symlink can come to exist. Symlinks are created only through the change-all path
(`src/lib/crdt/description-aliases.ts`); no ordinary typing flow produces one. An E2E for this case
would therefore have to drive the change-all modal, which the neighbouring test at
`description-aliases.spec.ts:361` already exercises in depth. Against that, the one-hop resolution
is exercised at both unit and page level through the **real** `createDescriptionAliasLookup` rather
than a hand-written stub, so the relationship itself is genuinely tested and not assumed.

What tips it: the risk an E2E would retire is specific and small — that `aliasLookup.resolve`
behaves differently over a live CRDT document than over a fixture collection. The search resolver at
`page.tsx:240` invokes the **identical** `aliasLookup.resolve(...)` call the table's own render path
uses at `page.tsx:362-363`. It is the same resolution, not a parallel reimplementation, so if
symlink resolution were broken over a live document the table would render the wrong text and
existing E2E coverage would already fail. The marginal coverage does not justify lengthening an
already long journey.

The gap is properly declared in the evidence and flagged for a reviewer rather than left to be
discovered, which is the correct handling.

### 7. All six checks — PASS

Recorded above with real output. Environment conditions were respected: own worktree, `env -u CI`
throughout, per-run digest, no edit to `playwright.config.ts` or `next.config.ts`, the human's :3001
dev server untouched, and the port taken only on explicit grant rather than seized from an inter-run
gap.

### 8. Type safety and secret safety — PASS

No `as`, `any` or `!` in the added product code. Secret-safety is clean and **blocking-clear**: a
scan of every added line across `391bee6`, `c041795` and `11a01f4` for seed, mnemonic, recovery,
secret key, `SUPABASE_JWT_SECRET`, presence key, invite fragment and long hex strings returns
nothing. All fixtures are synthetic — "Bookshop", "SAFEWAY STORE 1234", "Manual alias only", "Fresh
renamed", "Groceries", "Testing". **No principal financial data appears anywhere** in code, tests or
evidence.

### 9. Evidence honesty — PASS with one MEDIUM finding

The evidence separates observations from inferences in an explicit closing section, discloses the
loose-grep log-reading correction, and reports the `addEmptyTransaction` null result with a
conservative reading that states it "weakens but does not refute" the P22 hypothesis rather than
overclaiming. That is the correct standard, and the null result was reported with its rationale
stated before the outcome was known. The superseded digests are recorded with an explicit statement
that no run was executed against either — which I verified is consistent with the recorded run
table.

---

## FINDING M-1 — evidence states a false mechanism

**Severity: MEDIUM · Category: Requirements / evidence accuracy · Non-blocking**

**File:** `specs/007-human-scratch-completion/evidence/P23/implementation-01.md:236-248`

**Finding.** The evidence states the `5027787` tree "contains **no UR-002 E2E coverage at all**, so
a green campaign there would have proven nothing about this requirement while the evidence described
coverage absent from it." **This is false.** `5027787` did carry UR-002 E2E coverage, in the earlier
standalone form added by `391bee6`:

```
$ git show 5027787:tests/e2e/description-aliases.spec.ts | grep -n 'test('
540:    test("search finds transactions by the alias-resolved description they display", ...
```

Its body drives `search-filter` and asserts `test`, `TESTING`, `groc`, `safeway` and
`no-such-description-ur-002`. The file holds 6 tests at `5027787` versus 5 at HEAD, consistent with
a standalone test later folded into the journey.

The supporting grep quoted in the evidence greps for
`"search matches the alias-resolved description on display"` — the title of the **restructured**
step, introduced later in `11a01f4`. It was guaranteed to return 0 at `5027787`. **A grep for a
string that only exists after a rename cannot establish absence of the thing that was renamed; it
establishes absence of the new name.**

**Why MEDIUM and not HIGH.** The conclusion the evidence draws is sound — re-targeting to `22f8f59`
was correct, because the journey-step form is what the e2e skill requires and is the tree that
shipped. Only the stated justification is defective. A false mechanism supporting a correct decision
is a documentation defect; it would be a different matter if the decision itself were wrong. The
campaign at `22f8f59` genuinely exercises UR-002, which my own digest reproduction and E2E mutation
runs independently confirm.

**Provenance, recorded accurately.** Root has stated it introduced this error: it ran the grep for
the restructured title, concluded coverage was absent, and asserted that to the implementer, which
recorded it. Root has committed a correction to `PROGRESS` attributed to root. That is the right
attribution and I record it. It does not fully discharge the implementer: verify-not-trust cuts both
ways, and the implementer should have checked the coordinator's claim before writing it into
immutable evidence — the same standard the implementer correctly applied to the dispatch's other
four claims, all of which it did verify.

**Fix.** Correct the sentence in the evidence to state that `5027787` carried UR-002 coverage in
standalone form, that the re-target to `22f8f59` was nonetheless correct because the journey-step
form is what shipped and what the e2e skill requires, and that the original justification was
mistaken. A re-run is **not** required.

---

## Q-proposals for P21 carry-forward

**Q-P23-01-01 — the unit suite is not a fully deterministic gate on a busy machine.**
`tests/unit/import/duplicates.test.ts:724-749` asserts a **wall-clock ratio**
(`expect(ratio1).toBeLessThan(4)`, likewise `ratio2`); its own comment concedes it allows "margin
for JIT warmup, GC, etc." It is load-sensitive by construction. I observed it fail once under
concurrent-campaign load and not reproduce across five clean serial runs; root independently
observed `3 failed` then `2117 passed` on the same tree minutes apart under campaign load. It is
pre-existing, last modified in `8dd073e`, and untouched by P23 — **not a P23 defect**. But it means
a green `pnpm test` is conditional on machine quiescence, which affects how every package's unit
gate should be read, **including gates already accepted as green in this goal**. Recommend P21
either quiesce the machine for the unit gate or replace the ratio assertion with a load-independent
one.

**Q-P23-01-02 — verification instrumentation should be reviewed as carefully as product code.** Two
independent process defects in this package traced to a check that could not fail as intended:
root's grep for a post-rename string (M-1), and my own clobbered `${PIPESTATUS[0]}`. Both produced
confident-looking output that did not measure what it claimed. Recommend the audit treat a
verification command as a claim requiring the same "could this have returned this result if the
thing were false?" test that product assertions get.

---

## Observations versus inferences

**Observations** — commands I ran and output I read: all six check results; the three campaign runs
and their six digest captures; the five mutation runs; the `react-hooks/exhaustive-deps` warning;
the hunk headers proving P22 disjointness; the caller enumeration; the `5027787` test listing; the
secret and fixture scans.

**Inferences**, labelled as such:

- That the run-1 unit failure I first saw was caused by my own concurrent triplets is an inference
  from timing and from the assertion being a wall-clock ratio. I did not instrument CPU contention.
  Its non-reproduction across five clean serial runs is an observation.
- That the `TRPCClientError` lines are intentional offline-path noise rather than failures is an
  inference from their origin at `undo-redo.spec.ts:311` and from the summary line reporting
  `166 passed`; I did not trace each log line to its emitting assertion.
- That no E2E is warranted for the symlink case is a **judgement**, argued above from the mechanism
  by which symlinks arise and from the resolver sharing the table's own call. Reasonable reviewers
  could weigh it differently.
- That `next-env.d.ts` showing modified is Next-generated churn is an observation: it was already
  modified in the main checkout at session start and sits outside the digest's `src`/`tests` scope.
