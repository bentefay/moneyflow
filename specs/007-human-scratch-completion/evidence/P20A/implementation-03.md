# P20A rev 03 — HS-016 truthful-copy fix (M-1 false durability absolute)

## Defect (verified from source, not trusted)

`src/components/features/landing/FeaturesSection.tsx:65` (card "Edits merge cleanly") shipped:

> "Two people editing at the same time **will not overwrite each other.** Changes are merged with
> conflict-free replicated data types rather than last-write-wins."

The clause "will not overwrite each other" is an unqualified data-durability absolute the shipped
engine does not honour. `pruneBuckets` (`src/lib/crdt/mutations.ts:287-329`) executes
`delete store[accountId]` (line 327) when an account tree empties; on CRDT merge a concurrent peer's
insert into that pruned container is discarded — a real lost-write. The engine fix (`Q-P20B-00`) is
OUT-OF-GOAL per decision D-019 (upheld by scope adjudication 05). The only in-goal remedy is making
the copy truthful.

## Change (minimal, copy-only)

`FeaturesSection.tsx:65` new description:

> "Two people can edit at the same time, and their changes are merged with conflict-free replicated
> data types rather than last-write-wins."

- Retained the genuine, delivered claims: real-time concurrent editing (HS-003) and CRDT merge
  instead of last-write-wins (delivered mechanism).
- Removed the "will not overwrite each other" durability absolute. The new copy makes no
  zero-lost-data / never-overwrites promise; it describes only the merge mechanism, which is what
  ships.
- Heading "Edits merge cleanly" retained: "cleanly" refers to conflict-free merge (no merge
  conflict), which CRDTs guarantee by construction — the prune bug is a data-loss defect, not a
  merge conflict.

## Adjacent-claim audit (no other changes)

- `FeaturesSection.tsx:57` "Shared vaults … see who is editing what" — presence is delivered
  (HS-003); truthful. Left unchanged.
- `SecuritySection.tsx:48` "CRDT for conflict-free sync" — conflict-free merge is true by CRDT
  construction; the prune defect is data loss, not a merge conflict. Defensibly true. Left
  unchanged.

Diff kept minimal; every retained claim maps to a delivered, independently passed feature.

## Test guard

`tests/e2e/landing.spec.ts` — added "makes no data-durability absolute about concurrent edits", in
the style of the existing "advertises no budgeting capability" precedent. Asserts the false-absolute
phrasing is absent (`/will not overwrite each other/i` and `/never overwrite/i` each
`toHaveCount(0)`), without coupling to the retained true prose. Existing landing tests kept green.

## Checks (all green)

- `pnpm typecheck` — pass.
- `pnpm lint` — pass (0 errors; the pre-existing TanStack Virtual `incompatible-library` warning is
  unrelated and untouched).
- `pnpm format:check` — my two edited files pass (`oxfmt --check` on both = "All matched files use
  the correct format"). The bare command additionally flags pre-existing frozen `specs/**` markdown
  files, which are root-owned and out of scope; not modified.
- `pnpm test` — 2091 passed, 2 skipped (111 files).
- `pnpm test:e2e -- --retries=0` — full suite, 164 passed. Validated over **three consecutive
  full-suite runs** at `--retries=0` (never by isolation), per the repo's load-dependent-flake
  discipline. No flakes.

## Claim-to-evidence

| Retained public claim                  | Delivered feature                           |
| -------------------------------------- | ------------------------------------------- |
| Real-time concurrent editing           | HS-003 shared vaults / presence             |
| CRDT merge rather than last-write-wins | Loro CRDT sync engine (delivered mechanism) |

Removed claim (no supporting delivery): "will not overwrite each other" / zero-lost-data absolute —
contradicted by `pruneBuckets` delete-on-empty (D-019, OUT-OF-GOAL to fix).
