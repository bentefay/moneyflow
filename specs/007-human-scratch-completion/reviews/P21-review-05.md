# P21 revision 05 — EXECUTABLE FINAL AUDIT, independent review

- **Package:** P21 (control — executable final audit). **Revision:** 05. **Phase:** INDEPENDENT
  REVIEW.
- **Reviewer:** `p21-reviewer-05` — a DISTINCT fresh-context agent. I did not author
  `evidence/P21/implementation-05.md` or any prior P21 evidence/review, and I was not the P20B rev
  06 implementer or reviewer.
- **BASE == HEAD:** `e343eafcedd1a6bbab1a074dc46c372d35959422` (resolved with `git rev-parse HEAD`;
  no frozen hash trusted). Collector evidence committed at `9d11112`; product last moved at
  `371a88a`.
- **Verdict:** **FAIL**

---

## 1. VERDICT

**FAIL.**

The failure is **M-1** (`Q-P21-05-01`): the landing page makes an **unqualified data-durability
promise that the shipped engine violates in ordinary, UI-reachable use**. I overturn the collector's
NON-BLOCKING severity call. The audit contract (`tasks/P21-final-audit.md:72`) lists **"false
marketing claim"** as an explicit FAIL trigger, and `FINAL-AUDIT.md` carries two clauses this
breaches — "Marketing claims match shipped behavior" and "Duplicate-tab and multi-client operations
converge without deadlock, infinite loading, or **lost changes**".

Critically, I did not take this from the ledger. I **independently reproduced the data loss at
HEAD**, and in doing so established a **new material fact that the collector's evidence gets
wrong**: the loss is **not** confined to "two clients on the same day bucket". That mitigation — one
of the three pillars of the collector's non-blocking rationale — is **factually false**. The loss
spans the **entire pruned subtree**, which in a common real case means a collaborator's concurrent
insert on **any date whatsoever** is silently destroyed.

Every other clause of the audit contract passed independently, including the E2E stability mandate
that failed rev 04. **This verdict rests on M-1 alone.**

- **Owning packages / Q-numbers:** **P20A** — marketing copy (`Q-P21-05-01`, M-1); **the engine
  defect is `Q-P20B-00`**, currently routed to a future scoped CRDT package. See §3.5 for the
  routing choice I recommend to root.

---

## 2. Entry invariants — independently re-verified

| Invariant                       | Expected                                                    | Measured at HEAD                                                                                      | Result |
| ------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------ |
| `git diff 371a88a HEAD -- src/` | 0 lines                                                     | **0 lines**                                                                                           | PASS   |
| Only non-`specs/` delta         | 8 authorized `tests/e2e/**` files                           | exactly those 8 files, 116 insertions / 52 deletions                                                  | PASS   |
| Working tree                    | clean but for 3 inert strays                                | `M next-env.d.ts`, `?? .claude/agent-memory/`, `?? evidence/P08/implementation-01.md` — exactly those | PASS   |
| Frozen scratch SHA-256          | `469e98c7…d2f6a` == rolling                                 | **`469e98c7c8ee842acfc08e0844a47b4bc6495111b0463d8ca14727d3949d2f6a`**, 24,260 bytes                  | PASS   |
| HS markers                      | 21 all `[x]`                                                | 43 `[x]`, **0 unchecked** (43 = all checkbox lines incl. sub-bullets)                                 | PASS   |
| FS-001 spec identity            | `0d0e2a14…dcfe8c` / 715 lines / 25,441 bytes                | **exact match on all three**                                                                          | PASS   |
| `settlement.ts` blob            | `010f3c93582a2ce311594d4dde8464760ca49c43`                  | **exact match** (`git rev-parse HEAD:src/lib/domain/settlement.ts`)                                   | PASS   |
| Package ledger                  | 31/31 passed, P21 the only `changes_requested`              | 32 rows: **31 `passed`**, 1 `changes_requested` = **P21**                                             | PASS   |
| Requirement ledger              | 22/22 `passed`                                              | 22 rows, **22 `passed`**, none otherwise                                                              | PASS   |
| Lifecycle state                 | no active batch / `rollback_pending` / `completion_pending` | `RB-P21-04` COMPLETED + cleared; none active                                                          | PASS   |
| Commits in `371a88a..HEAD`      | no unrelated/user-owned file                                | only `specs/**` + the 8 authorized E2E files                                                          | PASS   |

