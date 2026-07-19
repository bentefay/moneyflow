# P05 Independent Review — Revision 04

## Verdict

**FAIL.** Revision 04 resolves the local Realtime compatibility boundary and correctly strengthens
the sanitized registration evidence. The recreated service is Realtime v2.112.6 with 79 internal
migrations and the matching four-field filter composite; logs repeatedly report
`Migrations already up` and contain no `MigrationCountMismatch`. The ordinary real two-context
journey now registers authenticated exact-grant subscriptions, receives a genuine imported
`postgres_changes` event, and shows the imported row in the member UI without refresh. This closes
revision-03 F-001/F-002 and proves the current private sync transport works when the local service
state is compatible.

The live journey remains incomplete. The same ordinary zero-retry run deterministically reaches the
inline-edit step, changes the owner input to the new value, and then consumes the unchanged global
120-second timeout. The test stores a locator whose CSS selector requires the original value, calls
`fill()` with a different value, and then reuses the now-empty lazy locator for `press("Enter")`.
The failure snapshot shows the new value in the active owner input, directly confirming the
self-invalidating locator. Delete, refresh, removal and final cleanup assertions therefore never
execute. HS-015 cannot pass yet.

The exact revision-05 boundary adds only `tests/e2e/realtime-security.spec.ts`; the revision-04
helper is accepted and is not writable again. No product, transport, dependency, configuration,
migration, unit, SyncManager, CRDT or Loro path is justified. No timeout, incoming-frame, security,
lifecycle or UI assertion may be weakened.

## Immutable review boundary

- Package/revision: `P05/04`, cumulative `HS-015` review.
- Literal cumulative range:
  `007651beb814d98646aa2e786801b647e2abd0b5..4233b59c930117e7b160ac142a6f953b988b2dc8`.
- Revision-04 implementation commit: `4233b59c930117e7b160ac142a6f953b988b2dc8`
  (`test: tighten realtime subscription evidence`). Its exact parent is
  `abbb4f52439025401d3ca858f9809b41daddcbe3`.
- The revision-04 commit changes only the authorized `tests/e2e/helpers/realtime.ts`, with 12
  insertions and one deletion. It contains no product, config, dependency, migration, unit, other
  test, control, evidence, review, scratch, FS-001, `.claude` or `.codex` change.
- Frozen revision-04 evidence:
  `specs/007-human-scratch-completion/evidence/P05/implementation-04.md`, independently verified
  SHA-256 `fc7832cc801210332c960b38d37bdfc87c6c3ae5d9709c10ccf6ed3d8928fb2c`, 137 lines and 9,720
  bytes.
- Prior immutable revision-03 FAIL review:
  `specs/007-human-scratch-completion/reviews/P05-review-03.md`, independently verified SHA-256
  `72934172c159a290695b895ddf15e85933a60cf25b240811e264dc7805c56348`, 283 lines and 19,443 bytes.
- `git diff --check BASE..HEAD` passes. The index is empty. Before this review artifact, Git-visible
  dirt was exactly root-owned unstaged `HANDOFF.md`/`PROGRESS.md` plus the frozen untracked
  revision-04 evidence.

## Finding

### F-001 — High — the value-qualified edit locator invalidates itself before Enter

The independent ordinary command was run from a verified-empty latest database with the signing
secret absent from the parent and retries disabled:

```text
env -u SUPABASE_JWT_SECRET pnpm exec playwright test \
  tests/e2e/realtime-security.spec.ts --workers=1 --reporter=list --retries=0
```

It collected one test, passed the identity, shared-vault, two-context join, transport-attribution
and incoming-import steps, then failed 0/1 after exactly the test's two-minute global timeout in
`push an encrypted inline edit while the member is foregrounded`. Passing the preceding assertions
is meaningful live evidence:

- at least one outgoing Postgres-change join and binding existed;
- at least two persisted `realtime.subscription` rows existed at attribution time;
- every row was authenticated and matched the strengthened exact live grant/current membership/
  active vault predicate; and
- the member received a genuine incoming `postgres_changes` event before the imported row became
  visible, with no refresh or pull substitution.

The reviewer failure output reports the global timeout and a subsequent closed-context cleanup
error. The frozen implementation run retained the more specific terminal call log
`locator.press: Test ended` for the original-value selector. Independent source and snapshot
evidence confirm the same call boundary without another retry:

```text
tests/e2e/realtime-security.spec.ts:138-140
const description = descriptionInput(owner, importedDescription);
await description.fill(editedDescription);
await description.press("Enter");
```

