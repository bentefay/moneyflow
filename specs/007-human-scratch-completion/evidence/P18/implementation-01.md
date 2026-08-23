# P18 Implementation Evidence — Revision 01

## Immutable dispatch boundary

- Package / requirement / revision: `P18` / `HS-019` / `01`.
- Literal cumulative review BASE and clean pre-product HEAD:
  `493bf19d3219f44efd4d4437fd8b0e33d012fba9`.
- Root dispatch/control HEAD at implementation start: `6c6eb192f57b9ff9481928f4df35815fde52c38c`
  (`docs: dispatch P18 revision 01`). `git diff --stat 493bf19..6c6eb19` touches only
  `specs/007-human-scratch-completion/HANDOFF.md` and
  `specs/007-human-scratch-completion/PROGRESS.md`, so the product/test tree at dispatch was
  byte-identical to BASE.
- This sole revision-01 worker artifact was created **before** any test or product edit. The index
  and worktree contained no product/test changes at implementation start.
- Future `reviews/P18-review-01.md` did not exist and was not created by this worker.
- Frozen source boundary matched at start and again at completion:
    - `specs/human-scratch.md` `9a0f6633ba671446684221679a2ef148122c09f7f1ed06978d8a9786a7170d4d`,
      350 lines / 24,251 bytes;
    - immutable FS-001 `specs/008-transaction-percentage-allocations-settlement/spec.md`
      `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes.
- Frozen requirement (`specs/human-scratch.md:344-346`, never edited by this worker): "Make password
  managers offer to save and fill the recovery phrase during vault creation and login."
- Range is non-empty. No ledger, HANDOFF, scratch, SCOPE, review, `.claude`, `.codex`, dependency or
  configuration file was written.

## Commits

- **RED** `62a41d65cee5db1e606d6b9bd4d4327ab8053a3a` —
  `test: define recovery phrase credential form contract`. Test paths only, failing against
  byte-identical BASE production.
- **GREEN** `4cda92d40e9cc5b6490636c25d99b655905cb40a` —
  `feat: expose recovery phrase as a manager-savable credential`. Final HEAD.
- `evidence/P18/implementation-01.md` is left uncommitted, as required. Exact paths were staged
  individually; `git add .` / `git add -A` were never used.

`git diff --stat 493bf19d3219f44efd4d4437fd8b0e33d012fba9..HEAD` (the two `specs/…` entries are
root's own dispatch commit `6c6eb19`, not worker writes):

```text
 specs/007-human-scratch-completion/HANDOFF.md      | 220 +++++-----------
 specs/007-human-scratch-completion/PROGRESS.md     |  35 ++-
 src/app/(onboarding)/new-user/page.tsx             |  57 ++--
 .../identity/RecoveryPhraseCredentialFields.tsx    | 127 +++++++++
 .../features/identity/SeedPhraseDisplay.tsx        |  17 +-
 .../features/identity/SeedPhraseInput.tsx          |  88 +++++--
 src/components/features/identity/UnlockCircle.tsx  |  29 ++-
 src/components/features/identity/index.ts          |   8 +
 .../features/identity/recoveryPhraseCredential.ts  |  55 ++++
 tests/e2e/identity.spec.ts                         | 201 +++++++++++++++
 tests/e2e/onboarding-vault.spec.ts                 |  58 +++++
 .../components/recovery-phrase-credential.test.ts  | 128 +++++++++
 tests/unit/components/seed-phrase-display.test.tsx | 148 +++++++++++
 tests/unit/components/seed-phrase-input.test.tsx   | 286 +++++++++++++++++++++
 14 files changed, 1249 insertions(+), 208 deletions(-)
