# Memory Index

- [Next dev lock blocks E2E](next-dev-lock-blocks-e2e.md) — any running `next dev` in this repo dir
  blocks `pnpm test:e2e` even on a free port; report it, don't work around it.
- [Verify process ownership before killing](verify-process-ownership-before-killing.md) — asking
  first is right, but identify the process from argv and logs, not from a stale task list.
- [Programmatic focus publishes presence](programmatic-focus-publishes-presence.md) — a `.focus()`
  in a transaction row tells peers you're editing it; suppress it, don't downgrade to viewing.
- [E2E catches what unit tests cannot](e2e-catches-what-unit-tests-cannot.md) — green static gates
  say nothing about presence, sync, or cross-tab behaviour.
- [Page-level tests need a timeout ceiling](page-level-tests-need-a-timeout-ceiling.md) — whole-page
  renders pass alone and time out under full-suite load; the error you see is a misleading "found
  multiple elements".
- [Port 3000 serializes E2E campaigns](e2e-port-3000-serializes-campaigns.md) — your own worktree
  doesn't buy a parallel campaign; wait for a sustained free port, and never run it with `CI=true`.
- [Wall-clock ratio unit test flake](wall-clock-ratio-unit-test-flake.md) — a `pnpm test` failure in
  `duplicates.test.ts` under load is CPU contention, not a defect; re-run in a quiet window.
- [Verify dispatch site enumerations](verify-dispatch-site-enumerations.md) — the sites a dispatch
  lists can be incomplete; grep the component yourself before designing, and raise divergences.
- [Remove fallbacks, don't bypass them](remove-fallbacks-dont-bypass-them.md) — when an optional
  prop's silent fallback caused the bug, make the good value required so it can't regress.
- [Playwright getByRole name is substring](playwright-getbyrole-name-is-substring.md) — "Me" matches
  inside "Unnamed member"; Testing Library is exact by default, Playwright is not.
- [Dispatch spec citations drift](dispatch-spec-citations-drift.md) — a dispatch's spec path+lines
  can point at a different requirement; grep the headings and trust the package contract.
- [next-env.d.ts is fake tree drift](next-env-artifact-fake-drift.md) — `next dev` rewrites it each
  start, so exclude it from campaign digests or every multi-run campaign looks drifted.
- [Hover masquerades as resting paint](hover-state-masquerades-as-resting-paint.md) — dark-mode
  `--muted` and `--accent` are the same token, so a hovered reading is worthless for resting chrome.
- [E2E cannot import crdt modules](e2e-cannot-import-crdt-modules.md) — importing `@/lib/crdt/*`
  into a spec silently skips the whole file with "No tests found"; watch the absolute test count.
- [Never grep away test failure detail](never-grep-away-test-failure-detail.md) — tee the full run
  to a log; a summary-only grep discards the failing test's name and leaves it unattributable.
- [Locale defects hide in the parse path](locale-defect-check-parse-not-just-display.md) — "displays
  in US format" usually means the input silently writes transposed values; check entry first.
- [Host is en-US in Brisbane](host-locale-is-en-us-in-brisbane.md) — locale and time zone disagree
  by default here; pass explicit `locale`/`timezoneId` to every context that depends on either.
- [Rewritten primitives regress untested classes](rewritten-primitive-regresses-untested-classes.md)
  — `String(Number(digit))` shipped `NaN` for every non-Latin locale past all six green checks.
- [Freeze the tree once handed to review](freeze-tree-once-handed-to-review.md) — stop committing
  and release :3000 at handback; even a strict improvement is a moving target the reviewer pays for.
- [Worktree edit path trap](feedback_worktree-edit-path-trap.md) — in a worktree session, Edit/Write
  with a repo-root absolute path writes to the SHARED main checkout; Bash is not a guide.
- [Commit early in a shared checkout](commit-early-in-a-shared-checkout.md) — uncommitted work is
  unsafe in both directions: it blocks other agents and theirs can revert yours.
- [Unblocking a path makes downstream newly reachable](unblocking-a-path-makes-downstream-newly-reachable.md)
  — your fix can introduce the visible bug; audit consumers of a formerly-dead path before shipping.
- [A test that cannot fail](test-that-cannot-fail-proves-nothing.md) — comparing a function to
  itself, or a spec that silently skips on an unresolved import, discharges the check without doing
  it.
- [Fixtures must vary along the branching axis](heuristic-must-vary-along-the-axis-it-branches-on.md)
  — put the right answer in a LOSING position; trace every comment claiming a guarantee to its line.
- [A path is not a location](a-path-is-not-a-location.md) — name the tree with every path; a
  surviving line is not a surviving defect; report artifact paths outside the worktree up front.
- [Re-derive figures before freezing them in guidance](re-derive-figures-before-freezing-them-in-guidance.md)
  — a count two agents agreed on was off by two; a wrong number in `.claude/` outlives the review
  that carried it.
- [Port discipline is CPU discipline](port-discipline-is-cpu-discipline.md) — hold vitest too while
  another agent campaigns; run your own non-E2E checks BEFORE launching your campaign, never during.
- [Port override fakes a multi-context break](port-override-fakes-multicontext-break.md) — specs pin
  `localhost:3000` inside `newContext`; a full suite on `:3100` fails ~15 tests that look like a
  total product break.
- [repeat-each is per test, not total](repeat-each-is-per-test-not-total.md) — K arms at
  `--repeat-each=N` gives N runs per arm; set it to the per-arm bar and tally the log per arm.
- [The ledger carries instructions you never received](ledger-carries-instructions-you-never-received.md)
  — read `git log` over `specs/**` before finalising; a correction addressed to you may exist only
  there.
- [Mutate both directions to grade a guard](mutate-both-directions-to-grade-a-guard.md) — deleting
  the gate line proves one case; inverting its comparison is what shows the complementary test earns
  its place.
- [Finish the code before the campaign](finish-the-code-before-the-campaign.md) — a comment-only
  commit under `tests/e2e` moves the digest and costs you the whole campaign.
- [Your own edit shifts cited line numbers](own-edit-shifts-cited-line-numbers.md) — a grep from
  before the edit is stale after it; re-derive, and name whose numbering you are quoting.
- [Error-context artifacts carry the phrase](error-context-artifacts-carry-the-phrase.md) — the
  snapshot hazard applies to Playwright's automatic failure artifacts, not just manual snapshots.
- [Suggested wording is not verified wording](feedback_suggested-wording-is-not-verified-wording.md)
  — a reviewer's literal replacement text can contradict that same review's own table; grade it
  against the measurement, and prefer a clause derivable from source.
