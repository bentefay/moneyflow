# HANDOFF — P10 REVIEW dispatch (revision 01)

**To:** `p10-reviewer-01` (fresh, independent — you did NOT implement P10; you are NOT
`p10-implementer-01`). Read-only on product code; you may run all gates. **From:** root coordinator.

**Package:** P10 (HS-003 — Loro ephemeral presence and active transaction). **This is the SOLE
HS-003 package** — on your PASS, root performs the NON-markerless final integration that checks the
HS-003 scratch block and flips the HS-003 requirement to passed. Review as the last gate before
HS-003 is declared complete.

**Review range:** `54a88ae..71c378c` (product/test delta in `f6ae3fe` + `d832443`; docs commit
`71c378c` is evidence-only). Linear single-parent chain `54a88ae->f6ae3fe->d832443->71c378c`. Work
read-only against git; **do NOT checkout/reset/branch/switch** — the tree stays at HEAD.

**Frozen text:** `specs/human-scratch.md:161-163` (HS-003), exact bytes in `SCOPE.json#HS-003`:

> Use Loro ephemeral state for presence and active transaction, after understanding Loro's complete
> model documentation and the loro-mirror repository.

Full brief: `specs/007-human-scratch-completion/tasks/HS-003-loro-ephemeral-presence.md`. The
implementer's evidence is `evidence/P10/implementation-01.md` — read the frozen text, not the
evidence, as your source of truth.

## What root already verified (verify-not-trust — re-derive, do not take on faith)

- Linear single-parent chain `54a88ae->f6ae3fe->d832443->71c378c`, no merges.
- Delta = 17 product/test files + evidence, ALL in `src/lib/sync/**`, `src/lib/crypto/**`,
  `src/components/**`, `src/hooks/**`, `src/app/(app)/**`, `src/lib/supabase/realtime.ts`, and
  `tests/**`. **NO file under `src/lib/crdt/**`\*\*, no root-owned/marker/spec/migration file.
- **Two HARD boundaries byte-identical BASE(`54a88ae`)->HEAD** — must NOT change:
    - FS-001 `src/lib/domain/settlement.ts` blob `010f3c93582a2ce311594d4dde8464760ca49c43`
    - P05 `tests/database/rls-audit.sql` blob `9b04bef7e55929d3993efd82b037fcf02d7bb637`
- Product code cast-free; root spot-check `pnpm typecheck` clean.

## Behaviour you MUST confirm against frozen text + the brief

1. **Real Loro `EphemeralStore` — not Supabase Presence.** Confirm the misleading Supabase-only
   `EphemeralPresenceManager` and the separate `use-vault-presence` heartbeat channel are actually
   GONE (one presence system, one channel, one session id per tab). Confirm presence uses a
   standalone `EphemeralStore`, never the vault `LoroDoc`.
2. **No ephemeral value reaches durable storage.** Independently confirm no presence value enters
   the vault `LoroDoc`, `UndoManager`, IndexedDB, or `vault_ops`; `finalizeEphemeralPatches` /
   loro-mirror's `setStateWithEphemeralPatch` are NOT used to fold ephemeral state into the doc.
   (`git diff 54a88ae..71c378c` should touch no `src/lib/crdt/**`, no `sync/manager.ts`, no
   `sync/persistence.ts` — verify.)
3. **Authenticated encrypted transport over the P05-authorized channel.** The encrypted envelope
   must ride as the opaque `payload` of the Presence `track()` on the existing `vault:<id>:presence`
   topic — NO new channel, NO new grant purpose, NO migration. Confirm the RLS send policy still
   denies raw Broadcast on that topic (the audit file is byte-identical — confirm the client does
   not attempt a raw Broadcast publish). Crypto: XChaCha20-Poly1305 over
   `EphemeralStore.encode(sessionId)`, key via HKDF-SHA256 from the vault key with a presence
   domain, version+vault+session bound as AEAD additional data. Confirm ESTABLISHED primitives only
   (no hand-rolled crypto) and that a relabelled/replayed/cross-vault envelope fails the tag / is
   ignored.
4. **Session-spoofing rejection (implementer claim to verify):** incoming updates are staged and
   accepted only if the claimed key set is exactly `{sessionId}`, so a member cannot puppet another
   session's indicator. Confirm there is a named regression test and it genuinely fails without the
   guard.
5. **Departure-as-filter, not delete (implementer claim to verify):** because a Loro `delete()`
   tombstone can beat a same-millisecond rejoin under LWW, departure is tracked as a filter. Confirm
   the named regression test.
6. **Distinct tab/session id even when the pubkey identity is shared;** stale-session expiry; focus
   cleared on blur/route/unmount; reconnect recovery; non-blocking row presence with NO financial
   text on the wire.

## Hard rules (blocking if violated)

- No new `as` / `any` / non-null `!` in **product** code. NOTE: there is one `as unknown as never`
  in the TEST fixture `tests/integration/presence-ephemeral.test.ts:167` (a FakeTransport structural
  shim) — root judged it non-blocking per the established test-fixture-cast precedent (product code
  cast-free). Confirm it is confined to test scaffolding and the FakeTransport surface is honest; if
  you believe it masks a real type mismatch in product behaviour, raise it — otherwise it does not
  gate.
- **SECRET-SAFETY (BLOCKING):** no seed phrase, recovery material, vault master key, vault-derived
  presence key, invite bearer secret, `crypto_box` secret material, `SUPABASE_JWT_SECRET`, or vault
  plaintext anywhere in code/logs/URLs/tests/fixtures/evidence. Encrypted payloads/keys never logged
  in plaintext; synthetic/public vectors only. Any real-material leak is a blocking finding reported
  to root IMMEDIATELY.
- FS-001 `settlement.ts` + effective/settled values untouched; P05 authorization surface unchanged.

## Gates — re-run and report REAL counts

`pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e`. Implementer
reported: typecheck 0 errors; lint 0 errors / 10 pre-existing warnings; format:check 15 pre-existing
`specs/**` markdown only (0 `.ts`/`.tsx`); test 1919 passed / 2 skipped; e2e 156 passed. Re-run and
confirm real counts. A `format:check` failure confined to pre-existing markdown is NON-blocking; any
P10 `.ts`/`.tsx` failing oxfmt IS blocking. Never run Playwright with `--debug/--ui/--headed/show`.

## Handback

SendMessage to `main` with: **VERDICT: PASS** or **VERDICT: FAIL** (0 blocking findings = PASS); the
five real gate counts; an explicit statement that (a) presence is a standalone `EphemeralStore` with
no ephemeral value in durable CRDT/IndexedDB/server, (b) the two hard boundaries are byte-identical,
(c) transport is encrypted over the authorized Presence path with no new channel/grant/migration,
(d) session-spoofing and departure-as-filter regression tests are honest, and (e) no secret material
anywhere. Include any Q-proposals or non-blocking observations. For any blocking issue give
file:line, the frozen line violated, and the failing scenario so root can bounce a fix. Do not edit
product code; do not checkout/reset.
