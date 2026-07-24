# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P16B / 01
- **Scope ID:** FS-001; this package owns the sole canonical settlement engine, its current caller
  migration and focused production tests only. FS-001 cannot complete from P16B alone.
- **State:** revision-01 implementation frozen; ready for independent review
- **Binding task:** `tasks/FS-001-transaction-percentage-allocations-settlement.md` P16B
- **Canonical authority:** read all 715 lines of
  `specs/008-transaction-percentage-allocations-settlement/spec.md`; sections 5–7, 11–12, 14–17
  are especially direct but do not narrow the whole-file contract
- **Dependency:** P16A/02 passed at integration commit
  `41f5760f77c1a93ab650a93912bfaf3c0b627ab0`
- **Literal original review BASE / clean pre-dispatch HEAD:**
  `4c102600240e2804b801c2a320e10164defb14ea`
- **Frozen implementer artifact:** `evidence/P16B/implementation-01.md`, SHA-256
  `48f10876f8e69e7f3bff022598c0236a775d061e1cc06a86cb3d48bfc60d3dfd`, 323 lines /
  21,736 bytes
- **Product/test HEAD:** `5242a2422cd86dd48eac07a4422491d5079ccd23`
- **Future immutable review artifact:** `reviews/P16B-review-01.md`
- **Implementation-start boundary:** clean index/worktree; P16A evidence/reviews and pass state are
  committed and immutable
- **Allowed product/test paths:** exactly
  `src/lib/domain/settlement.ts`,
  `src/lib/domain/balance.ts`,
  `src/lib/domain/index.ts`,
  `src/components/features/people/BalanceSummary.tsx`,
  `src/components/features/people/PeopleTable.tsx`,
  `tests/unit/domain/settlement.test.ts`,
  `tests/unit/domain/balance.test.ts`,
  `tests/unit/components/balance-summary.test.tsx`.
  The last test path may be created only if it directly proves the current caller consumes the
  canonical structured result and does not claim settled state while issues exist.
- **Forbidden writes:** all CRDT/schema/query/mutation paths, allocation/ownership owners and their
  tests, other components/pages, every E2E file, dependencies/configuration, tasks/specs, P16A
  artifacts, scratch, canonical FS-001, SCOPE, ledgers, `.claude`, `.codex`, agent configuration and
  future review. Report a reproducible owner blocker before root considers any expansion.
- **Commit contract:** inspect every settlement implementation/export/caller and all authorized tests
  before editing. Stage exact authorized product/test paths only, commit with a short message
  containing no parentheses, and leave `evidence/P16B/implementation-01.md` uncommitted. Never use
  `git add .` or `git add -A`.

## Required canonical engine

- **One public production authority:** `src/lib/domain/settlement.ts` must be the only callable
  settlement implementation. Delete the duplicate floating-point settlement function from
  `balance.ts`, remove its alias export from the barrel, preserve running/account balances and make
  every current production caller consume the canonical structured result. No compatibility wrapper
  may retain competing semantics.
- **Eligibility:** include only canonical top-level, non-deleted transactions whose referenced
  retained status has `behavior === "treatAsPaid"`. Exclude nested suspected duplicates and
  non-paid/missing statuses. A soft-deleted retained Treat-as-Paid status still qualifies. Transfer
  tags do not change eligibility. Missing accounts, invalid ownership/allocation and unsafe or
  non-integer money must produce typed issues and no plausible contribution.
- **Currency:** resolve account currency, then vault default, then USD. Group, order, aggregate and
  reverse-net within currency only. Never convert, compare, net or show one combined total across
  currencies. Reject invalid financial currency context rather than inventing a plausible total.
- **Signed positions:** for every eligible transaction, reuse P16A validation, effective derivation
  and exact apportionment. Apportion the signed integer minor-unit amount independently over
  effective allocation and valid ownership, then calculate
  `effectiveShareMinor - ownershipShareMinor` for the sorted person union. Exact per-transaction and
  per-currency positions must sum to zero.
