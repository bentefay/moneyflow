# P05 Independent Review — Revision 02

## Verdict

**FAIL.** Revision 02 closes prior F-002 and F-003: the sync-status provider now encloses its
consumer, the vault initialization effect uses stable specific dependencies and exact manager
cleanup, lock waits for sync and Presence teardown before clearing authentication, and the ordinary
repository Playwright command obtains the local signing key in test-process memory without an
authorize-500 bootstrap gate.

The required live-delivery contract remains deterministically red. From a fresh latest-schema
database, the ordinary isolated test passes its new initial lifecycle bounds, writes through the
owner flow, receives exactly zero member `postgres_changes` event kinds for 15 seconds, and records
repeated private Presence authorization failure. Migration 007 unconditionally revokes every sibling
grant on every mint and permits only mutually exclusive topic extensions even though the installed
client's actual private Presence join includes both default Broadcast configuration and enabled
Presence. Those are the narrow remaining owners. HS-015 cannot be marked complete.

The implementer's `Q-PROPOSAL-P05-02-01` is source- and runtime-supported. Its exact revision-03
authority is nine paths: the six revision-02 paths plus one forward migration and two database audit
files. No SyncManager, Realtime transport, CRDT or Loro path is justified by the zero-incoming-frame
counterexample. This is a review recommendation only; root retains question transcription, revision
dispatch, integration, ledger and scratch-marker authority.

## Immutable review boundary

- Package/revision: `P05/02`, cumulative `HS-015` review.
- Literal cumulative range:
  `007651beb814d98646aa2e786801b647e2abd0b5..e865023f6001704be0304bed4e75e76956854ea6`.
- Revision-02 product/test/config commit: `e865023f6001704be0304bed4e75e76956854ea6`
  (`fix: stabilize realtime lifecycle diagnostics`). Its exact parent is
  `72c90d132110d02641502b64d6263920abe0749d`.
- The revision-02 commit changes exactly the six authorized paths below, with 389 insertions and 42
  deletions. It contains no transport, router, schema, migration, database-audit, unit, control,
  evidence, review, scratch, FS-001, `.claude` or `.codex` change.

```text
playwright.config.ts
src/app/(app)/layout.tsx
src/components/providers/vault-provider.tsx
tests/e2e/helpers/realtime.ts
tests/e2e/realtime-security.spec.ts
tests/e2e/vault-settings.spec.ts
```

- Frozen revision-02 evidence:
  `specs/007-human-scratch-completion/evidence/P05/implementation-02.md`, independently verified
  SHA-256 `6d96237408e29392901f1fecee164843753ff8c71cc11967a3feac9084e0cf30`, 251 lines and 17,010
  bytes.
- Prior immutable revision-01 FAIL review:
  `specs/007-human-scratch-completion/reviews/P05-review-01.md`, independently verified SHA-256
  `52350e039f75934e59ec6f431fba4d041ef9df6f4e685411608fe86e06436ba5`, 281 lines and 19,324 bytes.
- `git diff --check BASE..HEAD` passes. The index is empty. Before this review artifact, Git-visible
  dirt was limited to root-owned unstaged `HANDOFF.md`/`PROGRESS.md` and the frozen untracked
  revision-02 implementation evidence.

## Findings

### F-001 — Critical — migration 007 invalidates concurrent clients and rejects the real private Presence join

The fresh ordinary isolated command was:

```text
env -u SUPABASE_JWT_SECRET pnpm exec playwright test \
  tests/e2e/realtime-security.spec.ts --workers=1 --reporter=list --retries=0
```

Playwright started its own development server, obtained the local symmetric Realtime key through the
new config, collected one test and passed the initial sanitized lifecycle-bound step. The owner then
completed its import flow, but the member frame observer at
`tests/e2e/realtime-security.spec.ts:110-117` remained at exactly zero incoming `postgres_changes`
event kinds for the full 15-second poll. The test therefore failed 0/1 before any remote update
could reach `SyncManager.applyRemoteUpdate`, Loro or React rendering.

Private Presence independently logged repeated `Realtime connection failed` errors. Sanitized local
Realtime server logs confirmed repeated unauthorized reads of the exact private Presence topic. On
this otherwise fresh database, post-context-cleanup aggregates were exactly:

| Purpose  | Total | Live | Revoked | Expired unrevoked |
| -------- | ----: | ---: | ------: | ----------------: |
| sync     |     5 |    3 |       2 |                 0 |
| presence |    10 |    3 |       7 |                 0 |

