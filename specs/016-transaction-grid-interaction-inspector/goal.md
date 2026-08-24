# Goal: Transaction Grid Interaction and Inspector

Proposed authoritative requirement source for replacing MoneyFlow's always-live transaction controls
with a selection-first spreadsheet grid, one typed editor lifecycle, and a stable responsive
transaction inspector.

## Source status and authority

- **Goal pointer:** `specs/016-transaction-grid-interaction-inspector/goal.md`
- **Requirement IDs:** `TGI-001` through `TGI-012`
- **Contract pointer:** `interaction-contract.md`
- **Source reconciliation:** `source-disposition.md`
- **Replacement coverage:** `replacement-coverage.md`
- **Evidence index:** `evidence/README.md`
- **Approval gate:** this proposal is not implementation authority until a human approves it and its
  identities are recorded in `evidence/source-freeze/freeze-manifest.md` in a source-only commit.
- **Freeze:** after approval, every source file named by the manifest is immutable. Do not edit,
  reformat, renumber, or mark it complete. Later changes require a new source revision.
- **Accounting:** progress, implementation evidence, reviews, and verdicts belong in mutable ledgers
  and revisioned evidence, never in these frozen source files.

No product behavior, tests, package manifest, prior frozen source, or agent configuration may change
before this source gate is approved.

## Historical-source disclosure

`specs/014-transaction-grid-v9/goal.md` is **absent from current HEAD**
`3bc789cee63d85d966c7c395e73f1bcd0bad04be`. It was not reviewed as a current source and is not
superseded as current authority.

Historical content was consulted only at commit `2ac5a3f73e2bf576d548e036d2de4560261613f9`, blob
`f04243b6e75e2ca5f865320ae621a545864277b5`. That commit is not an ancestor of current HEAD. The new
source independently adopts selected stable-identity, focus, evidence, and performance principles;
no claim is made that historical TG9 acceptance was admitted or completed on the current branch.

`specs/015-transaction-grid-tanstack/` contains tracked evidence but no top-level goal in current
HEAD. Those artifacts remain immutable. Their dynamic-notes scenarios are historical measurement
context, not authority for the new inspector design.

## Normative terminology

- **Active cell:** the stable row-and-column anchor of the latest canonical TanStack range
  operation. It is the cell that owns roving DOM focus and may edit.
- **Extent endpoint:** the other corner of the latest range. Shift and drag move this endpoint while
  the active anchor remains fixed. It is selection geometry, not DOM focus.
- **Parked selection:** retained canonical ranges whose paint, `aria-selected`, copy, and range
  actions are suppressed while the grid does not expose navigation focus.
- **Visible selection:** canonical ranges exposed while a grid cell owns focus.
- **Muted selection:** canonical ranges exposed at lower contrast while focus is inside the owning
  transaction's inspector or owned portal.
- **Projection generation:** a branded immutable revision of canonical matching-row identity/order
  and selectable-column identity/order. Held-window movement and value-only writes do not create a
  new generation.
- **Quick entry:** printable input that replaces a cell's displayed value with a controller-owned
  draft and retains grid-oriented movement.
- **Full edit:** explicit editor entry that selects the current single-line value and preserves
  native horizontal caret behavior.
- **Popup interaction:** a calendar, combobox, listbox, modal, or similar owned surface temporarily
  governing its native keyboard model.
- **Transaction owner:** one stable transaction across its row, inspector, and every portaled
  descendant marked with that row identity.

## Mandatory outcomes

### TGI-001 — One typed interaction domain

One controller owns engagement mode, effects, stable focus registration, editing, popup ownership,
continuous-edit intent, and typed failures. Invalid combinations are unrepresentable. Row-local edit
booleans, a second active-cell value, and competing navigation hooks do not remain.

### TGI-002 — Canonical TanStack selection with projection geometry

Exactly one externally supplied TanStack `CellSelectionState` atom is canonical. The controller and
Table APIs write that atom; no React `state`/callback mirror owns a second copy. Pure projection
adapters resolve ranges across unmounted rows without enumerating whole rectangles on scroll or
render.

### TGI-003 — Stable identity and generation-checked materialisation

Rows, columns, cells, focus requests, range endpoints, presence, and asynchronous work use branded
stable identities. Offscreen navigation and copy resolve against a named projection generation.
Stale, load, limit, registration, or focus failures are typed and leave protected state unchanged.

### TGI-004 — Selection-first grid surface

Resting cells render as cells, not persistent form controls. One gridcell has `tabIndex=0`; all
others have `-1`. Click selects, double-click fully edits, printable input quick-enters, modifier
and drag gestures extend canonical ranges, and direct controls activate only when explicitly
invoked.

