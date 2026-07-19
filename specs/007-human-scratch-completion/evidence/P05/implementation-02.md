# P05 Implementation Evidence — Revision 02

## Immutable dispatch and pre-mutation boundary

- Package/scope/revision: `P05` / `HS-015` / `02`.
- Original package BASE: `007651beb814d98646aa2e786801b647e2abd0b5`.
- Pre-implementation HEAD: `72c90d132110d02641502b64d6263920abe0749d`.
- Revision-01 evidence and review are immutable. Canonical `Q-003` selects the revision-02 default.
- Sole new worker artifact: `specs/007-human-scratch-completion/evidence/P05/implementation-02.md`,
  created before any product/test/config mutation and left uncommitted.
- Exact writable paths are only:

```text
src/app/(app)/layout.tsx
src/components/providers/vault-provider.tsx
playwright.config.ts
tests/e2e/helpers/realtime.ts
tests/e2e/realtime-security.spec.ts
tests/e2e/vault-settings.spec.ts
```

- At dispatch, the index and untracked set were empty. Git-visible dirt was exactly root-owned
  unstaged `HANDOFF.md` and `PROGRESS.md`. No authorized product/test/config path had been changed.
- This worker does not claim PASS or edit scratch/FS/control/review/task/immutable evidence paths.

## Pre-mutation correction and attribution plan

The correction will preserve revision 01's credential, RLS, permanent-op and fail-closed production
boundaries. It will not hide churn by suppressing status callbacks or loosening live-push
assertions.

1. Reproduce review F-001/F-002/F-003 before correction:
    - ordinary focused Playwright startup without a signing-secret bootstrap: 0/9;
    - corrected-secret focused Realtime plus vault-settings run: 7/9;
    - isolated one-worker Realtime journey: 0/1 at no-refresh member delivery;
    - static topology: `SyncStatusProvider` is below `VaultProvider`, so the latter reads static
      no-op defaults rather than the live status context.
2. Add sanitized attribution only in authorized E2E/helper paths before the product correction:
    - observe signed tRPC lifecycle requests in test memory, parse only procedure name and the
      `sync`/`presence` purpose, and retain only aggregate authorize/revoke counts;
    - query `realtime_grants` service-side by already-held fixture identity/vault but return only
      per-purpose total/live/revoked aggregates—never IDs, hashes, tokens, vault IDs or payloads;
    - attribute vault-manager initialization/cleanup through sync authorize/revoke aggregates and
      the separate Presence hook through presence aggregates, correlated with explicit journey
      steps;
    - retain sanitized socket-shape, console and request-URL assertions. No secret or identity value
      enters output, snapshots, traces or reports.
3. Move `SyncStatusProvider` above `VaultProvider`. In `VaultProvider`, destructure stable specific
   status callbacks and tRPC operation functions, derive primitive vault/key identity, and make the
   initialization effect depend only on those exact values. Preserve recreation for an actual
   identity/vault/wrapped-key change and prove real manager transitions reach the status UI.
4. Make Playwright web-server startup hermetic for the known local stack. The config may obtain the
   local Realtime symmetric signing key in process memory and pass it only to the child web-server
   environment, or fail fast before browser launch. It must never print, persist, commit, expose via
   `NEXT_PUBLIC_*`, or create a production application fallback.
5. Turn the existing genuine import/edit/delete no-refresh journey green and extend it to prove
   bounded per-purpose creation, explicit final revocation, in-band expiry refresh without storms,
   removal denial, reconnect/offline catch-up, lock/unlock and real vault/key switching. If
   sanitized evidence proves another owner is required, stop and record a complete revision-03
   proposal.
6. Rerun inherited focused/full unit, fresh/upgrade database, lint/type/build, complete retries-zero
   E2E, and installed CLI owner/member/outsider/background charters. Restore generated, database and
   browser state; exact-stage and commit only authorized product/test/config paths; leave this
   evidence uncommitted for independent review.

## Red reproduction

All four review counterexamples reproduced before any authorized product/test/config mutation:

1. With `.env.local` containing only the public URL/key and server service key, and with
   `SUPABASE_JWT_SECRET` absent from the parent environment, the ordinary command
   `pnpm exec playwright test tests/e2e/realtime-security.spec.ts tests/e2e/vault-settings.spec.ts --reporter=list --retries=0`
   collected nine tests and passed **0/9**. Every journey stopped behind fail-closed
   `realtime.authorize` 500 responses. This is F-003's missing-bootstrap red, not a transport
   verdict.
2. After a fresh database reset, the local Realtime tenant's symmetric key was decoded inside a
   shell command substitution and supplied only to the Playwright child process. It was not printed,
   persisted or browser-prefixed. The same focused command passed **7/9** and failed exactly the
   permanent-op no-refresh member delivery and same-vault lock/unlock empty-console assertions.
   Presence joins failed repeatedly and teardown issued unsigned revoke requests after lock.
3. After another fresh reset, the same process-memory key supply plus
   `tests/e2e/realtime-security.spec.ts --workers=1 --reporter=list --retries=0` passed **0/1**. The
   owner append reached the durable flow, while the current member did not render it within the
   exact 15-second assertion. Presence failures repeated independently of parallel-suite load.
