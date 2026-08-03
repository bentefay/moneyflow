# P20B revision 08 — remediation of F-A/F-B/F-C — Independent Review

- **Reviewer:** `p20b-reviewer-08` — distinct from `p20b-implementer-08` and from
  `p20b-reviewer-01`, `-02`, `-03`, `-06`, `-07`. I wrote none of this code.
- **Package / revision:** P20B, revision 08. **Evidence reviewed:**
  `evidence/P20B/implementation-09.md` (uncommitted on disk by design, `PROCESS.md:58`; the
  filename-one-ahead skew is known and is not an error).
- **Date:** 2026-08-03.

**Reading convention.** Every claim is tagged **MEASURED** (I ran the command in this session and
its output is reproduced here) or **INFERRED** (read from source or a log without a discriminating
execution of my own). Per the dispatch's method note I re-derived every figure I was given rather
than relaying it, **including the figures in the dispatch itself and in
`reviews/P20B-review-07.md`** — and one inherited claim did not survive that re-derivation (F-D
below). Log paths are named in every claim that rests on one.

---

# VERDICT

# PASS

**with one MEDIUM finding (F-D) that root must record as a correction rather than persist
silently.**

Both changes are correct. I did not take the implementer's two-directional control on trust: I
re-ran its preserved probe verbatim, added a **mutation control** it did not run, and then rebuilt
the same state **by hand in a real browser** with no probe spec at all. All three agree. Every
campaign figure, every per-site count, every step name and all five retractions reproduce exactly.
Static verification is green.

F-D is a single sentence in evidence §2.2 that is tagged **MEASURED** and is **false**:
`/tmp/p20b07-final/summary.log` also ends `CAMPAIGN_COMPLETE`. The conclusion it supports is
nonetheless correct, no figure moves, and the correct discriminator is already two paragraphs below
it. That is a correction, not a blocking defect — but it is the same species as F-A, in the section
that remediates F-A, and it must not go into the durable record unmarked.

---

## 0. Range, ancestry and tree integrity — MEASURED

The dispatch's hash hazard is real and I re-derived past it.

```
$ git rev-parse HEAD                                        (start of review)
e69326511d0e055c1926bdc10673e59696d2b39b
$ git rev-parse HEAD                                        (re-checked at the end)
3301b599e55c25c60c296f5113298a3b3ab80343
$ git merge-base --is-ancestor 205ca15 HEAD              -> exit 0  (ancestor, both times)
$ git merge-base --is-ancestor 38c242c HEAD              -> exit 0  (ancestor)
$ git merge-base --is-ancestor c15be12 HEAD              -> exit 0  (BASE is an ancestor)
$ git merge-base --is-ancestor 5e02607 HEAD              -> exit 1  (NOT an ancestor)
$ git cat-file -t 5e02607                                -> commit  (still resolves)
```

**The amended-away `5e02607` behaves exactly as the dispatch warned** — `git show` resolves it, but
it is not reachable from HEAD. I reviewed `205ca15`. HEAD moved during my review (root committed
`3301b59`, `PROGRESS.md` only, +55 lines); `205ca15` remained an ancestor and
`git diff --stat 205ca15 HEAD -- tests/ src/ .claude/ playwright.config.ts` was **empty** at the end
of the review. No drift under my feet.

**Scope — MEASURED, and it matches the declaration exactly.**

```
$ git diff --stat c515173 205ca15            (non-spec paths only)
 .claude/skills/e2e/SKILL.md            | 13 +
 tests/e2e/people-settlement.spec.ts    |  5 +-
```

Two commits — `38c242c` (F-B) then `205ca15` (F-C). Everything else in `c515173..205ca15` is
root-owned control artifacts under `specs/`.

- `git diff --stat c515173 205ca15 -- src/` → **empty. No product code.**
- `git diff --stat c515173 205ca15 -- playwright.config.ts tests/e2e/helpers/nav.ts tests/e2e/helpers/settlement.ts`
  → **empty**, and also empty against HEAD. **The three files reviewed at rev 07 are byte-identical
  to `c515173`**, as the dispatch requires.

**The amend disclosure is exact — MEASURED.** `git diff 5e02607 205ca15` is a single hunk in
`.claude/skills/e2e/SKILL.md` changing `115 toHaveCount(0) absence assertions` to
`113 of the 115 toHaveCount(0) absence assertions`, and nothing else.
`git diff --stat 5e02607 205ca15 -- tests/ src/ playwright.config.ts` is empty, so the runs in
**evidence** §3.2/§3.3 executed at `5e02607` do transfer. **Independently corroborated:** the
implementer's own run logs record `spec_md5=005fc1c55b2b`, and
`md5sum tests/e2e/people-settlement.spec.ts` **at `205ca15`** is `005fc1c55b2bb0157350ce5243f82898`.
The spec under test was byte-identical to the handback.

---

## 1. Static verification — ALL PASS at the reviewed tree

**MEASURED**, run **sequentially** in the primary checkout with nothing else consuming CPU (per the
recorded `duplicates.test.ts` wall-clock-ratio hazard; load average **0.75** at start). Driver
`/tmp/rev08-static.sh`, summary `/tmp/rev08-static.log`.

