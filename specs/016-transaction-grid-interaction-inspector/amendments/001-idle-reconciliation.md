# Amendment 001: Idle Reconciliation Neutrality

## Status and authority

- Amendment acceptance ID: `TGI-AMD-001`
- Status: `PENDING HUMAN APPROVAL`
- Base source commit: `67227d06de0545ea5f95e7ba827b670f8b0aa97a`
- Scope: `TGI-STATE-001`, `TGI-INSP-005`, `TGI-RECON-002`, `TGI-RECON-003`, `TGI-RECON-004`, and
  pending-target application only under `TGI-GEN-*`, `TGI-CMD-*`, and the approved one-shot
  Add/reveal contract

After human approval and a dedicated source-amendment commit, this file is immutable normative
source. It takes precedence over any conflicting interpretation of the scoped clauses above. Until
then, product correction work depending on this decision is blocked. The four original
identity-bound source files remain byte-for-byte frozen.

## Conflict resolved

The approved source is not unambiguous. `TGI-STATE-001` permits `idle` whenever there is no current
grid engagement, and `TGI-INSP-005` requires neutral inspector state without an active transaction.
Read without an engagement precondition, `TGI-RECON-002` and `TGI-RECON-003` can instead require
every non-empty structural projection to synthesize a one-cell selection, active transaction, pin,
and focus result. Those requirements conflict on initial load, on later filter or sort changes while
idle, and when rows return after `TGI-RECON-004` produced an empty idle result.

A second ambiguity appears while an explicit activation or Add/reveal command is waiting for its
exact target. Treating that interval as ordinary `idle` cannot represent the command, pin, origin,
or generation-safe return path. Treating it as engaged publishes selection, inspector ownership, or
presence before the target is ready. This amendment resolves both ambiguities with a distinct
pending state.

## TGI-AMD-001 — Idle reconciliation and pending activation

### Workspace state partition

`state.kind === "idle"` means that the workspace has no current grid engagement and no activation
command in flight. It is independent of whether the workspace has ever been activated, selected,
edited, inspected, or reconciled before. An idle workspace has:

- empty canonical cell selection and no active address;
- no active-row or pending-target pin and no transaction-bound focus request;
- no transaction-bound inspector owner; an open inspector shows its neutral empty state; and
- focus outside transaction-bound grid or inspector controls, which an ordinary structural
  projection change does not move.

`state.kind === "pending-activation"` is a separate, explicitly representable workspace state. It is
neither ordinary `idle` nor an engaged interaction state. Its normative shape is:

```ts
type PendingActivationOrigin<TEngagedSnapshot> =
    | { kind: "neutral" }
    | {
          kind: "engaged";
          snapshot: TEngagedSnapshot;
      };

type PendingActivationWorkspaceState<TEngagedSnapshot> = {
    kind: "pending-activation";
    target: {
        transactionId: TransactionId;
        columnId: TransactionColumnId;
    };
    acceptedCommandId: TransactionGridCommandId;
    projectionGeneration: TransactionProjectionGeneration;
    phase: "reveal" | "focus";
    pendingPin: {
        kind: "pending-target";
        transactionId: TransactionId;
    };
    origin: PendingActivationOrigin<TEngagedSnapshot>;
};
```

For an engaged origin, `snapshot` is the complete canonical prior engaged state and reconciliation
input, including its active address and active-origin pin. The pending state retains that snapshot
only as an origin and return value; it does not publish the snapshot as current selection,
transaction-bound inspector ownership, or editing/viewing presence.

Pending activation suspends only idle's no-pending-command and no-pending-pin guarantees. Until
atomic fulfillment it has:

- no published canonical cell selection or active address;
- no transaction-bound inspector owner;
- no editing or viewing presence; and
- exactly the pins permitted by the origin rule below.

A neutral-origin pending state has only its exact pending-target pin. An engaged-origin pending
state may retain the active-origin pin from its snapshot plus one exact pending-target pin. No
pending state may exceed those roles, broaden either pin, or pin a first, nearest, or replacement
transaction. If both roles name the same transaction, they may share one physical pin while
remaining distinct logical roles.

### Ordinary structural reconciliation

