# P16C Independent Review — Revision 01

## Review identity and verdict

- Package / requirements / revision: `P16C` / `FS-001` plus `HS-009` / `01`.
- Literal cumulative reviewed range:
  `0a7c9a49722ddc4d955f910af6dbb19cfffbd600..7cf66fbf7f4b845355c5f956cdfa955ee6db2b59`.
- Root dispatch / pre-product base: `9418fa29003df3aa9ea659580593891d0bb8dddd`.
- RED commit: `ff45176c5e30f66e8d10990daddb955d1c2277ad`.
- Product/test HEAD: `7cf66fbf7f4b845355c5f956cdfa955ee6db2b59`, tree
  `3e6e80a030e81ae68a4ab3b499a544b1b9ceac26`.
- Evidence freeze: `92ce0a75cc5ced114e8a81e8d452961f738e1a60`.
- Frozen implementation evidence: `evidence/P16C/implementation-01.md`, SHA-256
  `0d08bb7884d37675d94735bdc65d6e5bfb7f5c488c4c64f8c10819bcc745a31b`, 230 lines / 17,079 bytes.
- The cumulative range contains 10 paths, 1,660 insertions and 217 deletions. Two paths are
  root-owned `HANDOFF.md` / `PROGRESS.md`; the other eight are the assigned P16C product/test paths.
  The exact product range is
  `9418fa29003df3aa9ea659580593891d0bb8dddd..7cf66fbf7f4b845355c5f956cdfa955ee6db2b59`.
  `git diff --check` passes.
- **Verdict: FAIL.** The central one-key and complete-replacement boundaries, initialized-Loro
  convergence, rollback behavior, history integration, encrypted persistence and current UI
  preservation are substantially sound. Three contract failures remain: a revoked ordinary Proxy
  escapes as an exception rather than a typed rejection; validation error order depends on input
  insertion order; and structural transaction copies silently discard invalid legacy non-number
  allocation siblings. The last defect is direct data loss. FS-001 and HS-009 must remain
  incomplete.

## Findings

### F-01 — High / blocking reliability: revoked Proxy escapes the reject-only boundary

`inspectOwnDataEntries` performs `Array.isArray(input)` before entering its reflection `try` block
(`src/lib/crdt/allocations.ts:100-113`). ECMAScript `IsArray` throws for a revoked Proxy. The catch
at lines 140-145 therefore cannot convert that ordinary adversarial input into the declared
immutable `invalid-allocation-container` result.

The independent reproduction used the assigned bundled production function:

1. Create `{ proxy, revoke } = Proxy.revocable({}, {})`.
2. Revoke it.
3. Call `prepareAllocationReplacement(proxy)`.
4. The function throws `TypeError: Cannot perform 'IsArray' on a proxy that has been revoked`.

The direct probe confirmed no allocation mutation, but exception containment is itself binding:
malformed or uninspectable caller input must reject through the typed boundary. Complete replacement
inherits the escape at `src/lib/crdt/allocations.ts:285-295`, insertion preparation delegates to the
same function at lines 298-302, and allocation automation preparation calls it at
`src/lib/domain/automation.ts:53-64`.

Required closure: contain every potentially throwing inspection operation, including container
recognition, within the typed materialization boundary. Return a deeply frozen
`invalid-allocation-container` result without touching a draft. Add production-boundary tests using
an actually revoked `Proxy.revocable` value through direct preparation, complete replacement,
insertion and automation preparation/application. The tests must assert no throw, the exact typed
error, unchanged document/version/history state and an unchanged caller graph.

### F-02 — Medium / blocking determinism: invalid replacement errors follow insertion order

The safe materializer walks `Reflect.ownKeys(input)` without canonicalizing keys
(`src/lib/crdt/allocations.ts:122-139`). `validateAllocationSet` then uses unsorted
`Object.entries(allocations)` and emits errors in that order
(`src/lib/domain/allocation.ts:185-203`). `prepareAllocationReplacement` returns that array
unchanged (`src/lib/crdt/allocations.ts:153-168`).

The independent permutation probe supplied the same invalid logical map in opposite construction
orders:

- `{ zulu: 101, alpha: -101, middle: NaN }` returned person IDs `zulu, alpha, middle`.
- The reverse construction returned `middle, alpha, zulu`.
- The serialized immutable result graphs were unequal.

This violates the assigned deterministic errors/permutations requirement. It also makes callers,
logs and tests depend on incidental JavaScript construction order even though the logical invalid
set is identical.

Required closure: canonicalize materialized string keys with one explicit stable comparator before
validation and result construction, or sort the validation errors with the same comparator. Preserve
the exact `$cid` exclusion and accessor/symbol protections. Add permutation tests that cover
multiple simultaneous reasons, integer-like keys, empty and Unicode/emoji person IDs, and assert
byte-equivalent error ordering plus deep freezing across every construction order.

### F-03 — High / blocking data integrity: structural copies drop invalid legacy siblings

The private structural insertion path correctly says that move/swap/unnest/import-preservation must
not revalidate legacy allocation values (`src/lib/crdt/mutations.ts:405-417`). However,
`copyAllocationData` contradicts that contract: despite saying it excludes only exact `$cid`, it
copies a property only when `typeof descriptor.value === "number"`
(`src/lib/crdt/allocations.ts:171-187`).

Every structural helper routes through that filter:

- moving a transaction copies at `src/lib/crdt/mutations.ts:536-564` and
  `src/lib/crdt/mutations.ts:594-635`;
- unnest/swap reconstruction uses it at lines 637-650, 720-740 and 785-845;
- preservation of a non-imported nested row while deleting its imported parent uses
  `copyNestedDuplicate` and `insertStoredTransaction` at lines 905-912;
- automation history capture also filters through it at `src/lib/domain/automation.ts:365-387`.

The independent probes used an initialized production loro-mirror document, not a plain-object-only
fixture:

1. Raw-inject allocations `{ outOfRange: 150, stringLegacy: "bad", valid: 25 }`.
2. Hydration retained all three entries.
3. Repair only `valid` to `-12.5`; both invalid siblings remained, which is correct.
4. Move the transaction through the production structural mutation.
5. The moved allocation map became `{ outOfRange: 150, valid: -12.5 }`; `stringLegacy` was silently
   lost.

A second initialized-Loro import-deletion probe nested a non-imported row carrying
`{ stringLegacy: "bad", valid: 25 }` under an imported parent. Deleting the import promoted the row
through the preservation path, but its allocations became `{ valid: 25 }`. A separate exact-key
repair from `bad: "legacy"` to `bad: -50` preserved numeric invalid sibling `sibling: 150` and
`valid: 25`; this confirms that the loss is structural-copy filtering rather than hydration.

Canonical FS-001 explicitly requires invalid legacy values to remain inspectable and preserved until
the exact key is repaired; any lost sibling fails the package. A runtime value outside the current
TypeScript schema is precisely the legacy case this private path exists to preserve.

Required closure: structural stored-data copying must retain every own enumerable string data entry
except exact `$cid`, without invoking accessors and without a number-only filter. The public
insert/replacement boundaries must remain strict and reject invalid new data; only the private
already-stored structural path may bypass revalidation. Extend initialized-Loro tests across
move/account+date move, nest, unnest, swap, import-delete promotion and maintenance relocation with
string, boolean, null, out-of-range, non-finite and valid siblings. Assert exact preservation,
`$cid` exclusion, no getter execution, and exact-key repair without sibling loss. Automation history
capture/restore must either preserve the same raw legacy map or explicitly prove why a different
settled contract is safe; silently omitting entries is not acceptable.

## Other acceptance, safety and compatibility observations

- The public mutation design correctly separates one-person edits from complete replacement.
  `setTransactionAllocation` changes or deletes exactly one Loro map key; replacement fully prepares
  before touching the draft and then deletes absent keys / sets explicit keys.
- Generic transaction updates omit allocations at the type boundary and ignore a cast-injected
  `allocations` property at runtime (`src/lib/crdt/mutations.ts:89-103,512-529`). Description-alias
  mutation also rejects an injected allocation update.