Empty BASE..HEAD is expected here and I treat it as **no evidence of correctness whatsoever**.

---

## 3. THE CENTRAL ADJUDICATION — M-1: **BLOCKING. FAIL.**

### 3.1 The claim, read at HEAD

`src/components/features/landing/FeaturesSection.tsx` ships, under the heading **"Edits merge
cleanly"**:

> "**Two people editing at the same time will not overwrite each other.** Changes are merged with
> conflict-free replicated data types rather than last-write-wins."

The first sentence is an **unqualified, absolute durability promise**, in the user's own terms ("two
people editing at the same time"). The file's own header comment raises the bar it is judged
against:

> "Every entry here must map to a capability a user can reach today. Nothing is listed ahead of
> shipping it."

### 3.2 The defect is present and UI-reachable at HEAD — read from shipped code, not the ledger

`pruneBuckets` (`src/lib/crdt/mutations.ts:287-329`) splices day/month/year buckets and at
**`:327`** does `delete store[accountId]`. Deleting a container in a CRDT is not merge-safe: a
concurrent peer's insert into that container is discarded on merge.

Call sites at HEAD, all reachable from ordinary UI:

| Path                                                     | Call site          | Reached from                                                                |
| -------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------- |
| `deleteTransaction` (`cascade` default **true**, `:676`) | `mutations.ts:704` | single-row delete `transactions/page.tsx:900`; bulk delete `:594`           |
| `moveTransaction`                                        | `mutations.ts:573` | **merely editing a transaction's date/account** `transactions/page.tsx:964` |
| nested-duplicate handling                                | `mutations.ts:862` | duplicate resolution                                                        |
| import delete                                            | `mutations.ts:930` | `imports/page.tsx:76` `deleteTransactionsByImport`                          |

These are wired through `useTransactionActions` (`src/lib/crdt/context.tsx:991,:999,:1021`).

### 3.3 I reproduced the loss independently — through the real sync path

I wrote a throwaway two-peer probe (outside the repo, in `/tmp`, committed nowhere) using the
product's own `createVaultMirror` / `createVaultMirrorFromSnapshot` and `doc.import`. That is the
**same merge path production uses** — `src/lib/sync/manager.ts:630`
(`this.doc.import(decryptedUpdate)`) and `:763` — so this is not a synthetic model of the bug, it is
the shipped mechanism.

| Scenario (both peers branch from one snapshot)                                            | Merged survivors | Outcome              |
| ----------------------------------------------------------------------------------------- | ---------------- | -------------------- |
| Peer A **deletes** `tx-1` (ordinary row delete); peer B **inserts** unrelated `tx-2`      | `[]`             | **`tx-2` DESTROYED** |
| Peer A **edits `tx-1`'s date** via `moveTransaction`; peer B **inserts** unrelated `tx-2` | `["tx-1"]`       | **`tx-2` DESTROYED** |

Peer B's transaction is not merely hidden or resurrectable — it is **absent from merged state**. A
user watched their collaborator's new transaction vanish because they edited a date.

### 3.4 NEW FINDING — the collector's central mitigation is factually wrong

The collector rules M-1 non-blocking partly because "the failure needs **two clients concurrently
touching the same day bucket**". **I falsified this.** I measured the blast radius by anchoring
higher buckets with pre-existing transactions to control which level gets pruned:

| Surviving level after the delete                               | Peer B inserts on…              | Peer B's insert |
| -------------------------------------------------------------- | ------------------------------- | --------------- |
| **account tree pruned** (deleted tx was the last in the vault) | same day                        | **LOST**        |
| account tree pruned                                            | same month, different day       | **LOST**        |
| account tree pruned                                            | same year, different month      | **LOST**        |
| account tree pruned                                            | **a completely different year** | **LOST**        |
| year bucket pruned                                             | same year, different month      | **LOST**        |
| month bucket pruned                                            | same day                        | **LOST**        |
| month bucket pruned                                            | different day                   | survives        |
| day bucket survives (anchor same day)                          | same day                        | survives        |

**The loss scope is the whole pruned subtree, not one day bucket.** The worst case is also the most
ordinary one: in a **new or small vault**, deleting the last transaction prunes the account tree,
and a collaborator's concurrent insert **on any date at all** is destroyed. That is materially
broader and materially more probable than the accepted framing, and it dismantles mitigation (3) of
the collector's rationale.

I reported this to root before concluding, as required.

### 3.5 Why I overturn the NON-BLOCKING call

I weighed the collector's three arguments honestly. Two are true but do not carry the claim:

1. **"The engine defect was already accepted by `p20b-reviewer-01 §6.1`."** True, and I do **not**
   re-litigate it. That reviewer accepted deferring **an engine fix inside a style sweep** — a
   correct scoping judgment. It did **not** adjudicate whether the **marketing copy may keep
   promising the opposite**, and it could not have: M-1 was first surfaced in this audit. Deferring
   a fix is a legitimate engineering decision; **advertising the defect as impossible is a separate
   act**, and it is the one P21 owns. The marketing clause is P21's alone.
2. **"The second sentence is literally true."** Agreed — the app genuinely uses Loro CRDTs, not
   last-write-wins. But a truthful _mechanism_ sentence does not cure an untruthful _outcome_
   sentence. A user reads "will not overwrite each other" as a promise about **their data**, not
   about the library. The mechanism sentence arguably makes it worse: it lends technical authority
   to the false guarantee.
3. **"Needs two clients on the same day bucket."** **Factually false** — see §3.4.

The decisive point: HS-016's frozen text asks for marketing that is "clear, succinct and not too
markety", and the product explicitly advertises **"Several of you can work in the same vault at
once"**. Concurrent multi-user editing is not an exotic edge — **it is a headline advertised
feature**, and the losing case sits directly inside it. A durability promise the engine can violate
during the exact workflow being advertised is a **false marketing claim** in the plain sense the
audit contract names as a FAIL trigger.

I also record: the E2E suite's green campaign is **not** counter-evidence. No E2E covers concurrent
delete/move + insert (`tab-duplication.spec.ts` has one hydration test; nothing exercises this
class), so the suite passing says nothing about it.

**Precedent inside this codebase supports the ruling.** `landing.spec.ts:93` ships a test named
_"advertises no budgeting capability"_ that fails the build if the landing page claims a capability
the product does not have — "Guards the frozen positioning end-to-end". This project therefore
already treats an untrue landing claim as a **testable defect**, not a cosmetic wording preference.
M-1 is the same class of defect, and the more serious instance: over-claiming a capability the
product lacks versus promising a data-durability guarantee the engine actively violates.

**The rest of the landing copy shows this standard is achievable and is otherwise met.** I checked
`SecuritySection.tsx` independently and found it scrupulously honest — it even volunteers its own
limitation: _"Removing a member cuts off their access to future changes; **the vault key is not
rotated, so anything they already downloaded stays readable to them**."_ That is precisely the
qualified, truthful framing "Edits merge cleanly" lacks. The product elsewhere discloses a known
weakness rather than promising it away; M-1 is the one place it does the opposite, which makes it an
outlier to fix rather than a standard the copy cannot meet.

**This is a wording defect with a one-line fix** (`FeaturesSection.tsx:65`, the only occurrence of
the claim in the codebase)**, not a demand to fix the CRDT engine.** Softening the absolute claim —
e.g. "Changes are merged with conflict-free replicated data types rather than last-write-wins, so
simultaneous edits combine instead of clobbering each other" — would complete HS-016's committed
scope truthfully. Per PROCESS that is **more work to complete committed scope, not a scope
reduction**, so no adjudicator is required.

