# P20B — HS-021 full-codebase style-guide sweep (implementation 01)

**Requirement:** HS-021 — "Do a sweep of the full code base for code quality based on our style
guide." **Base:** `47e197f55462d41a874ea04c49e9eaef0f5e7efa`. **Implementer:**
`p20b-implementer-01`. Commit-forward only; no checkout/reset/branch/rebase was performed, and
`git stash list` is empty.

## 1. Method and coverage

The `.claude` corpus is the rubric: `CLAUDE.md`, `rules/coding-style.md`,
`rules/typescript-style.md` and the `components`, `crdt`, `crypto`, `sync`, `trpc`, `import` and
`e2e` skills. Coverage was partitioned across the whole first-party tree so no subsystem was sampled
rather than read:

| Partition                                                                               | Scope                                |
| --------------------------------------------------------------------------------------- | ------------------------------------ |
| `src/lib/crdt/**`, `src/lib/domain/**`                                                  | 38 files, read in full               |
| `src/lib/crypto/**`, `auth/**`, `vault/**`, `supabase/**`, identity + vault components  | 42 files, read in full               |
| `src/lib/sync/**`, `src/lib/trpc/**`, `src/server/**`, `src/app/api/**`                 | 24 files, read in full               |
| `src/lib/import/**`, `src/lib/utils/**`, `src/lib/*.ts`, `src/hooks/**`, `src/types/**` | 25 files, read in full               |
| `src/components/features/**`, `ui/**`, `providers/**`, `src/app/**`                     | 48 read in full; `ui/**` grep-driven |
| `tests/**` + `playwright.config.ts` + `vitest.config.ts`                                | full suite audit                     |

`src/components/animate-ui/**` was treated as third-party and excluded: `eslint.config.mjs` globally
ignores it as "vendored animate-ui components installed via shadcn". `src/lib/domain/settlement.ts`
was read but never edited (FS-001).

Representative queries (full lists are in each partition's working notes; these are the ones that
drove the inventory):

```
rg -n -P '(?<![\w$])as\s+(?!const\b)[A-Z_$][\w$<>\[\]\.]*' -g '*.ts' -g '*.tsx' -g '!**/animate-ui/**' src
rg -n -P '(?<![\w$])any(?![\w$])'                          -g '*.ts' -g '*.tsx' -g '!**/animate-ui/**' src
rg -n -P '[\w$\)\]]!(?=[\.\[\)\,;\s]|$)(?!=)'              -g '*.ts' -g '*.tsx' -g '!**/animate-ui/**' src
rg -n 'console\.' src/lib/crypto src/lib/auth src/lib/vault src/lib/supabase
rg -n -U 'setState\([^)]*\)\s*=>\s*\(\{' src          # non-draft CRDT mutations: zero hits
rg -n 'deletedAt' src/lib/crdt src/lib/domain
rg -n 'waitForTimeout|networkidle|\.only\(|test\.skip|it\.skip|test\.fixme' tests/
rg -n 'text-gray-|bg-gray-|bg-white|text-white|bg-slate-|#[0-9a-fA-F]{3,8}' src/components src/app
rg -n 'classList|documentElement|next-themes|ThemeProvider' src   # dark-class activation: zero hits
rg -l "\b<SYMBOL>\b" src tests                        # looped over ~200 symbols for dead-code proof
```

Claims were not taken on trust. Every BLOCKER and MAJOR below was reproduced before it was fixed —
by running the real function under vitest, by a `node -e` probe, or by differential ciphertext — and
each behaviour-changing fix has a regression test verified to fail against the pre-fix code.

## 2. Inventory summary

100 findings. Severity is user impact, not effort.

| Severity | Total | Fixed | Deferred / no-action                |
| -------- | ----- | ----- | ----------------------------------- |
| BLOCKER  | 7     | 6     | 1 deferred (Q-0, with the evidence) |
| MAJOR    | 36    | 29    | 7 deferred (Q-1 … Q-5, Q-8, Q-9)    |
| MINOR    | 39    | 31    | 8 deferred                          |
| NIT      | 18    | 9     | 9 no-action-justified               |

The one unfixed BLOCKER is Q-0 below: `pruneBuckets` discards concurrent writes. It is deferred
rather than fixed because the safe remedy is a design decision with a 14-test blast radius, not
because it is small — the investigation and proof are in §3.

