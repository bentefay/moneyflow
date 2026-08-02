# P25 / revision 01 — UR-004 default currency inferred from time zone

- **Package / revision:** P25 / 01
- **Requirement:** UR-004 (`tasks/ur-004.md`, package contract `tasks/P25-ur-004.md`)
- **Frozen source:** `specs/009-user-reported-refinements/spec.md` lines 76-98 (markerless,
  immutable, not edited)
- **BASE / dispatch HEAD at start:** `d03e2ce64def08436653b221d803f836b3f11173`
- **Rebased onto:** `5650003aa39e991bc238cea7891d9fa0748d9860` — main advanced during implementation
  with six docs-only commits touching `PROGRESS.md`, `QUESTIONS.md`, `reviews/P24-review-01.md` and
  `tasks/ur-005.md`. No overlap with any file in this package; the rebase was clean and the source
  digest is byte-identical before and after (`b1086650a47ba2aa597002101460d2f1`), so the E2E
  campaign in §6 remains evidence for this tree.
- **Product/test commit:** `b41e715` —
  `feat: infer default currency from time zone with locale fallback`
- **Evidence commit:** this file, committed on top of the product commit as
  `docs: record P25 rev 01 implementation evidence for UR-004`. Its own hash is not quoted here,
  since a commit cannot contain its own hash.
- **Worktree:** `/tmp/mf-e2e-p25` on branch `p25-ur-004`

> **Secret-safety statement.** No key material, seed phrase, recovery material,
> `SUPABASE_JWT_SECRET` value, presence key, invite fragment or vault plaintext appears in this
> file, in the code, or in the tests. The only external data introduced is a public IANA-derived
> time-zone-to-country table shipped by an MIT-licensed package.

---

## 0. Two corrections to the dispatch

Both are recorded because the dispatch instructed me to check root's claims rather than work around
them.

