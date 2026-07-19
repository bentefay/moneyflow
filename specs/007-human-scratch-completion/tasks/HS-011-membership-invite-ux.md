# HS-011 — Person, Member, and Invite UX

- **Status:** queued
- **Source:** `specs/human-scratch.md:307-311`; exact frozen text is in `SCOPE.json#HS-011`
- **Packages:** P07 evidence/ADR; P08 integrated implementation with HS-012
- **Depends on:** P04/P05 security boundaries; P06 user-state cleanup

## Frozen requirement

> Determine the current/add-user invite UX and whether users must map to People, with access
> management possibly on People or in Vault Settings.

## Current evidence to revalidate

- People page currently hardcodes owner/key inputs so `InviteLinkGenerator` is not reachable.
- Invite redemption appears to wrap a random placeholder vault key rather than the selected vault's
  real key. This is not a functional secure collaboration flow.
- Membership/invite routers and crypto-level tests exist, but the real owner/invitee journey and
  person linkage are incomplete. Inspect a possible hook usage inside invite-page effects.

## Acceptance direction

### P07 — Discover and decide without inventing preference

- Trace every existing owner/member/person/invite route, role, key-wrap operation and UI entry
  point.
- Write an ADR comparing People-linked access versus dedicated Vault Settings access using frozen
  wording, established information architecture, privacy, revocation and accessibility. Do not ask
  or pause; choose the safest reversible architecture and return remaining preference as a Q
  proposal.
- Preserve a clear distinction between financial People and security Members even if linked.

### P08 — Deliver the selected coherent journey

- Owners can discover, create, revoke and inspect invites and manage members from an appropriate
  location; unauthorized roles cannot. People can show/link invitation status if the ADR calls for
  it.
- Invite URLs keep secrets in fragments or another non-server-visible channel; expiry, single use,
  cancellation, role and recipient intent are clear. Redemption unwraps the real vault key and opens
  the same encrypted vault.
- Member removal/rekey implications are explicitly handled and explained. HS-011 waits for both
  packages and HS-012 integration before checkbox completion.

## Automated tests

- Router/security integration: owner/member/outsider permissions, expiry/reuse/revoke/tamper, real
  key wrap/unwrap and cross-vault denial.
- E2E with isolated contexts: owner discovers invite, optionally links person, invitee
  creates/unlocks identity, accepts, decrypts same vault, syncs edits, sees permissions,
  removal/revocation. Repeat.

## Exhaustive manual Playwright CLI charter

- Use owner/member/outsider sessions. Find the flow without direct URL knowledge, create/copy/open
  an invite, test new/existing user, expired/reused/revoked/tampered links, refresh/back/cancel and
  role restrictions. Never retain the real fragment/evidence secret.
- Judge discoverability, copy, confirmation, focus, responsive/dark/reduced motion and error
  recovery. Inspect console/network/URL to ensure no vault key or invite secret leaks. Clean
  sessions.

## UX, style, and E2E review

Audit component, crypto, tRPC, sync and E2E rules. Reviewer must reject placeholder cryptography,
hidden owner controls, confusing Person/Member terminology, unsafe copy flows or tests that bypass
UI.

## Risks and questions

- Risks: architecture preference, real-key disclosure, removal without rotation, invite replay,
  account enumeration. Record the ADR/default and residual human preference in persistent files.