### 2.1 BLOCKERs — six fixed, one deferred with proof

| #   | Location                                                               | Rule                                                 | Defect                                                                                                                                                                                                                                                                                           | Proof                                                                                                                    |
| --- | ---------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| B-1 | `src/lib/crdt/queries.ts:144`                                          | coding-style correctness                             | `compareTransactionOrder` returned `NaN` for every pair of manually-created rows: `Infinity - Infinity`. `NaN !== 0` short-circuited the id tie-breaker, so sort order was input-dependent and two synced peers could materialise identical rows in different orders — a CRDT convergence break. | Comparator returned `NaN` in both directions; `[c,a,b].sort` and `[b,c,a].sort` each returned input order.               |
| B-2 | `src/lib/crdt/snapshot.ts:71,72,111,112,172`                           | correctness                                          | `btoa(String.fromCharCode(...bytes))` spreads the array as arguments. A 2 000-transaction vault yields a 366 KB shallow snapshot; the argument limit is ~125 KB. Sync was broken for any non-trivial vault.                                                                                      | `String.fromCharCode(...new Uint8Array(400000))` → `RangeError: Maximum call stack size exceeded` (reproduced directly). |
| B-3 | `src/lib/import/ofx.ts:173`                                            | CLAUDE.md established libraries                      | Every OFX date shifted back one day in negative-UTC-offset timezones: the library builds its `Date` via `Date.UTC`, and `toPlainDate` read _local_ calendar parts. The comment claimed the opposite of what the code did.                                                                        | `<DTPOSTED>20240115` → `2024-01-15` under `TZ=UTC`, `2024-01-14` under `TZ=America/New_York`.                            |
| B-4 | `src/lib/import/duplicates.ts:190`                                     | import skill "80% similarity"                        | `minDescriptionSimilarity` was never enforced in `similar` mode — the computed flag was gated behind an exact-mode qualifier. Date+amount alone reach 0.60 confidence, so anything above ~0.25 similarity cleared the 0.7 floor.                                                                 | At threshold 0.8, `SHELL OIL 5521`/`SHELL GAS 9932` (0.364) and `UBER TRIP 4A2X`/`UBER EATS ORDER` (0.261) both matched. |
| B-5 | `src/lib/import/processor.ts:166`, `src/hooks/use-import-state.ts:646` | import skill "return structured errors, don't throw" | `parseNumber` can return `Infinity`, which passes `isNaN` and then makes `asMinorUnits` throw, aborting the entire import instead of recording one row error. `processCSVImport` has no try/catch.                                                                                               | A row with `1e999` threw `MoneyMinorUnits must be an integer, got Infinity`.                                             |
| B-6 | `src/components/features/accounts/AccountRow.tsx:334,362,373,420,446`  | components skill a11y                                | Four of five account fields were edited through `div`/`span` with only `onClick` — no `role`, `tabIndex` or `onKeyDown`. Keyboard users could not edit them at all.                                                                                                                              | Read directly; no keyboard path exists in the JSX.                                                                       |

### 2.2 MAJOR — fixed (27)

Correctness and data integrity: hard delete where the CRDT skill mandates soft delete
(`mutations.ts:672` — `cascade` defaults true and every production caller omits it); `addOwner`
divide-by-zero producing `NaN` owners (`ownership.ts:263`); `updateOwnerPercentage` erasing the real
owner and dropping non-owners (`ownership.ts:313`); raw unvalidated value written while the
validated one went unused (`allocations.ts:303`); module-level default-config mutation poisoning
every later import in the session and reaching CRDT schema defaults (`use-import-state.ts:274`);
hand-rolled date-format→regex compiler mis-compiling any token that prefixes a longer one
(`csv.ts:220` — replaced with date-fns per the established-libraries rule); `parseNumber`
mis-scaling money 100× on mis-grouped input (`csv.ts:197`); multi-account OFX giving every statement
the first statement's balance (`ofx.ts:265,294`).

Security and platform: `signData` never zeroized its decoded secret key though its sibling
`signRequest` does (`signing.ts:238`); `JSON.parse(...) as SessionData` trusting sessionStorage
wholesale (`session.ts:64`); vault UUID logged to the browser console on every registration
(`ensure-default.ts:189`); the `beforeunload` handler declared `async`, so the unsaved-changes
warning never fired — `beforeunload` is synchronous per spec (`sync/manager.ts:442`).

