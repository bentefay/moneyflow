# Decision Log

Append decisions; do not erase superseded reasoning. Product decisions discovered during execution
need evidence, alternatives, security/UX impact, and a reversal path.

## D-001 — Frozen scope includes the live code-quality item

- **Date:** 2026-07-19
- **Status:** accepted for orchestration
- **Decision:** Freeze the 21-requirement human-scratch source at scratch SHA-256 `b91ca932…`.
  Assign the later-added code-quality sweep `HS-021` and schedule it as P20B after feature work.
- **Reason:** The user's objective is every currently unticked item; omitting the live addition
  would knowingly leave the objective incomplete.
- **Consequence:** Historical IDs HS-003–HS-020 remain stable; HS-021 is intentionally out of source
  order. Later scratch changes use the drift process.

## D-002 — Sequential implementation and independent review

- **Date:** 2026-07-19
- **Status:** accepted for orchestration
- **Decision:** One implementer owns one package, followed by a distinct reviewer over exact
  `BASE..HEAD`; no parallel code-writing packages.
- **Reason:** Shared-worktree write conflicts and context pollution are more costly here than
  nominal parallel speed, while an independent UX/test review is explicitly required.

## D-003 — Ambiguity does not pause the Goal

- **Date:** 2026-07-19
- **Status:** accepted for orchestration
- **Decision:** Apply the PROCESS decision hierarchy, log uncertainty in QUESTIONS, and choose the
  safest reversible default. Human review is deferred until all feasible work is otherwise done.
- **Boundary:** This does not authorize destructive data loss, secret exposure, external
  publication, or pretending an unavailable dependency/API exists.

## D-004 — Canonical settlement spec is a first-class requirement in this Goal

- **Date:** 2026-07-19
- **Status:** accepted for orchestration
- **Decision:** Select the complete immutable
  `specs/008-transaction-percentage-allocations-settlement/spec.md` as `FS-001`, the 22nd
  first-class requirement, frozen at SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines and 25,441 bytes.
  Prefixes identify provenance only; `FS-001` receives the same implementation, evidence, exhaustive
  independent review, style, E2E, manual UX and final-audit gates as all `HS-*` requirements.
- **Reason:** The canonical feature spec is explicit implementation authority and must not be hidden
  beneath the narrower scratch allocation item.
- **Consequence:** The Goal cannot complete until P16A–E and the FS-001 requirement ledger pass.
  Progress is never recorded by editing this source; its exact identity is checked at P00, every
  package boundary, recovery and P21.

## D-005 — Canonical allocation and settlement invariants are not design options

- **Date:** 2026-07-19
- **Package / scope:** P16A–E / FS-001 and HS-009
- **Status:** accepted for orchestration
- **Decision:** Explicit per-person allocations are finite decimal percentages in `-100..100`, may
  total any value and are rejected—not clamped or normalized—when invalid. The owner's remainder is
  `100 - sum(explicit)`, including zero and negative values; valid ownership divides that remainder
  so effective shares total exactly 100. Signed minor-unit apportionment uses the established
  decimal library, mathematical floor (including negatives), largest remainder and stable-ID
  tie-breaking. `src/lib/domain/settlement.ts` is the sole settlement engine, operating per currency
  with traceable positions, obligations, source contributions and typed issues.
- **Reason:** These are frozen normative clauses in FS-001. Treating them as open design questions
  would risk unit loss, silent financial mutation and competing totals.
- **Consequence:** All current/future mutation paths use the validated CRDT APIs; invalid legacy
  data is retained and surfaced honestly rather than silently migrated. P16A–E package contracts and
  P21 audit must exercise conservation, negative values, deterministic ties, invalid data,
  historical people and source traceability.

## D-006 — P00 accepts reproducible reds only as routed baseline facts

- **Date:** 2026-07-20
- **Package / scope:** P00 / control
- **Status:** accepted
- **Evidence:** `evidence/P00/implementation-02.md` and independent `reviews/P00-review-02.md` PASS.
- **Alternatives:** Fix product defects inside P00; omit known reds; or treat a green automated
  suite as sufficient baseline evidence.
