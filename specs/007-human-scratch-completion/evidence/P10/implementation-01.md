# P10 (HS-003) — Loro ephemeral presence and active transaction

**Package:** P10 · **Revision:** implementation-01 · **BASE:** `41c6c81` · **Dispatch:** `54a88ae`
**Final HEAD:** `d8324437fe812834e446821bc6643fad608a1057`

Linear, single-parent chain from the dispatch commit:

```
54a88ae  docs: dispatch P10 revision 01          (BASE for this package)
f6ae3fe  feat(P10): Loro ephemeral presence and active transaction
d832443  test(P10): presence lifecycle E2E and prompt leave handling
```

No `checkout` / `reset` / `branch` / `switch` / `rebase` was used; the tree stayed on `main`
throughout. `next-env.d.ts` and the stray untracked `evidence/P08/implementation-01.md` were left
unstaged, and no ledger/marker/root-owned file was touched.

## Mandatory source study

| Source                                        | Version / commit consulted                                                                                              |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `https://loro.dev/llms-full.txt`              | Fetched in full — 34 060 lines / 981 816 bytes. API reference header reads `Last updated: 2026-06-16 loro-crdt@1.13.3`. |
| `https://github.com/loro-dev/loro-mirror`     | Cloned at commit `3426c6155e729924d4464b19076cd93f3a73fd1c` (`chore: release main`, 2026-06-16).                        |
| Installed `loro-crdt`                         | `1.13.7` (`node_modules/loro-crdt/nodejs/loro_wasm.d.ts`, `index.d.ts`, `index.js`)                                     |
| Installed `loro-mirror` / `loro-mirror-react` | `2.2.0` / `2.2.0`                                                                                                       |

Read completely rather than skimmed: the whole `llms-full.txt` (API reference, all `concepts/`,
`tutorial/`, `advanced/`, performance and changelog sections), plus in the mirror repo
`packages/core/src/core/ephemeral.ts` (`EphemeralPatchManager`), `packages/core/README.md`
(“Ephemeral Patches”, routing rules, finalization, cross-peer compatibility) and the
`pages/blog/loro-mirror.mdx` design post.

### What the sources determined about the design

- `EphemeralStore` is a **separate CRDT with no history**; its operations are never persisted into a
  `LoroDoc`. This is precisely the property HS-003 needs, and it is why presence cannot reach the
  durable op log even by accident.
- Conflict resolution is **timestamp-based LWW per key**, and each peer's entry **auto-expires**
  after the constructor timeout (default 30 000 ms), with subscribers receiving `by: "timeout"`.
- Loro's own pitfalls section warns to **never share PeerIDs between concurrent tabs**. The same
  hazard applies to presence keys, which is why every tab mints its own session id.
- `loro-mirror`'s `setStateWithEphemeralPatch` routes _canvas-drag-style_ primitive edits through an
  `EphemeralStore` and then **finalizes them into the LoroDoc**. That is deliberately **not** used
  here: HS-003 requires presence that _never_ becomes durable, so this package drives
  `EphemeralStore` directly and never calls `finalizeEphemeralPatches`.

### Behaviour verified empirically against the installed build

Rather than trusting the prose, the following were confirmed by running `loro-crdt@1.13.7` directly:

| Behaviour                                                  | Observed                                                               |
| ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| `apply()` on malformed/truncated bytes                     | **Throws** (`Failed to decode data: …`) — must be caught               |
| Expiry                                                     | Key omitted from `getAllStates()`/`keys()`; `by:"timeout"` fires       |
| Replay of an older encoded frame after a newer `set`       | Ignored — newer value retained (LWW)                                   |
| An update encoded under **another** peer's key             | `apply()` writes that key happily → needs explicit key-ownership check |
| `delete()` then re-applying a same-millisecond peer update | **Key does not reappear** — local tombstone wins LWW                   |

The last two directly shaped the implementation (see the two hardening notes below).

## What was built

