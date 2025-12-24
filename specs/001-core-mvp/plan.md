# Implementation Plan: MoneyFlow Core MVP

**Branch**: `001-core-mvp` | **Date**: 2025-12-23 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-core-mvp/spec.md`

## Summary

Build the MoneyFlow Core MVP: a client-side encrypted, real-time collaborative household expense tracker. Users can import transactions, allocate expenses to people, and see settlement balances. All data is encrypted client-side using keys derived from user-controlled seed phrases—the server never sees plaintext financial data or user identities.

**Technical Approach**: Loro CRDT library for conflict-free sync with client-side encryption. Updates are exported as binary blobs, encrypted, and relayed via Supabase Realtime. Key-only authentication using BIP39 seed phrases and Ed25519 request signing (no server-side identity). Next.js 15 on Vercel with Server Components, shadcn/ui, and Remeda for functional programming patterns.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20.x  
**Primary Dependencies**: Next.js 15, React 19, Supabase (Postgres + Realtime), shadcn/ui, Remeda, libsodium, **loro-mirror**, **loro-mirror-react**, **tRPC v11**, **bip39**  
**API Layer**: tRPC for end-to-end type-safe API with Ed25519 signature verification. Zod schemas shared between client validation and tRPC input validation.  
**CRDT Strategy**: `loro-mirror` provides schema-validated state ↔ Loro sync. `loro-mirror-react` provides React hooks (`useLoroSelector`, `useLoroAction`, `createLoroContext`). Immer-style mutations, synchronous updates (~150KB WASM)  
**Storage**: Supabase Postgres (encrypted blobs) + Supabase Realtime (WebSocket sync)  
**Testing**: Vitest (unit), Playwright (e2e), property-based tests for financial calculations  
**Target Platform**: Web (responsive), deployed on Vercel  
**Project Type**: Web application (Next.js monolith with API routes)  
**Performance Goals**: <100ms perceived latency (Constitution VI), <500ms sync (FR-073), <2s automation eval on 10k txns  
**Constraints**: Offline-capable, client-side encryption only, no server access to plaintext  
**Scale/Scope**: MVP targeting 10 concurrent users per vault, 10k transactions per vault

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                               | Status  | Implementation                                                                                             |
| --------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| **I. Security & Privacy First**         | ✅ PASS | XChaCha20-Poly1305 client-side encryption; BIP39 seed phrase identity; server sees only opaque pubkey_hash |
| **II. Multi-Party Financial Integrity** | ✅ PASS | Property-based tests for allocation math; Loro version vectors; field-level CRDT                           |
| **III. Data Portability**               | ✅ PASS | CSV/OFX import; JSON export always available; no vendor lock-in                                            |
| **IV. Auditability & Transparency**     | ✅ PASS | Loro operation log provides audit trail; automation changes tracked for undo                               |
| **V. User-Owned Data**                  | ✅ PASS | Full export in JSON/CSV; offline-capable; encryption keys user-derived                                     |
| **VI. Performance, Beauty & Craft**     | ✅ PASS | <100ms target; shadcn/ui for polish; Linear-inspired UX                                                    |
| **VII. Robustness & Reliability**       | ✅ PASS | Comprehensive testing strategy; property-based tests; graceful degradation                                 |

**Security Requirements Check**:

- ✅ XChaCha20-Poly1305 encryption at rest (see data-model.md)
- ✅ TLS 1.3 in transit (Vercel/Supabase default)
- ✅ User-derived keys only (BIP39 seed → Ed25519 keypair)
- ⚠️ MFA: Deferred (incompatible with key-only auth; seed phrase is single strong factor)
- ✅ Key-only auth: Ed25519 request signing (no server-side session state)
- ✅ No dependencies with known critical CVEs (will verify in CI)

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── app/                      # Next.js App Router
│   ├── (onboarding)/         # Onboarding routes (new-user, recover, unlock)
│   ├── (marketing)/          # Landing page
│   ├── (app)/                # Authenticated app routes
│   │   ├── transactions/
│   │   ├── accounts/
│   │   ├── people/
│   │   ├── tags/
│   │   ├── automations/
│   │   ├── statuses/
│   │   └── imports/
│   ├── api/                  # API routes (minimal - most logic client-side)
│   └── layout.tsx
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── forms/                # Form components
│   └── features/             # Feature-specific components
├── lib/
│   ├── crypto/               # Encryption, key derivation
│   ├── crdt/                 # HLC, LWW-Map, event handling
│   ├── sync/                 # Supabase sync logic
│   ├── domain/               # Business logic, aggregates
│   └── utils/                # Remeda helpers, type utils
├── hooks/                    # React hooks
└── types/                    # TypeScript types, Zod schemas

tests/
├── unit/                     # Vitest unit tests
│   ├── crypto/
│   ├── crdt/
│   └── domain/
├── integration/              # Integration tests
└── e2e/                      # Playwright e2e tests
```

