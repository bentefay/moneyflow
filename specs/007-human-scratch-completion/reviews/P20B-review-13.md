# P20B revision 13 — independent review

- **Reviewer:** `p20b-reviewer-13`. Distinct from `p20b-implementer-13` and from every prior P20B
  reviewer (`-01`, `-02`, `-03`, `-06` … `-12`). I wrote none of the reviewed code.
- **Date:** 2026-08-03.
- **Subject:** BASE `ce355f1`, HEAD `9dba9c0`. The single clause named by **F12-1** of
  `reviews/P20B-review-12.md` §7.

**Reading convention.** Every claim is tagged **MEASURED** — I ran the command in this session and
report its output — or **INFERRED**. A bare `§` points at a section of **this** file; every
reference to another document names that document first.

**Line-number convention.** `passkey.spec.ts:NNN` is ambiguous across this change. **Every number
below names its tree.** `persistence.ts:NNN` and `local-persistence-seam.ts:NNN` are identical in
both trees — MEASURED, neither file is in the diff.

**Verdict: PASS.** No findings. One **flag** (§7.2) that root should read and may dismiss.

---

## 0. Range, literals and the pass-meaning test — re-derived, not carried

Logs: `/home/ben-agents/p20b-rev13-review-logs/`. Worktree: `/tmp/mf-p20b-rev13-review`, outside the
repository.

| Item                                                              | Value — all MEASURED                                                     |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `git merge-base --is-ancestor 9dba9c0 HEAD`                       | **exit 0** — `9dba9c0` is a real ancestor, not a dangling amended commit |
| `git log --oneline ce355f1..9dba9c0`                              | **one** commit, `9dba9c0`                                                |
| `git show --stat --format= 9dba9c0`                               | `tests/e2e/passkey.spec.ts`, **1 file, 3 insertions, 1 deletion**        |
| `git show --name-only --format= 9dba9c0`                          | `tests/e2e/passkey.spec.ts` **and nothing else**                         |
| `git diff --name-only d80f0e4..ce355f1 -- src tests`              | **empty** — BASE carries no product drift from the rev-12 reviewed tree  |
| `git diff --name-only ce355f1..9dba9c0 -- src tests/e2e/helpers/` | **empty** — no `src` change, **no barrier moved**                        |
| Tree digest at `9dba9c0`, before and after my E2E                 | **`a5862da1846536f4ff845c9be80f7cd7`** both times — no drift             |

All eight reconcile with `evidence/P20B/implementation-14.md` §0 exactly, including the digest.

**The pass-meaning test, applied as `PROCESS.md` item 2 states it rather than as string equality.**
HEAD moved twice while I worked, which is expected and legitimate:

- MEASURED at the start of my review, `git rev-parse HEAD` = `b79248d`; MEASURED later, `2d08065`.
- MEASURED, `git log --oneline 9dba9c0..HEAD` = `b79248d` and `2d08065`, **both root-owned `docs:`
  ledger commits**.
- MEASURED, **`git diff --name-only 9dba9c0..HEAD -- src tests` is empty.**

So the reviewed product/test tree is unchanged and only root-owned control files moved. **Item 2 is
satisfied.** Root should re-run the empty-diff check at acceptance time, not compare HEAD strings.

## 1. What changed — and the proof it is comment-only

`tests/e2e/passkey.spec.ts`, the comment on `unlockWithPasskey`. At `d80f0e4` **and at `ce355f1`**
the comment occupies `:60-65` and annotates the `awaitVaultPersistence(page)` call at `:66`; at
`9dba9c0` it occupies **`:60-67`** and annotates the same call at **`:68`**. MEASURED by reading all
three trees. Anything in a dispatch, review or question citing `:66` is against `d80f0e4`/`ce355f1`.

**Changed clause. Old** — `passkey.spec.ts:64-65` at `ce355f1`:

```
// case is covered on all four; where no vault is mounted it resolves as a no-op.
```

**New** — `passkey.spec.ts:65-67` at `9dba9c0`:

```
// case is covered on all four; where the seam reports no active vault it resolves as a no-op,
// but an absent seam on an (app) route is not a no-op — it retries until the seam appears or
// the page leaves those routes, which is why that branch stays.
```

**Comment-only, MEASURED, my own run of the discriminating check:**

```
git show 9dba9c0 -U0 | grep '^[+-]' | grep -v '^[+-][+-]' | grep -vE '^[+-]\s*//'
```