| Check                          | Command                             | Exit  | Result                                             | Log                        |
| ------------------------------ | ----------------------------------- | ----- | -------------------------------------------------- | -------------------------- |
| Typecheck                      | `pnpm typecheck`                    | **0** | `tsc --noEmit`, clean                              | `/tmp/rev08-typecheck.log` |
| Lint                           | `pnpm lint`                         | **0** | **0 errors, 1 warning** — the pre-existing P03 one | `/tmp/rev08-lint.log`      |
| Format — the two changed files | `pnpm exec oxfmt --check <2 paths>` | **0** | "All matched files use the correct format."        | `/tmp/rev08-fmt-mine.log`  |
| Format — repo                  | `pnpm format:check`                 | **1** | **29 files, every one under `specs/`**             | `/tmp/rev08-fmtcheck.log`  |
| Unit / property / integration  | `pnpm test`                         | **0** | **129 files, 2481 passed, 2 skipped**              | `/tmp/rev08-unit.log`      |
| Production build               | `pnpm build`                        | **0** | compiled, all 17 routes emitted                    | `/tmp/rev08-build.log`     |

The **2481** figure reproduces the evidence's, the rev 07 evidence's and the rev 07 reviewer's count
exactly. The single lint warning is React Compiler declining to memoize `useVirtualizer`
(`TransactionTable.tsx:459`, `react-hooks/incompatible-library`) — the tracked P03 upstream
interaction, untouched here.

**The `format:check` count, checked rather than waved through.** I measure **29**; the evidence
records 28; the rev 07 reviewer measured 26. **MEASURED**, the delta is fully accounted for: the
29th file is `specs/007-human-scratch-completion/dispatches/P20B-rev08-review.md`, committed by root
in `e693265` **after** the implementer's run. **0 files under `src/`, `tests/` or `.claude/`.**
Expected drift, not a misstatement.

---

## 2. F-B — the load-bearing claim, attacked three separate ways

The dispatch asked me to press hardest here, and warned that **a probe that cannot fail proves
nothing** — this goal has an explicit-`undefined` pre-fix probe on record that inverted a finding.
So I did not grade the implementer's probe by reading it.

### 2.1 The change itself — correct, and it matches the helper it now mirrors

`tests/e2e/people-settlement.spec.ts` step 9, three comment lines plus one assertion:

```ts
-            ).toContainText("50%");
+            ).toContainText("Explicit: 50%.");
```

**The expected string is right — MEASURED from the spec and the product.** Step 5 (`:305-307`) sets
`setAllocation(row, "Bob", "50")`, so Bob's stored explicit at step 9 is `50`.
`PersonAllocationCell.tsx:73-74` renders `${explicitStored ? \`Explicit:
${explicitDisplay}.\` : "Explicit: not stored."} Effective: …% Owner remainder: …%.`,
and `displayPercentage` (`:34-38`) renders a stored number as `${String(value)}%`— so`Explicit:
50%.`matches verbatim with no formatting skew. The new form is byte-for-byte the barrier`setAllocation`was hardened to at`c515173` (`helpers/settlement.ts:204-206`),
so the suite now reads stored allocation state one way rather than two.

**It cannot pass falsely — INFERRED from `PersonAllocationCell.tsx:61,73`.** The `Explicit: X%.`
clause is gated on `explicitStored`; nothing derived can synthesise that prefix, and the locator is
scoped to Bob's own button. **It cannot fail falsely** for the same reason, and both directions were
then measured rather than left as an argument.

### 2.2 I re-ran the implementer's probe verbatim, in my own worktree — MEASURED

Worktree `/tmp/mf-rev08` (`git worktree add --detach 205ca15`), untracked `.env.local` **copied in**
(per the recorded hazard that a fresh worktree without it fails every journey at `createNewIdentity`
and impersonates a total product break), dependencies **installed with
`pnpm install --frozen-lockfile`** — never `cp -a node_modules`, per the stale-`results.json`
hazard. Probe copied from the preserved artifact, `md5sum` identical on both sides
(`0d9227e25f161407063335a7166a15cf`). Log `/tmp/rev08-fb-probe.log`.

```
[PROBE ABSENT]  cell textContent: "—Explicit: not stored. Effective: 0%. Owner remainder: 50%."
[PROBE ABSENT]  old "50%"            -> PASS
[PROBE ABSENT]  new "Explicit: 50%." -> FAIL

[PROBE PRESENT] cell textContent: "50%Explicit: 50%. Effective: 50%. Owner remainder: 0%."
[PROBE PRESENT] old "50%"            -> PASS
[PROBE PRESENT] new "Explicit: 50%." -> PASS
```

**Both printed strings are byte-identical to the implementer's `/tmp/p20b08-probe.log`, and to the
rev 07 reviewer's §6 F-B measurement.** Three agents, three sessions, the same two strings.

### 2.3 The mutation control the implementer did not run — MEASURED, and this is what settles it

