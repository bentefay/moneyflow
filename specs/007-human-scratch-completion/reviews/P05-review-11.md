# P05 Independent Review — Revision 11

## Verdict

**FAIL.** Revision 11 correctly closes the previously proven permanent same-identity sibling drop.
The exact two-path change removes only the public-key early return, retains the serialized encrypted
remote-import path, and strengthens the real extension-backed `chrome.tabs.duplicate()` journey.
After fresh resets, the journey independently passed once and then 3/3 with retries disabled. Its
strict one-row-per-tab, one permanent fixture-vault op, zero receiver-push delta and zero browser-
error assertions remain intact.

The package cannot pass on the supplied manual evidence. The implementation artifact says the
repository CLI created a "genuinely hidden" receiver that missed 15 seconds and later converged, but
it records no visibility-state or causal timestamps. Independent use of the required installed
headless CLI showed both opener pages were `document.visibilityState === "visible"`. In a sanitized
instrumented run, the alleged receiver received the relevant Postgres frame at 2,549 ms, entered the
exact Loro `import()` at 2,549 ms, published the row to the DOM at 2,591 ms and converged rows 1/1
inside the live bound. That run does not substitute for a truly hidden-page check; it proves the
evidence topology cannot support the hidden claim.

`Q-PROPOSAL-P05-11-01` is rejected. In installed `@supabase/realtime-js` 2.110.7, `worker: true`
moves only the heartbeat interval to a Worker. The WebSocket, frame decoding, heartbeat send,
credential callback, decrypt/import and React publication stay on the page. The proposed default
therefore does not target any measured late boundary. It also creates one Blob worker per isolated
Realtime client, disconnects the socket on worker startup/runtime error, and adds CSP deployment
surface. No revision-12 product path is authorized until a supported truly hidden reproduction
identifies whether the first late boundary is socket receipt, import or DOM publication.

HS-015 remains incomplete, no scratch marker is authorized, and the implementation evidence's own
finite stop leaves the owner/member/outsider/background CLI charter incomplete.

## Immutable review boundary

- Package/revision: `P05/11`, cumulative `HS-015` review.
- Literal cumulative range:
  `007651beb814d98646aa2e786801b647e2abd0b5..7f0b0710e820b87be2ee8877a3b7693d90e5e505`.
- Revision-11 implementation commit: `7f0b0710e820b87be2ee8877a3b7693d90e5e505`
  (`fix same-identity duplicate tab live sync`). Its exact parent is
  `71b38d71aa17fa843f0c9354bf78c20a0d3b4400`.
- Revision 11 changes only `src/lib/sync/manager.ts` and `tests/e2e/tab-duplication.spec.ts`, with
  100 insertions and 5 deletions.
- Frozen revision-11 evidence:
  `specs/007-human-scratch-completion/evidence/P05/implementation-11.md`, independently verified
  SHA-256 `2e57eb4e8540b364ceb8369bef5b508b4f9cc442e430723435503ee03d1bcb90`.
- Prior immutable revision-10 FAIL review:
  `specs/007-human-scratch-completion/reviews/P05-review-10.md`, independently verified SHA-256
  `51bd77e62afb1adb08cd617db974d1df85f51eda7c7b06c20cd42d838aa7c9f8`.
- `git diff --check BASE..HEAD` passes and the index is empty. Before this review artifact,
  Git-visible dirt was exactly root-owned unstaged `HANDOFF.md`/`PROGRESS.md` plus the frozen
  untracked revision-11 evidence.

## Revision-10 finding closure — same-identity operations enter the remote queue

The manager diff is the exact authorized deletion. `SyncManager.initialize()` no longer compares
`update.authorPubkeyHash` to the local identity. The exact-vault callback still calls only:

```ts
await this.enqueueRemoteOperation(() => this.applyRemoteUpdate(update.encryptedData));
```

The queue still serializes Realtime delivery and durable catch-up. `applyRemoteUpdate()` still
disables auto-sync, decrypts the ciphertext, imports into the existing Loro document, restores
auto-sync and reports errors. No schema, topic, filter, grant, payload, snapshot, CRDT API, per-tab
identifier or migration changed.

The strengthened test retains its extension fixture and invokes the extension-backed
`chrome.tabs.duplicate()` operation. It keeps the cached-navigation and authenticated-hydration
checks, navigates both authenticated duplicates to Transactions, waits for truthful Saved state,
creates one transaction through the normal UI and requires:

- exactly one matching row in the sender and receiver within the existing 15-second bounds;
- exactly one permanent operation for the validated fixture-vault UUID;
- no receiver `sync.pushOps` request above its pre-mutation baseline; and
- no captured console or page error.

There is no receiver reload, focus catch-up, product-data polling, retry, arbitrary sleep, count
weakening or timeout increase. Independent validation passed:

| Gate                                         |             Result |
| -------------------------------------------- | -----------------: |
| focused true Duplicate Tab after fresh reset |         1/1, 8.0 s |
| fresh-reset repeat, one worker, retry 0      | 3/3, 8.0/7.0/7.0 s |

This independently closes review-10 F-001 and supports the narrow revision-11 product diff. It does
not establish a hidden document: the implementation evidence itself records that its extension
browser reports both pages visible.

## F-001 — High — the alleged hidden-page counterexample has no hidden page

The review followed the repository's required installed `playwright-cli`, unique disposable session,
normal UI onboarding and opener-sibling topology. Recovery words, identity material, vault IDs,
grants, encrypted payloads and socket bodies were not printed or retained.

After selecting the sibling, one evaluation over both pages returned:

```text
page 0 visibility: visible
page 1 visibility: visible
```

This is the same headless constraint already acknowledged for the checked-in extension journey. The
process requires the manual CLI to be headless and explicitly forbids headed mode. A headed CLI
launch is therefore not an acceptance route; diagnostic launch attempts under the desktop display
and Xvfb also did not register a usable CLI browser and were terminated rather than waited on.
Chromium's removed `Emulation.setPageVisibilityState` CDP command is unavailable, and lifecycle
emulation would not be a real hidden tab in any case.

The implementation artifact nevertheless labels its receiver "genuinely backgrounded" and "genuinely
hidden" without recording `document.visibilityState`. Its later-convergence statement has no elapsed
timestamp and no timestamp for socket receipt, remote import or DOM publication. Non-selection alone
is not evidence of a hidden document in this browser topology.

The independent visible-page diagnostic instrumented three sanitized boundaries without retaining
payloads:

| Signal                                         | Elapsed from UI mutation |
| ---------------------------------------------- | -----------------------: |
| receiver `postgres_changes` frame              |                 2,549 ms |
| exact receiver Loro document `import()`        |                 2,549 ms |
| matching transaction published in receiver DOM |                 2,591 ms |
| final exact receiver row count                 |                        1 |

The Loro document was found through the existing React provider fiber and only its instance
`import()` was wrapped for an elapsed timestamp. A DOM `MutationObserver` recorded publication. The
receiver remained `visible` before and after the mutation. Socket and import timestamps being equal
are consistent with the source path; DOM followed by 42 ms. This is valid ownership instrumentation
for the visible topology, not a waiver or substitute for the missing truly hidden reproduction.

Consequently, independent evidence neither reproduces a delay beyond 15 seconds nor supports the
claim that background heartbeat owns it. The implementer's self-reported red charter still prevents
PASS, while the evidence defect prevents assigning a safe product correction.

## Rejected Q-PROPOSAL-P05-11-01 — Worker heartbeat is not the message worker

The installed dependency accepts `worker?: boolean`, but its implementation is narrower than the
proposal assumes:

- `WORKER_SCRIPT` contains only a `setInterval()` that posts `keepAlive` to the page.
- The page's `workerRef.onmessage` handler calls `this.sendHeartbeat()`; the Worker does not own or
  send on the WebSocket.
- `socketAdapter`, frame decoding and channel callbacks remain in `RealtimeClient` on the page.
- Every sent heartbeat calls `_setAuthSafely()` for callback credentials. The repository's
  credential manager single-flights/caches this normally, but worker mode must still be assessed
  against refresh and grant rotation rather than described as credential-neutral.
- With no `workerUrl`, the dependency creates a Blob URL. The repository currently defines no CSP
  header, but a deployed `worker-src`/`script-src` policy could block it.
- Any Worker error terminates the Worker and immediately disconnects the Realtime socket; there is
  no fallback to the page heartbeat.
- The repository creates isolated Realtime clients for sync and Presence. Worker mode does not add
  another socket, but it adds a Worker for every live isolated client/socket rather than sharing one
  background transport.

The downstream processing path is also synchronous at the important boundary. After decrypt,
`doc.import()` synchronously invokes Loro Mirror's document subscriber; Mirror synchronously updates
state and calls each subscriber, which calls React `setState`. Only the eventual React commit is
scheduled later. Therefore a measured hidden run must distinguish:

```text
socket receipt -> decrypt/serialized import -> Mirror notification -> React DOM commit
```

If socket receipt is already late, connection lifecycle may own the fault. If receipt is timely but
import is late, the manager queue/decrypt path owns it. If import is timely but DOM is late, React/
provider publication owns it. A Worker heartbeat must not be selected before that first late edge is
observed.

