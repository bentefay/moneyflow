# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P05 / 13 (reopen; scope-corrected per **D-017**)
- **Scope IDs:** HS-015 only. Marker authorized only after independent PASS.
- **State:** implementing; reopened.
- **Binding task:** `tasks/HS-015-realtime-security.md` (read with D-017 governing scope).
- **Build BASE:** current HEAD `92dfd4d002e8bcb2a6694c35aff8f713ba4689dc`.
- **Cumulative re-review range:** original P05 BASE `007651beb814d98646aa2e786801b647e2abd0b5` -> your
  new HEAD (reviewer confirms the preserved rev-11 security substance is intact and reviews your new
  delta).
- **Sole implementer artifact:** `evidence/P05/implementation-13.md`
- **Future immutable review artifact:** `reviews/P05-review-13.md`

## Governing decision (READ FIRST)

- **D-017 supersedes D-011.** HS-015's frozen requirement is **websocket security**: how the client
  connects to Supabase for websockets, whether it works with CORS, and whether it is properly secured
  by public-key-hash vault access. The earlier hidden-tab "first late edge" network-timing study
  (D-011/Q-013) is OUT OF SCOPE and is an accepted unmeasured non-issue. Do NOT pursue it, do NOT add
  `worker: true`/timeout/reload/poll mitigations for it.

## Already accepted — PRESERVE, do not regress

- `src/server/routers/realtime.ts` — `authorize` mints a 60s HS256 grant only after
  `rotate_realtime_grant` verifies the caller `pubkey_hash` has vault access; token is scoped to
  `realtime_table: vault_ops`, `realtime_topic: vault:{id}:{purpose}`, `vault_role`, with refresh
  lead, clock skew and a `revoke` path. Keep this authorization boundary intact.
- `src/lib/supabase/realtime.ts` — client subscribes to authoritative `vault_ops` (NOT legacy
  `vault_updates`). Keep it.
- The rev-11 same-identity duplicate-tab live-sync correction (`src/lib/sync/manager.ts`,
  `tests/e2e/tab-duplication.spec.ts`). Keep it.

## What to complete to PASS (real tests, NO faked timing)

1. **Security acceptance — the actual HS-015 (primary):**
   - Integration tests: token mint / expiry / replay / refresh; owner / member / outsider and
     cross-vault subscription authorization (outsider and cross-vault must be denied — `42501`
     FORBIDDEN); publication/table correctness (`vault_ops` only, no legacy `vault_updates`
     duplication); `revoke`; reconnect catch-up of durable ops.
   - Adversarial: an unauthorized client cannot enumerate or subscribe; an expired or replayed token
     is rejected; the server still verifies writes independently of the realtime grant.
   - CORS/origin: document the handshake and data flow and clearly distinguish websocket **origin**
     controls from **authorization**; make production origins/TLS/config explicit. State plainly
     whether CORS applies to the websocket upgrade and why.
   - Two-context E2E: live edits/import/delete appear in a second client without reload; offline ->
     reconnect catches up; a revoked member fails safe (no further live data).
2. **Background robustness — the re-scoped part (LOGIC ONLY):**
   - Use `page.addInitScript` to define `document.visibilityState`/`document.hidden` getters and
     dispatch `visibilitychange`, to assert BEHAVIOR: after a hidden -> visible transition the client
     re-syncs any missed `vault_ops` and shows no leaked data, no infinite spinner and no silent
     missed update. Assert convergence of state, never wall-clock latency.
   - **FORBIDDEN:** presenting any mock-driven or CDP-driven number as measured genuinely-hidden-tab
     network timing (the Q-013 "first late edge"). The mock fakes only the JS predicate; it does not
     throttle the socket. If you report any timing at all, label it explicitly a visible-page control.
   - Note in evidence that the 2026-07-26 root probe found CDP `Emulation.setVisibilityState` absent
     in the bundled Chromium; do not attempt raw CDP.

## Allowed changes (exact)

- `tests/integration/**` and `tests/e2e/**` — the security and background-behavior tests above.
- `tests/unit/**` — any pure-function coverage for token/grant helpers.
- `src/lib/supabase/realtime.ts`, `src/server/routers/realtime.ts`, `src/server/schemas/realtime.ts`
  — ONLY minimal completion strictly required to make the security acceptance provable (e.g. a
  visibility-aware re-sync hook if one is genuinely missing). Prefer tests over product change; keep
  the authorization boundary and `vault_ops` scoping unchanged.
- Supabase migration/config for realtime publication/RLS/grant RPCs — ONLY if a real security gap is
  found and must be closed; document it as a Q-proposal for root.

## Preserve unchanged (do NOT touch)

- The pubkey-hash authorization boundary, token scope/TTL and `vault_ops` subscription source.
- All crypto, identity, and unrelated package surfaces. No `worker: true`, no speculative timing
  mitigation, no legacy-table subscription.

## Forbidden writes

- Ledgers (`PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, `HANDOFF.md`, `DECISIONS.md`), scratch
  `specs/human-scratch.md`, `SCOPE.json`, canonical FS-001, `tasks/**`, any review file, `.claude/**`,
  `.codex/**`. Root alone writes those. Never `git add .`/`git add -A`; stage only exact authorized
  paths.

## Secret-safety (blocking)

- No `SUPABASE_JWT_SECRET`, signing key, token secret material, master secret, or vault plaintext in
  logs, URLs, query strings, analytics, fixtures, evidence or review. Public vectors only in tests.
  Any real-material leak is a blocking finding reported to root immediately.

## Formatting hazard (Q-024)

- Do NOT run bare `pnpm format` from the repo root — it rewrites frozen `specs/human-scratch.md` and
  root ledgers. Format only your exact changed `src/`/`tests/` paths (e.g.
  `pnpm exec oxfmt src/... tests/...`), run `git status` before every commit, and `git checkout` any
  `specs/**` change. `pnpm format:check` failing on `specs/**` is pre-existing and not yours.

## Method & gates

- Architecture/notes first in `evidence/P05/implementation-13.md` (leave it uncommitted), then RED
  tests that fail against current behavior, then GREEN. Run the full gate
  `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e` (the pre-existing
  `specs/**` format failure is not attributable). Run the realtime/security E2E with retries disabled
  and repeated. Never use `--headed/--ui/--debug/show`. A local Supabase container with
  `SUPABASE_JWT_SECRET` set is required for the realtime tests; if it is genuinely unobtainable,
  record a `blocked_external` proposal with the exact missing capability rather than faking evidence.

## Q-proposals

- Place any `Q-*` proposal in `evidence/P05/implementation-13.md` and continue with the safest
  reversible data-preserving choice. Root alone transcribes `QUESTIONS.md`.

## Hand back

- When GREEN with all gates passing, summarize final HEAD, exact changed paths, test counts, how the
  security acceptance is proven (with adversarial reproduction of an outsider/expired/replayed
  rejection and a real two-client live-sync + reconnect catch-up), how background behavior is verified
  via the mock at the logic level, and confirm no faked hidden-tab timing evidence, no secret leak,
  and no regression of the preserved authorization boundary. Message root `ready_for_review`. Do not
  edit any ledger or mark the requirement.