`descriptionInput()` builds `[data-testid="description-editable"][value="<requested value>"]`.
Playwright locators are lazy, so the last line re-resolves the original-value selector after
`fill()` has changed that value. The failure snapshot shows the owner textbox focused with
`Realtime encrypted edit`, while the row's pre-commit selection label still describes the imported
transaction. That exact state excludes an absent row, disabled editor, member-render or
transport-registration failure: the owner edit occurred and Enter was never delivered through the
invalidated locator.

A sanitized post-timeout query found exactly two permanent `vault_ops` rows, consistent with import
plus the local edit operation. Subscription rows were zero only after context/test cleanup, which is
expected and does not contradict the persisted rows observed by the test before the edit step.
Presence produced no authorization or console failure. The correct fix is to re-resolve the input by
its new value before pressing Enter, or use another selector that remains stable across the value
change. A row locator filtered by the old value would have the same lazy re-resolution defect and is
not an acceptable substitute.

Revision 05 should minimally use the new value and may assert focus before Enter, for example:

```text
await descriptionInput(owner, importedDescription).fill(editedDescription);
const editedInput = descriptionInput(owner, editedDescription);
await expect(editedInput).toBeFocused();
await editedInput.press("Enter");
```

It must retain the existing 120-second global timeout, 15-second live-delivery bounds,
incoming-frame ordering, member UI assertions, real contexts, exact registration aggregates and all
later security/ lifecycle steps. It must not use a forced action, arbitrary wait, retry, refresh,
polling substitute, mock or broad `.first()` selector to hide ambiguity.

## Revision-03 finding closures

### Compatible exact-project local service recreation

The revision-04 evidence records an aggregate all-zero guard immediately before repository-scoped
`pnpm exec supabase stop --no-backup` followed by `pnpm exec supabase start`. No direct Docker
volume deletion or foreign project target was used. Independent post-recreation inspection confirms:

| Boundary                | Result                                      |
| ----------------------- | ------------------------------------------- |
| Realtime image          | `public.ecr.aws/supabase/realtime:v2.112.6` |
| internal migration rows | 79                                          |
| active filter fields    | `column_name`, `op`, `value`, `negate`      |
| startup/reset log       | repeated `Migrations already up`            |
| migration mismatch      | none                                        |

An independent normal reset retained this exact compatible internal state and reapplied application
migrations 005–008. The ordinary E2E then registered and delivered the import, directly closing the
old v2.80.7/79-migration incompatibility. No CLI pin, product channel-mode or repository config
change is required.

### Strengthened sanitized exact-grant query

`tests/e2e/helpers/realtime.ts:345-365` now joins the grant to a current same-role membership and
non-deleted vault. It requires an unrevoked, unexpired sync grant plus authenticated role,
`vault_ops` table, sync purpose, exact vault/role and exact `vault:<grant vault>:sync` JWT topic.
The outer query remains limited to `public.vault_ops` subscription entities and returns only three
integer aggregates.

The helper emits no claim, grant, identity, membership, vault, topic, filter or payload content. Its
existing `execFileSync` argument-array boundary and aggregate parsing remain unchanged. The ordinary
test passed `total >= 2`, `authenticated == total`, and `liveExactGrant == total`, so the positive
predicate is exercised rather than merely inspected. Revision-03 F-002 is closed.

## Database and static validation

Independent database validation was repeated after service recreation:

- latest reset applied migrations 005, 006, 007 and 008;
- fresh `tests/database/rls-audit.sql` passed 87/87;
- seeded reset to migration 005, upgrade through 006/007/008 and
  `tests/database/legacy-upgrade-audit.sql` passed 27/27; and
- a final latest reset again applied 005–008 and left the application database empty.

Independent static/runtime results:

| Check                           | Result                                          |
| ------------------------------- | ----------------------------------------------- |
| exact helper-only revision diff | passed                                          |
| helper ESLint                   | passed                                          |
| helper Oxfmt                    | passed                                          |
| cumulative `git diff --check`   | passed                                          |
| typecheck                       | passed                                          |
| complete unit/integration suite | 47 files, 1,170/1,170 passed                    |
| fresh database audit            | 87/87 passed                                    |
| seeded upgrade audit            | 27/27 passed                                    |
| ordinary isolated Realtime E2E  | 0/1; import live, inline-edit locator timed out |

Build, full browser E2E, repeated Realtime, later delete/expiry/reconnect/removal continuations and
the installed Playwright CLI charter were not run after the exact deterministic locator failure.
Those gates cannot be represented as complete until the checked-in journey can progress beyond the
edit. Revision 05 must run them with retries disabled after the selector correction. This limitation
supports FAIL; it is not a waiver or PASS evidence.