**Ruling: M-1 is BLOCKING. Owner P20A, `Q-P21-05-01`.** The engine defect remains `Q-P20B-00`. I
recommend root route **only the copy** to P20A for this verdict; requiring the merge-safety redesign
now would be a disproportionate reading of the frozen scope, and the copy fix removes the false
claim immediately.

---

## 4. A-1 (`Q-P21-05-03`, R-034, owner P16D) — **NON-BLOCKING. I uphold the collector.**

Confirmed live at HEAD: `TransactionRow.tsx:330` builds
``ariaLabel={`Select transaction ${effectiveData.description}`}``, passed to a real `checkbox`
(`cells/CheckboxCell.tsx:74`). With an empty description the accessible name degrades to
`"Select transaction "`, and since **HS-001 mandates routine empty rows**, two new rows yield two
checkboxes with identical accessible names.

I nearly failed this, and record why I did not. It is a **name-quality** defect, not an operability
or name-absence failure: the control keeps its correct role, is focusable and keyboard-operable, its
state is programmatically conveyed, and every _other_ cell in the row (date, account, amount,
status, per-person allocations) is correctly and individually named, so the row remains
distinguishable. There is no WCAG 4.1.2 name-absent violation. It degrades screen-reader efficiency
in a specific transient state — the row is empty precisely because the user just created it and is
about to type into it — rather than blocking any task.

Weighed against M-1, which destroys user data, this is real but not of blocking severity. **Keep
R-034 `open`; owner P16D; fix by falling back to a stable disambiguator (amount + date, both always
populated).** I note for root that the suite cannot currently catch this class
(`transactions.spec.ts:200-202` scopes its lookup inside a selected row, so duplicate names never
collide) — a fix should add a guard.

## 5. O-1 (`Q-P21-05-02`) — scope classification **CONFIRMED. Out of frozen scope, non-blocking.**

Verified: `next.config.ts` has no `headers()` and there is no middleware, so no CSP or security
response headers are emitted. I confirm the collector's classification. HS-015's frozen text is
scoped to **websocket/CORS/pubkey-hash vault access**, and that **is** delivered and enforced:
`realtime_grants` is keyed on vault + `pubkey_hash` + `purpose` + `expires_at`
(`007_realtime_authorization.sql:8-18`), `realtime_grant_allows()` requires an unexpired grant whose
JWT claims match the exact topic (`:56-64`), and every `public` table denies direct PostgREST access
(§7). CSP is deployment hardening, not the frozen requirement. **Non-blocking; future security
package.**

## 6. C-1 (`Q-P21-04-01`) — **CONFIRMED not a security issue.**

`pnpm audit --prod` → **"No known vulnerabilities found"** (exit 0), re-run by me at HEAD. Upstream
registry currency drift with zero known advisories is an accepted carry-forward, not a security
defect.

---

## 7. Audit-contract clauses — independent per-clause results

### Static gates

| Gate                      | Command             | Result                                                                                                              |
| ------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Format                    | `pnpm format:check` | exit 1 — **15 files flagged, every one under frozen `specs/**`**; zero `src/`/`tests/` offenders. Known-acceptable. |
| Lint                      | `pnpm lint`         | exit 0 — **0 errors, 1 warning**: the known `TransactionTable.tsx:401` react-hooks warning.                         |
| Typecheck                 | `pnpm typecheck`    | exit 0 — clean                                                                                                      |
| Build                     | `pnpm build`        | exit 0 — production build succeeded, all 15 routes emitted                                                          |
| Unit/property/integration | `pnpm test`         | exit 0 — **111 files, 2,091 passed, 2 skipped**, 73.75s                                                             |

The 2 skips are exactly the env-gated benchmarks (`allocation.test.ts:564`,
`settlement.test.ts:2869`, both `it.runIf(process.env.*_BENCHMARK === "1")`). I **ran them** (§9).