- **Decision and reason:** P00 records reproducible defects without product edits only when the
  evidence is complete, truthful and routes ownership to the earliest applicable package. Revision
  01 failed for a false focus-restoration claim; revision 02 passed after independently reproducing
  and routing the actual focus loss.
- **Security, data, UX, and compatibility impact:** No defect is waived as delivered. Focus loss,
  reduced motion, dialog warnings, dark behavior, toolchain drift and future security/data work
  remain open gates for their owning packages and P21.
- **Reversal/migration path:** Owning packages remediate and independently review each red; a later
  audit finding invalidates affected package acceptance through PROCESS rollback/rereview.

## D-007 — P01 resolves latest-safe dependency currency against the installed 48-hour policy

- **Date:** 2026-07-20
- **Package / scope:** P01 / HS-002
- **Status:** accepted
- **Evidence:** `evidence/P01/implementation-02.md` and independent `reviews/P01-review-02.md` PASS
  over `d54a6285dd9b9f0824927b3d8a3a4e14c5315c73..71aa257bb9bdad736fb7ef7315854fce42c5cbb4`.
- **Alternatives:** Treat registry `latest` as authoritative despite Safe Chain suppression; retain
  review 01's unverified 24-hour assumption; or upgrade to releases younger than the installed
  policy permits.
- **Decision and reason:** “Latest safe-chain supported” means the newest stable mutually compatible
  release eligible under the effective installed Safe Chain policy at the frozen cutoff. With Safe
  Chain 1.5.13 and no configuration or environment override, the primary-source default is 48 hours;
  pnpm 11.13.1 and Vercel 56.3.1 were therefore current eligible releases. The revision-01
  “unpublished” narrative and 24-hour review premise are superseded, while its frozen pins remain
  correct.
- **Security, data, UX, and compatibility impact:** The compatible Node 22 LTS/Node 24-supported,
  TypeScript 6, Next 16 and React 19 graph passes frozen installs, dedupe, production audit, build,
  1,141 tests and 78 no-retry E2E cases. Serialized owning-client Realtime channel removal also
  closes the same-vault lock/unlock collision without reload. Eleven known audit advisories remain
  confined to the Vercel development chain; production audit is clean.
- **Reversal/migration path:** P21 repeats dependency currency, audit and runtime validation against
  the then-effective Safe Chain policy. A later incompatible or unsafe release routes to a new
  reviewed remediation range; P01 acceptance is rolled back if its assumptions no longer hold.

## D-008 — Decline broader Animate UI adoption under a component-specific rollout gate

- **Date:** 2026-07-20
- **Package / scope:** P02 / HS-017
- **Status:** accepted
- **Evidence:** `evidence/P02/implementation-02.md` and independent `reviews/P02-review-02.md` PASS.
- **Alternatives:** Copy Dialog, Alert Dialog, Dropdown Menu or Tooltip now; remove the existing
  route-local tabs; or retain the corrected tabs and direct Radix wrappers.
- **Decision and reason:** Retain the corrected route-local Animate UI tabs, decline broader
  copying, and require the evidence's ten component-specific rollout gates for future adoption. The
  four candidates add motion, API, portal, bundle, maintenance and notice ownership without a proven
  consumer benefit; the retained tabs now preserve five mobile accessible names and labelled panels.
- **Security, data, UX, and compatibility impact:** No data/security surface changes. Mobile tab
  semantics are repaired; reduced-motion and controlled-trigger focus limitations remain explicit
  future gates. Q-001/R-022 remains open before release.
- **Reversal/migration path:** A future package may adopt one candidate after proving a real
  consumer, exact source/license pin, API parity, subtle reduced motion, route-bundle cost and full
  accessibility.

## D-009 — P03 uses the released explicit TanStack flush-sync option

- **Date:** 2026-07-20
- **Package / scope:** P03 / HS-018
- **Status:** accepted
- **Evidence:** `evidence/P03/implementation-01.md` and independent `reviews/P03-review-01.md` PASS.
- **Alternatives:** Treat PR #1100 as unreleased; infer release inclusion from semver; rely on the
  adapter's implicit default; or vendor the upstream change.
- **Decision and reason:** PR #1100 merged as `1686256e…`, first shipped in stable 3.13.15, and is
  present in current/installed Safe-Chain-eligible 3.14.6. Published and installed source/runtime/
  declarations expose `useFlushSync`; the sole product virtualizer explicitly passes `true`.
