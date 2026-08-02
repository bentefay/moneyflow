# P25 review 01 — UR-004 default currency inferred from time zone

**Reviewer:** `p25-reviewer-01`, fresh context, DISTINCT from `p25-implementer-01`. I authored none
of the code under review.

**Tree reviewed:** BASE == HEAD == `54a8136ac6102cd9cc2628e627457aeacae73112`, confirmed by
`git rev-parse HEAD`. Commits under review `b41e715` (product/test) and `6ad7ebe` (evidence). Both
confirmed ancestors of HEAD by `git merge-base --is-ancestor`, not by `git show` alone, so neither
is a dangling amended commit.

**Reviewer worktrees:** `/tmp/mf-p25-rev01` at `54a8136` for the E2E campaign, and
`/tmp/mf-p25-mutate` at `54a8136` for the six checks and the mutation probes. I did not touch
`/tmp/mf-e2e-p22*`, `/tmp/mf-e2e-p23`, `/tmp/mf-e2e-p24*`, or `/tmp/mf-e2e-p25`, and I never mutated
the shared main checkout.

## VERDICT: **PASS**

The reported defect is fixed. I confirmed it in a real browser on the principal's own configuration,
not only in tests. All six checks pass on my own tree, and my own independent 3-run full-suite
`--retries=0` campaign reproduced the implementer's result exactly at 167 passed with a stable
source digest.

One **advisory, non-blocking** finding is recorded in §8 and proposed as a Q-carry-forward. It
concerns a doc-comment clause that overstates the flow, not shipped behaviour. It does not justify a
FAIL.

---

## 0. Dispatch claims I was asked to check

Root asked me to check its claims rather than work around them. All of the following survived.

| Root's claim                                                             | My check                                                                | Result        |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ------------- |
| Frozen source is `spec.md` lines **76-98**                               | Compared against `SCOPE.json:678-706` `lineRange` and `sourceTextLines` | **CONFIRMED** |
| `Australia/Brisbane` -> `AU`                                             | Ran the installed library directly                                      | **CONFIRMED** |
| `Australia/Queensland` -> `AU`, `Asia/Calcutta` -> `IN`                  | Ran the installed library directly                                      | **CONFIRMED** |
| `UTC` -> no country                                                      | Ran the installed library directly, returns `null`                      | **CONFIRMED** |
| Lockfile reads `countries-and-timezones@3.9.0: {}`, zero transitive deps | Read `pnpm-lock.yaml:8375`                                              | **CONFIRMED** |
| `tz-lookup` solves the INVERSE problem, lat/long -> zone                 | Confirmed from the package's own README, quoted in evidence §2          | **CONFIRMED** |
| Port 3000 free; only the human's dev server on 3001                      | Enumerated `/proc/<pid>/cmdline` for every PID, plus `ss -ltnp`         | **CONFIRMED** |
| `format:check` fails on exactly 17 pre-existing `specs/**` files         | Counted; 17, none a P25 file                                            | **CONFIRMED** |
| A fourth stale comment exists at `ensure-default.ts:142`                 | Present and corrected; root's dispatch had not listed it                | **CONFIRMED** |

The citation verification is worth spelling out because root flagged its own earlier error.
`SCOPE.json:678-681` declares `"kind": "sectionLineRange"`, `"lineRange": "76-98"`, and its
`sourceTextLines` array at `:682-706` is byte-identical to `spec.md` lines 76-98 as printed by
`awk`. The citation in the dispatch I received is correct.

---

## 1. Verification — commands and real output

Run in `/tmp/mf-p25-mutate`, my own worktree at `54a8136`, never in the shared main checkout.

| Check               | Command         | Result                                                 |
| ------------------- | --------------- | ------------------------------------------------------ |
| `pnpm typecheck`    | `tsc --noEmit`  | **PASS**, exit 0, no output                            |
| `pnpm lint`         | `eslint`        | **PASS**, `1 problem (0 errors, 1 warning)`            |
| `pnpm format:check` | `oxfmt --check` | **KNOWN CONDITION** — 17 pre-existing `specs/**` files |
| `pnpm test`         | `vitest run`    | **PASS** — `115 passed`, `2182 passed \| 2 skipped`    |
| `pnpm test:e2e`     | see §7          | **PASS** — 3/3 runs, `167 passed`                      |
| Manual browser      | see §6          | **PASS** — defect fixed in the running app             |