Accessibility and theming: **the entire dark theme was unreachable in production** — `globals.css:4`
scoped the variant to `.dark *` and nothing in `src/` ever adds that class (verified: zero hits for
`classList`/`documentElement`/`next-themes`), so every `dark:` utility was dead outside one test
that toggles the class by hand; the transactions grid had no `columnheader` cells at all because the
header rendered as a sibling of `role="grid"`; bare `d`/`Delete`/`Backspace` deleted a transaction
from anywhere on the page, including while a button or select trigger had focus; keyboard focus
landed on invisible buttons in six `opacity-0` hover containers; date-range inputs were unlabelled.

The dark-mode fix is verified against **built** CSS, not assumed from the source syntax. The variant
now carries both conditions and the token block moved under `@variant dark`, so `pnpm build` emits
each dark value twice:

```
:root:where(.dark,.dark *){--background:#020618;--foreground:#f8fafc;…}
@media (prefers-color-scheme:dark){:root{--background:#020618;--foreground:#f8fafc;…}}
```

against a light `:root{--background:#fff}`. 99 `prefers-color-scheme` blocks and 584 `.dark`
selectors are present in the production chunk. Keeping the class condition matters: the E2E suite
toggles `.dark` directly to exercise dark surfaces, and a pure media-query variant would have
silently disabled that coverage.

React correctness: a fresh `Set` default parameter re-registered the document keydown listener on
every render of the virtualised table; six confirm/copied timers set state after unmount; the vault
selector kept global `mousedown` and `Escape` listeners mounted on every page whether open or
closed; two context values wrapping the whole app were unmemoised.

Maintainability: seven near-identical `assertNever` copies consolidated into one shared helper; four
duplicated `(draft.x as any)[id] = ...` escapes with eslint-disables replaced by one typed helper;
the duplicated tag-hierarchy builder retired in favour of the shared `buildHierarchicalTagList`; the
unreachable step-wizard import flow and legacy automations UI deleted (live replacements are
`ImportPanel` and `FieldRulesManager`); the status-behaviour sentinel confined to its component
after `StatusRow` and `StatusesTable` had diverged on translating it.

### 2.3 Test-suite findings — fixed

The suite's only arbitrary wait was a 300 ms animation sleep inside `createNewIdentity`
(`helpers/auth.ts:37`), which runs in ~150 test setups and was therefore the largest single flake
surface; it and six redundant `networkidle` waits are gone. Two `sync-persistence` tests were
vacuous — their bodies sat inside `isVisible()` conditionals, so they passed whether or not the work
happened; one is now deterministic and the other, which asserted only the resting `Saved` state
despite being named for the transient `Saving` state and duplicated the test above it, was deleted
rather than left as false coverage. `/statuses` was the only user-facing route with no E2E coverage
at all, which matters because its Treat-as-Paid behaviour drives settlement inclusion; it now has
create/rename/delete/toggle coverage asserted through the settlement effect. Missing unit tests were
added for `toMajorUnits` (fast-check round-trip across zero- and three-decimal currencies),
`getFilterModeDescription` and `getEntriesOfLoroMap`.

The new `/statuses` journey then failed on first execution, and both causes were defects in the new
test code rather than in the product — worth recording, because they are exactly the failure mode
new coverage is prone to. `statusRow` located rows by rendered text, but opening a row's editor
moves the name out of the row text and into an input value, so the locator stopped matching the row
it had just opened; and because the add form renders its own `status-name-input`, a create that
silently failed still satisfied the wait. Edit and delete now resolve the row's stable testid while
the row is at rest, and `createStatus` waits for the add form to close, which is what actually
proves the write committed. Separately, the `aria-controls` assertion built a bare CSS `#id`
selector from an id embedding colon-separated UUIDs, which is invalid and made `querySelectorAll`
throw; it now matches by attribute. The spec passes 19/19 single-worker after both fixes.