→ **zero lines.** Every added and removed line is a `//` line.

**INFERRED, deductively:** `9dba9c0` and `ce355f1` therefore compile to the same test program, and
**no execution can distinguish them.** This is the premise of §5.

### 1.1 The other four clauses are unchanged byte for byte — MEASURED two ways

- `diff` of the comment region reports `6c6,8`: **lines 1-5 of the range, i.e. file lines `:60-64`,
  matched exactly.** Only the final clause changed.
- md5 of `passkey.spec.ts` lines `60-64`: **`cf88257ee624cb8bcefb5830474f57f4` at all three of
  `ce355f1`, `d80f0e4` and `9dba9c0`.**
- Whole-file md5: **`7209d1d8da36d0f3c657b3771f9bfdd8` at `ce355f1` and `d80f0e4` (identical)**,
  `e9ba4b6a3afbedbb4026980944a5c02a` at `9dba9c0`.

`reviews/P20B-review-12.md` §7 verified each of those four clauses against source or against the
artifacts it cites. They were not reopened and I did not re-litigate them.

### 1.2 Nothing prohibited entered — MEASURED against the added lines only

| Prohibition                                  | Check on the three added lines                                                                                                                      | Result        |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| No count                                     | `grep -E '[0-9]'`                                                                                                                                   | **0 digits**  |
| No new citation that could drift             | `grep -E '§\|review\|\.md'`                                                                                                                         | **none**      |
| No crash-safety claim                        | `grep -icE 'crash\|durab\|flush\|indexeddb\|guarantee\|safe'`                                                                                       | **0**         |
| No fixed-property claim about a site's state | read: both new statements are **conditionals** (`where …`, `an absent seam on …`)                                                                   | **none**      |
| "at least fifteen" bound untouched           | `grep -rn 'fifteen'` at `9dba9c0` over `src tests` → **empty**; the bound lives only in root-owned `specs/` ledgers, which this diff does not touch | **untouched** |

**On "no universal."** The new text does contain one universally-quantified sentence — _"an absent
seam on an (app) route is not a no-op."_ I judge this **not** the prohibited kind, and the
distinction is load-bearing. F11-1 failed a revision because a comment asserted a universal **about
measured run outcomes** that measurement refuted. This universal is **about the helper's control
flow**, and I verified it is true by reading the source: with `seam == null` on an `(app)` route,
`persistence.ts:74-77` always returns a non-null string, so `:89` never returns, so `:92-93` always
sleeps at least once — `deadline` is set to `Date.now() + 15_000` at `:63`, so it cannot already
have expired on iteration 1. A source-grounded universal that a reader can check by reading the same
twenty lines cannot decay under re-measurement. **INFERRED** that this is the intended boundary;
**MEASURED** that the sentence is true of the source.

## 2. Both source citations verified at `9dba9c0`

The committed clause is framed as a statement about `tests/e2e/helpers/persistence.ts` source rather
than about any run. I checked every leg.

| Clause element                     | Source at `9dba9c0`                                                                                                                                                                     | Verdict     |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| "the seam reports no active vault" | `src/lib/sync/local-persistence-seam.ts:66` — `if (manager == null) return "no-active-vault";` — a **return, not a throw**                                                              | **correct** |
| "…it resolves as a no-op"          | `persistence.ts:79-81` awaits and returns `null`; `:89` returns. One iteration, no retry                                                                                                | **correct** |
| "an absent seam on an (app) route" | `persistence.ts:71-73`; `VAULT_ROUTE_SEGMENTS` (`persistence.ts:35-44`) mirrors the `(app)` route dirs, and `tests/unit/e2e-harness/vault-route-segments.test.ts` holds the two in step | **correct** |
| "…it retries"                      | `persistence.ts:74-77` returns non-null; `:92-93` `break`-guards then `waitForTimeout(BARRIER_RETRY_DELAY_MS)` = **50 ms**                                                              | **correct** |
| "until the seam appears"           | `persistence.ts:70-71` — a non-null seam leaves the absent branch for the `try` at `:79`                                                                                                | **correct** |
| "or the page leaves those routes"  | `persistence.ts:73` — `if (!vaultRouteSegments.includes(path.split("/")[1])) return null;`                                                                                              | **correct** |

