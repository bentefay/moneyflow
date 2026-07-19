# HS-012 — Automatically Linked Person Per User

- **Status:** queued
- **Source:** `specs/human-scratch.md:313-315`; exact frozen text is in `SCOPE.json#HS-012`
- **Package:** P08 with HS-011
- **Depends on:** P07 membership UX decision; P05 secure realtime; P06 user model

## Frozen requirement

> Create a Person for each user automatically. Person has an optional user identifier, optional
> name, and uses an associated user's name as fallback.

## Current evidence to revalidate

- Person schema currently has a required name and optional `linkedUserId`.
- People table can locate the current linked person but no reliable creator/invite-acceptance path
  automatically creates or links it.
- There is no clearly established user display-name model; public-key hash is security identity, not
  automatically suitable human-facing copy.

## Acceptance direction

- On vault creation and invite acceptance, idempotently ensure one linked Person for that member; do
  not duplicate under refresh, retries, concurrent tabs or membership re-add.
- Link through a stable privacy-preserving user identifier consistent with P04/P07, not plaintext
  key or unverified client label. Person name becomes optional with a deterministic accessible
  fallback.
- Decide where a user display name lives only after evidence; avoid introducing shared plaintext or
  a generic user-state blob. Renames/unlinks/removal retain financial allocation integrity.
- Existing people/members migrate safely and ambiguous duplicates are preserved for reversible
  repair.

## Implementation and review checkpoints

- Model legal linked/unlinked/named/unnamed states and centralize display-name resolution. Reviewer
  checks idempotence, privacy, permissions and all People/allocation consumers.

## Automated tests

- Unit/property: fallback resolution and legal states; integration: creator/acceptance concurrency,
  migration, member removal/re-add and permission; two-user E2E through real invite and People UI.

## Manual Playwright CLI charter

- Create owner vault, inspect auto Person, invite a second new/existing user, accept
  twice/concurrently, rename/clear a Person name, allocate transactions, remove/re-add member,
  refresh and duplicate tabs.
- Verify fallback clarity, responsive/dark/reduced-motion and keyboard behavior; inspect console,
  network and stored/UI identifiers for privacy. Clean sessions.

## UX, style, and E2E review

Apply schema/CRDT/crypto/tRPC/component/E2E rules. UX must not expose raw hashes as confusing names
or silently merge financial People. Meaningful two-user E2E is mandatory.

## Risks and questions

- Risks: missing username source, duplicate linkage, privacy leakage, historical allocations after
  removal. Return user-name/storage and duplicate-repair proposals for root transcription.
