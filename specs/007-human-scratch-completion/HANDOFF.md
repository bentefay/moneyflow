# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P15 / 02
- **Scope IDs:** HS-013 only; whole imports-list and transactions-table file drop targets; HS-013
  remains incomplete and unchecked
- **State:** passed; exact review/risk integration
  `9c5d7be8ee4cf7c3fda5f1a7320c053362672e3a` is durable and HS-013 is
  `completion_pending`
- **Task:** `tasks/HS-013-import-drop-zones.md`; exact one-line HS-013 block in SCOPE
- **Dependency:** P14/04 and HS-008 are passed. P15 revision-01 architecture remains the cumulative
  base to correct, not replace.
- **Literal original cumulative review BASE:**
  `b3e96ba9e9487d13df56956d220fffca63d6482d`
- **Revision-02 clean pre-implementation HEAD:**
  `6751860ba4d1501404b35bca27d0711b93424eb6`
- **Revision-02 committed product/test HEAD:**
  `91931688ef9463576b757a097968af543a4b8a75`
- **Revision-01 product/test HEAD:** `d652032ea4f738e06fd5a29018bd341010285696`
- **Revision-01 failure integration:** `49dcef93bdbd4d4d21f0313061bc262473801966`
- **Immutable revision-01 evidence:** `evidence/P15/implementation-01.md`, SHA-256
  `5ad467cdaaec07685d20fdeff28aff1d5564e571fbd5e3ca99d6a452c97cd05e`, 177 lines /
  13,180 bytes
- **Immutable revision-01 review:** `reviews/P15-review-01.md`, FAIL, SHA-256
  `4da58be357d490f28d5fbe0858a0e428ef8842258adcc2a87dd942da5b86cd44`, 227 lines /
  16,347 bytes
- **Frozen revision-02 implementer artifact:** `evidence/P15/implementation-02.md`, SHA-256
  `a92301725fe0ee553cf5b21d9fb3796c92330994019c0224cf4952af5a21b501`, 169 lines /
  12,275 bytes
- **Immutable revision-02 review artifact:** `reviews/P15-review-02.md`, PASS, SHA-256
  `c29069c1f79e90cf7824fcce8fc7f8d99ffc527df38af7e48f6d0cd427b747fa`, 214 lines /
  15,898 bytes
- **PASS integration commit:** `9c5d7be8ee4cf7c3fda5f1a7320c053362672e3a`
- **Implementation-start boundary:** clean HEAD/index/worktree; revision-01 evidence/review and all
  root transcriptions are committed and immutable
- **Allowed revision-02 paths:** exactly
  `src/lib/import/file-validation.ts`,
  `src/components/features/import/ImportDropTarget.tsx`,
  `tests/unit/import/file-validation.test.ts`,
  `tests/unit/components/import-drop-target.test.tsx` and `tests/e2e/import.spec.ts`. No page,
  provider, parser, FileDropzone, export, CRDT, sync, crypto, server, schema, migration, dependency,
  config or other source/test path is authorized unless a reproducible owner blocker is first
  reported and root explicitly expands the list. Never edit ledgers, revision-01 artifacts, scratch,
  FS-001, SCOPE, `.claude`, `.codex` or agent configuration.
- **Commit contract:** inspect revision-01 owners before editing. Stage the exact authorized
  product/test paths only, commit with a short message containing no parentheses, and leave
  `evidence/P15/implementation-02.md` uncommitted. Never use `git add .` or `git add -A`.

## Required revision-02 closure

- **F-01 XML OFX compatibility:** align the bounded shared validator with the existing parser's
  accepted OFX truth. Accept complete standard OFX 2.x documents with bounded leading XML
  declaration and OFX processing instruction before `<OFX>`, without loosening SGML OFX/QFX or
  permitting arbitrary markup. Prove picker and actual DataTransfer drops through both Imports and
  Transactions surfaces reach preview/cancel; retain existing SGML OFX/QFX cases.
- **F-02 renamed JSON rejection:** replace delimiter-on-first-line sufficiency with a robust bounded
  CSV recognition contract. Reject obvious JSON and known HTML/XML/PDF/binary/document signatures
  renamed as CSV before navigation, while retaining real quoted fields, escaped quotes, multiline
  fields, BOM, supported encodings and normal one-column/multi-column bank exports accepted by the
  existing parser. Use one shared picker/drop path and return typed actionable errors.
- **F-03 alert contrast:** use an explicit established-token foreground/background pair that
  measures at least 4.5:1 for the actual 14px alert text in both light and dark themes. Do not solve
  this with larger text alone, opacity assumptions or a global theme change. Add deterministic
  computed-color contrast coverage in both states.
- **F-04 200%-zoom reflow:** place overlay instructions and validation feedback against the
  currently visible intersection of the scrollable target and visual viewport, not the full target
  center/bottom. At 390x844 with 200% document zoom, both surfaces must keep all guidance and alert
  text/boxes visibly contained with an explicit collision margin while preserving scrolling,
  pointer noninterference, responsive/dark/reduced-motion behavior and ordinary unzoomed layout.
- **F-05 virtual unmount lifecycle:** make actual outside-boundary leave authoritative even if an
  entered virtual child unmounts before emitting its matching leave. Retain no-flicker behavior
  across ordinary live children, but clear on outer leave without waiting for global dragend. Add a
  real browser journey: enter target and mounted virtual row, scroll-unmount that row, dispatch only
  outer leave, assert overlay absent.