**Live corroboration of the off-route exit**, MEASURED in a real browser during the §4 checkpoint. I
evaluated the exact `:73` predicate on the running app at `/unlock`:

```
{"pathname":"/unlock","segment":"unlock","onVaultRoute":false,
 "seamPresent":false,"barrierWouldReturnNullAtLine73":true}
```

So the exit the clause names second is reachable end-to-end in a live page, not merely readable in
source. This is the exit `reviews/P20B-review-12.md` §6 measured all three absent-seam entries
taking.

## 3. Verification gates — run by me, in my own worktree at `9dba9c0`

| Gate                                                                        | Result — all MEASURED                                                                       | Log                 |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------- |
| `pnpm install --frozen-lockfile`                                            | exit 0                                                                                      | `install.log`       |
| `pnpm typecheck`                                                            | **clean, exit 0**                                                                           | `typecheck.log`     |
| `pnpm lint`                                                                 | **0 errors, 1 warning** — pre-existing `TransactionTable.tsx:459:25`, not in the diff       | `lint.log`          |
| `pnpm exec oxfmt --check tests/e2e/passkey.spec.ts`                         | **"All matched files use the correct format", exit 0** — scoped, never a bare `pnpm format` | `format-scoped.log` |
| `env -u CI pnpm test`                                                       | **1 failed / 131 passed (132 files); 1 failed / 2491 passed / 2 skipped**, exit 1           | `unit1.log`         |
| `env -u CI pnpm exec playwright test tests/e2e/passkey.spec.ts --retries=0` | **12 passed, exit 0, 0 failure markers**                                                    | `e2e-passkey.log`   |

### 3.1 The one red, reported rather than dismissed — and why it is not attributable

MEASURED, `unit1.log`: `tests/unit/import/duplicates.test.ts:749` failed —
`AssertionError: expected 4.410539499265076 to be less than 4`, the wall-clock ratio assertion in
_"scales linearly with input size (O(n+m) complexity)"_. Load average at launch was `1.01`.
`realtime-origin-controls.test.ts` **passed** this run.

I do not dismiss this as "not caused by the implementation" on plausibility. **It is deductively
unattributable**, and I verified the deduction rather than accepting it:

- MEASURED, `vitest.config.ts:12` — `include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"]`.
- MEASURED, the diff's only file is `tests/e2e/passkey.spec.ts`, a **`.spec.ts`**, which that glob
  never matches.
- **Therefore vitest's input is byte-identical at `ce355f1` and `9dba9c0`.** No re-run on the parent
  could show otherwise, and none is needed.

The margin, 4.41 against a threshold of 4, sits with `reviews/P20B-review-12.md` §3.1's 4.13 and
4.18 — the same load-dependent assertion, missing by a similar amount. **This is a pre-existing red
that root already tracks; it belongs to no revision of P20B and I route it, not fix it.**

**Rate note, offered as an observation and not a claim.** The implementer measured this suite fully
green (132/132) and I measured it red on one file. Neither of us is evidence about the other: the
code vitest runs is identical in both trees, so the difference is host load, not tree. **I make no
rate claim from a single run** — this goal's own record holds that cross-campaign rate comparisons
support nothing. The dispatch's expectation of "red more often than not" is consistent with what I
saw; one observation cannot sharpen it.

### 3.2 E2E, and what my run does and does not buy

MEASURED: `tests/e2e/passkey.spec.ts` at `--retries=0`, **12 passed in 1.3m**, failure markers
counted with Playwright's own numbered-list pattern `grep -cE '^ +[0-9]+\) '` → **0**. Protocol:
`env -u CI`, the repository's **unmodified** `playwright.config.ts` on `:3000`, no port override, no
`--debug`/`--ui`/`--headed`/`show`. Run from my worktree after my dev server was down, so
Playwright's own `webServer` (`reuseExistingServer: false`) could bind `:3000`.

Digest `a5862da1846536f4ff845c9be80f7cd7` **before and after** the run, MEASURED in the worktree the
run used — no tree drift mid-measurement.

**Stated plainly: this buys that the edited file still parses and its 12 tests are green on this
tree. It is not evidence about the fix**, because per §1 no execution can distinguish the two trees.

The **1-in-315 flake** at `passkey.spec.ts:162` (numbering at `d80f0e4`) did not reproduce in my 12
executions. Known, unowned, **not mine and not this revision's**.