A probe that prints its own conclusion is still a probe. **The question is whether the ABSENT state
is absent because of the `Escape`, or because the grading was arranged to say so.** I answered it by
mutating exactly one character of the probe — the dropped keypress — and predicting the outcome in
advance:

```
$ sed 's|await input.press("Escape");|await input.press("Enter");|' <probe> > <control>
$ diff <probe> <control>
61c61
<         await input.press("Escape");
---
>         await input.press("Enter");
```

**Prediction:** if `Escape` is what drops the write, the control's ABSENT arm must now land the
allocation, `new -> PASS`, and `expect(newResult).toBe("FAIL")` must go **RED**.

**Result — `/tmp/rev08-fb-probe.log:6-10, 32-48`:**

```
[PROBE ABSENT] cell textContent: "50%Explicit: 50%. Effective: 50%. Owner remainder: 0%."
[PROBE ABSENT] new "Explicit: 50%." -> PASS
  ✘ 1 zz-rev08-fb-control.spec.ts:69 …
    Error: the new assertion must fail on a lost allocation
    Expected: "FAIL"   Received: "PASS"
```

**The one keypress is the whole difference.** The ABSENT state is genuinely absent, produced by
dropping the write, not by a doctored assertion — and the probe's oracle demonstrably bites, so it
is not a probe that cannot fail.

**An unplanned second control, which is stronger than the one I designed.** The control run's
_unmutated_ PRESENT arm — which lands Bob's 50 through the real `setAllocation` helper — **also went
red**, at line 102, **past** the helper's own `Explicit: 50%.` barrier. Preserved snapshot
`/tmp/rev08-artifacts/zz-rev08-fb-control-F-B-PR-52aba-ocation-is-genuinely-stored-chromium/error-context.md:168-175`:

```yaml
- button "Edit Bob allocation": text: —
    "Explicit: not stored. Effective: 0%. Owner remainder: 50%."
- button "Edit Me allocation":  text: 50%
    "Explicit: 50%. Effective: 100%. Owner remainder: 50%."
```

…with the sync status reading **`Saved`** (`:52-54`). So a **genuine, unsimulated** lost allocation
occurred inside my own probe run, and against it:

| assertion                             | result on the genuinely lost write  |
| ------------------------------------- | ----------------------------------- |
| old `toContainText("50%")`            | **PASS** — would not have caught it |
| new `toContainText("Explicit: 50%.")` | **FAIL** — catches it               |

**The F-B fix is therefore validated against the real failure mode in the wild, not only against a
synthesised one.** (What that loss means for the residual class is **not** mine to say and I do not
say it — see §6.)

### 2.4 And by hand, in a real browser, with no probe spec at all — MEASURED

Repository-installed `pnpm exec playwright-cli`, disposable session `rev08man2`, headless, no
Playwright MCP, no `npx`, no ad-hoc script or temp test file, no `--debug`/`--ui`/`--headed`/`show`.
Dev server on **`:3000`** started from my own worktree. Real vault, real people, real grid cells.

| #   | State built by hand                          | Bob's cell, read from the live DOM                              | old `"50%"` | new `"Explicit: 50%."` |
| --- | -------------------------------------------- | --------------------------------------------------------------- | ----------- | ---------------------- |
| 1   | new transaction, nothing allocated           | `— Explicit: not stored. Effective: 0%. Owner remainder: 100%.` | fails       | fails                  |
| 2   | **Me 50 stored, Bob absent** (the F-B state) | `— Explicit: not stored. Effective: 0%. Owner remainder: 50%.`  | **PASSES**  | **fails**              |
| 3   | Bob 50 entered through the real cell         | `50% Explicit: 50%. Effective: 50%. Owner remainder: 0%.`       | passes      | passes                 |
| 4   | **after `reload()`** — the step-9 action     | `50% Explicit: 50%. Effective: 50%. Owner remainder: 0%.`       | passes      | passes                 |

**Row 2 is the finding, reproduced by hand.** The `50%` the old assertion matched is
`Owner remainder: 50%` — a derived figure that exists _because_ Bob's write is missing. **Row 1
bounds it usefully and nobody has stated this before:** before Me's 50 lands, the remainder reads
`100%` and the old assertion would have failed correctly. The defect is not "the old assertion never
worked" — it is that it stops working at exactly the point step 9 depends on it.

**Accessible role / name / state of the changed control — MEASURED**, `eval` on the live element:

```
tag=BUTTON  type=button  accessible name="Edit Bob allocation"  aria-describedby="_r_r_"
disabled=false  aria-disabled=null  tabIndex=0
textContent="50%Explicit: 50%. Effective: 50%. Owner remainder: 0%."
```

Expected: a focusable, enabled native button named `Edit Bob allocation` with a description.
Observed: exactly that. The `textContent` also confirms the mechanism in `setAllocation`'s JSDoc —
**the description is a child of the same button**, which is why `toContainText` sees it at all.

