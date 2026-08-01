# P23 revision 01 — implementation-01 (UR-002 search matches alias-resolved descriptions)

**Implementer:** `p23-implementer-01` (fresh context) · **Base HEAD at start:**
`6e82c70067335d6f1b957ed1235fac26f1582400` (root ledger dispatch commit) · **Commits:** `391bee6`
(product + query tests), `c041795` (page-level regression test), `11a01f4` (E2E coverage as a
journey step)

## Scope / charter

Frozen `UR-002` (`specs/009-user-reported-refinements/spec.md` lines 35-53). The requirement names
five behaviours; each is mapped to its covering test in the matrix below.

The reported defect: the principal created a transaction whose displayed description is "Testing"
via a description **alias**, searched for "test", and got nothing back.

No ledger, marker, scratch, `SCOPE.json`, frozen spec, `FINAL-AUDIT.md` or `reviews/**` file was
written. No secret, key, seed phrase, recovery material, presence key, invite fragment or vault
plaintext appears in any file I touched; every fixture below is synthetic.

## Verifying the dispatch's read before acting on it

The dispatch asked me to verify rather than trust. All four points held:

| Claim from dispatch                                         | Verified at                              | Result                                                              |
| ----------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------- |
| `filterTransactions` matched only `description` and `notes` | `queries.ts:560-567` on base             | Confirmed                                                           |
| Case handling already correct, not the bug                  | same lines — both sides `.toLowerCase()` | Confirmed; **I changed nothing about case**                         |
| Displayed text resolves via `aliasLookup.resolve(...)`      | `page.tsx:359-361`, `:389`               | Confirmed                                                           |
| Aliases are a one-hop symlink graph                         | `schema.ts:86-109`                       | Confirmed; a symlink never points at another symlink                |
| Manual rows are created with `description: ""`              | `page.tsx:579`                           | Confirmed — this is why an aliased manual row was wholly unfindable |

The design note also held. `createDescriptionAliasLookup`
(`src/lib/domain/description-aliases.ts:139`) is a pure factory over a plain collection;
`useDescriptionAliasLookup` is a bare `useMemo` wrapper around it with no other logic. So the
resolver could be threaded into the pure query with **no React import** and **no lifting of the
search predicate into the component**. I took the dispatch's preferred shape; I did not find a
better one.

## The change

Three product edits, all small.

**1. `src/lib/domain/description-aliases.ts`** — one exported type, no behaviour:

```ts
export type DescriptionAliasNameResolver = (aliasId: string) => string | undefined;
```

**2. `src/lib/crdt/queries.ts`** — a new optional query option, and the predicate:

```ts
    resolveDescriptionAliasName?: DescriptionAliasNameResolver;
```

```ts
if (options.search) {
    const searchLower = options.search.toLowerCase();
    const resolveAliasName = options.resolveDescriptionAliasName;
    const matchesSearch = (value: string | undefined): boolean =>
        value != null && value.toLowerCase().includes(searchLower);
    results = results.filter((tx) => {
        const aliasName =
            resolveAliasName && tx.descriptionAliasId
                ? resolveAliasName(tx.descriptionAliasId)
                : undefined;
        return matchesSearch(tx.description) || matchesSearch(tx.notes) || matchesSearch(aliasName);
    });
}
```

The alias name is **OR-ed alongside** the two existing matches, never substituted for them, which is
what keeps pre-alias imported text findable (frozen line 48-49). `filterTransactions` stays pure: it
still only reads its arguments and still builds a new array. The resolver is a caller-supplied pure
function, so no I/O or React enters the query layer.

**3. `src/app/(app)/transactions/page.tsx`** — three lines inside the existing
`filteredTransactions` memo:

```ts
            // Search must find rows by the description the table actually renders, which for an
            // aliased row is the alias name resolved through the same one-hop symlink lookup.
            resolveDescriptionAliasName: (aliasId) => aliasLookup.resolve(aliasId)?.name,
```

