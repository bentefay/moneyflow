# P20B revision 13 — implementation evidence

- **Implementer:** `p20b-implementer-13`. Distinct from `p20b-implementer-07` … `-12`.
- **Date:** 2026-08-03.
- **Deliverable:** the single clause named by **F12-1** of `reviews/P20B-review-12.md` §7. Nothing
  else was reopened and nothing else was touched.

**Reading convention.** Every claim is tagged **MEASURED** — I ran the command in this session and
report its output — or **INFERRED**. A bare `§` points at a section of **this** file; every
reference to another document names that document first.

**Line-number convention.** `passkey.spec.ts:NNN` is ambiguous across this change, because the fix
adds two comment lines. **Every such number below names its tree explicitly.** The reviewed
predecessor tree is `d80f0e4`; my tree is `9dba9c0`. `persistence.ts:NNN` and
`local-persistence-seam.ts:NNN` are identical in both trees — MEASURED, neither file is in my diff.

---

## 0. Range, tree and digest — re-derived, not carried from any document

| Item                                                 | Value — all MEASURED                                                                                                   |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **BASE** (`git rev-parse HEAD` before my first edit) | **`ce355f1c2d37657bdc887f24bbc422e0e972d059`**                                                                         |
| **HEAD** (my commit)                                 | **`9dba9c029e09f5dc077079b9d9cfdd072265e359`**                                                                         |
| `git diff --name-only d80f0e4..ce355f1 -- src tests` | **empty** — BASE carries no `src`/`tests` drift from the reviewed tree                                                 |
| `git show --name-only --format= 9dba9c0`             | **`tests/e2e/passkey.spec.ts`**, and nothing else                                                                      |
| `git show --stat 9dba9c0`                            | 1 file changed, **3 insertions, 1 deletion**                                                                           |
| Tree digest at `9dba9c0`                             | **`a5862da1846536f4ff845c9be80f7cd7`**                                                                                 |
| Digest command                                       | `find src tests/e2e -type f \( -name '*.ts' -o -name '*.tsx' \) \| sort \| xargs md5sum \| awk '{print $1}' \| md5sum` |

The digest differs from `evidence/P20B/implementation-13.md` §0's `59ded0a21ad08d3ed53f596eb0789915`
because my comment is inside `tests/e2e/passkey.spec.ts`, which the command hashes. **INFERRED, and
it is a deduction rather than a hedge:** that difference is what shows the digest discriminates the
one file I changed, so a digest held constant across a run is meaningful drift evidence.

Logs are at `/home/ben-agents/p20b-rev13-logs/`, **outside the repository**. My worktree is
`/home/ben-agents/mf-p20b-rev13`, **also outside the repository** — so no ESLint-ignore leakage and
no Next 16 dev-lock collision with the shared checkout.

## 1. The change — one clause of one comment

**File:** `tests/e2e/passkey.spec.ts`, the comment on `unlockWithPasskey`. At `d80f0e4` that comment
occupied `:60-65` and annotated the `awaitVaultPersistence(page)` call at `:66`; at `9dba9c0` it
occupies **`:60-67`** and annotates the same call, now at **`:68`**. MEASURED by reading both trees.

**Old text of the changed clause** — `passkey.spec.ts:64-65` at `d80f0e4`:

```
// ... The barrier is in the helper so the live
// case is covered on all four; where no vault is mounted it resolves as a no-op.
```

**New text** — `passkey.spec.ts:64-67` at `9dba9c0`:

```
// ... The barrier is in the helper so the live
// case is covered on all four; where the seam reports no active vault it resolves as a no-op,
// but an absent seam on an (app) route is not a no-op — it retries until the seam appears or
// the page leaves those routes, which is why that branch stays.
```

The comment's other four clauses are **unchanged, byte for byte** — `reviews/P20B-review-12.md` §7
verified each against source or against the artifacts it cites, and I reopened none of them.

### 1.1 Why this wording, and what it does and does not claim

`reviews/P20B-review-12.md` §7 requires (a) the no-op be scoped to the `no-active-vault` outcome and
(b) the absent-seam case not be presented as free. Both hold literally in the new text.