**0.1 — The frozen-text citation in the dispatch was wrong (material).** The dispatch said to rule
from `specs/010-user-reported-refinements-2/spec.md` lines 40-54. That file contains no UR-004 at
all; its `## UR-` headings are UR-005, UR-006, UR-007 and UR-008, and lines 40-54 are UR-007 (dates
display in the browser's locale) — a different requirement. The package contract
`tasks/P25-ur-004.md` and the requirement task `tasks/ur-004.md` both name the correct source:
`specs/009-user-reported-refinements/spec.md` lines 76-98. I ruled from that. Had I followed the
dispatch citation literally I would have implemented locale-based date formatting instead of this
requirement.

**0.2 — The `Intl` probe returns `undefined`, not `"none"` (immaterial).** The dispatch and the
requirement task both state that `new Intl.Locale('en', {timeZone: 'Australia/Brisbane'}).region`
returns `none`. Observed on Node v22.21.1:

```
region: undefined  timeZones: undefined
```

The conclusion is unaffected and I confirm it: `Intl` exposes no time-zone -> country path, so a
library is genuinely required, exactly as the frozen text says. Note the _forward_ direction does
exist — `new Intl.Locale('en-AU').timeZones` returns the 12 Australian zones — but that is country
-> zones, the inverse of what this requirement needs, and it is keyed off the locale whose
unreliability is the entire defect.

---

## 1. The defect and the required behaviour

Frozen text, verbatim in substance: the time zone is the **primary** signal; locale-derived
inference remains a **fallback** for when the time zone yields no country (e.g. `UTC` in containers
and VMs); a **final fallback** currency applies when neither yields a supported currency; the
time-zone-to-country mapping uses an **established, maintained library** rather than a hand-written
table, and the existing country-to-currency map may be reused; and the inferred value is only a
**default**, presented in the vault creation flow and changeable before and after creation.

Before this change, `detectDefaultCurrency` resolved `navigator.languages[0]` -> BCP 47 region
subtag -> `REGION_TO_CURRENCY`. The principal runs `LANG=en_US.UTF-8` with time zone
`Australia/Brisbane`, so `en-US` yielded region `US` yielded USD. `en-US` is the default locale on
most Linux installs, container images and dev environments, so this failed silently and
systematically for non-US users.

---

## 2. Dependency choice — candidates considered

| Candidate                     | Version | Licence | Runtime deps | Verdict                                                                                                                        |
| ----------------------------- | ------- | ------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **`countries-and-timezones`** | 3.9.0   | MIT     | **0**        | **Chosen.** Plain data lookups, IANA-derived, carries deprecated aliases, no date/time framework.                              |
| `tz-lookup`                   | 6.1.25  | CC0-1.0 | 0            | Rejected — solves a different problem.                                                                                         |
| `moment-timezone`             | 0.6.3   | MIT     | 1 (`moment`) | Rejected — pulls in a full date/time framework for a data lookup; the frozen text prefers plain data. Also no zone -> country. |
| Native `Intl`                 | n/a     | n/a     | 0            | Rejected — exposes no zone -> country mapping at all (§0.2).                                                                   |

**`tz-lookup` rejection, confirmed rather than assumed.** The dispatch asked me to confirm before
dismissing it. I installed it in a throwaway directory outside the repo and read its shipped README:

```
This is a little Javascript library that allows you to look up the time zone of
a location given its latitude and longitude.
...
console.log(tzlookup(42.7235, -73.6931)); // prints "America/New_York"
```

Its signature is `tzlookup(lat, lon) -> IANA zone name` — the **inverse** of what this requirement
needs, and it would additionally require a geolocation permission prompt. Root's read was correct.
The throwaway directory was deleted; the repo was never touched by it.

**Maintenance and licence, observed from the installed package.** `node_modules/…/LICENSE` is the
MIT licence, "Copyright (c) 2020 Manuel de la Torre". `package.json` declares version 3.9.0 and
`engines: {node: '>=8.x'}`. The registry reports last modification 2026-04-12 (root's figure; I did
not independently re-derive the date, and label that as unverified here).

**IANA derivation, observed.** The shipped README states: "Minimalistic library to work with
countries and timezones data. Updated with the [IANA timezones database]". The installed data
contains 341 canonical zones and 598 including deprecated aliases — consistent with a tzdb-derived
dataset rather than hand curation. This is corroborating evidence, not proof of provenance; the
load-bearing check is the behavioural alias test in §4, which is a test rather than a claim.

**Transitive dependency count, read from the lockfile after install** (not the registry page), as
required:

```
pnpm-lock.yaml:8375:  countries-and-timezones@3.9.0: {}
```

The empty object is the resolved dependency set: **zero transitive dependencies**. The importer
entry records `specifier: ^3.9.0 / version: 3.9.0`.

**Policy compliance.** Added with `pnpm add` under the pinned `pnpm@11.13.1`, so `package.json` and
`pnpm-lock.yaml` both updated. No override was needed; I confirmed `package.json` contains no
`pnpm.overrides` block, which per the dispatch would have been silently ignored by pnpm 11 anyway.

---

## 3. Implementation

`src/lib/domain/detect-currency.ts` now resolves in three rungs — time zone, then locale, then a
final fallback:

```
1. Intl.DateTimeFormat().resolvedOptions().timeZone -> ISO 3166 country -> currency
2. navigator.languages[0] / navigator.language -> region subtag -> currency
3. FALLBACK_CURRENCY ("USD")
```

Notable points:

- The pure core is extracted as `resolveDefaultCurrency(timeZone, locale)`, which takes both signals
  as arguments and touches no globals. This is what makes the ordering directly unit-testable
  without stubbing the environment.
- `FALLBACK_CURRENCY` is now an exported named constant rather than a `"USD"` literal repeated at
  five return sites.
- Both signals funnel through one `supportedCurrencyForRegion` helper, so "resolved to a country
  whose currency this app does not support" is treated identically to "resolved to nothing" and
  falls through to the next rung. The existing `REGION_TO_CURRENCY` table is **reused, not
  duplicated**, as the frozen text permits.
- The module stays pure and side-effect free. `getBrowserTimeZone` returns `undefined` rather than
  throwing when `Intl` is unavailable, and `detectDefaultCurrency` retains its outer `try`/`catch`
  and its SSR guard.
- No `as`, no `any`, no `!` in product code. The library's overload
  `getCountryForTimezone(tzName: string, options?) => Country | null` accepts a plain `string` and
  returns a nullable, so no assertion was needed.

**Stale comments corrected, both of which contradicted the shipped behaviour:**

- The `detect-currency.ts` header previously asserted locale is "more reliable than timezone". That
  rationale is refuted by the principal's own machine. It is replaced with an explanation of why the
  time zone leads and why the locale rung still exists.
- `src/lib/crdt/defaults.ts:132` said "Use detectDefaultCurrency() to infer from browser locale"; it
  now says time zone, falling back to browser locale.
- I also updated the inline comment at the single production caller,
  `src/lib/vault/ensure-default.ts:142`, which said "Detect user's preferred currency from browser
  locale". The dispatch did not list this one; I found it by grep. Reported here as work slightly
  beyond the enumerated scope — it is a one-line comment that would otherwise have been left stating
  the opposite of what the code does.

`detectDefaultCurrency` still has exactly one production caller, `ensure-default.ts:23`, as the
dispatch stated. Verified by grep across `src/`.

---

## 4. The four things I had to establish myself, as tests

All four are unit tests in `tests/unit/domain/detect-currency.test.ts`, not assertions in prose.

**4.1 — `Australia/Brisbane` -> `AU` -> `AUD`.** The principal's own reported case, covered at three
levels: `getCurrencyFromTimeZone("Australia/Brisbane") === "AUD"`;
`resolveDefaultCurrency("Australia/Brisbane", "en-US") === "AUD"` (time zone beating the exact
conflicting locale from the bug report); and `detectDefaultCurrency()` with both globals stubbed.
There is also an E2E covering it through the real UI (§5).

**4.2 — Deprecated zone aliases resolve.** Table-driven over six legacy names, each observed to
reach the right currency: `Australia/Queensland` -> AUD, `Australia/NSW` -> AUD, `Asia/Calcutta` ->
INR, `Europe/Kiev` -> UAH, `Asia/Saigon` -> VND, `America/Buenos_Aires` -> ARS. Directly probed, the
library reports these as `deprecated: true` with an `aliasOf` pointing at the canonical zone, and
still resolves the country.

**4.3 — Transitive dependency count from the lockfile.** Zero. See §2.

**4.4 — The `UTC` fallback path.** `getCurrencyFromTimeZone` returns `undefined` for `UTC`,
`Etc/UTC`, `Etc/GMT` and `Etc/GMT+10` — all observed to map to no country, which is precisely why
the frozen text keeps locale as the fallback rung. `resolveDefaultCurrency("UTC", "en-GB")` is
`"GBP"`, and the E2E in §5 exercises the same path through the browser.

**Additional coverage required by the dispatch:** neither signal resolving falls back to
`FALLBACK_CURRENCY`; an unsupported currency falls back (`Asia/Yangon` resolves to a real country,
`MM`, which `REGION_TO_CURRENCY` does not cover, so it correctly falls through to the locale);
unknown zones and the empty string fall through; and `Intl` being entirely unavailable still yields
a locale-derived currency rather than throwing.

**No existing test was weakened.** The pre-existing `getBrowserLocale`, `getCurrencyFromLocale` and
50-row `region coverage` suites are retained verbatim. The `detectDefaultCurrency` suite's
expectations were necessarily updated, because those tests asserted the old locale-primary contract
that this requirement reverses — each now pins a time zone explicitly rather than depending on the
host. The file went from 88 to 120 tests.

**Mutation check — the timezone test is load-bearing, not passing trivially.** My host's own time
zone is `Australia/Brisbane`, so a Brisbane-expects-AUD test could pass for the wrong reason. Two
observations rule that out. First, the whole file passes unchanged under `TZ=America/New_York`
(120/120), so it is host-TZ independent. Second, I temporarily changed the product code to pass
`undefined` instead of `getBrowserTimeZone()` and re-ran: exactly one test failed — "uses the time
zone in preference to a conflicting locale" — and 119 passed. The mutation was then reverted and the
file re-verified at 120/120. That mutation was made in my own worktree only; the shared checkout was
never touched.

---

## 5. E2E — the flow, and a suite-wide consequence

Four E2E tests in `tests/e2e/onboarding-vault.spec.ts`, each creating a browser context with an
explicit `timezoneId` and `locale` so they assert behaviour rather than host configuration:

1. `Australia/Brisbane` + `en-US` -> the vault is created with **AUD**. The reported defect, through
   the real UI.
2. `UTC` + `en-GB` -> **GBP**. The container/VM fallback rung.
3. `UTC` + `en` -> **USD**. Neither signal resolves.
4. The inferred value is a **default, not a lock-in**: it is presented in the vault creation flow,
   the user changes it to JPY, and it survives a reload.

Test 4 is what covers the last clause of the frozen text. The three inference tests would all pass
against an implementation that hard-locked the inferred value, so that clause needed its own test.

**Consequence for the rest of the suite — reported because it was not in the plan.** Making the time
zone primary means the default currency of every test vault now depends on the _host's_ time zone,
where previously Playwright's default `en-US` locale made it deterministically USD. Three specs
assert USD only incidentally — `people-settlement.spec.ts` (63 currency assertions),
`accounts.spec.ts` (inherited-currency display) and `vault-settings.spec.ts` (one default
assertion). On this Brisbane host they would now see AUD and fail, and worse, they would pass or
fail depending on who ran them.

I added `test.use({ timezoneId: "America/New_York" })` to those three specs, with a comment
explaining why. This pins the inferred default back to USD for tests that are about settlement,
accounts and settings rather than about currency inference — which is now covered in one place. This
makes those specs _more_ deterministic than before, since they previously inherited the host zone
implicitly. No assertion in them was weakened or deleted.

Per the live `Q-P24-01` hazard — Playwright matches accessible names by substring while Testing
Library matches exactly — the new locators use `getByRole("combobox", { name: "Default currency" })`
against a control whose `aria-label` is exactly `Default currency`. I read `CurrencySelector.tsx` to
confirm the accessible name is that exact string and that no other combobox on the settings page
shares a name it could be a substring of.

---

## 6. Six checks

Run in the worktree `/tmp/mf-e2e-p25`. Full sequence including failures, as required.

| #   | Check               | Result                                                                                                                                                                                                                                                                                                                                                            |
| --- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `pnpm typecheck`    | **PASS** — clean, no output                                                                                                                                                                                                                                                                                                                                       |
| 2   | `pnpm lint`         | **PASS** — 0 errors, 1 pre-existing warning in `TransactionTable.tsx:426` (`react-hooks/incompatible-library`, TanStack Virtual), untouched by this package                                                                                                                                                                                                       |
| 3   | `pnpm format:check` | **PASS for this package** — fails on exactly **17** pre-existing frozen `specs/**` files, the documented known condition. I verified the count is still 17 and that **none is a P25 file** and none is mine. I formatted only my own eight files, with `oxfmt` scoped to explicit paths rather than the bare command, which would have reflowed the frozen specs. |
| 4   | `pnpm build`        | **PASS**                                                                                                                                                                                                                                                                                                                                                          |
| 5   | `pnpm test`         | **PASS** — 115 files, 2182 passed, 2 skipped. See failure sequence below.                                                                                                                                                                                                                                                                                         |
| 6   | `pnpm test:e2e`     | **PASS** — 3 consecutive full-suite `--retries=0` runs, 167 passed each                                                                                                                                                                                                                                                                                           |

**Unit test failure sequence, reported in full.** The first `pnpm test` run reported 3 failed files.
Two were `tests/integration/realtime-*.test.ts` failing with
`ENOENT: no such file or directory, open '.env.local'` — `.env.local` is gitignored, so a fresh
worktree does not receive it. I copied it in from the main checkout; it remains untracked. The third
was `tests/unit/import/duplicates.test.ts:749`, the documented wall-clock **ratio** assertion,
failing at `4.03 < 4` — a 0.8% overshoot under the CPU load of a concurrent build. Per the known
condition I checked it first, and it passed in the quiet re-run. Neither failure was a code defect
and neither was worked around: the second full run was clean at 2182 passed with no code change
between them.

**E2E campaign — restarted once for tree drift, per discipline.** My first two runs both passed
167/167, but the staged-diff digest changed between them: `b1086650…` then `b6fabd0b…`. Rather than
report a mixed campaign I investigated. The drift was `next-env.d.ts`, a Next.js artifact that
`next dev` rewrites on each start (`./.next/types/routes.d.ts` -> `./.next/dev/types/routes.d.ts`) —
it is not source, and it will flip on every campaign by construction. I restored it, switched the
digest to cover source only (`git diff HEAD~1 -- . ':!next-env.d.ts'`), and **restarted from run 1**
rather than counting the earlier runs.

| Run | Digest before/after                | Result                |
| --- | ---------------------------------- | --------------------- |
| 1   | `b1086650a47ba2aa597002101460d2f1` | **167 passed** (3.9m) |
| 2   | `b1086650a47ba2aa597002101460d2f1` | **167 passed** (4.0m) |
| 3   | `b1086650a47ba2aa597002101460d2f1` | **167 passed** (3.9m) |

Digest re-verified before run 1 and after run 3, unchanged throughout. All runs used
`env -u CI pnpm exec playwright test --retries=0 --reporter=line`. **`CI` was never set** for the
Playwright runs, since `playwright.config.ts:56,60` would give 1 worker and 2 retries under CI and
launder flakes into passes. No `--debug`, `--ui`, `--headed` or `show`. I confirmed all four new
`Currency Detection` tests appear in `--list` and therefore ran in each of the three runs.

**Environment discipline.** Before starting I confirmed port 3000 was unbound by reading
`/proc/<pid>/cmdline` for every PID rather than using `pgrep -f`, whose pattern matches the checking
command itself. The only listener was the human's dev server on `:3001` (PID 818182, child of
818156), which I did not touch. A stray root-owned `next-server` (PID 3622053) held no listening
socket. Work was confined to my own worktree `/tmp/mf-e2e-p25`; I did not touch `/tmp/mf-e2e-p22`,
`-p22r3`, `-p23`, `-p24` or `-p24r1`, and did not edit `playwright.config.ts` or `next.config.ts`.
The shared main checkout was never mutated.

