# P05 Implementation Evidence — Revision 03

## Immutable dispatch and pre-mutation boundary

- Package/scope/revision: `P05` / `HS-015` / `03`.
- Original package BASE: `007651beb814d98646aa2e786801b647e2abd0b5`.
- Pre-implementation HEAD: `f543c4b7a4f445c2e5d11a7f3f077a8929074335`.
- Canonical `Q-004` selects the forward-only concurrent-grant and actual private-join correction.
- Sole new worker artifact: `specs/007-human-scratch-completion/evidence/P05/implementation-03.md`,
  created before any authorized implementation mutation and left uncommitted.
- Exact writable implementation paths are only:

```text
src/app/(app)/layout.tsx
src/components/providers/vault-provider.tsx
playwright.config.ts
tests/e2e/helpers/realtime.ts
tests/e2e/realtime-security.spec.ts
tests/e2e/vault-settings.spec.ts
supabase/migrations/008_realtime_authorization_lifecycle.sql
tests/database/rls-audit.sql
tests/database/legacy-upgrade-audit.sql
```

- At dispatch, HEAD matched the literal pre-implementation HEAD, the index and untracked set were
  empty, and Git-visible dirt was exactly root-owned unstaged `HANDOFF.md` and `PROGRESS.md`.
- Immutable revision-01/02 evidence and reviews, frozen sources, task/control ledgers and scratch
  markers remain read-only. This worker will exact-stage only authorized implementation paths and
  will not claim PASS unless every required acceptance gate is green.

## Correction and validation plan

1. Preserve migration 007 byte-for-byte and add forward migration 008. Initial mints will coexist;
   an explicit refresh will revoke only its presented exact predecessor; exact final revoke remains
   independent. Expired/revoked stale rows will be pruned with a safe age threshold, never by
   invalidating an active sibling.
2. Match the installed private-channel join exactly: sync permits only its required Broadcast
   extension; Presence permits its required Presence extension plus the join's default Broadcast
   authorization check. Exact grant, vault, role, purpose, topic, table, membership, expiry and
   removal predicates stay unchanged.
3. Replace the fresh audit's global-single-live assertion with simultaneous-sibling, independent
   refresh/revoke, pruning and adversarial extension assertions. Extend the 005-to-latest audit to
   prove migration 008 is applied without changing preserved encrypted data and exposes the same
   corrected authorization behavior.
4. Reset and run both database paths before browser work. Then run the isolated ordinary two-context
   journey with the parent signing secret unset and require a genuine incoming `postgres_changes`
   event kind before UI delivery. Any received frame followed by a processing failure triggers the
   revision-04 stop boundary rather than unauthorized transport/CRDT edits.
5. If isolated acceptance is green, complete repeated Realtime, focused settings, full unit/
   integration, lint/type/build/format/diff, full retries-zero E2E and installed CLI security/
   lifecycle charters. Sanitize all evidence and restore generated/browser/database state.

## Implemented revision-03 database correction

Migration 007 remains byte-identical. Forward migration 008:

- replaces global single-live-grant rotation with independent initial grants;
- revokes only the exact non-sentinel predecessor presented by a refresh;
- keeps final revocation exact by retaining migration 007's existing revoke function;
- prunes only exact-scope rows expired or revoked for more than five minutes, excludes an explicitly
  presented predecessor so a long-background client may still rotate it, and never prunes an active
  sibling;
- permits the installed client's default Broadcast **read** authorization check on an exact Presence
  topic as well as Presence read/write;
- separates send authorization so a Presence credential cannot publish Broadcast payloads; and
- retains migration 007's exact opaque grant, verified identity, vault, role, purpose, topic, table,
  current membership, expiry and removal predicates.

The fresh database audit now plans and passes **87/87** assertions. Its new counterfactuals prove
two initial sibling grants remain live, an explicit refresh invalidates only its predecessor, the
sibling remains usable after another refresh and revoke, wrong vault/role/purpose/table/extension
substitutions fail, expired Presence fails, stale rows are pruned, recent revoked rows remain for
diagnostics, outsider minting fails, and membership removal immediately invalidates an unexpired
grant.

The seeded upgrade sequence reset to migration 005, loaded
`tests/database/legacy-upgrade-fixture.sql`, applied 006, 007 and 008 in order, and passed **27/27**
upgrade assertions. Existing encrypted operations, quarantined legacy rows, ciphertext, authors,
clocks, snapshot, membership and publication remain exact while simultaneous grants, independent
refresh, Presence extension separation and stale pruning use the new behavior. A final fresh reset
again applied 005–008 successfully.

