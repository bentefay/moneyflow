# P05 Independent Review — Revision 01

## Verdict

**FAIL.** The revision establishes a substantially stronger least-privilege Realtime design and its
unit, integration, fresh-schema and upgrade-schema gates pass, but the required real two-client
delivery and cleanup contract is red. With the correct local signing secret supplied, the committed
regression still fails to deliver the owner's permanent encrypted `vault_ops` insert to a current
member without refresh, and the existing same-vault lock/unlock journey records repeated private
Presence failures and teardown authorization errors. HS-015 cannot be marked complete.

The implementer's `Q-PROPOSAL-P05-01-01` is not accepted as a complete diagnosis or revision plan.
The actual provider topology means `VaultProvider` currently reads the static default sync-status
context, so changing live sync-status context identity cannot presently retrigger its effect. A
corrected complete proposal, `Q-PROPOSAL-P05-01-02`, appears below. This is a review recommendation
only: root retains question transcription, revision dispatch, integration, ledger and scratch-marker
authority.

## Immutable review boundary

- Package/revision: `P05/01`, cumulative `HS-015` review.
- Literal reviewed range:
  `007651beb814d98646aa2e786801b647e2abd0b5..29e4a1014d1cfa8ad5614b5fdadeba1890523554`.
- The range contains one commit, `29e4a1014d1cfa8ad5614b5fdadeba1890523554`
  (`feat(sync): authorize private realtime vault streams`).
- It changes exactly the 19 handoff-authorized paths below, with 1,650 insertions and 520 deletions.
  No control, evidence, review, scratch, feature-spec, `.claude` or `.codex` path is committed.

```text
.env.local.example
src/hooks/use-vault-presence.ts
src/lib/supabase/client.ts
src/lib/supabase/database.types.ts
src/lib/supabase/realtime.ts
src/lib/sync/manager.ts
src/lib/sync/presence.ts
src/server/routers/_app.ts
src/server/routers/realtime.ts
src/server/schemas/realtime.ts
supabase/config.toml
supabase/migrations/007_realtime_authorization.sql
tests/database/legacy-upgrade-audit.sql
tests/database/rls-audit.sql
tests/e2e/helpers/index.ts
tests/e2e/helpers/realtime.ts
tests/e2e/realtime-security.spec.ts
tests/integration/realtime-auth.test.ts
tests/unit/sync/realtime.test.ts
```

- Frozen implementation evidence:
  `specs/007-human-scratch-completion/evidence/P05/implementation-01.md`, independently verified
  SHA-256 `1016c7c479e20c9bc29da3e03d80a21bbdac34a78316e6e1f55539029a9f9066`, 293 lines and 20,793
  bytes.
- `git diff --check BASE..HEAD` passes. The index is empty. Before this review artifact, Git-visible
  dirt was limited to root-owned unstaged `HANDOFF.md`/`PROGRESS.md` and the frozen untracked P05
  implementation evidence. Generated `next-env.d.ts` and browser output were restored/removed.

## Findings

### F-001 — Critical — required live delivery, Presence and explicit cleanup remain red

The checked-in real-browser acceptance test correctly requires two isolated browser contexts to join
the same encrypted vault and observe import, edit and deletion by push without a member refresh
(`tests/e2e/realtime-security.spec.ts:19-108`). The owner's imported operation is durably present in
the permanent `vault_ops` source, but the member never renders `Realtime encrypted import` within
the explicit 15-second window at lines 84-86. The failure independently reproduces from a fresh
latest-schema database with one worker and no retry, so neither later P08 invitation UI nor P10's
active-transaction UX can substitute for this P05 transport proof.

With the correct local Realtime signing secret supplied only to isolate product behavior, the
focused two-spec run passes 7/9 and fails exactly:

1. `realtime-security.spec.ts`: current member misses the permanent encrypted owner insert for the
   complete 15-second no-refresh assertion.
2. `vault-settings.spec.ts`: same-vault lock/unlock reaches its empty-console assertion
   (`tests/e2e/vault-settings.spec.ts:128-170`) with repeated
   `Failed to connect vault presence: Realtime connection failed` errors and teardown-time 401
   `Missing auth` responses.