| File                                                          | Role                                                                        |
| ------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `src/lib/sync/presence-protocol.ts`                           | Pure protocol: schemas, seal/open, key-ownership-checked apply, projections |
| `src/lib/sync/presence.ts`                                    | `EphemeralPresenceManager` — one `EphemeralStore` per tab, pumped over P05  |
| `src/lib/crypto/presence-key.ts`                              | HKDF-SHA256 vault-derived presence key with its own domain separation       |
| `src/hooks/use-vault-presence.ts`                             | Replaces the parallel Supabase-Presence hook and heartbeat                  |
| `src/components/providers/vault-presence-provider.tsx`        | One presence session per tab, shared by header and table                    |
| `src/lib/supabase/realtime.ts`                                | Carries an opaque encrypted payload; join/leave events; `retractPresence()` |
| `src/lib/sync/index.ts`, `src/hooks/index.ts`                 | Barrel exports                                                              |
| `src/app/(app)/layout.tsx`                                    | Header avatars from the shared session                                      |
| `src/app/(app)/transactions/page.tsx`                         | Real row presence (was a hardcoded empty map) + focus publishing            |
| `src/components/features/transactions/TransactionRow.tsx`     | Multi-identity presence rendering, delegated field-focus reporting          |
| `src/components/features/transactions/TransactionTable.tsx`   | Field-focus and table-blur plumbing                                         |
| `tests/unit/sync/presence-protocol.test.ts`                   | 29 unit/property tests (fast-check)                                         |
| `tests/integration/presence-ephemeral.test.ts`                | 12 integration tests over a channel-semantics fake                          |
| `tests/e2e/presence.spec.ts`, `tests/e2e/helpers/presence.ts` | 3 E2E tests + harness helpers                                               |

### Consolidation of the misleading parallel system

`EphemeralPresenceManager` previously _named_ itself ephemeral while using Supabase Presence only,
and `use-vault-presence.ts` ran a second channel with its own heartbeat. Both are gone. There is now
exactly one presence system, one channel and one session id per tab;
`createEphemeralPresenceManager` keeps its name but is now backed by a real Loro `EphemeralStore`.

### Transport decision (constrained by P05, not chosen freely)

P05's RLS **denies Broadcast publishes on the presence-purpose topic** —
`realtime_topic_send_allowed` permits only the Presence extension there, and
`tests/database/rls-audit.sql:301` asserts that denial deliberately. So the encrypted envelope
travels as the opaque `payload` of the existing Presence `track()` on the already-authorized
`vault:<id>:presence` topic. No new channel, no new grant purpose, no migration, and the P05
authorization boundary is unchanged.

### Cryptography

Each update is `EphemeralStore.encode(sessionId)` sealed with **XChaCha20-Poly1305** under a key
derived from the vault key by HKDF-SHA256 with domain `moneyflow-v1-presence-ephemeral` — mirroring
the existing identity derivation in `crypto/keypair.ts`. The protocol version, vault id and session
id are bound as **AEAD additional data**, so a relabelled envelope fails the Poly1305 tag rather
than merely mismatching a later check. Established primitives only (libsodium, `@noble/hashes`);
nothing hand-rolled.

### Two hardening measures the empirical probes forced

1. **Session-key ownership.** Loro's `apply()` will write whatever keys the bytes contain, so any
   vault member could otherwise author an update under _another_ session's key and puppet that
   peer's indicator. Updates are staged in a scratch store, accepted only if the claimed key set is
   exactly `{sessionId}` and the decoded body agrees, then applied. The scratch store is emptied on
   every path, verified by a test that interleaves 20 accepted and 20 rejected messages.
2. **Departure as a filter, not a `delete`.** `EphemeralStore.delete` writes a local tombstone at
   the current timestamp; when a departing peer rejoins within the same millisecond its update loses
   LWW and the session stays invisible. Departure is therefore tracked as a filter over the store.
   This was caught by an integration test and is pinned by a named regression test.

## Non-negotiables

- **No new `as` / `any` / non-null `!`** in any authored file (verified by inspection; `pnpm lint`
  and `pnpm typecheck` are clean).
- **No ephemeral value reaches durable storage.** Presence lives in a standalone `EphemeralStore`,
  never in the vault `LoroDoc`, `UndoManager`, IndexedDB or `vault_ops`. `finalizeEphemeralPatches`
  is deliberately never called. Nothing in `src/lib/sync/manager.ts` or
  `src/lib/sync/persistence.ts` was modified.
- **No secret material anywhere.** No seed phrase, recovery material, vault master key, presence
  key, invite bearer secret, `crypto_box` secret, `SUPABASE_JWT_SECRET` or vault plaintext appears
  in code, logs, URLs, tests, fixtures or this evidence. Tests use synthetic fixed-byte keys and
  fast-check-generated vectors only. Keys and payloads are never logged; the E2E traffic observer
  records only _counts_ of matching frames, never frame contents.