When `state.kind === "idle"`, every structural projection change preserves the complete idle state:

| Projection transition | Required idle result    |
| --------------------- | ----------------------- |
| empty → empty         | Preserve neutral `idle` |
| empty → non-empty     | Preserve neutral `idle` |
| non-empty → non-empty | Preserve neutral `idle` |
| non-empty → empty     | Preserve neutral `idle` |

This rule applies regardless of workspace history. In particular, if `TGI-RECON-004` previously
produced empty selection plus `idle`, a later projection in which rows return remains neutral idle.
Ordinary projection construction or reconciliation never synthesizes a first cell, active
transaction, transaction pin, inspector owner, or focus intent. Projection generation still advances
when required by `TGI-GEN-*`; only engagement remains neutral.

`TGI-RECON-002` and `TGI-RECON-003` apply only when the prior state is engaged and has a prior
canonical active address, or when reconciling the engaged origin of a pending activation. In those
cases, their surviving or replacement one-cell result and focus-owner rules remain unchanged. If an
engaged projection or engaged pending origin becomes empty, `TGI-RECON-004` produces empty selection
plus `idle`, clears the active-origin pin and transaction ownership, and applies its approved
heading-or-after-grid focus fallback only when currently published grid or inspector focus must be
displaced.

### Entering pending activation

An accepted explicit click, grid-focus, keyboard, or Add/reveal command that cannot immediately
fulfill its exact target enters `pending-activation` atomically. The transition captures:

- the exact stable transaction and column IDs;
- the accepted command identity;
- the current projection generation;
- the reveal or focus phase;
- the exact transaction-bound pending pin; and
- either neutral origin or the complete canonical engaged origin snapshot.

Entering the pending state atomically stops publishing any engaged-origin selection, inspector
ownership, and editing/viewing presence. A newer explicit activation atomically replaces the entire
pending record and its pending-target pin while preserving and reconciling the appropriate origin.
No reconciliation step may invent a pending state without an accepted explicit command.

### Generation transition by origin

If projection generation advances from `G` to `G+1` before fulfillment, the pending transition is
scoped by its origin.

For a neutral origin:

1. Re-resolve the same transaction and column IDs against `G+1`.
2. If the exact target survives, update the pending generation to `G+1`, bounded-load and register
   only that target as needed, and continue the reveal or focus phase.
3. If the transaction or column disappears, bounded loading cannot materialize it, registration
   fails, or exact-target focus fails, atomically clear the pending record and pin and return
   neutral `idle`. Never substitute another cell.

For an engaged origin:

1. Atomically reconcile the origin snapshot under `TGI-RECON-002`, `TGI-RECON-003`, or
   `TGI-RECON-004` against `G+1` before target work.
2. Replace the stored origin with that reconciled result: a surviving or replacement canonical
   engaged snapshot, or neutral origin when reconciliation produces the `TGI-RECON-004` empty
   result. Keep only the pins permitted by the updated origin plus the exact pending-target pin.
3. Re-resolve the pending command's same transaction and column IDs against `G+1`. If the exact
   target survives, update the pending generation and continue bounded reveal or focus work.
4. If the target disappears or bounded loading, registration, or exact-target focus fails,
   atomically clear the target work, pending record, and pending-target pin, then return the
   reconciled origin result. A reconciled engaged result remains engaged; a reconciled empty result
   remains neutral `idle`. Never unconditionally discard an engaged origin and never substitute a
   fallback target.

A later projection transition after abort is ordinary reconciliation of the returned state. Rows
appearing later do not revive the aborted command or synthesize engagement.

### Fulfillment and cancellation

Fulfillment is one atomic transition. It publishes the exact target's canonical one-cell selection,
engagement mode, focus result, inspector ownership if commanded, and editing/viewing presence if
commanded, while clearing both the pending-activation record and pending-target pin. No observer may
see published engagement together with either retained pending artifact, and fulfillment occurs
exactly once for the accepted command identity.

Explicit cancellation is also one atomic transition. It clears both the pending-activation record
and pending-target pin, publishes no target engagement, and returns:

- neutral `idle` for a neutral origin; or
- the latest reconciled engaged origin, or neutral `idle` if that origin reconciled through
  `TGI-RECON-004`, for an engaged origin.