An isolated repeat of only `realtime-security.spec.ts` after a fresh reset fails at the same member
delivery assertion. Immediately before the final cleanup reset, sanitized database aggregates from
that run showed ten Presence grants (seven explicitly revoked, three live), five sync grants (two
explicitly revoked, three live), and two permanent `vault_ops` rows. Exact rotation prevents more
than one unexpired live grant per identity/vault/purpose, and 60-second expiry bounds reuse, but
repeated creation and incomplete explicit revocation still violate the package lifecycle contract.
The implementer's separate diagnostic of 11 sync and 12 Presence grants is therefore directionally
confirmed, although counts differ because the independent sample stopped at a different point.

The transport implementation has the intended static pieces: private exact-vault channels, explicit
pre-join `setAuth`, INSERT-only `vault_ops` filtering, isolated client removal/disconnect and grant
revoke are exercised at `tests/unit/sync/realtime.test.ts:155-215`; SQL keeps one live grant and
checks exact current claims/membership; and the owner op remains durable. Those properties do not
close a genuinely red delivery/cleanup journey. Revision 02 must make the checked-in acceptance test
green with bounded grant creation and explicit final teardown, without weakening its no-refresh,
console, membership-removal or permanent-op assertions.

### F-002 — High — the proposed cause is impossible under the current provider topology

`src/app/(app)/layout.tsx:79-85` nests `SyncStatusProvider` **inside** `VaultProvider`.
`VaultProvider` calls `useSyncStatusManager()` at `src/components/providers/vault-provider.tsx:59`,
above that provider, so React returns the module-level `defaultContextValue` from
`src/hooks/use-sync-status.tsx:52-63`. Its setters and registration callback are no-ops.
Consequently:

- the live context object reconstructed at `use-sync-status.tsx:83-94` cannot itself retrigger the
  `VaultProvider` initialization effect;
- `SyncManager` status transitions at `vault-provider.tsx:147-170` are currently not wired to the
  status UI at all; and
- the recommended provider-only dependency edit in `Q-PROPOSAL-P05-01-01` would leave the topology
  and no-op status contract broken.

The initialization effect at `vault-provider.tsx:88-196` also depends on `vaultListQuery.data` and
the whole `trpcUtils` object. Either identity may be unstable, while the separate Presence effect at
`src/hooks/use-vault-presence.ts:70-130` has its own lifecycle. Static inspection does not prove
which of those paths produces the observed sync/Presence churn. Revision 02 must first add sanitized
test instrumentation/assertions that attribute each authorize/revoke and effect initialize/cleanup
to its purpose and trigger. It must then put `SyncStatusProvider` above `VaultProvider`, depend on
stable specific status callbacks and tRPC operations (or refs), and prove that real vault/identity
changes still recreate exactly when required. Do not accept an assumed single cause or suppress the
status callbacks.

### F-003 — Medium — ordinary local and CI E2E startup lacks the required signing-secret bootstrap

`src/server/routers/realtime.ts:25-33` fails closed unless `SUPABASE_JWT_SECRET` is at least 32
bytes. `.env.local.example:26-30` documents only a placeholder, while `playwright.config.ts:24-28`
starts plain `pnpm run dev`, `package.json`'s `test:e2e` command supplies no environment bootstrap,
and this repository's current `supabase status -o env` output does not expose the symmetric tenant
secret. The current checkout had no `.env.local` and no inherited signing-secret environment value.

Accordingly, the ordinary focused Playwright command first failed 9/9 before reaching the transport
assertions because every `realtime.authorize` call returned 500. That environmental run is not the
product failure in F-001: a reviewer-only in-memory extraction from the local Realtime container was
used without printing or persisting the value, and the corrected run then exposed the genuine 7/9
result. Container inspection is not an acceptable developer or CI contract. Revision 02 must make
the repository's Playwright web-server startup hermetic for the known local stack, or fail fast with
an actionable preflight before browsers start. Production must still require its deployment-owned
tenant secret; no secret may be committed, printed, browser-prefixed or placed in artifacts.

## Security, database and source adjudication

Subject to the live lifecycle findings, source and database inspection support the revision's core
authorization model:

- `src/server/routers/realtime.ts:25-78` signs only 60-second HS256 credentials and binds opaque
  grant, authenticated role, exact vault, permanent table, purpose/topic and vault role. No public
  key hash or service/signing credential enters the returned claims.
- `supabase/migrations/007_realtime_authorization.sql` atomically validates current non-deleted
  membership, revokes the prior/current exact-purpose grant, records one replacement, makes
  `vault_ops` readable only under an exact live sync claim, and protects private Broadcast/Presence
  messages with exact topic/purpose policy. Direct table/function grants remain least privilege.
