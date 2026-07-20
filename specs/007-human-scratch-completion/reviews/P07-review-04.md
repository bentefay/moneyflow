# P07 Independent Review — Revision 04

## Verdict

**PASS.** Revision 04 closes both revision-03 findings and preserves every previously sound
requirement. The contract now distinguishes permanent peer-specific Loro operations from semantic
saga/repair completion, binds repair to the exact observed claim set and imported causal frontier,
and links the returned owner membership to the established `person-default-me` in place.

No operation can be acknowledged because another peer proposed the same values. Ordinary retry
requires the exact stored identity, metadata and ciphertext; epoch transition preserves the exact
operation identity and may return `covered` only for the exact source operation proven by the
authenticated rotation manifest. Every other transition replacement must become the sole permanent
current-epoch row before source cleanup. Semantic receipts are monotonic sets of permanent exact
operation ids and never mark a local row pushed. Startup independently scans every local operation,
so a stale receipt cannot hide a late or response-lost update.

The repaired Person-link contract is also complete. New-vault creation authenticates the canonical
initial snapshot before SQL creation, requires exactly one active `person-default-me`, requires
`account-default` ownership to be exactly `{ "person-default-me": 100 }`, enumerates every Person
reference, and blocks malformed or dangling state. After the server returns the stable owner UUID,
the client updates that existing Person and reciprocal maps in one fenced Loro transaction. It does
not create the revision-03 UUIDv5 owner duplicate, rewrite ownership or silently delete/merge a
referenced Person.

The retained Q-014 envelope-history design, revision-03 cross-tab admission fence, capability
preflight, fragment lifecycle, SQL/client saga boundary, membership generations, privacy model,
migration/reversal/export requirements, all 29 P08 clauses and their real-browser proof directions
remain intact. There are no findings and no new Q proposal.

This PASS approves the P07 architecture/contract only. P08 is still **not dispatch-ready** until
root performs the separate D-011/P05 supported genuinely-hidden-topology recheck. HS-011 and HS-012
also remain unchecked until every mapped package, including P08, independently passes.

## Immutable review boundary

- Package/revision/scope: `P07/04`, HS-011 architecture with integrated HS-012 contract.
- Literal original BASE: `fe1871ce7dce1e831b57ee5656d38ce5c800aae3`.
- Literal reviewed HEAD: `dfffea3c19b110b6021b050b8d9e36b01ae75ab9`.
- HEAD remained exact. Revision 04 added no product, test, migration, configuration or dependency
  commit.
- The cumulative range contains only root-owned P07 evidence/reviews and control-ledger/question/
  risk history in commits `892bf53`, `033cb8f`, `51cf5ba`, `55bc57e`, `196b190` and `dfffea3`.
- Frozen revision-04 evidence:
  `specs/007-human-scratch-completion/evidence/P07/implementation-04.md`, independently verified
  SHA-256 `313ce10cfd75c25f26d6a75f9c8785bd95f2e213e48285c4e745cde7ecce93c6`, 1,019 lines and 89,865
  bytes.
- Prior immutable hashes remain exact: revision-01 evidence
  `2e5173cdf1df4fac4de3b64ecb2887a3c70a00d387e36298f5c9eb8eaa1164ad`, revision-01 review
  `296a5d0a17e2e1ae882422c3975d11c9ffc289c0a273ac52fb50e23af8b8381e`, revision-02 evidence
  `463c9139e76a65542c49ad3ef62212571e9d59cf7c198a81dbd864a9b419a85f`, revision-02 review
  `3f74108cff1bfc48fa49d0fe0e217f6ba491789851932ed229c94ffe93f6c4e3`, revision-03 evidence
  `e071c6b240c7907f6814425f7da4dcb25f02e87b95522d9c6c95e953d85ddfbb`, and revision-03 review
  `af4857061be4e637b31b4a4ac682a1fb17e0b1fd8836b84d846b16eb8a80bff0`.
