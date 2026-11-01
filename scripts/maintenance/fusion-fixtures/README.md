# Recovered MF-006 fixture maintenance tools

These are the guarded selector, runner and tests produced by Fusion's MF-006 task. Recovery applies
repository formatting and removes one unused test import; it does not run a new purge.

Run the safety suite against uniquely named, test-owned databases inside the local Supabase
container:

```sh
node --test scripts/maintenance/fusion-fixtures/purge-fixtures.test.mjs
```

The test suite creates and drops only its own isolated databases. It exercises the real runner,
including rollback, drift, confirmation, concurrency, deletion ordering and maintenance failures. It
does not seed or delete the shared application's tables.

`purge-fixtures.mjs` defaults to dry-run behavior. Its `--apply` and `--vacuum` modes are
operational mutations, not test/setup steps. A future operation requires its own reviewed selection
and exact confirmation digest, including a runner hash matching this recovered file. The historical
manifest, confirmation and backup are deliberately absent here. Do not reconstruct them from
aggregate counts or regard a future marker convention as evidence about old rows.

See `specs/fusion-mission-recovery/README.md` for original provenance and aggregate results.
