---
name: react-compiler-does-not-bail-on-usetable
description:
    React Compiler's TanStack Table bail-out is keyed on useReactTable, so v9's useTable is compiled
    and its reads are cached on table identity; safe only with the default useTable subscription
metadata:
    type: project
---

This repo builds with `reactCompiler: true`. `babel-plugin-react-compiler`'s hardcoded
incompatible-library list (search `knownIncompatible` in its `dist/index.js`) keys the
`@tanstack/react-table` entry on the hook name **`useReactTable`**. TanStack Table v9 does not
export that name — it exports `useTable` — so **no bail-out fires for v9**.

Measured by running the plugin over two components: a `useVirtualizer` one comes out entirely
uncompiled, while a `useTable` one is compiled to
`if ($[4] !== table) { const rows = table.getRowModel().rows; … $[4] = table; }` — every table read
cached on the `table` binding's identity.

That is safe, but only conditionally. `useTable` ends with
`useMemo(() => ({...table, options, state}), [table, tableOptions, state])`, so the object it
returns takes a **new identity whenever the subscribed state changes** — which invalidates the
compiler's cache. Verified in `tests/unit/transactions/table-model/react-binding.test.tsx`.

**Why:** the condition is the subscription. With a narrowed selector
(`useTable(options, (s) => ({ cellSelection: s.cellSelection }))`), a change to an _excluded_ slice
produces no re-render and no new identity — measured — so a compiler-cached read of that slice is
frozen for the component's lifetime. Narrowing the selector for performance is precisely what
creates the stale-read hazard.

**How to apply:** keep the default (full) `useTable` subscription for any component that reads table
data, and get fine-grained performance from `table.Subscribe` / `useSelector(table.atoms.<slice>)`
inside the subtree that needs it — never by narrowing the top-level selector.

**Where the coverage actually is.** Vitest does not run the compiler, so no unit test can catch a
compiler-induced freeze; pin the identity premise instead. But `next dev` **does** compile app code,
so the Playwright suite — whose `webServer` is `pnpm run dev` — already exercises compiled output.
Verified by fetching the dev-served chunk:
`function TransactionTable(t0) { _s(); const $ = (0, __TURBOPACK__…compiler-runtime…)(107)`.
Turbopack mangles the runtime import, so grepping dev bundles for `_c(` or `react/compiler-runtime`
finds nothing useful — match on the `(t0)` parameter signature or on `)(<n>)` instead. The
production build shows the same component at 106 slots.

Re-verify the `knownIncompatible` list after any compiler upgrade — if a `useTable` entry is added,
components will silently stop being memoized. Related: [[claims-that-decay-silently]],
[[causal-claims-in-measured-voice]].