4. Static lines 79-85 of `src/app/(app)/layout.tsx` place `SyncStatusProvider` inside
   `VaultProvider`. The latter's `useSyncStatusManager()` therefore resolves the module's static
   no-op default context. Live status transitions cannot reach the UI or cause the revision-01
   proposed live-context churn under this topology.

The next mutation adds sanitized aggregate lifecycle attribution in the authorized E2E/helper paths
before changing provider topology or effect dependencies.

## Sanitized attribution and revision-02 correction

The authorized E2E helper records only per-purpose authorize/revoke counts, aggregate database grant
states and incoming Realtime event kinds. It never retains or emits signed request bodies, frame
payloads, identities, vault IDs, grant IDs or tokens.

Before the provider correction, the isolated two-context journey observed these sanitized aggregate
database states after cleanup:

| Purpose  | Total | Live | Revoked | Expired unrevoked |
| -------- | ----: | ---: | ------: | ----------------: |
| sync     |     4 |    3 |       1 |                 0 |
| presence |     8 |    3 |       5 |                 0 |

The browser created two owner sync authorizations before import, which falsified the first proposed
one-per-context bound. Source attribution separated the triggers: `VaultProvider` owns sync, while
`useVaultPresence` owns Presence; React development replay and the member's initial-vault to
shared-vault change overlap those lifecycles. The earlier source-impossible explanation was not
retained.

Revision 02 then made only the authorized corrections:

- `SyncStatusProvider` now encloses `VaultProvider`, so real manager state reaches the existing UI.
- The vault initialization effect uses primitive identity/vault/wrapped-key values and stable
  specific sync-status and tRPC callbacks. Cancellation and exact-manager cleanup prevent stale
  initialization from publishing state, while genuine identity/vault/key changes still recreate the
  manager.
- The app-level Lock action awaits both vault-sync and Presence disconnects before clearing the
  signed session, preserving authenticated explicit revoke requests.
- Playwright obtains the running local Realtime tenant's symmetric key only in configuration-process
  memory, passes it only to the child web-server environment and fails fast with an actionable local
  stack message. It does not print, persist, browser-prefix or provide a production fallback.
- The E2E journey asserts bounded initial lifecycle counts and records only sanitized grant/frame
  aggregates. The lock journey asserts explicit per-purpose revocation.

`pnpm typecheck` passed after these corrections and again after the final sanitized frame observer.
The ordinary isolated Playwright command was deliberately run with the parent `SUPABASE_JWT_SECRET`
unset, proving the config bootstrap reaches the browser journey without an authorize-500 environment
gate.

## Post-correction counterexample and stop boundary

After a fresh `pnpm db:reset`, the ordinary isolated command was:

```text
env -u SUPABASE_JWT_SECRET pnpm exec playwright test tests/e2e/realtime-security.spec.ts \
  --workers=1 --reporter=list --retries=0
```

It collected one test and failed **0/1** at the first live-delivery step. Initial lifecycle bounds
passed, the owner operation reached the authoritative permanent table, and the member received
exactly **zero** incoming `postgres_changes` event kinds during the 15-second window. Therefore the
failure is upstream of `SyncManager.applyRemoteUpdate()` and React rendering. Installed
`loro-mirror` source independently shows that its `Mirror` subscribes directly to `LoroDoc`, so no
`onRemoteUpdate` callback or CRDT/UI path is justified by this evidence.

Private Presence also continued to fail channel authorization. Immediately after the failing run and
context cleanup, the sanitized database aggregates were:

| Purpose  | Total | Live | Revoked | Expired unrevoked |
| -------- | ----: | ---: | ------: | ----------------: |
| sync     |     5 |    3 |       2 |                 0 |
| presence |    10 |    3 |       7 |                 0 |

Migration 007 publishes `public.vault_ops`, and the failed journey left two durable rows, so neither
a missing publication nor a missing write explains the zero-frame result. Source inspection instead
shows two authorization lifecycle defects outside revision-02 authority:

1. A sentinel initial mint revokes every other live grant for the exact identity/vault/purpose.
   Separate browser tabs and overlapping React replacement managers use independent credential
   managers, so a later initial mint invalidates a still-subscribed channel. This contradicts the
   required duplicate-tab behavior; single-live-grant rotation cannot be retained as a churn
   workaround.
2. The private channel join always carries Broadcast configuration, and Presence enables the
   Presence extension as well. Migration 007 permits only Broadcast for a sync-purpose topic and
   only Presence for a presence-purpose topic. The real private Presence join is repeatedly denied,
   so the policy must authorize the minimum extension set actually required by the client/server
   join while retaining exact topic, purpose, vault, membership, role, grant and expiry checks.

Those findings require a migration/database-test owner outside the six exact revision-02 paths. Per
the dispatch, implementation stops here rather than widening authority. No full-suite, build,
database audit, CLI charter or green E2E claim is made after this deterministic counterexample.

## Q-PROPOSAL-P05-02-01 — support concurrent private Realtime grants and actual join authorization