- **Security, data, UX, and compatibility impact:** The explicit option preserves current runtime
  semantics and passes large-list warning/focus/scroll gates. It does not resolve the separately
  routed 1,000-row persistence overflow or current continuous-scroll jank.
- **Reversal/migration path:** Re-evaluate only against a future released adapter API with the same
  exact source/type/runtime and large-list gates; never vendor an unreleased implementation.

## D-010 — Server-verified identity and one permanent encrypted operation source

- **Date:** 2026-07-20
- **Package / scope:** P04 / HS-014
- **Status:** accepted
- **Evidence:** `evidence/P04/implementation-02.md` and independent
  `reviews/P04-review-02.md` PASS over
  `9de8b0e8c41087b96523ecc55faa10bf19ec0ff9..dbcf180e829c81a218e9a73791e40902c4f9eb31`;
  immutable revision-01 FAIL `reviews/P04-review-01.md` records the corrected counterexamples.
- **Alternatives:** Trust a client/hash header; continue unsigned GET selection; rely on browser RLS
  while the server uses service role; retain two authoritative update stores; or destructively
  delete operation history with a vault.
- **Decision and reason:** The tRPC server is the authorization boundary. Every application request
  uses a canonical signed POST representation binding exact ordered operation/input, a timestamp and
  a one-use nonce; the server derives identity only from verified key proof. Direct anon/auth table
  access is denied, and service-role operations scope the verified caller and exact vault. `vault_ops`
  is the insert-only permanent encrypted source; one replaceable snapshot is cache; legacy updates
  migrate losslessly to ops and remain quarantined for rollback; vault deletion removes access but
  preserves operations.
- **Security, data, UX, and compatibility impact:** Claimed-hash row selection, query-input URLs,
  replay, broad direct grants, invite races, destructive operation cascades and duplicate published
  sources are closed. New/existing identity flows remain compatible and clear temporary state on
  failure. P05 still owns live Realtime authorization and P08 owns real invite/key-wrap UI; neither
  is pre-claimed by this decision.
- **Reversal/migration path:** POST override and self-only router inputs are local reversible API
  choices with no stored-key rewrite. Migration rollback preserves nonce, legacy quarantine,
  membership, snapshot and permanent-operation data and must never restore unsafe grants, claimed
  identity settings, cascade deletion or a second authoritative operation store.

## D-011 — Block P05 rather than mutate Realtime for an unmeasured hidden-page edge

- **Date:** 2026-07-20
- **Package / scope:** P05 / HS-015
- **Status:** accepted external-gate disposition
- **Evidence:** `evidence/P05/implementation-11.md`, independent
  `reviews/P05-review-11.md`, Q-013 and the installed `@playwright/cli` 0.1.17 help/README plus its
  bundled CDP protocol declarations; before-P08 diagnostic
  `evidence/P05/implementation-12.md` and independent `reviews/P05-review-12.md` reconfirm the exact
  gate without executable change.
- **Alternatives:** Enable Realtime `worker: true`; certify a merely non-selected visible page;
  emulate hidden lifecycle; weaken the 15-second bound; or stop all independent work.
- **Decision and reason:** None is acceptable. Required headless CLI pages report visible, visible
  socket/import/DOM convergence is 2.591 seconds, and worker mode moves only heartbeat timing while
  adding per-client worker/CSP/disconnect surface. P05 is therefore `blocked_external` until a
  repository-authorized real-hidden topology can measure the first late edge. Independent packages
  continue under the dependency graph.
- **Security, data, UX, and compatibility impact:** The independently green same-identity manager
  correction and strict true-duplicate regression remain preserved. No speculative client worker,
  timeout, reload/poll or false hidden evidence is introduced; HS-015 remains unchecked.
- **Reversal/migration path:** Reopen P05 with a no-product diagnostic revision at the documented
  recheck trigger. Only causal hidden timing may authorize a later exact product/test diff.

## D-012 — Remove the unsynchronized generic user blob and retain only identity registration

