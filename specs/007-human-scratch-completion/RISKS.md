# Risk Register

| ID    | Area         | Risk                                                                                                                  | Mitigation / required evidence                                                                                                                                   | Status    |
| ----- | ------------ | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| R-001 | Worktree     | User-owned scratch edits or unrelated dirty work are overwritten/staged                                               | P00 review 02 verified exact inventory and preserved scratch; continue apply_patch, exact-path staging and no broad resets/adds                                  | open      |
| R-002 | Scope        | Scratch changes after freeze are silently missed or absorbed                                                          | P00 review 02 verified checksum/21 blocks; repeat at every boundary and maintain semantic drift log                                                              | open      |
| R-003 | Security     | Service-role access, claimed identity or incorrect RLS gives false isolation confidence                               | P04/02 establishes signed self identity/RLS; P06 PASS removes dead blob UPDATE/endpoints while preserving strict empty self registration and exact grants; P05/P19 retain their new surfaces | mitigated |
| R-004 | Realtime     | Live channels use the wrong source, lose authorization, churn/reconnect, miss durable ops or outlive access            | P05/11 closes same-identity drop with strict true-duplicate greens and the client subscribes to authoritative `vault_ops`; D-017 reopens P05/13 to complete adversarial rejection, reconnect/offline catch-up and token expiry/refresh/revoke tests plus mock-driven background re-sync behavior; the unmeasured hidden-tab timing edge is an accepted non-issue | open      |
| R-005 | Crypto       | Invite/passkey changes leak or replace the user's master identity                                                     | P07/04 PASS binds sole authenticated `crypto_box`, active-generation epoch history, capability preflight, fragment zeroization and exact-operation transition; P08 must implement every proof before risk closes | open      |
| R-006 | CRDT         | Alias/GC/undo changes produce chains, lost references, or undo remote work                                            | P12/08 cumulative PASS proves direct-only rewrites, backlink-safe collection, private-shadow lifecycle/convergence, public callback isolation, `system:gc` Undo exclusion and user-only Undo across selector/action/edit boundaries | mitigated |
| R-007 | Migration    | Schema/dependency upgrades strand existing local or server data                                                       | P06 PASS proves fresh 97/97 and seeded 005→009 40/40 with exact identity/normalized encrypted state; P07/01 requires epoch-history/transition recovery and accepted-membership reconciliation in P08 migration/reversal proof | open      |
| R-008 | Performance  | Virtualized cells, alias lookup, GC, or automation cause jank/GC churn                                                | P12/08 cumulative PASS proves RAF item/time-bounded physical maintenance plus path-lazy public views with zero unrelated-tree visits; broader grid/automation performance remains P16D/P17D/P21 | open      |
| R-009 | E2E          | Retry-masked tests or shared-state tests remain flaky                                                                 | P15/02 PASS closes five previously untested boundaries with focused F-01–F-05 and preservation matrices 12/12 x3 each, affected 69/69 and full 102/102 with one worker/no retries; P21 retains broad final gates | open      |
| R-010 | UX/a11y      | Feature technically works but keyboard/focus/responsive behavior feels poor                                           | P15/02 PASS measures alert contrast 10.0251:1 light/16.1651:1 dark and contains guidance/alerts on both surfaces at 390x844/200% zoom with focus, pointer and reduced-motion preservation; P18/01 review records two pre-existing non-blocking UX items untouched by P18 — the "Valid recovery phrase" indicator at 3.21:1 below AA NB-7 and controlled-mode gap-collapse word migration NB-6 — for a future a11y/UX pass; P21 retains broad UX/a11y gates | open      |
| R-011 | External     | TanStack PR or WebAuthn PRF automation support is unavailable                                                         | P19/01 empirically confirmed repo-pinned Playwright 1.61.1 Chromium drives PRF via CDP `addVirtualAuthenticator` `hasPrf:true` (create-time results absent, assertion-time deterministic 32B present), so the WebAuthn-PRF half is NOT blocked and every passkey journey has real automated E2E; residual real-hardware attestation is Q-023, TanStack half remains; primary-source gate, capability fallback, dated rechecks; never fake delivery | open      |
| R-012 | Context      | Long-running coordinator loses the exact current state                                                                | Durable PROGRESS/HANDOFF/reviews; BASE..HEAD; recovery protocol                                                                                                  | open      |
| R-013 | Evidence     | Secrets, phrases, financial records, identity/vault metadata, or browser state enter artifacts or URLs                | P04/02/P06 preserve encrypted request/storage boundaries; P16B/05 review discloses one unnecessary supported phrase reveal into disposable CLI/YAML, never copied/used, then exact profile/server/28-artifact cleanup; P18/01 review NB-5 notes the HS-019 canonical password field's value serializes into Playwright page snapshots (gitignored `.playwright-cli/`+`test-results/`, deleted, no git/log/URL/network/storage leak — verified), so future `/new-user` manual charters must delete CLI artifacts afterward; future profiles must keep phrases masked and repeat boolean-only checks | open      |
| R-014 | Source       | Canonical settlement authority is edited, partially selected or treated as lower priority                             | P00 verified immutable SHA/715 lines/25,441 bytes/whole-file FS-001; repeat at every boundary                                                                    | open      |
| R-015 | Finance      | Floating point, negative-floor or unstable tie behavior loses minor units or makes results nondeterministic           | P16A/02 + P16B/05 PASS preserve exact decimal/apportionment primitives and independently match 5,000 signed BigInt-rational cases plus 1,000 reverse/currency batches with stable floors/ties/source conservation | mitigated |
| R-016 | Settlement   | Competing totals, cross-currency netting or cached/plaintext results diverge from the canonical engine                | P16B/05 PASS establishes the sole exact hierarchical engine, topology/cache identity, currency isolation, deterministic reverse netting, signed source traceability, no persisted cache and complete immutable output | mitigated |
| R-017 | Data truth   | Invalid legacy ownership/allocation data is silently changed or shown as settled | P16C/02 PASS preserves every own stored allocation data sibling except exact `$cid` through initialized-Loro move/nest/swap/import-delete/maintenance/history and exact-key repair; P16D/01 PASS now visibly surfaces invalid retained allocation data in editable per-Person grid cells that reject repairs without dropping, clamping or rewriting; keep open until P16E surfaces incomplete settlement/source UX | open |
| R-018 | CRDT paths   | Grid, add-row, automation, import, undo or hydration bypasses per-key/atomic complete-set validation | P16C/02 PASS independently proves revoked-proxy typed containment, strict public writes, 128 two-peer schedules / 2,304 ops, 900 pure rollbacks, one-action history and encrypted persistence; P16D/01 PASS routes the real transaction grid, add row and per-Person cells exclusively through P16C `setTransactionAllocation` with no direct allocation mutation (grep-verified) under 120 retries-disabled E2E repeats and full green suites; keep open until P16E source UX and P21 re-verify import/automation/undo/hydration under a production build | open |
| R-019 | Grid UX      | Dynamic person columns break virtualization, historical data, presence, keyboard use or sub-100ms edits | P16D/01 PASS: dynamic per-Person columns keep the tanstack range extractor untouched with virtualization and keyboard suites green; historical people are retained and repairable; header, virtualized rows, expanded-notes row and the new Add row share one memoized pixel-aligned template under horizontal overflow, 200% zoom and 320px reflow; edits route through P16C with p50/p95 under 100ms. Residual: dev-build interaction max 158.1ms above target and error-glyph contrast 4.26:1 below AA both need production-build/token re-verify at P16E/P21; keep open | open |
| R-020 | Scale        | Settlement becomes superlinear or misses the approximate 100k/200ms target                                            | P16B/05 PASS near-linear with full 75k output; P16E/01 review (distinct reviewer) independently re-measured 100k at 0.93–1.10s, confirmed §14's measured-evidence-with-follow-up branch (Q-033), near-linear (~10-11x per 10x), exact correctness; residual cost is P16B's byte-unchanged defensive-materialization boundary. Target NOT abandoned: production memoization/safe-interning optimization carried to P21 | open      |
| R-021 | Toolchain    | Executable Node/Next/TypeScript and Playwright/Supabase tooling drift from documented or mutually compatible versions | P01 reconciles package/engine pins; P05/04 exact-project recreation produces compatible Realtime v2.112.6/79/four-field state with no mismatch and real subscription delivery; P21 repeats full validation | mitigated |
| R-022 | Compliance   | Existing copied Animate UI source lacks an identified upstream notice/distribution decision                           | Q-001 selects no further copying; release owner must approve notice-compatible distribution or replace copied tabs before release                                | open      |
| R-023 | Preservation | A 1,000-row import overflows encrypted-update base64 conversion and reloads as zero local transactions                | P14/04 cumulative PASS proves bounded base64 conversion plus ordinary 1,000-row import, encrypted push, cold reload, bounded rendering and peer convergence; P21 must retain the regression | mitigated |
| R-024 | Formatting  | Checking an authorized scratch marker changes Markdown parse shape and makes repository-wide oxfmt request a frozen-source text edit | Never reformat frozen scratch; P19/01 witnessed bare `pnpm format` from repo root rewriting 15 `specs/` files including `human-scratch.md` and two immutable P12 reviews (caught via `git status`, fully reverted, scratch SHA `c4121a48…` intact) — Q-024; workers must run scoped `pnpm format <paths>` and check `git status`, root edits all immutable ledgers via Bash to dodge the oxfmt hook, P20B must configure/exclude a marker-aware frozen scope without changing normalized text, and P21 must prove full formatting plus source checks | open      |
| R-025 | Configuration | Realtime signing-secret setup is documented but ordinary local/CI Playwright cannot obtain it hermetically             | P05/02 independent review proves ordinary env-unset Playwright obtains the known local key in process memory; P16A/02 review reconfirms a manual server fails closed without it and succeeds after root injects the running local-container key without printing/persisting it | mitigated |
| R-026 | Manual evidence | Required headless CLI reports non-selected sibling pages visible and cannot certify genuinely hidden-tab acceptance | D-017 rescopes HS-015 to its frozen websocket-security ask and accepts the hidden-tab network-timing edge as an unmeasured non-issue, superseding D-011; the 2026-07-26 probe confirmed CDP `Emulation.setVisibilityState` absent and the `addInitScript` mock flips only the JS predicate; background is now certified as re-sync *behavior* via the mock at logic level, never as measured timing. P05 reopened at rev 13 | mitigated |
| R-027 | Invite recovery | Key rotation or invite acceptance loses offline financial edits or leaves accepted membership without exactly one linked Person | P07/04 architecture PASS closes contract gaps with fenced exact-op transition, reconstructible SQL/client sagas, causal claim repair and canonical Me/reference preservation; P08 must implement/prove it before closure | open |
| R-028 | Undo grouping | Autosaved controlled CRDT fields create one UndoManager step per input event instead of one complete logical edit | P09/02 PASS proves typed focus-to-close sessions, immediate writes, action isolation and exact native-input/one-undo/one-redo unit, repeated E2E and CLI counterfactual | mitigated |
| R-029 | Offline sync | A failed throttled local push is never rescheduled after reconnect, so edit/undo ops remain unpushed and the UI stays in Sync error | P09/02 PASS proves browser-online durable retry, single-flight/coalescing/listener cleanup and actual failed requests followed by online-only inserted ops/Saved state | mitigated |
| R-030 | Alias graph | Remove-all, repair or public raw types permit illegal/resurrected symlink states, stale references or recovery-name misuse | P11A/04 PASS proves immediate local conservation, public wire isolation, deterministic repair and one canonical legal Mirror notification for remote merge with peer/reopen convergence; P11B/P11C must retain the boundary | mitigated |
| R-031 | Alias production | Atomic alias APIs crash or are bypassed, and migration is absent from real hydration, leaving normalized/legacy state unsafe in the shipped app | P11A/04 PASS proves provider hydration, sticky raw-update failure, stable-ID retry/no loss or duplicate, exact repair push acknowledgement and full current-surface validation; later alias packages must retain these gates | mitigated |
| R-032 | Import intake | File sniffing rejects supported formats or admits renamed documents, while virtual child churn strands whole-surface drag state | P15/02 cumulative PASS proves bounded parser-aligned XML/SGML OFX/QFX and difficult CSV acceptance, renamed JSON/document rejection and actual virtual-row-unmount outer-leave cleanup through picker and real DataTransfer surfaces | mitigated |
| R-033 | Financial API integrity | Downstream settlement/mutation/UI callers can alter supposedly immutable validation/derivation/apportionment results or typed errors after return | P16A/02 PASS independently probes 20 success/failure shapes: envelopes, nested values/maps, error arrays and individual errors are frozen, mutations fail, caller inputs remain mutable/unaliased, and fixed-seed production regressions cover every branch | mitigated |

