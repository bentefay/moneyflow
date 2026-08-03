# P20B rev 12 — remediate F11-1 from `reviews/P20B-review-11.md` — ACTIVE

**Implementer:** `p20b-implementer-12`. Distinct from `p20b-implementer-07/-08/-09/-10/-11`.

**BASE:** re-derive with `git rev-parse HEAD`. Never carry a hash from a document.

## The whole required change is ONE COMMENT LINE

**Everything rev 11 was asked to fix PASSES**, each remediation reproduced independently by the
reviewer in both directions. **Do not redesign anything.** Do not move, drop or add a barrier. Do
not touch `src/`.

**F11-1 — a false universal in a comment rev 11 newly committed.** `tests/e2e/passkey.spec.ts:60-61`
says:

> "**Every** caller arrives from a settings page whose vault is still mounted, so this navigation is
> a teardown of a live document."

**MEASURED by the reviewer's instrumentation at that exact line: of 12 entries (4 callers × 3
repeats), only 6 observed a mounted vault.** Two saw the seam installed but
`awaitLocalPersistence()` returning `no-active-vault`; four saw an **absent** seam. **The "arrives
from a settings page" half is true — 12/12 were on `/settings`.**

**This is the same class as rev 09's F-3 — the false universal this package was already failed for.**
It is **not** concealment: `evidence/P20B/implementation-12.md` §3.2 discloses the mixed measurement
plainly. **The committed comment is simply stronger than the evidence justifying it.**

**Required:** rewrite that comment to claim only what is measured. Keep the true half. **The barrier
stays exactly where it is** — a `no-active-vault` barrier is a harmless no-op, and the reviewer
explicitly says not to move or drop it.

## Two things that must survive your edit

1. **The retry-on-absence branch in `tests/e2e/helpers/persistence.ts` is LOAD-BEARING.** MEASURED
   twice now: rev 10 saw 3 of 137 barrier entries recover from an absent seam on an `(app)` route;
   rev 11 saw **7 of 63**, all recovering. **"Absent on an app route means the bug, throw
   immediately" is refuted by measurement.** Do not touch it.
2. **The in-vault predicate is partly LOAD-DEPENDENT, not merely partly unmeasured.** At
   `passkey.spec.ts:180` rev 11 measured **3/3 `no-active-vault`** where rev 10 measured
   `persisted` — the same site. **So do not write any new comment or evidence sentence that asserts
   a site's vault state as a fixed property.** Describe what was observed, when, and how often.

## Do not issue a count

The in-vault quantity has been wrong four times (44 → 52/five → eleven → ≥fifteen) and is now known
to vary with load. **The ledger records "at least fifteen; the sweep is not complete." Leave it
alone.** If you state any number, state what you measured, how, and its scope.

## Out of scope

- Component 2 / crash safety — OUT-OF-GOAL by **D-025**. No crash-safety claim anywhere.
- The lint rule for raw teardowns — tracked as `Q-P20B-30`.
- `realtime-origin-controls.test.ts` — **intermittent**, five agents have hit it, no import path to
  this work, needs an owner elsewhere. **Do not fix it and do not let it fail your handback.**
- `transactions.spec.ts:573` — measured **not** a lost write. `duplicates.test.ts` — a wall-clock
  ratio assertion that fails under CPU load; **never run unit tests beside a campaign and trust the
  result.**
- The vacuously-surviving seam test the reviewer flagged (`undefined === undefined`) — recorded, not
  yours to fix.

## Validation proportionate to a comment change

`pnpm typecheck`, `pnpm lint`, `pnpm test`, and `oxfmt --check` scoped to your own file. Then run
`passkey.spec.ts` and `identity.spec.ts` with `--retries=0` and repeats sufficient to show you
changed nothing behavioural. **A full-suite campaign is NOT required for a comment edit** — say what
you ran and why it is proportionate, rather than padding it.

## E2E environment — this will otherwise cost you a cycle

**Next 16's dev lock is project-directory-scoped, not port-scoped.** The human's dev server (pid
818182) has `cwd = /home/ben-agents/Code/moneyflow`, **the shared checkout**, so **any `next dev`
from the repo directory dies in ~3 seconds even with `:3000` free**, naming `:3001` and that PID.
**That reads exactly like a port collision and is not one.** Run E2E from **your own git worktree**
with the repository's **unmodified** `playwright.config.ts` on `:3000` — no port override, because
seven specs pin `baseURL: "http://localhost:3000"`. Copy the untracked `.env.local` in; **never
`cp -a node_modules`**.

## Authorized paths

`tests/e2e/passkey.spec.ts` (the comment only) and your evidence file
`evidence/P20B/implementation-13.md` (filename runs one ahead; known skew). **Write the evidence; do
not commit it.** Nothing else — no `src/`, no ledgers, no reviews, no frozen sources.

**Hand back only after every artifact you cite exists.** No placeholder tokens, no dangling `§`
references, no claim contradicted elsewhere in your own file. Mark cross-file references. Tag every
claim **MEASURED** or **INFERRED**.

## Hard constraints

- **NEVER `pnpm db:reset` or any destructive database command** — ~30,587 real vaults shared with
  the human's dev server. **NEVER touch `:3001`.**
- `env -u CI`; no `--debug`/`--ui`/`--headed`/`show`. Never a bare `pkill -f`; kill by pid after
  `readlink /proc/<pid>/cwd` and verify release from `ss -ltn` state.
- **If you take an accessibility snapshot on `/new-user` after phrase generation, FILTER IT** — a
  bare `playwright-cli snapshot` prints the recovery phrase in cleartext, because the
  password-manager credential field carries it as its accessible value while the display shows
  `•••••`. See `RISKS.md#R-SNAPSHOT-PHRASE-01`. Never echo or quote that field.
- Shared checkout: no `git stash`, `git checkout --`, `git add -A`.