## 4. Manual `playwright-cli` checkpoint — performed, not skipped

Pre-authorized by the dispatch. I ran `pnpm dev -p 3000` from **my worktree** (`dev.log`:
`Ready in 248ms`, and it stayed up — the Next 16 project-directory dev lock only kills a server
started from the shared checkout, which is why working outside the repo is what makes this
possible). Session `rev13rev`, non-persistent.

MEASURED:

| Step                                        | Result                                                               |
| ------------------------------------------- | -------------------------------------------------------------------- |
| `open http://localhost:3000`                | 200, title _MoneyFlow — categorise and allocate shared transactions_ |
| `goto /unlock`                              | 200, page renders                                                    |
| `eval` of the `persistence.ts:73` predicate | see §2 — off-route exit confirmed live                               |
| `reload` (persistence)                      | `/unlock` re-renders                                                 |
| `console error`                             | **0 errors, 0 warnings** (2 informational: React DevTools, HMR)      |
| `requests --static`                         | **0 non-2xx** across 83 requests                                     |
| `close` + `delete-data`                     | done; browser closed, no user data retained                          |

**What this checkpoint can and cannot establish, stated rather than dressed up.** With zero
executable changed lines it **cannot** distinguish this tree from its parent, and I do not present
it as doing so. What it does establish is non-vacuous and I chose it for that reason: the §2 `eval`
puts the clause's second exit under live observation rather than leaving both exits as source
reading. Naming the rest vacuous is correct; I did not manufacture evidence for it.

## 5. Proportionality — no full-suite campaign, and I can say why

I ran none, deliberately, and I can state what one would establish that the parent's campaigns did
not: **nothing.** §1 measures zero executable changed lines, so a campaign could only re-measure the
suite's background flake rate — a property of a tree already measured, and one this goal's own
record holds cannot be compared across campaigns. `reviews/P20B-review-12.md` §5 judged the
identical argument sound for revision 12; I reach the same conclusion independently, on the same
zero-executable-lines premise that I re-derived myself in §1.

## 6. The judgement root asked for — the deliberate divergence from §7's suggested wording

**I agree with root that the divergence is an improvement, and my grounds are independent of
root's.**

`reviews/P20B-review-12.md` §7's suggested closing was _"and where the seam is not yet installed it
retries until it is — which is why that branch stays."_ That names **one** exit, the seam appearing.
MEASURED in `reviews/P20B-review-12.md` §6, **all three** absent-seam entries at this line
terminated by the **other** exit — the off-`(app)`-route escape, on `/unlock`, at 110/112/283 ms.
`reviews/P20B-review-11.md` §6 independently measured the same class at 4 of 12.

So the suggested wording would have named the exit that was **never observed at this site** and
omitted the one that was **always taken** — replacing one incomplete clause with a differently
incomplete one. The committed clause names both. That is a substantive correction of the review's
suggestion, not a stylistic departure, and the implementer stated its grounds
(`evidence/P20B/implementation-14.md` §1.1) rather than diverging silently.

**Does the committed clause satisfy §7's two conditions? Yes, both, literally.**

1. **No-op scoped to the `no-active-vault` outcome.** "where the seam reports no active vault it
   resolves as a no-op." The clause no longer says "no vault is mounted" — the phrase that invited
   the unscoped reading — and it now paraphrases the seam's own outcome literal, which
   `local-persistence-seam.ts:66` returns verbatim as `"no-active-vault"`. §7's own fairness
   paragraph noted the old clause was true only under a narrow reading requiring the reader to
   already know the seam's vocabulary; **the new clause supplies that vocabulary in-line.**
2. **The absent case is not presented as free.** "but an absent seam on an (app) route is **not** a
   no-op — it retries…, which is why that branch stays." This is the opposite of free, and it names
   the consequence F12-1 was protecting: a future author is now told, at the call site, why the
   retry branch must not be simplified away. Given the branch is load-bearing on three independent
   datasets, that is the sentence that matters.

**Second-order property worth recording:** the clause makes no reference to any run and carries no
`§` citation (MEASURED, §1.2), so unlike the text it replaces it **cannot be falsified by a
re-measurement**. Every prior P20B failure in this comment has been a claim that measurement moved
under. This clause is structurally immune to that failure mode. I regard that as the strongest
argument for the divergence and I did not see it stated as such in the evidence.

## 7. Findings

### 7.1 Findings — **none**