| Manual clause                            | Result                                                                             |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| New identity by recovery phrase          | **PASS** — vault created, landed on `/settings`                                    |
| Acknowledgement gating                   | **PASS** — `Create Account` `disabled` until the checkbox is checked               |
| Allocation entry through real grid cells | **PASS** — the four-row table above                                                |
| Persistence across a full reload         | **PASS** — row 4                                                                   |
| Console hygiene                          | **PASS** — 5 messages, **0 errors, 0 warnings**                                    |
| Network hygiene                          | **PASS** — 18 non-static requests, all `200`; **zero 4xx, zero 5xx**               |
| Secrets in URLs                          | **PASS** — only `_next`, `__nextjs`, `favicon`, `api/trpc`; no auth/seed material  |
| 320 px reflow                            | **PASS** — `scrollWidth == clientWidth == 320`, no overflow                        |
| 200% zoom at 1280×800                    | **PASS** — `scrollWidth == clientWidth == 1280`                                    |
| Dark mode                                | **PASS** — cell text `lab(65.53 …)` dark vs `lab(48.09 …)` light; correct polarity |
| Reduced motion                           | **PASS** — `prefers-reduced-motion: reduce` matches                                |

**A note on the two `realtime.revoke` POSTs** that the request listing showed without a status: I
checked the dev-server log rather than assuming. `/tmp/rev08-dev.log` records all three as
`POST /api/trpc/realtime.revoke?batch=1 **200**`. They were simply still in flight when I listed.
**No 4xx or 5xx occurred**, consistent with the rev 07 matrix at a byte-identical `src/`.

**Secret safety.** The flow displayed a real 12-word recovery phrase for a throwaway vault. I never
revealed, copied or recorded it; it appears in no file, log or message. Both sessions were closed
and `delete-data` run.

### 2.5 Does F-B destabilise the mandatory journey? — MEASURED, my own campaign

The dispatch's item 4. Ten executions of the journey **at `205ca15`**,
`--repeat-each=10 --retries=0 --workers=2`, `env -u CI`, from my own worktree. Log
`/tmp/rev08-journey10.log`. Tree integrity: `spec_md5=005fc1c55b2b` recorded at START **and** END —
identical, no drift.

**7 passed, 3 failed.** Counting only Playwright's numbered failure blocks
(`grep -cE '^  [0-9]+\) \[chromium\]'`), and recording the **step name** the ledger has been losing:

| #   | site   | failing step name                                            | assertion site              |
| --- | ------ | ------------------------------------------------------------ | --------------------------- |
| 1   | `:281` | **11. restore paid, enter Bob -20% and verify the reversal** | `helpers/settlement.ts:419` |
| 2   | `:281` | **6. verify Bob owes Me $50 on People**                      | `helpers/settlement.ts:412` |
| 3   | `:281` | **6. verify Bob owes Me $50 on People**                      | `helpers/settlement.ts:412` |

**Not one failure is at step 9, and not one is at the changed assertion — MEASURED:**
`grep -n 'Explicit: 50%' /tmp/rev08-journey10.log` → **no match**; no failure lands at spec line 350
or 351.

**Step-9 reach arithmetic, stated so it can be checked.** `test.step` runs sequentially and a
failing step aborts the test, so a failure at step 11 proves steps 1–10 passed. Two executions died
at step 6 and never reached step 9; one died at step 11, past it. **8 of 10 executions reached step
9 and 8 of 8 passed it.** That independently confirms and slightly strengthens the evidence's own
6-of-6.

**I re-verified the evidence's §3.3 figures from its preserved logs too — MEASURED, and they are
exact.** `/tmp/p20b08-repeat3.log`: 5 numbered failure blocks at `:599, :145, :166, :197, :281`(step
6), all `at helpers/settlement.ts:412`, zero matches for `Explicit: 50%`.
`/tmp/p20b08-journey6.log`: 3 blocks, all `:281`, at steps **6, 11, 6**. Its "step 9 reached six
times, passed six times" arithmetic checks out: 9 `:281` executions, 3 died at step 6, 6 reached
step 9.

**The `+3` line-shift caveat in evidence §2.2 is correct — MEASURED.** The change adds three lines
at 346, so the campaign's `:596` is `:599` at the new HEAD; `:281`, `:197`, `:166` and `:145` sit
above the insertion and do not move.

---

## 3. F-A — checked as literally as the code

### 3.1 The five retractions — every one verified against the committed artifact

**MEASURED**, against `git show 0e08862:…/implementation-08.md`, not against the review that
reported them:

| #   | Retracted claim                                                                                          | My verification                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | `PLACEHOLDER-CAMPAIGN` at line 170                                                                       | **line 170 is exactly that token** ✔                                                                                  |
| 2   | No `0a6703e11a28` / `65a6ba3389ea` / `p20b07-c2` anywhere                                                | `grep` → **no match** ✔                                                                                               |
| 3   | `§4.2b` referenced at 247 and 588; headings run `4.0,4.1,4.1b,4.1a,4.2,4.3,4.3a,4.3c,4.3e,4.3f,4.3d,4.5` | **exact, in that order; no `4.2b`** ✔                                                                                 |
| 4   | Line 247 names `FINAL tree 5bdd30322604`; line 236 discards it                                           | 247 = `FINAL tree 5bdd30322604 files=e53e6e7e0bd5 (the campaign reported in §4.2b)`; 236–237 discard `5bdd30322604` ✔ |
| 5   | Line 649 attributes the static checks to `6061ef7`                                                       | line 649 = `## 4.4 Static checks — all at the handback commit `6061ef7`` ✔                                            |

