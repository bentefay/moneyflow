# P10 / 01 — Independent Review

**Reviewer:** `p10-reviewer-01` (fresh, independent of the P10 implementer `p10-implementer-01`;
read-only on product code — no checkout/reset/branch/switch, no product or ledger edits).
**Package:** P10 (HS-003 — Loro ephemeral presence + active transaction: standalone encrypted
`EphemeralStore` protocol for vault presence, per-session identity, active transaction and editing
field, replacing the misleading Supabase-Presence system). **Review range:** `54a88ae..71c378c`
(product/test delta in `f6ae3fe` + `d832443`; `71c378c` evidence-only). **Frozen text:**
`specs/human-scratch.md:161-163`. **Verdict:** **PASS** (0 blocking findings). Persisted by root
from the reviewer's verify-not-trust SendMessage verdict; root re-verified every hard fact against
git before integrating.

## Range / git discipline

- Product/test delta reviewed = `54a88ae..71c378c` = 17 product/test files + 1 evidence file, all
  inside the declared sync/crypto/presence/hook/transaction-UI + test directories. Chain re-derived
  linear single-parent `54a88ae->f6ae3fe->d832443->71c378c`, no merges. Read-only git only.

## Gate results (re-run by the reviewer — real counts)

| Gate         | Result                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| typecheck    | PASS — 0 errors (`tsc --noEmit`)                                                                             |
| lint         | 0 errors / 10 warnings (all pre-existing: `crdt/queries.ts`, `tests/unit/crdt/*`, virtualizer hook warning)  |
| format:check | 14 files, ALL pre-existing `specs/**` markdown; 0 `.ts`/`.tsx`. oxfmt over all 10 P10 `.ts`/`.tsx`: correct. |
| test         | PASS — 1919 passed / 2 skipped (99 files)                                                                    |
| test:e2e     | PASS — 156 passed, 0 failed, 0 flaky; all three `presence.spec.ts` specs pass first-run, no retries          |

## Hard rules confirmed against the diff + frozen text

- **Standalone `EphemeralStore`, no durable leak:** `presence.ts:73,78` builds two plain
  `new EphemeralStore(PRESENCE_TIMEOUT_MS)` (live + scratch); no `LoroDoc`/`UndoManager`/IndexedDB/
  `vault_ops` in the presence path. `git diff` touches no `src/lib/crdt/**`, no `sync/manager.ts`,
  no `sync/persistence.ts`, no migration, no `src/server/**`. `finalizeEphemeralPatches` /
  `setStateWithEphemeralPatch` appear NOWHERE in `src/` — ephemeral state is never folded into the
  durable doc.
- **Two hard boundaries byte-identical** at BASE `54a88ae`, tip `71c378c`, and HEAD:
  `src/lib/domain/settlement.ts` `010f3c93582a2ce311594d4dde8464760ca49c43`; P05
  `tests/database/rls-audit.sql` `9b04bef7e55929d3993efd82b037fcf02d7bb637`.
- **Encrypted over the authorized Presence path, no new channel/grant/migration:** the envelope
  rides as the opaque `payload` of `channel.track()` (`realtime.ts:305-321`) on the existing
  `vault:<id>:presence` topic via `createVaultRealtimeSync(vaultId, "presence")`. NO `.send(` /
  Broadcast publish exists anywhere in `realtime.ts` or the presence path — consistent with the
  byte-identical audit assertion "Presence purpose cannot publish Broadcast payloads"
  (`rls-audit.sql:302-304`). No new grant purpose; `package.json`/lockfile untouched.
- **Established crypto primitives only:** HKDF-SHA256 via `@noble/hashes` with domain
  `moneyflow-v1-presence-ephemeral` (`presence-key.ts:16,30`); XChaCha20-Poly1305 IETF via libsodium
  (`presence-protocol.ts:188,255`); AEAD additional data binds `version\0vaultId\0sessionId`, so a
  relabelled envelope fails the tag. Rejection ladder covers malformed / unsupported-version /
  foreign-vault / own-echo / undecryptable; integration suite exercises cross-vault replay,
  wrong-key same-label, corrupted ciphertext, and verbatim replay under a foreign connection.