The proposal's suggested revision-12 paths—`src/lib/supabase/client.ts` and
`tests/e2e/tab-duplication.spec.ts`—are therefore not confirmed. The automated duplicate test cannot
prove the proposed Worker effect because both documents are visible, and `client.ts` would apply
worker mode to every isolated Realtime purpose without a causally matched regression.

### Q-PROPOSAL-P05-11-R01 — Require a supported hidden topology before another product diff

- **Raised by/package/revision:** `human_scratch_reviewer`, P05, revision 11, 2026-07-20.
- **Context and evidence:** revision 11's true extension duplicate is green, while the claimed
  installed-CLI hidden counterexample has no visibility proof and cannot be reproduced under the
  required headless CLI. Both independent pages are visible and the measured frame/import/DOM path
  completes in 2.591 seconds.
- **Why existing authority does not decide it:** HS-015 requires background/foreground and duplicate
  live behavior, HANDOFF requires a genuinely hidden timing reproduction, and PROCESS requires the
  installed manual CLI to be headless while forbidding headed mode. The available headless browser
  does not create a hidden document when another page is selected.
- **Options considered:** (A) add `worker: true` without causal proof; (B) treat non-selection as
  hidden; (C) emulate visibility/lifecycle; (D) raise the timeout or add focus/reload/polling; or
  (E) freeze product scope and first establish a supported real hidden topology with the same three
  sanitized timestamps. A is owner-unproven and adds worker/CSP/failure surface, B repeats the
  evidence defect, C is a test-only substitute, and D violates live acceptance.
- **Reversible default selected to continue:** choose E. Do not authorize a revision-12 product or
  test diff yet. Root should record the tool/acceptance conflict and establish an approved mechanism
  that produces and verifies `document.visibilityState === "hidden"` without focus/reload, then
  dispatch a diagnostic revision with no product paths. That diagnostic must record visibility at
  mutation/15 seconds/eventual completion plus socket receipt, exact Loro import and DOM publication
  elapsed times. Only its first late edge may determine the next exact writable owner. If no
  supported hidden mechanism is approved, P05 is `blocked_external`; a client-worker mutation is not
  the fallback.
- **Decision-hierarchy basis:** explicit hidden/live acceptance and review-process constraints,
  followed by measured installed behavior and the smallest reversible no-product diagnostic.
- **Impact and risk:** this prevents an unmeasured global change to every isolated Realtime client,
  avoids falsely certifying a visible page as hidden and preserves the already green revision-11
  manager correction while the remaining acceptance route is made executable.
- **Reversal or migration path:** no product, schema, protocol, dependency or persisted-data change;
  retire the diagnostic once a supported topology yields causal timing evidence.
- **Human review still useful after completion:** no human product decision is needed, but root must
  reconcile the executable review mechanism before another implementation dispatch.

## Validation limits and cleanup

The exact changed E2E was independently repeated in proportion to risk. The implementation evidence
also records green 1,170/1,170 Vitest, lint, TypeScript, build, fresh 87/87 and upgrade 27/27 pgTAP,
paired Realtime repetition 6/6 and full zero-retry 81/81 E2E. Those broad gates were not all
repeated after F-001 because the assigned hidden charter and proposal ownership were already
non-reviewable.

- Final `pnpm db:reset` reapplied migrations 005–008 and left exact zero counts for `auth.users`,
  all nine public base tables and `realtime.subscription`.
- Realtime remains `public.ecr.aws/supabase/realtime:v2.112.6`; its internal migration ledger has 79
  rows and recent logs contain zero `MigrationCountMismatch` entries.
- All disposable CLI sessions were closed. Reviewer-generated `.playwright-cli` and `test-results`
  were moved to trash; no `playwright-report` remains. The compatible development server, diagnostic
  display and reviewer browser processes were stopped. Generated `next-env.d.ts` was restored.
- `specs/human-scratch.md` remains SHA-256
  `c74a2a782543d00880fa30a771be4e39c75d89889e484ee46570fb4a6cf0ecdd`, exactly 350 lines and 24,243
  bytes. HS-015 remains unchecked.
- Canonical FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, exactly 715 lines and 25,441
  bytes. `SCOPE.json` remains SHA-256
  `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, exactly 450 lines and 27,382
  bytes.

## Exact next action

Root should preserve revision-01 through revision-11 evidence/reviews as immutable, transcribe
Q-PROPOSAL-P05-11-R01, keep HS-015 unchecked and set P05 to `changes_requested`. Do not dispatch the
proposed `client.ts` Worker change. First reconcile the allowed review mechanism with the required
truly hidden document and dispatch a no-product diagnostic revision at unchanged product HEAD. Only
a causal hidden timing result may authorize the next exact product/test paths. If the mechanism
cannot be made executable within repository authority, classify P05 `blocked_external` rather than
widening, weakening the 15-second bound or mislabeling a visible page.