## Q-PROPOSAL-P05-04-01 — repair only the self-invalidating inline-edit locator

- **Raised by/package/revision:** `human_scratch_reviewer`, P05, revision 04, 2026-07-20.
- **Context and evidence:** compatible Realtime now registers exact subscriptions and delivers the
  imported operation to the member without refresh. The journey then fills the owner editor with the
  new value but reuses a lazy locator constrained to the old value for Enter. Independent zero-retry
  reproduction times out in that exact step; the snapshot shows the new value focused and the
  database contains import plus edit operations.
- **Why existing authority does not decide it:** revision 04 authorized only the subscription
  aggregate helper. It could prove the new test owner but could not edit the journey spec.
- **Options considered:** (A) re-resolve the editor by its new value and keep every assertion and
  timeout; (B) use a locator stable across value changes with an explicit uniqueness/focus check;
  (C) increase the timeout/retry; or (D) widen into product/transport code. A is the smallest exact
  fix. B is acceptable only if it cannot lazily depend on the old value. C hides an empty locator,
  and D contradicts the registered/incoming-frame evidence.
- **Reversible default selected to continue:** choose **A**. Revision 05 adds exactly one writable
  implementation/test path:

```text
tests/e2e/realtime-security.spec.ts
```

Re-resolve `descriptionInput(owner, editedDescription)` after filling and press Enter through that
locator, optionally asserting it remains uniquely focused. Do not make
`tests/e2e/helpers/realtime.ts` writable again; revision 04 already commits and validates it. No
product, config, dependency, migration, unit, other E2E, SyncManager, CRDT or Loro path is
authorized.

- **Decision-hierarchy basis:** HS-015 requires genuine live import/edit/delete and removal denial;
  current incoming-frame evidence rules out product transport before the failing call. Repository
  E2E rules prohibit arbitrary waits and require behavior assertions through stable selectors.
- **Impact and risk:** a value-qualified replacement remains precise in this isolated one-row flow,
  but it must be uniquely resolved before Enter. Weakening the timeout or choosing an ambiguous
  input could create false green delivery evidence. Later delete, refresh and removal steps remain
  unproven until the corrected run reaches them.
- **Reversal or migration path:** the one-file test correction has no schema, service or encrypted
  data impact and is independently revertible. If a stable Enter exposes a product failure, stop
  with that exact counterexample and owner rather than widening preemptively.
- **Human review still useful after completion:** no product decision blocks continuation. Human
  review is optional only if a different equally stable selector convention is preferred.

Required revision-05 evidence includes ordinary and repeated retries-zero import/edit/delete; exact
subscription and incoming-frame ordering; private Presence; concurrent/duplicate/background tabs;
credential expiry, reconnect and offline catch-up; lock/unlock, vault switch and membership removal;
final revocation/pruning; socket URL/log/artifact sanitation; fresh and upgrade audits; complete
unit/lint/type/build/format/diff/E2E; and the installed headless Playwright CLI
owner/member/outsider/duplicate/background charter. No refresh or polling may fake live delivery.

## Frozen sources and final cleanup

- `specs/human-scratch.md` remains SHA-256
  `c74a2a782543d00880fa30a771be4e39c75d89889e484ee46570fb4a6cf0ecdd`, exactly 350 lines and 24,243
  bytes. All 21 ordered blocks normalize byte-for-byte to `SCOPE.json`; the checked set is exactly
  HS-002, HS-014, HS-017 and HS-018. HS-015 remains unchecked.
- FS-001 remains SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, exactly
  715 lines and 25,441 bytes.
- `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  exactly 450 lines and 27,382 bytes.
- Reviewer-generated `next-env.d.ts` and ignored Playwright result changes were removed. No local
  Playwright CLI session was created. The final latest database has zero auth users, public table
  rows, subscriptions and permanent ops. Realtime services remain running in the compatible
  v2.112.6/79-migration/four-field state with no mismatch warning.

## Exact next revision

Root should preserve revision-01/02/03/04 evidence and reviews as immutable, transcribe
`Q-PROPOSAL-P05-04-01`, set P05/HS-015 to `changes_requested`, and dispatch P05 revision 05 against
the same original BASE. The sole writable product/test path is
`tests/e2e/realtime-security.spec.ts`; revision 04's helper and every product/config/migration path
remain read-only. Revision 05 must produce a new exact committed HEAD and immutable
`evidence/P05/implementation-05.md`, then receive independent review in `reviews/P05-review-05.md`.
No HS-015 marker may change before that cumulative range passes.
