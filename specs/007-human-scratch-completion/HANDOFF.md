# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P08 / 01
- **Scope IDs:** HS-011 (deliver the selected journey) + HS-012 (auto-person linkage). No other
  requirement IDs. HS-011's checkbox waits for BOTH P07 (already `passed`) and this P08 to pass.
- **State:** implementing (boundary-safe core; scope fixed by D-018).
- **Binding tasks:** `tasks/HS-011-membership-invite-ux.md` (the **P08 - Deliver the selected
  coherent journey** section) and `tasks/HS-012-auto-person-link.md`. Frozen text is authoritative in
  `SCOPE.json#HS-011` (lines 307-311) and `SCOPE.json#HS-012` (lines 313-315).
- **Build BASE:** current HEAD `c5c99195bef523c1d4ba2f55e54c886a1aa68533`.
- **Sole implementer artifact:** `evidence/P08/implementation-01.md` (leave uncommitted).
- **Future immutable review artifact:** `reviews/P08-review-01.md`.

## Governing decision (READ FIRST)

- **D-018 is the binding scope contract; read it in full in `DECISIONS.md`.** It rescopes P08 after
  an independent fresh-context scope adjudication (`adjudications/P08-scope-01.md`, distinct opus-tier
  reviewer, ruled from the frozen text). **D-013's linked-hybrid DATA MODEL still stands** and is
  frozen-traceable: **Vault Settings is the sole authoritative location for Members/Invites**;
  **People** remains encrypted financial state with an OPTIONAL stable membership link — never merge
  the two concepts or expose one as the other.
- **D-013's 29-clause epoch/reconciliation MANDATE is OUT of P08 (superseded-in-part by D-018).** Do
  NOT build epoch rotation, monotonic vault epochs, per-epoch/`access_generation` envelope history,
  `exact_operation_id` / peer / frontier op metadata, IndexedDB edit-admission fences or
  epoch-transition journals, the rotation state machine, fragment-derived Ed25519 capability signing /
  preflight challenge, `pendingAcceptances`/`pendingCreations` sagas, frontier-bound causal repair,
  soft removal / tenure denial, or epoch-0 backfill. These map to NO frozen requirement, MUST NOT be
  spun into a new package, and MUST NOT touch the preserved `vault_ops` boundary.
- **The P05/D-011 gate is CLEARED.** P05/HS-015 passed under D-017 (which superseded D-011; the
  hidden-tab timing edge is an accepted unmeasured non-issue). Do NOT reopen realtime timing work.

## Known real defects to fix (from the task evidence — revalidate, do not assume)

- People page currently hardcodes owner/key inputs (`isOwner=false`, `vaultKey=undefined`) so
  `InviteLinkGenerator` is unreachable — owners cannot discover/create/revoke/inspect invites from the
  authoritative location.
- Invite redemption wraps a RANDOM PLACEHOLDER vault key (`sodium.randombytes_buf(48)`) rather than
  the selected vault's real key — redemption must unwrap the REAL vault key and open the same encrypted
  vault. Placeholder cryptography is a blocking defect.
- No reliable creator/invite-acceptance path idempotently creates/links the per-user Person.

## Definition-of-done to PASS (D-018 boundary-safe core; real crypto, real two-user journey, NO placeholder)

1. **HS-011 - real, secure invite redemption.** Remove the `randombytes_buf(48)` placeholder. The
   invitee unwraps the REAL vault key via authenticated `crypto_box` (fragment-derived ephemeral secret
   + owner's authoritative X25519 sender key, resolved SERVER-SIDE — no schema change, no
   caller-claimed sender) and self-wraps it, so a redeemed member opens the SAME vault. Fragment secret
   stays in the URL fragment only.
2. **HS-011 - authoritative, reachable membership/access surface.** An "Access & Members" surface in
   **Vault Settings** where the owner discovers/creates/copies/revokes invites and lists members;
   members see a privacy-safe roster. Server-side role authorization is enforced (unauthorized mutation
   rejected). The dead People-page hardcoding is removed; People keeps financial semantics with at most
   an optional membership-link display and a deep link to Settings.