- **Cumulative preservation:** retain the revision-01 shared validator/original-File architecture,
  one-shot vault/route cleanup, no plaintext sessionStorage handoff, both bounded surfaces, honest
  drop effect, accessible focus restoration, keyboard picker, explicit import confirmation,
  CSV/SGML OFX/QFX flows, cancel/back/same-file retry, 60-row bounded virtualization, encrypted
  persistence and every P13/P14 behavior. Do not weaken validation merely to accept XML OFX.
- **Decision rule:** all five findings are explicit implementation defects. If a new material
  ambiguity remains after source inspection, record a complete `Q-PROPOSAL-P15-02-*` in evidence,
  apply the PROCESS hierarchy and continue; do not ask the human or pause.

## Required evidence

- **Red-to-green:** before product edits, add checked-in tests that reproduce all five revision-01
  findings on exact unchanged behavior. Preserve exact red outputs. Then make those same tests green
  without deleting or weakening any revision-01 acceptance assertion.
- **Focused automation:** repeat the validator/drop-target unit/component profile in three clean
  processes. Include parser-aligned XML OFX, JSON/document spoof matrix, representative difficult
  valid CSV, exact theme contrast, visible-intersection geometry and virtual-unmount lifecycle.
- **Browser automation:** use actual browser `File`/`DataTransfer`. Run the exact F-01–F-05 journeys
  at least three times, one worker/retries zero; preserve the revision-01 12/12 three-repeat matrix,
  picker CSV/OFX, filtered/virtualized 60-row confirm/cancel and P14 origin/history checks. No
  arbitrary waits, CSS-only substitutes, post-dispatch `dropEffect` assumptions or synthetic
  production hooks.
- **Regression gates:** run import unit/integration and owner profiles, full Vitest, typecheck,
  lint, build, exact changed-path format/ESLint and `git diff --check`; affected six-spec and full
  Chromium once each with one worker/retries zero. Run repository `format:check` and report its exact
  inherited Markdown baseline without rewriting frozen/historical files.
- **Manual installed-CLI charter:** use only installed headless `playwright-cli` with unique
  disposable session and a root-owned keyed server. Independently reproduce and close XML OFX,
  renamed JSON, both-theme contrast, 390x844/200%-zoom overlay+alert containment and virtual child
  unmount/outer leave. Retain CSV/SGML OFX/QFX, six invalid cases/focus, keyboard picker,
  cancel/back/confirm, 60-row bounded reload, P14 origin/history, storage/request plaintext absence,
  responsive/dark/reduced motion and clean console/network. Exclude and report any failed/hung
  exploratory harness; no arbitrary timeout may support acceptance.
- **Evidence artifact:** record original BASE, revision-02 pre-HEAD, cumulative product/test HEAD and
  commits; exact paths/index; each independent-review counterexample red and green; mechanisms and
  test coverage; commands/repeats/counts; sanitized manual geometry/contrast/lifecycle/privacy;
  cumulative preservation; inherited failures; cleanup; frozen boundaries; risks and any complete
  Q proposal. Format the new artifact before freeze and do not claim independent PASS.
- **Applicable guides:** `.claude/skills/import/SKILL.md`,
  `.claude/skills/components/SKILL.md`, `.claude/skills/e2e/SKILL.md`; apply general TypeScript,
  accessibility, security, performance and testing rules.
- **Frozen boundary:** scratch SHA
  `f0adfef6e19b80969dae748cf8c616614af61ba778837234c97af385a19adcb1`, checked set
  HS-001/HS-002/HS-004/HS-005/HS-006/HS-008/HS-010/HS-014/HS-017/HS-018, all 21 normalized blocks
  exact; FS-001 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715
  lines/25,441 bytes; SCOPE
  `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines/27,382 bytes.

## Independent review contract

- **Reviewer:** distinct `human_scratch_reviewer`, undispatched until revision-02 implementation
  evidence freezes
- **Literal cumulative review BASE:** `b3e96ba9e9487d13df56956d220fffca63d6482d`
- **Literal revision-02 HEAD:** `91931688ef9463576b757a097968af543a4b8a75`
- **Range type:** original P15 BASE through the future revision-02 product/test HEAD, including
  immutable revision-01 failure/control history
- **Implementation evidence:** `evidence/P15/implementation-02.md`
- **Sole reviewer artifact:** `reviews/P15-review-02.md`
- **Reviewer writes:** the new review file only; no product/test/evidence/ledger/config/frozen edit
  or commit
- **Required review focus:** independently close F-01 through F-05 with parser-aligned compatibility,
  strong spoof rejection, measured theme contrast, actual 200%-zoom visible containment and real
  virtual-row unmount/outer-leave cleanup. Revalidate all green revision-01 architecture, workflows,
  scale, privacy, P13/P14 behavior, automation and cleanup.
- **Verdict contract:** review literal cumulative range with explicit findings, acceptance mapping,
  independent commands/repeats, installed-CLI evidence, cleanup/Q proposals and one PASS/FAIL. Any
  material compatibility, validation, accessibility/reflow, interaction-lifecycle, privacy,
  data-loss or regression finding fails.

## Next root action

Root must execute the already durable HS-013 completion event against exact pre-change scratch SHA
`f0adfef6e19b80969dae748cf8c616614af61ba778837234c97af385a19adcb1`: make a private comparison
copy, apply only HS-013's `[] -> [x]`, prove the one-line diff and all frozen boundaries, remove the
copy, then finalize the event and rolling metadata in one root control commit. No package dispatch
is legal while the event is pending.