- **Date:** 2026-07-20
- **Package / scope:** P06 / HS-010
- **Status:** accepted
- **Evidence:** `evidence/P06/implementation-01.md` and independent
  `reviews/P06-review-01.md` PASS over
  `a7c0cb9a3ba0e4c66f25b53b1fa0883aeee968a1..95e91dbcb17ffb9600eaa6cb795336898297ebae`.
- **Alternatives:** Preserve/archive/rename the blob; move it into another generic store; remove the
  identity registry; or retain dead get/upsert/exists APIs and crypto/types for hypothetical reuse.
- **Decision and reason:** Drop only `public.user_data.encrypted_data` and its demonstrably dead
  state surface. The blob has no product consumer and is outside current CRDT/sync; normalized
  membership/wrapped keys, encrypted vault ops/snapshots, signed identity, local active-vault state
  and IndexedDB are separate. Legacy blob bytes are intentionally unrecoverable except from a pre-
  migration backup; moving them would violate HS-010.
- **Security, data, UX, and compatibility impact:** Identity hashes/timestamps and every normalized
  encrypted vault value survive fresh/seeded migration evidence. Registration/get-or-create remain
  strict signed empty-input self operations; dead service UPDATE and blob endpoints disappear.
  Passkey credentials remain P19-owned and no replacement generic state is created.
- **Reversal/migration path:** A down migration can recreate an empty column but cannot restore
  deleted ciphertext. Restore a pre-009 backup if those intentionally discarded bytes are needed;
  any future user-global state requires a separately reviewed sync/CRDT design.

## D-013 — Use linked-hybrid vault access with lossless epoch and client reconciliation protocols

- **Date:** 2026-07-20
- **Package / scope:** P07 / HS-011 architecture with integrated HS-012 contract for P08
- **Status:** accepted
- **Evidence:** `evidence/P07/implementation-04.md` and independent
  `reviews/P07-review-04.md` PASS over original
  `fe1871ce7dce1e831b57ee5656d38ce5c800aae3..dfffea3c19b110b6021b050b8d9e36b01ae75ab9`,
  incorporating immutable revision-01–03 failures and canonical Q-014.
- **Alternatives:** Vault-Settings-only access; People-owned membership; sealed-box or sender-
  ambiguous envelopes; discard/reset on epoch change; SQL/CRDT fake atomicity; memory-only or value-
  semantic operation deduplication; server-visible Person profiles; destructive default-Person/
  financial-history replacement; or waiting for every member online before removal.
- **Decision and reason:** Use a linked hybrid: Vault Settings is authoritative for Members/Invites,
  while People remains encrypted financial state with optional stable membership links. Use
  sender-bound authenticated `crypto_box`, access-generation-scoped per-epoch envelope history,
  locked server rotation and a persistent same-store edit fence/journal that preserves every exact
  peer-specific Loro operation. Invitation and vault creation use reconstructible SQL truth followed
  by fenced encrypted client sagas; semantic receipts never substitute for exact-op permanence.
  Frontier-bound repair handles late/distinct Person claims, and creation links canonical
  `person-default-me` in place while preserving 100% default-account ownership/references. This is
  the narrowest zero-knowledge, local-first, crash-safe design satisfying HS-011/HS-012.
- **Security, data, UX, and compatibility impact:** Member-only governance, fragment-only bearer
  secrets, non-enumerating preflight, soft removal, removed/re-added tenure denial and honest past-
  copy limits are explicit. Offline/sibling edits, financial People/history and creator defaults are
  preserved; UI stays `Finishing setup` until authenticated link/sync/selection proof. P08 must
  implement all 29 accessibility/security/migration/real-browser clauses and remains separately
  gated by D-011/P05.
- **Reversal/migration path:** Gate new writes/UI; backfill epoch-0 exact operations, authenticated
  envelopes/generations and canonical safe links; revoke legacy pending invites; retain envelopes,
  manifests, exact operations, fences/journals, truths/receipts/claims/links and pending recovery on
  reversal. Never destructively down-migrate advanced epochs or delete referenced financial state;
  old unfenced binaries cannot write.

## D-014 — Use explicit Loro edit sessions and SyncManager-owned reconnect retry

