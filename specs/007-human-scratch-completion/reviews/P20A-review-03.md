# P20A rev 03 — Independent Review: HS-016 truthful-copy fix (M-1)

**Reviewer:** `p20a-reviewer-03` (distinct, fresh-context; not any P20A implementer) **Commit under
review:** `a823457` — "fix: soften HS-016 landing durability claim to be truthful" **BASE / HEAD at
review:** `git rev-parse HEAD` = `417c47f97d…` (root ledger commit, ≥ required base). `a823457`
confirmed an ancestor of HEAD via `git merge-base --is-ancestor` (guards against a dangling amended
hash).

## VERDICT: PASS

The false, unqualified data-durability absolute at `FeaturesSection.tsx:65` is gone and replaced
with a truthful mechanism-only claim; a non-brittle E2E guard prevents its return; the diff is
minimal, type-safe, secret-free, and touches no ledger/marker/scratch/SCOPE/reviews/engine file. All
verification that is within the fix's scope is green. The one standing `format:check` failure is a
pre-existing frozen-specs condition that `a823457` neither introduced nor is permitted to fix
(details in §4).

---

## Ruling basis (verified from frozen sources, not root's framing)

- **M-1** (`reviews/P21-review-05.md:19-24, 62-149`, `Q-P21-05-01`): the landing copy shipped an
  **unqualified data-durability absolute** — "Two people editing at the same time **will not
  overwrite each other.**" — that the shipped engine violates in ordinary, UI-reachable use. The
  reviewer measured the blast radius: when a delete prunes the account tree, a concurrent peer's
  insert is **LOST**.
- **Engine cause, re-verified at source:** `pruneBuckets` (`src/lib/crdt/mutations.ts:287-329`)
  executes `delete store[accountId]` at line 327 when an account tree empties; on CRDT merge a
  concurrent peer's insert into that pruned container is discarded — a real lost-write. I read the
  function directly; the claim is accurate.
- **D-019** (`DECISIONS.md:402-412`, upheld by `reviews/P21-scope-adjudication-05.md`, `f290246`):
  the `pruneBuckets` merge-safety redesign (`Q-P20B-00`) is **OUT-OF-GOAL**. The **only** in-goal
  remediation is the truthful-marketing-copy correction at `FeaturesSection.tsx:65`. The fix under
  review is exactly that and nothing more.

---

## Per-criterion findings

### 1. The absolute is gone and the copy is truthful — PASS

`FeaturesSection.tsx:63-65` now reads:

> **Edits merge cleanly** — "Two people can edit at the same time, and their changes are merged with
> conflict-free replicated data types rather than last-write-wins."

- The clause "will not overwrite each other" is removed. The new copy makes **no** zero-lost-data /
  never-overwrites promise — it is not a reworded version of the same guarantee; it describes only
  the merge _mechanism_.
- Every retained claim maps to a delivered, independently-passed capability: "Two people can edit at
  the same time" → real-time collaboration (HS-003, delivered); "merged with CRDTs rather than
  last-write-wins" → the Loro CRDT engine actually ships and is not last-write-wins (delivered
  mechanism). The mechanism sentence is literally true and does not overpromise an _outcome_
  (`P21-review-05:147-149`).
- Heading "Edits merge cleanly" retained: "cleanly" = conflict-free (no merge _conflict_), true by
  CRDT construction; the prune bug is a data-_loss_ defect, not a merge conflict. Defensible.

### 2. Adjacent public claims — PASS (no false-absolute-class claim found)

- `FeaturesSection.tsx:57` "Shared vaults … see who is editing what" — presence is delivered
  (HS-003). Truthful; no durability absolute. Left unchanged, correctly.
- `SecuritySection.tsx:48` "CRDT for conflict-free sync" — conflict-free _merge_ is true by CRDT
  construction; the prune defect is data loss, not a merge conflict. Defensibly true; no false
  absolute. Left unchanged, correctly.
- I did not find any other public claim promising that concurrent edits never overwrite / never lose
  data. No over-scope rewrite of true copy was demanded of the implementer, and none is warranted.

### 3. Test guard adequacy — PASS

New test `tests/e2e/landing.spec.ts:102-110`, "makes no data-durability absolute about concurrent
edits":

- Asserts `getByText(/will not overwrite each other/i).toHaveCount(0)` and
  `getByText(/never overwrite/i).toHaveCount(0)`. The reverted string literally contains "will not
  overwrite each other", so **the test genuinely fails if the exact M-1 absolute returns** (and
  catches the obvious paraphrase). Verified by reasoning against the pre-fix copy.
- Not brittle: it asserts only the _absence_ of the false phrasings and is not coupled to the exact
  retained prose, matching the existing "advertises no budgeting capability" negative-guard
  precedent (`landing.spec.ts:93-100`). Marketing copy stays editable.
