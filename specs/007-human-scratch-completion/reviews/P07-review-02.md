# P07 Independent Review — Revision 02

## Verdict

**FAIL.** Revision 02 correctly replaces the impossible SQL/CRDT transaction with durable SQL
acceptance truth plus a reconstructible encrypted client saga. It also correctly selects
authenticated `crypto_box`, access-generation-scoped envelope history, exact rotation serialization,
stable operation lineage, fragment-only pre-SQL recovery and deterministic deferred-default
onboarding. Those changes close the central form of revision-01 F-002 and most of F-001.

The lossless transition is still incomplete across real sibling tabs. A leader freezes and
enumerates the currently durable old-epoch operations, but no persistent write fence is installed
and checked atomically by every local-operation append. A stale/unobserving sibling can therefore
append a new `pushed=false` old-epoch operation after enumeration and before adoption/cleanup. The
leader never maps that operation, the server rejects it under the old epoch, and the completed
transition may remove its only ciphertext. This is the same forbidden financial-data-loss class as
revision-01 F-001.

The purported complete restatement also drops the unaffected requirement that vault creation link
the default owner Person to the owner membership UUID. Its clause 22 and proof map now cover only
invite acceptance, despite HS-012 explicitly requiring both vault creation and invitation
acceptance. Finally, two distinct valid invitations can concurrently target the same encrypted
unlinked Person. Each acceptance writes a different forward membership link to that Person while the
single reciprocal fields converge by LWW to only one membership; the other acceptance enters
`repair-required` instead of automatically obtaining its required Person. Same-acceptance tab
idempotency does not solve distinct-invitation contention.

P07 therefore remains `changes_requested`. Revision 03 may remain evidence-only, must preserve all
sound revision-02 decisions, and must add the exact cross-tab transition fence, creator-link saga
and distinct-invitation Person-claim convergence described below. P08 remains non-ready and
separately blocked by the D-011/P05 genuinely-hidden-topology recheck.

## Immutable review boundary

- Package/revision/scope: `P07/02`, HS-011 architecture package with the integrated HS-012 contract.
- Literal original BASE: `fe1871ce7dce1e831b57ee5656d38ce5c800aae3`.
- Literal reviewed HEAD: `033cb8f6d37208c1ba6ac0b0907672aa18e4ad6d`.
- HEAD remained exact throughout review. Revision 02 has no product/test/migration/configuration/
  dependency commit.