Item 3's heading list is literally accurate: `## 4.4` exists but is not a `### 4` heading, and the
evidence's claim is scoped to `### 4` headings and to the absence of `4.2b`, both of which hold.

**The retraction's scope discipline is right, not merely present.** It declines to widen the rev 07
reviewer's "omission, not overstatement" verdict, and explicitly preserves `implementation-08.md`
§4.3c and §4.3f — the sections in which that implementer refuted its own hypothesis and disclosed
its own regression. Retracting those would have destroyed the most valuable content in the artifact.

### 3.2 The `c515173` campaign — every figure re-derived from `/tmp/p20b07-c2/` and correct

**MEASURED.** I computed each figure from the ten raw run logs, not from `summary.log`'s
pre-computed lines, not from `PROGRESS.md`, and not from the rev 07 review.

**Tree identity.** One triple and only one across all twenty START/END lines:

```
$ grep -oE 'head=[0-9a-f]+ digest=[0-9a-f]+ files=[0-9a-f]+' /tmp/p20b07-c2/summary.log | sort -u
head=c515173 digest=0a6703e11a28 files=65a6ba3389ea
$ grep -cE '=== RUN [0-9]+ (START|END)' /tmp/p20b07-c2/summary.log   -> 20
```

**Per-run counts**, counting **only** Playwright's numbered failure blocks — a bare grep for the
spec path also matches passing `✓` lines and inflates the table:

| run           | 1   | 2   | 3   | 4       | 5       | 6   | 7   | 8   | 9   | 10  | total  |
| ------------- | --- | --- | --- | ------- | ------- | --- | --- | --- | --- | --- | ------ |
| failed        | 1   | 1   | 1   | **0**   | **0**   | 2   | 2   | 2   | 1   | 1   | **11** |
| passed        | 194 | 194 | 194 | **195** | **195** | 193 | 193 | 193 | 194 | 194 |        |
| artifact dirs | 1   | 1   | 1   | 0       | 0       | 2   | 2   | 2   | 1   | 1   | **11** |

**11 failures over 10 runs = 1.10 per run; two green runs (4 and 5); 195 distinct tests per run in
all ten; 1,950 executions.** The artifact-directory row is an independent filesystem corroboration
and matches in every run. **Every figure in evidence §2.2 reproduces exactly.**