I adopted the reviewer's structure but **not** its verbatim closing — the suggested "it retries
until it is [installed]" names only one of the two ways that branch terminates, and MEASURED in
`reviews/P20B-review-12.md` §6 all three absent-seam entries at this line terminated by the
**other** way, the off-`(app)`-route escape, on `/unlock`. Writing "retries until it is installed"
would have replaced one incomplete clause with another. The committed text names both exits.

**The new clause is a statement about the helper's source, not about any run**, which is why it
carries no citation and cannot decay with a re-measurement. Both exits are readable in
`tests/e2e/helpers/persistence.ts`, MEASURED at `9dba9c0` and identical at `d80f0e4`:

- **the off-route exit** — `persistence.ts:73`,
  `if (!vaultRouteSegments.includes(path.split("/")[1])) return null;`
- **the retry** — `persistence.ts:74-77` returns a non-null failure on an `(app)` route, and
  `:92-93` sleeps and loops rather than returning
- **the `no-active-vault` no-op** — the seam returns that literal without throwing
  (`src/lib/sync/local-persistence-seam.ts`, the `readActiveManager() == null` branch), and
  `persistence.ts:79-84` plus `:89` treat any non-throwing return as done

**Nothing prohibited was introduced.** MEASURED by reading the committed text: it issues **no**
number or count, states **no** universal, attributes **no** fixed vault state to any site, and makes
**no** crash-safety claim. The "at least fifteen; the sweep is not complete" bound is untouched. It
adds no `§` reference, so there is no new citation to drift.

## 2. Comment-only — the discriminating check

MEASURED:

```
git show 9dba9c0 -U0 | grep -E '^[+-]' | grep -v '^[+-][+-]' | grep -vE '^[+-]\s*//'
```

→ **zero lines**, grep chain exit 1. Every added and removed line is a `//` line.

**INFERRED, deductively:** `9dba9c0` and its parent compile to the same test program, so **no
execution can distinguish the two trees**. This is the premise of §3.

## 3. Verification — and why this much and no more

| Gate                                                               | Result — all MEASURED                                                                                  | Log                            |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------ |
| `pnpm typecheck`                                                   | **clean**, exit 0, 1 line of output                                                                    | `typecheck.log`                |
| `pnpm lint`                                                        | **0 errors, 1 warning** — pre-existing `TransactionTable.tsx:459:25`, a file not in my diff            | `lint.log`                     |
| `pnpm exec oxfmt --check tests/e2e/passkey.spec.ts`                | **"All matched files use the correct format"**, exit 0 — scoped to my file, never a bare `pnpm format` | —                              |
| `pnpm test`                                                        | **132 files / 2492 passed, 2 skipped, 0 failed**, exit 0                                               | `unit1.log`                    |
| E2E `passkey.spec.ts` + `identity.spec.ts` ×2 at `--repeat-each=3` | **63 passed / 63 passed**, **0 failure markers**, **126 executions**                                   | `e2e-run1.log`, `e2e-run2.log` |

**The unit suite was fully green, including both files the dispatch names as expected failures.** I
ran it once, at load average 0.95, **before** starting any E2E and with no campaign of my own
running beside it. `duplicates.test.ts` and `realtime-origin-controls.test.ts` both passed. I make
**no** claim that this revision fixed them — per §2 vitest's input is byte-identical across the two
trees (MEASURED, `vitest.config.ts` `test.include` is `tests/**/*.test.ts(x)`, and my one changed
file is a `.spec.ts` vitest never loads). **INFERRED:** a quiet host is the difference, which is
consistent with `reviews/P20B-review-12.md` §3.1 recording `duplicates.test.ts` failing a wall-clock
ratio assertion by margins of 4.13 and 4.18 against a threshold of 4.

**E2E protocol.** `env -u CI`, `--retries=0`, `--reporter=line`, the repository's **unmodified**
`playwright.config.ts` on `:3000` with **no port override**, no `--debug`/`--ui`/`--headed`/`show`.
Run from my worktree so Playwright's own `webServer` (`reuseExistingServer: false`) could bind
`:3000` without hitting Next 16's project-directory dev lock. Failure markers counted with
`grep -cE '^ +[0-9]+\) '`, not the word "failed".

**Per-arm tally, because `--repeat-each` is per test and not a total** — MEASURED, identical in both
runs: **36 passkey executions** (12 distinct tests × 3) and **27 identity executions** (9 × 3), 21
distinct tests, 63 per run, **126 across the two runs**.