- **Raised by/package/revision:** `human_scratch_implementer`, P05, revision 02, 2026-07-20.
- **Context and evidence:** The revision-02 topology/dependency correction and hermetic local secret
  bootstrap work, but a fresh ordinary isolated journey still receives zero member
  `postgres_changes` frames and private Presence is denied. Sanitized lifecycle/grant counts are
  recorded above. Migration 007's sentinel mint revokes every exact-scope live grant, while each
  tab/manager owns an isolated channel and credential lifecycle. Its topic policy also permits only
  one extension per purpose despite the actual private join shape.
- **Why existing authority does not decide it:** HS-015 requires duplicate tabs, current-member
  no-refresh push, private Presence, bounded refresh/revoke and removal denial, but does not choose
  a concurrent-grant database model or Supabase's extension-policy representation. Revision 02
  grants no migration or database-audit path, so it cannot safely change either proven owner.
- **Options considered:** (A) add a forward migration that lets independent initial connections
  coexist while an in-band refresh revokes only its explicit previous grant, and authorize only the
  extension checks required for the exact private topic/purpose; (B) share one credential/channel
  across tabs through new cross-tab coordination; (C) suppress React replay/extra managers while
  retaining global single-live rotation; or (D) accept durable pull recovery instead of live push. A
  directly supports independent tabs and existing per-channel refresh/revoke. B is substantially
  broader and creates cross-tab ownership/failure modes. C still breaks genuine duplicate tabs. D
  violates the frozen live-delivery acceptance.
- **Reversible default selected to continue:** choose **A** in revision 03. Retain the six
  revision-02 paths and add exactly:

```text
supabase/migrations/008_realtime_authorization_lifecycle.sql
tests/database/rls-audit.sql
tests/database/legacy-upgrade-audit.sql
```

The forward migration must preserve exact opaque grant, identity, vault, role, purpose, topic,
membership, expiry and removal checks; rotate only the caller's explicit previous grant; permit
independently revocable short-lived grants for concurrent clients; prune or otherwise bound stale
rows without invalidating active sibling connections; and minimally correct the actual private
Presence extension checks. The database audits must cover two simultaneous grants, independent
refresh/revoke, cross-vault/purpose/extension denial, expiry and immediate membership-removal denial
on both fresh and 005-to-latest upgrade paths.

- **Decision-hierarchy basis:** explicit HS-015 live delivery, duplicate-tab and private Presence
  requirements control, followed by least privilege and safe revocation, then the smallest
  forward-only database correction. No transport, SyncManager or CRDT owner is added without an
  incoming-frame counterexample.
- **Impact and risk:** allowing bounded concurrent grants increases the number of usable credentials
  during their 60-second lifetime, so exact per-grant revoke, expiry, membership revalidation and
  stale-row bounding are mandatory. An overly broad extension policy could expose Broadcast or
  Presence across purposes; exact topic/purpose and adversarial audit assertions must remain. Until
  revision 03, current-member live delivery and Presence are unreliable and HS-015 remains
  incomplete despite durable encrypted pull recovery.
- **Reversal or migration path:** migration 008 is forward-only and changes authorization functions,
  not encrypted user data. A later migration can restore a stricter concurrency cap or extension
  mapping without rewriting vault operations. Existing grants remain short-lived and can be revoked
  or allowed to expire; revision-02 provider/config/test corrections can be reverted independently.
- **Human review still useful after completion:** no preference blocks continuation. Root can apply
  this reversible default through a revision-03 dispatch and independent review. Human review is
  optional if the product owner wants a different explicit concurrent-device limit.

## Commit, verification and final boundary

- Revision-02 product/test/config commit: `e865023f6001704be0304bed4e75e76956854ea6`
  (`fix: stabilize realtime lifecycle diagnostics`).
- `72c90d132110d02641502b64d6263920abe0749d..e865023f6001704be0304bed4e75e76956854ea6` contains
  exactly the six authorized paths listed in the pre-mutation boundary. Exact-path staging was used;
  no blanket staging command was used.
- The cumulative review range remains the original package
  `007651beb814d98646aa2e786801b647e2abd0b5..e865023f6001704be0304bed4e75e76956854ea6`, including
  revision 01 and root's immutable evidence/review/control integration.
- Focused final static gates passed: `pnpm typecheck`; ESLint on all six committed paths; Oxfmt
  check on all six paths plus this evidence; and `git diff --check`. An earlier focused ESLint
  invocation caught a render-time ref assignment; it was corrected by updating the tRPC utility ref
  in an effect before the passing final gate.
- The fresh ordinary isolated E2E is intentionally red **0/1** at the zero-frame assertion described
  above. This is the evidence requiring revision 03, not a PASS or an environmental skip.
- `next-env.d.ts` was restored to its pre-run generated declaration and is clean. Final staged state
  is empty. The only dirty paths are root-owned unstaged `HANDOFF.md` and `PROGRESS.md`, plus this
  sole untracked revision-02 evidence artifact. Immutable revision-01 evidence/review, frozen
  sources, scratch markers and all other paths remain untouched.
