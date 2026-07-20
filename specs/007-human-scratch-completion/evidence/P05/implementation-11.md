# P05 Implementation Evidence — Revision 11

## Immutable dispatch boundary

- Package/scope/revision: `P05` / `HS-015` / `11`.
- Original package BASE: `007651beb814d98646aa2e786801b647e2abd0b5`.
- Pre-implementation HEAD: `71b38d71aa17fa843f0c9354bf78c20a0d3b4400`.
- Canonical `Q-012` requires same-identity authorized operations to enter the existing serialized
  remote-import path and a true extension-backed Chrome Duplicate Tab live regression.
- Writable implementation paths are exactly `src/lib/sync/manager.ts` and
  `tests/e2e/tab-duplication.spec.ts`.
- Sole new worker artifact: `specs/007-human-scratch-completion/evidence/P05/implementation-11.md`,
  created before any service or implementation mutation and left uncommitted.
- At dispatch, HEAD matched the literal pre-implementation HEAD, the index and untracked set were
  empty, and Git-visible dirt was exactly root-owned unstaged `HANDOFF.md` and `PROGRESS.md`.
- All prior evidence/reviews, every other product/test path, Supabase config, dependency, migration,
  transport/CRDT/Loro, control/task, frozen-source and scratch-marker paths remain read-only.

## Validation plan

1. Remove only the same-public-key comment and early return from `SyncManager.initialize()`, leaving
   the exact-vault callback and serialized `applyRemoteUpdate(update.encryptedData)` unchanged.
2. Retain every existing extension-backed cache/hydration assertion. Background the receiver,
   navigate both authenticated duplicates to Transactions, capture console/page errors before the
   mutation, create one normal-UI transaction, and assert within 15 seconds: exact matching row
   count one in each tab, fixture vault op count one, receiver `sync.pushOps` delta zero and no
   errors.
3. Use true `chrome.tabs.duplicate()` only—no `window.open`, `context.newPage`, storage copying,
   receiver focus/reload, polling substitute, sleep, retry, weakened count or timeout increase.
4. Run focused and repeated duplicate/Realtime E2E, full zero-retry E2E, fresh and seeded-upgrade
   database audits, complete unit/integration/static/build/format/diff, and the installed CLI owner/
   member/outsider/duplicate/background charter.
5. Restore generated files, close browser/development processes, remove browser artifacts, reset the
   local database, verify frozen-source integrity, exact-stage only the two authorized paths and
   leave this evidence uncommitted. Any newly proven owner routes to an exact revision-12 proposal
   without widening.

## Implementation

- `SyncManager.initialize()` no longer discards an authorized exact-vault insert merely because its
  author hash equals the current identity. The exact-vault Realtime callback and existing serialized
  `enqueueRemoteOperation(() => applyRemoteUpdate(update.encryptedData))` path are otherwise
  byte-unchanged. No per-tab identifier, schema, payload, transport or CRDT change was added.
- The existing extension-backed test still creates its second page only through
  `chrome.tabs.duplicate()`, and retains all onboarding, session-storage, IndexedDB and
  authenticated hydration assertions. It now captures console/page errors before mutation, keeps the
  original page as the non-selected receiver, navigates both pages to Transactions, waits for
  truthful `Saved` state, and creates one transaction through the normal form in the selected
  duplicate.
- The regression requires, within the unchanged 15-second bounds, exactly one matching row in each
  tab, exactly one permanent operation for the validated fixture-vault UUID, no receiver
  `sync.pushOps` request above its pre-mutation baseline and no collected browser errors. Its global
  timeout remains 60 seconds. There is no receiver focus/reload, product-data polling, sleep, retry,
  count weakening or timeout increase.

## Focused and repeated browser validation

- The first focused diagnostic stopped before mutation because an added assertion expected the
  original non-selected Chrome tab to report `document.visibilityState === "hidden"`. Headless
  extension Chromium reported `visible` for both tabs even though the receiver was never selected.
  That browser-engine property was not an acceptance requirement in `Q-012`; only those two brittle
  property assertions were removed. The receiver remained non-selected and the required no-focus,
  no-reload behavior stayed intact. Truthful `Saved` assertions were added on both sides.
