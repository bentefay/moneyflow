# People and settlement components

The People page manages the vault's encrypted people records and presents the canonical settlement
result. Membership and invites live in Vault Settings, not here.

## Settlement rendering contract

`src/lib/domain/settlement.ts` is the **sole** production settlement engine. Everything in this
directory is a read-only consumer of its structured `SettlementResult`. There is no second engine,
no duplicated settlement arithmetic, and no persisted settlement cache — Loro operation history is
the allocation version record, and the result is recomputed from retained vault state on every
render input change.

| File                        | Responsibility                                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------------- |
| `settlement-view.ts`        | Pure, immutable view model. Reshapes `SettlementResult` into per-currency sections and the states. |
| `settlement-allocations.ts` | Explicit/effective allocation context for a source row, via the P16A `deriveEffectiveAllocations`. |
| `BalanceSummary.tsx`        | Renders the view model: currency sections, expandable sources, "View transaction".                 |
| `PeopleTable.tsx`           | Owns people CRUD and supplies accounts/statuses/transactions plus alias resolution.                |

### Currencies never combine

Obligations are grouped into separate per-currency sections. `SettlementView` has no field capable
of expressing a cross-currency total, so a grand total cannot be introduced by accident. Amounts are
formatted per section with that section's currency.

### The five distinct states

`buildSettlementView` returns exactly one state, and `incomplete` outranks all others so an invalid
vault can never be presented as settled:

| State                        | Condition                                          | Shown as                                           |
| ---------------------------- | -------------------------------------------------- | -------------------------------------------------- |
| `incomplete`                 | any typed calculation issue exists                 | "Settlement incomplete" + affected count + reasons |
| `no-qualifying-transactions` | no issues, no obligations, no qualifying paid txs  | neutral empty state                                |
| `settled`                    | no issues, no obligations, but qualifying paid txs | "Everyone is settled up"                           |
| `obligations`                | no issues, at least one obligation                 | per-currency sections                              |

"Everyone is settled up" therefore requires **both** zero obligations and zero issues. Transactions
with invalid allocation, ownership, account or amount data are excluded from displayed totals and
reported instead; invalid data is never clamped, normalized, deleted or rewritten.

Deleted and unknown People keep their balances under stable labels (`Name (deleted)`,
`Unknown person <id-prefix>`) rather than being dropped.

### Source traceability

Each obligation expands to the transactions that explain it, showing date, resolved
description/alias, account, the signed contribution and the relevant explicit/effective allocations.
A negative contribution is a reverse-direction amount removed by netting and keeps its sign.

"View transaction" links to `/transactions?transaction=<stableId>`. The transactions route reads
that param (`SOURCE_TRANSACTION_PARAM`) and reuses the existing reveal mechanism to raise the page
size, select and scroll to the row. It matches on the **stable transaction ID**, never a row index,
so the target survives pagination and reordering; the target is never hidden by a filter because the
transactions page holds its filters in component state, which starts empty on every arrival at the
route.

The param is a **one-shot navigation intent**, not a standing selection override. It is consumed
once — seeding the real selection state and the reveal — and then dropped from the URL with
`router.replace`. From then on the landed row is an ordinary selection the user owns: deselecting it
sticks, and bulk actions act only on the user's current selection.

## Memoization

`BalanceSummary` memoizes the settlement result, the person lookup, the transaction lookup and the
view model, and each currency section memoizes its own formatter. None of this is persistence —
nothing derived here is written back to the vault.

## Tests

- `tests/unit/components/settlement-view.test.ts` — the pure view model and allocation context.
- `tests/unit/components/balance-summary.test.tsx` — rendered states, sections, expansion, labels.
- `tests/e2e/people-settlement.spec.ts` — canonical examples A–H, the mandatory 12-step journey and
  the additional matrices, all against the production settlement path.
- `tests/e2e/helpers/settlement.ts` — reusable vault-shaping and assertion helpers.