**Per-site inventory and step names — MEASURED, all eleven blocks, and all six rows of the
evidence's step-name table are exact:** `:596`×4 (runs 6,7,8,10 — "a deleted Person keeps their
historical balance under a stable deleted label"); `:166`×3 (runs 1,3,8 — "canonical example D…");
`:281`×2 (run 6 — **"11. restore paid, enter Bob -20% and verify the reversal"**; run 7 — **"6.
verify Bob owes Me $50 on People"**); `:525`×1 (run 2); `transactions.spec.ts:572`×1 (run 9).

### 3.3 Literal defect scan of `implementation-09.md` — clean on all three counts the dispatch named

**MEASURED.**

- **Placeholder tokens:** `grep -niE 'PLACEHOLDER|TODO|TBD|FIXME|XXX|<fill|pending'` returns **one**
  hit, line 83 — the quoted `PLACEHOLDER-CAMPAIGN` token being retracted. **No placeholder stands in
  for content.**
- **Dangling `§` references:** all 33 internal references resolve.
  `§1, §2, §2.2, §2.3, §3, §3.2, §3.3, §4, §5, §6` all exist as headings in the file. **Every
  cross-file reference is visibly marked as such** — `§4.2b`, `§4.3c` and `§4.3f` are each prefixed
  `implementation-08.md`, and the four review references are each prefixed
  `reviews/P20B-review-07.md`. This is the exact defect F-A was about and it is not repeated.
- **Internal contradictions:** none found. Its §5 header says "at HEAD `205ca15`" and the very next
  paragraph states precisely which checks ran pre-amend and which were re-run after — and I verified
  the discriminating fact behind that disclosure
  (`git diff --stat 5e02607 205ca15 -- tests/ src/ playwright.config.ts` empty; `format:check`, the
  only check that reads markdown, re-run at `205ca15`).

**Both `Q-PROPOSAL` blocks carry all nine `PROCESS.md` fields, in order, with no placeholder.**

### 3.4 The F-C figures — re-derived, and the implementer's correction is right

**MEASURED at HEAD:**

```
$ grep -rn 'toHaveCount(0)'  tests/e2e/ | wc -l   -> 115
$ grep -rn 'toHaveCount(0,'  tests/e2e/           -> 2
    tests/e2e/passkey.spec.ts:448            -> timeout: 20000
    tests/e2e/realtime-security.spec.ts:156  -> timeout: 15_000
```

I opened both to confirm the second argument really is a timeout rather than some other option — it
is. **113 of 115 carry none. The implementer was handed 115 by both the dispatch and the rev 07
review, re-derived it, found it off by two, and amended its commit to write the corrected figure
into durable guidance.** That is the right instinct and worth recording as such.

The "12 deliberately-short probes" figure is also exact: **one 1000 ms, one 2000 ms, ten 3000 ms**.
`playwright.config.ts:67` is `expect: { timeout: 15_000 },` — the evidence's line number is right
(the rev 07 review's `:65` pointed at a comment line). **MEASURED**,
`git grep 'expect.*timeout\|15_000' ee01213 -- .claude/` returns nothing at BASE, so the F-C premise
holds, and the new `## Timeouts` section records all three things the review asked for.

---

## 4. Did anything over-claim? — no

The dispatch's item 5. **Every `§` in this paragraph is a section of `implementation-09.md`, not of
this review.** I looked for drift from "localisation, not a fix" and found none. Evidence §0 states
it, evidence §2.3 refuses the 1.10-vs-1.29/1.60 rate comparison and cites the rev 07 reviewer's
2.25-on-the-identical-tree control as the reason, evidence §3.3 explicitly labels its own
journey-density observation **INFERRED and an argument rather than a result**, and evidence §6
states the residual class is `NOT MINE, NOT ADDRESSED, NOT CLOSED`. Evidence §0's "F-B — FIXED"
refers to the review finding, not the failure class, and the same table says the class is not closed
two rows down.

**The evidence's error, like rev 07's, is omission rather than overstatement — with the single
exception recorded as F-D.**

---

## 5. Findings

### F-D — MEDIUM. A `MEASURED`-tagged discriminator in evidence §2.2 is false.

- **Severity:** Medium · **Category:** Requirements / evidence accuracy
- **File:** `specs/007-human-scratch-completion/evidence/P20B/implementation-09.md:111-113`

**The claim:**

> **Source: `/tmp/p20b07-c2/` — that directory and no other.** `/tmp/p20b07-campaign`, `-campaign2`
> and `-final` are superseded trees and I read none of them. **MEASURED**,
> `/tmp/p20b07-c2/summary.log` is the only one of those four whose log ends `CAMPAIGN_COMPLETE`.

**MEASURED — it is not:**

```
$ for d in /tmp/p20b07-campaign /tmp/p20b07-campaign2 /tmp/p20b07-final /tmp/p20b07-c2; do
    printf '%-26s : %s\n' "$d" "$(tail -1 $d/summary.log)"; done
/tmp/p20b07-campaign       : === RUN 3 START digest=2dcac604bc4e … ===
/tmp/p20b07-campaign2      : === RUN 2 START digest=5bdd30322604 … ===
/tmp/p20b07-final          : CAMPAIGN_COMPLETE
/tmp/p20b07-c2             : CAMPAIGN_COMPLETE
```

**`/tmp/p20b07-final/` is a complete ten-run campaign** — ten `run<N>.log` files, ten artifact
directories, and its own `CAMPAIGN_COMPLETE`. **Two of the four end with that marker, not one.**

**Why it is real rather than pedantic.** The sentence is the stated _rule_ for selecting the
campaign directory, and `PROCESS.md:359` makes these artifacts the recovery source. A future reader
applying the rule as written gets **two** candidates — and the wrong one is the **pre-fix
`head=6061ef7`** campaign whose `:281` step 11 failed in **10 of 10 runs** (MEASURED,
`/tmp/p20b07-final/run*.log`), i.e. precisely the campaign rev 07 discarded. Selecting it would
resurrect a regression the goal already paid to kill. The sentence is also self-undermining:
measuring a property of all four directories requires reading all four, which the preceding clause
disclaims.

**Bounds, stated so this is not over-read.** The conclusion is **correct** — `/tmp/p20b07-c2/` is
the right directory — and the **correct, decisive discriminator is already present two paragraphs
below**: `head=c515173` in the digest triple, against `head=6061ef7` in `-final`. **No campaign
figure moves.** All eleven, the per-site inventory and all six step names reproduce exactly (§3.2).
This costs the artifact a sentence, not its conclusion.

**Provenance, in fairness to the implementer.** The claim is **inherited verbatim** from
`reviews/P20B-review-07.md` §3.1 ("the only directory whose `summary.log` ends
`CAMPAIGN_COMPLETE`"). The implementer re-derived every _figure_ it was handed, as it said, and
caught the 115→113 error doing so. It did not re-derive this _predicate_, and re-tagged an inherited
claim as MEASURED. **The rev 07 review carries the same error and root's ledger may too.**

**Fix (one sentence, no re-run):** replace the discriminator with the one that actually decides it —
`/tmp/p20b07-c2/` is the campaign whose twenty START/END lines all read `head=c515173`, the handback
commit; `/tmp/p20b07-final/` is a complete campaign but at `head=6061ef7`, the superseded tree — and
drop or qualify "I read none of them".

**Why this is a correction and not a FAIL.** F-A was blocking because the campaign was _absent_.
Here the campaign is present, complete and exact to the last step name; the defect is one false
predicate whose conclusion is independently and trivially verifiable from the same section. Root
already has a mechanism for this: `be50232` recorded a post-handoff correction to the rev 07 review
without a new revision. **Root must not persist `implementation-09.md` without recording this
correction alongside it**, and should carry the same correction against `reviews/P20B-review-07.md`
§3.1.

---

## 6. Notes that are not findings

- **A lost-write instance my probe run captured, recorded for root and deliberately not routed.**
  §2.3: Bob's allocation passed `setAllocation`'s hardened `Explicit: 50%.` barrier, then read
  `Explicit: not stored.` after `goToTransactions` + `reload()` — while **Me's write, made moments
  earlier through the same helper in the same session, survived**, and sync reported **`Saved`**.
  Artifact:
  `/tmp/rev08-artifacts/zz-rev08-fb-control-F-B-PR-52aba-ocation-is-genuinely-stored-chromium/error-context.md:168-175`.
  I state the observation and stop there. **F-2 and the residual settlement class are deliberately
  unowned (`Q-P20B-26`) and are not mine to route**, I did not measure the mechanism, and one
  observation licenses no conclusion about a class.
- **The residual class is not closed and nothing here claims it is.** My own 10-execution journey
  campaign failed 3 (§2.5) and root's 10-run campaign failed 11 (§3.2). **The 10-consecutive-green
  bar is NOT met.** It was not this revision's to meet, and I do not fail it for that.
- **No rate comparison is offered.** The rev 07 reviewer established with a control that the same
  byte-identical tree yields 1.10/run and 2.25/run for two agents. My 3-in-10 journey figure is a
  different unit again and I draw nothing from it.
- **The un-swept sibling sites** the implementer raises in `Q-PROPOSAL-P20B-08-1` are real —
  `rule-creation-controls.spec.ts:253,272` and `transactions.spec.ts:2794` also address allocation
  cells. **MEASURED**, none of them is a persistence-after-reload assertion, so none carries F-B's
  specific weakness. Correctly out of scope; the proposal is the right place for it.

---

## 7. Reviewer checkpoint — what I could not complete

Stated rather than omitted.

- **Multiple-tab, offline and isolated-multi-user clauses not exercised manually.** No product code
  changed and the automated suite covers them; I do not claim a manual pass.
- **Computed contrast ratios not calculated.** No changed focus/error/status/text control exists in
  this diff — it is test-instrument and documentation only. I recorded the changed control's
  computed colours and dark/light polarity instead of reporting a ratio I did not compute.
- **I did not re-run the `c515173` full-suite campaign.** §3.2 is a re-derivation from
  `/tmp/p20b07-c2/`'s raw logs, and I say so in every claim there. My own execution evidence is the
  four probe/control tests and the ten journey executions at `205ca15`.
- **The residual class mechanism is unmeasured**, deliberately (§6).
- **Import, passkey and realtime flows not manually exercised.** Unchanged by this diff.

---

## 8. Proposed questions

### Q-PROPOSAL-P20B-08-1 — When a reviewer finds a single false claim in evidence that changes no conclusion, is that a FAIL or a root-recorded correction?

- **Raised by/package/revision:** `p20b-reviewer-08` / P20B / 08
- **Context and evidence:** F-D. `implementation-09.md:113` carries a `MEASURED`-tagged predicate
  that is false (`/tmp/p20b07-final/summary.log` also ends `CAMPAIGN_COMPLETE`), inherited verbatim
  from `reviews/P20B-review-07.md` §3.1. Every figure it introduces is exact and its conclusion is
  correct. `PROCESS.md:58` has root persist evidence **unchanged**, so a PASS freezes the false
  sentence into the durable record; a FAIL costs a full implementer + reviewer cycle for one
  sentence. Root has already used a third path once — `be50232` recorded a post-handoff correction
  to the rev 07 review without opening a revision.
- **Why existing authority does not decide it:** `PROCESS.md:58` and `PROCESS.md:153-159` say what
  evidence must record and that root persists it unchanged, but give no rule for a factual defect
  that is below the threshold of re-work and above the threshold of silence.
- **Options considered:** (a) FAIL on any false MEASURED claim regardless of materiality; (b) PASS
  and require root to record the correction in the same control commit that persists the artifact;
  (c) permit the reviewer to state the correction in its review only, leaving the evidence
  uncorrected and the two documents in conflict.
- **Reversible default selected to continue:** **(b)** — I passed the revision and stated the exact
  replacement sentence, so root can persist the correction beside the artifact in one commit.
- **Decision-hierarchy basis:** 2 (established repository convention — the `be50232` precedent),
  then 4 (smallest reversible step).
- **Impact and risk:** low, and it removes a live one: three artifacts in this goal now carry the
  same inherited false predicate, and under option (c) they would continue to.
- **Reversal or migration path:** none needed; a correction line is additive.
- **Human review still useful after completion:** no.

### Q-PROPOSAL-P20B-08-2 — Should a campaign directory be identified by its recorded `head=`, never by a completeness marker?

- **Raised by/package/revision:** `p20b-reviewer-08` / P20B / 08
- **Context and evidence:** F-D's mechanism. Four campaign directories exist for rev 07; **two** end
  `CAMPAIGN_COMPLETE`, and the completeness marker therefore does not discriminate at all — the
  superseded `/tmp/p20b07-final/` is a _complete_ ten-run campaign that merely ran at the wrong
  commit (`head=6061ef7`, `:281` step 11 failing 10/10). The driver already records
  `head=<commit> digest=<hash> files=<hash>` on every START/END line, which discriminates exactly.
  Two documents so far have used the marker instead.
- **Why existing authority does not decide it:** `PROCESS.md` requires evidence to record
  "commands/results" but says nothing about how a campaign's _identity_ must be asserted when
  several campaigns coexist on disk.
- **Options considered:** (a) require every campaign citation to quote the
  `head=`/`digest=`/`files=` triple and forbid completeness markers as identifiers; (b) require
  superseded directories to be deleted or renamed at the moment they are superseded; (c) leave it
  and rely on reviewers noticing.
- **Reversible default selected to continue:** **(a)** — §3.2 of this review cites the triple, and
  F-D's fix restates the discriminator in those terms.
- **Decision-hierarchy basis:** 2 (repository convention), then 4.
- **Impact and risk:** low; (b) is tempting but destroys evidence a later reviewer may need — I read
  `/tmp/p20b07-final/` to establish the 10/10 pre-fix baseline that bounds F-D's severity.
- **Reversal or migration path:** drop the requirement; no migration.
- **Human review still useful after completion:** no.

---

## 9. Hygiene

- **Port `:3000`** claimed by my probe run, then by my journey campaign, then by my manual dev
  server; released at the end — **verified by port state (`ss -ltn` shows nothing on 3000-3009), not
  by an exit code**. **`:3001` was never touched**: pid `818182`, `readlink /proc/818182/cwd` =
  `/home/ben-agents/Code/moneyflow`, confirmed alive before and after. **No bare `pkill -f` was run
  at all** — I resolved `/proc/<pid>/cwd` and killed only the pid whose cwd was `/tmp/mf-rev08`.
- **No destructive database command.** No `pnpm db:reset`, no migration, no schema command.
- **No bare `pnpm format`.** Every format run was `--check`; `specs/**` and the frozen
  `specs/human-scratch.md` were not reflowed.
- **Shared checkout respected.** No `git stash`, no `git checkout --`, no `git add -A`. **I
  committed nothing.** `git status --porcelain` in the primary checkout shows no file I authored
  beyond this review. Scratch lives in `/tmp`, never inside the repo — the probe and control specs
  were written only into `/tmp/mf-rev08` and **removed before the journey campaign**.
- **Worktree** `/tmp/mf-rev08` at `205ca15`, `.env.local` copied in, dependencies installed with
  `pnpm install --frozen-lockfile` — **never `cp -a node_modules`**. Left in place for root; safe to
  `git worktree remove` once this verdict is accepted.
- **I wrote exactly one file:** `specs/007-human-scratch-completion/reviews/P20B-review-08.md`.
- **Artifacts preserved for root:** `/tmp/rev08-static.log` and the five per-check logs,
  `/tmp/rev08-fb-probe.log`, `/tmp/rev08-artifacts/` (both control error-contexts, copied out before
  any re-run), `/tmp/rev08-journey10.log`, `/tmp/rev08-dev.log`, `/tmp/rev08-requests.txt`. Root's
  `/tmp/p20b07-c2/`, `/tmp/p20b07-final/` and the implementer's `/tmp/p20b08-*` were read, never
  modified.

---

# VERDICT RESTATED

# PASS

**Both changes are correct and I verified them without trusting the implementer's account.** F-B's
two-directional control survived being re-run verbatim, survived a mutation control that flipped the
single keypress its ABSENT state depends on, was reproduced by hand in a live browser with no probe
spec, and was then validated against a **genuinely lost write** that occurred inside my own run —
the old assertion passed on it, the new one caught it. The probe was never committed. F-C's figures
are exact and the implementer amended its own commit to correct a number both the review and the
dispatch had handed it. F-A's five retractions verify line by line, and the supplied campaign
reproduces to the last step name. Static verification is green and the journey is not destabilised:
8 of 8 executions that reached step 9 passed it, and no failure anywhere touched the changed
assertion.

**One MEDIUM finding, F-D, requires action but not a revision.** A `MEASURED`-tagged sentence in
evidence §2.2 is false, inherited verbatim from the rev 07 review. It moves no figure and its
conclusion is right, and the correct discriminator sits two paragraphs below it. **Root must record
the correction in the commit that persists this evidence, and carry it against
`reviews/P20B-review-07.md` §3.1 as well** — otherwise a defect of exactly the species F-A named
enters the durable record for a third time.

**The 10-consecutive-green bar is not met, the residual settlement class is not closed, and neither
was this revision's to deliver.** I do not fail it for either, and I accept no claim that either is
resolved.