Update risk status only with evidence. A package PASS must link mitigation for every applicable
high-impact risk.
| R-034 | Accessibility | Row checkbox accessible name degrades to "Select transaction " when a transaction description is empty | P16E/02 review flagged this NON-BLOCKING (explicitly not a P16E finding): `TransactionRow.tsx:274` is P16D-owned and byte-unchanged across the P16E range; the control stays discoverable/focusable/keyboard-operable by role. Route a name fallback (amount/date) for the P21 audit | open      |

## R-LOSTWRITE-01 — a local write is not durable for a few milliseconds after the UI acknowledges it

- **Status:** OPEN, tracked, **out-of-goal by D-025** (same standing as `Q-P20B-00` under D-019).
  Not closed, not masked, and **not** spun into a goal package.
- **Substance, MEASURED** (`evidence/P21/diagnostic-Q-P20B-26.md`, logs `/tmp/q26-logs/`): an
  allocation write confirmed in the DOM is not yet in IndexedDB. Persistence is downstream and
  asynchronous — `subscribeLocalUpdates` enqueues (`manager.ts:292-296`), a queued attempt
  dynamically imports crypto, encrypts, then calls `appendOp` (`:312-345`). **A full document
  teardown in that window discards the queued work and no op row is ever created**, so the value is
  never pushed to the server either. 195 runs, 50 losses, **zero counterexamples**.
