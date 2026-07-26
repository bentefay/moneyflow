# P08 Implementation Evidence — Revision 02 (remediation)

Sole implementer artifact for P08/02. Intentionally UNCOMMITTED. This is a NARROW remediation on top
of rev-01, NOT a re-implementation.

- Build BASE = current HEAD `2bf89b3` (product state equals the rev-01 feature commit `d2762f9`; the
  two intervening commits `565cbd8` and `2bf89b3` are root ledger docs only).
- Scope of rev-02 = root review-01 verdict CHANGES_REQUESTED, ONE blocker **B-2**, plus non-blocking
  **N-4a / N-4b / N-4c**. Everything else in review-01 was passed and is left untouched.

## 1. Blocker B-2 — invite acceptance never opened the shared vault, so HS-012 never ran

### Root cause (revalidated in source)

- `src/app/(onboarding)/invite/[token]/page.tsx` `handleAccept` accepted the invite, marked a
  pending-person-link, then `router.push("/transactions")` — but never made the shared vault the
  active vault.
- `src/components/providers/vault-provider.tsx` opens whatever vault is active. The vault-reconcile
  effect (BASE L136-139) only reassigns the active vault when the current selection is
  **inaccessible**; a joining member's OWN vault stays perfectly accessible, so the shared vault was
  never opened, the acceptance marker (checked inside the shared vault's init effect) was never
  reached, and no member Person materialized. People showed only "Me".
- rev-01's marker was `sessionStorage`, consume-once: even had the shared vault opened, a refresh or
  a second tab would permanently miss the one-shot write.

### Fix (three parts, all client-side, no schema/route/migration touch)

1. **Deliver the member INTO the shared vault on acceptance.** `handleAccept` now calls
   `setActiveVaultStorage({ id: inviteInfo.vaultId })` before navigating. The invite page renders
   under the `(onboarding)` route group, which has NO `ActiveVaultProvider`; `/transactions` renders
   under `(app)`, whose `ActiveVaultProvider` reads `localStorage` synchronously on mount.
   Persisting through storage before navigation is the app's own established non-React switch
   mechanism (same helper used by the identity-registration flow). No new mechanism invented.
2. **Retryable, idempotent reconcile-on-open** (`src/lib/vault/pending-person-link.ts`). The marker
   moved from `sessionStorage` consume-once to `localStorage` check-and-clear-on-confirmation:
   `markPendingPersonLink` / `hasPendingPersonLink` / `clearPendingPersonLink`. The vault-provider
   open effect now materializes the member Person when the marker is present and clears the marker
   **only after** the Person is durably present (`ensureMemberPersonLinked` is idempotent — a
   deterministic person id keyed on the pubkey hash — so refreshes and concurrent tabs converge on a
   single Person). If `forceSync` throws, the clear is never reached and the next open retries. This
   removes the permanent-miss without ever re-emitting an op for an already-linked member (the
   idempotent check returns "no change", so no `vault_ops` op is produced before the clear).
3. No change to encryption, key-wrap, routers, RPCs, or migrations. The member already unwraps the
   REAL vault key (rev-01); B-2 was purely a client navigation/lifecycle defect.

## 2. RED → GREEN evidence for B-2

New E2E `tests/e2e/invite-redemption.spec.ts` :: "accepting an invite opens the shared vault and
links both members" opens the MEMBER's own app after a real two-context invite acceptance and
asserts: (a) member active vault == shared vault, (b) People shows self ("You") + owner ("Linked"),
(c) no raw pubkey hash surfaced, (d) bidirectional — owner's People also gains the member's linked
person (proves the freshly materialized Person op syncs back).

- **RED (fix stashed, pre-fix wiring):** FAILS at assertion (a) — member stayed in their OWN vault:

    ```
    ✘ accepting an invite opens the shared vault and links both members (21.6s)
      Expected: "897cea03-…"   (sharedVaultId)
      Received: "0e7572bb-…"   (member's own vault)
      Timeout 15000ms exceeded while waiting on the predicate  (line 110)
    ```

- **GREEN (fix restored):** the new test and the pre-existing key-equality test both pass; repeated
  `--repeat-each=3` → 15/15 green with retries disabled.

## 3. realtime-recovery:108 conflict and its resolution (recorded for audit)

HANDOFF asked linkage to "reconcile whenever the shared vault opens". A **markerless /
unconditional** reconcile-on-open was tried and empirically FAILS
`tests/e2e/realtime-recovery.spec.ts:108` 3/3: the fixture receiver (`shareActiveVaultWithMember`,
which admin-inserts a membership row and sets active vault WITHOUT going through the `/invite` flow)
would materialize its Person on open and emit a synced `vault_ops` op whose delayed Realtime echo
trips that test's suppression gate before the owner's throttled tag push is durable, so the receiver
converges early and never retries → the tag never appears → timeout.

**Resolution (reversible, default-safe):** keep the acceptance marker as the gate but make it robust
(localStorage + retry-until-confirmed, part 2 above). The marker is the clean signal distinguishing
a real invitee (has it → materializes + syncs) from the fixture receiver (never has it → stays
silent). This satisfies the HANDOFF intent — reconcile is now idempotent, re-runnable, survives
refresh, and converges concurrent tabs on one Person — while a passive/out-of-band open emits no op.
Confirmed: realtime-recovery:108 stays green across 3 repeats. The "reconcile on EVERY open,
markerless" reading is the only sub-clause not taken, because it provably regresses a PRESERVED test
with no HS-012 gain; flagged here for human audit rather than self-adjudicated as a scope change.

## 4. Non-blocking items

- **N-4a** — `src/components/features/vault/AccessMembersSection.tsx`: owner-only copy under Members
  states plainly that removing a member "revokes their access to future changes immediately. The
  vault key is not rotated, so anything they already downloaded stays readable to them." No new
  crypto; honest description of the actual posture.
- **N-4b** — `tests/integration/membership-remove-authz.test.ts`: drives the real
  `membership.remove` resolver against a mocked Supabase + signature-verified context and asserts a
  non-owner member is rejected `FORBIDDEN` and a non-member is rejected `NOT_FOUND`. This is
  COVERAGE of the pre-existing authz at `membership.ts` (owner check ~L102-107) — no behavior
  change.
- **N-4c — correction of the rev-01 "sealed-box rekey unchanged" wording.** The true posture: **no
  rekey/rotation runs at all** on member removal. `membership.rekey` (and thus `rekey_vault_members`
  / any `sealKey`-based rewrap) has ZERO real call sites at BASE and HEAD — the router doc comment
  describes a 5-step client rekey flow that the client never invokes. Removal is a hard `DELETE` of
  the membership row; revocation strength comes entirely from **RLS `is_vault_member` + per-message
  Realtime membership re-check** (`realtime_grant_allows`, `revoked_at IS NULL`), not from key
  rotation. The rev-01 phrasing implying an unchanged sealed-box rekey step was inaccurate: there is
  no rekey step to leave unchanged. The N-4a UI copy now matches this reality.

## 5. Boundary safety (D-018) — re-verified empty over sensitive surfaces

`git diff -- src/ tests/` touches only: the invite page, vault-provider, pending-person-link,
AccessMembersSection, the invite E2E, and the new membership authz test. EMPTY diff over:
`supabase/migrations/**`, `src/server/routers/**` (no router/RPC change), `vault_ops`, and the
Realtime authorize/revoke/socket path. No secrets, keys, or plaintext are logged or written to
evidence; the E2E asserts on UI state and never surfaces key material (key equality stays in the
in-memory helper).

## 6. Gates

- `pnpm typecheck` — clean.
- `pnpm lint` — 0 errors (only pre-existing unused-var warnings in unrelated test files).
- `pnpm format:check` — fails ONLY on `specs/**` markdown (pre-existing, not attributable to this
  package's `src/`/`tests/` changes, which pass).
- `pnpm test` — 1716 passed, 2 skipped (includes the new membership authz test).
- `pnpm test:e2e` — full suite green (see run log); invite + realtime-recovery specs additionally
  repeated `--repeat-each=3` → 15/15 with retries disabled.