```

### Changed product paths (all within the authorized set)

- added `src/components/features/identity/recoveryPhraseCredential.ts` (new enumerated identity
  helper);
- added `src/components/features/identity/RecoveryPhraseCredentialFields.tsx` (new enumerated
  identity component);
- modified `src/components/features/identity/SeedPhraseInput.tsx`;
- modified `src/components/features/identity/SeedPhraseDisplay.tsx`;
- modified `src/components/features/identity/UnlockCircle.tsx`;
- modified `src/components/features/identity/index.ts`;
- modified `src/app/(onboarding)/new-user/page.tsx`.

`src/app/(onboarding)/unlock/page.tsx` and `src/app/(onboarding)/invite/[token]/page.tsx` were
authorized but deliberately **not** edited — see the invite finding below. HANDOFF explicitly says
not to edit every authorized path by default.

### Changed test paths (all within the authorized set)

- added `tests/unit/components/recovery-phrase-credential.test.ts`;
- added `tests/unit/components/seed-phrase-input.test.tsx`;
- added `tests/unit/components/seed-phrase-display.test.tsx`;
- modified `tests/e2e/identity.spec.ts`;
- modified `tests/e2e/onboarding-vault.spec.ts`.

## Unchanged-product RED checkpoint

Against byte-identical BASE production, the new specs produced **28 failures / 7 passes** at the
unit level and **4 failing E2E tests**:

- `pnpm vitest run tests/unit/components/recovery-phrase-credential.test.ts tests/unit/components/seed-phrase-input.test.tsx tests/unit/components/seed-phrase-display.test.tsx`
  → `Tests 28 failed | 7 passed (35)`. The whole `recoveryPhraseCredential` module was absent, and
  every canonical-field assertion failed with "canonical credential field is missing".
- The 7 pre-GREEN passes were exclusively **preservation** guards that must hold at BASE and after:
  twelve word inputs render; no word input is `type="password"`; word inputs carry
  `autocomplete="off"`; twelve numbered display cells; copy/reveal/warning present; phrase absent
  from URL-bearing attributes; phrase absent from `name`/`id`.
- E2E RED: `creation presents the recovery phrase as one savable credential`,
  `unlock presents the recovery phrase entry as a fillable login credential`,
  `unlock via canonical credential fill signs in and leaks no phrase`, and
  `account creation submits the recovery credential so a manager can offer to save it` — all failed
  waiting for `getByTestId('recovery-phrase-credential')`.

## Credential-form contract — semantic decisions and primary sources

The whole design follows one rule: **exactly one canonical credential per surface**, never password
semantics on the twelve word inputs.

### Why not twelve password fields (the decisive constraint)

- Chromium `components/password_manager/core/browser/form_parsing/form_data_parser.cc` states its
  parsing assumptions in-source: "Not more than 1 field with autocomplete=username. Not more than 1
  field with autocomplete=current-password. Not more than 2 fields with autocomplete=new-password. …
  **If any assumption is violated, the autocomplete attribute is ignored.**" Its structural fallback
  also comments that with more than three password fields it considers "only the first 3 passwords …
  as a best-effort solution."
- Firefox `toolkit/components/passwordmgr/LoginManagerChild.sys.mjs` hard-caps the form:
  `if (pwFields.length > 5) { "Form ignored, too many password fields"; return null; }` — twelve
  password fields means Firefox ignores the form outright.
- WebKit `Source/WebCore/editing/cocoa/AutofillElements.cpp` only ever models
  `{username, password, secondPassword}`; a third password field is structurally unrepresentable.

So the twelve inputs stay `type="text"` with `autocomplete="off"`, plus documented per-vendor
opt-outs `data-1p-ignore` (1Password, <https://www.1password.dev/web/compatible-website-design>),
`data-bwignore` (Bitwarden, confirmed in `collect-autofill-content.service.ts`:
`let inputQuery = "input:not([data-bwignore])";`) and `data-lpignore="true"` (LastPass; secondary
sources only — see Q-PROPOSAL-P18-01-2).

### Token choices

- Creation (`SeedPhraseDisplay`): `autocomplete="new-password"`. WHATWG defines `new-password` as "A
  new password (e.g. when creating an account or changing a password)"
  (<https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill>).
- Unlock (`SeedPhraseInput`): `autocomplete="current-password"`. WHATWG: "The current password for
  the account identified by the username field (e.g. when logging in)."
- Both surfaces: exactly one `autocomplete="username"` anchor carrying the fixed non-secret string
  `"MoneyFlow recovery phrase"`. Managers key a saved credential on origin plus username, so this is
  what makes the credential saved at creation the same one offered at unlock. Chromium's "Create
  Amazing Password Forms" doc directs authors to "include a hidden input field containing this
  information even if it is not directly necessary for your form", and its
  form-styles-that-chromium-understands page shows the field CSS-hidden rather than `type="hidden"`.
  1Password documents the identical pattern.
- `autocapitalize="none" autocorrect="off" spellcheck="false"` are set explicitly on the canonical
  field. The WHATWG autocapitalize/autocorrect exemptions apply to `type=password`, but the
  attributes are set anyway so the contract does not depend on that inference; the word inputs are
  `type="text"` and already carried these.

### Why `autocomplete="off"` on the word inputs is not the blocker it was

MDN: "In most modern browsers, setting `autocomplete` to `off` will not prevent a password manager
from asking the user if they would like to save username and password information."
(<https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete>). Apple is
explicit: "Safari ignores `autocomplete="off"`"
(<https://developer.apple.com/documentation/safari-developer-tools/autofill>). Correction to a
common belief: **WHATWG contains no normative statement that UAs may ignore `autocomplete=off` for
password fields** — that claim is MDN/vendor-level only, so it is cited as such.

### Hiding technique (load-bearing, and the source of a real defect — see below)

The canonical field is **rendered, focusable and full-size, positioned off-screen**
(`absolute top-0 -left-[9999px] h-9 w-56`), not `type="hidden"`, `display:none`,
`visibility:hidden`, `opacity:0`, or a 1x1 `sr-only` clip:

- Chromium `form_autofill_util.cc` `IsWebElementVisible` requires `element.IsFocusable()` **and** at
  least 10px per side (`kMinPixelSize = 10`), and its own comment notes it "does not check the
  position in the viewport". A 1x1 `sr-only` field therefore _fails_ Chromium; an off-screen
  full-size one passes.
- WebKit `Element.cpp` `isFocusableStyle` checks `display` and `visibility` only — no size, opacity
  or position check.
- Firefox `FormAutofillUtils.sys.mjs` uses
  `checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })`, so `opacity:0` fails there.

Off-screen-at-full-size is the only technique satisfying all three simultaneously.

**On focus the field slides into view (`focus:left-0 focus:z-10 focus:w-full`) but stays
`absolute`.** The first implementation used `focus:static`, which returned the field to the layout
flow and shifted the surrounding controls — see the defect record below.

### Form structure

Both surfaces are real `<form method="post">` elements containing the credential, the username
anchor and a genuine `<button type="submit">`:

- Chromium's authoritative `components/autofill/README.md` lists the submission signals that arm a
  save prompt: `FORM_SUBMISSION`, `PROBABLY_FORM_SUBMITTED`, `SAME_DOCUMENT_NAVIGATION` and
  `XHR_SUCCEEDED` — the last firing when, after user interaction, "the last interacted form
  is/becomes unfocusable or removed" and an async request succeeds. The creation flow matches this
  exactly: the user submits, `registerIdentity` succeeds, and the credential form unmounts. An E2E
  step asserts that unmount.
- Bitwarden detects submission by "attaching an event to each form `submit()` button on the DOM"
  (<https://contributing.bitwarden.com/architecture/deep-dives/autofill/form-submission-detection>),
  so a real submit button is required, not an `onClick` handler.
- `method="post"` is set because 1Password "will automate a button click with `element.click()`" and
  warns that otherwise "the form may be submitted with `get` … could unintentionally leak
  credentials in the URL". This is a direct secret-safety control, not cosmetic.
- Apple recommends `<form>` grouping even for JS-submitted forms
  (<https://developer.apple.com/documentation/safari-developer-tools/autofill>).

`navigator.credentials` / `PasswordCredential.store()` was **not** used: MDN BCD confirms it is
Chromium-only (`firefox: false`, `safari: false`), so it cannot carry this requirement.

## Synchronization between the canonical field and the 12-word UI

Two pure helpers in `recoveryPhraseCredential.ts` are the only bridge: `splitPhraseIntoWordSlots`
(always exactly 12 slots, lowercase + whitespace collapse, no validation or correction) and
`joinWordSlotsIntoPhrase` (drops empty slots, so a partial grid yields a clean prefix). Both are
unit-tested independently of React.

- **Unlock (fill).** `SeedPhraseInput` holds the word array. A manager fill of the canonical field
  runs `handleCanonicalChange` → split → `setWords` → `emitChange`, populating all twelve inputs and
  running the existing validation. Typing or pasting in any word input recomputes `canonicalPhrase`
  via `joinWordSlotsIntoPhrase`, so the canonical field always mirrors the grid and a manager
  observes one coherent credential.
- **Creation (save).** `SeedPhraseDisplay` renders the credential from the `mnemonic` prop. The
  field is intentionally **not** `readOnly` — Chromium's parser drops readonly fields from password
  candidacy unless typed into ("Readonly fields can be an indication that filling is useless") — but
  its `onValueChange` is a no-op, so the generated phrase remains the sole source of truth. A unit
  test writes to the field and asserts the value cannot diverge.
- **Pre-hydration autofill.** A mount effect adopts any value already sitting in the canonical field
  (see defect 1).

Entropy, derivation and wordlist under `src/lib/crypto/**` were consumed unchanged. No normalization
beyond the lowercase/whitespace handling the per-word inputs already applied. An invalid word is
displayed verbatim and reported invalid; nothing is silently repaired.

## Defects found and fixed during implementation

Both were found by manual headless browser observation, and both are genuine product bugs that the
automated tests then pinned.

1. **Pre-hydration autofill was stranded.** Browsers and managers fill as soon as the markup exists,
   which can beat React hydration; React's change handler never fires for that write. Observed
   directly: after a `waitUntil: "commit"` navigation and a fill, the credential held the full
   phrase while `seed-word-input-0` was `""` and Unlock stayed disabled. Fixed with a mount effect
   that reads the field through a ref and adopts the value. Covered by the E2E step "a fill landing
   before hydration still reaches the word grid".
2. **Focusing the credential shifted the layout and broke the Unlock button.** The original
   `focus:static` reveal returned the field to the flow. Measured: focusing the credential moved the
   Unlock button from `y=518` to `y=544`, so a real pointer click landed on the `<form>` instead of
   the button — capture-phase logging showed `pointerdown BUTTON` followed by `click on FORM` and no
   `submit`. This was a real user-facing regression (any pointer click right after a manager fill),
   not a test artifact. Fixed by keeping the field absolutely positioned in every state. Verified:
   button `y=518` before and after fill, and unlock navigates to `/transactions`.

## Pre-existing defect corrected: completeness ignored the BIP39 checksum

At BASE, `emitChange` called `onComplete` when all twelve words were merely **in the wordlist**:

```ts
const allValid = newWords.every((w) => w && isValidBip39Word(w));
if (allValid && newWords.filter(Boolean).length === 12) {
    onComplete?.(phrase);
}
```

`abandon` x12 is twelve valid words with an invalid checksum, so the UI displayed "Valid recovery
phrase" and enabled Unlock for a phrase that `unlockWithSeed` would reject. This is squarely in
HS-019 scope: a manager can fill a whole phrase in one action, so a corrupted or mismatched fill
would have been presented to the user as valid. Both `onComplete` and the `isComplete` indicator now
use the read-only `validateSeedPhrase` (wordlist **and** checksum) from `src/lib/crypto/seed.ts`.
This tightens acceptance only — it never accepts anything previously rejected, and it reduces no
entropy. Pinned by "reports a checksum-failing phrase of twelve real words as invalid".

## Invite page finding (authorized path deliberately not edited)

`src/app/(onboarding)/invite/[token]/page.tsx` contains **no seed-phrase or identity-creation UI**.
It has no `SeedPhrase*` import, no `generateNew`/`createIdentity` call and no mnemonic state; when
`authStatus === "locked"` it redirects to `/unlock?returnTo=…`, and its `need-auth` branch links to
`/unlock`. The "join/creation branch" named in HANDOFF is therefore served entirely by the `/unlock`
and `/new-user` surfaces, both of which now carry the credential contract. Editing this file would
have meant inventing an onboarding flow that does not exist. Recorded as Q-PROPOSAL-P18-01-1.

## Secret-safety analysis

**Conclusion: no leak path introduced, and none found in existing code.**

- **Tests.** Every phrase literal in all five test files is the public BIP39 English test vector
  ("abandon" x11 + "about") or an intentionally invalid variant of it. No generated production
  phrase is committed anywhere. The E2E tests that must use a real generated phrase hold it only in
  a local variable for assertions and never write it to a file or artifact.
- **This evidence file contains no recovery phrase**, real or generated.
- **URLs / query strings.** The credential lives in a `method="post"` form, so a manager-automated
  submit cannot serialize it into a query string. Asserted in E2E: page URL contains neither the
  phrase nor any `search`/`hash`.
- **Network.** Both E2E journeys record every request URL plus `postData()` and assert the phrase
  appears in none. Manually re-verified: `net: 0` matches across the whole creation flow. The phrase
  never crosses the network by design — only derived public material does.
- **Console / logs.** Console messages are captured and asserted phrase-free; manual charter
  observed `consoleErrors: []` and `console: 0` phrase matches. No `console.log` of the phrase was
  added.
- **Persistence.** E2E dumps all of `localStorage` and `sessionStorage` after unlock and asserts the
  phrase is absent; manually re-verified `storage: false`. The canonical field is not persisted.
- **DOM attributes.** Unit tests assert the phrase never appears in `href`, `src`, `action`,
  `formaction`, `data-testid`, or any input `name`/`id`. The username anchor carries only the fixed
  non-secret string, asserted not to contain wordlist material.
- **Analytics.** None exists in this codebase; none was added.
- **CLI artifacts.** The `.playwright-cli` session directory and `test-results/` were deleted after
  the charter, so no snapshot retaining a generated phrase survives. `.playwright-cli/` and
  `test-results/` are also gitignored.

The one deliberate exposure is the DOM value of a `type="password"` field, which is the mechanism
the requirement asks for and is masked visually.

## Check results

All commands run from a clean tree at GREEN HEAD `4cda92d`.

| Check | Command | Result | | --------- | ------------------- |
-----------------------------------------------------------------------------------------------------------------------------------

| ----------------- | | Typecheck | `pnpm typecheck` | **PASS** — no output, exit 0 | | Lint |
`pnpm lint` | **PASS** — `10 problems (0 errors, 10 warnings)`; all 10 pre-existing `no-unused-vars`
warnings in files this package did not touch | | Format | `pnpm format:check` | **FAIL
(pre-existing, not this package)** — see below | | Unit | `pnpm test` | **PASS** —
`68 files, 1550 passed                                                                                                   | 2 skipped (1552)`
| | E2E | `pnpm test:e2e` | **PASS** — `107 passed (2.2m)` |

**Format detail.** `pnpm format:check` reports 15 files, every one a root-owned markdown ledger or
spec (`QUESTIONS.md`, `RISKS.md`, `human-scratch.md`, prior `evidence/`/`reviews/` artifacts, …) —
paths this worker is forbidden to write. Verified pre-existing by stashing all P18 work
(`git stash --include-untracked`) and re-running: the identical 15 files still fail. All
P18-authored files are clean:
`pnpm exec oxfmt --check src/components/features/identity/ src/app/(onboarding)/ tests/unit/components/ tests/e2e/identity.spec.ts tests/e2e/onboarding-vault.spec.ts`
→ "All matched files use the correct format." This is reported as a blocker for root, not worked
around.

**Retries-disabled non-flake repeat.**
`pnpm exec playwright test tests/e2e/identity.spec.ts tests/e2e/onboarding-vault.spec.ts --retries=0 --repeat-each=3 --reporter=list`
→ **51 passed (46.8s)**, zero flakes. An earlier single-run of the same two specs with `--retries=0`
also passed 17/17.

## Manual Playwright CLI charter

Repository-installed headless `pnpm exec playwright-cli` only, in disposable sessions
(`p18impl`/`p18b`…`p18chart`). No `--headed`, `--debug`, `--ui` or `show`. Sessions closed and
artifacts deleted afterwards.

- **Semantic form snapshot (unlock).** Accessible tree observed exactly as expected:
  `heading "Welcome Back" [level=1]`; `textbox "Recovery phrase"` (the canonical field); twelve
  `textbox "Word 1"…"Word 12"`; `button "Unlock Vault" [disabled]` while empty. Expected
  role/name/state matched observed for every changed control.
- **Attribute verification.** Credential: `type=password`, `autocomplete=current-password`,
  `aria-label="Recovery phrase"`, `tabIndex=0`. Account anchor: `type=text`,
  `autocomplete=username`, `value="MoneyFlow recovery phrase"`, `aria-hidden=true`, `tabIndex=-1`.
- **Creation form contract.**
  `{ method: "post", action: "/new-user", passwordFields: 1, usernameFields: 1, submit: true, autocomplete: "new-password" }`,
  phrase 12 words.
- **Canonical fill.** Filling the credential distributed all twelve words; "Valid recovery phrase"
  shown; Unlock enabled; submitting navigated to `/transactions`.
- **Paste.** Pasting the public vector into word 1 distributed to word 12 (`about`) and mirrored
  into the canonical field.
- **Edit.** Changing word 12 to `zoo` updated the canonical field (`endsWith("zoo")`) and correctly
  **disabled** Unlock (checksum failure) — no silent normalization.
- **Back/refresh.** After reload, both the canonical field and word grid were empty; no phrase
  residue.
- **Keyboard.** Shift+Tab from word 1 reaches the credential ("Word 1" → "Recovery phrase"). When
  focused it is fully in-viewport (`x=480, y=286, 320x36`, `inViewport: true`), so focus never
  vanishes off-screen.
- **Mobile / responsive.** At 320x720: no horizontal overflow, fill distributes, Unlock enabled. A
  10px vertical shift of the Unlock button on fill was measured — then isolated to the
  **pre-existing** validation indicator by reproducing the identical 10px shift using the word
  inputs only, with the canonical field untouched.
- **Dark + reduced motion.** `emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" })`: both
  media queries matched, fill still distributed, Unlock enabled, credential styled correctly.
- **Console / network.** Across unlock, fill and navigation to `/new-user`: `consoleErrors: []` and
  no failed requests (excluding `_next/static`).
- **No secret artifacts.** `{ url: false, net: 0, console: 0, storage: false }` for the generated
  phrase.

**Unavoidable automation limit.** Headless Chromium cannot prove that any specific third-party
password manager renders a save or fill prompt: managers are browser extensions that do not load in
this environment, and Chromium's own prompt is browser UI outside the page and outside Playwright's
reach. What is proven here is the _contract managers consume_ — DOM semantics, token values, field
count, visibility geometry against each engine's documented thresholds, form/submit structure, and
synchronization. No real third-party manager (1Password, Bitwarden, LastPass, Dashlane) or
non-Chromium engine (Safari/WebKit, Firefox) was exercised; a real-manager matrix remains
outstanding and is recorded as Q-PROPOSAL-P18-01-2. No sanitized real-manager observation is
claimed, and no phrase was stored in any case.

## Accessibility evidence

- Every word input gained `aria-label="Word N"` (previously only a numeric placeholder, so the
  inputs had **no** accessible name) plus `aria-invalid` reflecting per-word validation.
- The canonical credential has `aria-label="Recovery phrase"`, is in the tab order, and scrolls into
  view on focus rather than leaving focus off-screen.
- The username anchor is `aria-hidden="true"` with `tabIndex={-1}`: it is a machine-facing anchor
  carrying no secret and no user task, so it is kept out of both the tab order and the accessibility
  tree.
- Snapshot role/name/state expectations matched observations in every case above. Existing headings,
  the confirmation checkbox and its label, error alerts, and the copy/reveal controls are unchanged
  and were re-verified present.

## Performance notes

No measurable impact. Two additional inputs per surface; the only added computation is
`validateSeedPhrase` over a 12-word string, memoized on the joined phrase. No new dependency,
network call or storage write.

## Q-proposals

### Q-PROPOSAL-P18-01-1 — Invite page has no creation branch to instrument

- Raised by/package/revision: `human_scratch_implementer` / `P18` / `01`.
- Context and evidence: HANDOFF requires the credential contract on "the join/creation branch of
  `invite/[token]`", and lists that file as an allowed product path. Inspection shows the file has
  no seed-phrase UI, no `SeedPhrase*` import, no `generateNew`/`createIdentity` call and no mnemonic
  state. A locked visitor is redirected to `/unlock?returnTo=…`; the `need-auth` branch links to
  `/unlock`. There is no in-page identity creation to wrap in a credential form.
- Why existing authority does not decide it: the frozen requirement covers "vault creation and
  login"; HANDOFF assumes an invite-local creation branch that does not exist in the current code.
- Options considered: (a) leave the file untouched and rely on the shared `/unlock` and `/new-user`
  surfaces, which now carry the contract; (b) add a new inline identity-creation flow to the invite
  page; (c) report a blocker and stop.
- Reversible default selected to continue: (a). Both destinations the invite page delegates to are
  covered, so an invited user still gets save-on-create and fill-on-unlock.
- Decision-hierarchy basis: established product behavior and repository convention (2), then
  smallest reversible implementation (4). Option (b) would invent unrequested onboarding UX inside a
  redemption flow.
- Impact and risk: low. No invite behavior changes. If a future package adds invite-local identity
  creation, it must render `RecoveryPhraseCredentialFields` the same way `SeedPhraseDisplay` does.
- Reversal or migration path: import the shared component into the invite page; no data migration.
- Human review still useful after completion: yes — confirm whether an invite-local creation branch
  was intended to exist at all.

### Q-PROPOSAL-P18-01-2 — Real password-manager matrix cannot be produced in this environment

- Raised by/package/revision: `human_scratch_implementer` / `P18` / `01`.
- Context and evidence: the task asks for sanitized real-manager/browser observations "where
  available". Headless Chromium loads no manager extensions, and the native save prompt is browser
  UI outside the page. Vendor opt-out attributes are also unevenly documented: `data-1p-ignore` is
  documented by 1Password and `data-bwignore` is confirmed in Bitwarden source, but
  `data-lpignore="true"` (LastPass) rests on secondary sources only.
- Why existing authority does not decide it: no repository authority can substitute for observing
  third-party software that is not installed.
- Options considered: (a) assert the standards-based contract with automated evidence and document
  the limit; (b) claim manager behavior that was not observed; (c) block P18 pending a manual matrix
  on real browsers with real managers.
- Reversible default selected to continue: (a). The contract is implemented to each engine's
  documented, source-verified thresholds and every observable property is asserted.
- Decision-hierarchy basis: authoritative external specs/vendor docs (1), then smallest reversible
  implementation (4). Option (b) would be false evidence.
- Impact and risk: medium-low. If a specific manager still misbehaves, the fix is attribute-level
  (add or drop an opt-out, adjust the anchor) and needs no structural change. `data-lpignore` is
  inert if LastPass does not honour it.
- Reversal or migration path: attributes are declarative and individually removable.
- Human review still useful after completion: yes — a human-run matrix across Chrome/Safari/Firefox
  with 1Password, Bitwarden and the built-in managers, recording prompt behavior only and storing no
  phrase.

### Q-PROPOSAL-P18-01-3 — Completeness now requires the BIP39 checksum

- Raised by/package/revision: `human_scratch_implementer` / `P18` / `01`.
- Context and evidence: at BASE, `SeedPhraseInput` reported a phrase complete when all twelve words
  were in the wordlist, ignoring the checksum, so `abandon` x12 showed "Valid recovery phrase" and
  enabled Unlock while `unlockWithSeed` would reject it. Manager fills make whole-phrase entry the
  normal case, so a corrupted fill would have been shown as valid.
- Why existing authority does not decide it: HS-019 requires that an invalid secret is never
  silently normalized or accepted but does not itself name the checksum; the BASE behavior predates
  this package.
- Options considered: (a) use the read-only `validateSeedPhrase` (wordlist + checksum) for both
  `onComplete` and the indicator; (b) leave the weaker check and let unlock fail later with a
  server-ish error; (c) route the fix to another package.
- Reversible default selected to continue: (a).
- Decision-hierarchy basis: security, privacy and preservation of user data (3) — a false "valid" on
  a recovery credential is a correctness and trust defect — and it is directly in the fill path this
  package owns.
- Impact and risk: low, and strictly tightening. Nothing previously rejected is now accepted; no
  entropy change; derivation untouched. Users who typed a checksum-invalid phrase now see "Invalid
  phrase" immediately instead of a failed unlock.
- Reversal or migration path: revert two expressions in `SeedPhraseInput.tsx`.
- Human review still useful after completion: yes — confirm the earlier lenient indicator was not
  intentional.
