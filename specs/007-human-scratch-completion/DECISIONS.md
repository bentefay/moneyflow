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
- **Status:** superseded by D-017 on 2026-07-26; previously accepted external-gate disposition
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
- **Status:** accepted; superseded-in-part by D-018 (29-clause epoch/reconciliation mandate removed from P08 scope; linked-hybrid data-model choice stands)
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

## D-016 — Preserve import identity and first-edit origin at the mutation boundary

- **Date:** 2026-07-25
- **Package / scope:** P14 / HS-008
- **Status:** accepted
- **Evidence:** `evidence/P14/implementation-04.md` and independent
  `reviews/P14-review-04.md` PASS over cumulative
  `b9105028926d24a5a0c5454777a6c33379ca606a..305d6613673cf200d456276c076463b68c075500`;
  immutable reviews 01–03 retain the corrected stale-count, nested-count and zoom-containment
  counterexamples.
- **Alternatives:** Treat import counts as immutable file metadata; enumerate only top-level
  transaction representations; let callers replace origin/lineage; derive origin from edit history;
  delete linked rows across multiple history actions; retain unbounded byte-array spreading; or
  expose the tooltip only programmatically when visual placement is difficult.
- **Decision and reason:** Retain immutable import lineage on every parent/nested logical identity
  and capture exact minor-unit `originalAmount` once, at the central first-real-amount-edit mutation
  boundary. Derive destructive counts from the current deduplicated active logical set, while the
  atomic delete scans every physical representation and removes the import record in one reversible
  action. Keep large encrypted updates on bounded base64 conversion. Use a component-local
  visual-viewport correction around the established accessible Radix tooltip so complete content
  and arrow remain contained under narrow 200% zoom without weakening programmatic description.
- **Security, data, UX, and compatibility impact:** Legacy/manual/unedited rows remain valid without
  origin data; currency precision is exact through eight decimals; unrelated imports and manual
  rows survive delete/Undo/Redo; encrypted payloads remain plaintext-free and large state reloads
  and converges. Hover and keyboard focus expose the same complete origin with stable viewport
  containment, dark contrast and reduced-motion compatibility.
- **Reversal/migration path:** Revert the complete P14 product/test range only with an independently
  reviewed identity-exact, first-origin-preserving and one-action reversible replacement. The fields
  are backward-compatible and should be retained when rolling UI behavior back; never remove only
  active nested enumeration, bounded encoding or collision correction while keeping dependent
  count/delete, scale or tooltip behavior.

## D-017 — Rescope P05/HS-015 to websocket security and accept the hidden-tab timing edge as an unmeasured non-issue

- **Date:** 2026-07-26
- **Package / scope:** P05 / HS-015
- **Status:** accepted; supersedes D-011
- **Evidence:** Frozen HS-015 text `specs/human-scratch.md:325-326` / `SCOPE.json#HS-015` asks only how
  the client websocket connection to Supabase is handled, whether it works with CORS, and whether it is
  properly secured by public-key-hash vault access. Implemented `src/server/routers/realtime.ts`
  mints a 60s HS256 grant only after `rotate_realtime_grant` verifies the caller `pubkey_hash` has
  vault access, scoped to `vault_ops` and topic `vault:{id}:{purpose}` with `vault_role`, refresh and
  revoke; `src/lib/supabase/realtime.ts` subscribes to authoritative `vault_ops`, not legacy
  `vault_updates`. P05 rev-11 (`reviews/P05-review-11.md`) independently accepted the same-identity
  live-sync correction. Capability probe 2026-07-26: raw CDP `Emulation.setVisibilityState` is absent
  in the bundled Chromium and is a forbidden substitute anyway; the `addInitScript` visibility mock
  flips only the JS `visibilityState`/`hidden` predicate and fires `visibilitychange`, without
  throttling the real socket. D-011 and `reviews/P05-review-12.md` record the prior hard block.
- **Alternatives:** Keep D-011's hard external block (the Goal cannot complete in this environment);
  accept mock or CDP numbers as genuine hidden-tab timing (false evidence, forbidden by Q-013); add a
  speculative `worker: true`/timeout/reload/poll mitigation for an unmeasured edge.
- **Decision and reason:** HS-015's frozen requirement is websocket **security**, not hidden-tab
  network latency. The security substance is built and independently green; P05 reopens to COMPLETE
  its acceptance with real tests — adversarial outsider/expired/replayed rejection, owner/member/
  outsider and cross-vault authorization, `vault_ops`-only publication with no legacy duplication,
  token mint/expiry/refresh/revoke, reconnect and offline catch-up, and CORS/origin documentation.
  The hidden-tab "first late edge" timing study that D-011/Q-013 pursued is OUT OF HS-015 scope and
  cannot be genuinely measured here. The JS-visibility mock legitimately tests background *behavior*
  (a hidden->visible transition re-syncs missed `vault_ops` without leaking data or stalling) but is
  never presented as measured network timing; any timing numbers are labelled visible-page controls.
  The unmeasured hidden-tab network-latency micro-edge is accepted as a documented non-issue — by
  D-011's own analysis, worker mode adds per-client worker/CSP/disconnect surface for no measured
  benefit. This supersedes D-011's hard external block; P05 becomes dispatchable again.
