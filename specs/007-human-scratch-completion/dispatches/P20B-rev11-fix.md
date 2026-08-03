# P20B rev 11 — remediate F10-1 and F10-2 from `reviews/P20B-review-10.md` — ACTIVE

**Implementer:** `p20b-implementer-11`. Distinct from `p20b-implementer-07/-08/-09/-10`.

**BASE:** re-derive with `git rev-parse HEAD`. Never carry a hash from a document — a prior
revision's commit was amended away and root quoted the orphan.

## What is NOT reopened

`reviews/P20B-review-10.md` **FAIL**, but **all three findings of rev 09 are confirmed remediated**,
each reproduced independently in both directions: the seam is out of the production bundle (0 files
gated / 1 with the gate line removed / 0 restored), deleting the install line turns the provider
guards **and** every barriered E2E spec red, and the false universal is gone with all twelve barrier
calls targeting the correct `Page`. **Do not redesign any of that.** The reviewer describes what
remains as **one small test and one corrected sentence.**

## F10-1 — guard the gate you added

`src/lib/sync/local-persistence-seam.ts:60` is `if (process.env.NODE_ENV === "production") return
() => undefined;`. **Nothing detects that line being deleted.** MEASURED by the reviewer: removing
it leaves typecheck, lint, format and the whole unit suite green **while the seam returns to the
production bundle**. This is **the defect F-2 named, applied to F-1's own fix** — one silent-deletion
path was closed and another opened.

**Required:** something must fail if the gate is removed. The reviewer measured a guard to be
feasible — a unit test that stubs `process.env.NODE_ENV` to `"production"` and asserts
`installLocalPersistenceSeam` does not install. **Prove it by mutation, the way the finding was
found:** delete the gate line, show your new test goes red, restore it, show green. **A guard you
cannot demonstrate failing is the defect being fixed.**

## F10-2 — correct the claim; the barriering is OPTIONAL and partly WRONG

`evidence/P20B/implementation-11.md` §4.2 claims the in-vault criterion was applied "to every
`.goto(` in the suite" and reports **eleven**. **That claim is false.** MEASURED by the reviewer via
**runtime instrumentation** — not by reading — **at least four further raw teardowns meet the
criterion unbarriered**: `passkey.spec.ts:60`, `:177`, `:232` and `identity.spec.ts:173`, each
observing a present seam and `awaitLocalPersistence()` → `"persisted"`. **Three are in
`passkey.spec.ts`, which rev 10 edited** — it barriered `:76` and `:429` while leaving three of
identical shape, so that file is now internally inconsistent.

**Required (the small fix):** your evidence must state **what was swept and what was not**, as a
**bounded** claim. **Root will transcribe it, and this quantity has already taken four successive
wrong values — 44, then 52/five, then eleven.** The ledger now records **"at least fifteen; the
sweep is not complete."** **Do not issue a fifth exact number unless you have measured the whole
suite by instrumentation, and if you do, say exactly how.**

**Optional:** barrier the four measured sites above.

**DO NOT barrier `passkey.spec.ts:406`/`:468` or `identity.spec.ts:339`/`:614`.** MEASURED: the
first two have **no active vault**, and the second two showed an **absent seam at the teardown
instant**. A barrier there risks the **15-second hang** rev 10's own §4.3 correctly identifies as
the failure mode to avoid. **This is the part of the reviewer's initial reading that its own
measurement refuted** — read that before touching any site.

The durable answer is the lint rule tracked as `Q-P20B-30` and is **out of scope**.

## Out of scope

- **Component 2 / crash-safe durability** — OUT-OF-GOAL by **D-025** (renumbered from a duplicated
  `D-021`; see the ID note in `DECISIONS.md`). Record no crash-safety claim.
- Converting `nav.ts` to client-side navigation (would breach D-025 condition 1; `Q-P20B-31`).
- `realtime-origin-controls.test.ts` — fails at BASE, five agents have hit it, no import path to
  this work; it needs an owner outside P20B. **Do not fix it and do not let it fail your handback.**
- `transactions.spec.ts:573` — MEASURED by the reviewer as **not** a lost write.
- A pre-existing browser-side unhandled rejection on clear-session-then-navigate.
- `duplicates.test.ts` — a wall-clock ratio assertion that fails under CPU load. **Never run unit
  tests beside a campaign and trust the result.**

## Validation

Re-run the preserved probe (`evidence/P21/diagnostic-Q-P20B-26-probe.spec.ts.artifact` + config):
**arm C, the control, must still lose** — it is what proves the instrument can fail — while C2 and D
stay at zero. Then `people-settlement.spec.ts --retries=0` with repeats, and the full suite **on the
repo's own config on `:3000`** (a custom port breaks the seven specs pinning
`baseURL: "http://localhost:3000"` and once produced a 15-failure phantom run). Plus typecheck,
lint, `pnpm test`, and `pnpm build` with a `.next/static` grep.

**`0/70` is a bound, not a clearance** — 95% rule-of-three upper bound 4.3% per fixed arm. The
10-green bar, crash safety and the residual class all stay open. Make **no cross-campaign rate
comparison**; a 2× between-campaign spread has been measured on a fixed tree here. **If a later
commit moves the tree mid-campaign, discard and restart from run 1.**

## Authorized paths

`src/lib/sync/local-persistence-seam.ts`, `tests/unit/**` for the new guard, `tests/e2e/**` only if
you barrier the four optional sites, and your evidence file
`evidence/P20B/implementation-12.md` (filename runs one ahead; known skew). **Write the evidence; do
not commit it.** Nothing else — no ledgers, QUESTIONS, DECISIONS, RISKS, adjudications, reviews, or
the frozen `specs/human-scratch.md`.

**Hand back only after every artifact you cite exists.** A revision was failed outright for evidence
containing a placeholder token. Mark cross-file `§` references so they cannot be read as pointing at
your own sections. Tag every claim **MEASURED** or **INFERRED**, and report failures rather than
smoothing them.

## Hard constraints

- **NEVER `pnpm db:reset` or any destructive database command** — ~30,587 real vaults shared with
  the human's dev server.
- **NEVER touch `:3001`.** `env -u CI`; no `--debug`/`--ui`/`--headed`/`show`.
- Never a bare `pkill -f`; kill by pid after `readlink /proc/<pid>/cwd`, verify release from
  `ss -ltn` state, not the kill's exit code.
- Copy `.env.local` into any worktree; **never `cp -a node_modules`**.
- Scope format runs to your own files. Shared checkout: no `git stash`, `git checkout --`,
  `git add -A`.
