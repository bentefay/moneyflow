# HANDOFF — P20A REVIEW dispatch (revision 01)

**To:** `p20a-reviewer-01` (fresh, independent — you did NOT implement P20A; you are NOT
`p20a-implementer-01`). Read-only on product code; you may run all gates. **From:** root
coordinator.

**Package:** P20A (HS-016 — Truthful marketing pages). **This is the SOLE HS-016 package** — on your
PASS, root performs the NON-markerless final integration that checks the HS-016 scratch block and
flips the HS-016 requirement to `passed`. Review as the last gate before HS-016 is declared
complete.

**Review range:** `b79c77d..6509ce7c` (product/test delta in `6d5b5db` test + `6509ce7c` feat; docs
commit was the dispatch commit `b79c77d` = BASE). Linear single-parent chain
`b79c77d->6d5b5db->6509ce7c`. Work read-only against git; **do NOT checkout/reset/branch/switch** —
the tree stays at HEAD.

**Frozen text:** `specs/human-scratch.md:328-331` (HS-016), exact bytes in `SCOPE.json#HS-016`:

> Update the marketing pages to include all these features. Be clear, succinct and not too
> "markety". It's private. It's for categorising and allocating your transactions, not budgeting.
> Supports importing CSV and ofx. Multiple people can collaborate in real-time. It intelligently
> applies your tags, aliases and allocations to new imports.

Full brief: `specs/007-human-scratch-completion/tasks/HS-016-marketing-pages.md`. The implementer's
evidence + claim-to-evidence table is `evidence/P20A/implementation-01.md` — read the frozen text,
not the evidence, as your source of truth, and **independently confirm every claim against the
actual codebase and running app.**

## What root already verified (verify-not-trust — re-derive, do not take on faith)

- Linear single-parent chain `b79c77d->6d5b5db->6509ce7c`, no merges.
- Delta = `src/app/(marketing)/layout.tsx`, six `src/components/features/landing/*.tsx`
  (`HeroSection`, `FeaturesSection`, `SecuritySection`, `CTASection`, `Footer`, `Header`),
  `tests/unit/components/landing-page.test.tsx`, `tests/e2e/landing.spec.ts`, and
  `evidence/P20A/implementation-01.md`. **NOTHING under
  `src/lib/**`, `src/server/**`, `supabase/**`, or `src/app/(app)/**`; `package.json`/lockfile
  untouched.**
- **Hard boundary byte-identical BASE(`b79c77d`)->HEAD** — must NOT change: FS-001
  `src/lib/domain/settlement.ts` blob `010f3c93582a2ce311594d4dde8464760ca49c43`.
- Product code cast-free; no new `as`/`any`/non-null `!` in added lines; root spot-check
  `pnpm typecheck` clean.

## The core of this review: TRUTHFULNESS (verify, do not trust the table)

The frozen requirement is that the marketing pages be **clear, succinct, non-markety, and true.**
Your central job is to independently confirm the copy matches reality — the implementer's
claim-to-evidence table is a starting point to CHECK, not accept.

1. **Every KEPT claim must be backed by a capability reachable today.** For each advertised feature,
   find the shipping code path and, where practical, exercise it in the running app. Spot-check at
   minimum: CSV **and OFX** import (`src/lib/import/csv.ts`, `src/lib/import/ofx.ts`, reachable at
   `/imports/new`); categorising + **percentage** People allocations
   (`src/lib/domain/allocation.ts`, `/transactions`, `/people`); rules auto-applying
   tags/aliases/allocations to **new imports** (`applyFieldRulesToImport` from
   `src/lib/crdt/import-commit.ts`); real-time multi-person collaboration/presence
   (`src/lib/sync/**`, `src/lib/supabase/realtime.ts`); client-side encryption before storage
   (`src/lib/crypto/encryption.ts`); 12-word phrase **or passkey** unlock. **If any advertised
   feature is not actually usable, that is a blocking finding** ("no feature advertised before it is
   usable").
2. **Every CUT claim must be genuinely false/unbacked** — confirm the removals are justified, not
   over-eager. Confirm "Smart Budgeting"/"Spending Insights" have no shipping support (no budget in
   `src/lib/crdt/schema.ts`, no charting dep, `/dashboard` behaviour), and that the removed
   open-source/MIT claim is indeed contradicted by `README.md` + absent `LICENSE` + `package.json`
   `"private": true`.
3. **Crypto corrections must be ACCURATE.** The copy now says vault data is **XSalsa20-Poly1305**
   (`crypto_secretbox_easy`) with **HKDF-SHA256** derivation, and that XChaCha20 is presence-only.
   Verify against `src/lib/crypto/encryption.ts` and the presence path. If the corrected copy is
   itself wrong, that is blocking. (The stale XChaCha20 comments still in
   `src/lib/crypto/encryption.ts` + `supabase/migrations/005_vault_ops.sql` are OUT of P20A scope —
   root tracks them as **Q-P20A-02** for a later sweep; do not require them changed here.)
4. **Privacy wording must match the threat model — no false absolutes.** Confirm no
   "zero-knowledge", "100% private", "unhackable", "military-grade", or offline-that-does-not-exist
   claims survive, and that the honest server-visibility disclosure (membership graph, per-op
   author + timestamp, data volume) is accurate.

## Presentation / accessibility (confirm, not just trust the tests)

Responsive at desktop + mobile (implementer claims no horizontal overflow at 390px), dark/light,
`prefers-reduced-motion` respected, metadata/`<title>`/semantics, single `h1`, no skipped heading
levels, discernible link names, focus order, and **all CTA/nav links resolve to live destinations**
(the implementer removed `href="#"` dead links and a wrong GitHub account — confirm none remain).

## Hard rules (blocking if violated)

- No new `as` / `any` / non-null `!` in **product** code. Confirm.
- **SECRET-SAFETY (BLOCKING):** no seed phrase, recovery material, vault master key, vault-derived
  key, invite bearer secret, `crypto_box` secret material, `SUPABASE_JWT_SECRET`, or vault plaintext
  anywhere in copy/code/tests/fixtures/evidence — synthetic/public content only. Any real-material
  leak is a blocking finding reported to root IMMEDIATELY.
- FS-001 `settlement.ts` byte-identical; nothing under `src/lib/**` changed.

## Gates — re-run and report REAL counts

`pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e`. Implementer
reported: typecheck 0 errors; lint 0 errors / 10 pre-existing warnings; format:check 14 pre-existing
`specs/**` markdown only (0 `.ts`/`.tsx`); test 1939 passed / 2 skipped; e2e 163 passed. Re-run and
confirm real counts. A `format:check` failure confined to pre-existing markdown is NON-blocking; any
P20A `.ts`/`.tsx` failing oxfmt IS blocking. Never run Playwright with `--debug/--ui/--headed/show`.

## Handback

SendMessage to `main` with: **VERDICT: PASS** or **VERDICT: FAIL** (0 blocking findings = PASS); the
five real gate counts; a plain-language **truthfulness + UX verdict**; and an explicit statement
that (a) every advertised feature is backed by a capability usable today, (b) every removed claim
was genuinely false/unbacked, (c) the crypto corrections are accurate and privacy wording carries no
false absolutes, (d) the FS-001 boundary is byte-identical and nothing under `src/lib/**` changed,
(e) all CTA/nav links resolve, and (f) no secret material anywhere. Include any Q-proposals or
non-blocking observations. For any blocking issue give file:line, the frozen line violated, and the
failing scenario so root can bounce a fix. Do not edit product code; do not checkout/reset.