I found no Medium or High issue. F12-1 is resolved by the criteria its own author set.

### 7.2 Flag — a **third** exit exists and the clause does not name it

**Flag, not a finding. I am below 90% confident this requires a change**, and I would not fail a
revision on it. Root asked directly whether the two-exit account is complete, so I answer directly:
**it is not.**

MEASURED by reading `persistence.ts` at `9dba9c0`, the absent-seam-on-`(app)`-route state has
**three** ways out, not two:

1. the seam appears — `:70-71`. **Named.**
2. the page leaves the `(app)` routes — `:73` returns `null`. **Named.**
3. **the 15,000 ms budget expires** — `:92` `if (Date.now() >= deadline) break;` falls through to
   the `throw` at `:96-98`. **Not named.**

Strictly, _"it retries until the seam appears or the page leaves those routes"_ implies the loop
continues until one of the two occurs. If neither occurs it does not: it stops at
`BARRIER_BUDGET_MS` (`persistence.ts:23`, `15_000`) and throws.

**Why I nonetheless flag rather than find it, with the reasoning shown because root asked:**

- **The direction of the error is benign.** The unnamed exit is a _safety_ property — bounded, loud
  failure. A reader misled by the omission over-estimates the loop's patience; they do not
  under-estimate its danger. F12-1's harm model was a reader who believes the absent case is free
  and deletes the retry branch, and the committed clause blocks that completely.
- **Exit-completeness was not part of the fix criteria.** §7 required only (a) and (b), both met.
  And §7's own suggested wording named **one** exit and likewise omitted the throw — so the reviewer
  who raised F12-1 plainly did not treat the throw as part of the remedy.
- **The omitted fact is documented where its contract lives.** `persistence.ts:55-56` names the
  silent-no-op failure the helper exists to prevent and `:58-60` names the loud failure once the
  budget expires. The passkey comment is a **call-site** comment, not the helper's contract, and it
  is already the longest comment in the file.

**If root wants it closed**, the minimal change is to append the third exit to the same sentence —
e.g. _"…or the page leaves those routes, and it fails loudly if neither happens before the budget
expires."_ That stays a source-property claim, adds no count and no citation. **I do not recommend
reopening the revision for it**; it would be better folded into any future edit of this comment. Its
one genuine merit is that `reviews/P20B-review-10.md` §4.4 identified precisely that 15-second hang
as _the_ hazard of barriering a site where the seam can be genuinely absent, and this call site is
that site.

## 8. Scope, hygiene and security

- **`reviews/P20B-review-13.md` is my only write.** I committed nothing. MEASURED,
  `git status --porcelain -- src tests` in the shared checkout is **empty** before and after my
  work.
- **No `git stash`, no `git checkout --`, no `git add -A`** — anywhere, in any tree.
- **No database command of any kind.** No `db:reset`, no migration, nothing destructive.
- **`:3001` never touched.** MEASURED after all my work: `:3001` still LISTEN; pid **818156** and
  pid **818182** both alive with `readlink /proc/<pid>/cwd` = `/home/ben-agents/Code/moneyflow`.
  Both the listener and its parent are intact.
- **My own dev server, cleaned up by verified pid.** SIGTERM to the launched pid did **not** release
  `:3000` — the `next-server` child outlived its parent. I enumerated candidates, kept only the five
  whose `/proc/<pid>/cwd` was `/tmp/mf-p20b-rev13-review` (1150191, 1150208, 1150353, 1150360,
  1150371), SIGKILLed those, and **confirmed release from `ss -ltn` state, not from the kill's exit
  code**: `:3000` released, `:3001` still listening, zero residual processes with my worktree cwd.
  **No bare `pkill -f` at any point.**
- Worktree built with `git worktree add --detach 9dba9c0` plus a copy of the untracked `.env.local`
  and a fresh `pnpm install --frozen-lockfile`. **`node_modules` was never copied and never
  symlinked.** Placed in `/tmp` (MEASURED at start: `df -i /tmp` **21% used, 838457 IFree** — the
  exhaustion `reviews/P20B-review-12.md` §8 reported has cleared, corroborating
  `evidence/P20B/implementation-14.md` §6 item 5). **Removed at handback.**
- `oxfmt` was scoped to the single file under review. **No bare `pnpm format` was run**, so no
  `specs/**` file was reflowed.

