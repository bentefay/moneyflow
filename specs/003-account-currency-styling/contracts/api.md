# API Contracts: Optional Account Currency & Accounts Page Improvements

**Feature**: 003-account-currency-styling  
**Date**: 2024-12-31

## Summary

**No new API contracts required for this feature.**

All changes are client-side only:
- CRDT schema modifications (loro-mirror)
- React component updates
- Domain logic helpers

The existing tRPC API for vault operations remains unchanged—encrypted CRDT ops continue to flow through the same `vault.pushOps` and `vault.pullOps` endpoints.

## Existing Contracts (Unchanged)

| Endpoint | Purpose | Change |
|----------|---------|--------|
| `vault.pushOps` | Push encrypted CRDT operations | None |
| `vault.pullOps` | Pull encrypted CRDT operations | None |
| `vault.saveSnapshot` | Save encrypted vault snapshot | None |
| `vault.getSnapshot` | Get encrypted vault snapshot | None |

## Why No New Contracts?

1. **Data model changes are CRDT-internal**: The `currency` field becoming optional and the new default person are schema changes within the encrypted Loro document. The server never decrypts this data.

2. **All business logic is client-side**: Currency resolution, display formatting, and inline editing are all handled in React components and domain helpers.

3. **Backward compatible**: Existing vaults with explicit currencies continue to work. New vaults get the default "Me" person through `getDefaultVaultState()`.