The single lint warning is `react-hooks/incompatible-library` in a virtualiser hook, pre-existing
and untouched by this diff. Zero errors.

`format:check` reports `Format issues found in above 17 files`, matching root's stated count
exactly. I listed all 17 and confirmed **none is a P25 file** — they are frozen `specs/**` artifacts
(`DECISIONS.md`, `PROGRESS.md`, `QUESTIONS.md`, `SCOPE.json`, `human-scratch.md`, P12/P14/P16D/P19
evidence, P12 reviews). `evidence/P25/implementation-01.md` is **not** among them, so the new
evidence file is correctly formatted.

The two `tests/integration/realtime-*.test.ts` files needed `.env.local`, which is gitignored and
absent from a fresh worktree; I copied it in from the main checkout before running `pnpm test`. That
is a provisioning artifact of my own making, recorded rather than omitted. The load-sensitive
`tests/unit/import/duplicates.test.ts:749` ratio assertion passed on my run.

---

## 2. Rung order, purity, and safe degradation — CONFIRMED

`src/lib/domain/detect-currency.ts` resolves in exactly the three rungs the frozen text requires.
The pure core is `resolveDefaultCurrency(timeZone, locale)` at `:75-88`: time zone first, locale
second, `FALLBACK_CURRENCY` last. It takes both signals as arguments and touches no globals, which
is what makes the ordering testable without stubbing the environment. This is the right shape and it
matches the repo's functional-programming rule.

Purity and safe degradation hold at every level:

- `getBrowserTimeZone()` returns `undefined` rather than throwing when `Intl` is unavailable, via
  its own `try`/`catch`.
- `getCurrencyFromTimeZone()` wraps the library call in `try`/`catch` and returns `undefined` on a
  null country.
- `detectDefaultCurrency()` retains its SSR guard (`typeof window === "undefined"`) and its outer
  `try`/`catch`.

Both signals funnel through one `supportedCurrencyForRegion` helper at `:179-186`, so "resolved to a
country whose currency this app does not support" is treated identically to "resolved to nothing"
and falls through to the next rung. This is a genuine behavioural improvement over the old code,
which returned the region's currency without checking `Currencies` membership at that site. The
existing `REGION_TO_CURRENCY` table at `:231` is reused, not duplicated, exactly as the frozen text
permits.

The SSR early return is correctly reasoned in a comment: the server's time zone is not the user's,
so inferring from it would be misleading.

---

## 3. The principal's own case, as a test — CONFIRMED

I verified the full chain independently rather than accepting the claim. Running the **installed**
library in `/tmp/mf-p25-rev01`:

```
"Australia/Brisbane"    -> AU
"Australia/Queensland"  -> AU
"Australia/NSW"         -> AU
"Asia/Calcutta"         -> IN
"Europe/Kiev"           -> UA
"Asia/Saigon"           -> VN
"America/Buenos_Aires"  -> AR
"UTC"                   -> null
"Etc/UTC"               -> null
"Etc/GMT"               -> null
"Etc/GMT+10"            -> null
"Not/AZone"             -> null
""                      -> null
"Asia/Yangon"           -> MM
"Europe/London"         -> GB
"Asia/Kolkata"          -> IN
```

Every one of the 16 zones matches the implementer's claims exactly. `AU` reaches `AUD` through the
existing `REGION_TO_CURRENCY` table, and the unit test asserts the whole chain at three levels:
`getCurrencyFromTimeZone("Australia/Brisbane") === "AUD"`,
`resolveDefaultCurrency("Australia/Brisbane", "en-US") === "AUD"` (time zone beating the exact
conflicting locale from the bug report), and `detectDefaultCurrency()` with both globals stubbed. It
is a test, not a claim, as the dispatch required.