- **Exposure.** MEASURED: **client-side in-app navigation is safe (arm J1, 0/70)**; full teardowns
  lose it — `location.assign` **48/70**, `reload()` 21/70, `page.goto` 17/70, killed tab 17/70. Any
  delay of a few ms closes the window (arm G2 0/52). **INFERRED, not measured on users:** a human
  cannot aim a reload at a window this narrow, so realistic exposure is an **unaimed** teardown — a
  crash, OS kill or force-quit — landing in the few-ms window after an individual write. Small per
  write, not zero.
- **NOT established, recorded because root asserted it and the adjudicator refuted it:** that the
  sync indicator reads `Saved` over a non-durable write. In **350/350** samples ~2 ms after the
  barrier the indicator read **`Saving...`** and the op was **already durable**. `hasUnsavedChanges`
  is a **2 s poll** (`layout.tsx:161`) and cannot vouch for durability either way.
- **Reproduction, retained deliberately** — Component 1's fix removes the suite's ability to surface
  this class: `evidence/P21/diagnostic-Q-P20B-26.md`, probe
  `evidence/P21/diagnostic-Q-P20B-26-probe.spec.ts.artifact` and its config
  `evidence/P21/diagnostic-Q-P20B-26-config.ts.artifact` (copied out of `/tmp`, which does not
  survive).