- After a fresh reset, the corrected focused extension journey passed **1/1** in 8.3 seconds (13.4
  seconds total). It proved exact one-row convergence, one scoped permanent op, receiver push delta
  zero and zero captured errors through a real Chrome Duplicate Tab operation.
- After another fresh reset, serial paired repetition of `tab-duplication.spec.ts` and
  `realtime-security.spec.ts` with `--workers=1 --repeat-each=3 --retries=0` passed **6/6** in 1.2
  minutes. Duplicate-tab iterations were 6.9, 6.9 and 6.9 seconds; Realtime-security iterations were
  16.1, 14.2 and 14.7 seconds.

## Database, unit, static and broad browser gates

- Fresh migrations 005–008 plus `tests/database/rls-audit.sql` passed **87/87** assertions.
- A reset to migration 005 loaded `legacy-upgrade-fixture.sql`, normal migration-up applied
  006/007/008, and `legacy-upgrade-audit.sql` passed **27/27** assertions. A normal no-seed reset
  restored the current schema afterward.
- Vitest passed **1,170/1,170** tests across 47 files. ESLint passed with zero errors and the 13
  pre-existing warnings. TypeScript passed.
- Production build passed compilation, TypeScript, page collection and all 17 route generations.
  `git diff --check` passed.
- Repository `format:check` remained red only on root/frozen control/source files `DECISIONS.md`,
  `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md` and `specs/human-scratch.md`, plus this
  then-draft evidence. The two implementation paths were format-clean; this evidence is formatted
  before handoff.
- A fresh-reset ordinary four-worker Playwright run with `--retries=0` passed **81/81** in 1.4
  minutes. The strengthened duplicate-tab journey and Realtime security journey both passed under
  normal concurrent load.

## Installed CLI charter and finite stop

- A fresh compatible-key development server was started with the local Realtime container's
  symmetric key derived in-memory, without printing or persisting it. The installed repository CLI
  completed owner onboarding while recovery words stayed concealed and unretained. Vault Settings
  rendered `Saved`; authorizations/revocation returned 200; console errors were zero; resource URLs
  contained no token/authorization/secret parameter and no legacy `vault_updates` traffic.
- A plain CLI `tab-new` does not clone session storage and correctly reached Unlock, so it was
  discarded. From the authenticated owner page, `window.open` created an opener sibling whose
  session storage was browser-cloned. This is the installed CLI's available same-context manual
  topology, not a substitute for the separate automated true `chrome.tabs.duplicate()` proof. Both
  pages reached Transactions, reported `Saved`, exposed two online Presence entries and completed
  successful scoped authorization requests with zero console errors.
- The selected sibling created one transaction through the normal UI while the original receiver
  remained genuinely backgrounded. The server push succeeded. The original background page did not
  expose the matching transaction row within the unchanged 15-second bound. It later converged to
  the exact same one-row state without receiver selection, reload, product polling or another
  mutation. Thus revision 11 fixes the prior permanent same-identity discard, but the installed CLI
  proves a distinct delayed hidden-page delivery/render boundary beyond the accepted live bound.
- Per the finite stop, no retry, timeout increase, receiver focus/reload, member/outsider
  continuation or remaining CLI charter followed. Automated owner/member/adversarial coverage
  remains green, but the complete installed CLI charter is not claimed.

## Q-PROPOSAL-P05-11-01 — keep hidden same-identity siblings inside the live bound

- **Raised by/package/revision:** `human_scratch_implementer`, P05, revision 11, 2026-07-20.
- **Context and evidence:** the exact extension-backed Duplicate Tab regression passed once focused,
  three paired repetitions and the concurrent full suite, but headless extension Chromium reports
  both pages as visible. The installed CLI opener sibling supplies a genuinely hidden original page:
  scoped authorization, Presence, push persistence, Saved state and console/network security were
  green, and the row eventually converged without focus/reload, but it was absent at 15 seconds.
- **Why existing authority does not decide it:** `Q-012` authorizes only removal of the same-public-
  key early return and an exact two-path regression. It does not authorize client construction,
  background transport scheduling or virtualized hidden-page render changes. The extension test's
  non-selected-tab topology cannot by itself demonstrate a hidden document because Chromium reports
  `visibilityState` as visible in that environment.