- Installed `@supabase/realtime-js` 2.110.7 source confirms token-bearing join frames and in-band
  `setAuth`, private channels default false, and bounded 1/2/5/10-second reconnect intervals. The
  product explicitly chooses a private isolated client and keeps vault/token scope out of the socket
  URL.
- Unit/integration coverage verifies exact token claims, anonymous/outsider denial, single-flight
  refresh, prior-grant rotation, private exact-vault `vault_ops` subscription and teardown calls.
  Fresh and seeded-upgrade pgTAP independently verify exact-vault/membership/removal isolation,
  append-only permanent ops, single-live-grant behavior and legacy preservation.

No service credential, Realtime JWT, seed phrase, identity hash or financial plaintext was printed
or persisted by this review. The reviewer-only server process was stopped, browser artifacts were
removed, and the local database was finally reset to fresh migrations 005, 006 and 007 with no seed.

## Independent validation

| Check                                      | Independent result                                     |
| ------------------------------------------ | ------------------------------------------------------ |
| focused Realtime Vitest                    | 2 files, 8/8 passed                                    |
| complete unit/integration suite            | 47 files, 1,170/1,170 passed                           |
| lint                                       | exit 0; 13 baseline warnings, no errors                |
| typecheck                                  | exit 0                                                 |
| production build                           | passed; all 17 routes compiled/generated               |
| fresh `supabase db reset --no-seed`        | migrations 005, 006 and 007 applied                    |
| fresh `tests/database/rls-audit.sql`       | 69/69 passed                                           |
| seeded upgrade 005 fixture -> 006 -> 007   | 18/18 legacy-upgrade assertions passed                 |
| ordinary focused E2E, missing bootstrap    | 0/9; authorize returned 500 (F-003 environment gate)   |
| corrected-secret focused E2E, retries 0    | 7/9; genuine delivery and lock/unlock failures (F-001) |
| isolated fresh-DB Realtime E2E, one worker | 0/1; same 15-second member-delivery failure            |
| `git diff --check BASE..HEAD`              | passed                                                 |

The focused browser command was
`pnpm exec playwright test tests/e2e/realtime-security.spec.ts tests/e2e/vault-settings.spec.ts --retries=0`;
the isolated repeat selected only `realtime-security.spec.ts` with one worker. The complete 81-test
browser suite was not rerun independently after these deterministic failures because the immutable
evidence already records the candid 79/81 full-suite result and the two exact failures were
reproduced directly. The installed CLI journey was likewise not repeated: it cannot close a
deterministically red checked-in two-context gate, and the implementer evidence already records its
sanitized Presence failure. These are proportional runtime limitations, not grounds to soften FAIL.

## Q-PROPOSAL-P05-01-02 — correct provider topology, identify churn and bootstrap local E2E

- **Raised by/package/revision:** `human_scratch_reviewer`, P05, revision 01, 2026-07-20. This
  supersedes the incomplete implementer `Q-PROPOSAL-P05-01-01`; root should not transcribe that
  proposal as accepted without this correction.
- **Context and evidence:** HS-015 requires reliable current-member live propagation, secure shared
  Presence transport and bounded cleanup. Correctly signed independent E2E reproduces missed
  permanent-op delivery, Presence join errors, repeated grants and incomplete explicit revocation.
  Source proves the proposed context-identity cause cannot currently operate because
  `SyncStatusProvider` is below its consumer and the consumer gets static no-op defaults. Possible
  remaining triggers include `vaultListQuery.data`, `trpcUtils`, the separate Presence hook, or a
  combination; runtime attribution is presently absent. Ordinary Playwright startup also lacks the
  required local signing secret.
- **Why the frozen requirement/repository does not fully decide it:** HS-015 decides the outcome but
  not React ownership or local-secret injection. Revision-01 authority excludes the two provider
  topology files and `playwright.config.ts`. It also does not justify guessing which remaining
  dependency churns or weakening private authorization, live-push, status UI or cleanup behavior.
- **Options considered:** (A) move `SyncStatusProvider` above `VaultProvider`, make the provider
  effect depend only on stable specific callbacks/operations, and use sanitized counters to identify
  every sync and Presence initialize/cleanup trigger; (B) memoize the context object without
  reordering; (C) edit only the provider dependency list as revision-01 proposed; (D) suppress
  status callbacks or accept pull/expiry as sufficient. Only A repairs the currently disconnected
  status contract and provides evidence for the real churn. B and C leave the consumer outside the
  provider; D violates existing UX and HS-015.
