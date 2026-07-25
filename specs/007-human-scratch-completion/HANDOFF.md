# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P18 / 01
- **Scope IDs:** HS-019 only. P18 authorizes the HS-019 marker after independent PASS; no other
  requirement is in scope. FS-001 and every P05-gated package stay untouched.
- **State:** implementing; implementer dispatched from clean HEAD `493bf19`
- **Binding task:** `tasks/HS-019-password-manager-recovery.md`
- **Frozen source:** `specs/human-scratch.md:344-346`; exact text in `SCOPE.json#HS-019`:
  "Make password managers offer to save and fill the recovery phrase during vault creation and
  login." Never edit the scratch source; root alone applies its marker after PASS.
- **Dependencies:** P01 browser/tool baseline passed. P19 later builds on this auth UX.
- **Literal cumulative review BASE / clean pre-product HEAD:**
  `493bf19d3219f44efd4d4437fd8b0e33d012fba9`
- **Sole implementer artifact:** `evidence/P18/implementation-01.md`
- **Future immutable review artifact:** `reviews/P18-review-01.md`
- **Allowed product paths:** exactly
  `src/components/features/identity/SeedPhraseInput.tsx`,
  `src/components/features/identity/SeedPhraseDisplay.tsx`,
  `src/components/features/identity/UnlockCircle.tsx`,
  `src/components/features/identity/index.ts`,
  `src/app/(onboarding)/new-user/page.tsx`,
  `src/app/(onboarding)/unlock/page.tsx` and
  `src/app/(onboarding)/invite/[token]/page.tsx`.
  New enumerated identity component/helper paths under `src/components/features/identity/` may be
  created. Do not edit every authorized path by default. Report a reproducible blocker before root
  considers any other path.
- **Allowed test paths:** exactly
  `tests/e2e/identity.spec.ts`,
  `tests/e2e/onboarding-vault.spec.ts` and new enumerated unit specs under `tests/unit/components/`
  (for example `tests/unit/components/seed-phrase-input.test.tsx` and
  `tests/unit/components/seed-phrase-display.test.tsx`). New enumerated paths may be created.
- **Read-only owners:** `src/lib/crypto/**` seed/identity derivation and entropy; `useIdentity` and
  other hooks; server/tRPC auth; all schema, configuration and every other test. Consume these APIs
  unchanged.
- **Forbidden writes:** every other product/test path; crypto entropy/derivation/wordlist; the
  recovery-identity generation and confirmation semantics that reduce entropy or normalize an
  invalid secret; dependencies/configuration; tasks/specs; scratch; canonical FS-001; SCOPE;
  ledgers; `.claude`; `.codex`; agent configuration and future review.
- **Commit contract:** create the sole evidence before test/product edits. Check in exhaustive
  counterfactual RED tests against byte-identical production as one exact-path RED commit, then
  stage/commit only exact authorized product/test paths for GREEN with short no-parentheses
  messages. Leave `evidence/P18/implementation-01.md` uncommitted. Never use `git add .` or
  `git add -A`.

## Required credential-form contract

- Vault creation (`new-user`, and the join/creation branch of `invite/[token]`) must present the
  generated phrase through `SeedPhraseDisplay` inside a semantic credential form so a standards-based
  password manager offers to save it: a stable non-secret account/username identifier where
  appropriate plus a field carrying the phrase with `autocomplete="new-password"`. The visible
  12-word usable presentation must remain, synchronized to one canonical hidden/managed credential
  field via an accessible progressive-enhancement pattern.
- Unlock (`unlock` → `UnlockCircle` → `SeedPhraseInput`) must present the entry as a login credential
  form with matching account identifier and `autocomplete="current-password"` on the canonical field
  so managers offer to fill, distributing/validating all words into the existing multi-input UI.
- The current `autocomplete="off"` on the 12 word inputs that blocks credential heuristics must be
  resolved by the canonical-field pattern, not by attaching password autocomplete to twelve separate
  inputs (which corrupts fill). Research current browser/manager conventions from primary vendor
  sources and record the exact semantic choices.

## Secret-safety (blocking, ties to root halt condition)

- The real recovery phrase must never appear in logs, URLs, query strings, analytics, persistence,
  test fixtures or ANY evidence/review artifact. Use only public BIP39 test vectors in tests, never a
  generated production phrase. Any leak of real recovery material is a blocking finding and must be
  reported to root immediately, not worked around.
- Preserve existing recovery identity, explicit user save-confirmation, entropy and validation. Never
  silently normalize or accept an invalid secret.

## Tests and manual charter

- Unit: canonical value / multi-input synchronization, paste/fill/validation, and autocomplete
  attributes on both creation and unlock. E2E: create + save-contract, unlock fill, and invalid
  recovery behavior, repeated with retries disabled.
- Manual headless `playwright-cli`: inspect the semantic form snapshot, fill canonical and multi-word
  values, paste, edit, submit, back/refresh and unlock; verify mobile/responsive, keyboard,
  screen-reader labels, dark/reduced-motion, console/network and no secret artifacts. Record
  sanitized real password-manager/browser observations where available; store no phrases. Document
  the unavoidable automation limit (headless cannot prove every third-party manager prompt).

## Q-proposals

- Place any `Q-*` proposal in `evidence/P18/implementation-01.md` and continue with the safest
  reversible standards-first choice. Root alone transcribes `QUESTIONS.md`.
