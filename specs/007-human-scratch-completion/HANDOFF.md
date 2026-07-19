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

- **Package / revision:** P00 / 02
- **Scope IDs:** control; no scratch marker
- **State:** independent PASS recommended; root integration pending. Revision 02 evidence SHA-256 is
  `3ad9f4fe264d47b6d93c29b9c34cb60e03d230299cc6e5bd4ec0b8f2150d50b7` and review SHA-256 is
  `0f5129c9e2068cc0b8939ac27ec224b1843b34c613e6c951b0864bf81abe82f6`
- **Task:** `tasks/P00-baseline.md`
- **Original package BASE:** `0ea864f5d0142530b2d524add228d3b51f162876`
- **Allowed implementation paths:** none
- **Sole implementer artifact:** `evidence/P00/implementation-02.md`
- **Commit contract:** no product commit; expected HEAD `8f12d82ddb576af5cc8c6f04d32617d805e300de`;
  evidence remains uncommitted for review
- **Pre-existing dirty/untracked paths:** unstaged modified `specs/human-scratch.md`; no staged or
  untracked paths; branch `main` is three commits ahead of `origin/main`
- **Acceptance focus:** truthful reproducible baseline; all revision-01 coverage; explicitly
  reproduce and route the 320px keyboard `Open menu` -> Enter -> Escape focus-loss red from
  `reviews/P00-review-01.md` I-001; no product fix
- **Question route:** complete proposals in assigned evidence; root alone appends QUESTIONS

## Review dispatch

Root fills this only after implementation handoff:

- **Reviewer:** a `human_scratch_reviewer` instance distinct from the implementer
- **Literal reviewed BASE:** `0ea864f5d0142530b2d524add228d3b51f162876`
- **Literal reviewed HEAD:** `8f12d82ddb576af5cc8c6f04d32617d805e300de`
- **Range type:** `non-empty`; commits after original BASE contain only revision-01 control
  artifacts and ledger recording, with no product/migration/test change
- **Implementation evidence:** `evidence/P00/implementation-02.md`
- **Sole reviewer artifact:** `reviews/P00-review-02.md`
- **Prior review files:** `reviews/P00-review-01.md`; immutable FAIL
- **Reviewer writes:** assigned review file only; no evidence/ledger/product/test/scratch writes
- **Failure route:** persist review, P00 `changes_requested`, next paths
  `evidence/P00/implementation-03.md` and `reviews/P00-review-03.md`
- **PASS authority:** reviewer recommends PASS; root alone verifies/transcribes/integrates and sets
  `passed`

## Next root action

Persist `evidence/P00/implementation-02.md`, `reviews/P00-review-02.md`, verified BASELINE and root
risk/decision/progress transcriptions in an exact-path integration-control commit. Record that
literal commit and set P00 `passed` only afterward. Then rewrite this handoff for P01; do not
dispatch P01 before the P00 pass record is durable.