- Insert validates both parent and nested allocation inputs before creating transaction buckets.
  Invalid inputs do not leave empty bucket structure.
- Automation prepares allocation actions before applying allocation/status/tag changes. Its live
  application and restore paths use the central complete replacement boundary. F-01 still propagates
  into that preparation, and F-03 affects history capture of invalid legacy data.
- Independent initialized-Loro convergence used fixed seed `2607251201`: 128 two-peer schedules,
  2,033 operations and 124 same-key deletes. Explicit peer IDs and raw LoroMap reference documents
  were the independent oracle. Forward/reverse update-import orders converged; production matched
  the raw-Loro oracle for different-key merge and exact same-key LWW. Final PRNG state: `576627908`.
- Independent validation/rollback used fixed seed `2607251202` on an initialized mirror: 1,200
  one-key cases (450 valid / 750 invalid) and 600 replacements (173 valid / 427 invalid). Inputs
  included exact bounds, signed decimals, zero, negative zero, NaN, infinities, out-of-range and
  non-number values plus adversarial IDs (`__proto__`, `constructor`, `$cid`-like, NUL, Unicode and
  emoji). All 1,177 invalid cases left the document version and exact map unchanged; every valid
  result matched an independent oracle. Result graphs were frozen and caller descriptors unchanged.
  Final PRNG state: `2515823298`.
- Checked-in initialized-mirror coverage confirms plain snapshot/update-byte and encrypted
  persistence round trips, duplicate physical logical copies, one-step undo/redo and failed-mutation
  history exclusion. The full independent suite and browser history preservation remained green.
- Three focused benchmark processes exercised only the P16C mutation boundary over 1,000
  transactions and 250 allocation keys. One-key mean/p50/p95/max milliseconds were
  `0.0596/0.0584/0.0665/0.0889`, `0.0565/0.0557/0.0633/0.0646` and `0.0650/0.0604/0.0890/0.1127`.
  Complete-replacement results were `0.3390/0.3233/0.4570/0.6580`, `0.3301/0.3167/0.4224/0.6384` and
  `0.3647/0.3536/0.4920/0.6287`. All are well below the 100 ms budget.
- Current manual transaction creation and CSV import callers initialize allocations as `{}`. There
  is no current non-empty allocation editor or current import automation-application UI caller. This
  review makes no claim that a nonexistent visual allocation surface was exercised.
- No plaintext financial payload, recovery phrase, secret, compatibility dual-write, arbitrary retry
  masking or unrelated product change was found in the exact range.

## Independent automation

| Gate                                         | Independent result                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Focused P16C Vitest profile                  | PASS in three clean processes; 2 files / 66 tests each, about 2.05–2.06 s.                        |
| Broader affected owner profile               | PASS; 10 files / 209 tests in 7.93 s.                                                             |
| Full deterministic Vitest, forks, one worker | PASS; 64 files / 1,483 passed / 2 skipped in 58.38 s.                                             |
| `pnpm typecheck`                             | PASS.                                                                                             |
| Exact eight-path ESLint                      | PASS; no output.                                                                                  |
| Exact eight-path `oxfmt --check`             | PASS; all eight P16C product/test paths.                                                          |
| `pnpm lint`                                  | PASS exit 0; 0 errors / 10 inherited warnings.                                                    |
| `pnpm build`                                 | PASS; Next 16.2.10 compiled, typechecked and generated all 17 routes.                             |
| Repository `pnpm format:check`               | FAIL only on the same 14 inherited frozen/control/spec Markdown paths; no P16C product/test path. |
| `git diff --check` on the literal range      | PASS.                                                                                             |
| Affected Chromium E2E, no retry, one worker  | PASS; 66/66 in 4.5 minutes.                                                                       |
| Full Chromium E2E, no retry, one worker      | PASS; 102/102 in 6.6 minutes.                                                                     |

The green checked-in suite is reported exactly but does not cover a revoked Proxy, logical-map error
permutations, or non-number legacy allocations crossing a structural copy. Those are the three
independent adversarial probes that determine this verdict. Inherited React `act(...)` advisories
and expected negative-path authentication/offline diagnostics appeared in existing tests without
failures.