- **Directed contributions:** sort debtors and creditors by stable person ID, deterministically
  match negative positions to positive positions, produce positive directed contributions carrying
  the source transaction ID, aggregate by currency/debtor/creditor, reverse-net same-pair
  obligations, remove zeros and return deterministic currency/debtor/creditor order.
- **Traceability:** every final positive integer obligation retains enough same-direction and reverse
  signed source contribution detail for the displayed net to be explained exactly. No source
  transaction ID may be lost during aggregation/netting.
- **Structured immutable result:** return runtime-immutable typed obligations by currency,
  per-person net positions by currency, source transaction contributions and stable typed issues.
  Every issue includes stable type plus transaction/account context where applicable, contains no
  sensitive log payload and excludes that affected transaction from totals. Missing/deleted People
  remain calculable by stable ID.
- **Scope boundary:** derive only. Persist no cache/audit record and add no server plaintext,
  mutation, UI source-detail expansion, transaction-grid allocation controls, CRDT repair or P16C/D/E
  behavior. The current People caller may receive only the minimum migration needed to use the
  structured result, group actual obligations correctly and avoid a false settled claim on issues.

## Required examples, properties and red-to-green

- **Checked-in red before product edits:** against byte-identical pre-product owners, replace the
  existing vacuous/wrong expectations with failures that prove the duplicate `balance.ts` callable
  export, the placeholder higher-allocation-pays algorithm, missing ownership/remainder/status/
  currency/nesting/issues/traceability semantics and current caller false-settled risk. Preserve the
  exact red commands/output before green.
- **Named examples A–H:** add one separately named production expectation for each canonical example:
  A no explicit allocation, B 50/50 expense, C owner remainder, D joint owners plus third person,
  E negative allocation direction reversal, F income direction, G equal joint ownership and H
  non-paid status exclusion. No combined case or general conservation property substitutes for any
  named example.
- **Production properties:** fixed-seed `fast-check` coverage must exercise signed positive/negative/
  zero/one-unit amounts, positive/zero/negative owner remainder, multiple owners, signed allocation
  weights, deterministic debtor/creditor matching, insertion-order independence, reverse netting,
  source-detail sum, per-transaction and per-currency zero-sum conservation, separate currencies,
  deleted/unknown People, deleted qualifying statuses, transfer-tag neutrality and every typed issue.
  Use an independent integer/rational oracle rather than reimplementing production decimal code
  inside the test or comparing the function to itself.
- **No vacuity:** remove the `length >= 0` settlement assertion and every conditional assertion that
  can pass without exercising its claim. Remove/replace all tests for the duplicate balance
  implementation; running/account balance coverage must stay green.
- **Immutability and input purity:** directly attempt mutations throughout each public success/issue
  graph and prove caller transactions/accounts/statuses/preferences are neither mutated nor frozen.

## Required evidence and verification

- **Focused automation:** run the settlement, balance and optional caller-component test profile in
  at least three clean processes. Run a broader domain/current-caller profile and full Vitest.
  Report commands, files/tests, seeds/run counts, counterexamples and elapsed times.
- **Independent-scale evidence:** benchmark the production engine over deterministic 100,000
  transactions after warmup in production-equivalent Node/build conditions. Report hardware/runtime,
  data shape, construction exclusion/inclusion, at least five samples, output counts, issue count,
  conservation and scaling comparison. Meet the approximate 200ms target when honestly possible; if
  not, record measured evidence and a complete optimization proposal/follow-up without claiming the
  target passed. Do not weaken correctness or omit traceability to chase the number.
- **Regression gates:** run typecheck, lint, build, exact changed-path oxfmt/ESLint and cumulative
  `git diff --check`. Run repository `format:check` and report the exact inherited baseline without
  rewriting frozen/historical paths. Run affected People/Accounts/Transactions Chromium journeys
  and full Chromium with one worker/retries zero; E2E files are read-only in P16B.