---

## 7. Files changed

| File                                                                                | Change                                                                                                                     |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/domain/detect-currency.ts`                                                 | Time-zone-primary resolution; pure `resolveDefaultCurrency` core; exported `FALLBACK_CURRENCY`; header rationale corrected |
| `src/lib/vault/ensure-default.ts`                                                   | Caller comment corrected (beyond enumerated scope — see §3)                                                                |
| `src/lib/crdt/defaults.ts`                                                          | Stale doc-comment at `:132` corrected                                                                                      |
| `package.json`, `pnpm-lock.yaml`                                                    | `countries-and-timezones@^3.9.0` added via `pnpm add`                                                                      |
| `tests/unit/domain/detect-currency.test.ts`                                         | 88 -> 120 tests; time zone, alias, fallback and purity coverage added                                                      |
| `tests/e2e/onboarding-vault.spec.ts`                                                | `Currency Detection` rewritten to the new contract; change-and-persist test added                                          |
| `tests/e2e/people-settlement.spec.ts`, `accounts.spec.ts`, `vault-settings.spec.ts` | `test.use({ timezoneId })` pinned so incidental USD assertions stay host-independent (§5)                                  |

No ledger, marker, scratch, SCOPE, spec, FINAL-AUDIT or reviews file was edited. The frozen source
`specs/009-user-reported-refinements/spec.md` was read only.

---

## 8. Requirement-by-requirement

| Frozen clause                                                      | Where satisfied                                                              |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Time zone is the primary signal                                    | `resolveDefaultCurrency` rung 1; unit tests §4.1; E2E test 1; mutation check |
| Locale remains a fallback for zones yielding no country            | Rung 2; `UTC`/`Etc/*` unit tests §4.4; E2E test 2                            |
| A final fallback applies when neither yields a supported currency  | `FALLBACK_CURRENCY`; unit tests; E2E test 3                                  |
| Mapping uses an established, maintained library, not a hand table  | `countries-and-timezones` 3.9.0, MIT, 0 deps, IANA-derived (§2)              |
| The existing country-to-currency map may be reused                 | `REGION_TO_CURRENCY` reused by both rungs via one helper                     |
| Inferred value is only a default, shown and changeable, not locked | E2E test 4 — presented, changed to JPY, survives reload                      |