**The `Asia/Yangon` case is a genuinely good test** and I verified its premise rather than assuming
it: `MM` appears **zero** times in `detect-currency.ts`, so `getCountryForTimezone` succeeds while
`supportedCurrencyForRegion` returns `undefined`. That exercises the "resolved to a country whose
currency this app does not support" branch, which is a real and easily-missed path.

---

## 4. Deprecated aliases and the `UTC` fallback — CONFIRMED

All six deprecated aliases in the table-driven test resolve, independently confirmed above. The
library reports these as `deprecated: true` with an `aliasOf` pointer and still resolves the
country. This matters because users and systems on legacy zone names are exactly who this inference
serves.

The `UTC` fallback path is the frozen text's stated reason for keeping the locale rung, and it is
correct: `UTC`, `Etc/UTC`, `Etc/GMT` and `Etc/GMT+10` all yield `null`, so
`resolveDefaultCurrency("UTC", "en-GB")` is `"GBP"`. The empty string and an unknown zone also yield
`null` without throwing.

---

## 5. The dependency — sound choice, CONFIRMED

`countries-and-timezones@3.9.0` is the right choice and the rejections are sound.

- **Licence:** MIT, from the shipped `LICENSE` file in the installed package.
- **Transitive deps:** `pnpm-lock.yaml:8375` reads `countries-and-timezones@3.9.0: {}` — the empty
  object is the resolved dependency set. **Zero.** Verified from the lockfile after install, not
  from a registry page.