- **Future work, out of goal:** fence the interactive edit path on `awaitLocalPersistence()`
  (`manager.ts:367-377`), or make the acknowledgement wait for it, with regression coverage over the
  measured arms. **Must be named in the P21 status report for after-the-fact human audit**
  (`PROCESS.md:344-345`).

### R-LOSTWRITE-01 addendum — 2026-08-03, after P20B rev 09

**The suite can no longer surface this class by accident.** Rev 09 makes the harness wait for
durability before every deliberate teardown, so the E2E suite no longer reproduces the lost write.
**This is the intended fix for the harness and it is NOT a fix for the risk** — a crash, OS kill or
force-quit inside the window still loses the write. Component 2 remains untouched and out-of-goal.

**The live reproduction is now arm C of the preserved probe**
(`evidence/P21/diagnostic-Q-P20B-26-probe.spec.ts.artifact`, run with its config alongside): a raw
`page.reload()` that bypasses every helper, **MEASURED at 20/70 on the FIXED tree**. Anyone
revisiting this risk should start there — it is the only remaining route by which the repository can
demonstrate the defect.

### R-LOSTWRITE-01 second addendum — 2026-08-03: `beforeunload` MEASURED, and it BOUNDS the exposure

**An INFERRED line in the scope ruling is now MEASURED, and it favours the ruling.**
`adjudications/P21-scope-02.md` §5 inferred — and said explicitly *"I did not measure that"* — that a
**user-initiated** teardown hits the `beforeunload` handler while `pendingLocalUpdates` is non-empty
(`manager.ts:437-448`), raising the unsaved-changes dialog rather than silently dropping the write.

**`p20b-reviewer-09` hit it in a real browser, in BOTH directions**, during the manual checkpoint:

- navigating to `/transactions` **immediately after** adding an allocation **raised the dialog and
  blocked the navigation** until it was accepted;
- reloading **after** the barrier returned `"persisted"` raised **no** dialog.

**Consequence for this risk, stated precisely.** Component-2 exposure is **bounded to genuinely
unaimed teardowns** — a crash, an OS kill, a force-quit — which is exactly the class the ruling
described. **A user who navigates or closes the window deliberately is warned.** This is the
strongest thing in the record limiting this risk, and it did not exist when D-025 was written.

**It does not close the risk.** A crash or kill still bypasses `beforeunload`, the write is still
not durable at acknowledgement, and Component 2 remains out-of-goal and unfixed.

**A near-misreport worth keeping, because the failure mode impersonated a serious defect.** Two
`goto` calls in the manual session died with `TimeoutError: Timeout 60000ms exceeded` while `curl`
fetched the same route in **121 ms** and the dev-server log showed `GET /transactions 200`. **The
cause was the `beforeunload` modal, not the app.** Had it been reported, it would have read as a
severe product failure. **A browser probe failure is a claim about the harness before it is a claim
about the product** — the tenth instrument failure in this goal whose signature impersonated a
product break.