plus `aliasLookup` added to that memo's dependency array.

### On the `page.tsx` touch, flagged prominently as the dispatch required

A P22 revision is in independent review against this file, so I kept the edit to the minimum UR-002
genuinely requires and state its extent precisely: **it is confined to the `filteredTransactions`
`useMemo` (base `page.tsx:223-244`)**. P22 rev 02's change (`ed94edf`) is in the reveal-intent
retirement effect and `handleAddTransaction`. There is **no line overlap** between the two edits and
no shared identifier is redefined. The resolver reads the already-existing `aliasLookup` binding
(`page.tsx:129`), which P22 did not touch.

The dependency-array addition is required, not incidental: without it the memo would hold a resolver
closed over a stale lookup and search results would not update when an alias is renamed. It is
checked by `react-hooks` lint, which passes with zero errors.

### Backwards compatibility of the optional parameter

`resolveDescriptionAliasName` is optional and the predicate short-circuits to exactly the previous
two-field expression when it is absent. Every existing caller is therefore unchanged in behaviour. I
enumerated the callers rather than assuming: `page.tsx:224` (the one I wired), `queries.ts:647`
inside `queryTransactions` (which spreads its own options through, so a caller that supplies the
resolver gets it and one that does not is unaffected), and the unit tests. `queryTransactions` is
re-exported from `src/lib/crdt/index.ts` but has no other in-repo call site.

## Requirement-to-test mapping

| Frozen requirement (lines 46-53)               | Covering test                                                                                                                    |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Matches alias-resolved text when aliased       | unit "finds an aliased row with no stored description by its alias text"; page-level test 1; E2E step, "manual"/"fresh" searches |
| Raw stored description stays matchable         | unit "still finds a row by its raw stored description"; page-level test 2; E2E step, "novel" search                              |
| Notes stay matchable                           | unit "still finds a row by its notes"; page-level test 2                                                                         |
| One-hop symlink resolution matches the display | unit "follows a one-hop symlink to the real alias name"; page-level test 1 (`alias-trial`)                                       |
| Case-insensitive, substring                    | unit lowercase/uppercase/mid-substring cases; page-level test 3; E2E step, "MANU" search                                         |

The E2E column was executed: see the campaign section, including a mutation check showing the step
fails in a real browser without the fix. The one-hop symlink case has no E2E entry: producing a
symlink through the UI means driving the change-all modal, which the neighbouring test already
covers, and the resolution itself is proven at the unit and page levels. I judged that not worth
lengthening an already long journey for; flagging it so a reviewer can overrule me rather than
discover it.

## Tests

**`tests/unit/crdt/transaction-queries.test.ts`** — a new table-driven `describe` with 12 cases. It
resolves through the **real** `createDescriptionAliasLookup` rather than a hand-written stub, so the
one-hop symlink relationship is genuinely exercised instead of assumed. Fixtures cover a manual row
with an empty description carrying only an alias (the reported case), a row on a symlink, a row with
raw imported text under a _different_ alias — so a search must discriminate rather than pass by
matching everything — and an unaliased row. Two negative cases pin the compatibility claim: with no
resolver supplied the aliased rows are correctly _not_ found, and an unresolvable alias id is
ignored without disturbing the raw-field match.

**`tests/unit/transactions/search-alias-resolved-description.test.tsx`** — new, 3 tests. This exists
because the query-level tests **cannot** catch the actual reported defect: they supply the resolver
themselves, so they stay green even if the page never passes one. That is precisely the shape of the
bug. This file renders the **real page** over a fake CRDT context holding a real alias graph, drives
the real search input, and asserts on which rows survive filtering. The fake boundary is the CRDT
context, router, presence and drop target; the page's own memo, the real table and rows are
unmocked.

