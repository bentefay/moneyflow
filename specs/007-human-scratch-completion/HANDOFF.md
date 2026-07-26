# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P08 / 02 (remediation)
- **Scope IDs:** HS-011 + HS-012. No other requirement IDs. This is a NARROW remediation of ONE
  blocker plus non-blocking honesty items — NOT a re-implementation.
- **State:** implementing (D-018 boundary-safe core; scope unchanged).
- **Binding tasks:** `tasks/HS-011-membership-invite-ux.md` (the **P08 - Deliver the selected
  coherent journey** section) and `tasks/HS-012-auto-person-link.md`. Frozen text authoritative in
  `SCOPE.json#HS-011` (lines 307-311) and `SCOPE.json#HS-012` (lines 313-315).
- **Build BASE:** rev-01 HEAD `d2762f9` (build ON TOP of your accepted rev-01 work — do NOT rebase to
  `c5c9919` or redo passed items). Root will compute the rev-02 review BASE as `d2762f9` so only your
  delta is reviewed.
- **Sole implementer artifact:** `evidence/P08/implementation-02.md` (leave uncommitted).
- **Future immutable review artifact:** `reviews/P08-review-02.md`.

## What already PASSED in rev-01 (PRESERVE — do not regress, do not redo)

An independent reviewer reproduced and PASSED almost all of rev-01 over `c5c9919 -> d2762f9`. These
are settled; keep them exactly as shipped and do not reopen them:

1. **DoD 1 - real secure redemption.** `randombytes_buf(48)` placeholder gone; invitee unwraps the
   REAL vault key via authenticated `crypto_box` with owner sender key resolved SERVER-SIDE from
   `vault_memberships.created_by`, self-wraps, fail-closed `NOT_FOUND`, `safeParse` (no `as`).
2. **DoD 2 - authoritative reachable surface.** Access & Members mounted in Vault Settings; People
   hardcoding deleted at the type level; server-side owner authorization enforced.
3. **DoD 3 - member removal via preserved path only: MET.** The reviewer's earlier removal-without-
   rekey blocker (B-1) was WITHDRAWN: `rekey` has ZERO real call sites at BOTH BASE and HEAD, so
   revoke-without-rotate downgrades no capability that ever existed; membership-scoped RLS
   (`is_vault_member`) + per-message realtime re-check (`realtime_grant_allows`, `revoked_at IS NULL`)
   revoke future-envelope access at the preserved strength. Root independently reconfirmed this. DO
   NOT add epoch/rekey machinery — it stays OUT (D-018).
4. **Secret-safety, trpc nonce memo, Person.name resolver ripple** all verified clean. Gates were
   green (typecheck / lint / test 1714 pass / e2e 123 pass).

## The ONE blocker to fix (B-2) — DoD items 4/5

Invite acceptance never switches the accepting member INTO the shared vault, so the HS-012 linkage
never runs on the real journey and no member Person materializes for a real accepting user.

- **Root cause (revalidate yourself):** `src/app/(onboarding)/invite/[token]/page.tsx` (~lines
  191-203) calls `markPendingPersonLink(inviteInfo.vaultId)` then `router.push("/transactions")` but
  never makes the shared vault active. `vault-provider.tsx` (~lines 136-140) only reassigns the active
  vault when the current selection is INACCESSIBLE; the member's own personal vault IS accessible, so
  the reconciler never switches, `consumePendingPersonLink` is never reached, and People shows only
  "Me".
- **Required fix:** on successful acceptance, deliver the member into the SHARED vault (set the active
  vault to the shared `vaultId` via the same mechanism the app uses elsewhere — trace it; likely
  `setActiveVault` / `setActiveVaultStorage`) so the pending person-link is consumed and the member
  Person materializes deterministically. Keep it minimal and within the invite/membership/person/
  vault-selection domain.
- **Remove the permanent-miss fragility:** the `sessionStorage` consume-once marker has no
  reconciliation path, so a single miss is permanent. Make linkage reconcile whenever the shared vault
  is opened (idempotent, re-runnable) rather than depending on a one-shot marker that is never retried.
  Preserve idempotence: concurrent tabs / refresh / re-accept must still converge to a single Person.
- **Strengthen the E2E so it can actually catch this.** The shipped two-user E2E asserts only on the
  DB membership row, never on what the member's app opens, so it passes while B-2 is live. The rev-02
  E2E MUST assert, from the accepting member's own context, that the app opens the SHARED vault
  (shared vault active) and that the member sees TWO persons (self + owner, with the deterministic
  non-identifying fallback name rendered, never a raw pubkey hash), plus bidirectional sync — not just
  a server row.

## Non-blocking honesty / coverage items (address in rev-02; do not over-build)

- **N-4a removal-control honesty.** The remove control should state that access is revoked but the
  vault key is NOT rotated (discharges the binding task's "removal/rekey implications explained" at
  `tasks/HS-011-...` lines 41-42). Plain user-facing/inline honesty text — NOT new crypto.
