# P20B rev 10 — remediate F-1, F-2, F-3 from `reviews/P20B-review-09.md` — ACTIVE

**Implementer:** `p20b-implementer-10`. Distinct from `p20b-implementer-07/-08/-09`; you review
nothing.

**BASE:** re-derive with `git rev-parse HEAD`. Do not carry a hash from this file.

## What rev 09 got right, and is NOT reopened

`reviews/P20B-review-09.md` **FAIL**, three MEDIUM findings. **The measurement is sound and survived
every attack the reviewer made on it** — all five arm counts, the 350/350 op-count discriminator,
the campaign digests and both D-021 conditions re-derived to the digit; the full suite re-run three
more times and the frozen journey ninety-five more times, all green; and **arm C, the control, is
byte-identical between campaigns**, which is what makes the zeros mean anything.

**Do not redesign the fix.** The seam approach, `awaitVaultPersistence`, `reloadPage`, and the
choice of shape (b) over client-side navigation are all **upheld**. **D-021 Component 1 is ruled
DISCHARGED** by this design. You are fixing what it *ships* and what nothing *tests*.

## F-2 FIRST — the ordering is binding, not stylistic

**Fix F-2 before F-1, or in the same change.** Gating the seam while `awaitVaultPersistence` still
treats an absent seam as success would **add** a silent failure mode: every E2E run would pass with
the barrier inert. This ordering is the reviewer's finding and root endorses it.

### F-2 — nothing detects the fix being deleted, and the barrier fails silently

- `tests/e2e/helpers/persistence.ts:39-56` — `if (outcome.kind !== "rejected") return;` treats
  **`"no-seam"` as success**, so the barrier degrades to a silent no-op.
- Nothing anywhere asserts that `VaultProvider` installs the seam. MEASURED by the reviewer via
  **mutation, not inspection**: deleting the single `useEffect` at `vault-provider.tsx:92` leaves
  `typecheck` 0, `lint` 0, `oxfmt --check` 0 and **2486 unit tests passing**, while **arm C2 resumes
  losing 2/12** and the helper raises nothing.

**Required:** an absent seam must fail loudly where a vault is mounted, and something must fail if
the install line is removed. **Prove it by mutation, the same way the finding was found** — delete
the install line, show your new guard goes red, restore it, show green. A guard you cannot
demonstrate failing is exactly the defect being fixed.

### F-1 — the seam ships to real users, ungated

- `src/lib/sync/local-persistence-seam.ts:45-67`, installed unconditionally at
  `vault-provider.tsx:92`, re-exported from `src/lib/sync/index.ts:1-5`.
- MEASURED: after `pnpm build`, `__moneyflowLocalPersistence` is present in the **emitted production
  client bundle**. The repository has **no prior `window.__*` hook in `src/`**.
- **The reviewer's security analysis found no vulnerability** — this is a production-surface and
  precedent finding, not a security one. Do not describe it as a security fix.

**Required:** the seam must not be installed on `window` in production builds. Mechanism is yours;
two that work — `process.env.NODE_ENV !== "production"` (provably compatible: `webServer.command` is
`pnpm run dev` and **no CI workflow runs E2E against a production build**; the idiom is already used
at `vault-provider.tsx:390`), or an explicit `NEXT_PUBLIC_ENABLE_TEST_SEAM` set in
`playwright.config.ts`'s `webServer.env`, which survives a future prod-build E2E run. **Also
consider dropping the two re-exports from the `@/lib/sync` barrel** — nothing outside the seam's own
test imports them by that path. **Verify by rebuilding and grepping `.next/static`.**

### F-3 — a committed universal that is false as written

The commit subject "wait for durable local persistence before **every** E2E document teardown" and a
source comment both assert universality. **Raw `page.goto` teardowns remain unbarriered, some with a
vault mounted.** Count caveat, unresolved and not for you to resolve: the reviewer counts **52**
(five in-vault); root's narrower derivation gives **44**. **The finding holds under either.**

**Required:** barrier the in-vault raw teardowns, **and** correct the universal claim in the source
comment so the committed text matches what the code does. You cannot amend the pushed commit
subject — say so in your evidence rather than trying. Whether to forbid raw `page.goto` in specs by
lint rule is **out of scope**, tracked as `Q-P20B-30`.

## Out of scope

- **Component 2 / crash-safe durability** — OUT-OF-GOAL by D-021, `RISKS.md#R-LOSTWRITE-01`. Record
  no claim of crash safety.
- **Converting `nav.ts` to client-side navigation** — would breach D-021 condition 1 by weakening
  assertions that re-derive state across a document boundary. Tracked as `Q-P20B-31`. The suite
  already exercises **16 in-app client-side link navigations across six spec files**, including
  frozen step 8 of the mandatory journey.
- **`realtime-origin-controls.test.ts`** — a pre-existing 5 s WebSocket timeout flake three agents
  have hit; imports nothing from `@/lib/sync`; not P20B's.
- **`duplicates.test.ts`** — a wall-clock ratio assertion that fails under CPU load. **Do not run
  unit tests beside a campaign and trust the result.**

## Bound your claims

Rev 09's `0/70` means **a bound, not a clearance: 95% rule-of-three upper bound 4.3% per fixed
arm.** The reviewer flagged one sentence in `implementation-10.md` §6 — "The lost write is gone" —
as looser than the rest. **Do not repeat that unbounded form.** Preserve every non-claim: the
10-green bar, crash safety, and the residual class all remain open.

## Validation

Re-run the preserved probe (`evidence/P21/diagnostic-Q-P20B-26-probe.spec.ts.artifact` + its
config): **arm C must still lose on your tree** — it is the control that proves the instrument can
fail — while C2 and D stay at zero. Then `people-settlement.spec.ts --retries=0` with repeats, and
the full suite **on the repo's own config on `:3000`** — a custom port breaks the seven specs that
pin `baseURL: "http://localhost:3000"`, which cost rev 09 a 15-failure phantom run. Cheap gates:
`typecheck`, `lint`, `pnpm test`, and **`pnpm build` plus a `.next/static` grep for F-1**.

## Authorized paths

`src/lib/sync/local-persistence-seam.ts`, `src/components/providers/vault-provider.tsx`,
`src/lib/sync/index.ts`, `tests/e2e/helpers/persistence.ts`, other `tests/e2e/**` your fix requires,
a unit/integration test for the install guard, `playwright.config.ts` **only if** you take the env-flag
route — and your evidence file `evidence/P20B/implementation-11.md` (filename runs one ahead; known
skew). **Write the evidence; do not commit it.** Nothing else — no ledgers, QUESTIONS, DECISIONS,
RISKS, adjudications, review files, or the frozen `specs/human-scratch.md`.

**Hand back only after every artifact you cite exists.** A revision was failed outright for evidence
containing a placeholder token; root will bounce a handback with an unfilled placeholder, a dangling
`§` reference or a claim contradicted elsewhere in your own file. Mark cross-file references. Tag
every claim **MEASURED** or **INFERRED**.

## Hard constraints

- **NEVER `pnpm db:reset` or any destructive database command** — ~30,587 real vaults shared with
  the human's dev server.
- **NEVER touch `:3001`.** `env -u CI`; no `--debug`/`--ui`/`--headed`/`show`.
- Never a bare `pkill -f`; kill by pid after `readlink /proc/<pid>/cwd`, verify by port state.
- Copy `.env.local` into any worktree; **never `cp -a node_modules`**.
- Scope format runs to your own files. Shared checkout: no `git stash`, `git checkout --`, `git add -A`.
