# Description Aliases

## Status: review

## Plan

Add description aliases to MoneyFlow. Aliases are a curated list of names that replace raw imported
transaction descriptions. The UX is seamless — users edit text in the description cell and aliases
are created/renamed implicitly. A modal only appears when multiple transactions share an alias.

### Schema

- `descriptionAliasSchema` with symlink model: `id`, `name`, `targetAliasId` (symlink pointer),
  `symlinkIds` (LoroMapRecord boolean backlinks), `transactionIds` (LoroMapRecord boolean),
  `deletedAt`
- `descriptionAliasId` added to `transactionSchema` (optional)
- `descriptionAliases` added to `vaultSchema`

### Symlink model

- "Change all" makes old alias a symlink to new alias (O(1))
- No symlink chains — when B becomes symlink to C, all existing symlinks of B repoint to C
- New transactions always point to real alias, never symlink
- Each alias/symlink tracks `transactionIds` for modal skip logic and future GC worker
- Symlink resolution on read is O(1) single hash map lookup

### Cell UX

- Hybrid text input / autocomplete (not a select)
- Imported descriptions show as actual editable text
- Aliases created implicitly on Enter/blur when text doesn't match existing
- Single-transaction aliases renamed silently (no modal)
- Modal only surfaces when multiple transactions share the alias
- Dropdown mounts on hover/keyboard nav, not on every row (perf)
- Tooltip shows original imported description when alias is set

### Management page

- "Tx Descriptions" nav item, route `/tx-descriptions`
- Simple CRUD: add, inline rename, soft-delete
- Delete only allowed when no transactions reference the alias

## Tasks

- [x] Task 1: Schema changes — descriptionAliasSchema, transaction field, vault field, type exports
- [x] Task 2: Domain utilities — resolveAlias, getAliasTotalTransactionCount, makeSymlinkMutations,
      filtering
- [x] Task 3: CRDT queries, hooks, defaults — useDescriptionAliases, useActiveDescriptionAliases,
      useDescriptionAliasActions
- [x] Task 4: Tx Descriptions management page — page, table, nav item
- [x] Task 5: InlineEditableDescriptionAlias cell component — hybrid text/autocomplete
- [x] Task 6: DescriptionAliasChangeModal component — change/remove with just-this/all/cancel
- [x] Task 7: Wire up transaction table and page — data flow, handlers, add mode
- [x] Task 8: Unit tests for domain utilities
- [x] Task 9: E2E tests for description aliases
- [x] Fix: Review cycle 1 findings (6 issues, committed as 818e754)

## Review Findings

### Cycle 1 (reviewer found 5 issues + 1 flag)

1. **High - Bug:** Add mode passed alias UUID instead of name as description text. Fixed.
2. **Medium - Bug:** Redundant no-op updateAlias call. Fixed.
3. **Medium - Pattern violation:** `as any` in context.tsx and DescriptionAliasesTable. Fixed with
   `as unknown as`.
4. **Medium - Dead code:** Unused `getEntriesOfLoroMap` import. Fixed.
5. **Medium - Cosmetic:** Duplicate `{/* Description */}` comment. Fixed.
6. **Flag (promoted to fix):** `handleAliasAll` didn't resolve symlinks before
   `makeSymlinkMutations`, so "change all" on a symlinked transaction only affected that symlink,
   not the full alias group. Fixed.

### Cycle 2 (in progress)

- Typecheck: PASS
- Lint: FAIL — `eslint` binary not found (broken node_modules)
- Format: PASS
- Test: FAIL — vite version mismatch (broken node_modules)
- E2E: FAIL — mass timeouts (broken node_modules)
- Root cause: `pnpm install` needed. Environment issue, not code issue.

## Notes

- Cross-team agent naming caused severe issues — agents from other concurrent teams received our
  messages and sent garbled responses. Fixed by using unique team/agent names derived from feature
  slug.
- Implementor committed fixes (818e754) but never reported back due to cross-team contamination.
- `pnpm` not available in orchestrator shell (nix/devenv issue) — need user to run `pnpm install`.
- Original implementation commit: 02fe225
- Fix commit: 818e754
- Base commit: ed5ae2f