**Structure Decision**: Next.js App Router monolith. All business logic runs client-side (encryption requirement). Server only handles encrypted blob storage and sync—no authentication state, no user identity.

## Complexity Tracking

> No constitution violations requiring justification. Architecture follows minimal complexity path.

| Decision                           | Justification                                                                                                         |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Loro CRDT instead of Yjs/Automerge | Better encryption fit (opaque binary exports); entity-based data model; `loro-mirror-react` for immutable React store |
| Supabase Postgres over custom DB   | Managed service reduces ops; free tier for MVP; proven reliability                                                    |
| Key-only auth over Supabase Auth   | Maximum privacy (server has zero knowledge of identity); simpler recovery model; no OAuth complexity                  |
| Monolith over microservices        | Single deployment; client-side logic doesn't need service boundaries                                                  |

---

## Constitution Re-Check (Post-Design)

_Re-evaluated after Phase 1 design completion._

| Principle                     | Status  | Evidence                                                                                                                                                                                   |
| ----------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **I. Security & Privacy**     | ✅ PASS | [data-model.md](data-model.md) defines key-only auth (BIP39 → Ed25519), encryption at rest (AES-256-GCM), key hierarchy, X25519 key wrapping for multi-user. Server sees only pubkey_hash. |
| **II. Multi-Party Integrity** | ✅ PASS | [data-model.md](data-model.md) §6.1 defines invariants (account ownerships sum to 100%). Event types track allocations with field-level CRDT for deterministic conflict resolution.        |
| **III. Data Portability**     | ✅ PASS | [contracts/api.md](contracts/api.md) defines encrypted blob endpoints. Full state can be exported (decrypt snapshot). No proprietary formats.                                              |
| **IV. Auditability**          | ✅ PASS | Event-sourced model in [data-model.md](data-model.md) provides complete audit trail. Every change is an event with HLC timestamp.                                                          |
| **V. User-Owned Data**        | ✅ PASS | All data decryptable only by user. Keys derived from BIP39 seed phrase. Offline-capable via local state + event batching.                                                                  |
| **VI. Performance/Beauty**    | ✅ PASS | [quickstart.md](quickstart.md) specifies shadcn/ui. Performance targets in spec (<100ms latency, <500ms sync).                                                                             |
| **VII. Robustness**           | ✅ PASS | [quickstart.md](quickstart.md) §9 defines testing strategy: Vitest unit tests, property-based tests (fast-check), Playwright e2e.                                                          |

**Security Requirements (Post-Design)**:

- ✅ AES-256-GCM: Specified in [data-model.md](data-model.md) §2, [research.md](research.md) §3
- ✅ TLS 1.3: Vercel/Supabase default
- ✅ X25519 key wrapping: [data-model.md](data-model.md) §1.3
- ✅ Key-only auth: BIP39 seed → Ed25519 keypair; request signing [data-model.md](data-model.md) §1
- ✅ No local secret storage: Seed entered each session, nothing to exfiltrate
- ⚠️ MFA: Deferred (spec Out of Scope)
- ⚠️ Seed phrase reset: Impossible by design (sole-member vault recovery not supported)
- 📋 Future: WebAuthn PRF extension for hardware-backed "remember me"

**GATE**: ✅ **PASSED** - Design phase complete, ready for task breakdown.