- Before this artifact, the index was empty and Git-visible state was exactly root-owned unstaged
  `HANDOFF.md`/`PROGRESS.md` plus the assigned untracked revision-04 evidence. The reviewer changed
  only this assigned review file and made no commit.

## Revision-03 finding closure

### Prior F-001 — closed — exact operation permanence is separate from semantic completion

The corrected identity split is explicit and enforceable:

1. Each actual peer/fork incremental update gets a generated-once exact operation id during durable
   admission. Distinct exported bytes necessarily have distinct ids and both remain permanent
   (`implementation-04.md:158-178`).
2. The admitted local row binds exact id, transport id, author/source, epoch, peer/frontier/version
   metadata, ciphertext/digest and `pushed=false`. Retry reuses those stored bytes; it never emits
   an allegedly equivalent replacement (`:172-178`).
3. Server uniqueness is `(vault_id, exact_operation_id)`. A repeated id is acknowledged only for the
   exact permitted author/source/epoch form, frontier/version metadata and ciphertext binding; a
   mismatch is an unacknowledged collision (`:180-187`).
4. Re-encryption during a continuously authorized epoch transition preserves the exact operation id
   and source binding. If the rotation manifest contains that exact source operation, the result is
   `covered`; otherwise the stored target ciphertext must be inserted and acknowledged before the
   old row/key can be cleaned up (`:214-218`, `:331-365`).
5. A semantic creator, acceptance or repair receipt is separate. It expands to every reported exact
   permanent id but cannot acknowledge an operation, delete an unpushed row or suppress startup's
   local-row scan (`:189-208`).

This closes the revision-03 same-value alias. The independent Loro probe again started two documents
from the same snapshot, fixed peer ids 1 and 2, assigned the same map value and exported incremental
updates. Both updates were 102 bytes and byte equality was false. Revision 04 requires separate
exact ids, response loss after both inserts, exact retransmission, both permanent rows, both
`pushed=true` states and a semantic receipt containing both ids for creator, same-acceptance and
repair emitters. Equal JSON is expressly insufficient (`:198-208`).

The transition collision/retransmit rules are closed under rotation. A source operation that was
already permanent is part of the locked exact operation set and authenticated target snapshot, so
only that exact manifest member can be `covered`. An unpushed source operation is absent from the
manifest and must use its persisted current-epoch replacement. A lost response then retransmits the
same target form. Different peer ciphertext, semantic keys or desired values cannot enter either
branch.

### Prior F-001 causal-repair consequence — closed — late claims force a newer round

Each encrypted membership claim records its exact claim-operation id. Before repair, the client
imports permanent operations through a watermark and records the sorted relevant claim ids, opaque
claim-set commitment and imported Loro causal frontier F. The semantic round id binds those values,
the winner and sorted losers; every repairing peer emits its own exact operation causally after F
(`implementation-04.md:657-696`).

Completion requires the document frontier to dominate every named claim and repair operation, the
server watermark to be pulled, every locally emitted row to be permanent, and the post-merge
bijection to hold. An already dominated identical claim frontier emits no extra round. A stale claim
published only after R necessarily contributes a previously absent exact claim id and causal
version, so it forms R+1 and requires a new exact repair operation after that claim. R's semantic
receipt cannot cover it (`:688-704`).

The winner's intended financial Person and every allocation/history field are preserved. Each loser
gets one reserved-namespace deterministic fallback Person, reciprocal maps are repaired together,
legacy namespace collisions block explicit migration repair, and the flow remains `Finishing setup`
until exact permanence/frontier/bijection checks pass. This gives both the required causal progress
and the required zero-oscillation/quiescence condition.

### Prior F-002 — closed — canonical default Person and references are preserved

The default creator SQL transaction is idempotent on `(caller_pubkey_hash, initial-default)` and
returns one vault, owner membership, envelope, opaque initial snapshot and reconstructible truth to
every concurrent attempt (`implementation-04.md:579-601`). Explicit additional-vault creation uses a
different purpose/idempotency key, but every new-vault entry point uses the same canonical snapshot
validation and owner-link rule (`:589-594`).