No grant ID, identity, vault ID, topic UUID, token, signed body, frame payload or financial data was
retained in those aggregates or this artifact.

The remaining owners are directly visible in repository source:

1. `supabase/migrations/007_realtime_authorization.sql:135-147` correctly revokes an explicitly
   presented previous grant during in-band refresh. Lines 149-157 then unconditionally revoke
   **every** still-live grant for the same identity/vault/purpose before inserting the replacement.
   Independent tabs and overlapping replacement managers own separate credential managers and use
   the sentinel on initial mint, so a later connection or refresh invalidates a still-subscribed
   sibling. The current database audit codifies this incompatible single-live-grant invariant at
   assertions 50-52 rather than testing concurrent clients.
2. Migration lines 83-94 allow only `broadcast` for a sync-purpose topic and only `presence` for a
   Presence-purpose topic. Installed `@supabase/realtime-js` 2.110.7 source at
   `RealtimeChannel.ts:330-337` adds Broadcast configuration to every channel by default. Lines
   385-413 put that Broadcast object in the join payload and enable Presence when a Presence binding
   exists. Product source creates exactly that private Presence binding. The presence token's
   Broadcast extension check therefore returns false before the channel can join, matching the
   repeated server-side unauthorized result.

The publication remains `vault_ops`, the permanent write exists in the owner path, initial bounds
pass, and the member sees no incoming event kind. There is no evidence frame for widening into
`src/lib/sync/**`, `src/lib/supabase/realtime.ts`, CRDT context or Loro code. Revision 03 must
replace the single-global-grant invariant with independently revocable concurrent short-lived grants
and authorize only the extension combination required by the exact private purpose/topic. It must
retain expiry, membership/removal, role, vault, purpose, topic, table, cross-vault and outsider
denial.

## Prior finding closures

### F-002 closure — provider topology, dependencies, attribution and authenticated cleanup

`src/app/(app)/layout.tsx:90-98` now places `SyncStatusProvider` above `VaultProvider`, so
`useSyncStatusManager()` no longer resolves the static no-op default. The app consumes the same live
status context at lines 137-138. Lock now awaits the registered vault-manager disconnect and the
separate Presence disconnect before `clearSession()` at lines 145-148, preventing the revision-01
unsigned revoke ordering.

`src/components/providers/vault-provider.tsx:61-102` destructures stable status callbacks, stores
the changing tRPC utility object behind a ref, exposes stable operation callbacks, and derives
primitive vault/key identity. The effect at lines 121-247 depends on those exact
primitives/callbacks plus the authenticated identity. It checks identity again during asynchronous
initialization, publishes only the exact non-cancelled manager, registers that manager's disconnect,
and disconnects only its own instance during failure or cleanup. Real manager state now reaches the
UI at lines 177-204.

The E2E instrumentation distinguishes sync and Presence authorization/revoke counts and observes
only event kinds. The independent test reached the post-join initial-bound step, confirming the new
limits before the database-owned zero-frame failure. These changes reject the source-impossible
revision-01 explanation without suppressing status callbacks or live-push assertions. Prior F-002 is
closed; ordinary React development replay and real vault changes may overlap briefly, but migration
007 must not revoke a valid sibling to hide that supported lifecycle.

### F-003 closure — hermetic ordinary Playwright signing-secret bootstrap

`playwright.config.ts:5-50` accepts a valid inherited server-only secret or reads the known local
Realtime container's symmetric JWKS key entirely into configuration-process memory. It suppresses
Docker stdout/stderr, validates the decoded key, never prints or persists it, and gives an
actionable pre-browser error if neither source is available. Lines 73-77 pass the key only to the
Playwright- owned Next web-server process and prohibit reuse of an unverified existing server.
Production application behavior remains unchanged and fail-closed; there is no `NEXT_PUBLIC_*` or
application fallback.

The exact ordinary command above deliberately removed the parent secret yet started Next and reached
the real Realtime journey. This closes prior F-003. One reviewer diagnostic invocation prefixed with
`corepack pnpm exec` caused the nested web-server shell to resolve an unrelated pnpm 10.25 and stop
on the repository's pnpm-engine guard. Repeating the repository's documented ordinary `pnpm exec`
command used pnpm 11.13.1 and reproduced the product test normally. That wrapper-specific toolchain
artifact is not a signing-secret bootstrap failure and did not alter product or test state.

