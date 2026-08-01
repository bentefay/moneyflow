# P23 revision 01 — implementation-01 (UR-002 search matches alias-resolved descriptions)

**Implementer:** `p23-implementer-01` (fresh context) · **Base HEAD at start:**
`6e82c70067335d6f1b957ed1235fac26f1582400` (root ledger dispatch commit) · **Commits:** `391bee6`
(product + tests), `c041795` (page-level regression test)

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

| Frozen requirement (lines 46-53)               | Covering test                                                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Matches alias-resolved text when aliased       | unit "finds an aliased row with no stored description by its alias text"; page-level test 1; E2E step 1 |
| Raw stored description stays matchable         | unit "still finds a row by its raw stored description"; page-level test 2; E2E step 3                   |
| Notes stay matchable                           | unit "still finds a row by its notes"; page-level test 2                                                |
| One-hop symlink resolution matches the display | unit "follows a one-hop symlink to the real alias name"; page-level test 1 (`alias-trial`)              |
| Case-insensitive, substring                    | unit lowercase/uppercase/mid-substring cases; page-level test 3; E2E step 2                             |

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

**`tests/e2e/description-aliases.spec.ts`** — new test reproducing the principal's exact report:
create a transaction, alias it to "Testing", search "test", expect the row. It also asserts a second
aliased row is _excluded_, so the test cannot pass by simply failing to filter. Assertions are on
row presence, never on copy. Alias-dependent assertions after a re-render use `{ timeout: 15_000 }`
per the documented load-dependent flake discipline.

## Check results

| Check          | Result                                                                                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `typecheck`    | **PASS**                                                                                                                                                                                         |
| `lint`         | **PASS** — 0 errors. 1 pre-existing warning in `TransactionTable.tsx:422` (React Compiler / TanStack `useVirtualizer`), a file I did not touch                                                   |
| `format:check` | **PASS on my 5 files** under scoped oxfmt. Repo-wide fails on exactly the 17 pre-existing frozen `specs/**` files documented as a standing condition; no `src/` or `tests/` file is in that list |
| `test`         | **PASS** — 114 files, 2117 passed / 2 skipped, **3 consecutive clean runs**                                                                                                                      |
| `build`        | not run (not in the six-check list)                                                                                                                                                              |
| `test:e2e`     | **NOT RUN — BLOCKED.** See below                                                                                                                                                                 |

### The E2E gate is blocked, and I am not claiming otherwise

`playwright.config.ts` hard-codes `baseURL` and `webServer.url` to `http://localhost:3000` with
`reuseExistingServer: false`. Port 3000 is held continuously by the **concurrent P22 reviewer's**
campaign running out of `/tmp/mf-e2e-p22`. Identified from `ss -lptn` plus process argv, not from a
task list: first `next-server` PID 70036 under `next dev --turbopack` PID 69888, alongside their
Playwright CLI PID 68997 (`--retries=0 --workers=4`). When that CLI exited at 17:17:01 the port did
**not** free — a new `next-server` PID 103291 from the same worktree took it within seconds, i.e.
their campaign simply began its next run. The port is available only in brief inter-run gaps, and
taking it in one would void the very campaign the dispatch told me not to disturb.

I did not edit `playwright.config.ts` or `next.config.ts`, did not touch `.next/dev/lock`, did not
kill the human principal's dev server on :3001 (PID 818156, still running), and did not use
`/tmp/mf-e2e-p22`. My own worktree `/tmp/mf-e2e-p23` is prepared at the handback commit with
dependencies installed and `.env.local` copied, waiting on the port.

One run was attempted and refused before any browser started:

```
Error: http://localhost:3000 is already used, make sure that nothing is running on the port/url
or set reuseExistingServer:true in config.webServer.
```

**A note on how the campaign must be run when the port frees.** It must **not** use `CI=true`. The
config reads `workers: process.env.CI ? 1 : 4` and `retries: process.env.CI ? 2 : 0`, so `CI=true`
would give 1 worker and 2 retries — the opposite of the 4-worker `--retries=0` load profile the
flake discipline requires. (`CI=true` on the worktree `pnpm install` is fine and unrelated.) The
tree digest for the campaign is `0a149986d9c74aab61c311bac7399806` (md5 over all `src`/`tests`
`.ts`/`.tsx`, sorted). The digest covers code and tests only, so it is pinned by `c041795`, the last
commit touching either — the evidence commit that follows it cannot move it. An earlier digest of
`4553956ad6b988ddea2d79980fa6f1ab` was recorded at `391bee6`, before the page-level regression test
was added; it is superseded and no run was executed against it. Per the tree-drift rule any further
change invalidates runs so far and the campaign restarts from run 1.

### What the five passing gates do and do not cover

Stated explicitly rather than implying near-completion. The unit suite proves the **pure predicate**
and, via the page-level test, that the page **threads the resolver into it in jsdom**. It proves
nothing about the real browser: not the debounced search input under real timing, not the
virtualized table's re-render after a filter change, not alias resolution over a live CRDT document
rather than a fixture object, and not sync or a second identity. Only the full-suite E2E run
establishes those, and it has not been run. **UR-002 should not be treated as verified until it
is.**

## Claim-to-evidence note

Everything above under "Check results", the mutation check, and the process/port identification are
**observations** — commands I ran, output I read. The following are **inferences**, labelled as
such:

- That the principal's specific unfindable row was a manual row with `description: ""` is an
  inference from `page.tsx:579` plus their report; I did not inspect their vault and would not.
- That the P22 worktree's port reacquisition represents "their next run starting" is an inference
  from process timing and argv. What I observed is that PID 68997 exited and a new `next-server`
  from the same worktree path held the port ~16s later.
- The requirement-to-test matrix asserts coverage I wrote and ran; the E2E column is **claimed
  coverage, not yet observed**, since that suite has not executed.