- **Security, data, UX, and compatibility impact:** The pubkey-hash-bound, short-lived, channel-scoped
  authorization boundary and server-side write verification are preserved and hardened by adversarial
  tests; unauthorized clients cannot enumerate or subscribe; live state stays truthful and self-
  recovering with no refresh requirement, infinite spinner or silent missed update. No emulated
  evidence enters the record and no speculative client mitigation is introduced.
- **Reversal/migration path:** If a genuinely-backgrounded-tab topology later measures a real late
  edge, reopen with an independently reviewed product/test diff. Never destructively alter the
  authorization boundary, weaken token scope/TTL, or subscribe to legacy tables on reversal.

## D-018 — Rescope P08 to the boundary-safe frozen core and supersede D-013's epoch mandate

- **Date:** 2026-07-26
- **Package / scope:** P08 / HS-011 + HS-012
- **Status:** accepted; supersedes D-013 in part (removes the 29-clause epoch/reconciliation mandate from P08; D-013's linked-hybrid data-model choice stands)
- **Evidence:** Independent fresh-context scope adjudication `adjudications/P08-scope-01.md` by a distinct opus-tier reviewer (never P08's implementer or reviewer), ruling on implementer proposal Q-025 in `evidence/P08/implementation-01.md`. Frozen HS-011 `specs/human-scratch.md:307-311` / HS-012 `:313-315`; `SCOPE.json#HS-011`, `#HS-012`. Load-bearing fact independently reverified by root: `supabase/migrations/005_vault_ops.sql:235-241` shows `vault_ops` has exactly six columns (id, vault_id, version_vector, encrypted_data, author_pubkey_hash, created_at) with no epoch/exact_operation_id/frontier metadata; `src/server/routers/membership.ts` `remove` + `rekey` (`rekey_vault_members` RPC) and `vault_memberships.enc_public_key` (`005_vault_ops.sql:266`) already provide a preserved rekey-on-removal path.
- **Alternatives:** (a) Implement the full D-013 29-clause epoch-rotation contract as a multi-revision P08 with an explicit `vault_ops` boundary-change Q-approval [rejected: the machinery has no frozen root — HS-011/HS-012 never mention removal, forward secrecy, epochs, exact-op permanence, crash-safe rotation, or causal repair, and honoring it would modify the PRESERVED P04 boundary for an unmandated goal]; (b) rescope P08 to the frozen-aligned secure core with the boundary preserved [selected]; (c) leave D-013 unchanged and let the boundary drift silently [rejected: violates the no-boundary-change-without-Q rule and the frozen-traceability floor].
- **Decision and reason:** P08's definition-of-done is the boundary-safe frozen core: (1) real authenticated `crypto_box` invite redemption replacing the `randombytes_buf(48)` placeholder so a redeemed member opens the SAME vault, fragment-only secret, owner sender X25519 key resolved server-side; (2) a reachable Vault-Settings "Access & Members" surface with server-side role authorization, dead People-page hardcoding removed, People keeps financial semantics with at most an optional membership-link display; (3) member removal wired to the EXISTING preserved `membership.remove` + `membership.rekey` path only — NOT new epoch machinery; (4) idempotent auto-Person-per-user keyed on the stable pubkey hash, optional user id, optional `Person.name` with a centralized non-identifying display resolver, financial state untouched; (5) real unit/property/integration tests plus a two-user E2E over the REAL invite UI; (6) all gates green. D-013's linked-hybrid data model (Vault Settings authoritative for Members/Invites; People = encrypted financial state with optional membership link) STANDS as frozen-traceable. The excised epoch / per-epoch-envelope / `exact_operation_id` / fence / journal / rotation / causal-repair / saga / backfill machinery maps to NO frozen requirement; it is a losslessness/crash-safety hardening of an already-existing rekey capability, invented by the P07 ADR from a self-imposed member-removal/forward-secrecy ambition the frozen text does not state. It is future-work with NO frozen mandate and MUST NOT be spun into a new goal package; it is recorded as optional, undelivered, no-frozen-basis, dormant unless a future human requirement introduces forward-secrecy-on-removal.
- **Security, data, UX, and compatibility impact:** The only genuine security defect in the current code — the placeholder redemption that prevents an invitee opening the real vault — is FIXED by the core. Removed members lose future-envelope access at the strength the preserved remove+rekey path already provides (even the full contract concedes it cannot erase already-downloaded copies, so it delivers no true forward secrecy either). The P04 `vault_ops` / P05 realtime / RLS boundaries stay preserved; no boundary-change Q-approval is issued. No security defect against the frozen intent remains once items 1-6 ship.
- **Reversal/migration path:** If a future frozen requirement introduces forward-secrecy-on-removal, reopen with an independently reviewed ADR carrying the explicit `vault_ops` boundary-change authorization, built on the linked-hybrid data model retained here. Never destructively alter the preserved boundary or the existing remove+rekey path on reversal.

## D-019 — Q-P20B-00 pruneBuckets merge-safety engine fix is OUT-OF-GOAL; only the HS-016 marketing-copy correction is in-goal

- **Date:** 2026-07-30
- **Package / scope:** P21 rev-05 audit finding M-1 -> engine Q-P20B-00 vs P20A/HS-016 copy
- **Status:** accepted (independent scope adjudication)
- **Evidence:** Fresh-context opus-tier scope adjudication `reviews/P21-scope-adjudication-05.md` (commit `f290246`), by `p21-scope-adjudicator-05` -- a DISTINCT reviewer, never the P20A/P20B/P21-05 implementer or reviewer. Ruled from frozen `sourceTextLines` only, per PROCESS.md:335-347, defaulting to block standing. Load-bearing facts, re-derived from frozen text: `pruneBuckets` (`src/lib/crdt/mutations.ts:287-329`, `delete store[accountId]` at :327) lives in the transaction-container lifecycle (delete/move/duplicate/import) and is NEVER reached by an allocation edit; the only frozen concurrency requirement is FS-001 allocation-map scope (`spec.md:451,452,628-629,703` -- all qualified by "person"/"different people"/"person allocations"), a different capability that the rev-05 reviewer independently verified IS delivered (16/16 gates, per-key map mutation).
- **Alternatives:** (a) rule ENGINE-FIX-REQUIRED-IN-GOAL and reopen a package to redesign container pruning for merge-safety [rejected: no frozen `sourceTextLine` requires transaction-lifecycle merge-safety]; (b) rule OUT-OF-GOAL and route only the copy correction [selected]; (c) self-adjudicate or pause for the human [barred by PROCESS.md:336-337].
- **Decision and reason:** The `pruneBuckets` merge-safety redesign is OUT-OF-GOAL. No frozen text commits transaction-lifecycle merge-safety; the `FINAL-AUDIT.md:90` "converge without lost changes" clause is root-authored audit text whose only frozen anchor is FS-001's allocation-scoped :703, so generalising it to any transaction insert-vs-prune loss is an over-scope per PROCESS.md:330-333. `p20b-reviewer-01 §6.1` (deferral of the engine fix) is UPHELD, not superseded. The ONLY in-goal work from M-1 is the P20A/HS-016 truthful-marketing-copy correction at `FeaturesSection.tsx:65` -- more work to complete committed scope, no adjudicator required for the copy itself.
- **Security, data, UX, and compatibility impact:** Q-P20B-00 remains a genuine, tracked data-loss risk -- a concurrent peer's transaction insert can be discarded when a container is pruned on CRDT merge. It is routed to a future out-of-goal scoped CRDT package (make container pruning merge-safe, or stop pruning containers, with regression tests over the two reproduced two-peer scenarios). It is NOT spun into a new goal package. No frozen-intent defect remains in-goal once the HS-016 copy is softened to be truthful.
- **Reversal/migration path:** If a future frozen requirement introduces transaction-lifecycle merge-safety, reopen with an independently reviewed ADR owning the `pruneBuckets` redesign. The out-of-goal routing here does not fix or mask the risk; it records it for future work.

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

## D-020 — UR-001..UR-004 admitted to committed scope via a new frozen source; human-scratch.md untouched

- **Status:** accepted
- **Date:** 2026-07-30
- **Authority:** explicit in-session instruction from the human principal, the owner of this goal's
  committed scope.

**Decision.** Four user-reported refinements are admitted as first-class requirements of this goal:
UR-001 (add transaction focuses the description instead of selecting the row), UR-002 (transaction
search matches alias-resolved descriptions), UR-003 (presence avatars show member name initials),
UR-004 (default currency inferred from time zone). Each gets an owning package — P22, P23, P24, P25 —
requiring full implementation and a DISTINCT independent review, exactly like every other package.

**Why no scope adjudicator.** PROCESS.md:335-347 bars root from self-adjudicating a scope call and
requires a distinct fresh-context adjudicator when resolving an over-scope would REDUCE committed
scope or supersede a prior accepted decision. Neither applies: this is an EXPANSION of committed
scope directed by the principal who owns that scope. Root is recording an instruction, not ruling on
one. Nothing previously accepted is withdrawn and no requirement loses its `passed` status.

**Why a new frozen source rather than editing the scratch file.** `specs/human-scratch.md` is frozen
at working-copy SHA `b91ca932…`; `SCOPE.json` selects 21 ordered top-level blocks from it (lines
151-350) and permits exactly ONE edit — the leading `- []` -> `- [x]` marker flip — with rolling
whole-file hashes. Editing it to add requirements, or retroactively widening the selector to cover
earlier lines, would break the freeze that all 22 original requirements were validated against and
invalidate every recorded rolling-SHA chain. So the scratch file was NOT touched: it remains at
rolling SHA `469e98c7…`, 24,260 bytes, 43 checked / 0 unchecked, all blocks normalized-matching
SCOPE. The four requirements live in a NEW frozen source,
`specs/009-user-reported-refinements/spec.md` (SHA-256 `6d163635…`, 98 lines, 5,610 bytes), added to
`SCOPE.json#sources` as `SRC-USER-REPORTED-REFINEMENTS`. `requirementCount` 22 -> 26.

**Completion mechanic.** All four are markerless and immutable (`immutableNoSourceMutation`), the
FS-001 mechanic: no checkbox, no source edit, completion recorded only in the requirement and package
ledgers after independent review. This keeps the marker/rolling-SHA machinery exclusively bound to
the scratch file and its 21 blocks.

**Note on UR-004.** This supersedes the rationale asserted in `src/lib/domain/detect-currency.ts:4-6`
("more reliable than timezone because locale directly encodes cultural/regional preferences"). That
was a code comment, not a recorded decision — no accepted decision is being overturned. It is
empirically refuted: the reporting user runs `LANG=en_US.UTF-8` in `Australia/Brisbane`, so locale
yields USD while time zone yields the correct AUD, and `en-US` is the default locale on most Linux
installs and container images. The implementing package must correct that comment so it does not
contradict shipped behaviour.

**Consequence — P21 rev 06 voided.** P21's entry conditions require every feature package passed.
Admitting four queued packages invalidated the in-flight audit, so root stopped `p21-collector-06`
and verified it had written no evidence and committed nothing; the tree was unchanged. P21 returns to
`queued` with no revision consumed and no failed-review artifact, since no review occurred. Rev 06
will be re-opened from a fresh BASE over all 25 feature packages after P22-P25 pass.

**Reversal path.** Removing any UR requirement means deleting its SCOPE entry, its ledger rows and
its package, and restoring `requirementCount`. That WOULD be a scope reduction and would require the
independent scope adjudicator per PROCESS.md:335-347.

## D-021 — UR-005..UR-008 admitted via a second frozen source; scratch and prior sources untouched

- **Status:** accepted
- **Date:** 2026-08-01
- **Authority:** explicit in-session instruction from the human principal, owner of committed scope.

**Decision.** Four further user-reported refinements are admitted as first-class requirements:
UR-005 (minimal transaction-table chrome at rest), UR-006 (vault members listed by name), UR-007
(dates in the browser's locale), UR-008 (CSV/OFX import parity and honest import counts). Owning
packages P26, P27, P28, P29, each requiring full implementation and a DISTINCT independent review.

**Mechanism, identical to D-020.** `specs/human-scratch.md` is NOT edited and stays frozen at
working-copy `b91ca932…` / rolling `469e98c7…`. A NEW frozen source
`specs/010-user-reported-refinements-2/spec.md` (SHA `a137e388…`, 86 lines, 4,902 bytes) is
registered in `SCOPE.json#sources` as `SRC-USER-REPORTED-REFINEMENTS-2`; `requirementCount` 26 -> 30.
All four are markerless and immutable (`immutableNoSourceMutation`) — the FS-001 mechanic — so the
marker and rolling-SHA machinery stays bound exclusively to the scratch file's 21 blocks. Frozen
`sourceTextLines` were verified byte-identical to the spec file at each section range.

**No scope adjudicator required.** This is an EXPANSION directed by the principal who owns the
scope, not a reduction and not the superseding of a prior accepted decision. PROCESS.md:335-347
governs the latter cases. Removing any UR requirement later WOULD be a reduction and would require
the adjudicator.

**Measured finding backing UR-008.** Root read the principal's CSV read-only and established the
reported errors' root cause: `parseAmount` at `src/lib/import/csv.ts:165-190` has no branch for a
leading `+`, and the file contains exactly 15 such rows, matching the 15 errors reported. Ten further
rows carry a quoted description containing a comma. Neither file's contents are committed; fixtures
must be synthetic. Open ambiguities are recorded as Q-UR008-01..03 with the safest reversible choice
taken in each case, per the no-pause rule.

**Revised tallies: 22 of 30 requirements `passed`; 21 of 29 feature packages `passed`.** Completion
now additionally requires P26-P29.