## R-SNAPSHOT-PHRASE-01 — a bare `playwright-cli snapshot` can print a recovery phrase in cleartext

- **Status:** OPEN as a **reviewer-workflow hazard**. **Not a product defect** — it is HS-019
  behaviour working as specified — and **not an exposure event**: see the disposition below.
- **Substance, MEASURED by `p20b-reviewer-11`:** on `/new-user` after generating a phrase, a bare
  `pnpm exec playwright-cli snapshot` prints the **recovery phrase in cleartext**. The display shows
  `•••••`, but the **password-manager credential field carries the phrase as its accessible value**,
  and the accessibility snapshot reports accessible values.
- **Why it matters more than an ordinary hazard:** `PROCESS.md`'s reviewer checkpoint **requires**
  deterministic accessibility snapshots, and `snapshot` is an *observational* command. **A reviewer
  following the checkpoint exactly, with no intent to reveal anything, can print recovery material
  by running the command the checkpoint asks for.** It defeats a "never reveal the phrase" rule via
  the one command that looks safe.
- **Disposition — no exposure persisted, verified by root.** The phrase belonged to a **disposable
  test vault the reviewer created**, not to the human or any real vault. The reviewer **noticed and
  filtered its snapshots**, reproduced nothing in its review file, and deleted the vault's state.
  **Root scanned the committed review and evidence for any phrase-shaped content and found none**;
  the only long word-run is ordinary prose and the two "recovery phrase" mentions are this hazard's
  own description and the hygiene declaration. **No secret or recovery material entered the
  repository.**
- **Required mitigation, applied from the next dispatch onward:** every reviewer brief must instruct
  that snapshots taken on or after `/new-user` phrase generation are **filtered before being read or
  quoted**, and that the credential field's accessible value is never echoed. Prefer targeted
  `eval` on a specific element reference over a whole-page `snapshot` on that route.

### R-SNAPSHOT-PHRASE-01 addendum — 2026-08-03: the hazard is NOT limited to manual snapshots, and root found live material

**Extended by `p20b-implementer-12`, and CONFIRMED by root:** **Playwright's automatic
`test-results/**/error-context.md` embeds the page snapshot**, so it carries the recovery phrase as
the credential field's accessible value **on any failed test on that route**. The original entry
described a manual `playwright-cli snapshot`; **no manual command is required — a test simply
failing is enough.**

**This collides with root's own standing guidance.** Root has repeatedly instructed agents to copy
`error-context.md` out of the volatile `test-results/` tree before re-running, because the next run
wipes it. **That guidance and this hazard point in opposite directions**, and both are correct in
their own terms. The resolution is: preserve them, **but scan and redact before doing anything
else** with them.

**Root detected live material and removed it.** Scanning the preserved artifacts, root found the
rev-12 failure's error context contained **two 58-character lowercase tokens** — the concatenated
shape a space-stripped 12-word phrase takes, which is exactly the mechanism of that failure and
which **a word-run scan does not catch** (root's first scan returned zero long word-runs and would
have cleared it). Root **redacted both tokens in place** to
`[REDACTED-RECOVERY-MATERIAL-BY-ROOT]`, verified **0** remaining tokens of that shape, and confirmed
the artifact still carries its diagnostic content (the `1 of 12 words entered` counter, the
`unlock-button` state and the `invalid` marker all intact), so it remains usable as flake evidence.

**Disposition — no exposure of real recovery material, verified rather than assumed:**

- The phrase belonged to a **disposable test vault created by the agent**, not to the human and not
  to any of the 30,587 real vaults.
- **Nothing entered the repository.** MEASURED: `test-results/` is gitignored at `.gitignore:39`; no
  `error-context.md` has **ever** been committed (`git log --all -- '*error-context.md'` is empty);
  no file under `test-results/` is tracked.
- The material sat in `/tmp` only, and is now redacted.

**This does not meet this session's halt-and-report bar**, but it is surfaced to the human
explicitly, because the detection method matters as much as the finding.

**Mitigations, now mandatory in every dispatch that touches E2E:**

1. Scan any preserved `error-context.md` for **both** shapes before reading or copying it — a
   12-word run **and a single lowercase token of 40+ characters**. The second is the one that
   evades the obvious check.
2. Never echo, quote or commit the credential field's accessible value.
3. Prefer a targeted `eval` on a specific element reference over a whole-page `snapshot` on
   `/new-user`.