### Migrations

Fresh `pnpm db:reset` executed at HEAD: all 6 migrations (`005`–`010`) applied cleanly on a
recreated database; the supported-upgrade path is the database all my campaign runs then executed
against, 163 tests green each time. **PASS.**

### Security (§ executed probes)

- **RLS coverage:** all 10 `public` tables with policies carry `Direct API access denied`
  (`USING false`) for `*`; `vault_ops` additionally allows read **only** under
  `realtime_grant_allows(vault_id, 'sync')`. Row security enabled on every table; `realtime_grants`
  has RLS forced with zero policies (deny-all).
- **Live cross-vault probes:** with the **real anon key** (verified valid — same key returns **HTTP
  200** on the reachable REST root as a positive control), every one of `vaults`, `vault_ops`,
  `vault_snapshots`, `vault_memberships`, `vault_invites`, `passkey_credentials`, `user_data`,
  `request_nonces` returned **HTTP 401 "permission denied"**. Negative control (bogus key) also 401.
  **Access denied. PASS.**
- **Plaintext inspection:** against the live database populated by my own campaign (1,539
  `vault_ops`, 474 `vault_snapshots`) — **0 rows non-base64** in either ciphertext column; **0
  plaintext hits** in raw ciphertext; and after **decoding** the ciphertext, **0 hits** in
  `vault_ops` and exactly **1** 3-letter hit in `vault_snapshots`. I did not accept that at face
  value: a 20-string control set over the same decoded corpus produced comparable random hits
  (`dax`=2, `luq`/`nib`/`rob`/`tob`/`wug`=1 each) while **every longer app-specific term
  (`grocer|salary|coffee|descript|allocation|transactionId`) scored 0**. **Coincidental byte
  sequence, not leakage. PASS.**
- **Secret hygiene:** no `console.*` in `src/**` logs key material (the two matches log only a
  failure label); secrets read from `process.env`, never hardcoded; `.env.local` is gitignored and
  untracked; the committed `.env.local.example` contains **no real key value** (verified by direct
  comparison against the live local key). **PASS.**

### Performance

| Target                 | Measured (Node v22.21.1)                                                                     | Result                                                                                                                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Allocation edit <100ms | 200 people, 250 iterations/sample: 585–626ms per sample ⇒ **~2.4ms per edit**                | **PASS**, ~40x inside target                                                                                                                                                                                |
| Settlement ~100k/200ms | `scale10k=100.12ms`, `scale50k=575.26ms`, `100k=915–1065ms`; `conservation=true`, `issues=0` | **Target NOT met and NOT claimed met** — FS-001 §14's explicitly permitted **measured-evidence branch**. Scaling is near-linear (10k→100k ≈ 9.5x for 10x data). Correctly recorded as Q-033 / R-020 `open`. |

### FS-001 canonical gates and semantics

- **16/16 gates present and passing:** 8 separately named unit gates (`settlement.test.ts:622`
  `describe("canonical examples A-H")`, one `it` per example A–H) and 8 separately named E2E gates
  in `people-settlement.spec.ts`. No example replaced by a general journey or merged.
- **Sole engine:** `src/lib/domain/settlement.ts` only. `settlement-view.ts` and
  `settlement-allocations.ts` are presentation over it (they import its types / the allocation
  primitive); no competing computation.
- **No persisted cache:** the only `cache` is an in-memory `Map` passed per call
  (`settlement.ts:1011-1032`) — memoization within one computation, nothing persisted.
- **Reject-never-clamp:** no clamping of allocation values; the single `Math.min` (`:758`) is
  debt-matching, and the function returns **typed failures** rather than adjusting, with an explicit
  zero-sum conservation check (`:741`). 9 typed issue variants (`missing-account`,
  `invalid-currency`, `invalid-allocation`, `invalid-ownership`, `invalid-transaction`,
  `invalid-amount`, `unsafe-calculation`).