That journey also earned its keep immediately: it exposed a live production defect.
`BehaviorSelector` leaked Radix's `"none"` placeholder through its `onChange`, and only the create
path translated it back — `StatusRow.handleSave` wrote it straight through, persisting the literal
string `"none"` into a field the CRDT schema declares as `StringEnum(["treatAsPaid"])`. Fixed by
confining the sentinel to the component and typing the props to the domain, so the divergence is
unrepresentable rather than merely corrected; two casts went with it, and a unit test pins the
contract.

### 2.4 No-action-justified (selected)

`Object.create(null) as Record<string, unknown>` is unavoidable — `Object.create` returns `any` —
and is correctly isolated. Branded-primitive constructors (`value as MoneyMinorUnits`) guarded by a
runtime `Number.isInteger` check are the prescribed "isolate in a small helper" pattern. Storing
identity keys in `sessionStorage` is specified in `specs/001-core-mvp/data-model.md`, so it is an
accepted architectural tradeoff, not a slip. `passkey.finishAuthentication` and `invite.getByPubkey`
being public is correct and deliberately anti-enumeration. Index keys on list items were checked
individually and are all over fixed-order, non-reorderable lists.

## 3. Q-proposals for root

- **Q-0 (BLOCKER-class data loss, investigated in depth, NOT fixed — needs a root decision).**
  `pruneBuckets` (`mutations.ts:287-330`) **destroys concurrent writes from other clients.** It
  splices the day/month/year list element and, at `:325`, deletes the account key outright; a peer
  that concurrently inserted into that container has its insert discarded on merge. Proven at every
  level with two-peer LoroDoc merges: day, month, year and account-key pruning each lost an
  unrelated concurrent insert, while the control case — where a sibling row keeps the bucket alive,
  so no prune happens — retained it. Critically, **this is not delete-specific**: `moveTransaction`
  also calls `pruneBuckets` (`:573`), so a user merely changing a transaction's date silently
  destroys a collaborator's brand-new unrelated transaction.

    I reproduced both independently rather than accepting the analysis. Two mirrors over merged
    LoroDocs, peer A deleting `tx-1` while peer B inserts an unrelated `tx-2`, converge to
    `A: [] B: []` — `tx-2` is gone from both. The move variant, where A only changes `tx-1`'s date
    while B inserts `tx-2` into the vacated bucket, converges to
    `A: ["tx-1","tx-keep"] B: ["tx-1","tx-keep"]` — again `tx-2` is destroyed, with no delete
    anywhere in the scenario.

    This surfaced while investigating the CRDT skill's soft-delete rule ("never remove from
    document"), which `deleteTransaction` violates: `cascade` defaults to true, that branch splices,
    and no production caller passes `cascade: false`. But the investigation **refuted** the
    hypothesised harm. Hard delete does _not_ lose to a concurrent edit and does _not_ resurrect the
    row — Loro's list-delete wins deterministically in both delivery orders and both peers converge.

    I deliberately did **not** flip the default, for three reasons. The stated motivation is
    disproven, so the change would be justified by a hypothesis the evidence contradicts. The change
    is not mechanical: 14 test cases and 20 assertions depend on physical removal, and at least
    three production gaps must close first or it introduces new user-visible bugs — the duplicate
    badge (`page.tsx:335`) does not filter `deletedAt` on nested duplicates, the mutation resolvers
    (`mutations.ts:444,:487`) would start mutating tombstones, and nested-duplicate
    re-materialization exists only in the splice branch (`:872-900`). There is also no tombstone GC
    anywhere, so shallow snapshots would grow monotonically. And soft-delete would not fix
    `moveTransaction` regardless.

    Recommendation to root: treat this as "`pruneBuckets` is not merge-safe", not as a style-guide
    discrepancy. A narrower fix — making pruning merge-safe, or not pruning containers at all —
    likely addresses the real data loss with far less blast radius. Severity depends on whether
    multi-user sync is exercised in practice; it needs two active clients to trigger.

- **Q-1 (MAJOR, security posture).** `membership.remove` deletes a member but **nothing ever calls
  `membership.rekey`** — `src/lib/crypto/rekey.ts` has zero callers. The router header promises
  forward secrecy the product does not deliver; `AccessMembersSection.tsx` UI copy separately states
  "The vault key is not rotated". Either wire the rekey path or drop the claim. Not fixed here:
  changing key rotation is a security-design decision, not a style fix.