## Security, instrumentation and database adjudication

- The lifecycle observer parses only procedure name and `sync`/`presence` purpose from requests and
  returns copied counters. The frame observer parses incoming JSON only long enough to increment an
  event-kind count; it retains no frames. Both remove their listeners during cleanup.
- The grant helper validates the already-held fixture hash/vault shapes, executes `psql` through an
  argument array, suppresses failure output and returns only per-purpose total/live/revoked/expired
  counts. It does interpolate validated values into fixture SQL, but the strict lowercase 64-hex
  hash plus UUID cast prevent statement injection in this test-only path.
- The existing router/JWT, exact grant claims, current membership, permanent-op RLS and service-only
  mint/revoke boundaries remain unchanged. Revision 03 should be a forward migration; editing
  migration 007 would break already-applied databases and the upgrade contract.
- A fresh latest-schema `tests/database/rls-audit.sql` run passes 69/69. Its current assertions
  prove the original exact-scope and removal properties but intentionally enforce
  only-one-live-grant; revision 03 must replace/extend those assertions for two simultaneous grants
  and independent refresh/revoke. The legacy audit must likewise cover a 005-to-008 upgrade.

An initial reviewer audit invocation was mistakenly run on the just-completed E2E database and
reported assertion 62 as five permanent ops versus the fixture's expected three. That was a
non-fresh test precondition caused by the two journey rows, not a product regression. A new
`supabase db reset --no-seed` followed by the canonical audit passed all 69 assertions. The database
is finally left at fresh migrations 005, 006 and 007 with no seed; the audit transaction rolled
back.

## Independent validation

| Check                                | Independent result                          |
| ------------------------------------ | ------------------------------------------- |
| exact six-path inspection            | authorized topology/config/test paths only  |
| focused Realtime Vitest              | 2 files, 8/8 passed                         |
| complete unit/integration suite      | 47 files, 1,170/1,170 passed                |
| six-path ESLint                      | exit 0, no warnings/errors                  |
| typecheck                            | exit 0                                      |
| production build                     | passed; all 17 routes compiled/generated    |
| six-path Oxfmt check                 | passed                                      |
| fresh reset through migration 007    | passed                                      |
| fresh `tests/database/rls-audit.sql` | 69/69 passed after canonical reset          |
| ordinary isolated Realtime E2E       | 0/1; zero member event kinds for 15 seconds |
| post-cleanup aggregates              | sync 5/3/2/0; Presence 10/3/7/0             |
| `git diff --check BASE..HEAD`        | passed                                      |

The seeded 005-to-007 upgrade audit was not repeated because revision 02 changes no migration or
database fixture and revision-01 independent review already passed 18/18. Full E2E, expiry/removal
continuations and the installed CLI charter were not run after the isolated deterministic failure:
the acceptance test stops at the first absent incoming event, and later checks cannot turn that
failure into PASS. Revision 03 must rerun all of them after the database correction. These are
proportional limitations, not skipped evidence for a passing verdict.

## Q-PROPOSAL-P05-02-01 confirmation — concurrent grants and actual private join authorization

- **Raised by/package/revision:** `human_scratch_implementer`, P05, revision 02, 2026-07-20;
  independently confirmed by `human_scratch_reviewer`.
- **Context and evidence:** corrected topology and ordinary bootstrap reach the real journey, but a
  current member receives zero Postgres event kinds and private Presence is unauthorized. Migration
  007 revokes all sibling grants and denies the Broadcast extension present in an actual private
  Presence join. Sanitized lifecycle and database aggregates reproduce the evidence exactly.
- **Why existing authority does not decide it:** HS-015 requires concurrent tabs, secure private
  Presence, no-refresh delivery and bounded revocation, but revision 02 authorizes no migration or
  database audit path. Its zero-frame evidence does not authorize a SyncManager/CRDT expansion.
- **Options considered:** (A) forward-migrate to independent concurrent grants, rotating only the
  explicit predecessor, and minimally authorize the exact extension set for each private purpose;
  (B) build cross-tab credential/channel coordination; (C) suppress React overlap while retaining a
  global single-live rule; or (D) accept pull/expiry instead of live delivery. A is the narrow
  direct fix. B adds broad ownership/failure modes, C still breaks genuine duplicate tabs, and D
  violates HS-015.
