# P20B revision 06 — implementation evidence (HS-021 E2E eager-assertion flake class)

- **Package:** P20B (full-codebase code-quality sweep). **Requirement:** HS-021. **Revision:** 06.
- **Reopened by:** the P21 rev-04 audit FAIL (`reviews/P21-review-04.md`), blockers F-2
  (`Q-P20B-19`) and F-1 (`Q-P20B-18`).
- **BASE:** `09842fd155abaeb3bfe633be9d42c9a2664b5095` (root docs commit extending rev-06
  allowed-writes; product tree byte-identical to product commit `371a88a`).
- **HEAD (handback):** the single commit that adds this file — 9 files, +673/-52, subject
  `test(P20B): close eager-assertion flake class under full-suite load`. Its hash is reported to
  root in the handback message rather than written here, because a commit cannot contain its own
  hash. The binding check is the tree, not the hash: at this commit
  `md5sum <the 8 changed files> | md5sum | cut -c1-8` is **`e5e1eb18`**, the same digest printed by
  all 10 campaign runs in §3. That equality is what proves the handback tree and the validated tree
  are one and the same, and a reviewer can recompute it without trusting any hash I quote.
- **Writes:** `tests/e2e/helpers/auth.ts`, `tests/e2e/helpers/index.ts`,
  `tests/e2e/identity.spec.ts`, `tests/e2e/import.spec.ts`, `tests/e2e/transactions.spec.ts`,
  `tests/e2e/automations.spec.ts`, `tests/e2e/field-rule-parity.spec.ts`,
  `tests/e2e/transaction-rules.spec.ts`, and this evidence file. **No product code was changed** —
  see the F-2 route decision below.
- **Scope note:** the last three specs were added to the allowed set by root in `09842fd` after I
  reported the residual same-class sites; the fold-in is authorised, not self-granted.
- **Totals:** 34 changes across 7 test files — **33** pinned-default timeout sites (25 F-1 in the
  original allowed set, 1 F-2, 7 root-authorised) plus **1** cross-worker temp-file collision fix
  that the campaign itself uncovered (§2.5). Plus the new `waitForUnlockHydration` helper (§1.3).
  `helpers/index.ts` re-exports that helper and is the 8th changed file; it contains no timeout
  sites, which is why the file count reads 7 for sites and 8 for the tree digest.
- **Note on an earlier figure of "30".** My first report to root said 23 sites in my original
  allowed set, which made the fold-in ruling ask for a total of 30 (23 + 7). That 23 was a
  hand-tally and it was wrong: the true figure is **25**, because I had overlooked one
  `helpers/auth.ts` site and separately booked its `expectValid` wait under F-2 (§1.4) without
  counting it in the total. Recomputing from the diff rather than by hand gives **33** timeout
  sites, and root's later message reflects the corrected 34/7. This is why every count in this
  document is now derived mechanically — a reviewer can confirm the total with
  `git diff -U0 -- tests/e2e/ | grep -c '^-.*timeout: 5000'` → **33**, and the per-file breakdown in
  §2.1 sums to it exactly.

---

## 1. F-2 (`Q-P20B-19`) — route chosen: TEST-SIDE, with a real hydration signal

### 1.1 The mechanism, re-confirmed against source

I re-verified the reviewer's finding rather than taking it on trust:

```
$ grep -n useIsHydrated src/components/ui/button.tsx src/components/ui/input.tsx
src/components/ui/button.tsx:5:import { useIsHydrated } from "@/hooks/index";
src/components/ui/button.tsx:50:    const isHydrated = useIsHydrated();
```

`input.tsx` returns zero matches. `button.tsx:55` computes
`isDisabled = asChild ? disabled : disabled || !isHydrated`; `input.tsx:5-18` renders a bare
`<input>` with no gate at all. `SeedPhraseInput.tsx:329-332` is a fully controlled input
(`value={word}` off `useState` at `:99`,
`onChange={(e) => handleWordChange(index, e.target.value)}`).

So for an `Input`, `toBeVisible()` / `toBeEditable()` / `toHaveValue()` are all satisfied by the
**server-rendered HTML before hydration**. A `fill()` that lands early sets the DOM value — which is
exactly why `toHaveValue` passed in the failing run — but React never runs `onChange`, `words` state
stays `""`, and the next commit re-asserts the empty value over the DOM. The validity class, which
is derived from state (`wordValidation`, `:120-126`), therefore never applies. That is precisely the
observed failure: the element resolved 14 times with `value=""`.