## Live boundary results and sanitized attribution

The ordinary isolated command deliberately removed the parent secret so Playwright's inherited
hermetic bootstrap remained under test:

```text
env -u SUPABASE_JWT_SECRET pnpm exec playwright test \
  tests/e2e/realtime-security.spec.ts --workers=1 --reporter=list --retries=0
```

The first post-migration run reached both shared-vault contexts and the owner import, but the member
received zero incoming `postgres_changes` event kinds for 15 seconds. Unlike revision 02, private
Presence produced no authorization or console errors. Thus migration 008 fixes the actual private
Presence join but does not create the missing permanent-op stream.

The authorized E2E instrumentation was then narrowed further without retaining claims, topics,
filters, identifiers, tokens or payloads:

1. A database aggregate counted permanent-op subscription rows and rows whose captured claims
   matched an exact current live grant.
2. A socket aggregate counted outgoing `phx_join` frames and only the number of configured
   `postgres_changes` bindings; it did not retain any frame content.

The decisive isolated run recorded:

| Sanitized boundary                                     | Count |
| ------------------------------------------------------ | ----: |
| member outgoing joins                                  |     4 |
| member outgoing Postgres-change bindings               |     2 |
| database permanent-op subscription rows                |     0 |
| authenticated subscription rows                        |     0 |
| subscription rows matching an exact current live grant |     0 |
| incoming member `postgres_changes` events              |     0 |

At that same boundary, browser lifecycle counts were owner/member sync authorizations **2/2** and
Presence authorizations **4/4**, with Presence revocations **2/2**. Exact shared-vault database
aggregates were owner sync total/live **2/2**, owner Presence total/live/revoked **4/2/2**, member
sync total/live **1/1**, and member Presence total/live/revoked **2/1/1**. No sync credential was
revoked, so the server's zero subscription state is not caused by migration 007's former sibling
invalidation or by expiry. The member sent real join bindings, but the installed server did not
register them.

This proves an additional channel-registration owner outside revision-03 authority before any
incoming frame reaches SyncManager, CRDT, Loro or React. Per HANDOFF, implementation stops rather
than editing that transport. The full browser suite, repeated live journey, build and installed CLI
charter were not run after this deterministic stop: they cannot turn zero registered subscriptions
into PASS. Revision 03 makes no PASS claim.

## Q-PROPOSAL-P05-03-01 — use the supported secured Postgres Changes channel registration

- **Raised by/package/revision:** `human_scratch_implementer`, P05, revision 03, 2026-07-20.
- **Context and evidence:** Migration 008 passes fresh 87/87 and seeded-upgrade 27/27, preserves
  independent live grants and makes private Presence join cleanly. A current member nevertheless
  sends two sanitized Postgres-change bindings across its real joins while the server persists zero
  permanent-op subscriptions and sends zero events. Live exact grants remain valid. The remaining
  boundary is channel construction in `src/lib/supabase/realtime.ts`; no downstream processing layer
  receives a frame.
- **Why existing authority does not decide it:** HS-015 requires authorized Postgres Changes but
  does not require the Supabase `private` channel flag for that transport. That flag controls
  Broadcast/Presence authorization through `realtime.messages`; Postgres Changes authorization is
  independently enforced by `vault_ops` SELECT privilege/RLS using the short-lived exact-grant JWT.
  Revision 03 excludes the transport source and its unit test, so it cannot change or verify the
  installed SDK/server registration mode.
- **Options considered:** (A) keep Presence on an exact private channel, but construct sync using
  the installed server's supported Postgres Changes registration mode while still supplying the
  exact short-lived JWT and table RLS; (B) replace Postgres Changes with encrypted Broadcast
  messages; (C) customize the local/production Realtime server to accept the current combined
  private join; or (D) accept pull polling. A changes only channel registration and retains the
  authoritative permanent table. B creates a second delivery path and new send policy, C is
  environment-specific and does not prove hosted compatibility, and D violates genuine live
  delivery.
- **Reversible default selected to continue:** choose **A** in revision 04. Retain the nine
  revision-03 paths and add exactly:

```text
src/lib/supabase/realtime.ts
tests/unit/sync/realtime.test.ts
```

