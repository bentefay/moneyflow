# HS-010 — Remove Unused User State

- **Status:** queued
- **Source:** `specs/human-scratch.md:304-305`; exact frozen text is in `SCOPE.json#HS-010`
- **Package:** P06
- **Depends on:** P04 table/security model; precedes P08 and P19

## Frozen requirement

> Drop the user state column until it can use the same sync/CRDT logic; its current complexity is
> not justified.

## Current evidence to revalidate

- The current table appears to be `user_data` with `encrypted_data`, rather than literally a `user`
  table/state column; server user router exposes get/create/getData/upsertData operations.
- App identity setup appears to use registration/get-or-create, while data read/write APIs have no
  demonstrated product consumer. Memberships and local active-vault state serve separate purposes.

## Acceptance direction

- Prove the exact intended column/API with usage search and schema history; do not drop identity or
  credential data by name assumption.
- Add a forward migration that removes only unused opaque user state, dead router/types/crypto
  helpers and grants/policies while retaining public-key identity registration and vault
  memberships.
- Fresh bootstrap and existing-database upgrade both work; onboarding, unlock, vault list, invites
  and local cache behavior remain intact.
- Passkeys later receive dedicated threat-modeled credential storage, not a resurrected generic
  blob.

## Implementation and review checkpoints

- Record table/column rationale and rollback/data-retention implications before migration. Reviewer
  checks callers, generated DB types, policies and migration ordering.

## Automated tests

- Fresh/upgrade migration tests, router contract/permission tests and identity/vault/invite
  regression E2E. Full high-risk suite and repeated no-retry onboarding/unlock journey.

## Manual Playwright CLI charter

- Create/unlock identity, create/switch vaults, refresh/duplicate tab, invite/redeem if available
  and verify no missing-state spinner. Test offline cache/reconnect and inspect console/network for
  dead endpoints or plaintext. Include responsive/dark/reduced motion basic regression.

## UX, style, and E2E review

Apply tRPC/crypto/sync/migration/E2E guidance. Removal must simplify, not silently move opaque state
elsewhere. Reviewer requires real migration and high-level journey evidence.

## Risks and questions

- Risks: target-name ambiguity, destructive legacy data loss, hidden consumer, passkey storage
  scope. Log evidence-backed target decision and reversible migration path; do not ask the human
  mid-goal.
