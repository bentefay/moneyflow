# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P08 / 01
- **Scope IDs:** HS-011 (deliver the selected journey) + HS-012 (auto-person linkage). No other
  requirement IDs. HS-011's checkbox waits for BOTH P07 (already `passed`) and this P08 to pass.
- **State:** implementing.
- **Binding tasks:** `tasks/HS-011-membership-invite-ux.md` (the **P08 — Deliver the selected
  coherent journey** section) and `tasks/HS-012-auto-person-link.md`. Frozen text is authoritative in
  `SCOPE.json#HS-011` (lines 307-311) and `SCOPE.json#HS-012` (lines 313-315).
- **Build BASE:** current HEAD `c5c99195bef523c1d4ba2f55e54c886a1aa68533`.
- **Sole implementer artifact:** `evidence/P08/implementation-01.md` (leave uncommitted).
- **Future immutable review artifact:** `reviews/P08-review-01.md`.

## Governing decision (READ FIRST)

- **D-013 is the binding contract.** Read it in full in `DECISIONS.md`, then read the accepted P07
  architecture it rests on: `evidence/P07/implementation-04.md` (the ~1,019-line contract, SHA
  `313ce10c…`) and `reviews/P07-review-04.md`. D-013 chose a **linked hybrid**: **Vault Settings is
  the sole authoritative location for Members/Invites**; **People** remains encrypted financial state
  with an OPTIONAL stable membership link — never merge the two concepts or expose one as the other.
- You must implement all of D-013's clauses (the 29 accessibility/security/migration/real-browser
  requirements the P07 review enumerates), not a subset. Key mandated mechanisms: sender-bound
  authenticated `crypto_box` (NOT sealed-box, NOT a random placeholder key); access-generation-scoped
  per-epoch envelope history; locked server-side rotation; a persistent same-store edit fence/journal
  that preserves every exact peer-specific Loro operation (semantic receipts must NEVER substitute for
  exact-op permanence); reconstructible SQL truth followed by fenced encrypted client sagas;
  frontier-bound repair for late/distinct Person claims; and creation links canonical
  `person-default-me` in place while preserving 100% default-account ownership/references.
- **The P05/D-011 gate is CLEARED.** P07's review said P08 was "not dispatch-ready until root performs
  the D-011/P05 hidden-topology recheck." That is now satisfied: **P05/HS-015 passed under D-017**
  (which superseded D-011; the hidden-tab timing edge is an accepted unmeasured non-issue). Do NOT
  reopen realtime timing work.

## Known real defects to fix (from the task evidence — revalidate, do not assume)

- People page currently hardcodes owner/key inputs so `InviteLinkGenerator` is unreachable — owners
  cannot discover/create/revoke/inspect invites from the authoritative location.
- Invite redemption appears to wrap a RANDOM PLACEHOLDER vault key rather than the selected vault's
  real key — redemption must unwrap the REAL vault key and open the same encrypted vault. Placeholder
  cryptography is a blocking defect.
- No reliable creator/invite-acceptance path idempotently creates/links the per-user Person.

## What to complete to PASS (real crypto, real two-user journey, NO placeholder)

1. **HS-011 secure invite/member journey (Vault Settings authoritative):**
   - Owners discover, create, revoke, cancel and inspect invites and manage members from Vault
     Settings; unauthorized roles cannot (owner/member/outsider enforced server-side). People may show
     an optional link/invitation status only if D-013 calls for it.
   - Invite URLs keep bearer secrets in the URL **fragment** (or another non-server-visible channel) —
     never in path, query, server logs, analytics or network. Expiry, single-use, cancellation, role
     and recipient intent are explicit. Redemption unwraps the REAL vault key and opens the same
     encrypted vault; edits then sync both ways.
   - Member removal/rekey (rotation) implications are handled and explained; removed/re-added tenure
     denial and honest past-copy limits per D-013.
2. **HS-012 auto-person linkage:**
   - On vault creation AND invite acceptance, idempotently ensure exactly one linked Person per member
     — no duplicates under refresh, retries, concurrent tabs or membership re-add. Link via the stable
     privacy-preserving user identifier consistent with P04/P07 (NOT plaintext key or unverified client
     label). Person name becomes optional with a deterministic accessible fallback; centralize
     display-name resolution. Renames/unlinks/removal retain financial allocation integrity.
   - Migrate existing people/members safely; preserve ambiguous duplicates for reversible repair.
