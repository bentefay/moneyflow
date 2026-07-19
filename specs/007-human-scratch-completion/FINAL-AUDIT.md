# P21 Final Audit

Status: queued. This is root-owned. The P21 collector proposes results only in its assigned
evidence, the reviewer independently verifies them in a revisioned review, and root fills this file
only after P21 PASS. See `tasks/P21-final-audit.md`.

## Scope reconciliation

- [ ] All 22 first-class entries—21 `HS-*` blocks and whole-file `FS-001`—map to independently
      approved package reviews and passed requirement-ledger rows.
- [ ] Alias P11A–C and automation P17A–D are all passed before their scratch checkboxes.
- [ ] Current scratch checksum/drift is recorded and later unticked additions are reconciled.
- [ ] Immutable FS-001 still matches SHA-256
      `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines and 25,441
      bytes; it was never edited to record progress.
- [ ] P16A–E all passed with immutable revisioned evidence/reviews before FS-001 completed.
- [ ] Every prior P21 failure has a complete batch listing all impacted
      packages/requirements/checked HS IDs, a contiguous per-ID rollback SHA chain, finalized
      `rollback_pending -> changes_requested` transitions, FS-001 no-source-mutation downgrade, full
      fix/re-review, requirement re-pass and new P21 revision.
- [ ] No requirement/package remains `changes_requested`, no prepared/active rollback batch,
      `rollback_pending` requirement or `completion_pending` event remains, and every
      marker/authorized-ID state matches the final requirement ledger and rolling SHA.
- [ ] No approved BASE..HEAD range changed after review.
- [ ] QUESTIONS and DECISIONS are internally consistent and summarized for final human review.

## Repository and migration audit

- [ ] Exact final HEAD, branch, upstream, commits, dirty paths, and untracked paths recorded.
- [ ] No unrelated/user-owned file was committed.
- [ ] Fresh database bootstrap and every supported upgrade path pass.
- [ ] Existing IndexedDB/vault data upgrades without plaintext leakage or loss.
- [ ] Dependency audit and P03 external gate rechecked from primary sources.

## Verification audit

- [ ] Format, lint, typecheck, and production build pass.
- [ ] All unit/property/integration tests pass with counts, durations, and seeds recorded.
- [ ] Full E2E suite passes with retries disabled.
- [ ] Changed critical journeys pass repeated flake runs with retries disabled.
- [ ] No arbitrary sleeps, shared test ordering, unexplained skips, or retry-dependent outcomes
      remain.

## Exhaustive manual product audit

Use a clean, unique headless Playwright CLI session and isolated multi-user contexts where needed.

- [ ] New identity/vault by recovery phrase and supported password-manager behavior.
- [ ] Passkey create/unlock/add/revoke/fallback behavior on supported and unsupported capability
      paths.
- [ ] Imports by picker and drop zones, CSV/OFX, provenance, amount edit tooltip, delete import.
- [ ] Transactions: multiple empty rows, grid keyboard UX, aliases, tags, allocations, undo/redo.
- [ ] Actual transaction/add-row person columns handle explicit/effective/remainder values,
      horizontal virtualization, historical/deleted people, presence, notes, keyboard and refresh.
- [ ] People shows per-currency obligations, incomplete/invalid/multicurrency/historical states,
      expandable source contributions and working source-transaction navigation.
- [ ] Alias shared/single/remove/change-all flows and management page.
- [ ] Automation create/update/drift/apply-this/apply-all/apply-new for alias/tags/allocations.
- [ ] People/member/invite two-user flow, permission limits, removal, and live sync.
- [ ] Presence/active transaction, refresh, duplicate/multiple tabs, reconnect and offline recovery.
- [ ] Desktop/mobile, pointer/keyboard, dark mode, reduced motion, focus, loading/empty/error
      states.
- [ ] Deterministic accessible role/name/state snapshots, 320px reflow, 200% zoom and applicable
      computed contrast ratios pass.
- [ ] Marketing claims match shipped behavior.
- [ ] Browser console has no unexplained errors/warnings and network has no unexpected failures or
      sensitive data in URLs/payload metadata.

## Security and performance audit

- [ ] Malicious cross-vault database/API/realtime access remains denied.
- [ ] Key material, recovery phrases, passkey secrets, and financial plaintext are absent from logs,
      URLs, server storage, and evidence.
- [ ] Large imports/tables/alias/automation/GC interactions remain responsive and bounded.
- [ ] Allocation edits meet the sub-100ms responsiveness target and settlement demonstrates
      near-linear scaling plus the approximate 100k/200ms benchmark or an explicit measured
      follow-up accepted by the frozen spec.
- [ ] Exact signed minor-unit allocation and settlement conserve units across decimals, negatives,
      over/under-allocation, stable-ID ties and multiple currencies.
- [ ] Every canonical example A, B, C, D, E, F, G and H has its own named production unit/property
      expectation and its own named E2E expectation; all sixteen gates pass, with no example
      replaced by a general journey or combined case.
- [ ] `src/lib/domain/settlement.ts` is the sole settlement engine; no persisted/plaintext cache,
      competing computation or cross-currency netting exists, and every obligation is traceable.
- [ ] Invalid legacy maps remain preserved, yield typed issues, are excluded from totals and never
      produce a misleading settled claim.
- [ ] Every current grid/add-row/automation/import/undo/hydration path uses P16C's per-key or
      validated atomic complete-set API; complete sets remove absent keys and never clamp, normalize
      or bypass owner-remainder semantics.
- [ ] Duplicate-tab and multi-client operations converge without deadlock, infinite loading, or lost
      changes.

## Final verdict

- **Final HEAD:** pending
- **Audit commands/evidence:** pending
- **Remaining blocked external items:** pending
- **Deferred questions summary:** pending
- **Verdict:** not run
