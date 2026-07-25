# P16C Independent Review — Revision 02

## Review identity and verdict

- Package / requirements / revision: `P16C` / `FS-001` plus `HS-009` / `02`.
- Literal cumulative reviewed range:
  `0a7c9a49722ddc4d955f910af6dbb19cfffbd600..207e8c5758a48e66980b95eaeff51c0e5a605f7e`.
- Revision-01 failure integration / clean pre-revision HEAD:
  `d81a8283552cb6b3cb312e0f2d3e0adab97819d8`.
- Revision-02 root dispatch: `bfb34d76928c11d49364c88c3f86ae3b94725f7c`.
- RED commit: `2b5cee4f8a1d97d96f1bbfe77e77c0ad3104fa83`.
- Product/test HEAD: `207e8c5758a48e66980b95eaeff51c0e5a605f7e`, tree
  `4682fe5b883a6e4c212d8ef72d2656fb23bd6619`.
- Evidence freeze: `51928d50d9ad96f462dd67e9462b7932a0829c2b`.
- Review dispatch / pre-artifact HEAD: `f01ec88df8dabf017eed9269509b174d29d8871a`, tree
  `f2f0ef3fe3200570e9277095f42dd4e71691faeb`.
- Frozen implementation evidence: `evidence/P16C/implementation-02.md`, SHA-256
  `89876829842932aa7d32f66a5a4144eb21d0a14c60d952021329d4c0213813ec`, 220 lines / 15,273 bytes.
- Frozen revision-01 review: `reviews/P16C-review-01.md`, SHA-256
  `72487e97a3a8f4f3515b398fbc399062bc0f65f5d6b8e938e39f1a76335c5a46`, 252 lines / 18,298 bytes.
- The cumulative range contains 15 paths, 2,843 insertions and 231 deletions. It includes three root
  ledgers, immutable revision-01 evidence/review, the original P16C product/test scope and the
  revision-02 closure. The revision-02 pre-product range
  `d81a8283552cb6b3cb312e0f2d3e0adab97819d8..207e8c5758a48e66980b95eaeff51c0e5a605f7e` contains
  seven paths, 832 insertions and 210 deletions: root-owned `HANDOFF.md` / `PROGRESS.md`, three
  product owners and two RED/test owners. `git diff --check` passes.
- **Verdict: PASS.** Revision 02 closes all three blocking findings from the immutable revision-01
  review without weakening the accepted allocation boundary. Revoked containers now reject through
  one typed deeply frozen result, logically identical invalid maps produce deterministic results,
  and structural/history/maintenance paths preserve every own stored allocation data entry except
  exact `$cid`. Independent initialized-Loro, raw-descriptor, convergence, rollback, history,
  encrypted-persistence, performance, full automated and installed-CLI evidence is green. No new
  blocking finding remains.

## Revision-01 finding closure

### F-01 — Closed: revoked Proxy is contained by the typed boundary

`inspectOwnDataEntries` now performs array recognition, prototype inspection, own-key reflection,
descriptor reflection and materialization inside the same exception boundary. A revoked ordinary
Proxy returns the exact deeply frozen `invalid-allocation-container / uninspectable-record` graph
instead of escaping through `Array.isArray`.

Independent fixed seed `2607253201` exercised the assigned bundled production code through six
mechanisms:

1. direct `prepareAllocationReplacement`;
2. complete replacement inside an initialized Loro mirror;
3. public transaction insertion;
4. automation evaluation;
5. automation application; and
6. automation restoration.

Every path returned the same typed error without throwing. Document version, exact allocation map,
status, tags, history state and caller references remained unchanged. The full result graph was
deeply frozen. `createAutomationFromTransaction` also delegates validation before key enumeration,
so the revoked container cannot escape through its former secondary inspection path.

### F-02 — Closed: invalid result construction is deterministic

The implementation uses one explicit code-unit comparator for materialized string keys and the
returned validation-error array. Exact `$cid` remains excluded; metadata-like, Unicode, emoji,
integer-like and ordinary adversarial Person IDs remain ordinary keys.

Independent fixed seed `2607253202` ran 257 shuffled ordinary/null-prototype construction schedules.
Each logical map contained 12 adversarial invalid entries spanning simultaneous not-number,
not-finite, negative-zero and out-of-range reasons, plus exact `$cid`. Every schedule serialized to
the same 1,176-byte JSON result and matched an independently sorted comparator oracle. The final
PRNG state was `1934864014`.

Caller descriptors remained unchanged. A separate accessor case returned the typed `accessor-entry`
error with zero getter calls; enumerable symbols returned `symbol-entry`; custom prototypes returned
`invalid-prototype`. These re-prove that deterministic sorting did not weaken descriptor-safe
rejection.

### F-03 — Closed: stored legacy values survive every structural path

`storedAllocationDataEntries` now yields every own enumerable string data descriptor except exact
`$cid`, without invoking accessors or reading inherited/symbol entries. `copyAllocationData`,
maintenance relocation and automation history use that lossless stored-data contract. Public
insertion, one-key editing and complete replacement remain strict and continue to reject new invalid
values before mutation.