Research and cite the installed/current primary Supabase contract, keep Presence private, and change
only sync channel construction as required for a real registered Postgres Changes subscription. The
existing short-lived token callback, exact `vault_ops` filter, author skip, reconnect catch-up and
teardown remain. Unit tests must distinguish the two channel modes and the real E2E must require
outgoing binding, registered live-grant subscription, incoming event and UI delivery in sequence. Do
not add `src/lib/supabase/client.ts`, SyncManager, CRDT or Loro without a new counterexample.

- **Decision-hierarchy basis:** explicit HS-015 genuine live delivery and unauthorized-reader denial
  control, followed by current exact table RLS, least privilege, preservation of permanent encrypted
  operations and the smallest reversible transport correction. Zero incoming frames excludes later
  processing layers.
- **Impact and risk:** a sync channel that does not use the Broadcast/Presence `private` flag may
  expose a guessable topic name in join frames, but it must not expose the topic or token in the
  socket URL and cannot authorize rows: `vault_ops` RLS still requires a current exact opaque grant,
  matching JWT scope, role and membership. Revision-04 adversarial owner/member/outsider,
  cross-vault, expiry/removal and socket-shape tests must prove that distinction. If the installed
  server still fails to register, stop rather than weakening table RLS or substituting polling.
- **Reversal or migration path:** the proposed change is local channel construction with no schema
  or encrypted-data migration. Revert it independently while retaining migration 008's correct
  concurrent grant and Presence behavior. A later supported server capability may allow the sync
  channel flag to be tightened again without changing credentials or stored operations.
- **Human review still useful after completion:** no product preference blocks continuation. Root
  can dispatch the exact reversible default; optional human review may choose a different supported
  Supabase deployment contract.

## Static validation and frozen sources

- Complete Vitest passed **47 files, 1,170/1,170 tests**.
- `pnpm typecheck` passed.
- Focused ESLint on the changed TypeScript E2E paths passed. A combined diagnostic invocation also
  reported only expected “no matching configuration” warnings for the two SQL files; it had no
  error, and the corrected TypeScript-only invocation exited cleanly.
- Focused Oxfmt and `git diff --check` pass. SQL correctness is covered by both executed pgTAP
  paths.
- `specs/human-scratch.md` remains SHA-256
  `c74a2a782543d00880fa30a771be4e39c75d89889e484ee46570fb4a6cf0ecdd`, exactly 350 lines and 24,243
  bytes, matching PROGRESS's rolling hash. HS-015 remains unchecked.
- Immutable FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, exactly 715 lines and 25,441
  bytes. `SCOPE.json` remains SHA-256
  `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`.

Because scratch and `SCOPE.json` are byte-identical to the current clean ledger boundary, the same
21 ordered normalized blocks still byte-match, with the authorized checked HS set exactly HS-002,
HS-014, HS-017 and HS-018. There is no active completion event or rollback batch.

## Commit and final cleanup boundary

- Revision-03 implementation commit: `ec7dcf8b29ce93f46f73a904e7420ddf49317b11`
  (`fix: support concurrent realtime grants`).
- `f543c4b7a4f445c2e5d11a7f3f077a8929074335..ec7dcf8b29ce93f46f73a904e7420ddf49317b11` changes
  exactly five authorized paths:

```text
supabase/migrations/008_realtime_authorization_lifecycle.sql
tests/database/legacy-upgrade-audit.sql
tests/database/rls-audit.sql
tests/e2e/helpers/realtime.ts
tests/e2e/realtime-security.spec.ts
```

- The other four authorized paths required no revision-03 change. No excluded transport, client,
  SyncManager, CRDT, Loro, control, task, review, frozen-source or scratch path is in the commit.
- Exact-path staging named only those five paths; no blanket staging command was used. The index is
  empty after commit.
- The cumulative independent-review range remains original package
  `007651beb814d98646aa2e786801b647e2abd0b5..ec7dcf8b29ce93f46f73a904e7420ddf49317b11`.
- `next-env.d.ts` was restored to its pre-run generated declaration and is clean. The two ignored
  Playwright result files from the intentional red diagnostic were deleted, and no CLI session/data
  was created. The database was finally reset to a fresh unseeded 005–008 schema.
- Final Git-visible dirt is exactly root-owned unstaged `HANDOFF.md` and `PROGRESS.md`, plus this
  sole untracked revision-03 evidence artifact. All prior evidence/reviews remain immutable.