- The cumulative range contains only root-owned revision-01 artifact/control history: `HANDOFF.md`,
  `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, immutable `implementation-01.md`, and immutable
  `P07-review-01.md` in commits `892bf53` and `033cb8f`.
- Frozen revision-02 evidence:
  `specs/007-human-scratch-completion/evidence/P07/implementation-02.md`, independently verified
  SHA-256 `463c9139e76a65542c49ad3ef62212571e9d59cf7c198a81dbd864a9b419a85f`, 686 lines and 60,110
  bytes.
- Immutable revision-01 evidence SHA-256 remains
  `2e5173cdf1df4fac4de3b64ecb2887a3c70a00d387e36298f5c9eb8eaa1164ad`; immutable revision-01 review
  SHA-256 remains `296a5d0a17e2e1ae882422c3975d11c9ffc289c0a273ac52fb50e23af8b8381e`.
- Before this artifact, the index was empty and Git-visible state was exactly root-owned unstaged
  `HANDOFF.md`/`PROGRESS.md` plus the assigned untracked revision-02 evidence. The reviewer changed
  only this assigned new review file and made no commit.

## Findings

### F-001 — Critical — transition planning is not an atomic cross-tab write fence

The revised state machine says every tab stops writes only **once it has observed** the newer server
epoch (`implementation-02.md:174-179`). Its planned step then enumerates the current old-epoch
`pushed=false` set in one IndexedDB transaction (`:196-202`). Adoption later switches the local
epoch and cleanup removes superseded old ciphertext (`:220-227`). Nothing requires the planned
transaction to install a durable per-vault fence that every subsequent local-operation persistence
transaction must check.

The missing interval is executable:

1. Tabs A and B share one vault and IndexedDB. B remains open with the old document/key/epoch but
   has not yet observed `EPOCH_ADVANCED`.
2. A observes the new epoch, becomes transition leader and atomically enumerates old unpushed set
   `S`.
3. B commits a legitimate local Loro edit after that enumeration. Under the established sync
   contract, its callback encrypts and immediately appends a fresh `pushed=false` record; this is an
   independent IndexedDB write (`src/lib/sync/manager.ts:229-269`,
   `src/lib/sync/persistence.ts:193-215`). B need not publish before the race exists.
4. A materializes and publishes only `S`, adopts the current snapshot and completes cleanup. B's new
   old-epoch lineage is not in the journal or acknowledgement set. Its eventual server publish is
   correctly rejected, but the contract gives no mandatory late-old-lineage scan or transition
   restart. Cleanup can delete the only ciphertext capable of recovering the edit.

Broadcast observation or a leader lock alone is insufficient because neither is atomic with B's
local persistence transaction. A process can be suspended between mutating its in-memory document
and persisting its callback, and a same-identity sibling can hold a stale manager after another tab
advances shared local epoch state.

Revision 03 must require a persistent per-vault transition/write fence installed in the same
IndexedDB transaction that seals the planned old-lineage set. Every local append must read and obey
that fence and current local epoch in its own write transaction. A racing append must either commit
before the seal and be included, or be rejected/deferred without changing the document, or
atomically extend/reopen the journal before any adoption. Completion must transactionally prove
there is no unmapped `pushed=false` source-epoch lineage before cleanup and must prevent a stale tab
from later persisting an old-epoch update after local epoch advance.

Mandatory proof must use at least two real same-vault tabs with an injected pause on both sides of
the planning transaction: append-before-seal is included once; append-after-seal cannot become an
unmapped old op; crash/reload at the fence, append and adoption boundaries preserves the edit once;
and a stale tab after completion cannot write or publish old epoch. This is additional to the
server-side concurrent-append retry, which revision 02 already specifies correctly.

### F-002 — High — the complete clause set drops automatic owner-Person linkage on vault creation

HS-012's package contract explicitly requires: “On vault creation and invite acceptance,
idempotently ensure one linked Person for that member” (`tasks/HS-012-auto-person-link.md:21-24`).
Revision-01 clause 22 contained both branches: “Vault creation links the default owner Person to the
returned owner membership UUID” and invite acceptance links or creates its Person
(`implementation-01.md:312-316`).

Revision 02 says it restates the full corrected contract and retains unaffected clauses, but revised
clause 22 now begins only with “Acceptance is the explicit two-boundary protocol”
(`implementation-02.md:493-498`). The corresponding proof row covers response loss, acceptance
crashes and concurrent acceptance tabs only (`:548`). Schema migration safely links a legacy `Me`
for a sole owner (`:613-616`), but backfill is not a creation-time invariant for a new vault.

The currently green accounts journey proves merely that a new vault has a `Me` Person. It does not
prove that Person is linked to the SQL owner membership UUID, remains unique across a lost response,
or is recovered after a crash between SQL vault/membership creation and encrypted CRDT durability.

Revision 03 must restore a feasible, durable creator protocol. It may atomically include a
client-deterministic owner membership UUID in the encrypted initial document if SQL validates that
identity, or use protected server creation truth plus a reconstructible creator reconciliation saga.
In either design, no vault-creation success is shown before exactly one active default Person and
both reciprocal membership links are locally durable and server-synced. Tests must cover response
loss, refresh, concurrent creator tabs, crash before/after snapshot/op persistence and repeated
creation calls without a duplicate Person or vault.

### F-003 — High — distinct invitations can concurrently claim one encrypted Person and strand a member

The acceptance saga treats an intent naming a currently unlinked Person as authoritative and writes
three encrypted CRDT fields: `Person.linkedMembershipId`,
`membershipLinks[membershipId] = personId`, and `personMembershipLinks[personId] = membershipId`
(`implementation-02.md:365-372`). Different accepted users have different membership UUIDs, so two
concurrent invitations targeting the same Person produce two non-conflicting forward-map keys but
conflicting single reciprocal values. Loro converges those reciprocal values to one winner; it does
not delete the losing forward link or create a Person for the loser.

The artifact explicitly sends conflicting reciprocal state to `repair-required` and preserves it
(`:370`, `:386-391`). That is safe from silent deletion, but it violates HS-012's automatic
one-Person invariant and clause 28's promise that valid acceptance can finish. The proof map tests
concurrent tabs for one acceptance, not two distinct current invites with the same opaque Person
intent (`:548`, `:566-568`). Server SQL cannot prevent the collision because Person intent is
correctly opaque.

Revision 03 must define encrypted client-side Person-claim convergence. The narrow reversible
default is: keep the winning reciprocal claim on the intended Person; once CRDT convergence shows a
losing/non-reciprocal membership link, preserve the intended Person and deterministically create the
loser's `(vaultId, membershipId)` Person, repair only that membership's forward/reciprocal fields,
and keep `Finishing setup` until the repaired lineage is durable and synced. An encrypted invitation
reservation may prevent most collisions but cannot replace post-merge reconciliation. Tests must
create two valid invitations with the same Person intent in isolated/concurrent clients and prove
two memberships, two active Persons, a bijective link set, no overwritten financial history and no
permanent repair-only finishing state. Same-invite retry/concurrent-tab tests remain mandatory.

## Q-014 and security/data-flow adjudication

| Area                             | Adjudication                                                                                                                                                                                                                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Linked-hybrid authority          | Sound. Vault Settings remains authoritative for Members/Invites; People remains encrypted financial state with optional status/deep link.                                                                                                                                                                          |
| Membership tenure/history        | Sound. Signed active caller, exact current `access_generation`, uninterrupted epoch interval and increment-on-readd prevent removed or re-added tenure from acquiring unauthorized history.                                                                                                                        |
| Envelope primitive               | Sound. Authenticated sender/recipient `crypto_box` is the sole envelope convention; exact key/version checks, client-only key handling and zeroization align with repository crypto rules.                                                                                                                         |
| Rotation transaction             | Sound. Locked epoch, watermark, exact lineage/recipient/invite sets and serialization with op append close the server acceptance race; changed state aborts the entire rotation.                                                                                                                                   |
| Local operation lineage          | Sound within one sealed set. Stable lineage plus generated-once transport id and durable `covered`/`inserted` acknowledgement prevent response-loss duplication and preserve exact Loro bytes.                                                                                                                     |
| Cross-tab local transition       | **Unsound: F-001.** The sealed set is not fenced against a later stale-tab local append.                                                                                                                                                                                                                           |
| Removed/re-added denial          | Sound. Closure denies every envelope fetch/publish; reactivation keeps membership history but increments generation and receives current epoch only. Past-copy limitation is stated honestly.                                                                                                                      |
| Capability preflight             | Sound with the stated threat-row consequence that public-key-only retrieval never consumes or rotates the challenge. Exact UUID/X25519 pair, capability Ed25519 proof, current snapshot binding, generic failures, `no-store`, rate limiting and least fields are feasible.                                        |
| Fragment lifecycle               | Sound. Fragment persists only in URL/client memory before SQL truth; protected truth/self-envelope replaces it after commit; query/server/log/referrer transport is forbidden.                                                                                                                                     |
| SQL acceptance truth             | Sound. The locked transaction alone consumes the invite and returns stable membership/access-generation truth; same caller/attempt response-loss retry is idempotent and stale preflight mutates nothing.                                                                                                          |
| Protected recovery               | Sound. Caller-derived pending acceptance plus current self-envelope and opaque encrypted intent reconstruct work even if no local journal was committed.                                                                                                                                                           |
| Same-acceptance saga             | Sound. Deterministic ids/maps/lineage, combined encrypted Person/link durability, selection after link and sync-before-success close revision-01 F-002 without claiming server CRDT atomicity.                                                                                                                     |
| Distinct-invitation Person claim | **Unsound: F-003.** Same-Person intents have no convergent bijection rule.                                                                                                                                                                                                                                         |
| Vault creator Person             | **Missing: F-002.** Backfill is not a new-creation protocol.                                                                                                                                                                                                                                                       |
| Invite-aware onboarding          | Sound. Default vault is deferred only in invite mode; terminal pre-SQL cancellation/failure creates it once; post-SQL work can only resume finishing.                                                                                                                                                              |
| Privacy/display                  | Sound as a target. Profiles and intent remain encrypted; roles never derive from display data; raw hashes/keys are excluded. Current UUID-like Presence naming remains implementation debt rather than architecture authority.                                                                                     |
| Migration/reversal/export        | Sound conditional on F-001/F-002/F-003. Epoch-0 backfill, legacy-invite revocation, no destructive down migration, recovery while feature UI is hidden and active-generation-only exports are appropriate. Creator journals, fenced transition state and Person-claim repair state must also be retained/exported. |
| P08 dispatch gate                | Sound. The artifact explicitly refuses readiness before independent P07 approval and the D-011/P05 supported real-hidden-topology recheck.                                                                                                                                                                         |

## Complete 29-clause adjudication

Clauses 1–18, 20–21 and 23–29 retain sound required outcomes and meaningful test directions, subject
to the conditional gaps below. No clause weakens owner/member/outsider authorization, bearer-secret
handling, real-key proof, epoch-bound invites, member-only governance, removal denial, privacy,
accessibility or real-browser requirements.

| Clause | Verdict                 | Review                                                                                                                                                   |
| -----: | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    1–9 | sound                   | Discoverability, authority, least fields, member-only scope, exact fragments and route/key/epoch/caller binding remain complete.                         |
|  10–15 | sound                   | Capability-bound snapshot authentication, real-key self-wrap, fragment recovery and deterministic onboarding directly close the revision-01 gaps.        |
|  16–18 | sound                   | Epoch/lineage schema, authenticated full-state preparation and one locked SQL rotation are feasible and testable.                                        |
|     19 | **unsafe**              | F-001: exact mapped lineages are lossless, but no atomic cross-tab fence prevents a new unmapped old-epoch local lineage after planning.                 |
|  20–21 | sound after F-001       | Denial, honest past-copy behavior, soft removal and access-generation readd are correct once remaining-client transition cannot miss a local append.     |
|     22 | **incomplete**          | F-002 drops vault-creator linkage; F-003 leaves distinct-invite Person contention non-bijective. Same-acceptance crash recovery itself is sound.         |
|  23–26 | sound after F-002/F-003 | Encrypted intent/profile, safe fallback and history preservation are correct, but creator and claim convergence must establish the link invariant first. |
|  27–29 | sound                   | Keyboard/focus/status/error, finishing-until-proof and viewport/preference/zoom requirements remain strict.                                              |

The clause-to-proof table is therefore not complete: clause 19 needs multi-tab planning-fence races;
clause 22 needs vault-creator response-loss/crash/concurrency and distinct-invitation same-Person
contention. Existing owner/invitee/removal, transition crash, security, privacy, migration and
responsive proof requirements remain mandatory.

## Independent automated validation

| Check                                                                                     |                  Independent result |
| ----------------------------------------------------------------------------------------- | ----------------------------------: |
| exact reviewed range/path audit                                                           | passed; control/artifact paths only |
| `pnpm exec vitest run tests/integration/invite.test.ts tests/unit/crypto/keywrap.test.ts` |               2 files, 39/39 passed |
| `pnpm typecheck`                                                                          |                              passed |
| `pnpm db:reset` / fresh migrations 005–009                                                |                              passed |
| `pnpm exec supabase test db tests/database/rls-audit.sql`                                 |                        97/97 passed |
| accounts + Realtime E2E, workers 1, retries 0, repeat each 2                              |         16/16 passed in 1.2 minutes |

These green tests remain truthful current-state checks. They prove existing cryptographic
primitives, direct-table denial, RLS, default `Me`, current Realtime removal behavior and
deterministic baseline journeys. They do not execute epoch fencing, access-generation envelope
history, real owner invite redemption, SQL response-loss reconciliation, creator membership linkage
or distinct-invitation Person contention; they cannot override the contract findings.

## Installed headless CLI and UX evidence

The reviewer used repository-installed `playwright-cli` in disposable headless sessions, with a
clean final evidence session `p07-review02c`. The server was started with the same locally derived
Realtime JWKS secret required by repository Playwright configuration; the secret and generated seed
phrase were never printed or persisted in review evidence. A discarded setup-only run without that
required server-only secret produced the expected authorization failure and was not treated as
product evidence.

- Normal first-user onboarding reached `Vault Settings`. Its deterministic accessibility snapshot
  exposed heading `Vault Settings`, textbox `Vault Name`, combobox `Default currency`, and owner
  vault selector, but no Access, Members, Invite, Copy, Revoke, Remove or Rekey control.
- Normal navigation reached People. Its snapshot exposed heading `People`, misleading collaboration
  copy, one `Me`, and `Add Person`; activating Add Person focused textbox `Enter person's name`.
  This remains a financial-Person action, not a membership path.
