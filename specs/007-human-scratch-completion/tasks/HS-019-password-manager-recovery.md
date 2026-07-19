# HS-019 — Password-Manager-Compatible Recovery Phrase

- **Status:** queued
- **Source:** `specs/human-scratch.md:344-346`; exact frozen text is in `SCOPE.json#HS-019`
- **Package:** P18
- **Depends on:** P01 browser/tool baseline; P19 builds on this auth UX

## Frozen requirement

> Make password managers offer to save and fill the recovery phrase during vault creation and login.

## Current evidence to revalidate

- `SeedPhraseInput.tsx` currently renders 12 inputs with `autocomplete="off"`, preventing standard
  credential heuristics. Creation display is not a conventional credential form field.
- Headless browser automation may test semantic attributes/fill distribution but cannot prove every
  third-party manager prompt, so a documented real-manager matrix is needed.

## Acceptance direction

- Research current browser and major password-manager conventions from primary/vendor sources.
  Provide a stable semantic form contract—username/account identifier where appropriate and standard
  new/current-password autocomplete—while retaining the usable 12-word interface through an
  accessible synchronized canonical field or progressive enhancement.
- Save/fill/paste distributes and validates all words without exposing the phrase in logs, URLs,
  analytics, persistence or evidence. Creation/unlock labels, names and submission work with screen
  readers, mobile keyboards and browser autofill.
- Preserve the existing recovery identity and explicit user confirmation; never reduce entropy or
  silently normalize an invalid secret.

## Implementation and review checkpoints

- Document the tested manager/browser behavior and unavoidable automation limit. Reviewer audits DOM
  semantics and secret handling, not just visual multi-input behavior.

## Automated tests

- Component/unit for canonical value/multi-input synchronization, paste/fill/validation and
  autocomplete attributes; E2E create/save-contract/unlock fill and invalid recovery behavior,
  repeated no-retry.

## Manual Playwright CLI charter

- In headless CLI, inspect semantic form snapshot, fill canonical/multi-word values, paste, edit,
  submit, back/refresh and unlock; verify mobile/responsive, keyboard, screen-reader-friendly
  labels, dark/reduced motion, console/network and no secret artifacts.
- Record separate sanitized real password-manager/browser checks when available; do not store
  phrases.

## UX, style, and E2E review

Apply crypto/component/E2E guidance. Enhanced word inputs must remain effortless while
standards-based managers see one coherent credential. Missing secret-safety evidence is blocking.

## Risks and questions

- Risks: managers ignore non-password UI, duplicate fields confuse fill, phrase leaks to evidence,
  normalization mismatch. Log manager limitations and semantic choices; continue with
  standards-first reversible behavior.