Independent fixed seed `2607253203` preserved string, boolean, null, out-of-range, both infinities,
NaN and valid siblings across eight mechanisms: date move, account-plus-date move, nesting,
unnesting, parent swap, import-delete promotion, exact-key repair and automation history
application/restoration. Direct descriptor copying additionally retained empty and `$cid`-like keys
while excluding exact `$cid`, symbol, accessor, inherited and hidden entries; the getter count
remained zero.

Independent maintenance seed `2607253204` used an actual initialized-Loro conflict bucket rather
than a plain-object fixture. Bounded maintenance completed in 49 frames with 24 applied plans and
preserved the exact parent and nested raw allocation maps through relocation.

## Accepted core and compatibility re-proof

- Independent merge/LWW seed `2607253301` ran 128 initialized-Loro two-peer schedules with explicit
  peer IDs. The 2,304 operations included 306 deletes and 512 same-key conflicting operations.
  Forward and reverse update-import orders converged exactly, and production matched separate raw
  `LoroMap` oracle documents. Final PRNG state: `2714545051`.
- Independent rollback seed `2607253302` submitted 900 invalid one-key/replacement mutations across
  NaN, both infinities, out-of-range numbers, strings, null, booleans, undefined, objects and
  arrays. Every rejection left the encoded document version and exact allocation map unchanged.
  Empty and exact `$cid` Person IDs also rejected without a version change. Caller descriptors were
  unchanged. Final PRNG state: `3524589260`.
- A rejected complete replacement created zero Undo history. One valid complete replacement created
  exactly one Undo action; one Undo restored the exact prior map, a second Undo returned false, and
  one Redo restored the replacement.
- An independent 32-byte-key persistence probe round-tripped an encrypted snapshot and incremental
  encrypted update. Exact allocation maps survived; distinct plaintext marker IDs were absent from
  the encoded ciphertext. Ciphertext sizes were 1,482 and 154 bytes.
- Generic transaction mutation still ignores a cast-injected `allocations` property. The manual
  description-alias insertion/update path, insertion preparation, automation application/restore,
  import promotion and maintenance relocation all route through the intended strict or stored-data
  boundary. There is no alternative public allocation write bypass.
- Invalid automation allocation changes are typed and are prepared before allocation/status/tag
  mutation. Valid application and restoration retain one atomic boundary. Captured invalid legacy
  history is preserved as raw stored data but cannot be re-applied as new invalid state.
- No plaintext financial payload, recovery phrase, secret, compatibility dual-write, arbitrary retry
  masking or unrelated product change was found in the exact revision.
- Current manual transaction creation and CSV import callers initialize allocations as `{}`. P16D's
  non-empty allocation UI does not yet exist, so this review does not claim visual allocation-grid
  acceptance.

## Performance

The checked-in production benchmark uses fixed seed `0x16c2026`, 1,000 transactions, 250 allocation
keys, 20 warmups and 100 measured samples per operation. Three clean focused processes produced:

- one-key mean / p50 / p95 / max: `0.06119042 / 0.059021 / 0.068188 / 0.171101ms`;
- one-key: `0.06078514 / 0.058259 / 0.067336 / 0.215074ms`;
- one-key: `0.05951382 / 0.056816 / 0.076213 / 0.160221ms`;
- complete replacement: `0.36367446 / 0.354326 / 0.433494 / 0.624744ms`;
- complete replacement: `0.37069055 / 0.354586 / 0.453002 / 0.696509ms`; and
- complete replacement: `0.36852680 / 0.348044 / 0.484681 / 0.692211ms`.

The mean of means is about `0.06050ms` for one-key editing and `0.36763ms` for complete replacement.
Both remain far below the existing 100ms edit budget. This is not a claim against P16E's future
100,000-transaction UI target.

## Independent automation

| Gate                                         | Independent result                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Focused revision-02 Vitest profile           | PASS in three clean processes; 4 files / 112 tests each, about 7.00–7.06s.                        |
| Broader affected owner profile               | PASS; 10 files / 217 tests in 8.02s.                                                              |
| Full deterministic Vitest, forks, one worker | PASS; 64 files / 1,492 passed / 2 skipped in 58.49s.                                              |
| `pnpm typecheck`                             | PASS.                                                                                             |
| Exact five-path ESLint                       | PASS; no output.                                                                                  |
| Exact five-path `oxfmt --check`              | PASS; all revision-02 changed product/test paths.                                                 |
| `pnpm lint`                                  | PASS exit 0; 0 errors / 10 inherited warnings.                                                    |
| `pnpm build`                                 | PASS; Next 16.2.10 compiled, typechecked and generated all 17 routes.                             |
| Repository `pnpm format:check`               | FAIL only on the same 14 inherited frozen/control/spec Markdown paths; no P16C product/test path. |
| `git diff --check` on the literal range      | PASS.                                                                                             |
| Affected Chromium E2E, no retry, one worker  | PASS; 66/66 in 4.5 minutes.                                                                       |
| Full Chromium E2E, no retry, one worker      | PASS; 102/102 in 6.7 minutes.                                                                     |