**The page-level test was verified to fail on unfixed code**, which is the only thing that makes it
a regression test. Removing just the `resolveDescriptionAliasName` line from `page.tsx` and
re-running:

```
❯ tests/unit/transactions/search-alias-resolved-description.test.tsx (3 tests | 3 failed) 6097ms
     × finds an aliased row by the alias text the table displays for it 3877ms
     × keeps raw description and notes findable underneath an alias 1134ms
     × matches alias text case-insensitively in both directions 1084ms
```

The line was then restored and re-confirmed green; `git diff` against the committed file is empty,
so no artefact of the check survives in the tree.

It carries `vi.setConfig({ testTimeout: 30_000 })` for the documented reason that a whole-page mount
costs far more under a saturated suite than in isolation. This is a **ceiling, not a wait**: every
assertion settles on its own condition via `waitFor`, with no sleep and no polling interval.

**`tests/e2e/description-aliases.spec.ts`** — a new `test.step` on the existing "transaction cell
pointer, keyboard, seamless commit and provenance journey" test, reproducing the principal's report:
a row whose displayed description comes only from an alias is searched for by that alias text and
must be found.

This was **initially written as a separate test and then restructured**, which is worth recording
because the second shape is better on two counts. `.claude/skills/e2e` directs that adding a
`test.step()` to an existing test is strongly preferred over a new test, to keep the suite fast and
avoid duplicating slow setup. More substantively, that journey's end state is already a _better_
fixture set than the one I had built: it ends with "Manual alias only" — a manually added row
carrying an alias and no stored description, i.e. exactly the reported defect — alongside "Imported
novel", which holds raw imported text under the _different_ alias "Fresh renamed". That pair is
discriminating: no single-field search predicate can satisfy every assertion in the step, because
one row is findable only by its alias and the other must be findable by alias _and_ by raw text. The
step reuses that state at no extra setup cost, and the suite still lists **5 tests in the file, not
6** (verified with `playwright test --list`, which does not need the port).

Assertions are on the row's committed value and on absence, never on copy. Post-re-render assertions
carry `{ timeout: 15_000 }` per the documented load-dependent flake discipline, matching sibling
assertions already in the file. The step also asserts the non-matching row is **absent** for each
search, so it cannot pass by simply failing to filter, and finishes by clearing the search and
confirming the rows come back.

## Check results

| Check          | Result                                                                                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `typecheck`    | **PASS**                                                                                                                                                                                         |
| `lint`         | **PASS** — 0 errors. 1 pre-existing warning in `TransactionTable.tsx:422` (React Compiler / TanStack `useVirtualizer`), a file I did not touch                                                   |
| `format:check` | **PASS on my 5 files** under scoped oxfmt. Repo-wide fails on exactly the 17 pre-existing frozen `specs/**` files documented as a standing condition; no `src/` or `tests/` file is in that list |
| `test`         | **PASS** — 114 files, 2117 passed / 2 skipped, **3 consecutive clean runs**                                                                                                                      |
| `build`        | not run (not in the six-check list)                                                                                                                                                              |
| `test:e2e`     | **PASS** — 166 passed / 0 failed, **4 consecutive full-suite `--retries=0` runs**, digest stable                                                                                                 |

### E2E campaign

The campaign was serialized behind the concurrent P22 reviewer's campaign: `playwright.config.ts`
pins `baseURL` and `webServer.url` to `http://localhost:3000` with `reuseExistingServer: false` and
reads no port or base-URL environment override, so exactly one campaign can run repo-wide. A private
worktree isolates the distDir-scoped Next dev lock but **not** the port. My first attempt was
refused before any browser started:

```
Error: http://localhost:3000 is already used, make sure that nothing is running on the port/url
or set reuseExistingServer:true in config.webServer.
```