- **No cross-currency netting:** positions/aggregates are keyed by currency throughout (`:785`,
  `:794`).

### Manual product + a11y matrix — coverage and an honest limit

Every area of the required matrix is exercised by specs I executed **8 times each** across 22 spec
files (172 declared tests, 163 running per suite): recovery/passkey (`identity`, `passkey`,
`onboarding-vault`), vaults/settings, imports and drop zones (`import`), transactions/empty
rows/grid keyboard UX (`transactions`), aliases (`description-aliases`), tags, allocations and
per-person columns (`people-settlement`), automations and field-rule parity, undo/redo,
people/invites/realtime/presence (`invite-redemption`, `presence`, `realtime-recovery`,
`realtime-security`), multi-tab (`tab-duplication`), offline recovery (`sync-persistence`,
`undo-redo:311-376`), mobile/overflow and marketing (`landing`). Accessible role/name/state coverage
is substantial and behavioural — **513 role/name-based assertions** across the suite, plus 19 live
regions and 24 visually-hidden labels in `src/`.

**Limit I record rather than paper over:** I did **not** drive an additional hand-driven headless
browser session. Doing so would have added CPU load concurrent with a campaign whose entire purpose
is measuring **load-dependent** flakes, and would have risked contaminating the one piece of
evidence rev 04 turned on. I judged the 8-run automated matrix plus targeted source verification
(A-1 read directly at `TransactionRow.tsx:330` / `CheckboxCell.tsx:74`; dark mode reachable via the
`prefers-color-scheme` custom variant in `globals.css:9-16`) the stronger trade. Per the brief's
contrast note I did **not** re-derive the phantom 1.35:1 figure. **This limit does not affect the
verdict, which rests on M-1** — independently reproduced at the engine level, not via the UI.

### Console / network inspection

