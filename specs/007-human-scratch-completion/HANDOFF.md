# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while any literal
field is `pending`. Workers may read but never edit it.

After a failed P21, root must first persist its immutable FAIL and complete PROCESS's impact and
rollback transaction. HANDOFF must name every affected package/requirement and link finalized
`passed -> changes_requested` plus HS `[x] -> []` events (or FS-001 no-source-mutation downgrade)
before it is rewritten for the first fix package. Any prepared/active rollback batch, nonempty
pending HS set, `rollback_pending` requirement or unresolved affected ID makes dispatch forbidden.
After all fixes/reviews and requirement re-passes, HANDOFF assigns a new P21 revision, new current
BASE and new artifact paths.

## Implementation dispatch

- **Package / revision:** P00 / 01
- **Scope IDs:** control; no scratch marker
- **State:** changes_requested after immutable `reviews/P00-review-01.md` FAIL; revision 01
  evidence, review and failed-review state persisted in `00d47a420c3b6c7f66d6e89a9f8d95c2cc927c4c`
- **Task:** `tasks/P00-baseline.md`
- **Original package BASE:** `0ea864f5d0142530b2d524add228d3b51f162876`
- **Allowed implementation paths:** none
- **Sole implementer artifact:** `evidence/P00/implementation-01.md`
- **Commit contract:** no product commit; expected `HEAD == BASE`; evidence remains uncommitted for
  review
- **Pre-existing dirty/untracked paths:** unstaged modified `specs/human-scratch.md`; no staged or
  untracked paths; branch `main` is one commit ahead of `origin/main`
- **Acceptance focus:** truthful reproducible baseline; both frozen sources and all 22 first-class
  requirement/package mappings; services/tool/browser versions; full test/flake state; headless
  product/accessibility smoke
- **Question route:** complete proposals in assigned evidence; root alone appends QUESTIONS

## Review dispatch

Root fills this only after implementation handoff:

- **Reviewer:** a `human_scratch_reviewer` instance distinct from the implementer
- **Literal reviewed BASE:** `0ea864f5d0142530b2d524add228d3b51f162876`
- **Literal reviewed HEAD:** `0ea864f5d0142530b2d524add228d3b51f162876`
- **Range type:** `empty`; P00 forbids product/test commits, and root must reconcile any deviation
  before review
- **Implementation evidence:** `evidence/P00/implementation-01.md`
- **Sole reviewer artifact:** `reviews/P00-review-01.md`
- **Prior review files:** none; immutable if later present
- **Reviewer writes:** assigned review file only; no evidence/ledger/product/test/scratch writes
- **Failure route:** persist review, P00 `changes_requested`, next paths
  `evidence/P00/implementation-02.md` and `reviews/P00-review-02.md`
- **PASS authority:** reviewer recommends PASS; root alone verifies/transcribes/integrates and sets
  `passed`

## Next root action

Rewrite this handoff for P00 revision 02 using `evidence/P00/implementation-02.md` and
`reviews/P00-review-02.md`. Revision 02 must explicitly reproduce and route the mobile-menu Escape
focus-loss red; no P00 product fix is allowed. Do not dispatch P01 until P00 has an independent
persisted PASS and root integration-control commit.
