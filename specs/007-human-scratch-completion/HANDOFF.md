# HANDOFF — P10 IMPLEMENT dispatch (revision 01)

**To:** a fresh implementer (you did NOT author any prior package). **From:** root coordinator.

**Package:** P10 (HS-003 — Loro ephemeral presence and active transaction). **BASE = `41c6c81`**
(current `main` HEAD). **No-checkout discipline:** do NOT `checkout`/`reset`/`branch`/`switch`; the
working tree stays at HEAD. Commit your work directly on top of `41c6c81` in linear single-parent
order.

**Frozen text (authoritative — hold the code to it, not to this prose):**
`specs/human-scratch.md:161-163` (HS-003), exact bytes in `SCOPE.json#HS-003`:

> `- [] We should be using loro ephemeral state for tracking presence and active transaction. Make sure`
> `  you understand https://loro.dev/llms-full.txt and https://github.com/loro-dev/loro-mirror before`
> `  implementing.`

Full package brief: `specs/007-human-scratch-completion/tasks/HS-003-loro-ephemeral-presence.md`
(read it in full — it holds the acceptance direction, checkpoints, test matrix, and risks).

## Mandatory source-study gate (frozen requirement, not optional)

Before design or code you MUST read `https://loro.dev/llms-full.txt` **completely** and inspect the
current `https://github.com/loro-dev/loro-mirror` docs/source for `EphemeralStore` lifecycle and
mirror semantics. **Record in the evidence the exact versions/commit consulted.** A cursory API
lookup does NOT satisfy HS-003 — the frozen line names understanding these sources as part of the
requirement. Derive the transport adapter from those authoritative semantics.

## What exists today (revalidate — do not trust these notes blindly)

- `src/lib/sync/presence.ts` — names an `EphemeralPresenceManager` but currently uses **Supabase
  Presence**, not Loro's `EphemeralStore`. This misleading parallel system must be consolidated or
  removed.
- `src/hooks/use-vault-presence.ts` — a separate presence channel + heartbeat.
- `src/app/(app)/transactions/page.tsx` — currently supplies an empty transaction-presence map.
- Installed `loro-crdt` exposes `EphemeralStore` set/apply/encode/subscribe; core specs sketch
  encrypted ephemeral broadcast using a vault-derived presence key.

## Acceptance direction (committed scope)

1. **One real `EphemeralStore` protocol** for vault presence, per-session identity, active
   transaction, and editing field. **No ephemeral value may enter durable CRDT ops, IndexedDB, or
   server storage** — presence is transient only.
2. **Authenticated encrypted payloads only**, broadcast through the **P05-authorized realtime
   channel** (reuse P05's authorization — do not open a new unauthenticated channel). Use a distinct
   tab/session identifier even when the public-key identity is shared (same-user multi-tab must not
   collide).
3. Expire stale sessions; clear focus on blur/route-change/unmount; recover across reconnects;
   render accurate **non-blocking** row presence without leaking any financial text.
4. Define compatibility/version validation; **ignore malformed, replayed, or unauthorized
   payloads**.
5. Keep high-frequency presence **out of undo and persistent sync** (must not jank the virtual
   table, steal focus, lock editing, or flash indefinitely).

## Hard rules (blocking if violated)

- **No new `as` / `any` / non-null `!`** in authored code (comments / `!=` / logical-NOT are fine).
- Favour pure functions + immutable data; contain mutation/side-effects in small typed helpers.
- Money as integer minor units (not central here, but never regress it).
- **Use established libraries** for any non-trivial algorithm — no hand-rolled crypto/serialisation
  where a vetted primitive exists.
- **SECRET-SAFETY (BLOCKING):** no seed phrase, recovery material, vault master key, vault-derived
  **presence key**, invite-fragment bearer secret, `crypto_box` secret material,
  `SUPABASE_JWT_SECRET`, or vault plaintext anywhere in code, logs, URLs, tests, fixtures, or
  evidence. Encrypted presence payloads and keys must never be logged in plaintext. Tests use
  **synthetic/public vectors only**. Any real-material leak is a blocking finding — report it to
  root IMMEDIATELY and stop.
- **FS-001 boundary:** do not touch `src/lib/domain/settlement.ts` or effective/settled allocation
  values — presence is orthogonal.
- Keep `.claude/` docs updated if you change sync/crypto/CRDT conventions.

## Tests (all mandatory — assert behaviour, not text)

- **Unit/property (fast-check):** encode/apply roundtrip; malformed/versioned/replayed messages
  rejected; per-session key derivation; timeout/cleanup expiry.
- **Integration:** encrypted authorized broadcast; reconnect recovery; unauthorized vault/session
  isolation (a payload from another vault/session is ignored).
- **E2E (`tests/e2e/`, harness functions, no `--retries` masking):** two distinct users AND a
  duplicate same-user tab focus different transactions, switch fields, leave/reconnect, and observe
  correct expiration. Presence legible but non-distracting; no focus steal; no plaintext metadata or
  unauthorized traffic in console/network.

## Gates — run ALL and report REAL counts in your handback

`pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e`. Fix every issue
you can (CLAUDE.md binds you to clear lint warnings you introduce). A `format:check` failure
confined to pre-existing `specs/**` markdown is non-blocking; any `.ts`/`.tsx` you author failing
oxfmt IS blocking. Do not weaken or skip existing passing tests.

## Handback (SendMessage to `main`)

Report: the exact final HEAD SHA and the linear commit chain from BASE `41c6c81`; the five real gate
counts; the file list (all within sync/crypto/CRDT/presence/hook/transaction-UI + test paths); the
Loro/loro-mirror versions you studied; an explicit statement that no ephemeral value reaches durable
CRDT/IndexedDB/server and that no secret/presence-key/vault-plaintext appears anywhere; and any
Q-proposals (each with a reversible default — record protocol ambiguity as a complete Q, do not
block). If you hit a genuine scope question, surface it to root rather than silently reducing scope.
Write your evidence to `evidence/P10/implementation-01.md`. Do not edit ledgers/markers/QUESTIONS/
HANDOFF/DECISIONS/PROGRESS — those are root-only.