**Tree digest at START and END: `a5862da1846536f4ff845c9be80f7cd7` both times — no drift.** MEASURED
after the second run, in the worktree the runs used.

### 3.1 Why this is proportionate, stated rather than padded

I ran **no full-suite campaign**, deliberately. §2 measures zero executable changed lines, so a
campaign could only re-measure the suite's own background flake rate — a property of a tree the
parent's campaigns already measured, and this goal's own record holds that cross-campaign flake-rate
comparisons support nothing. `reviews/P20B-review-12.md` §5 judged the identical argument **sound on
its merits** for revision 12 and declined to require one. What the two targeted E2E runs do buy is
narrower and worth stating plainly: they confirm the file I edited still parses and that its 21
tests are green on my tree. They are **not** evidence about the fix, because no such evidence can
exist for a comment.

**The 1-in-315 flake at `passkey.spec.ts:162` (numbering at `d80f0e4`)** — the recovery-phrase
`fill()` landing as one space-stripped token — did **not** reproduce in my 126 executions. Reported,
not owned, not fixed, per the dispatch.

## 4. Security — `RISKS.md#R-SNAPSHOT-PHRASE-01`

MEASURED: both runs produced **zero** `error-context.md` artifacts, consistent with zero failures. I
scanned **every** file under `test-results/` and `playwright-report/` for **both** hazard shapes
before reading any of it — a 12-word lowercase run **and** a single lowercase token of 40+
characters, since the concatenated form evades a word-run check: **0 and 0**, across the 1 artifact
file present. I never visited `/new-user` manually and generated no phrase outside the suite. I
echo, quote and commit no credential field anywhere, in this file or in any message.

## 5. Scope and hygiene

- **Authorized paths only.** MEASURED, `git show --name-only --format= 9dba9c0` is
  `tests/e2e/passkey.spec.ts` alone. This evidence file is written and **not committed**, per the
  dispatch. `src/`, `tests/e2e/helpers/` and every other path are untouched; **no barrier was moved,
  added or dropped**, and nothing was redesigned.
- Committed by **listing the single file** in the pathspec. **No** `git stash`, **no**
  `git checkout --`, **no** `git add -A` — in the shared checkout or anywhere.
- **No database command of any kind** — no `db:reset`, no migration, nothing destructive.
- **`:3001` never touched.** MEASURED after all work: `:3001` still LISTEN, owned by pid 818156 with
  `readlink /proc/818156/cwd` = `/home/ben-agents/Code/moneyflow` — the human's server, alive. My
  own dev server exited with Playwright; MEASURED, `:3000` has no listener and no process with a cwd
  under my worktree survives. I ran no bare `pkill -f`.
- Worktree built with `git worktree add` + a copy of the untracked `.env.local` + a fresh
  `pnpm install --frozen-lockfile`. **`node_modules` was never copied and never symlinked.**
- MEASURED at handback: `git status --porcelain -- src tests` in the shared checkout is **empty**.

## 6. For root to transcribe

1. **BASE `ce355f1`, HEAD `9dba9c0`**, one file, 3 insertions and 1 deletion, **zero non-comment
   diff lines**.
2. **Line numbers shifted again.** The `awaitVaultPersistence` call in `unlockWithPasskey` is
   `passkey.spec.ts:66` at `d80f0e4` and **`:68` at `9dba9c0`**; the comment is `:60-65` and
   **`:60-67`** respectively. Any dispatch, review or question text carrying the old numbers should
   be read against `d80f0e4`, not against my tree.
3. **`Q-P20B-33`** — whether the barrier at that site is vacuous for entries that race the redirect
   — is **open, unassigned, and I acted on none of it.** The new clause deliberately describes only
   how the branch terminates, not whether terminating that way obtains a durability guarantee, so it
   does not pre-empt the answer either way.
4. **The unit suite passed 132/132 on a quiet host**, both nominally-expected failures included. If
   root tracks a rate for `realtime-origin-controls.test.ts`, this is one clean observation, not
   evidence of a fix — the code vitest runs is byte-identical to the parent's.
5. `/tmp` inode exhaustion reported in `reviews/P20B-review-12.md` §8 has **cleared**: MEASURED,
   `df -i /tmp` is now **21% used, 838481 free**. My worktree is outside `/tmp` regardless.