Before creation, the client authenticates the snapshot and requires exactly one active
`person-default-me`, active `account-default`, exact 100% ownership to that Person, and a complete
non-dangling Person reference graph. Missing defaults, a second Person, malformed ownership or a
dangling reference blocks creation for explicit repair without synthesis, deletion, merge or silent
reallocation (`:603-609`).

After SQL truth, one fenced Loro transaction updates `people["person-default-me"]` in place and
writes `membershipLinks`, `personMembershipLinks`, reciprocal claim/winner and `linkedMembershipId`.
It retains the id, `Me` name, account ownership, allocations and all references, and expressly
forbids a UUIDv5 creator Person (`:611-620`). Success additionally requires every locally emitted
exact creator update permanent, the authenticated reference invariant, and durable selection
(`:620-632`).

This matches the executable constructor: `DEFAULT_PERSON_ID` is `person-default-me`,
`DEFAULT_ACCOUNT_ID` is `account-default`, the account ownership is exactly 100% to that id, and
every new default state includes both (`src/lib/crdt/defaults.ts:49-88`, `:147-166`). The required
two-tab proof inspects ids and reciprocal maps, unequal peer bytes, all exact operation ids, one SQL
truth, one Person, exact ownership, all references, no UUIDv5 duplicate, reload/crash recovery and
malformed-snapshot denial (`implementation-04.md:643-655`).

## Q-014, security and feasibility adjudication

| Area                       | Independent adjudication                                                                                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Linked-hybrid authority    | Sound. Vault Settings remains the sole access authority; People remains encrypted financial state with an optional membership status/deep link.                                              |
| Authenticated envelopes    | Sound. Exact-length/versioned sender-recipient `crypto_box` envelopes remain the only vault-key convention. Fragment-derived Ed25519 is capability proof only.                               |
| Continuous authorization   | Sound. Historical reads require the active exact membership generation and uninterrupted epoch interval. Removal and later re-add cannot regain unauthorized old keys.                       |
| Rotation transaction       | Sound. Locked epoch, watermark, exact permanent-operation set, recipient set and invites make concurrent append or membership drift abort the whole rotation.                                |
| Local admission fence      | Sound and unchanged. Isolated-fork mutation, same-IDB-store admission/seal serialization, journal revision CAS and terminal minimum epoch prevent live-before-durable or stale-epoch append. |
| Exact operation transition | **Corrected and sound.** Every peer update retains its exact identity; response loss is exact retransmission; manifest coverage cannot alias another peer or semantic outcome.               |
| Semantic receipts          | **Corrected and sound.** Receipts are monotonic sets of proven permanent exact ids and do not control local push state or startup scanning.                                                  |
| Capability/preflight       | Sound. Exact UUID/X25519 pair, domain-separated secret proof, snapshot binding, generic failure, `no-store`, rate limits and least fields avoid plaintext and enumeration.                   |
| Fragment/onboarding        | Sound. The fragment remains URL-fragment/client-memory only until durable SQL truth, then is cleared/zeroized. Invite-aware registration defers default creation.                            |
| SQL/client boundary        | Sound. SQL establishes idempotent acceptance/creation truth but never claims atomic encrypted CRDT Person mutation; protected pending reads reconstruct the client saga.                     |
| Default creator            | **Corrected and sound.** One SQL truth links the returned owner to canonical `person-default-me` without duplicate Person, ownership rewrite or dangling reference.                          |
| Distinct claims            | Sound. Converged encrypted winner plus frontier-bound loser repair preserves the intended Person/history and gives each loser one deterministic Person.                                      |
| Privacy/display            | Sound. Person intent/profiles/claims remain encrypted and non-authoritative; no plaintext global profile or raw/truncated key label is introduced.                                           |
| Migration/reversal/export  | Sound. Exact identities, receipts, fences/journals, epoch history, claim frontiers and canonical reference graph are retained; old binaries without the fence cannot write.                  |
| P08/D-011 gate             | Sound. Revision 04 explicitly refuses dispatch readiness until independent P07 approval and the separate supported-hidden-topology recheck. This PASS satisfies only the first condition.    |

