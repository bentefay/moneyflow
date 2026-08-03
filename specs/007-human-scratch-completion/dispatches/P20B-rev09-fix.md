# P20B rev 09 — Component 1 of D-021: E2E harness navigation/durability fidelity — ACTIVE

**Implementer:** `p20b-implementer-09`. Distinct from `p20b-implementer-07`/`-08`, and you are not
the reviewer of any P20B revision.

**BASE:** re-derive with `git rev-parse HEAD`. Do not carry a hash from this file. **The rev 08
implementer amended its final commit** (`5e02607` → `205ca15`) and root quoted the pre-amend hash
before re-deriving; an amended-away hash still resolves via `git show` but is **not an ancestor of
HEAD**.

## Why this revision exists — read D-021 first

`DECISIONS.md` **D-021**, from independent ruling `adjudications/P21-scope-02.md`. A failure class
has blocked P21 through four revisions and **its mechanism is now measured**, in
`evidence/P21/diagnostic-Q-P20B-26.md`:

- A write confirmed by the DOM barrier **is not yet in IndexedDB.** Persistence is downstream and
  async — `subscribeLocalUpdates` enqueues (`manager.ts:292-296`); a queued attempt dynamically
  imports crypto, encrypts, then calls `appendOp` (`:312-345`).
- **A full document teardown in that window discards the queued work and no op row is ever
  created.** MEASURED: 195 runs, 50 losses, **zero counterexamples** — losing runs never grew the op
  count; surviving runs always did.
- **The matched pair that localises it**, byte-identical but for one line, both fired from a
  `MutationObserver` at the instant the barrier text commits: **J1 (sidebar `<a>` click,
  client-side) 0/70 losses; J2 (`location.assign`, full document load) 48/70.**
- Full-teardown rates: `location.assign` 48/70 · `reload()` 21/70 · `page.goto` 17/70 · killed tab
  17/70. **Any delay of a few ms closes the window** (arm G2 0/52).

**MEASURED by the adjudicator, and this is the defect you are fixing:** `tests/e2e/helpers/nav.ts:9-73`
navigates with `page.goto` — a **full document teardown** — at **137 call sites**, while the
product's sidebar is real `next/link` (`src/app/(app)/layout.tsx:63-72`, `:386-389`), so **a real
user's navigation is the client-side transition measured at 0/70.** The frozen mandatory journey's
implementation (`tests/e2e/people-settlement.spec.ts:305-312`, and `:516-519`) puts a full teardown
between frozen step 5 and frozen step 6. **The harness navigates in a way the requirement's user
never does.**

## Two BINDING conditions from D-021 — these come from frozen text, not preference

### 1. It must NOT be a suppression

Deleting, weakening or timing-out the persistence assertions breaches HS-021's contract (which
rejects broad suppressions and test skips) and **would not deliver FS-001 `:705`**. **Frozen step
9's `page.reload()` must survive** — reload-persistence is itself frozen, at FS-001 `:630`, `:649`
and `:706`. The legitimate shapes are:

- **(a)** navigate the way the requirement's user navigates — the real `next/link` sidebar click,
  MEASURED at **0/70**; and/or
- **(b)** give the harness a **durability barrier** before a deliberate teardown.

For (b): **`SyncManager.awaitLocalPersistence()` already exists** at `src/lib/sync/manager.ts:367-377`
and is already called from `vault-provider.tsx:49` and `:232` and from unit/integration tests. **It
is simply not reachable from the E2E harness.** Exposing it through a test seam is explicitly within
P20B's remit per D-021.

### 2. If your fix changes allocation PRODUCT behaviour rather than the harness or a test seam, ownership flips to P16A–E

`PROCESS.md:128-129`. **Changing when the interactive edit path becomes durable is Component 2 and
is OUT-OF-GOAL** (D-021, `RISKS.md#R-LOSTWRITE-01`). If you conclude the only correct fix requires
that, **stop and hand back saying so** rather than making the change — a handback that explains why
the in-goal shapes do not work is a good outcome, and rev 07 and rev 08 both earned credit for
exactly that kind of honesty.