- Existing landing tests are unchanged and un-weakened (diff adds a new `test(...)` block only; no
  edits to prior tests). All landing tests pass in both full-suite E2E runs.

### 4. Six checks — real output (see §Verification below)

`typecheck`, `lint`, `test` (unit), and **two consecutive full-suite `--retries=0` E2E runs** all
PASS. `format:check` fails, but exclusively on 15 pre-existing frozen `specs/**` markdown files
(including root-owned `specs/human-scratch.md`) — **none** of which are touched by `a823457`, and
**none** of which are the two files under review. The evidence file `a823457` newly added
(`evidence/P20A/implementation-03.md`) is **not** among the flagged files, i.e. the fix introduces
zero new format failures and leaves every file it touches green. Fixing the flagged frozen specs
would require editing root-owned/frozen files the implementer is explicitly barred from touching
(and doing so reflows and corrupts the frozen campaign artifacts). This is a documented standing
condition (D-019-era frozen specs), not a regression from this fix. Non-blocking for this review.

### 5. Type-safety & minimality — PASS

- No `as`, no `any`, no `!` non-null assertion in the product/test diff (grep over the diff: none
  found).
- Diff is minimal: product = the single copy line at `FeaturesSection.tsx:65`; test = the one new
  guard block; plus the new evidence markdown. `git show --stat`: 3 files, +82 / −1.
- No ledger/marker/scratch/SCOPE/reviews/engine file touched by `a823457` (only
  `evidence/P20A/implementation-03.md`, `FeaturesSection.tsx`, `tests/e2e/landing.spec.ts`).

### 6. Secret-safety — PASS (blocking gate clears)

Diff, test, and evidence contain only marketing copy, a negative-assertion E2E test, and prose
evidence. No vault master key, seed phrase, recovery material, `crypto_box`/`SUPABASE_JWT_SECRET`
secret, presence key, invite bearer secret, or vault plaintext. Nothing to redact.

---

## Verification — commands and real output

Run from `/home/ben-agents/Code/moneyflow` (branch `main`, HEAD `417c47f`):

| #   | Command                                | Result                                                             |
| --- | -------------------------------------- | ------------------------------------------------------------------ |
| 1   | `pnpm typecheck`                       | **PASS** (exit 0)                                                  |
| 2   | `pnpm lint`                            | **PASS** (exit 0)                                                  |
| 3   | `pnpm format:check`                    | **FAIL** (exit 1) — pre-existing frozen `specs/**` only; see below |
| 4   | `pnpm test`                            | **PASS** — 111 files, 2091 passed / 2 skipped; 73.29s              |
| 5a  | `pnpm test:e2e -- --retries=0` (run 1) | **PASS** — 164 passed, 0 failed, 0 flaky; 3.9m                     |
| 5b  | `pnpm test:e2e -- --retries=0` (run 2) | **PASS** — 164 passed, 0 failed, 0 flaky; 3.9m                     |

Two consecutive full-suite `--retries=0` E2E runs were clean (no load-dependent flake). No
Playwright `--debug/--ui/--headed/show` used.

`format:check` flagged files (all pre-existing frozen `specs/**`, none under review, none touched by
`a823457`): `DECISIONS.md`, `DEPENDENCIES.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`,
`evidence/P12/implementation-0{3,4,5,6}.md`, `evidence/P14/implementation-01.md`,
`evidence/P16D/implementation-01.md`, `evidence/P19/implementation-01.md`,
`reviews/P12-review-0{5,6}.md`, `specs/human-scratch.md`.

---

## Q-proposals for P21 rev 06 carry-forward

- **Q-P20A-03-01 (carry-forward, informational):** `Q-P20B-00` — the `pruneBuckets` delete-on-empty
  concurrent-insert lost-write — remains a genuine, tracked, OUT-OF-GOAL data-loss risk per D-019.
  This fix makes the marketing copy truthful; it does **not** fix the engine. P21 rev 06 should
  confirm no other shipped surface re-asserts a zero-lost-data absolute, and that the risk stays
  routed to a future scoped CRDT package (not silently closed).
- **Q-P20A-03-02 (process, non-blocking):** the bare `pnpm format:check` failing on frozen
  root-owned `specs/**` is a recurring reviewer-friction point across this campaign. Not actionable
  within HS-016 scope; noted so future audits don't misread it as a regression.

---

**Bottom line:** PASS. The M-1 false absolute is removed, the retained copy is truthful and maps
only to delivered capabilities, the guard test genuinely catches the regression without brittleness,
and the change is minimal, type-safe, and secret-free. Recommend root integrate, re-pass HS-016 via
the §275 forward marker, and re-open P21 rev 06.