### TGI-005 — Complete command and editor lifecycle

The contract defines every supported pointer, keyboard, modifier, IME, Tab-boundary, popup,
validation, and projection transition. Every editor initializes a typed draft, validates, commits at
most once, cancels without hidden writes, enumerates internal Tab stops, and restores focus through
the controller.

### TGI-006 — Orthogonal row selection and safe actions

Row-checkbox selection remains the complete-matching baseline-plus-exceptions domain required by
spec 012. Cell selection never clears or mutates it. Checkbox and actions cells are selectable but
navigation never activates them. The action cell's primary Enter/Space action opens the inspector;
delete remains an explicit two-step child control.

### TGI-007 — Deterministic bounded copy

Copy is available only to visible grid selection while a grid-owned cell owns focus. It serializes
the latest inclusive operation's rectangle, preserves empty TSV positions for non-copyable cells,
and is all-or-nothing within frozen limits. Exclusion operations and unavailable/oversized data
return typed no-write outcomes. Native editor/widget copy wins.

### TGI-008 — One non-remounting responsive inspector

A persisted, collapsible, nonmodal right inspector follows the active transaction, not checkbox
selection. Wide and narrow presentations use one `<aside>` DOM subtree with stable identity and
exact landmark, labeling, focus-return, and safe-fallback semantics. Updates never steal focus.

### TGI-009 — Notes, automation, and presence follow stable ownership

Notes move from variable-height rows into the inspector while preserving immediate encrypted CRDT
persistence and search. Existing rule, drift, proposal, and auto-apply semantics move to inspector
controllers without row-occluding geometry. Presence derives from the same interaction state and
publishes stable row/field identity only.

### TGI-010 — Fixed row geometry and bounded virtualization

Every transaction row is 57px high. Help, validation, presence, duplicate state, notes, and
automation do not grow it. Preserve the 600-row held-window policy, full matching virtual count,
stable keys, horizontal scrolling, overscan, snapshot/reveal behavior, and only the active/editor
and pending-reveal pins.

### TGI-011 — Preserve financial, CRDT, sync, and filtering behavior

Money remains integer minor units. Existing date/currency/allocation validation, alias/account/tag
creation commands, duplicate operations, undo/redo, search, filtering, import, encryption, sync, and
loro-mirror draft-style mutations remain authoritative except where `source-disposition.md`
explicitly replaces an interaction surface.

### TGI-012 — Replacement coverage and evidence

No superseded behavior, component, hook, or test is removed until its unchanged user assertion or
approved replacement has green unit/DOM/E2E coverage. Completion requires static gates, production
manual verification, repeated retry-free E2E, negative mutation proof, Chrome presentation evidence,
iOS Safari correctness evidence, tree-state attestation, and independent review.

## Out of scope

- paste, fill handles, formulas, or multi-cell writes;
- generic column reordering, resizing, or pinning;
- changing financial calculations, persisted transaction formats, encryption, authentication, or
  sync protocols;
- deployment compatibility, feature flags, dual renderers, or production migrations;
- global shortcuts for destructive row actions;
- agent-configuration edits or a new dependency in the source-freeze phase.

## Human approval decisions

Approval of this source specifically approves:

1. the anchor, rather than the moving extent endpoint, as active DOM focus and edit identity;
2. structural reconciliation replacing old ranges atomically with one canonical one-cell operation,
   or empty selection plus `idle` when no address remains;
3. generation-advanced reconciliation winning over restoration of any stale snapshot or resource;
4. explicit `inspecting` engagement and inspector-owned popup return states with muted selection,
   presence, Escape, close, and continuous-edit semantics, plus focus retention only for the same
   transaction owner and unchanged control binding and deterministic heading/gridcell fallback when
   that predicate fails;
5. the typed quick-entry resolution rules for account, status, and tags, including one atomic
   create-and-assign tag command and its undo/automation boundary;
6. exact outside-pointer validation, commit/cancel, popup close, destination focus, and write
   ordering;
7. the full IME composition lifecycle and exactly-once completed-grapheme insertion;
8. selectable but non-copyable checkbox/actions cells and the inspector as the action cell's safe
   primary activation;
9. copy limits of 10,000 rows, 100,000 cells, and 5 MiB UTF-8 output, whichever is reached first;
10. one nonmodal complementary `<aside>` at every breakpoint rather than a modal dialog/sheet;
11. per-user inspector-open state as an independently merged optional field defaulting to open;
12. the immutable acceptance-key registry used by executable final evidence binding;
13. replacement of inline notes and pointer-adjacent automation geometry with the inspector;
14. F2 remaining unbound;
15. a later human-owned follow-up for any desired `.claude` rule update rather than an edit by this
    implementation.