- The clean session had zero console errors. All observed application API requests were 200 and
  included register, vault create/list, snapshot/sync and Realtime authorize/revoke; no invitation
  or membership-list/remove/rekey request occurred. URL/history contained no invite fragment or
  query.
- At 390×844 with dark scheme and reduced motion, People, `Me`, `Add Person` and `Open menu` were
  exposed, reduced/dark media queries were true and document horizontal overflow was false.
- At exact 200% CSS zoom, `Me` again lost its accessibility reference. The mobile drawer exposed
  link `Vault Settings`, but a normal click timed out because the link remained outside the
  viewport. No force click or direct navigation was used to mask this inherited clause-29
  regression.
- The existing UI has no legitimate invitation path, so member/outsider, fragment, acceptance,
  removal and transition states cannot be manually exercised without inventing a URL or using
  service authority. The review did not substitute such fixtures. No changed control exists for
  meaningful contrast measurement in this evidence-only revision; role/name/state and reachability
  evidence is the applicable deterministic gate.

## Revision-03 correction scope

No new human preference is required and there is no Q proposal. The frozen HS-012 contract, Q-014,
zero-knowledge boundary and data-preservation hierarchy decide the safe correction:

1. Preserve every sound revision-02 architecture, security, privacy, migration, reversal, export,
   accessibility and test requirement.