The rev-02 fix reached for the `helpers/auth.ts:20` idiom ("Button is disabled until React hydration
completes") — correct for a `Button`, no proof whatsoever for an `Input`.

### 1.2 Route decision: test-side. Why, explicitly.

**I did NOT take the source route** (adding `useIsHydrated` to `input.tsx`), for three reasons:

1. **It regresses real typing UX to fix a test.** Gating `input.tsx` on hydration means disabling —
   or discarding keystrokes into — every text field in the product until the client bundle has
   executed. On a slow connection a user who starts typing into a visible, focused field would have
   their input silently dropped. That is a genuine product regression traded for test convenience.
2. **It would not actually be sufficient on its own.** The failing assertion needs the fill to
   _propagate through React state_. A `disabled` input makes Playwright's `fill()` **wait** rather
   than proceed, which does help — but the test would still be asserting on a signal
   (`toBeEditable`) that is one hydration boundary away from the state commit it cares about. The
   principled gate is to wait for evidence that the page's effects have flushed, then assert on the
   state-derived class. That is true regardless of what `input.tsx` does.
3. **Blast radius.** `Input` is used across the entire product; P20B rev 06's remit is to close a
   flake class, and a repo-wide interactivity change carries far more risk than the defect it fixes.

The HANDOFF names the test-side route as preferred/least-blast-radius, and the analysis above
agrees.

### 1.3 The fix — a hydration signal that cannot exist pre-hydration

New helper `waitForUnlockHydration(page)` in `tests/e2e/helpers/auth.ts`:

```typescript
export async function waitForUnlockHydration(page: Page): Promise<void> {
    const passkeyBranch = page
        .getByTestId("passkey-unlock-button")
        .or(page.getByTestId("passkey-unsupported-notice"));

    await expect(passkeyBranch).toBeVisible({ timeout: 15_000 });
    await expect(passkeyBranch).toBeEnabled({ timeout: 15_000 });
}
```

**Why this eliminates the race by construction** (not "green on my machine"):

- `usePasskey` (`src/hooks/use-passkey.ts:128`) initialises `capability` to `"checking"` and only
  moves it to `"supported"`/`"unsupported"` from a `useEffect` (`:137-140`).
- `PasskeyUnlockButton` (`src/components/features/identity/PasskeyUnlockButton.tsx:33-35`) returns
  **`null`** for `capability === "checking"`, and renders the button or the unsupported notice for
  the other two values.
- Therefore **neither element can be present in the server-rendered HTML.** Their existence in the
  DOM is proof that the unlock page's React root hydrated _and flushed its effects_. That is the
  same commit boundary that attached `onChange` to the seed-word inputs and to the canonical
  credential — they are all children of the same root (`unlock/page.tsx` → `UnlockCircle` →
  `SeedPhraseInput`).
- The `.or()` covers both branches, so the gate is valid in the ordinary Chromium run _and_ in
  `passkey.spec.ts:286`, which deliberately stubs `navigator.credentials` to force the unsupported
  notice.
- The `toBeEnabled()` assertion additionally exercises the `useIsHydrated` gate itself in the
  supported branch, because `PasskeyUnlockButton` renders a `Button`. (In the unsupported branch the
  notice is a `<p>`, which Playwright treats as trivially enabled — harmless, and the `toBeVisible`
  half already carries the proof.)
- **No strict-mode ambiguity.** `data-testid="passkey-unsupported-notice"` also appears in
  `PasskeyManager.tsx:130`, which would make the locator resolve two elements and throw. It cannot
  collide here: `PasskeyManager` is rendered only from `src/app/(app)/settings/page.tsx:31`, while
  the gate only ever runs on `/unlock`. I checked this rather than assume it, because a duplicate
  testid is exactly the kind of latent trap that would turn the gate itself into a new flake.

This is a **positive existence proof of hydration**, not a timeout widened until the race stops
losing. It holds on any machine at any load, because the element it waits for is causally downstream
of the hydration commit rather than merely usually-later-than it.

### 1.4 Assertions changed to post-propagation signals

At the failing step (gate at `identity.spec.ts:359`), the intermediate `toHaveValue("abandon")` /
`toHaveValue("invalidword123")` assertions were **removed**, not merely re-timed. They were actively
misleading: they sample a transient DOM value the controlled component later overwrites, so they can
pass in exactly the scenario the test then fails in. The `toHaveClass` assertions are the correct
evidence — the class is derived from `wordValidation`, i.e. from React state, so it can only be true
after `onChange` ran and React re-rendered.

Sites changed in `identity.spec.ts`:

| Site (new line)                                                               | Change                                                                                                                       |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `:54` (local `enterSeedPhrase` fixture)                                       | gate added before the fill loop                                                                                              |
| `:359` step "validate BIP39 words with visual feedback" (**the F-2 failure**) | `toBeEditable` → `waitForUnlockHydration`; dropped both `toHaveValue` samples; class assertions given the 15s sibling budget |
| `:564` step "a manager-style fill distributes into all twelve inputs"         | gate added — this step had **no** hydration guard at all and fills the credential whose `onChange` drives distribution       |
| `:635` step "fill the canonical credential only, then unlock"                 | `toBeEditable` → `waitForUnlockHydration` (same invalid-idiom instance)                                                      |

`tests/e2e/helpers/auth.ts` `enterSeedPhrase` (shared by `passkey.spec.ts:409` and
`vault-settings.spec.ts:162`) now gates on hydration before clearing/filling, and its `expectValid`
wait — which is itself a genuine post-propagation signal, since "Valid recovery phrase" can only
render once every `onChange` ran and the BIP39 checksum was recomputed from state — was raised from
the bare 5s default to the 15s sibling budget.

**Deliberately left alone (1) — the race test itself.** The step at `identity.spec.ts:611` ("a fill
landing before hydration still reaches the word grid") _exists_ to exercise the pre-hydration race:
it navigates with `waitUntil: "commit"` and fills immediately on purpose, asserting the product's
mount-time adoption path (`SeedPhraseInput.tsx:183-193`) recovers the value. Gating it would delete
the coverage — it is the regression test for the very product behaviour that makes the rest of this
race survivable. It already carries correct 15s post-propagation assertions.

**Deliberately left alone (2) — one surviving `toBeEditable`.** `identity.spec.ts:382` (the paste
step) still opens with `await expect(firstInput).toBeEditable()`. By the argument in §1.1 that is
not a hydration proof, so I want to be explicit about why it is nonetheless safe here rather than
leave a reviewer to wonder whether I missed it: that step runs **after** the gated step at `:359` on
the **same page instance**, with no intervening navigation. Hydration is already established by the
time it executes, so the assertion is a harmless readability check rather than a load-bearing guard.
I left it because removing it would be churn, and re-gating an already-hydrated page would imply the
gate is a ritual rather than a specific proof. Any _new_ interaction that follows a fresh
`goto("/unlock")` must call `waitForUnlockHydration` — that is the rule this revision establishes.

---

## 2. F-1 (`Q-P20B-18`) — the eager default-timeout cohort

### 2.1 Cohort confirmed independently, then found to be far larger than charted

The charted cohort:

```
$ grep -n "toBeVisible({ timeout: 5000 })" tests/e2e/*.spec.ts | wc -l
13
```

Exactly 13, in two files — 8 in `import.spec.ts`
(`:1278 :1369 :1412 :1459 :1512 :1539 :1573 :1616`), 5 in `transactions.spec.ts`
(`:1140 :1147 :1225 :1265 :1333`). This matches the reviewer's count. The two `import.spec.ts`
members not in the HANDOFF's partial list are `:1278` (the `/\.csv/i` filename assertion) and
`:1369` (the `OFX • N rows` assertion) — same pattern, same file, same async-parse dependency.

**MATERIAL FINDING — the class is 22 inside my original allowed files, not 13.** The charted grep
keys on the literal `toBeVisible({ timeout: 5000 })`, but the defect is "pinned to Playwright's
default expect timeout", which is **matcher-independent** — it occurs identically on `toBeEnabled`,
`waitFor`, and `waitForURL`. Grepping the defect rather than the matcher found **9 more instances**
in F-1's own scope (plus a 10th, the `expectValid` wait in `helpers/auth.ts`, which belongs to the
F-2 fix and is accounted for in §1.4 rather than double-counted here).

Five more in the two cohort tests themselves:

```
$ grep -n "timeout: 5000" tests/e2e/import.spec.ts
tests/e2e/import.spec.ts:1471                 # "All required fields mapped" after Auto-detect
tests/e2e/import.spec.ts:1488                 # toBeEnabled on the Import button
tests/e2e/import.spec.ts:1498                 # toBeVisible on an imported row, post-redirect
tests/e2e/import.spec.ts:1555                 # toBeEnabled on the Import button
tests/e2e/import.spec.ts:1603                 # toBeEnabled on the Import button
```

All five sit **inside the two most load-exposed tests in the cohort** — the ones declared at `:1445`
(F-1's own test) and `:1527` — and every one waits on a post-async signal: the mapping recomputation
after Auto-detect, the import button enabling after config validation, and a CRDT-backed row
rendering after a redirect. Leaving them at a pinned default would have left the same defect live in
the same test bodies I was sent to harden.

Four more on the identity/unlock path — the **F-2 blocker's own file and its shared helper**, which
no earlier revision had swept:

| Site                                            | Async signal it races                                          |
| ----------------------------------------------- | -------------------------------------------------------------- |
| `identity.spec.ts:315` `waitFor` reveal button  | button paints only after the generate step re-renders          |
| `identity.spec.ts:432` `toBeEnabled` unlock     | enablement trails the React commit for all twelve words        |
| `identity.spec.ts:677`/`:682` `waitForURL`      | client-side auth-guard redirect, after route compile + hydrate |
| `helpers/auth.ts` reveal `waitFor`              | same re-render as `identity.spec.ts:315`                       |
| `helpers/auth.ts` confirm-checkbox `waitFor`    | appears with the post-reveal step transition                   |
| `helpers/auth.ts` continue-button `toBeEnabled` | the `useIsHydrated` gate on `Button`                           |

`helpers/auth.ts` is reached by `createNewIdentity`, which nearly every spec calls in `beforeEach` —
so a pinned default there is the single most load-exposed instance of the class in the suite.

**All 25 replaced with `{ timeout: 15_000 }`** — the budget these files already use for their
principled heavy waits (`transactions.spec.ts:579, 697, 705, 710, 732`, post-render 500-count
assertions hardened by P20B rev 03 in commit `63787ec`).

**Full arithmetic, so the totals reconcile against the diff.** The revision converts **33**
`timeout: 5000` sites in total, across 7 files:

| File                                                      | Sites  | Attributed to                       |
| --------------------------------------------------------- | ------ | ----------------------------------- |
| `import.spec.ts`                                          | 13     | F-1 (8 charted + 5 found)           |
| `transactions.spec.ts`                                    | 5      | F-1 (all charted)                   |
| `identity.spec.ts`                                        | 4      | F-1 (found)                         |
| `helpers/auth.ts`                                         | 3      | F-1 (found)                         |
| `helpers/auth.ts`                                         | 1      | F-2 — the `expectValid` wait (§1.4) |
| `automations` + `field-rule-parity` + `transaction-rules` | 7      | §2.4, root-authorised               |
| **Total**                                                 | **33** |                                     |

So: **25 under F-1** in my original allowed set (13 + 5 + 4 + 3), **1 under F-2**, **7 authorised
later**. The charted cohort was 13 of those 25. A reviewer can check the total mechanically:
`git diff -U0 -- tests/e2e/ | grep -c '^-.*timeout: 5000'` → **33**.

**Why widening past the charted 13 was the right call and not scope creep.** Every site outside the
§2.4 seven is inside my original allowed write set, so no new authority was required to fix them.
Raising a timeout is monotone: it cannot slow or fail a test that passes, it can only convert a
load-induced failure into a pass — so the cost of over-inclusion is nil while the cost of
under-inclusion is another audit cycle. And the standing lesson from four P20B reopenings is that
partial hardening of this class is exactly what keeps reopening it: `import.spec.ts` escaped four
consecutive sweeps and produced the rev-04 FAIL precisely because earlier revisions fixed the named
instance rather than the class. I treated the charted 13 as a floor, not a ceiling, and reported the
widened count to root before handback so the reviewer would not meet a 33-site diff against a
13-site charter unprepared.

### 2.2 Why this is a real wait, not a blind mask

The critical fact about the cohort is that `{ timeout: 5000 }` **is Playwright's default expect
timeout** (`playwright.config.ts` sets no `expect.timeout`, so the 5s built-in applies). Every one
of these call sites _reads_ like a deliberate wait and grants **exactly zero** slack over writing no
option at all. They are not "waits that were tuned too tight"; they are waits that were never tuned.

Each is already asserting on the correct deterministic post-work signal — the assertion is on the
right thing, only the budget was absent:

- The `import.spec.ts` row-count/filename sites assert on text that `ImportPanel` renders
  (`:262-297`) **only after** `loadFile` (`use-import-state.ts:242-445`) completes its
  `await file.text()` → `detectFileType` → `parseRawRows`/`parseOFX` → template sort → config build
  → `setSession` → `finally setIsLoading(false)` chain. The component renders an explicit "Loading
  file..." state until then, so the assertion cannot pass early or spuriously — it waits for the
  real completion signal. `:1512` is the most exposed instance because it is the second import in
  its test, so the template list is non-empty and `loadFile` additionally sorts and applies a
  matched template config.
- The 5 `transactions.spec.ts` sites assert on a CRDT-backed row render (`:1140`, `:1147`) or on a
  portaled `cmdk` dropdown's search input appearing after a click (`:1225`, `:1265`, `:1333` —
  `InlineEditableTags.tsx:291-311` mounts it through `createPortal` on state change).
- The `identity.spec.ts` / `helpers/auth.ts` sites each wait on a step transition or a
  hydration-gated `Button` — see the table in §2.1 for the specific async signal behind each.

So the change is: keep the deterministic signal, give it a budget sized for 4-worker contention.
Nothing is being polled-over or slept past, and no assertion was weakened — a genuinely broken
render still fails, it just now takes 15s to say so instead of 5s.

### 2.3 Scope boundary — what I deliberately did NOT change

`tests/e2e/**` also contains many **bare** `toBeVisible()` calls with no options at all, which
inherit the same 5s default. I did not touch them, and that is a considered boundary rather than an
oversight:

- The charted defect is the _explicitly pinned_ default — an assertion that advertises a wait it
  does not provide. That is a discrete, enumerable, mechanically identifiable class with a clean
  terminating condition (`grep "timeout: 5000"` → 0 in the affected files).
- "Every bare `toBeVisible` in the suite" is an open-ended sweep with no principled stopping point,
  and most such calls are on _synchronous_ post-click UI where 5s is genuinely ample. Widening them
  indiscriminately would slow real failures without removing any race.
- The two blockers' own tests are now fully clean of the defect, which is what the routing asked
  for.

If a future audit surfaces a bare-`toBeVisible` failure, the right response is the same one applied
here: identify the async signal it races, and size that specific wait — not a blanket sweep.

**One pinned default deliberately retained.** `identity.spec.ts:420`
(`await expect(page).toHaveURL(/\/unlock/, { timeout: 5000 })`, after clicking unlock with an
invalid phrase) asserts the URL **stays** on `/unlock`. It is already true when the assertion runs,
so it matches on the first poll and the timeout only ever bounds a **failure**. It is not the eager
class, and lengthening it would merely make a genuine auth regression take three times as long to
report.

### 2.4 The final 7 sites — surfaced, escalated, then folded in under explicit authority

Sweeping for the defect rather than the matcher also found an identical shape in three specs
**outside my original allowed set**, all `[data-testid="field-rule-editor"]`
`waitFor({ timeout: 5000 })` on the line immediately after the click that opens the editor:

```
tests/e2e/automations.spec.ts:34, :83, :95
tests/e2e/field-rule-parity.spec.ts:51, :175, :293
tests/e2e/transaction-rules.spec.ts:41
```

I did **not** edit them on my own initiative. I reported them to root, stated plainly that they had
not failed in any run and were therefore latent rather than live blockers, and asked for an explicit
decision rather than assuming one. Root extended the allowed set in commit `09842fd` ("extend rev-06
allowed-writes for whole-class field-rule-editor hardening"), so all 7 are now hardened to `15_000`
by the same transform.

This matters for the audit trail: the widened diff is **authorised**, not self-granted. The rule I
followed throughout is that widening a fix within my allowed files is my call to make and defend,
while touching a file outside it is root's call — and I stopped and asked rather than deciding for
them.

**Final class state, suite-wide.** `grep -rn "timeout: 5000" tests/e2e/` now returns exactly **one**
line — the deliberate retention at `identity.spec.ts:420` explained above. 33 sites across 7 files
were transformed.

**Headroom check.** The per-test cap is `timeout: 30000` (`playwright.config.ts`), and the cohort
tests run well inside it — measured under full-suite load: `import.spec.ts:1253` 3.4s, `:1352` 2.4s,
`:1399` 2.4s, `:1445` 4.4s, `:1527` 9.2s. A 15s assertion budget is spendable within the cap for
every member; none of these tests is near the ceiling.

---

## 2.5 A SEPARATE defect the campaign caught — cross-worker temp-file collision

Run 2 of a campaign iteration failed in a way that no timeout change could ever have fixed, and it
is important that this is recorded as a **distinct defect** rather than folded into the F-1 story:

```
1) [chromium] › tests/e2e/import.spec.ts:1527:9 › selecting template and importing … › cleanup
   Error: ENOENT: no such file or directory, unlink '/tmp/…/test-import-1785181680170.csv'
   at tests/e2e/import.spec.ts:1637   ->   fs.unlinkSync(csvPath)
```

**Mechanism.** `createTestFile` (`import.spec.ts:74-79` before the fix) named every temp file
`test-import-${Date.now()}.${extension}` inside the shared `os.tmpdir()`. `Date.now()` is
millisecond-resolution and the suite runs `fullyParallel` across 4 workers, so two of the 9 call
sites entering that helper within the same millisecond receive the **identical path**: the second
`writeFileSync` silently overwrites the first, and whichever test reaches cleanup first unlinks the
shared file, leaving the other's `unlinkSync` to throw ENOENT.

**Fix** — make the name unique per call rather than per millisecond:

```typescript
const uniqueName = `test-import-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
```

This eliminates the collision by construction: uniqueness no longer depends on two calls being
separated in time. I verified the three assertions that match on the generated filename
(`toContainText(/test-import-\d+/i)` at `:1524`; `getByRole("option", { name: /test-import-\d+/i })`
at `:1586` and `:1627`) still match, because the `test-import-<digits>` prefix is unchanged.

**Three things worth stating plainly:**

1. **It is pre-existing, not introduced here.** `git diff` shows I never touched `createTestFile`;
   the helper predates this goal. It surfaced now only because ten back-to-back full-suite runs
   apply far more parallel scheduling pressure than any single `pnpm test:e2e` invocation.
2. **It means the rev-04 F-1 diagnosis was incomplete.** `import.spec.ts:1527` was charted purely as
   an eager-assertion cohort member. It does contain such assertions, but at least one of its
   observed failures is this ENOENT, which is immune to timeout tuning. If a future audit sees
   `:1527` fail, **read the error before concluding the timeout fix regressed.**
3. **This is the campaign earning its cost.** The mandate to validate under repeated full-suite load
   is usually justified as the only way to reproduce a known flake. Here it did something stronger:
   it surfaced a defect nobody had charted, in the exact file four previous sweeps had skipped.

---

## 3. Full-suite validation campaign — the ONLY valid method for this class

Per the VALIDATION MANDATE and `[[e2e-load-dependent-flake-validation]]`: **isolation runs were not
used as validation and are not reported as such.** Rev 02 was 9/9 in isolation and still regressed
under 4-worker load; a test can be 20/20 isolated and fail full-suite.

Command per run, `retries: 0`, `fullyParallel`, 4 workers, fresh `webServer`, 163 tests:

```
pnpm exec playwright test --retries=0 --reporter=list
```

**Tree stability — THREE earlier campaigns were discarded, deliberately.** A campaign is only
evidence if every run executed the code being handed back. Three times I started one and then
changed the tree:

| #   | Discarded after                                                         | Runs lost         |
| --- | ----------------------------------------------------------------------- | ----------------- |
| 1   | finding the 5 extra `import.spec.ts` cohort members (§2.1)              | 1 green           |
| 2   | root extended the allowed set to the 7 `field-rule-editor` sites (§2.4) | 1 green           |
| 3   | fixing the temp-file collision the campaign itself exposed (§2.5)       | 1 green, 1 failed |

Each time I **killed the campaign and restarted from run 1** rather than report runs made against a
superseded tree, at a cost of roughly 40 minutes per restart. Reporting those runs would have
inflated the count with runs that never exercised the final diff — the precise form of
self-deception this mandate exists to prevent. Note especially discard #3: the failing run there was
**not** discarded to bury a red result. That failure is fully reported in §2.5, its cause fixed, and
the restart happened because the fix changed the tree, not because the run was inconvenient.

Only the runs below are counted, all against tree digest `e5e1eb18`. Every run re-computes an md5
digest over all 8 changed files and prints it in the `tree=` column; a constant digest down the
whole table is machine-checkable proof that no edit landed mid-campaign. A reviewer can recompute
it: `md5sum <the 8 files> | md5sum | cut -c1-8`.

**Line-number reconciliation.** The table's per-test columns use **post-fix** declaration lines. The
rev-04 audit named the two import blocker tests `import.spec.ts:1445` and `:1527`; the
parallel-safety fix in §2.5 added a `crypto` import and the `uniqueName` binding above them,
shifting the file by +5. The same two tests now declare at `:1450` and `:1532` — same test names,
same bodies, no test was added or removed. A reviewer can confirm with
`grep -n "^\s*test(" tests/e2e/import.spec.ts`.

| Run | Result            | Duration | Tree       | identity:288 (F-2) | import:1450 (was :1445) | import:1532 (was :1527, Q-P20B-20) | transactions cohort (4/4) |
| --- | ----------------- | -------- | ---------- | ------------------ | ----------------------- | ---------------------------------- | ------------------------- |
| 1   | 163 passed (3.8m) | 230s     | `e5e1eb18` | pass               | pass                    | pass                               | pass                      |
| 2   | 163 passed (3.8m) | 232s     | `e5e1eb18` | pass               | pass                    | pass                               | pass                      |
| 3   | 163 passed (3.8m) | 229s     | `e5e1eb18` | pass               | pass                    | pass                               | pass                      |
| 4   | 163 passed (3.8m) | 228s     | `e5e1eb18` | pass               | pass                    | pass                               | pass                      |
| 5   | 163 passed (4.0m) | 238s     | `e5e1eb18` | pass               | pass                    | pass                               | pass                      |
| 6   | 163 passed (3.8m) | 231s     | `e5e1eb18` | pass               | pass                    | pass                               | pass                      |
| 7   | 163 passed (3.8m) | 228s     | `e5e1eb18` | pass               | pass                    | pass                               | pass                      |
| 8   | 163 passed (3.8m) | 227s     | `e5e1eb18` | pass               | pass                    | pass                               | pass                      |
| 9   | 163 passed (3.9m) | 237s     | `e5e1eb18` | pass               | pass                    | pass                               | pass                      |
| 10  | 163 passed (3.9m) | 232s     | `e5e1eb18` | pass               | pass                    | pass                               | pass                      |

**10 / 10 runs fully green**, 163 tests each, `--retries=0`, 4 workers, all on tree `e5e1eb18`.

**Coverage of the changed files.** All 8 are exercised by every run — the three specs folded in per
§2.4 contribute 11 tests (`automations` 3, `field-rule-parity` 6, `transaction-rules` 2), and
`helpers/auth.ts` is reached by nearly every spec's `beforeEach` via `createNewIdentity`. So the
campaign is not merely green on the two blocker tests; it exercises every line this revision
touched.

---

## 4. Static gates (CLAUDE.md — all run, all green)

| Gate                | Result                                                                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`    | exit 0, clean                                                                                                                                      |
| `pnpm lint`         | **0 errors, 1 warning** — exactly the known-acceptable `TransactionTable.tsx:401` `react-hooks/incompatible-library`                               |
| `pnpm format:check` | 15 files flagged, **all pre-existing frozen `specs/**`markdown; zero product or test files**. All 8 touched files pass`oxfmt --check` individually |
| `pnpm test`         | **111 files, 2091 passed, 2 skipped, 0 failed** (73.9s); the 2 skips are the documented `P16A_BENCHMARK`/`P16B_BENCHMARK` gates                    |
| `pnpm test:e2e`     | covered by the full-suite campaign in §3 (same suite, `--retries=0` throughout — a strictly harsher gate)                                          |

**No `as` / `any` / `!` introduced.** No product code was changed at all this revision, so the
prohibition is satisfied trivially; the test-side changes introduce none either.

**On `pnpm format`.** I ran only `format:check`, never the bare `pnpm format`. The bare command
rewrites `specs/**` markdown — including the frozen `human-scratch.md` and root-owned ledgers — so
running it to "clear" those 15 pre-existing flags would have corrupted files I am forbidden to
touch. The flags predate this revision and are not mine to resolve; I scoped `oxfmt` to my own files
instead.

`src/lib/domain/settlement.ts` untouched — blob still `010f3c93582a2ce311594d4dde8464760ca49c43`.
Frozen `specs/human-scratch.md` untouched. No ledger (`PROGRESS.md` / `QUESTIONS.md` / `HANDOFF.md`
/ `FINAL-AUDIT.md`) edited. The two inert strays (`next-env.d.ts`, untracked
`evidence/P08/implementation-01.md`) left exactly as found.

---

## 5. Secret-safety self-scan (blocking clause)

**No real secret material was printed, written, or committed.** Specifically:

- **No vault master key, seed phrase, recovery material, `crypto_box` secret, `SUPABASE_JWT_SECRET`,
  vault presence key, or vault plaintext** appears in any file I wrote or in this evidence document.
- The only phrase-like strings in my diff are the **synthetic BIP39 test vectors that were already
  present in the tests before this revision** — `"abandon"`, `"invalidword123"`, and the
  `abandon × 11 + about` vector. These are the canonical all-zeros BIP39 fixture, not anyone's
  recovery phrase, and I neither introduced nor altered them.
- Seed phrases handled at runtime by these tests are generated per-run by the app itself and held
  only in the Playwright process; nothing extracts them to disk. `identity.spec.ts`'s own
  leak-detection step (asserting the phrase never reaches a request, URL, or console message) passed
  in every campaign run.
- Campaign artifacts (`/tmp/p20b06/*`) contain Playwright list-reporter output only — test names and
  timings, no credential material — and are outside the repository.
- `playwright.config.ts` reads the local Realtime JWT secret from the running Docker stack at
  runtime; it was neither printed nor persisted, and that file was not modified.

**Mechanical scan of the final diff** (not just an assertion — the check anyone can re-run):

```
$ git diff -U0 -- tests/e2e/ | grep "^+" | grep -cE "[A-Za-z0-9+/]{40,}={0,2}"
0                                  # no base64/hex-shaped blobs added
$ git diff -U0 -- tests/e2e/ | grep "^+" | grep -oE '"[a-z]{4,10}"' | sort -u
"checking"  "crypto"  "visible"    # the only quoted lowercase literals I added
```

(`"crypto"` is the Node module specifier from the §2.5 parallel-safety import, not a credential.)

The 13 added lines matching `seed|phrase|secret|key|password|token|jwt` are all **prose in comments,
`data-testid` strings, and locator calls** — chiefly `waitForUnlockHydration`'s doc block explaining
the seed-input hydration race, plus `getByTestId("passkey-unlock-button")` and
`getByTestId("seed-word-input-0")`. No literal credential value was added anywhere.

Two further shape-based checks on the final diff, both clean:

```
$ git diff -- tests/e2e/ | grep "^+" | grep -cE '\b([a-z]{3,8} ){11}[a-z]{3,8}\b'
0                                  # no 12-word mnemonic-shaped run added
$ git diff -- tests/e2e/ | grep "^+" | grep -cE 'process\.env|\.env'
0                                  # no environment/secret plumbing touched
```

---

## 6. Honest limitations

- **A clean campaign in one environment does not prove a load-dependent class is closed everywhere**
  — that is the whole lesson of rev 02, and I am not claiming otherwise. The argument that these
  fixes hold is the _construction_ argument in §1.3 and §2.2, not the run count. The campaign
  demonstrates no regression and no reproduction; the principle is what makes it durable.
- F-1 did not reproduce for the rev-04 reviewer either (0/8), so a green campaign is weak evidence
  for that half specifically. Its fix rests on the mechanism analysis: a 5000ms "wait" that is
  bit-identical to no wait at all is a defect on inspection, independent of whether any given
  machine happens to lose the race.
- I did not change `src/components/ui/input.tsx`. If a future reviewer judges the product-side
  hydration gate worth its UX cost, that is a separate, deliberate product decision — §1.2 records
  my reasoning for declining it, and it remains open to root.
- **The two halves of this revision rest on different strengths of evidence, and I will not blur
  them.** F-2 is a genuine fix: the old guard could not prove hydration for an ungated controlled
  input, the new one proves it by construction, and the misleading `toHaveValue` assertions are
  gone. F-1 is a defensible correction of an inspection-level defect — a 5000ms "wait" is
  bit-identical to no wait — but a longer timeout does not make a race impossible, only much less
  likely to be lost. If a future audit still sees a cohort member fail, the answer is not another
  timeout bump: it is to find the specific async signal that member races and gate on it, the way
  `waitForUnlockHydration` gates F-2.
- The 7 `field-rule-editor` sites (§2.4) were hardened without ever having been observed to fail.
  That is prophylactic, justified by the monotonicity argument, and I flag it as such rather than
  implying I fixed seven live bugs.
- **The temp-file collision (§2.5) proves this suite has more than one failure mode under
  parallelism, and I only fixed the one that fired.** Cross-worker shared-resource contention is a
  different class from eager assertions: it is immune to timeouts and invisible in isolation. I
  swept `tests/e2e/**` for the same shape and confirmed `import.spec.ts` was the only offender —
  every other `Date.now()` is a timing measurement, and `tab-duplication.spec.ts:52` correctly uses
  `mkdtemp`, which is collision-safe by construction. But I did not attempt a general audit of
  shared-resource use across workers (ports, fixture accounts, the database, `localStorage` keys).
  If P21 keeps surfacing "flakes" in this suite, that audit — not more timeout tuning — is where I
  would look next.
