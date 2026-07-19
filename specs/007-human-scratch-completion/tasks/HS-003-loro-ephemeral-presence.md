# HS-003 — Loro Ephemeral Presence and Active Transaction

- **Status:** queued
- **Source:** `specs/human-scratch.md:161-163`; exact frozen text is in `SCOPE.json#HS-003`
- **Package:** P10
- **Depends on:** P05 secure realtime; P08 working member identity/invite flow

## Frozen requirement

> Use Loro ephemeral state for presence and active transaction, after understanding Loro's complete
> model documentation and the loro-mirror repository.

## Current evidence to revalidate

- `src/lib/sync/presence.ts` names an `EphemeralPresenceManager` but currently uses Supabase
  Presence, not Loro's `EphemeralStore`.
- `src/hooks/use-vault-presence.ts` maintains a separate presence channel and heartbeat.
- `src/app/(app)/transactions/page.tsx` currently supplies an empty transaction-presence map.
- Installed `loro-crdt` exposes `EphemeralStore` set/apply/encode/subscribe APIs; existing core
  specs sketch encrypted ephemeral broadcast using a vault-derived presence key.

## Acceptance direction

- Use one real EphemeralStore protocol for vault presence, per-session identity, active transaction,
  and editing field; no ephemeral value enters durable CRDT ops, IndexedDB or server storage.
- Broadcast only authenticated encrypted payloads through the P05-authorized channel; use a distinct
  tab/session identifier even when the public-key identity is shared.
- Expire stale sessions, clear focus on blur/route/unmount, recover across reconnects and render
  accurate non-blocking row presence without leaking financial text.
- Define compatibility/version validation and ignore malformed, replayed or unauthorized payloads.

## Implementation and review checkpoints

- Before design or code, read `https://loro.dev/llms-full.txt` completely and inspect the current
  `https://github.com/loro-dev/loro-mirror` documentation/source for lifecycle and mirror semantics.
  Record the versions/commit consulted; a cursory API lookup does not satisfy the source
  requirement.
- Derive the transport adapter from those authoritative Loro/loro-mirror semantics; consolidate or
  remove the misleading parallel presence system. Keep high-frequency presence out of undo and
  persistent sync.
- Reviewer verifies two isolated users plus same-identity multiple tabs and confirms no key, row
  description, or presence payload is stored/logged in plaintext.

## Automated tests

- Unit/property: encode/apply roundtrip, malformed/versioned messages, session keys,
  timeout/cleanup.
- Integration: encrypted authorized broadcast, reconnect and unauthorized vault/session isolation.
- E2E: two users and duplicate tabs focus different transactions, switch fields, leave/reconnect and
  observe correct expiration. Repeat without retries.

## Manual Playwright CLI charter

- Use separate disposable sessions for two members plus a duplicate same-user tab. Exercise hover,
  focus, edit, blur, navigation, refresh, tab close, offline/reconnect and stale timeout.
- Verify active indicators are legible but not distracting in desktop/mobile, dark/reduced motion
  and keyboard-only use. Inspect console/network for loops, plaintext metadata and unauthorized
  traffic.

## UX, style, and E2E review

Apply `.claude` sync/crypto/CRDT/component/E2E rules. Presence must never lock editing, jank the
virtual table, steal focus or flash indefinitely. Automated E2E and manual multi-context evidence
are both mandatory.

## Risks and questions

- Risks: cross-vault disclosure, same-key tab collisions, heartbeat storms, stale focus, rerender
  churn. Return protocol ambiguity as a complete Q proposal with a reversible default.