- **Reversible default selected to continue:** choose **A**. Revision 02's exact writable paths are:

```text
src/app/(app)/layout.tsx
src/components/providers/vault-provider.tsx
playwright.config.ts
tests/e2e/helpers/realtime.ts
tests/e2e/realtime-security.spec.ts
tests/e2e/vault-settings.spec.ts
```

The first two are the minimum topology/consumer correction. `playwright.config.ts` is justified only
by F-003's source/reproduction evidence. The three already-authorized P05 E2E paths must add
sanitized per-purpose mint/revoke and bounded-lifecycle assertions while preserving the real
no-refresh member journey. All other product, transport, router, migration and database paths stay
read-only in revision 02. If the required instrumentation proves a defect in another path, stop and
return a new complete proposal rather than widening silently.

- **Required acceptance evidence:** demonstrate the status UI receives real manager transitions;
  record sanitized sync/Presence initialize and cleanup causes; pass import/edit/delete without
  member refresh; prove expiry refresh without a reconnect storm; prove lock/unlock, vault change
  and membership removal; assert bounded per-purpose grant counts and explicit final revocation; run
  the focused/full Vitest, fresh/upgrade database gates, lint, typecheck, build, full retries-zero
  E2E and installed CLI owner/member/outsider/background charter. The ordinary documented E2E
  command must either bootstrap the local symmetric secret without disclosure or fail fast before
  browser work.
- **Decision-hierarchy basis:** explicit HS-015 delivery/security/cleanup comes first, followed by
  the existing connected sync-status contract, evidence-backed diagnosis, least privilege, and the
  smallest reversible path expansion. This rejects a source-impossible cause without broadening into
  P08 invitation UI or P10 encrypted active-transaction presence.
- **Impact and risk:** reordering providers changes which subtree observes sync status; overly broad
  or stale dependencies could create either reconnect storms or a manager retained across a real
  identity/vault change. Test-only secret bootstrap could accidentally disclose or normalize a
  production fallback if poorly scoped. Exact lifecycle, URL/log, production fail-closed and
  cross-vault tests are therefore mandatory.
- **Reversal or migration path:** the topology/dependency/config correction is local and requires no
  database or encrypted-data migration. Revert those paths if the instrumented lifecycle worsens,
  retain the revision-01 schema/credential model, and propose the newly proven owning path. Existing
  grants remain compatible and expire within 60 seconds.
- **Human review still useful after completion:** no product preference blocks continuation. Root
  may apply the reversible default under PROCESS. Human review is optional if the owner wants a
  different sync-status ownership or local development secret-management policy.

## Frozen sources, formatting and later-package boundaries

- `specs/human-scratch.md` remains SHA-256
  `c74a2a782543d00880fa30a771be4e39c75d89889e484ee46570fb4a6cf0ecdd`, exactly 350 lines and 24,243
  bytes. All 21 ordered blocks normalize byte-for-byte to `SCOPE.json`; the checked set is exactly
  HS-002, HS-014, HS-017 and HS-018. HS-015 remains unchecked.
- FS-001, `specs/008-transaction-percentage-allocations-settlement/spec.md`, remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, exactly 715 lines and 25,441
  bytes.
- Repository-wide format remains red only on frozen/control Markdown already routed through
  R-024/P20B/P21. The P05 product/test range is formatter/diff clean. No scratch marker is
  authorized by this FAIL.
- P08 still owns real invitation, key-wrap and member-management UI. P10 still owns encrypted Loro
  active-transaction Presence UX. P05 must nevertheless make their shared private transport join,
  deliver and clean up correctly; those later packages cannot waive the present failures.

## Exact next revision

Root should preserve this review and revision-01 evidence as immutable, transcribe the corrected
proposal under its sole ledger authority, set P05/HS-015 to `changes_requested`, and dispatch P05
revision 02 against the same original BASE with a new exact evidence file. Revision 02 must use only
the six paths in `Q-PROPOSAL-P05-01-02`, produce a new committed HEAD and immutable
`evidence/P05/implementation-02.md`, and receive independent review in `reviews/P05-review-02.md`.
No HS-015 marker may change before that exact cumulative range passes.