- **N-4b removal-authorization integration test.** Add the DoD-5 integration test asserting an
  unauthorized (non-owner) removal is rejected. The authorization itself is pre-existing and
  server-side (`membership.ts:102-107` / `:196-201`); you are adding the missing COVERAGE, not new
  authz.
- **N-4c evidence correction.** In `evidence/P08/implementation-02.md` correct the rev-01 evidence
  section-4 "sealed-box rekey ... unchanged" overstatement: no rekey runs at all (`sealKeyToBase64` is
  reachable only from the uncalled `rekeyVault`). State the true posture (rotation never runs; removal
  relies on RLS + realtime membership re-check).

## Allowed changes

- `tests/unit/**`, `tests/integration/**`, `tests/e2e/**` — the coverage above.
- Product code strictly within the **invite / acceptance / vault-selection / person / People / Vault
  Settings** domain required to fix B-2 + N-4a — principally the invite acceptance page/effect, the
  vault-selection/active-vault logic, the pending-person-link reconciliation, and the removal control's
  user-facing copy. TRACE the actual routes yourself; keep each change minimal and justify every
  touched path in evidence. Anything OUTSIDE this domain must be called out explicitly for reviewer
  scrutiny with its justification, not silently included. Do NOT refactor or "improve" the passed
  rev-01 code beyond what B-2/N-4 require.

## Preserve unchanged (do NOT touch) — HARD boundary

- The P04 database/RLS threat-model boundary and the P05 realtime pubkey-hash authorization boundary
  (`src/server/routers/realtime.ts`, `src/lib/supabase/realtime.ts`, `src/server/schemas/realtime.ts`,
  `vault_ops` scoping). **NO `vault_ops` schema change and NO new migration are permitted** — verify
  your diff over these files and `supabase/migrations/**` is EMPTY.
- NO epoch/rekey/rotation machinery (D-018 rules it OUT; B-1 withdrawn — there is nothing to fix
  there). All unrelated feature surfaces (aliases, undo, GC, import, virtualization, passkeys). No
  scope widening beyond HS-011 + HS-012.

## Forbidden writes

- Ledgers (`PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, `HANDOFF.md`, `DECISIONS.md`), scratch
  `specs/human-scratch.md`, `SCOPE.json`, canonical FS-001, `tasks/**`, any review file, `.claude/**`,
  `.codex/**`. Root alone writes those. Never `git add .`/`git add -A`; stage only exact authorized
  paths.

## Secret-safety (blocking)

- No vault master key, real invite-fragment bearer secret, `crypto_box` secret material, seed phrase,
  recovery material, `SUPABASE_JWT_SECRET` or vault plaintext in logs, URLs, query strings, analytics,
  fixtures, evidence or review. In tests use public vectors / synthetic material only. Any real-
  material leak is a blocking finding reported to root immediately.

## Formatting hazard (Q-024)

- Do NOT run bare `pnpm format` from the repo root — it rewrites frozen `specs/human-scratch.md` and
  root ledgers. Format only your exact changed `src/`/`tests/` paths (e.g.
  `pnpm exec oxfmt src/... tests/...`), run `git status` before every commit, and `git checkout` any
  `specs/**` change. `pnpm format:check` failing on `specs/**` is pre-existing and not yours.

## Method & gates

- Notes first in `evidence/P08/implementation-02.md` (leave uncommitted). Add a RED E2E that opens the
  member's app after acceptance and FAILS on the current wiring (asserts shared vault active + two
  persons) BEFORE the fix, then make it GREEN. Run the full gate
  `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e` (the pre-existing
  `specs/**` format failure is not attributable). Run the two-user invite/accept E2E with retries
  disabled and repeated. Never use `--headed/--ui/--debug/show`. A local Supabase container is required
  for the integration/two-user tests; if genuinely unobtainable, record a `blocked_external` proposal
  naming the exact missing capability rather than faking evidence.

## Q-proposals

- Place any `Q-*` proposal in `evidence/P08/implementation-02.md` and continue with the safest
  reversible data-preserving choice. Root alone transcribes `QUESTIONS.md`. The scope tension is
  already resolved (D-018; Q-029..Q-032). Do NOT reopen the epoch-scope question or the withdrawn B-1.

## Hand back

- When GREEN with all gates passing, summarize final HEAD, exact changed paths (with per-path
  justification and any out-of-domain path flagged), test counts, and specifically: how the accepting
  member is now delivered into the SHARED vault, how the E2E now proves it from the member's own app
  (shared vault active + two persons + non-identifying fallback name + bidirectional sync), how linkage
  reconciles idempotently without a one-shot marker (concurrency/refresh/re-accept converge to one
  Person), the removal-control honesty copy, the new removal-authorization integration test, and the
  corrected evidence wording. Confirm no placeholder cryptography, no secret/fragment leak, an EMPTY
  diff over the P04/P05/`vault_ops`/migration boundary, and no epoch machinery introduced. Message root
  `ready_for_review`. Do not edit any ledger or mark the requirement.