The 14 repository formatting paths were: `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`,
`PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, `evidence/P12/implementation-03.md` through
`implementation-06.md`, `evidence/P14/implementation-01.md`, `reviews/P12-review-05.md`,
`reviews/P12-review-06.md` and `specs/human-scratch.md`. The assigned P16C evidence and all P16C
product/test paths passed their exact formatting checks.

## Installed-CLI manual charter

- Used only the repository-installed headless `playwright-cli` with disposable profile
  `p16c-review-01` against the root-keyed local server. No Playwright MCP, `npx`, headed,
  debug/pause mode, temporary test or temporary config was used.
- Created a fresh authenticated state while all twelve recovery words remained masked. The phrase
  was never revealed, read, copied, entered or printed.
- Created account `P16CReviewSecondary`. Created manual transaction `P16CReviewManual`, dated
  2026-07-24, amount `-12.34`, and moved it to that account. Reload retained every visible field.
  Bulk delete removed it and exactly one Undo restored date, description, account and amount.
- Created `P16CReviewPerson`; reload retained it.
- Imported a real one-row CSV through the current picker/preview/import flow. The resulting
  `P16CReviewImport` transaction was dated 2026-07-23, amount `-23.45`, in `P16CReviewSecondary`.
  Deleting that import removed only the linked import row while the manual transaction survived.
  Exactly one Undo restored the linked transaction and import.
- At 390 × 844 the responsive mobile header/menu was present and body/document/viewport widths were
  all exactly 390 pixels. At desktop 1,280 × 900 with 200% document zoom, document width did not
  exceed the viewport. Dark-color and reduced-motion media preferences were both active. Keyboard
  Tab reached a visibly/semantically labelled `Redo` control; form controls exposed their roles and
  names in the accessibility snapshot.
- Console inspection reported 14 total messages, zero errors and zero warnings.
- Boolean-only storage inspection covered one localStorage key, five sessionStorage keys and one
  IndexedDB database / three stores / 16 records. The manual/import/person strings, exact amounts,
  CSV filename and mnemonic-like pattern were absent from every serialized storage surface.
- A live description mutation and exact restoration captured two sync/tRPC request bodies. Both
  known-plaintext and mnemonic-like scans were false; the final field value was restored exactly.
- The CLI browser closed, `delete-data` reported no user data and browser listing returned
  `(no browsers)`. The 59-byte temporary CSV was moved to recoverable trash. Root stopped the keyed
  server, restored generated `next-env.d.ts`, and moved exactly 35 review CLI files (138,812 bytes)
  plus the exact 775,674,549-byte `.next` directory to recoverable trash while preserving 22 older
  CLI files. Test results and report artifacts were absent; index/worktree were clean.

## Boundary, frozen sources and questions

- Frozen human scratch remains SHA-256
  `ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f`, 350 lines / 24,250 bytes, with
  HS-009 unchecked.
- Canonical FS-001 source `specs/008-transaction-percentage-allocations-settlement/spec.md` remains
  SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441
  bytes.
- `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines / 27,382 bytes.
- Before this artifact, review/control HEAD was exactly `80e3ccbc68663742ca98804844cab825f2e147eb`,
  the index and worktree were clean, the assigned review path was absent, and the
  browser/server/temp-artifact cleanup was complete. This review is the sole reviewer-created
  repository artifact. No product, test, source marker, ledger, evidence, configuration or
  prior-review file was edited.
- No `Q-*` proposal is needed. Typed exception containment, deterministic result ordering and
  preservation of invalid legacy siblings are settled requirements, not product ambiguities.

## Single final verdict

**FAIL.** P16C revision 01 establishes a strong central allocation mutation boundary and passes all
ordinary automated and UI preservation gates, but it does not contain a revoked Proxy, returns
insertion-order-dependent invalid results, and silently deletes non-number invalid legacy allocation
siblings during structural moves/import preservation. Root must preserve this immutable review, keep
FS-001 and HS-009 incomplete, and route F-01 through F-03 into P16C revision 02.