- **Q-2 (MAJOR, availability).** `sync.getUpdates` (`sync.ts:127`) selects **every** op for the
  vault with no limit and ignores the client's version vector for filtering, so a 499-op vault
  returns all 499 on every catch-up.
- **Q-3 (MAJOR, integrity).** `sync.pushSnapshot` (`sync.ts:276`) lets **any** member overwrite the
  single authoritative vault snapshot, with no version-vector monotonicity check and a
  check-then-write TOCTOU. `vault_ops` is protected by an append-only trigger; snapshots are not.
- **Q-4 (MAJOR, contract).** The declared `.max(1000)` in `schemas/sync.ts` is unenforced because
  `getUpdates` has no `.output()`. Roughly 20 `*Output` schemas are exported and never attached.
- **Q-5 (MAJOR, dead code).** Whole modules are production-dead: `src/lib/domain/automation.ts` (524
  lines, superseded by the P17A field-rule engine, and it inverts layering by importing from
  `@/components`), `src/lib/import/processor.ts` (a second full CSV pipeline that has already
  diverged from the live one in `use-import-state.ts`), `src/lib/crypto/rekey.ts`, and eight unused
  tRPC procedures. Deleting these is a structural call, not a style fix.
- **Q-6 (MINOR, rule vs reality).** `typescript-style.md` mandates ts-pattern `.exhaustive()`, but
  **ts-pattern is not a dependency** and is not installed. Three source files carry comments saying
  so. This sweep consolidated the seven hand-rolled `assertNever` copies into one shared helper as
  the closest compliant option; root should either add the dependency or amend the rule. Rule-
  strength changes are out of scope for P20B.
- **Q-7 (MINOR, theme token).** `--color-destructive-foreground` is **not defined** in
  `globals.css`, so `text-destructive-foreground` emits nothing. `ImportDropTarget` was left on its
  explicit red pair; the token should be added to the theme.
- **Q-8 (MINOR, crypto typing).** `.claude/skills/crypto/SKILL.md` mandates branded key types
  (`VaultKey`, `SigningKey`); **neither exists**. Every key is a raw `Uint8Array`, so a vault key,
  an X25519 secret and a PRF output are mutually substitutable in `wrapKey`, where argument order is
  security-critical.
- **Q-9 (MINOR, FS-001 deferrals).** Three nits observed in the frozen `settlement.ts` and **not
  touched**: a fourth copy of `freezeResultGraph` (:204); `Object.create(null)` cast (:231,
  unavoidable); `issueOrder` falling back to `JSON.stringify` on both operands per comparison (:915,
  correct but O(n log n) serialisations).
- **Q-10 (MINOR, encoding).** Import reads files with `file.text()`, which always decodes UTF-8, so
  Latin-1/Windows-1252 bank exports get U+FFFD in every non-ASCII payee name — and OFX files declare
  `CHARSET:1252` in their own header. Deferred as feature-sized.
- **Q-11 (MINOR).** `detectNumberFormat`'s regexes are anchored `^\d`, so a leading minus defeats
  detection and EU-format files fall back to US parsing. B-4's fix converts the resulting corruption
  into a structured per-row error, but auto-detection still fails; completing it needs a component
  file that was being edited concurrently.
- **Q-12 (MINOR, typing).** `useControlledState` (`src/hooks/use-controlled-state.tsx:16`) casts
  `defaultValue as T`, which lies: when neither `value` nor `defaultValue` is supplied the state is
  genuinely `undefined`. The honest fix is a discriminated props union making "neither supplied"
  unrepresentable. Not done here because the hook's only consumer is vendored
  `animate-ui/primitives/radix/tabs.tsx`, so changing its public shape is churn against third-party
  code for no first-party benefit. The `any` in its generic constraint **was** fixed
  (`Rest extends any[]` → `unknown[]`), removing the file's eslint-disable.

## 4. `.claude/**` factual edits

One edit, made only because repository reality proves the text stale.

**`.claude/skills/crypto/SKILL.md:14`** — was "Data encrypted with XChaCha20-Poly1305".

Proof: `src/lib/crypto/encryption.ts` calls `sodium.crypto_secretbox_easy`, whose primitive is
XSalsa20-Poly1305, not XChaCha20. Demonstrated differentially — encrypting the same message under
the same key and nonce:

```
crypto_secretbox_easy  : 953dd1713ef37925b87587002e359c6f...
xchacha20poly1305_ietf : d31d8cef05cc150d833f6b55181b6299...
IDENTICAL? false
```

The wasm build exports no `xchacha` secretbox variant. `src/lib/crypto/keywrap.ts:5` already
documented `crypto_box` correctly as XSalsa20-Poly1305, confirming the error was localised rather
than a project-wide convention. Presence genuinely does use XChaCha20-Poly1305
(`sync/presence-protocol.ts:188` calls `crypto_aead_xchacha20poly1305_ietf_encrypt`), so the line
now names both primitives against their actual users. The same stale claim was corrected in
`src/lib/crypto/encryption.ts` and `src/lib/crypto/index.ts`. It also appears in three
`COMMENT ON COLUMN` statements in `supabase/migrations/005_vault_ops.sql`; applied migrations were
left alone and this is flagged for root.

No rule was weakened or deleted. `CLAUDE.md` needed no correction: its stack list matches
`package.json` (TypeScript 6.0.3, Next 16.2.10, React 19.2.7, Node `^22.13.0 || >=24`).

## 5. Verification

- **Frozen sources byte-identical.** `git status --porcelain` on `specs/human-scratch.md` and
  `specs/008-.../spec.md` is empty across the whole range.
- **FS-001 holds.** `git hash-object src/lib/domain/settlement.ts` →
  `010f3c93582a2ce311594d4dde8464760ca49c43`, matching the mandated blob.
- **No root-owned file touched.** No change to `PROGRESS.md`, `SCOPE.json`, `QUESTIONS.md`,
  `HANDOFF.md`, `DECISIONS.md`, `FINAL-AUDIT.md`, `reviews/**` or `tasks/**`.
- **No-checkout discipline.** No checkout/reset/branch/rebase by me; `git stash list` empty.

### Type escapes — net direction is down on every axis

Measured with identical queries against a `git archive` of the base and the working tree, both
excluding vendored `animate-ui`:

| Metric                         | Base `47e197f` | HEAD  | Δ       |
| ------------------------------ | -------------- | ----- | ------- |
| `as` assertions in `src/`      | 151            | 113   | **−38** |
| non-null `!` in `src/`         | 22             | 2     | **−20** |
| explicit `any` in product code | 1              | **0** | −1      |
| `any` in `tests/`              | 1              | **0** | −1      |
| `waitForTimeout` in `tests/`   | 1              | **0** | −1      |

The 2 remaining `!` hits are prose false positives — `"user must save this!"` and the word
`"Copied!"`. Zero new `as`/`any`/`!` were introduced in product code.

### Secret-safety — clean

No vault master key, invite bearer secret, `crypto_box` secret material, seed phrase, recovery
material, `SUPABASE_JWT_SECRET`, presence key or vault plaintext appears in code, logs, URLs,
fixtures or this evidence. The sweep **removed** logging (the vault UUID console log). Test vectors
are the public BIP39 `abandon … about` vector or obvious placeholders that decode to strings like
`"secret-key"`. `SUPABASE_JWT_SECRET` is derived at runtime from the local container's JWKS and is
not committed; `.env.local` is gitignored with only `.env.local.example` tracked.

### Gates — real counts

| Gate                | Base                               | HEAD                                   |
| ------------------- | ---------------------------------- | -------------------------------------- |
| `pnpm typecheck`    | clean                              | **clean**                              |
| `pnpm lint`         | 0 errors, 10 warnings              | **0 errors, 1 warning**                |
| `pnpm test`         | 1939 passed / 2 skipped, 100 files | **2081 passed / 2 skipped, 110 files** |
| `pnpm build`        | succeeds                           | **succeeds**                           |
| `pnpm format:check` | 13 pre-existing spec markdown      | **13 pre-existing spec markdown**      |

The single remaining lint warning is the pre-existing `react-hooks/incompatible-library` on TanStack
Virtual in `TransactionTable.tsx`; the nine unused-variable warnings the base carried are gone.
`format:check` failures are all pre-existing `specs/**` markdown — including the frozen
`human-scratch.md`, which must not be reformatted. Every `.ts`/`.tsx` file this package touched
passes `oxfmt`.

E2E results are recorded in `implementation-02.md` together with the manual Playwright CLI charter.