The locally self-wrapped Q-014 alternative remains unselected. Server-held encrypted envelope
history plus ciphertext-only local journals is lossless for crashed/offline continuously active
devices without persisting plaintext operations or keys. Removed and re-added tenures receive no
historical envelope beyond their authorization interval. No new Q proposal is required.

## Complete 29-clause adjudication

All 29 clauses remain mandatory and feasible. Revision 04 tightens clauses 14, 16 and 22 without
weakening the other 26 clauses or their proof directions.

| Clause | Verdict             | Review                                                                                                                                                                                                          |
| -----: | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    1–5 | sound               | Discoverable authority, owner/member/outsider matrix, server-derived signed caller, member-only governance and least-field normalized failures remain complete.                                                 |
|   6–13 | sound               | Fragment secrecy, domain-separated real-key capability, tamper/replay binding, epoch revocation, pre-SQL snapshot authentication, real self-envelope, failure atomicity and fragment lifecycle remain complete. |
|     14 | **corrected/sound** | Invite-aware onboarding defers default creation; creator truth links exact `person-default-me`, retains exact ownership/references and waits for every emitted exact link operation.                            |
|     15 | sound               | Masked links, explicit Copy confirmation and visible expiry/revoke remain required.                                                                                                                             |
|     16 | **corrected/sound** | Exact operation id, immutable retransmit binding, peer/frontier/version metadata and legacy per-row backfill are separate from saga/repair ids.                                                                 |
|  17–21 | sound               | Complete authenticated rotation state, atomic server advance, lossless fenced client transition, removed-member denial and generation-scoped re-add remain complete.                                            |
|     22 | **corrected/sound** | Every peer update is permanent; repair is causally after exact observed claims; default creation preserves canonical Me/account references; SQL never mutates encrypted CRDT state.                             |
|  23–26 | sound               | Encrypted optional identity data, safe display fallback, financial-history preservation and non-authoritative profiles remain complete.                                                                         |
|  27–29 | sound as P08 gates  | Keyboard/focus/status semantics, honest recoverable finishing states and desktop/mobile/dark/reduced-motion/200%-zoom coverage remain mandatory. Current known regressions are not misrepresented as passing.   |

The clause-to-proof table explicitly requires byte/id permanence and response-loss coverage for
creator, same-acceptance and repair peers; a stale claim released after repair acknowledgement;
exact canonical Person/account/reference inspection; real owner/invitee/removal journeys; multi-tab
epoch crashes; migration/security/redaction checks; retries disabled; and responsive installed-CLI
proof. No mock transport, service membership fixture, direct hidden route, forced action, sleep or
test-only crypto bypass is allowed.

## Independent automated and CRDT validation

| Check                                                        |                       Independent result |
| ------------------------------------------------------------ | ---------------------------------------: |
| exact original range/path and immutable-hash audit           | passed; root control/artifact paths only |
| revision-04 artifact `oxfmt --check` and `git diff --check`  |                                   passed |
| focused invite/keywrap Vitest                                |                    2 files, 39/39 passed |
| typecheck                                                    |                                   passed |
| fresh migrations 005–009                                     |                                   passed |
| current RLS/invite/rekey pgTAP                               |                             97/97 passed |
| accounts + Realtime E2E, workers 1, retries 0, repeat each 2 |              16/16 passed in 1.1 minutes |
| two-peer same-value Loro update probe                        |      both 102 bytes; byte equality false |

