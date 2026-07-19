# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P05 / 01
- **Scope IDs:** HS-015; no scratch marker before independent package PASS and root integration
- **State:** changes_requested
- **Task:** `tasks/HS-015-realtime-security.md`
- **Original package BASE:** `007651beb814d98646aa2e786801b647e2abd0b5`
- **Pre-implementation HEAD:** `007651beb814d98646aa2e786801b647e2abd0b5`
- **Allowed implementation paths:** `.env.local.example`, `package.json`, `pnpm-lock.yaml`,
  `supabase/config.toml`, `supabase/migrations/**`, `src/lib/supabase/**`,
  `src/lib/sync/{manager,presence,index}.ts`, `src/hooks/use-vault-presence.ts`,
  `src/server/routers/{_app,realtime}.ts`, `src/server/schemas/realtime.ts`,
  `tests/database/**`, `tests/unit/sync/**`, `tests/integration/realtime-auth.test.ts`,
  `tests/integration/sync-coldstart.test.ts`, `tests/integration/sync-offline.test.ts`,
  `tests/e2e/helpers/**`, `tests/e2e/sync-persistence.spec.ts`,
  `tests/e2e/tab-duplication.spec.ts`, `tests/e2e/vault-settings.spec.ts`, and a new
  `tests/e2e/realtime-security.spec.ts`. Any other product/test/config path requires a complete
  proposal and later revision; do not widen silently.
- **Sole implementer artifact:** `evidence/P05/implementation-01.md`; write the dated primary-source
  protocol/authorization/origin ADR and red baseline before any mutation
- **Commit contract:** commit authorized product/migration/test/config changes only with exact-path
  staging; leave evidence uncommitted. Never broad-stage or edit ledgers/tasks/reviews/scratch/
  FS-001/.claude/.codex.
- **Pre-existing dirty/untracked paths:** root-owned unstaged `PROGRESS.md` and `HANDOFF.md`, plus
  assigned uncommitted `evidence/P05/implementation-01.md`; no staged paths
- **Protocol decision:** distinguish browser CORS/redirect allow-lists, WebSocket origin/TLS and
  actual channel/data authorization using current primary Supabase docs and installed source. The
  server must mint only short-lived least-privilege credentials after P04 verified identity and an
  exact current vault membership/role check; no service credential or untrusted hash reaches the
  browser. Record expiry, refresh, replay/reuse, revocation/removal and clock-skew behavior.
- **Data/source invariant:** subscribe only to permanent encrypted `vault_ops`; never the legacy
  compatibility view/table. Snapshots remain pull/cache only. Server independently authorizes all
  writes. Any authorized direct read is scoped to the token's exact vault/table/purpose and cannot
  enumerate another vault.
- **Lifecycle invariant:** connect, refresh before expiry, background/foreground, duplicate tab,
  reconnect, offline catch-up, same-vault lock/unlock and membership removal must be serialized and
  bounded. Expired/revoked/outsider/cross-vault credentials fail without payload flash, stale
  presence, reconnect storm, infinite spinner or silent missed op. Teardown must remove channels,
  timers, listeners, credentials and browser state.
- **Presence boundary:** secure the shared transport and private-channel authorization needed by
  later presence work, but do not claim HS-003/P10's encrypted active-transaction UX. Do not expose
  signing keys, token material, public-key hashes, financial plaintext or vault/query inputs in
  URLs/logs/artifacts.
- **Automated evidence:** token mint/shape/expiry/refresh/wrong-vault/removed-member tests; current
  publication/table assertions; owner/member/outsider subscription and payload isolation; two-real-
  context push-driven encrypted edit/import/delete without reload; token expiry/reconnect/offline
  catch-up/removal; repeated retries-zero journey; fresh/upgrade database, unit, type, lint, build
  and full E2E.
- **Manual charter:** repository-installed headless CLI only, with isolated owner/member/outsider and
  duplicate/background sessions. Observe a genuine live push without refresh, expiry/reconnect and
  safe denial; inspect console, failed requests and socket/server logs for legacy traffic, origins,
  storms, secrets/identities/inputs in URLs and unauthorized payloads; close/delete all sessions and
  artifacts. If current UI cannot create the real member, use a documented deterministic test
  fixture for transport proof and retain the P08 UI/key-wrap route without faking it.
- **Inherited boundaries:** preserve D-010, P04 append-only ops and verified signed POST identity;
  R-024 remains P20B/P21 and does not authorize frozen Markdown edits. Recheck all 21 normalized
  scratch blocks and immutable FS-001 on return.
- **Question route:** use complete proposals in sole evidence; root alone appends QUESTIONS. Apply
  the decision hierarchy and continue unless genuine destructive/new-secret authority is required.

## Review dispatch

This section records the immutable completed revision-01 review.

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal reviewed BASE:** `007651beb814d98646aa2e786801b647e2abd0b5`
- **Literal reviewed HEAD:** `29e4a1014d1cfa8ad5614b5fdadeba1890523554`
- **Range type:** non-empty revision-01 product/config/migration/test range
- **Implementation evidence:** `evidence/P05/implementation-01.md`
- **Sole reviewer artifact:** `reviews/P05-review-01.md`
- **Prior review files:** none
- **Reviewer writes:** review file only; no other writes/commits
- **Review result:** FAIL; SHA-256
  `52350e039f75934e59ec6f431fba4d041ef9df6f4e685411608fe86e06436ba5`
- **Blocking findings:** F-001 Critical live delivery/Presence/cleanup remains red; F-002 High
  implementer provider-only diagnosis is source-impossible under current topology; F-003 Medium
  ordinary local/CI startup lacks hermetic secret bootstrap. Reviewer Q-PROPOSAL-P05-01-02
  supersedes implementer Q-01-01 and recommends an exact six-path revision 02.
- **Required review focus:** independently reproduce protocol/primary-source claims, grant and
  membership boundaries, permanent-op subscription, revocation/expiry/reconnect behavior, origin/
  TLS/URL inspection, full gates, cleanup and exact frozen-source/write boundaries. Reproduce and
  diagnose the preserved two-context live-delivery/Presence failure; confirm or reject the exact
  one-file revision-02 provider recommendation. Later P08/P10 work cannot substitute for P05 proof.
- **Failure route:** persist immutable artifacts, set `changes_requested`, use revision-02 paths
- **PASS authority:** reviewer recommends; root verifies/transcribes/integrates and sets `passed`

## Next root action

Persist revision-01 evidence/review, Q-003 and failure-control state with exact-path staging. Then
record the artifact commit and rewrite for P05 revision 02 using only the corrected six paths; do not
authorize an HS-015 marker.
