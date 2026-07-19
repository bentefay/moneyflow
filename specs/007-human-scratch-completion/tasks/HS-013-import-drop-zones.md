# HS-013 — Transaction and Import-List Drop Zones

- **Status:** queued
- **Source:** `specs/human-scratch.md:317`; exact frozen text is in `SCOPE.json#HS-013`
- **Package:** P15
- **Depends on:** P14 stable import lineage/flow

## Frozen requirement

> The transactions table and imports list page should be a drop zone to trigger an import.

## Current evidence to revalidate

- Imports page already has page drag handlers and overlay; transaction page does not.
- `FileDropzone` and page handlers duplicate extension/size/read validation.
- Current handoff appears to use sessionStorage file content; large-file and error behavior need
  audit.

## Acceptance direction

- Refactor one validated file handoff for picker and drag paths. Whole visible imports-list and
  transaction-table surfaces accept supported CSV/OFX files and enter the same import workflow.
- Nested dragenter/leaves do not flicker; overlay clearly identifies target and preserves table
  scroll/interaction. Unsupported, unreadable, oversized, empty or multiple files get accessible
  actionable feedback without navigation/data loss.
- Drop does not import automatically past existing preview/mapping confirmation and remains secure
  against spoofed extensions/content.

## Implementation and review checkpoints

- Share validation/transfer without copying large content unnecessarily. Reviewer tests real
  DataTransfer events and confirms picker/keyboard import still works.

## Automated tests

- Unit validation/drag-depth tests; E2E drop representative CSV and OFX on both surfaces, invalid/
  multiple/oversize cases, cancel/back and successful preview/import. Repeat without retries.

## Manual Playwright CLI charter

- Drag supported and invalid files across child cells/scroll regions, enter/leave repeatedly, drop
  at edges and while filtered; test transaction and imports pages plus existing picker.
- Judge overlay stability, error copy, focus restoration, responsive/dark/reduced motion and
  keyboard alternative. Inspect console/network/session storage, refresh/back and clean
  artifacts/session.

## UX, style, and E2E review

Apply import/component/E2E rules. Reject flicker, navigation before validation, inaccessible
drag-only functionality, duplicated validators, arbitrary waits or giant fixtures.

## Risks and questions

- Risks: browser drag simulation limits, memory use, nested-event flicker, file-content spoofing.
  Log size/multiple-file policy ambiguities and choose existing secure behavior.