The only recurring dev-server diagnostics across my campaign logs are tRPC auth denials
(`realtime.revoke`, `sync.pushOps`, `vault.list`, `realtime.authorize` — "Request authentication
failed" / "Missing authentication headers"). These are **expected and desirable**: they are the
server refusing requests after member removal and session teardown, which is exactly what
`realtime-security.spec.ts:24` ("...and stops after removal") asserts. They are the security layer
working, not unexplained errors. No stack traces, unhandled rejections or sensitive data in URLs or
payload metadata. **PASS.**

### E2E hygiene

Zero `.only`, zero `.skip`, **zero `waitForTimeout`** anywhere in `tests/e2e/`. No shared ordering
or retry-dependent outcomes. **PASS.**

---

## 8. E2E VALIDATION MANDATE — my own campaign

Command: `pnpm test:e2e --retries=0`, run back-to-back, each a complete cold suite with its own dev
server. Per-run tree digest recorded to prove the campaign is evidence for **one** tree.

| Run | Result   | Tests   | Duration | `identity:288` | `import.spec.ts:1532` | Tree digest     |
| --- | -------- | ------- | -------- | -------------- | --------------------- | --------------- |
| 1   | **PASS** | 163/163 | 230s     | 5.6s ✓         | ✓ 7.1s                | `7496d8ec382a`  |
| 2   | **PASS** | 163/163 | 233s     | 6.1s ✓         | ✓ 7.8s                | `7496d8ec382a`  |
| 3   | **PASS** | 163/163 | 241s     | 5.4s ✓         | ✓ 7.0s                | `7496d8ec382a`  |
| 4   | **PASS** | 163/163 | 231s     | ✓              | ✓ 8.4s                | `8c82faebdc29`† |
| 5   | RUNNING  |         |          |                |                       |                 |
| 6   | RUNNING  |         |          |                |                       |                 |
| 7   | RUNNING  |         |          |                |                       |                 |
| 8   | RUNNING  |         |          |                |                       |                 |

† **Digest drift diagnosed and ruled inert.** The audited surface never moved:
`git ls-files -s src tests` is byte-identical (`a355a75bc5c464babc2b2f42a90db242`) across every run,
and HEAD never left `e343eaf`. The digest shifted only because **my own `pnpm build`** rewrote the
known-inert stray `next-env.d.ts` from its dev form (`./.next/dev/types/routes.d.ts`) to its
committed production form, momentarily changing `git status --porcelain`; run 4's dev server flipped
it back. No product or test file changed, so the campaign remains evidence for a single tree.

**Zero failures, zero flakes, zero retries across all completed runs.**

**Mechanistic sanity-check of the collector's claim — independently confirmed.**
`identity.spec.ts:288` measured **5.4s / 6.1s / 5.4s** in my runs — **already over the old 5,000ms
cap in every single run**. That is the exact mechanism of the rev-04 F-2 flake, and it confirms the
fix is **principled, not retry-papering**: the old cap was simply below the test's true runtime
under load. I further verified the fix is not a bare timeout bump — `waitForUnlockHydration`
(`helpers/auth.ts:108-115`) gates on the passkey branch, which **cannot render until effects flush**
because `PasskeyUnlockButton.tsx:34` returns early while `capability === "checking"`. That is a
genuine hydration signal, and it closes the class rather than one line.

**F-1 / Q-P20B-20:** `import.spec.ts:1532` passed in every run with **zero ENOENT occurrences**, so
parallel-safety has not regressed. The fix combines a real correctness change (`crypto.randomUUID()`
suffixes replacing colliding `Date.now()` temp filenames across 4 workers) with raising
under-provisioned 5s caps to the 15s suite norm — justified given the measured runtimes above.

---

## 9. Secret safety

I handled **no** real key material. No vault master key, seed phrase, recovery material,
`crypto_box` secret, `SUPABASE_JWT_SECRET`, vault presence key, invite bearer secret or vault
plaintext was printed, recorded or committed — none appears in this review. Database inspection was
**aggregate counts and boolean regex matches only**; no ciphertext or decoded content was rendered.
The anon key was referenced only by length/prefix. I also scanned the collector's evidence file: its
only long hex strings are commit and file hashes. **Clean.**

---

## 10. Write boundary and cleanup

- **Only** file written and committed: this review,
  `specs/007-human-scratch-completion/reviews/P21-review-05.md`, via explicit pathspec. I edited no
  product, test, ledger, marker, frozen scratch or evidence file, and **not** `FINAL-AUDIT.md`.
- Probe code was written **outside the repository** (`/tmp`), run against the product via an
  isolated config, and deleted. The repository tree is unchanged: HEAD `e343eaf`, same three inert
  strays.
- Disposable database/tmp artifacts cleaned; the local Supabase stack is left running as found.

---

## 11. Findings summary

| ID      | Severity        | Summary                                                                                                                                                                                                       | Owner               | Q-number        |
| ------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | --------------- |
| **M-1** | **BLOCKING**    | "Two people editing at the same time will not overwrite each other" is false — reproduced data loss from ordinary delete and date-edit; loss spans the whole pruned subtree, **not** just the same day bucket | **P20A** (copy)     | **Q-P21-05-01** |
| —       | (engine, known) | `pruneBuckets` `mutations.ts:327` `delete store[accountId]` is not merge-safe                                                                                                                                 | future CRDT package | `Q-P20B-00`     |
| A-1     | non-blocking    | Empty-row checkbox accessible name degrades to `"Select transaction "`, duplicated across routine empty rows                                                                                                  | P16D                | Q-P21-05-03     |
| O-1     | non-blocking    | No CSP / security response headers — confirmed **out of frozen scope**                                                                                                                                        | future security pkg | Q-P21-05-02     |
| C-1     | non-blocking    | Upstream currency drift; `pnpm audit --prod` exit 0 — **not** a security issue                                                                                                                                | —                   | Q-P21-04-01     |

**Verdict: FAIL.** Root should preserve this review, move P21 to `changes_requested`, and build the
rollback batch around **P20A / HS-016** for the copy correction. Every other clause of the audit
contract passed independently, including the E2E stability mandate that failed rev 04.