Cancellation restores only the reconciled origin result. It never restores a generation-stale
snapshot, retains target work, or activates a replacement cell.

This pending branch authorizes only the explicit target's activation. It does not weaken the
history-independent idle rule and does not turn reconciliation itself into an activation command.
First activation remains owned exclusively by an explicit command under `TGI-CMD-*` and the approved
one-shot Add contract. All approved clauses outside this amendment's explicit scope remain
unchanged.

## Required evidence

Approval admits `TGI-AMD-001` only with direct evidence at the lowest practical layer:

1. unit and property tests covering all four ordinary projection transitions while idle, both before
   any activation and after prior engagement, including rows returning after a `TGI-RECON-004` empty
   result;
2. unit tests proving `pending-activation` is a distinct representable state with exact target,
   command identity, generation, phase, pin, and neutral or canonical engaged origin;
3. unit and integration tests proving pending activation publishes no selection, inspector owner, or
   editing/viewing presence before fulfillment and obeys the neutral and engaged pin bounds;
4. integration tests proving each explicit click, grid-focus, keyboard, and Add/reveal command
   creates only its intended one-cell active address exactly once;
5. unit and integration tests proving neutral-origin `G+1` survival re-resolves the exact stable IDs
   and neutral-origin target/load/register/focus failure clears target work and returns neutral
   idle;
6. unit and integration tests proving engaged-origin `G+1` first reconciles the origin, then
   re-resolves the exact target, and target/load/register/focus failure returns the reconciled
   engaged or empty result rather than unconditional neutral idle;
7. tests proving a second explicit command atomically replaces the first pending record and exact
   pending-target pin without exceeding the origin-scoped pin bound;
8. separate named tests proving fulfillment clears the pending record, fulfillment clears the
   pending pin, cancellation clears the pending record, and cancellation clears the pending pin; and
9. unit/property and integration tests proving already-engaged structural reconciliation still
   produces the approved surviving or replacement one-cell result or `TGI-RECON-004` empty result.

Negative proof must cover exactly these mutation classes:

- `AMD-001-MUT-IDLE-HISTORY`: make idle behavior depend on whether engagement occurred previously;
- `AMD-001-MUT-IDLE-FIRST`: synthesize the first available cell during ordinary idle reconciliation;
- `AMD-001-MUT-PENDING-COLLAPSE`: collapse pending activation into idle or an engaged state;
- `AMD-001-MUT-NEUTRAL-REBASE-FALLBACK`: replace a missing neutral-origin target with another cell;
- `AMD-001-MUT-ENGAGED-ABORT-NEUTRAL`: return unconditional neutral idle after engaged-origin target
  failure;
- `AMD-001-MUT-PIN-BOUNDS`: retain, broaden, or add a pin beyond the origin-scoped maximum;
- `AMD-001-MUT-FULFILL-RECORD-RETAIN`: retain the pending record after fulfillment;
- `AMD-001-MUT-FULFILL-PIN-RETAIN`: retain the pending-target pin after fulfillment;
- `AMD-001-MUT-CANCEL-RECORD-RETAIN`: retain the pending record after cancellation;
- `AMD-001-MUT-CANCEL-PIN-RETAIN`: retain the pending-target pin after cancellation; and
- `AMD-001-MUT-ENGAGED-SUPPRESS`: suppress required already-engaged reconciliation.

Each mutation must make at least one named amendment case fail before restoration, and the same
listed case must pass after restoration.

## Executable amendment accounting

The original executable acceptance registry remains exactly its approved 146 base keys. It is not
renumbered or expanded. The final acceptance package contains exactly 146 base records and exactly
one separate amendment record matching this closed TypeScript shape:

```ts
type Sha256 = string; // lowercase `/^[0-9a-f]{64}$/`
type GitObjectId = string; // lowercase `/^[0-9a-f]{40}$/`
type SpecRelativeArtifactPath = string; // normalized relative to this spec root; no absolute path or `..`

type AmendmentCaseId =
    | "AMD-001-IDLE-ALL-TRANSITIONS"
    | "AMD-001-IDLE-HISTORY-INDEPENDENT"
    | "AMD-001-PENDING-STATE-SHAPE"
    | "AMD-001-EXPLICIT-ACTIVATION"
    | "AMD-001-NEUTRAL-ORIGIN-REBASE"
    | "AMD-001-NEUTRAL-ORIGIN-ABORT"
    | "AMD-001-ENGAGED-ORIGIN-RECONCILE-REBASE"
    | "AMD-001-ENGAGED-ORIGIN-FAILURE-RETURN"
    | "AMD-001-ABORT-LOAD-REGISTER-FOCUS"
    | "AMD-001-PIN-BOUNDS"
    | "AMD-001-PIN-REPLACEMENT"
    | "AMD-001-FULFILL-RECORD-CLEAR"
    | "AMD-001-FULFILL-PIN-CLEAR"
    | "AMD-001-CANCEL-RECORD-CLEAR"
    | "AMD-001-CANCEL-PIN-CLEAR"
    | "AMD-001-ENGAGED-RECONCILIATION";

type AmendmentMutationId =
    | "AMD-001-MUT-IDLE-HISTORY"
    | "AMD-001-MUT-IDLE-FIRST"
    | "AMD-001-MUT-PENDING-COLLAPSE"
    | "AMD-001-MUT-NEUTRAL-REBASE-FALLBACK"
    | "AMD-001-MUT-ENGAGED-ABORT-NEUTRAL"
    | "AMD-001-MUT-PIN-BOUNDS"
    | "AMD-001-MUT-FULFILL-RECORD-RETAIN"
    | "AMD-001-MUT-FULFILL-PIN-RETAIN"
    | "AMD-001-MUT-CANCEL-RECORD-RETAIN"
    | "AMD-001-MUT-CANCEL-PIN-RETAIN"
    | "AMD-001-MUT-ENGAGED-SUPPRESS";

type AmendmentCaseResult = {
    caseId: AmendmentCaseId;
    testName: string;
    verdict: "PASS" | "FAIL";
};

type AmendmentCommand = {
    commandId: string;
    sequence: number;
    command: string;
    head: GitObjectId;
    tree: GitObjectId;
    exitCode: number;
    artifact: {
        path: SpecRelativeArtifactPath;
        sha256: Sha256;
        format: "vitest-json" | "playwright-json" | "text";
        caseResults: [AmendmentCaseResult, ...AmendmentCaseResult[]];
    };
};

type AmendmentCase = {
    caseId: AmendmentCaseId;
    verdict: "PASS" | "FAIL";
    testNames: [string, ...string[]];
    commandIds: [string, ...string[]];
};

type AmendmentNegativeProof = {
    mutationId: AmendmentMutationId;
    baselineSequence: number;
    baselineHead: GitObjectId;
    baselineTree: GitObjectId;
    mutationAppliedSequence: number;
    mutationPatch: {
        path: SpecRelativeArtifactPath;
        sha256: Sha256;
    };
    mutatedTree: GitObjectId;
    failingCommandId: string;
    failingCaseIds: [AmendmentCaseId, ...AmendmentCaseId[]];
    failureArtifact: {
        path: SpecRelativeArtifactPath;
        sha256: Sha256;
    };
    restoredSequence: number;
    restoredTree: GitObjectId;
    passingCommandId: string;
};

type IndependentReviewAttestation = {
    reviewerIdentity: string;
    reviewerRole: string;
    independenceAssertion: "I did not author the amendment or implementation evidence and reviewed both independently.";
    decision: "APPROVE" | "REJECT";
    reviewedAmendmentSha256: Sha256;
    evidenceSha256: Sha256;
    implementationHead: GitObjectId;
    implementationTree: GitObjectId;
    reviewArtifactPath: "evidence/reviews/amendment-001-review-01.md";
    reviewArtifactSha256: Sha256;
};

type TgiAmendment001Record = {
    schemaVersion: 2;
    amendmentAcceptanceId: "TGI-AMD-001";
    verdict: "PASS" | "FAIL";
    sourcePath: "amendments/001-idle-reconciliation.md";
    sourceSha256: Sha256;
    sourceLines: number;
    sourceBytes: number;
    approvalCommit: GitObjectId;
    headCommit: GitObjectId;
    headTree: GitObjectId;
    implementationEvidencePath: "evidence/implementation/amendment-001-01.md";
    implementationEvidenceSha256: Sha256;
    commands: [AmendmentCommand, ...AmendmentCommand[]];
    cases: [AmendmentCase, ...AmendmentCase[]];
    negativeProofs: [AmendmentNegativeProof, ...AmendmentNegativeProof[]];
    independentReview: IndependentReviewAttestation;
    limitations: string[];
};

type FinalAcceptancePackage = {
    baseRecords: AcceptanceRecord[];
    amendmentRecords: [TgiAmendment001Record];
};
```