3. **Tests (all real, none bypassing the UI on the journey):**
   - Unit/property: legal linked/unlinked/named/unnamed Person states and fallback resolution.
   - Integration/security: owner/member/outsider permissions, expiry/reuse/revoke/tamper, REAL key
     wrap/unwrap, cross-vault denial, creator/acceptance concurrency, migration, member removal/re-add.
   - Two-user E2E with isolated contexts: owner creates invite -> second user creates/unlocks identity,
     accepts, decrypts the SAME vault, syncs edits, sees permissions, then removal/revocation. Accept
     twice/concurrently to prove person idempotence.

## Allowed changes

- `tests/unit/**`, `tests/integration/**`, `tests/e2e/**` — the coverage above.
- Product code strictly within the **invite / membership / person / People / Vault Settings** domain
  required by D-013 and the two tasks — e.g. the invite components (`InviteLinkGenerator` and the
  invite/redemption pages/effects), membership & invite tRPC routers and their Zod schemas, the Person
  schema/resolution and People UI, Vault Settings access UI, and the vault-creation/acceptance sagas.
  TRACE the actual routes yourself (the task mandates it); keep each change minimal and justify every
  touched path in evidence. Anything OUTSIDE this domain must be called out explicitly for reviewer
  scrutiny with its justification (as a scope-boundary note), not silently included.
- A Supabase migration ONLY as D-013's reversal/migration path requires (epoch/envelope/link backfill,
  revoke legacy pending invites); never destructively down-migrate advanced epochs or delete
  referenced financial state.

## Preserve unchanged (do NOT touch)

- The P04 database/RLS threat-model boundary and the P05 realtime pubkey-hash authorization boundary
  (`src/server/routers/realtime.ts`, `src/lib/supabase/realtime.ts`, `src/server/schemas/realtime.ts`,
  `vault_ops` scoping) — verify your diff over these stays empty unless D-013 provably requires a
  change, in which case raise a Q-proposal first.
- All unrelated feature surfaces (aliases, undo, GC, import, virtualization, passkeys). No scope
  widening beyond HS-011 + HS-012.

## Forbidden writes

- Ledgers (`PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, `HANDOFF.md`, `DECISIONS.md`), scratch
  `specs/human-scratch.md`, `SCOPE.json`, canonical FS-001, `tasks/**`, any review file, `.claude/**`,
  `.codex/**`. Root alone writes those. Never `git add .`/`git add -A`; stage only exact authorized
  paths.

## Secret-safety (blocking)

- No vault master key, real invite-fragment bearer secret, `crypto_box` secret material, seed phrase,
  recovery material, `SUPABASE_JWT_SECRET` or vault plaintext in logs, URLs, query strings, analytics,
  fixtures, evidence or review. In tests use public vectors / synthetic material only. In the manual
  charter NEVER retain a real fragment/evidence secret. Any real-material leak is a blocking finding
  reported to root immediately.

## Formatting hazard (Q-024)

- Do NOT run bare `pnpm format` from the repo root — it rewrites frozen `specs/human-scratch.md` and
  root ledgers. Format only your exact changed `src/`/`tests/` paths (e.g.
  `pnpm exec oxfmt src/... tests/...`), run `git status` before every commit, and `git checkout` any
  `specs/**` change. `pnpm format:check` failing on `specs/**` is pre-existing and not yours.

## Method & gates

- Architecture/notes first in `evidence/P08/implementation-01.md` (leave it uncommitted), then RED
  tests that fail against current behavior (the placeholder-key defect must have a RED test proving it
  is insecure before you fix it), then GREEN. Run the full gate
  `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e` (the pre-existing
  `specs/**` format failure is not attributable). Run the invite/member/person security + two-user E2E
  with retries disabled and repeated. Never use `--headed/--ui/--debug/show`. A local Supabase
  container is required for the integration/two-user tests; if it is genuinely unobtainable, record a
  `blocked_external` proposal naming the exact missing capability rather than faking evidence.

## Q-proposals

- Place any `Q-*` proposal (the D-013-mandated user-name/storage source and duplicate-repair proposals,
  plus any residual architecture preference) in `evidence/P08/implementation-01.md` and continue with
  the safest reversible data-preserving choice. Root alone transcribes `QUESTIONS.md`.

## Hand back

- When GREEN with all gates passing, summarize final HEAD, exact changed paths (with per-path
  justification and any out-of-domain path flagged), test counts, how the invite journey is proven with
  REAL key wrap/unwrap (adversarial reproduction of an outsider/expired/reused/revoked/tampered
  rejection and a real two-user accept -> same-vault decrypt -> bidirectional sync), how Person linkage
  is proven idempotent under concurrency/refresh/re-add, how member removal/rekey is handled, and
  confirm no placeholder cryptography, no secret/fragment leak, and no regression of the P04/P05
  boundaries. Message root `ready_for_review`. Do not edit any ledger or mark the requirement.