### 8.1 Security — `RISKS.md#R-SNAPSHOT-PHRASE-01`, scanned before reading anything

MEASURED: **zero `error-context.md` artifacts** were produced (consistent with zero E2E failures).
Six artifact files existed in total. I scanned **all** of them for **both** hazard shapes **before**
reading any of them:

- **12-word lowercase run** → **1 file matched.**
- **single lowercase token of 40+ characters** → **0 files matched.**

I ran down the one match rather than waving it off. It is in
`.playwright-cli/page-2026-08-03T10-48-38-303Z.yml` — the accessibility snapshot of the **landing
page** `/` from my own checkpoint — at line 57, inside a `definition` element. Three independent
reasons it is a false positive on marketing prose, established **without echoing the field**:

1. MEASURED, the snapshot contains **zero `textbox` roles** — a role census of the whole file yields
   only `generic`, `banner`, `navigation`, `main`, `contentinfo`, `heading`, `paragraph`, `link`,
   `list`, `listitem`, `term`, `definition`. There is no credential field on the page at all.
2. The match sits in a `term`/`definition` pair — the landing page's feature/FAQ definition list.
   The file's 8 hits for `recovery|phrase` are the page **describing** the recovery-phrase feature.
3. **No phrase existed in that browser context to leak.** I visited only `/` and `/unlock`, never
   `/new-user`, and created no account, so none was ever generated.

**I echo, quote and commit no credential field anywhere — not in this file, not in any message.**
The artifacts live in my worktree and are removed with it.

## 9. Question proposals

### Q-PROPOSAL-P20B-13-1 — Should a call-site comment name a helper's failure exit, or only its success exits?

Raised by §7.2 and deliberately scoped narrower than that flag. The committed clause enumerates the
two ways the absent-seam branch **succeeds** and omits the one way it **fails** (`persistence.ts:92`
→ `:96-98`, the 15,000 ms throw). I judged that acceptable at this site because the helper's own
docstring carries the failure contract at `persistence.ts:55-60`.

But this comment is not the last one this goal will write about a barriered site, and the same
choice will recur. The question for root: **is the standard "a call-site comment states what the
barrier does for this site, and the helper's docstring owns its failure contract", or "any
enumeration of exits in any comment must be exhaustive"?** Settling it once would stop the next
revision re-deciding it, and would tell a future reviewer whether §7.2's class is a finding or a
flag. I propose the first, but I hold it weakly.

**I resolve `Q-P20B-33` in neither direction** — whether that barrier is vacuous for entries racing
the redirect is open, unassigned, and untouched by this revision or by me. The new clause describes
only **how** the branch terminates, not **whether** terminating that way obtains a durability
guarantee. I note only that §7.2 and `Q-P20B-33` bear on the same three lines of the helper, so
whoever picks up `Q-P20B-33` should read §7.2 first.

---

## Verdict

**PASS.** No findings.

The revision does exactly one thing and does it correctly: it replaces the clause F12-1 named, and
nothing else. MEASURED — one commit, one file, 3 insertions and 1 deletion, **zero non-comment diff
lines**, the other four clauses byte-identical (md5 `cf88257ee624cb8bcefb5830474f57f4`), no barrier
moved, no `src` change, no count, no new citation, no crash-safety claim and the "at least fifteen"
bound untouched. Both source citations verified against `persistence.ts` and
`local-persistence-seam.ts` at `9dba9c0`, and the off-route exit corroborated live in a browser
(§2). Typecheck clean, lint 0 errors, format clean on the changed file, 12/12 E2E green with digest
stable across the run.

The one unit red (`duplicates.test.ts:749`, ratio 4.41 vs threshold 4) is reported, not dismissed,
and is **deductively unattributable**: `vitest.config.ts:12` never loads a `.spec.ts`, so the unit
suite's input is byte-identical across the two trees (§3.1). It is root's pre-existing item.

**The divergence from §7's suggested wording is an improvement (§6)** — the suggestion named the one
exit never observed at this site and omitted the one always taken, and the committed clause is a
source-property claim that cannot decay under re-measurement.

**One flag for root (§7.2):** a third exit exists — the 15,000 ms budget expiring into a throw at
`persistence.ts:92`/`:96-98` — and the clause names only the two success exits. The direction of
that error is benign and exit-completeness was not among §7's fix criteria, so **I do not recommend
reopening the revision**; fold it into any future edit of this comment.