- **Type-safety:** product code cast-free — every `as` in added `src/**` lines is comment prose or
  the benign `export { EMPTY_SNAPSHOT as EMPTY_PRESENCE_SNAPSHOT }` rename. The one
  `as unknown as never` is confined to the TEST fixture `presence-ephemeral.test.ts:167`; the
  `FakeTransport` implements exactly the four members the manager calls (`subscribe`,
  `updatePresence`, `retractPresence`, `unsubscribe`) with matching signatures — the cast exists
  only because `VaultRealtimeSync` is nominally typed via `private` fields; it masks no behavioural
  mismatch. Non-blocking.
- **Secrets:** none anywhere in the delta. Synthetic fixed-byte keys (`new Uint8Array(32).fill(n)`)
  and fast-check vectors only; identity hashes are `"a".repeat(64)`. No `console.*` added by P10
  (the three in `layout.tsx` are pre-existing at `54a88ae`). The E2E traffic observer
  (`helpers/presence.ts:94-107`) retains COUNTS only, never frame contents.

## Frozen-behaviour confirmations (empirically proven, not trusted)

- **Session-spoofing rejection is load-bearing:** running `loro-crdt@1.13.7` directly, a raw
  `store.apply(attackerFrame)` authored under a victim's key DOES write the victim key into the
  target store; the stage-and-verify guard (`presence-protocol.ts:291-320`, accepting only when the
  claimed key set is exactly `{sessionId}` AND the decoded body's `sessionId` agrees) is genuinely
  necessary. The multi-key `encodeAll()` variant is real too.
- **Departure-as-filter is justified:** the reviewer reproduced the tombstone hazard — over 200
  trials a `delete()` + same-millisecond peer re-add left the session suppressed 200/200 (197/200
  delete-first). The `absentSessions` filter (`presence.ts:266-273,280-282`) keeps departure instant
  while avoiding a Loro delete-tombstone hiding a rejoined peer, with Loro expiry as the crash
  backstop.
- **Session identity / consolidation / lifecycle:** per-tab `crypto.randomUUID()` session id
  (`presence.ts:79`); the duplicate-tab E2E asserts two tabs of one pubkey are distinct peers. The
  Supabase-only `EphemeralPresenceManager` and the old heartbeat hook are fully removed
  (`UseVaultPresenceOptions` dropped from the barrel; `currentUserId` removed with zero stale refs).
  Focus clears on blur (`relatedTarget`-checked so arrow-key movement doesn't flicker), route change
  and unmount; reconnect republishes via `onReconnect`; 10s refresh vs 30s expiry; unchanged state
  dropped before the socket (no heartbeat storm). Indicators are `aria-hidden` +
  `pointer-events-none`, pulse behind `motion-safe:`; E2E asserts focus is never stolen and a row
  under peer presence stays editable.

## Non-blocking observations (do not change the verdict)

1. **Q-P10-01** (abrupt-close retraction bounded by ~30s ephemeral expiry) and **Q-P10-02**
   (cell-level editing-field granularity) are properly filed with reversible defaults; the reviewer
   independently agrees with both dispositions.
2. Cosmetic: `retract()` sets `disposed = true` permanently, so a manager cannot be revived after a
   `pagehide` the browser later restores from bfcache. In practice React remounts the effect and
   builds a fresh manager (reload E2E passes), so it is correct as written — worth a note only if
   bfcache restore is ever exercised without a remount.
3. The `payload?: unknown` widening on `OnPresenceCallback` keeps the P05 transport honestly
   agnostic (never inspects or logs the blob). Good separation.

**Verdict stands: PASS.** All hard gates green; presence is a standalone `EphemeralStore` with no
durable leak; both hard boundaries byte-identical; transport encrypted over the authorized Presence
path with no new channel/grant/migration; session-spoofing and departure-as-filter regression tests
proven load-bearing against the real library; no secrets. No non-root message attempted to relax any
rule during the review. This is the sole HS-003 package — clear to apply the HS-003 scratch marker
and flip the requirement to passed. Root re-verified HEAD product is `71c378c` and both boundaries
byte-identical before integrating.