I waited rather than taking the port during a gap between their runs, which would have voided their
campaign. Root released the port once the P22 campaign had genuinely finished. Before run 1 I
confirmed independently that `:3000` was unbound by both `ss` and `curl`, and that no
`@playwright/test` CLI existed anywhere — checked by reading `/proc/<pid>/cmdline` for every `node`
process rather than by `pgrep -f`, whose pattern can match the watcher's own command line.

Runs used `env -u CI` to guarantee the required load profile. `playwright.config.ts:56,60` set
`retries: process.env.CI ? 2 : 0` and `workers: process.env.CI ? 1 : 4`, so `CI=true` would have
given 1 worker and 2 **retries** — the inverse of the 4-worker retries-disabled profile the flake
discipline requires, and it would have laundered flakes into passes. (`CI=true` on the worktree
`pnpm install` is unrelated and fine.)

| Run            | Result                                                        | Duration | Tree digest                        |
| -------------- | ------------------------------------------------------------- | -------- | ---------------------------------- |
| 1              | **166 passed, 0 failed**                                      | 4.2m     | `fad5caecaf75e94e032764a8f7d46c4f` |
| 2              | **166 passed, 0 failed**                                      | 4.0m     | `fad5caecaf75e94e032764a8f7d46c4f` |
| 3              | **166 passed, 0 failed**                                      | 3.9m     | `fad5caecaf75e94e032764a8f7d46c4f` |
| mutation check | **1 failed, 4 passed** (alias spec only, product fix removed) | 26.6s    | fix deliberately removed           |
| 4              | **166 passed, 0 failed**                                      | 3.9m     | `fad5caecaf75e94e032764a8f7d46c4f` |

All runs full-suite, `--retries=0`, exit code 0, in `/tmp/mf-e2e-p23` at `22f8f59`. The digest was
verified immediately before run 1 and again after the last run: **unchanged throughout**, so no
tree-drift restart was required. Run 4 exists because the mutation check below temporarily modified
the tree; it re-establishes three consecutive clean runs on the exact restored tree.

Two superseded digests are recorded for completeness, and **no run was ever executed against
either**: `4553956ad6b988ddea2d79980fa6f1ab` at `391bee6` (before the page-level regression test)
and `0a149986d9c74aab61c311bac7399806` at `c041795` (before the E2E test was restructured into a
journey step). The initial dispatch of the campaign named `5027787`/`0a149986…` as the target; that
tree contains **no UR-002 E2E coverage at all**, so a green campaign there would have proven nothing
about this requirement while the evidence described coverage absent from it. Verified before
running:

```
$ git show 5027787:tests/e2e/description-aliases.spec.ts | grep -c "search matches the alias-resolved description on display"
0
$ git show 22f8f59:tests/e2e/description-aliases.spec.ts | grep -c "search matches the alias-resolved description on display"
1
```

Root confirmed the corrected target before any run started.

#### The E2E step was verified to fail on unfixed code, in a real browser

Three green runs show the step passes; they do not show it would **catch** the defect. After the
campaign — so the campaign tree was never modified — the single product line
`resolveDescriptionAliasName: …` was removed from `page.tsx` and the alias spec re-run:

```
  1 failed
    [chromium] › tests/e2e/description-aliases.spec.ts:188:9 › Description Aliases › transaction cell
    pointer, keyboard, seamless commit and provenance journey
  4 passed (26.6s)

    Expected: "Manual alias only"
    Timeout: 15000ms
    Error: element(s) not found
    > 324 |             await expect(descriptionInputFor(page, /Manual alias only/)).toHaveValue(
        at /tmp/mf-e2e-p23/tests/e2e/description-aliases.spec.ts:324:74
```

It fails at line 324 — the reported-case assertion, searching "manual" for a row whose only findable
text is its alias — and the other four alias tests still pass, so the step fails for the right
reason rather than breaking the file. The line was restored with `git checkout --`, the digest
re-confirmed identical, and run 4 executed clean on the restored tree.

#### Failure classification

