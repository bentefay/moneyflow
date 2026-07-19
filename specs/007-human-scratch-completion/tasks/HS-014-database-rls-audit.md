# HS-014 — Database Tables and Row-Level Permission Audit

- **Status:** queued
- **Source:** `specs/human-scratch.md:319-323`; exact frozen text is in `SCOPE.json#HS-014`
- **Package:** P04
- **Depends on:** P01 dependency/tool baseline; blocks realtime, users, invites and passkeys

## Frozen requirement

> Review duplicate ops/snapshot tables and whether hashed public-key authentication consistently
> enforces per-vault row access, travels only under TLS, and is never exposed in URLs/plaintext.

## Current evidence to revalidate

- `supabase/migrations/005_vault_ops.sql` contains legacy `vault_updates`, current `vault_ops` and
  snapshots; project sync guidance says ops are permanent source and snapshots are cache.
- Browser Supabase uses an anon client without an observed custom auth identity; server tRPC uses a
  service-role client which bypasses RLS, so router permission checks are critical.
- RLS derives a pubkey hash from request configuration not obviously set by browser/server paths.
  Public invite policies are broad, and an owner-membership policy appears to contain a
  self-equality that may authorize based on an unrelated membership.

## Acceptance direction

- Write a threat model/data-flow/table-retention ADR before mutation: identity proof, TLS boundary,
  service role, RLS, routers, vault ops/snapshots, invites, memberships and realtime.
- Choose one permanent encrypted-op source and one performance snapshot model; safely migrate/remove
  legacy duplication without losing audit history or existing clients.
- Correct every policy/function/grant/index and every service-role router check. Server derives the
  public-key hash only after verified signatures; untrusted headers/client claims cannot select it.
- Financial plaintext, keys and secrets never enter DB, logs or URLs. Cross-vault/member-role access
  is least privilege and testable; fresh and upgrade migrations both pass.

## Implementation and review checkpoints

- Inventory all tables/policies/functions/publication/router operations and prove why each remains.
  Reviewer performs adversarial review, not only happy-path SQL checks, and validates rollback.

## Automated tests

- Migration fresh/upgrade/rollback-safe fixtures; router/RLS matrix for owner/member/outsider,
  spoofed hash/signature, replay, invite states and cross-vault read/write/delete; persistence/sync
  regression and full high-risk suite.

## Manual Playwright CLI charter

- Use isolated owner/member/outsider sessions to create/sync/import/edit/delete and attempt direct
  cross-vault routes through available UI/navigation. Refresh, duplicate tabs and reconnect.
- Inspect console, request URLs/metadata and Supabase traffic for identifiers/secrets/plaintext;
  confirm forbidden states fail cleanly without data flash. Clean sessions/evidence.

## UX, style, and E2E review

Apply crypto/tRPC/sync/migration/E2E rules. Error handling must not leak existence or strand UI. A
service-role happy path is not RLS proof; adversarial integration tests are mandatory.

## Risks and questions

- Highest risks: false RLS confidence, service-role bypass, policy typo, irreversible op loss,
  invite exposure. Record table rationale and security decisions; stop only for genuine destructive
  authority, otherwise choose preservation and least privilege.