- **Reversible default selected to continue:** choose **A**. Revision 03 has exactly **nine**
  writable paths—the six retained revision-02 paths and three additions:

```text
playwright.config.ts
src/app/(app)/layout.tsx
src/components/providers/vault-provider.tsx
tests/e2e/helpers/realtime.ts
tests/e2e/realtime-security.spec.ts
tests/e2e/vault-settings.spec.ts
supabase/migrations/008_realtime_authorization_lifecycle.sql
tests/database/rls-audit.sql
tests/database/legacy-upgrade-audit.sql
```

Migration 008 must leave sibling initial grants valid, rotate only the caller's exact explicit
previous grant, retain independently revocable 60-second credentials, and prune/bound expired or
stale rows without invalidating active siblings. It must minimally permit the installed client's
actual private join extensions while preserving exact purpose/topic authorization. The audits must
counterfactually prove two simultaneous grants, independent refresh and revoke, stale-row bounds,
cross-vault/purpose/extension denial, expiry, and immediate membership-removal denial on fresh and
005-to-latest paths.

- **Required acceptance evidence:** rerun focused/full unit, lint/type/build/format/diff, fresh and
  upgrade database audits, ordinary full retries-zero E2E, repeated isolated two-context push,
  duplicate/background tabs, expiry/reconnect/offline catch-up, lock/unlock, vault switch,
  membership removal, bounded aggregate cleanup and the installed CLI owner/member/outsider charter.
  Import/edit/delete must arrive without member refresh; final grants must explicitly revoke; socket
  URLs/logs/artifacts must remain free of sensitive scope. No pull refresh may fake the live frame.
- **Decision-hierarchy basis:** explicit HS-015 live delivery, duplicate-client and secure shared
  Presence requirements control, followed by least privilege, current membership/removal, data
  permanence and the smallest forward-only correction. Incoming-frame evidence excludes later
  processing layers.
- **Impact and risk:** concurrent short-lived grants increase usable credentials within the
  60-second window, so exact per-grant revocation, expiry, membership revalidation and stale-row
  bounds are mandatory. An overly broad extension policy could expose Broadcast/Presence across
  purposes, so exact topic/purpose and adversarial tests must remain.
- **Reversal or migration path:** migration 008 changes authorization functions/policies, not
  encrypted user data. A later forward migration can tighten concurrency caps or extension mapping;
  existing grants can be individually revoked or expire. The six revision-02 topology/config/test
  changes remain independently reversible.
- **Human review still useful after completion:** no product preference blocks continuation. Root
  may apply option A through PROCESS. Human input is optional only if the owner wants a different
  explicit concurrent-device cap.

No further path is authorized by this confirmation. If revision-03 frame evidence disproves the
migration owner, stop with a new complete proposal rather than editing transport, SyncManager, CRDT
or Loro code.

## Frozen sources, formatting and later-package boundaries

- `specs/human-scratch.md` remains SHA-256
  `c74a2a782543d00880fa30a771be4e39c75d89889e484ee46570fb4a6cf0ecdd`, exactly 350 lines and 24,243
  bytes. All 21 ordered blocks normalize byte-for-byte to `SCOPE.json`; the checked set is exactly
  HS-002, HS-014, HS-017 and HS-018. HS-015 remains unchecked.
- FS-001, `specs/008-transaction-percentage-allocations-settlement/spec.md`, remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, exactly 715 lines and 25,441
  bytes.
- Repository-wide format remains red only on frozen/control Markdown routed through R-024/P20B/P21.
  The six revision-02 paths and this review are formatter/diff clean. No scratch marker is
  authorized by this FAIL.
- P08 still owns real invitation, key-wrap and member-management UI. P10 still owns encrypted Loro
  active-transaction Presence UX. P05 must nevertheless make the shared private channel join,
  deliver and clean up correctly; those later packages cannot waive the present failure.

## Exact next revision

Root should preserve revision-01/02 evidence and reviews as immutable, transcribe confirmed
`Q-PROPOSAL-P05-02-01` under its sole ledger authority, set P05/HS-015 to `changes_requested`, and
dispatch P05 revision 03 against the same original BASE with exactly the nine paths listed above.
Revision 03 must produce a new committed HEAD and immutable `evidence/P05/implementation-03.md`,
then receive independent review in `reviews/P05-review-03.md`. No HS-015 marker may change before
that exact cumulative range passes.