The affected and full E2E profiles used one worker, retries zero and the line reporter. Expected
offline/realtime/authentication negative-path fetch diagnostics appeared only in tests that
deliberately interrupted connectivity or authorization; no case failed. The broader Vitest profile
retained its inherited React `act(...)` advisories without failure.

The 14 repository formatting paths were: `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`,
`PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, `evidence/P12/implementation-03.md` through
`implementation-06.md`, `evidence/P14/implementation-01.md`, `reviews/P12-review-05.md`,
`reviews/P12-review-06.md` and `specs/human-scratch.md`. Exact P16C product/test formatting passed.

## Installed-CLI manual charter

- Used only the repository-installed headless `playwright-cli` with disposable profile
  `p16c-review-02` against the root-keyed local server. No Playwright MCP, `npx`, headed,
  debug/pause mode, temporary test or temporary config was used.
- Created a fresh authenticated state while all twelve recovery words remained masked. The phrase
  was never revealed, read, copied, entered or printed. Boolean inspection found no mnemonic-like
  page/storage value.
- Created account `Secondary review`. Created manual transaction `Manual boundary review`, entered
  date 2026-07-24 and amount `-12.34`, and assigned it to that account. Reload retained the exact
  description, account, displayed date `7/24` and amount. Bulk delete removed it and exactly one
  Undo restored the row with the same visible fields.
- The People caller exposed one `Me` member, `No outstanding balances between members` and
  `Everyone is settled up!`.
- Imported the real temporary one-row `p16c-review-02.csv` through picker, preview, auto-detected
  columns, account selection and enabled `Import 1 Transaction` action. The resulting
  `Imported boundary review` row was dated 2026-07-23, amount `-45.67`, in `Secondary review`.
  Deleting that import removed only the linked import row while the manual transaction survived.
  Exactly one Undo restored the linked transaction/import.
- At 390 × 844, document scroll width and client width were both exactly 390 pixels, there was no
  horizontal overflow, and the named mobile menu was visible. Keyboard Tab reached the named search
  textbox. At desktop 1,280 × 900, Chromium page scale reported exactly `2` while the transaction
  toolbar remained present. Reduced-motion and dark-color preferences were active; applying the
  product dark class produced dark background/light foreground computed colors while both rows
  remained rendered. Accessibility snapshots exposed named navigation, history controls, grid,
  transaction rows, dates, descriptions, accounts and amounts.
- Console inspection returned seven messages, zero errors and zero warnings.
- Boolean-only inspection covered nine local/session storage entries. Recovery/mnemonic-like data,
  both transaction descriptions, the CSV filename and pending-import marker were all absent. The
  observed registration request used POST. Its body contained none of the recovery, mnemonic,
  seed-phrase, private-key or transaction plaintext markers; no request body was printed. Sensitive
  identity/vault fields were absent from observed request URLs.
- `close`, `delete-data` and `list` left no browser or user data. Because recoverable trash is not
  supported for `/tmp`, the exact 67-byte temporary CSV was deleted and is not recoverable. Root
  stopped server session `76625`, cleared port 3000, restored `next-env.d.ts`, preserved 22 older
  CLI files, and moved the exact nine review CLI files / 28,535 bytes plus exact 728,460,459-byte
  `.next` directory to recoverable trash. Test-results and report artifacts were absent;
  index/worktree were clean.

## Boundary, frozen sources and questions

- Frozen human scratch remains SHA-256
  `ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f`, 350 lines / 24,250 bytes, with
  HS-009 unchecked.
- Canonical FS-001 source `specs/008-transaction-percentage-allocations-settlement/spec.md` remains
  SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441
  bytes.
- `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines / 27,382 bytes.
- Before this artifact, review/control HEAD and tree were exactly
  `f01ec88df8dabf017eed9269509b174d29d8871a` / `f2f0ef3fe3200570e9277095f42dd4e71691faeb`; index and
  worktree were clean; the assigned review path was absent; and browser/server/temp/generated
  cleanup was complete.
- This review is the sole reviewer-created repository artifact. No product, test, source marker,
  ledger, evidence, configuration or prior-review file was edited.
- No `Q-*` proposal is needed. The three revision-01 findings are settled contract requirements and
  are independently closed.
- This package alone completes no first-class requirement. HS-009 remains unchecked pending P16D,
  while FS-001 remains immutable/open pending P16D/P16E. No scratch marker is authorized by this
  package review.

## Single final verdict

**PASS.** P16C revision 02 closes F-01 through F-03 over the exact immutable cumulative range and
preserves the accepted strict public allocation boundary, per-key CRDT convergence, rollback,
history, encrypted persistence, structural data integrity, performance and current browser behavior.
Root may integrate this immutable approval and transition P16C to passed. HS-009 remains unchecked
pending P16D; canonical FS-001 remains immutable/open pending P16D/P16E.