The green repository tests remain current-state regression checks. They do not execute the proposed
P08 exact-operation schema, admission fence, epoch transition, capability acceptance, creator saga
or causal repair. Revision 04 correctly specifies those as mandatory implementation proofs rather
than treating inherited tests as evidence that the future protocol already exists.

## Installed headless CLI and UX evidence

The reviewer used repository-installed `playwright-cli` in disposable headless session
`p07-review04`. The successful clean run used the local Supabase Realtime container's configured API
JWT secret without printing it. The generated recovery phrase stayed inside the disposable browser
and was never printed or copied into review evidence.

- Normal first-user onboarding reached `Vault Settings`. Its accessibility tree exposed Vault Name
  and Default currency, but no Access, Members, Invite, Copy, Revoke, Remove or Rekey action.
- People exposed one `Me`, Add Person, Edit/Delete and the inherited collaboration copy. Activating
  Add Person focused its textbox, confirming the action remains financial rather than membership
  governance.
- The successful session had zero console errors. All observed application/API requests were 200,
  including register, current separate vault create/snapshot, list/sync and Realtime authorization;
  no invite, roster, removal or rekey request occurred.
- At 390×844 with dark scheme and reduced motion, People and its actions remained exposed, both
  media preferences were active and document horizontal overflow was false.
- At exact 200% CSS zoom, `Me` again lost its accessibility reference. The mobile drawer exposed
  Vault Settings, but a normal click timed out because the link remained outside the viewport. No
  forced action or direct navigation hid this inherited clause-29 defect.
- There is still no legitimate member/outsider/invite/removal/rotation UI journey at this HEAD. The
  review did not invent one. P08 must implement and prove the contract before those clauses pass.

An initial disposable reviewer setup decoded the local JWK in the wrong form, leaving the app JWT
secret unavailable and producing the expected Realtime authorization 500. The reviewer stopped that
server, closed/deleted the browser state, reset the database and reran from clean state with the
container's exact configured API secret. It was a validation-setup error, not a product result; the
clean run above is the independently assessed journey.

## P08 gate and root acceptance action

P07 revision 04 may now move from `reviewing` to `passed` after root freezes this review and
verifies its hash/write boundary. Root should retain the exact-operation, causal-repair and
canonical-default contract as the complete P08 acceptance authority.

P08 must not be dispatched merely because P07 passed. Root must first perform and durably record the
D-011/P05 no-product recheck demonstrating a supported genuinely hidden topology. If that recheck
does not satisfy the existing gate, P08 remains blocked under its current dependency decision. No
P08 product implementation, scratch marker or rollback action is authorized by this review alone.

## Cleanup and frozen-source invariants

- The CLI session was closed and the development server stopped. Generated `.playwright-cli` and
  `test-results` directories were moved to desktop trash, and generated `next-env.d.ts` drift was
  restored exactly. No Next development server or assigned CLI session remained.
- A final `pnpm db:reset` applied migrations 005–009. Aggregate checks showed zero rows in
  `auth.users`, `public.vaults`, `public.vault_memberships`, `public.vault_invites`,
  `public.vault_ops`, `public.realtime_grants` and `realtime.subscription`.
- The index remained empty and HEAD remained `dfffea3c19b110b6021b050b8d9e36b01ae75ab9`.
- Rolling scratch SHA-256 remains
  `753be6b73d1086a35659e1416d9f6c183e61107c72a91aeaa55a13344bf96578`, 350 lines and 24,244 bytes.
  Exactly 21 ordered blocks normalize byte-for-byte to SCOPE; the checked set is exactly
  HS-002/HS-010/HS-014/HS-017/HS-018.
- Immutable FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines and 25,441 bytes.
- Immutable `SCOPE.json` remains SHA-256
  `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines and 27,382 bytes.

Root should freeze this PASS review, record no finding and no Q proposal, mark P07 passed after the
exact artifact boundary is integrated, keep HS-011/HS-012 unchecked, and perform the D-011/P05
recheck before any P08 dispatch.