2. Add the durable cross-tab transition fence and atomic append/fence rules from F-001, including
   late-old-lineage completion proof and multi-tab injected-race tests.
3. Restore a crash-recoverable creator-membership/default-Person link protocol and proof to clause
   22 without claiming server plaintext/CRDT mutation.
4. Add deterministic post-convergence handling for two distinct invitations claiming one Person;
   preserve the financial Person and create/repair the losing membership's deterministic Person
   before success.
5. Extend ownership/state/threat/migration/reversal/export tables and the complete clause map with
   these records. No plaintext journal, destructive merge, memory-only recovery, service-fixture
   substitute, weakened success gate or product implementation is authorized by this review.

P08 remains **not dispatch-ready** after this FAIL. It needs an independently approved P07
revision-03 artifact and the separate D-011/P05 no-product supported-hidden-topology recheck.

## Cleanup and frozen-source invariants

- All CLI sessions were closed and deleted; the development server was stopped. Generated
  `.playwright-cli` and `test-results` directories were moved to desktop trash, and generated
  `next-env.d.ts` drift was restored exactly.
- A final ordinary `pnpm db:reset` applied migrations 005–009. Aggregate checks showed zero rows in
  `auth.users`, `public.vaults`, `public.vault_memberships`, `public.vault_invites`,
  `public.vault_ops`, `public.realtime_grants` and `realtime.subscription`.
- No Next or Playwright CLI process remained. The index remained empty and HEAD remained the
  assigned `033cb8f6d37208c1ba6ac0b0907672aa18e4ad6d`.
- Rolling scratch SHA-256 remains
  `753be6b73d1086a35659e1416d9f6c183e61107c72a91aeaa55a13344bf96578`, 350 lines and 24,244 bytes.
  Exactly 21 ordered blocks normalize byte-for-byte to SCOPE; the checked set is exactly
  HS-002/HS-010/HS-014/HS-017/HS-018.
- Immutable FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines and 25,441 bytes.
- Immutable `SCOPE.json` remains SHA-256
  `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines and 27,382 bytes.

Root should persist immutable revision-02 evidence/review, leave P07 `changes_requested`, leave
HS-011/HS-012 unchecked, and dispatch only the evidence-only P07 revision-03 correction. No P08
implementation or scratch marker is authorized.