- **IANA derivation:** the shipped README states "Updated with the
  [IANA timezones database](https://www.iana.org/time-zones)". The evidence correctly labels this as
  corroborating rather than proof, and rests the load-bearing check on the behavioural alias test
  instead. That is the right epistemic call.
- **Shape:** plain data lookups with no date/time framework, matching the frozen text's preference.

The rejections hold up. `tz-lookup` genuinely solves the inverse problem (lat/long -> zone) and
would additionally require a geolocation permission prompt. `moment-timezone` pulls a full date/time
framework for a data lookup and does not expose zone -> country anyway. Native `Intl` exposes no
zone -> country mapping at all — root verified this and the evidence does not merely repeat it.

Added via `pnpm add` under the pinned `pnpm@11.13.1`, with both `package.json` and `pnpm-lock.yaml`
updated. No override was needed, so the `pnpm-workspace.yaml` vs `package.json` override hazard does
not arise here.

---

## 6. Manual browser verification — the defect is fixed in the running app

This is the check that matters most to the principal, and I ran it on the **principal's own
configuration** rather than a simulated one.

I used the repository-installed Playwright CLI in a unique non-persistent session against the
human's dev server on `:3001`. Before using it I confirmed that server was serving the reviewed
code: the main checkout had advanced to `8d2b1e5`, but
`git diff 54a8136 8d2b1e5 -- src/ tests/ package.json pnpm-lock.yaml` is **empty** — the only change
is `specs/007-human-scratch-completion/tasks/ur-005.md`. So the product code served is
byte-identical to the reviewed tree. I did not start, restart or kill that server.

The session's own environment, read from the live page:

```
{ "tz": "Australia/Brisbane", "langs": ["en-US", "en"], "lang": "en-US" }
```

That is exactly the reported defect configuration: Brisbane time zone, `en-US` locale. Under the old
code this yielded USD.

Observed flow:

1. Created a vault through `/new-user` with a recovery phrase. I left the phrase concealed behind
   "Click to reveal" throughout and never rendered it, so no recovery material entered any log,
   snapshot or this review.
2. Landed on `/settings`. The Default currency combobox read **`AUD` / Australian Dollar**. **The
   reported defect is fixed in the real application.**
3. Changed it to JPY through the real combobox and search field; it read back `JPY / Japanese Yen`.
4. Reloaded. It still read **JPY** — the user's choice is not silently relocked to the inferred
   value.
5. `console error` reported **0 errors** across 5 total messages.
6. Ran `delete-data` and closed the session.

---

## 7. E2E campaign — my own, 3/3 clean

Run in my own worktree `/tmp/mf-p25-rev01` at `54a8136`, `env -u CI pnpm test:e2e --retries=0`.
**`CI` was never set for the runs**, so the profile stayed at 4 workers and 0 retries rather than
the CI profile's 1 worker and 2 retries (`playwright.config.ts:56,60`), which would launder flakes
into passes. `CI=true` was used only for `pnpm install`. No `--debug`, `--ui`, `--headed` or `show`.

Per root's instruction the digest **excludes `next-env.d.ts`**, and it was recomputed at the start
of each run over `git ls-files` rather than a staged diff:

| Run | Source digest (next-env.d.ts excluded) | Result                     |
| --- | -------------------------------------- | -------------------------- |
| 1   | `e93aaf62a8a39a81fa9d3afd99027cc9`     | **167 passed**, rc=0, 4.5m |
| 2   | `e93aaf62a8a39a81fa9d3afd99027cc9`     | **167 passed**, rc=0, 3.9m |
| 3   | `e93aaf62a8a39a81fa9d3afd99027cc9`     | **167 passed**, rc=0, 3.9m |

Byte-identical across all three runs, and unchanged when recomputed after run 3, so no tree drift
occurred and the campaign is evidence for a single stable tree. Zero flakes, zero retries, zero
failures. 167 matches the implementer's reported count. Post-campaign `git status` showed **only**
`next-env.d.ts` modified — precisely the artifact root warned about, confirming that exclusion was
the right call.

I confirmed the four new `Currency Detection` tests actually executed in every run rather than
assuming their presence:

```
Currency Detection › time zone decides the default currency, overriding a conflicting locale
Currency Detection › a country-less time zone falls back to the locale
Currency Detection › neither signal resolving falls back to the default currency
Currency Detection › the inferred currency is a default the user can change, and the change persists
```

Port 3000 was released immediately after run 3 and root was notified before I began writing.

---

## 8. The false-pass hazard — REPRODUCED, and a correction to the evidence

This was the dispatch's most important check, and I reproduced both halves in my own throwaway
worktree `/tmp/mf-p25-mutate`, never in the shared checkout.

**Half one — host-TZ independence.** The evidence claims 120/120 under `TZ=America/New_York`. I ran
the file under three different host zones:

| Host TZ              | Result         |
| -------------------- | -------------- |
| `America/New_York`   | **120 passed** |
| `UTC`                | **120 passed** |
| `Australia/Brisbane` | **120 passed** |

Confirmed, and stronger than claimed. The tests stub the time zone rather than inheriting it, so a
Brisbane-expects-AUD assertion cannot pass merely because the host is in Brisbane.

**Half two — the mutation probe.** The evidence claims that passing `undefined` instead of
`getBrowserTimeZone()` fails exactly one test. My first probe stubbed the **body** of
`getBrowserTimeZone` to `return undefined`, and got **two** failures, not one:

```
× getBrowserTimeZone > returns the resolved IANA time zone
× detectDefaultCurrency > uses the time zone in preference to a conflicting locale
Tests  2 failed | 118 passed (120)
```

Re-reading the evidence at `:209-211`, its claim is specifically that it "changed the product code
to pass `undefined` instead of `getBrowserTimeZone()`" — a **call-site** mutation, not a body stub.
I reproduced that exact mutation:

```
-        return resolveDefaultCurrency(getBrowserTimeZone(), getBrowserLocale());
+        return resolveDefaultCurrency(undefined, getBrowserLocale());

Tests  1 failed | 119 passed (120)
FAIL  detectDefaultCurrency > uses the time zone in preference to a conflicting locale
```

**Exactly one failure, 119 passed — the evidence's claim is accurate as written.** I record my first
probe rather than omitting it because the discrepancy was mine, not the evidence's: I mutated a
different thing than the evidence described. The stricter body-level probe additionally shows that
`getBrowserTimeZone` has its own dedicated coverage, which is a point in the tests' favour. Both
mutations were reverted and the worktree confirmed clean by `git status --porcelain`.

The false-pass hazard is genuinely ruled out.

---

## 9. Out-of-scope test edits — legitimate determinism, not a weakening

The three edits are `test.use({ timezoneId: "America/New_York" })` plus an explanatory comment in
`people-settlement.spec.ts`, `accounts.spec.ts` and `vault-settings.spec.ts`.

I checked for weakening mechanically rather than by reading impressions. Across all three files the
diff is **19 insertions and ZERO deletions** —
`git show b41e715 -- <the three specs> | grep -E '^-[^-]'` returns nothing. **No assertion was
altered, weakened or deleted.**

The judgement is correct and the change makes those specs _more_ deterministic, not less. Making the
time zone primary means every test vault's default currency now depends on the host's time zone;
previously Playwright's default `en-US` locale forced USD regardless of host. Those three specs
assert USD only incidentally — they are about settlement, accounts and settings, not currency
inference. Without the pin they would pass in New York and fail in Brisbane, which is the worst
class of test: one whose result depends on who ran it. Pinning the zone makes the dependency
explicit and removes an implicit inheritance from the host.

Currency inference itself is not weakened by this, because it moved to explicit per-context
`timezoneId`/`locale` in `onboarding-vault.spec.ts` where it is tested deliberately. Each comment
points there. This is the right structure.

The implementer disclosed this as out-of-scope work rather than burying it, which is the correct
handling.

---

## 10. Type safety and secret safety — BLOCKING checks, both clean

**Type safety.** No `as`, no `any`, no `!` was introduced in product code. `detect-currency.ts` and
`ensure-default.ts` contain none. The four `as const` hits in `defaults.ts` are on pre-existing
lines the diff does not touch (`:33`, `:38`, `:97`) plus one prose comment. Notably the library's
signature `getCountryForTimezone(tzName: string, options?) => Country | null` accepts a plain
`string` and returns a nullable, so no assertion was needed to consume it — the code checks
`if (!country)` rather than asserting. `pnpm typecheck` passes with zero output.

**Secret safety.** I grepped the product file, both test files and the evidence for key material,
seed phrase, mnemonic, recovery material, `SUPABASE_JWT_SECRET`, master key, presence key and invite
fragment. The only hits are in the evidence's own secret-safety statement at `:20-21`, which names
the categories in order to disclaim them. No secret values appear anywhere. My manual browser
session deliberately left the recovery phrase concealed so it never entered a snapshot or log.

---

## 11. Evidence honesty — accurate, with inferences correctly labelled

The evidence discloses everything the dispatch required me to look for:

- **The restarted E2E campaign and its cause.** Disclosed at `:277-283`, including that the first
  two runs both passed but the digest drifted, that the drift was `next-env.d.ts` rewritten by
  `next dev`, and that it restarted from run 1 rather than counting the earlier runs. Restarting on
  drift rather than reporting a mixed campaign is exactly the documented discipline.
- **The out-of-scope spec edits.** Disclosed at `:232-244` under a heading that explicitly says
  "reported because it was not in the plan", with the reasoning and an explicit statement that no
  assertion was weakened — which I verified independently in §9.
- **The host-TZ false-pass hazard and how it was ruled out.** Disclosed at `:206-213`, with both the
  host-independence run and the mutation probe. Verified in §8.
- **The candidate-rejection table.** At `:76-81`, with per-candidate version, licence, runtime dep
  count and verdict.
- **A fourth stale comment root had not listed.** At `:158-164`, flagged as "work slightly beyond
  the enumerated scope" rather than folded in silently.
- **Two unit-test failures on the first `pnpm test`**, at `:270-275`, both correctly diagnosed as
  environmental and neither worked around.

Inferences are labelled as inferences, which is the part I checked most carefully. Two examples: the
registry modification date is recorded as "root's figure; I did not independently re-derive the
date, and label that as unverified here" (`:99-100`), and the IANA-derivation argument from zone
counts is called "corroborating evidence, not proof of provenance", with the load-bearing check
explicitly deferred to the behavioural test (`:105-106`). That is honest epistemic hygiene rather
than assertion.

---

## 12. The open question — "only a default, never silently locked in"

Root asked me to assess whether this is actually true in the shipped flow, including whether an
existing vault's currency is unaffected by a later time-zone change. **It is true.** I traced it
rather than inferring it from the tests.

**One production caller.** `grep -rn "detectDefaultCurrency" src/` returns the definition, one
doc-comment mention in `defaults.ts:132`, and exactly one invocation:
`src/lib/vault/ensure-default.ts:143`. Nothing in `src/lib/sync/`, `src/hooks/`, `src/components/`
or `src/app/` calls it.

**It is called strictly after the existing-vault guard.** `ensure-default.ts:113-123`:

```ts
if (!force) {
    const { vaults } = await api.listVaults();
    if (vaults.length > 0) {
        return { vaultId: vaults[0].id, name: DEFAULT_VAULT_NAME, created: false };
    }
}
```

Detection is at `:143`, twenty lines below that early return. When a vault exists the function
returns before detection ever runs, and the existing-vault path writes nothing at all. The only way
past the guard is `force: true`, which all three call sites in `use-identity.ts` (`:275`, `:335`,
`:392`, the last being **unlock**) derive from the server's `isNew` flag. A returning user unlocking
gets `isNew: false`, so detection does not run. Even in the `force` branch a brand-new `LoroDoc` is
constructed and a new vault created server-side; no existing document is touched.

**Defaults cannot be re-applied over an existing document later.** This is the subtle part and worth
recording, because `vault-provider.tsx:384` does call `getDefaultVaultState()` on every vault open —
with no argument, so it yields `"USD"`. If that overwrote the document, every reload would reset
every vault to USD. It does not: loro-mirror treats `initialState` as a shape hint that never
overrides existing document values. The primitive branch governing `defaultCurrency` is guarded by
`if (!(k in base))`, and the constructor only mutates in-memory state — it never calls `setState`.
My manual reload in §6 confirms this empirically: JPY survived.

**The user-facing change path is real.** `VaultSettingsForm.tsx:39-41` writes
`state.preferences.defaultCurrency = currency` through `useVaultAction`, which drives
`Mirror.setState` and syncs like any other operation. I exercised this by hand in §6.

So there is no code path — unlock, re-sync, provider mount, migration or maintenance — by which a
later time-zone change could alter an existing vault's stored currency. The requirement holds.

### Finding P25-01 — ADVISORY, non-blocking — a doc comment overstates the creation flow

**Severity:** Low-Medium. **Category:** Documentation accuracy. **File:**
`src/lib/domain/detect-currency.ts:24-25`.

The new module header states:

> The result is only a default. It is presented in the vault creation flow and the user can change
> it **before and after creation.**

The "before creation" clause does not match the shipped flow. The vault is created headlessly inside
`ensureDefaultVault`, and the currency is first _presented_ on the `/settings` page immediately
afterwards — I confirmed this by hand in §6, and `grep -rniE 'currenc' src/app/(onboarding)/`
returns **nothing**, so there is no pre-creation currency prompt anywhere in the onboarding routes.
The user can change it only _after_ creation, albeit immediately after, on the landing page.

I am **not** failing the package for this, for two reasons. First, the clause is lifted almost
verbatim from the frozen text at `spec.md:97-98`, so the implementer was tracking the requirement's
own wording rather than inventing a claim. Second, the substantive requirement — that the value is a
default, presented to the user, changeable, and never silently locked in — is fully satisfied in the
shipped flow, as §12 establishes. The gap is between the frozen text's description of a flow and the
flow that exists, not between the code and its behaviour.

By contrast the comment the implementer wrote at `ensure-default.ts:141-142` is precisely accurate:
"This is only a default - it is shown in vault settings and can be changed there." That is what the
code does.

**Proposed fix, for carry-forward rather than this package:** reword `detect-currency.ts:24-25` to
match `ensure-default.ts:142` — the value is presented in vault settings immediately after creation
and can be changed there at any time. This is a comment-only change to a file under P25's ownership,
so it is cheap, but it touches wording derived from frozen text and I would rather root route it
than have a reviewer direct an edit that drifts from the requirement's own language.

**Q-P25-01 (carry-forward proposal for P21):** where a code comment paraphrases frozen requirement
text, and the frozen text describes a flow more loosely than the implementation realises it, the
comment should describe what the code does and cite the requirement, rather than restating the
requirement as though it were a description of the code. The failure mode is a comment that reads as
verified fact but is actually an unverified restatement.

---

## 13. Stale comments — all four corrected, none remaining

| Location                    | Was                                           | Now                                                               |
| --------------------------- | --------------------------------------------- | ----------------------------------------------------------------- |
| `detect-currency.ts:4-6`    | locale "more reliable than timezone"          | Corrected, with the reason                                        |
| `detect-currency.ts` header | "Detection order: navigator.languages[0] ..." | Three-rung order                                                  |
| `defaults.ts:132`           | "infer from browser locale"                   | "from the user's time zone, falling back to their browser locale" |
| `ensure-default.ts:142`     | "from browser locale"                         | "from their time zone, falling back to locale"                    |

I swept for survivors with
`grep -rniE 'infer.{0,20}from (the )?(browser )?locale|more reliable than.{0,10}(time ?zone)|locale directly encodes' src/`
and it returns **nothing**. The remaining `browser locale` hits in `src/lib/utils/date-format.ts`
are unrelated `@param` docs on date-formatting helpers and are correct as written.

The old header also carried a StackOverflow link as its rationale; that is gone, replaced by the
empirical reason. Good change.

---

## 14. Tests — meaningful, not decorative

Unit coverage is 120 tests in `tests/unit/domain/detect-currency.test.ts`, table-driven per the
repo's testing convention. The structure is right: 14 resolving zones, 6 deprecated aliases, 7
non-resolving zones, then the pure-core ordering cases, then the integrated `detectDefaultCurrency`
cases with globals stubbed.

The tests that earn their place:

- Time zone beating a _conflicting_ locale (`Europe/Berlin` + `en-GB` -> EUR) — proves precedence,
  not just that both work.
- `Asia/Yangon` + `en-AU` -> AUD — the unsupported-currency fall-through, verified in §3 to rest on
  `MM` genuinely being absent from the table.
- Fallback when `Intl` is entirely unavailable, asserting the locale rung still works rather than
  the whole detection throwing.
- The purity check, asserting repeated calls agree.

E2E coverage is four tests, each constructing a context with explicit `timezoneId` **and** `locale`
so they assert behaviour rather than host configuration. The fourth is the important one: the three
inference tests would all pass against an implementation that hard-locked the inferred value, so the
"changeable, not locked in" clause needed its own test — and it got one, including a reload to prove
persistence. The evidence states this reasoning explicitly at `:229-230`, which shows the gap was
identified rather than stumbled into.

No test asserts on a wall-clock value, and none was weakened.

---

## Summary against the frozen text

| Frozen requirement                                            | Verified by                                                         | Result   |
| ------------------------------------------------------------- | ------------------------------------------------------------------- | -------- |
| Time zone is the PRIMARY signal                               | `resolveDefaultCurrency:75-88`; unit tests; live browser -> AUD     | **PASS** |
| Locale remains a FALLBACK when the zone yields no country     | `UTC` -> null confirmed against the library; `UTC`+`en-GB` -> GBP   | **PASS** |
| A final fallback currency when neither resolves               | `FALLBACK_CURRENCY`; `UTC`+`en` -> USD in unit and E2E              | **PASS** |
| Mapping uses an established, maintained library               | `countries-and-timezones@3.9.0`, MIT, 0 deps, IANA-derived          | **PASS** |
| Existing country-to-currency map reused, not duplicated       | `REGION_TO_CURRENCY:231` reused via one shared helper               | **PASS** |
| Inferred value is only a default, changeable, never locked in | Call-graph trace §12; changed to JPY and reloaded in a real browser | **PASS** |

**VERDICT: PASS.** One advisory finding (P25-01) and one Q-proposal (Q-P25-01) for carry-forward,
neither blocking.