3. **HS-011 - member removal via the EXISTING preserved path only.** Removal must be reachable and must
   invoke the existing `membership.remove` + `membership.rekey` (`rekey_vault_members` RPC) mechanism
   so a removed member loses future-envelope access at the strength the preserved boundary already
   provides. Rekey-on-removal is IN **only as the existing preserved capability wired up — NOT new
   epoch machinery**; the lossless/crash-safe/concurrent-offline guarantee is OUT. If wiring the
   existing rekey fully is out of reach, removal may ship as the pre-existing behavior unchanged;
   either way NO new security regression is introduced.
4. **HS-012 - auto-linked Person per user.** Deterministic, idempotent Person-per-member: owner links
   `person-default-me` in place (`linkedUserId = ownerPubkeyHash`); invitee idempotently upserts one
   Person keyed on the stable pubkey hash so concurrent tabs / refresh / re-add converge to a single
   Person. `Person.name` becomes OPTIONAL with a centralized display-name resolver (explicit name →
   self label → deterministic non-identifying fallback; never renders a raw pubkey hash). Existing
   allocations/settlement/financial state are untouched by linkage. Preserve — never auto-merge —
   ambiguous legacy duplicate links.
5. **Real tests.** Unit/property tests for the resolver and idempotent linkage; integration tests for
   invite create → redeem → membership and for removal+rekey authorization; a two-user E2E that
   exercises the REAL invite UI journey (owner creates invite → second user creates/unlocks identity,
   accepts, decrypts the SAME vault, syncs edits bidirectionally, sees permissions, then
   removal/revocation), accepting twice/concurrently to prove person idempotence. No service-role
   admin-key-wrap bypass on the journey.
6. **Gates.** `pnpm typecheck && lint && format:check && test && test:e2e` green.

## Allowed changes

- `tests/unit/**`, `tests/integration/**`, `tests/e2e/**` — the coverage above.
- Product code strictly within the **invite / membership / person / People / Vault Settings** domain
  required by D-018 and the two tasks — e.g. the invite components (`InviteLinkGenerator` and the
  invite/redemption pages/effects), membership & invite tRPC routers and their Zod schemas, the Person
  schema/resolution and People UI, Vault Settings access UI, and the vault-creation/acceptance link
  logic. TRACE the actual routes yourself; keep each change minimal and justify every touched path in
  evidence. Anything OUTSIDE this domain must be called out explicitly for reviewer scrutiny with its
  justification (as a scope-boundary note), not silently included.

## Preserve unchanged (do NOT touch) — HARD boundary

- The P04 database/RLS threat-model boundary and the P05 realtime pubkey-hash authorization boundary
  (`src/server/routers/realtime.ts`, `src/lib/supabase/realtime.ts`, `src/server/schemas/realtime.ts`,
  `vault_ops` scoping). **NO `vault_ops` schema change and NO new migration are permitted in P08** —
  the adjudicator independently confirmed the full contract would require `epoch`/`exact_operation_id`/
  frontier columns on `vault_ops`, and D-018 rules that change OUT (moot, must not be made). Verify your
  diff over these files and `supabase/migrations/**` is EMPTY.
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

- Place any `Q-*` proposal in `evidence/P08/implementation-01.md` and continue with the safest
  reversible data-preserving choice. Root alone transcribes `QUESTIONS.md`. The scope tension is
  already resolved: Q-025 (local) → binding ruling (b) → D-018; the name-storage, duplicate-repair and
  link-identifier proposals are transcribed as Q-030 / Q-031 / Q-032 with the implementer's
  safest-reversible defaults accepted. Do NOT reopen the epoch-scope question.

## Hand back

- When GREEN with all gates passing, summarize final HEAD, exact changed paths (with per-path
  justification and any out-of-domain path flagged), test counts, how the invite journey is proven with
  REAL key wrap/unwrap (adversarial reproduction of an outsider/expired/reused/revoked/tampered
  rejection and a real two-user accept → same-vault decrypt → bidirectional sync), how Person linkage
  is proven idempotent under concurrency/refresh/re-add, how member removal via the EXISTING
  remove+rekey path is handled, and confirm no placeholder cryptography, no secret/fragment leak, an
  EMPTY diff over the P04/P05/`vault_ops`/migration boundary, and no epoch machinery introduced. Message
  root `ready_for_review`. Do not edit any ledger or mark the requirement.