- **Date:** 2026-07-20
- **Package / scope:** P09 / HS-006
- **Status:** accepted
- **Evidence:** `evidence/P09/implementation-02.md` and independent
  `reviews/P09-review-02.md` PASS over cumulative
  `c9146fae2c5534313d21b4f34cb2b012eaeeb4ed..418234e28ac649e03ce8ad184d08a8a2f2416149`;
  immutable `reviews/P09-review-01.md` records the corrected F-01/F-02 counterexamples.
- **Alternatives:** Group every mutation by microtask or elapsed merge window; buffer controlled
  form state until blur; let native input history substitute for document history; retry failed
  pushes only after another mutation/reload/focus; add an unbounded timer loop; or move transport
  retry into Undo UI code.
- **Decision and reason:** One standard Loro UndoManager follows the hydrated active document. Typed
  user/system origins exclude remote and maintenance work. Synchronous actions use an exact
  microtask group, while controlled autosave fields explicitly own a focus-to-close edit session;
  each CRDT/IndexedDB write remains immediate but the complete session is one undo step. The actual
  SyncManager owns one cleaned-up browser-online listener that rereads durable unpushed operations,
  serializes/coalesces in-flight requests and performs no timer loop. This is the narrowest design
  that satisfies logical action grouping, local-first durability and automatic reconnect sync.
- **Security, data, UX, and compatibility impact:** Native editable shortcuts remain untouched;
  one global Undo/Redo reverses/reapplies the complete field edit; unrelated actions and replaced
  documents cannot merge history. Failed offline edit/undo operations remain encrypted and durable,
  then reach the permanent server trail after reconnect without extra user stimulus, concurrent
  duplicate writes or false Saved state. Canonical Q-015 retains both Meta redo aliases outside
  editables. Future autosaved CRDT fields must adopt the explicit edit-session hook.
- **Reversal/migration path:** Revert the P09 product/test commits together; there is no schema,
  dependency or stored-format migration. Do not revert only reconnect retry or edit-session wiring
  while retaining controls, because that would restore the independently proven acceptance defects.

## D-015 — Use bounded private maintenance shadows and a path-lazy public callback membrane

- **Date:** 2026-07-24
- **Package / scope:** P12 / HS-005
- **Status:** accepted
- **Evidence:** `evidence/P12/implementation-08.md` and independent
  `reviews/P12-review-08.md` PASS over cumulative
  `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e..a2a31839f6bb57855fa60b8cfcc06feed069cafa`;
  immutable reviews 01–07 retain every rejected intermediate design and Q-018.
- **Alternatives:** Recursively attach a complete detached tree in one final step; expose partial
  public state while copying; retain obsolete aliases until remount; synchronously project the whole
  vault for every new snapshot; rely on type-only omission; or leave generic selector/action/edit
  callbacks on raw transaction state.
- **Decision and reason:** Build duplicate-bucket work as bounded, resumable, attached private
  shadows under low-level maintenance metadata; validate fresh authority before a fixed-depth reveal
  that removes the source. Use finite per-alias Undo-history reachability for collection. Hide all
  reserved/private records before cleanup through one cached path-lazy runtime membrane shared by
  exported selectors, actions and edit actions. Projection descends only explicitly requested paths;
  physical cleanup alone belongs to the RAF item/time budget. This is the smallest design that
  simultaneously satisfies same-notification privacy, bounded work, offline convergence and normal
  write-through application APIs.
- **Security, data, UX, and compatibility impact:** Public reads and mutations cannot observe or act
  on maintenance-only records, while legitimate transaction/preference writes, user Undo/Redo,
  encrypted sync and exactly one `system:gc` cleanup remain intact. Mixed/late/reordered peer edits
  invalidate stale authority without losing standalone or nested transactions. No persisted public
  schema, plaintext, transport discriminator or test-only production hook is added.
- **Reversal/migration path:** Revert the complete P12 product/test range only with an equivalent
  independently reviewed bounded/private design. Existing low-level maintenance metadata is
  self-cleaning on mount/import; never roll back only the public membrane or private-state filters,
  because that would re-open pre-frame data exposure and stale-shadow mutation.

## Decision template

### D-XXX — Title

- **Date:**
- **Package / scope:**
- **Status:** proposed | accepted | superseded
- **Evidence:**
- **Alternatives:**
- **Decision and reason:**
- **Security, data, UX, and compatibility impact:**
- **Reversal/migration path:**