## Explicitly OUT OF SCOPE

- **Component 2 — durability-at-acknowledgement / crash safety.** OUT-OF-GOAL by D-021. Do not fix
  it, do not partially fix it, and **do not record any claim of crash-safe durability anywhere.**
- **Do not "fix" the sync indicator.** Root asserted it reads `Saved` over a non-durable write and
  **the adjudicator refuted that**: in **350/350** samples ~2 ms after the barrier it read
  `Saving...` while the op was already durable, and `hasUnsavedChanges` is a **2 s poll**
  (`layout.tsx:161`). There is no established defect there.
- **F-2 / `transactions.spec.ts:572`** remains unowned. Arm F did not reproduce it in 28 runs, so
  assume it is a different class until measured.

## Validation

Your fix must be shown to work **by measurement, in both directions** — this goal has repeatedly
been misled by fixes that were correct and inoperative:

- Demonstrate the losing shape still loses **before** your change and stops losing **after** it, at
  a sample size comparable to the 70-run arms. The probe that produces it is preserved at
  `evidence/P21/diagnostic-Q-P20B-26-probe.spec.ts.artifact` with its config alongside — **reuse it
  rather than building a new instrument.**
- Then run the real suite: `people-settlement.spec.ts` with `--retries=0` and enough repeats to show
  the class is closed rather than moved. **A single green run proves nothing** — three agents have
  produced one on a tree known to fail, which is why the standing bar is ten.
- Cheap gates: `pnpm typecheck`, `pnpm lint`, `pnpm test`. **Scope any format run to your own
  files** — a bare `pnpm format` rewrites `specs/**` including the frozen `specs/human-scratch.md`.
- **Identify a campaign by the `head=` in its own START/END lines, never by a completeness marker**
  (`Q-P20B-29`): two of four prior directories end `CAMPAIGN_COMPLETE` and one of them is the
  superseded pre-fix tree.

## Artifact discipline — F-A exists because this was not followed

**Hand back only after every artifact you cite exists.** Rev 07's evidence was frozen inside run 1
of the campaign it was meant to report, leaving a literal `PLACEHOLDER-CAMPAIGN` and two dangling
cross-references; that was a blocking FAIL. **Root will bounce a handback whose evidence contains an
unfilled placeholder, a forward reference to a section you never wrote, or a claim contradicted
elsewhere in your own file.** Mark cross-file references so they cannot be read as pointing at your
own sections. Tag every claim **MEASURED** or **INFERRED**.

## Authorized paths — nothing else

- `tests/e2e/helpers/nav.ts` and other `tests/e2e/**` files your fix genuinely requires
- a narrow test seam if you take shape (b) — **if and only if** it does not change product behaviour
- your one evidence file: `evidence/P20B/implementation-10.md` (the filename runs one ahead of the
  revision; known skew). **Write it; do not commit it** — root persists it with the verdict per
  `PROCESS.md:58`.

Do not edit ledgers, QUESTIONS, DECISIONS, RISKS, FINAL-AUDIT, task contracts, review files, the
adjudication, or the frozen `specs/human-scratch.md`.

## Hard constraints

- **NEVER `pnpm db:reset` or any destructive database command** — the local Supabase holds ~30,587
  real vaults shared with the human's dev server.
- **NEVER touch port `:3001`** (the human's dev server). Use `:3000`, or `:3100` as the diagnostic
  did. `env -u CI`; never `--debug`, `--ui`, `--headed`, `show`.
- **Never a bare `pkill -f`** — it matches your own shell, exits 144, leaves the target running.
- Fresh worktree: **copy the untracked `.env.local` in**; **never `cp -a node_modules`** (it carries
  a stale `.vite/vitest/results.json` that has reported passes for a failed run).
- Shared checkout: never `git stash`, never `git checkout --`, never `git add -A`.