- **No financial text in a payload.** Presence carries a transaction id, a stable cell name and a
  boolean — never a description, amount or any cell value. Asserted at unit, integration and E2E
  level.
- **FS-001 respected.** `src/lib/domain/settlement.ts` and all effective/settled allocation values
  are untouched.
- **UI is non-blocking.** Indicators are `aria-hidden` and `pointer-events-none`, so they cannot
  take focus or intercept clicks; editing is distinguished by width with the pulse behind
  `motion-safe:` for reduced-motion users. An E2E step asserts focus is not stolen and that a row
  under a peer's presence remains editable.
- **No heartbeat storm.** Unchanged state is dropped before it reaches the socket; refresh is one
  small frame per session per 10 s against a 30 s expiry.

## Gates — real counts

| Gate                | Result                                                               |
| ------------------- | -------------------------------------------------------------------- |
| `pnpm typecheck`    | **PASS** — 0 errors                                                  |
| `pnpm lint`         | **PASS** — 0 errors, 10 warnings, **all pre-existing** (see note)    |
| `pnpm format:check` | 15 files, **all pre-existing `specs/**`markdown**; **0**`.ts`/`.tsx` |
| `pnpm test`         | **PASS** — 99 files, **1919 passed, 2 skipped** (1921 total)         |
| `pnpm test:e2e`     | **PASS** — **156 passed, 0 failed**                                  |

Lint warnings: verified pre-existing by re-running with the changed `TransactionTable.tsx` stashed —
the `react-hooks/incompatible-library` warning on the TanStack virtualizer persists without my
changes, and the other 9 are unused-import warnings in files this package does not touch. I
introduced none.

E2E note: an earlier full-suite run showed one failure in
`import.spec.ts › CSV import creates transactions and auto-saves template on first import`. It
passes in isolation (16/16) and passed on the clean re-run reported above; it is a load flake under
4-worker parallelism, unrelated to presence. The reported 156/156 is a genuine full-suite pass, no
`--retries`, no `--headed/--ui/--debug`.

## Tests

**Unit / property (29, fast-check):** seal/open roundtrip over arbitrary states; envelope carries no
plaintext; fresh nonce per publish; rejection of foreign vault, wrong key, relabelled envelope, own
echo, unsupported version, arbitrary `fc.anything()` payloads and corrupted ciphertext; session-key
ownership (spoofed key, body/key disagreement, multi-key payload, truncated bytes, scratch-store
cleanliness across 40 messages); replay of a stale frame; expiry and refresh; UI projection and
state comparison; presence-key determinism, independence and vault separation.

**Integration (12):** encrypted authorized broadcast between two members; no plaintext on the wire;
duplicate same-identity tabs stay independent; blur retracts focus without leaving; prompt removal
on disconnect; synchronous retract for page teardown; reconnect republication; immediate
leave/rejoin regression; cross-vault payload ignored; wrong-key payload ignored; malformed and
replayed payloads ignored.

**E2E (3, no retry masking):** two distinct identities plus a duplicate same-user tab focusing three
different rows, each seeing the other two and never itself; focus not stolen; switching to a field
reported as editing; leaving the table retracting; a peer's presence never blocking our own edit;
tab close; no plaintext metadata on the wire; presence recovery across a page reload; stale-session
expiry when a context dies without a clean leave.

## Q-proposals

**Q-P10-01 — Tab-close retraction is bounded by expiry, not by the unload handler.** On tab close
the `untrack` frame is emitted but the socket tears down before the server processes it, so the
peer's channel state still lists the connection and the indicator clears on Loro expiry (~30 s)
rather than instantly. Deliberate navigation, route change, blur and unmount all retract
immediately; only an abrupt close falls back to expiry — the same path a crashed or network-dropped
tab already takes, so no state is ever wrong, only briefly stale. _Reversible default (in place):_
accept expiry as the backstop and keep `PRESENCE_TIMEOUT_MS` at Loro's 30 s default. _Alternative if
a reviewer wants faster clearing:_ lower the timeout (raising refresh traffic proportionally), or
add a server-side `disconnect` hook. Both are single-constant or additive changes.

**Q-P10-02 — Field granularity is the cell, not the character.** Presence reports which cell has
focus, never a caret position, since Loro `Cursor` positions are only meaningful for `LoroText`
containers and vault cells are LWW map values. _Reversible default (in place):_ cell-level.
Character-level would require modelling cells as `LoroText`, which is an FS-boundary change well
outside this package.

No scope reductions were taken and no requirement was silently dropped.