**Zero test failures across all four runs**, so no load-flake versus product-defect classification
was needed. The known incidental `passkey.spec.ts` unlock-button flake
(`evidence/P20B/implementation-05.md:74-80`) did not appear.

One honest note on how I read the logs: a first grep for `failed` matched 27-28 lines per run, which
looked alarming. Inspecting the exact text showed all of them were `[WebServer]` application log
noise — 19 × `Request authentication failed`, 4 × `Failed to fetch`, 2 × `Failed to push` — from
tests that deliberately exercise offline and revoked-grant paths. The Playwright summary line is
`166 passed` with no `failed` or `flaky` count in every run. The lesson is that a loose grep is not
a classification; the exact text is.

#### `addEmptyTransaction` / `newlyAddedRow` — independent observation, null result

Root asked for an explicit report either way, because the P22 reviewer is measuring a failure rate
in that helper (`tests/e2e/helpers/settlement.ts:212-216`) and saw `locator resolved to 0 elements`
at `:215`.

**I observed zero occurrences across all four runs.** Grepping the logs for
`resolved to 0 elements`, `settlement.ts:21[0-9]` and `newlyAddedRow` returns 0 in each.

This is a genuinely independent sample, and I stated why **before** having results rather than
after: my tree contains `ed94edf`, the rev 01 focus change that introduced that sync point, so I
exercise the same helper under the same mechanism; but my UR-002 journey step does not itself call
`addEmptyTransaction`, so any hit would have come from pre-existing call sites rather than my new
code. A null result is reported as explicitly as a positive one would have been — omitting it
because it is unexciting would bias the P22 verdict toward "nobody else saw it". I did not touch the
helper; it belongs to P22.

**What this null result does and does not mean.** It is 4 clean runs against their reported 2
failures in 166; at that rate a run of mine could easily have shown zero by chance, so this
**weakens but does not refute** the case that the helper synchronises on transient state. It is one
more sample, not a verdict — that is P22's call to make.

### What the six passing gates now cover

The unit suite proves the pure predicate and, via the page-level test, that the page threads the
resolver into it under jsdom. The E2E campaign is what establishes the rest: the debounced search
input under real timing, the virtualized table's re-render after a filter change, and alias
resolution over a live CRDT document rather than a fixture object — including the reported case
end-to-end, since the mutation check shows the step fails in a real browser without the fix.

Still **not** covered by anything here: search behaviour across a second identity or a second tab.
Nothing in UR-002 requires it and search is local-only state, so I did not add coverage; recorded so
the boundary is explicit rather than assumed.

## Claim-to-evidence note

Everything above under "Check results", the mutation check, and the process/port identification are
**observations** — commands I ran, output I read. The following are **inferences**, labelled as
such:

- That the principal's specific unfindable row was a manual row with `description: ""` is an
  inference from `page.tsx:579` plus their report; I did not inspect their vault and would not.
- That the P22 worktree's port reacquisition represents "their next run starting" is an inference
  from process timing and argv. What I observed is that PID 68997 exited and a new `next-server`
  from the same worktree path held the port ~16s later.
- The requirement-to-test matrix asserts coverage I wrote **and have now run**; every column is
  observed. The E2E column additionally rests on the mutation check, which is the only thing showing
  those assertions would fail if the fix were absent.
- The per-run numbers, durations, digests and the zero-occurrence `addEmptyTransaction` result are
  **observations** read from the four run logs.
- That my null `addEmptyTransaction` result "weakens but does not refute" the P22 helper hypothesis
  is an **inference** from their reported 2-in-166 rate against my 4 clean runs; I did not compute a
  confidence interval, and the sample sizes are small enough that chance alone could explain it.
- That `next-env.d.ts` showing modified in both trees is Next-generated churn rather than my edit is
  an **observation**: it was already modified in the main checkout at session start, its diff is a
  generated `.next` path reference, and it sits at the repository root outside the digest's
  `src`/`tests` scope.