The manifest validator must reject the package before reading verdicts unless all of these
conditions hold:

1. `baseRecords` contains exactly the unchanged 146-key registry, and no base record uses
   `TGI-AMD-001`.
2. `amendmentRecords` has length one, its only record has no unknown or missing fields, and every
   literal, digest, Git object ID, spec-relative path, line count, byte count, and referenced file
   matches the checked-out tree.
3. `approvalCommit` is an ancestor of `headCommit`; the amendment blob in `approvalCommit` matches
   `sourceSha256`, `sourceLines`, and `sourceBytes`; and the checked-out implementation commit and
   tree match `headCommit` and `headTree`.
4. `commands[].commandId` values are unique. Every command `sequence` and negative-proof
   `baselineSequence`, `mutationAppliedSequence`, and `restoredSequence` is a positive integer, and
   all event sequence values are globally unique. Every command is referenced by at least one case
   or negative proof, every artifact exists and matches its digest, and every artifact parser
   reproduces its recorded named case results.
5. `cases` contains each `AmendmentCaseId` exactly once, with no unknown or duplicate ID, at least
   one test name and command ID per case, and only existing command IDs. A case has
   `verdict === "PASS"` only when every listed test name appears with `PASS` in a referenced
   zero-exit command artifact from `headCommit` and `headTree` and no referenced positive command
   reports that case failing.
6. `negativeProofs` contains each `AmendmentMutationId` exactly once, with no unknown or duplicate
   ID. For every proof, the validator must independently apply the digest-matching patch to the
   clean `baselineHead` and `baselineTree`, derive exactly `mutatedTree`, and reject an unapplied,
   partially applied, differently based, or unrelated patch.
7. Every negative proof's baseline equals `headCommit` and `headTree`. Its event order is exactly
   `baselineSequence < mutationAppliedSequence < failing command sequence < restoredSequence < passing command sequence`.
   The failing command runs at the baseline HEAD with `tree === mutatedTree`, has a non-zero exit,
   and has the same artifact path and digest as `failureArtifact`. The parsed failure artifact must
   contain at least one named `FAIL` result whose case and test name are registered by both
   `failingCaseIds` and `cases`; a non-zero exit caused only by an unrelated test, harness, setup,
   or command failure does not satisfy the proof.
8. Every negative proof's `restoredTree` equals `baselineTree`. Its passing command runs after
   restoration at `baselineHead` with `tree === restoredTree`, exits zero, and reports every
   case/test pair that failed under mutation as passing after restoration. Failing and passing
   command IDs are distinct; negative-proof commands are disjoint from ordinary positive case
   commands.
9. `independentReview` has non-empty reviewer identity and role, the exact independence assertion,
   and a digest-matching review artifact. Its reviewed amendment SHA, evidence SHA, implementation
   HEAD, and implementation tree exactly match `sourceSha256`, `implementationEvidenceSha256`,
   `headCommit`, and `headTree`.
10. The amendment record has `verdict === "PASS"` only when the amendment source is human-approved
    in `approvalCommit`, every required case has `verdict === "PASS"`, all eleven negative proofs
    satisfy the execution bindings above, `independentReview.decision === "APPROVE"`, the
    independent attestation matches the implementation and evidence identities, and `limitations` is
    present even when empty.

A runtime parser must enforce this closed schema, parse command artifacts, derive mutated trees from
baseline plus patch, and enforce every cross-record rule above. TypeScript types, unattested prose,
an unrelated non-zero command, or an independent review of different bytes do not satisfy the
executable-accounting requirement.
