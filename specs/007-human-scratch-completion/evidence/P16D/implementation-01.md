# P16D Implementation Evidence — Revision 01

## Immutable dispatch boundary

- Package / requirements / revision: `P16D` / `FS-001`, `HS-009` / `01`.
- Literal cumulative review BASE / clean pre-product HEAD:
  `3a5081ac37e09817e0d02ae8799469d1bf09dad5`.
- Root dispatch/control HEAD: `fd8d23b8fd175c9b65bcdc7856a32f812024a566`.
- This sole implementer artifact was created before any P16D test or product edit. The index and
  worktree were empty at dispatch. Future `reviews/P16D-review-01.md` did not exist and was not
  created.
- The dispatch range changed only root-owned `HANDOFF.md` and `PROGRESS.md`; every allowed product
  path was byte-identical to the clean pre-product HEAD.
- Frozen boundary matched:
    - `specs/human-scratch.md` `ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f`,
      350 lines / 24,250 bytes;
    - canonical FS-001 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines
      / 25,441 bytes; and
    - `SCOPE.json` `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines /
      27,382 bytes.

## Counterfactual RED checkpoint

- Added exact-path counterfactual coverage before product changes:
    - `allocation-grid.test.tsx` mounts the real person cell and row and fixes the active/history
      ordering, shared-template, explicit/effective/remainder, invalid-legacy, edit, validation,
      zero-removal and Escape oracles.
    - `virtualization.test.tsx` proves every virtual/new row receives the same allocation column
      model and grid template.
    - `keyboard-navigation.test.ts` admits the stable `allocation:<personId>` identity as a
      focusable grid column.
    - `transactions.spec.ts` exercises the real People and Transactions journeys with 12 People,
      horizontal overflow, a blank added row, negative decimal editing, latency, undo/redo and
      reload persistence.
- Three focused processes against unchanged production:
    - `pnpm exec vitest run tests/unit/transactions/allocation-grid.test.tsx` — RED, import
      resolution failed because the intentionally new allocation column model did not exist.
    - `pnpm exec vitest run tests/unit/transactions/virtualization.test.tsx` — RED, 1 failed / 3
      passed because virtual rows received zero allocation columns.
    - `pnpm exec vitest run tests/unit/transactions/keyboard-navigation.test.ts` — 32 passed at
      runtime; the dynamic template-literal type remains a compile-time gate.

## Grid model, allocation interaction and preservation implementation

- RED commit: `b5d5252` (`test(P16D): define allocation grid behavior`).
- GREEN commit / exact implementation HEAD: `b5ebc2a`
  (`feat(P16D): add allocation grid columns`).
- `allocation-columns.ts` owns one immutable model and template. Active People use the People
  product's name order with stable ID tie-breaking. The currently displayed prefix contributes
  nonzero historical IDs, sorted by ID after active People. Deleted People retain
  `<name> (deleted)`; absent records use `Unknown person <full-id>`. Own enumerable data
  descriptors are copied without invoking getters; exact `$cid` and numeric zero-only history are
  excluded.
- The page memoizes that model, supplies raw transaction allocations and account ownerships, and
  routes a one-Person commit only through P16C `setTransactionAllocation`. It contains no direct
  allocation mutation. Header, virtual rows, dynamic keyboard cells, amount ordering, expanded
  notes and the ordinary persisted Add row consume the same model/template. Existing vertical
  range extraction still pins at most the focused transaction.
- The orphan aggregate popover is retired. Each grid cell is one Person, with exact
  `allocation:<personId>` data/cell identity. Explicit absent/zero is a muted dash, valid nonzero
  uses exact signed numeric text, and malformed legacy data is `Invalid`. Its associated
  description separately reports explicit storage, P16A exact effective allocation and owner
  remainder, or honestly reports invalid derivation.
- Pointer or native button keyboard activation opens a local decimal text input. Enter/blur accepts
  finite inclusive `[-100,100]`; zero reaches P16C and removes only that key. Escape writes nothing.
  Empty, out-of-range, NaN/Infinity, exponent overflow, malformed strings, hexadecimal and all
  negative-zero spellings are rejected locally. The editor stays mounted, focused after invalid
  Enter and repairable after invalid blur; `aria-invalid`, `aria-describedby` and an in-cell
  fixed-geometry alert avoid virtual-row resize/occlusion.
- Derivation is memoized once per real row and shared across its Person cells. This changed the
  realistic installed-browser p95 from the initial 100–106ms profile to 93ms without changing
  P16A semantics.

## Automated, browser, manual, performance and cleanup evidence

### Automated final-HEAD checks

- Three clean focused processes passed:
    - allocation grid: 5/5;
    - virtualization: 4/4; and
    - keyboard navigation: 32/32.
- Cumulative transaction unit profile: 6 files / 116 tests passed. The final combined focused
  profile passed 3 files / 41 tests.
- P16A/P16C/P13/P09/P14 preservation matrix passed 12 files / 310 tests plus one benchmark skip.
  It includes allocation/ownership, initialized-Loro allocation CRDT, transaction operations,
  maintenance/import, automation, undo, sync/offline and description-alias actions. Its inherited
  React `act` advisories remained non-failing.
- Final `pnpm test`: 65 files / 1,499 tests passed plus two inherited skips (1,501 collected).
  The first full run had one unrelated import-duplicate timing ratio of 4.0966 against a threshold
  of 4; its isolated rerun passed 43/43 and two later full runs passed cleanly.
- `pnpm typecheck` passed. `pnpm lint` passed with zero errors and the same ten inherited warnings,
  including TanStack Virtual's compiler advisory. `pnpm build` passed all 17 routes; its generated
  `next-env.d.ts` path change was restored byte-for-byte.
- Exact changed-path oxfmt/ESLint and `git diff --check` passed. Repository `format:check` retains
  only the 14 inherited root/scratch/P12/P14 paths after this evidence was formatted.
- Exact final HEAD affected Chromium passed 40/40 in 2.8m. Exact final HEAD full Chromium passed
  103/103 in 6.9m. Both used the root-owned external config/server, Chromium, one worker, zero
  retries and line reporting. An earlier non-counted preflight raced root cleanup and failed only
  with connection-refused/config-missing before product assertions; root restored the external
  state and the two clean final runs above replaced it.

### Installed headless CLI and performance

- Used only repository-installed `playwright-cli`, session `p16d-impl-01`, against the root-owned
  keyed localhost server. Onboarding generated a phrase but never activated reveal/copy controls
  and no phrase or key was read or recorded.
- The ordinary UI created 12 named People and 30 persisted blank transactions. The grid exposed 13
  Person columns including `Me`, rendered 16 vertically virtualized rows, and had real horizontal
  overflow. Invalid `101` and malformed text both exposed `aria-invalid=true`; invalid Enter
  retained focus. Signed decimals, zero removal, refresh and one-action Undo/Redo passed.
- A browser-opened authenticated second tab edited Person 01 while the first held Person 00.
  Person 01's `22.5%` converged to the first tab, and a later duplicate proved both `22.5%` and
  Person 00's `-35.125%` were present. This proves value convergence only. P10 encrypted
  field-presence transport remains absent and is not claimed.
- Narrow 640x480, dark scheme, reduced motion and 200% zoom kept the horizontally scrolled
  allocation cell visible. CLI reported zero console errors. All completed sync/auth requests were
  successful; two aborted `/transactions` navigations were expected popup/reload cancellation.
  A boolean-only request-body sentinel check found no plaintext Person name.
- Real UI interaction timing covered click activation, text input, Enter, central mutation and the
  committed rendered button in headless Chromium/Next dev with 30 rows and 13 People columns:
  five warmups, 40 samples, p50 62ms, p95 93ms, max 108ms. The p95 meets the `<100ms` target; max is
  disclosed.
- Session close succeeded, `delete-data` found no remaining user data, and global browser list was
  empty. Root trashed exactly nine generated CLI files (185,077 bytes), preserving 22 older files
  and clearing generated test trees. Final root-owned server/config cleanup was requested only
  after all exact-HEAD commands stopped.

## Paths, risks, P10 boundary and independent-review request

- Product/test paths changed by P16D are exactly the eight authorized product paths plus the four
  authorized test paths. The cumulative BASE range also contains only root-owned `HANDOFF.md` and
  `PROGRESS.md`.
- `BASE..HEAD` for independent review is
  `3a5081ac37e09817e0d02ae8799469d1bf09dad5..b5ebc2a`.
- Frozen scratch, canonical FS-001 and SCOPE hashes/counts still match the dispatch boundary. No
  scratch marker, canonical source, task, schema/config, P16A/P16C/P13/P09/P10/P14 owner, ledger,
  dependency or future review was edited.
- Risk boundary: this UI allocates stable per-Person field identity but intentionally emits no
  presence broadcast. It relies on current P16C one-key validation/history and P16A derivation;
  P10 remains separately open.
- No material ambiguity required a `Q-PROPOSAL-P16D-01-*`.
- The evidence is an implementer claim only. Independent review of the exact immutable range and
  this uncommitted artifact is requested; no PASS is claimed here.
