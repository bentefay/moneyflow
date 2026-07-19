# HS-009 — Person Allocation Bounds

- **Status:** queued
- **Source:** `specs/human-scratch.md:302`; exact frozen text is in `SCOPE.json#HS-009`
- **Packages:** P16A domain/remainder, P16C mutation boundaries, P16D real surfaced grid/add-row UX
- **Canonical companion authority:** entire
  `specs/008-transaction-percentage-allocations-settlement/spec.md` via first-class FS-001
- **Depends on:** package dependencies defined by FS-001; P17 consumes only the passed P16C API

## Frozen requirement and resolved meaning

> People percent allocations should not be able to exceed + or - 100.

Every stored explicit Person allocation must be finite and inclusively `-100..100`; negative and
decimal values are valid. Invalid typed, pasted, automated, imported, restored, hydrated or bulk
data is rejected before mutation. Never clamp, coerce or normalize an explicit value or explicit
set.

Explicit allocations may total below, at or above 100. They are user overrides, not a normalized
split. Derive `owner remainder = 100 - sum(explicit)` and distribute it proportionally through valid
account ownership; the derived effective allocation—not the stored explicit map—must total
exactly 100. Remainder may be positive, zero or negative. This canonical resolution replaces the
earlier task's tentative normalization interpretation.

## Current evidence to revalidate

- `PersonAllocationCell.tsx` historically used input min 0/max 100 and positive-total normalization,
  blocking negatives and risking invalid zero/negative behavior.
- Generic Percentage transformation may not enforce allocation versus ownership domain invariants at
  every boundary, and the existing component may be orphaned from the actual transaction grid.
- Existing automation/import/undo/hydration paths must be searched; HTML attributes cannot be the
  only validation.

## Acceptance direction

### P16A

- Domain-specific allocation validation rejects non-finite, below -100 and above 100; accepts exact
  boundaries, signed decimals and canonical zero handling. Ownership remains separate `0..100`, at
  least one owner and collectively 100 within established tolerance.
- Explicit sets remain unchanged. Owner-remainder/effective allocation and exact decimal minor-unit
  apportionment follow FS-001 without binary floating-point loss.

### P16C

- Central set/remove-one and atomic validated complete-explicit-set APIs enforce the invariant
  across every current write/restore/import/hydration path. Failed complete replacement changes no
  key; absent replacement keys are removed only after all entries validate.
- Existing invalid financial data is retained and surfaced, never silently repaired. A user may
  repair one bad value through validated surfaced editing.

### P16D

- Actual virtualized transaction-grid and add-row Person cells accept negative/decimal entry, reject
  -101/101/non-finite values without committing, keep invalid local, preserve Escape value, save
  valid Enter/blur and remove zero keys. Accessible feedback does not resize/occlude the table.
- Display distinguishes explicit value from derived effective share/remainder. No orphan component
  or unused min/max control can satisfy HS-009.

HS-009 remains unchecked until P16A, P16C and P16D independently pass. FS-001 independently remains
open until all P16A–E pass.

## Automated tests

- Production unit/property tests for -101/-100/100/101, decimals, negative zero, NaN/infinity,
  explicit totals below/at/above 100, positive/zero/negative remainder and effective total 100.
- CRDT integration for every mutation path, invalid atomic replacement, per-key concurrency,
  automation/import/undo/hydration bypass resistance and legacy preservation.
- Real-grid/add-row E2E for type/paste/Enter/blur/Escape/zero/remount/reload/undo and collaboration,
  repeated with retries disabled.

## Exhaustive manual Playwright CLI charter

- In actual transaction and add rows, type and paste -101, -100, signed decimals, negative zero, 0,
  100, 101 and invalid text across active/historical People. Inspect explicit/effective/remainder
  descriptions before/after save/cancel, reload, undo and duplicate-user sync.
- Verify pointer/keyboard, focus, responsive horizontal scrolling, 320px reflow, 200% zoom, dark/
  reduced motion, deterministic role/name/state, applicable contrast, console/network and no table
  shift or silent commit. Clean disposable sessions.

## UX, style and review requirements

Apply canonical FS-001 plus `.claude` type/CRDT/component/E2E rules. Reviewer must inspect the real
surface and every validation boundary. Any clamp, total normalization, owner-remainder mislabel,
automation bypass, partial CRDT mutation or misleading legacy-data result is blocking.

## Risks and questions

Risks include allocation/ownership type confusion, silent coercion, legacy invalid data, decimal
precision, complete-set partial mutation and unused UI. Return any ambiguity as a Q proposal, but no
proposal may override FS-001's explicit reject-only and owner-remainder semantics.