- **Installed-CLI charter:** use only repository-installed headless `playwright-cli`, unique
  disposable session `p16b-impl-01` and a root-owned keyed server. P16D/E have not surfaced allocation
  and full settlement-source UI, so do not manufacture those claims. Preserve real onboarding with
  masked recovery words, default Me ownership, add Person/account/paid and non-paid transactions
  through existing controls, People/Accounts/Transactions navigation, honest no-allocation current
  result, reload, 390px/200%-zoom, dark/reduced-motion, named roles/state, clean console/network and
  boolean-only plaintext storage/request absence. Disclose excluded setup/tooling attempts.
- **Cleanup:** close/delete/list the CLI session, identify exact new CLI artifacts and ask root to
  stop the keyed server, restore generated tracked files and recoverably remove only current
  `.next`, `test-results` and exact current artifacts. Preserve older artifacts.
- **Evidence artifact:** record original BASE, dispatch/control HEAD, exact committed product HEAD,
  paths/index; API/result/issue model; red/green; named A–H; property seeds/oracle; automation,
  benchmark and sanitized manual evidence; current-caller behavior; inherited failures; cleanup;
  frozen boundaries; risks and any complete Q proposal. Format the artifact before freeze and never
  claim independent PASS.
- **Applicable guides:** `.claude/CLAUDE.md`, `.claude/rules/coding-style.md`,
  `.claude/rules/typescript-style.md`, `.claude/skills/components/SKILL.md` and
  `.claude/skills/e2e/SKILL.md`.
- **Decision rule:** if material ambiguity remains, write a complete `Q-PROPOSAL-P16B-01-*` in
  evidence, apply PROCESS hierarchy and continue without asking the human. No proposal may override
  canonical exact conservation, reject/no-normalization, currency isolation, source traceability or
  sole-engine clauses.
- **Frozen boundary:** scratch SHA
  `ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f`, checked set
  HS-001/HS-002/HS-004/HS-005/HS-006/HS-008/HS-010/HS-013/HS-014/HS-017/HS-018, all 21 normalized
  blocks exact; immutable FS-001
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines/25,441 bytes;
  SCOPE `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines/27,382 bytes.

## Independent review contract

- **Reviewer:** distinct `human_scratch_reviewer`; dispatch only after frozen evidence and this
  review transition are committed
- **Literal review BASE:** `4c102600240e2804b801c2a320e10164defb14ea`
- **Literal product/test HEAD:** `5242a2422cd86dd48eac07a4422491d5079ccd23`
- **Implementation evidence:** `evidence/P16B/implementation-01.md`
- **Sole reviewer artifact:** `reviews/P16B-review-01.md`
- **Reviewer writes:** the new review file only; no product/test/evidence/ledger/config/frozen edit
  or commit
- **Required review focus:** independently prove sole-engine/export/caller closure, eligibility,
  currency fallback/isolation, exact signed positions/conservation, deterministic matching/netting,
  source traceability, typed issue exclusion, result immutability/input purity, named A–H, absence of
  vacuous tests, near-linear 100k behavior and honest current UI/manual boundary. Use reviewer-owned
  fixed seeds and integer/rational oracles different from implementation tests.
- **Verdict contract:** review the literal range with explicit findings, canonical mapping, exact
  commands/seeds/counts/timings, affected/full gates, installed-CLI evidence, cleanup/Q proposals and
  one PASS/FAIL. Any competing settlement callable, float rounding, normalization, lost minor unit,
  cross-currency net, lost source contribution, unstable ordering, invalid-data plausible total,
  caller false-settled state or unsupported performance claim fails.

## Next root action

Commit the frozen P16B evidence and review transition, then dispatch `human_scratch_reviewer` over
literal range
`4c102600240e2804b801c2a320e10164defb14ea..5242a2422cd86dd48eac07a4422491d5079ccd23`
with sole output `reviews/P16B-review-01.md`. Keep HS-009 unchanged and FS-001 immutable/open.