- **Options considered:** (A) accept eventual hidden-page convergence or raise the timeout; (B) add
  reload, focus catch-up or polling; (C) treat the passing non-selected extension page as
  sufficient; (D) add a page-local durable-pull timer; or (E) enable the installed Supabase Realtime
  client's supported Web Worker background heartbeat flow and revalidate the exact hidden charter. A
  violates the unchanged live bound, B violates push-driven acceptance, C ignores the installed-CLI
  counterexample, and D adds another throttled main-thread timer plus duplicate pulls. E targets the
  isolated socket client at the background scheduling boundary without changing authorization,
  payloads or CRDT behavior.
- **Reversible default selected to continue:** choose E for revision 12, writable exactly at
  `src/lib/supabase/client.ts` and `tests/e2e/tab-duplication.spec.ts`. Set `worker: true` only on
  the existing isolated Realtime client configuration while retaining `eventsPerSecond: 10`, and
  retain the true `chrome.tabs.duplicate()` regression unchanged except for additional
  worker/background evidence that does not focus/reload the receiver. The installed dependency
  describes this option as a Web Worker side flow for keeping the Realtime heartbeat alive under
  background throttling. First reproduce the installed-CLI hidden receiver with timestamp capture at
  socket receipt, remote import and DOM publication; if worker mode does not bring the exact row
  inside 15 seconds, stop without widening into manager/provider/table paths and return the measured
  single owner.
- **Decision-hierarchy basis:** explicit background/live acceptance and the fixed 15-second bound,
  followed by real installed-browser evidence, then smallest reversible owner-scoped correction.
- **Impact and risk:** enabling generic workers or adding hidden-page catch-up without timing proof
  could create extra sockets, refresh storms, CSP/deployment dependencies, duplicate pulls or a
  false UI-only fix. Instrument-first ownership keeps encrypted payloads and credentials out of
  evidence while avoiding protocol widening.
- **Reversal or migration path:** remove `worker: true` and its regression evidence. No schema,
  credential, channel, payload or persisted-data migration is proposed.
- **Human review still useful after completion:** no human decision blocks continuation. Independent
  review should reproduce the installed-CLI 15-second failure, confirm eventual no-focus
  convergence, and freeze one exact owner before revision-12 implementation.

## Frozen sources and cleanup

- The CLI browser was closed and its disposable session data deleted. The compatible-key development
  server was stopped. Generated `test-results`, `.playwright-cli` and any `playwright-report` were
  moved to trash; no matching CLI, Chrome or Next development process remains.
- Generated `next-env.d.ts` was restored byte-for-byte. The final normal no-seed database reset
  applied migrations 005–008 and left exact zero counts for `auth.users`, all nine public base
  tables and `realtime.subscription`.
- Realtime remains `public.ecr.aws/supabase/realtime:v2.112.6`; its internal migration ledger has 79
  rows and the filter composite is exactly `column_name:text`, `op:realtime.equality_op`,
  `value:text`, `negate:boolean`. Logs contain no `MigrationCountMismatch`.
- `specs/human-scratch.md` remains SHA-256
  `c74a2a782543d00880fa30a771be4e39c75d89889e484ee46570fb4a6cf0ecdd`, exactly 350 lines and 24,243
  bytes, matching the rolling boundary. HS-015 and every marker remain untouched, so the previously
  clean 21 normalized blocks and authorized checked set are unchanged.
- Canonical FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, exactly 715 lines and 25,441
  bytes. `SCOPE.json` remains SHA-256
  `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, exactly 450 lines and 27,382
  bytes.

## Exact handoff boundary

- The implementation commit exact-stages only `src/lib/sync/manager.ts` and
  `tests/e2e/tab-duplication.spec.ts`. Root-owned unstaged `HANDOFF.md` and `PROGRESS.md` remain
  preserved; this sole evidence remains uncommitted.
- Revision-11 implementation commit: `7f0b0710e820b87be2ee8877a3b7693d90e5e505`.
- Review must use literal cumulative range
  `007651beb814d98646aa2e786801b647e2abd0b5..7f0b0710e820b87be2ee8877a3b7693d90e5e505`, verify the
  two-path revision-11 diff, reproduce the installed-CLI finite stop, and confirm or correct
  `Q-PROPOSAL-P05-11-01` before any HS-015 marker or completion claim.
