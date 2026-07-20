# Package Dependencies

## Graph

```text
P00 -> P01 -> all API-sensitive packages
             |-> P02
             |-> P03 external release gate
             |-> P04 -> P05 -> P08 -> P10
                      |-> P06 -> P07 -> P08
                      |          `-------> P19
             |-> P09 -> P11A -> P11B -> P11C -> P12
                     |                      |-----> P13
                     |-> P14 -> P15
                     `-------------------------------------> P16C
             `-> P16A -> P16B ----------------------------> P16C
P16C + P13 -> P16D
P16D + P08 + P11C -> P16E -> P17A
P17A -> P17B -> P17C -> P17D
P18 + P04 + P06 -> P19
P17D + P19 -> P20A -> P20B -> P21
```

## Why the edges exist

- Dependency updates happen first so later work is not built against obsolete APIs. A final drift
  check still occurs at P21.
- Animate UI is evaluated before new dialog/dropdown-heavy work so the project does not create two
  competing component directions.
- RLS is audited before realtime and invites because the current service-role boundary can make
  database policies appear safer than their actual enforcement.
- Realtime authorization precedes invites/presence so those flows do not rely on an unauthenticated
  broadcast channel or the legacy update table.
- User-state removal and membership UX precede passkeys because credentials need a dedicated,
  threat-modeled store rather than reviving an opaque user blob.
- Undo precedes aliases, GC, empty-row creation, imports, allocations, and automations so every
  logical user action can be grouped correctly and maintenance/remote commits can be excluded.
- Alias invariants precede alias UX; full alias behavior precedes GC and manual empty rows because
  manual descriptions must become aliases without raw imported text.
- P16A establishes allocation/ownership validation, owner remainder/effective semantics and exact
  signed decimal apportionment before settlement or persistence consumes them.
- P16B is the sole canonical settlement engine. It depends on P16A's primitives and establishes
  eligibility, per-currency positions, netting, source contributions, typed issues and benchmark
  behavior without persisted or competing settlement implementations.
- P16C depends on P16A/P16B plus undo and import provenance because its per-key and atomic
  complete-set Loro APIs must cover every current grid, add-row, automation, import-time, undo and
  hydration path while preserving history and validation semantics.
- P16D depends on P16C and the real add-row/grid work. It implements actual shared-template person
  columns, horizontal virtualization, historical people and allocation presence rather than an
  isolated component.
- P16E depends on P16D, people/member work and completed alias flows. It integrates People-page
  obligations, typed issues, source navigation, full E2E/manual coverage and performance evidence.
- P17A waits for P16E so automation work is built on the fully reviewed allocation system. Every
  automation allocation write must use P16C's validated atomic complete-set API with explicit-set
  semantics; it may not bypass, clamp or normalize the owner remainder.
- Marketing waits for feature truth. The full style-guide sweep waits until feature churn is done.

The allocation critical path is `P01 -> P16A -> P16B -> P16C -> P16D -> P16E -> P17A`. P16C also
waits for P09 and P14; P16D also waits for P13; P16E also waits for P08 and P11C. `FS-001` and its
P16A–E packages use the same lifecycle and final gates as every `HS-*` requirement.

## External gates

P03 is conditional on TanStack Virtual PR #1100 being released in a stable compatible package. Check
the upstream PR and release notes using primary sources at execution time. If unavailable, record
`blocked_external`, the checked date/version, and a recheck trigger. Do not vendor an unreleased
change or pretend `useFlushSync` is supported.

WebAuthn PRF browser and virtual-authenticator support may constrain automated coverage. That can
limit a test method but not justify faking cryptographic support; record real-device/manual evidence
and capability fallback behavior.

### P05 verified-hidden manual topology gate

- **Checked:** 2026-07-20 against repository-pinned `@playwright/cli` 0.1.17, its Playwright
  1.62.0-alpha runtime protocol, repository Playwright 1.61.1 and the mandatory PROCESS manual-test
  rules.
- **Exact unavailable condition:** PROCESS requires the repository-installed headless CLI and
  forbids headed mode, temporary tests/configs and emulated visibility as acceptance evidence. The
  installed CLI is headless by default, exposes tab selection but no hide/background command, and
  every allowed opener/duplicate page reports `document.visibilityState === "visible"`. Its bundled
  CDP protocol exposes only `Page.setWebLifecycleState` values `active`/`frozen`; no real-hidden
  visibility transition exists. Independent visible-page timing is green at 2,549 ms socket/import
  and 2,591 ms DOM, so no product owner can be inferred.
- **Disposition:** P05/HS-015 is `blocked_external`. Preserve the reviewed revision-11 manager fix,
  keep HS-015 unchecked and authorize no `worker: true`, timeout, focus/reload/poll or emulated-
  hidden substitute. Continue packages not depending on P05.
- **Recheck trigger:** before dispatching P08 or P10, at the next installed CLI/Playwright upgrade
  that provides a verifiable real-hidden headless topology, or before P21—whichever comes first.
  Reopen P05 with a no-product diagnostic revision first; record hidden visibility at mutation,
  15 seconds and completion plus sanitized socket/import/DOM elapsed times before selecting any
  writable product owner.
- **Before-P08 recheck:** P05 revision 12 on 2026-07-20 independently reconfirmed the exact same
  installed versions/source hashes, absent supported hidden command/API and two allowed Chrome pages
  both `visible`, `hidden:false`, focused. Diagnostic evidence/review are
  `evidence/P05/implementation-12.md` and `reviews/P05-review-12.md`. No hidden predicate existed, so
  product/15-second timing was correctly not run. P05/HS-015 remains `blocked_external`; P08/P10
  remain dependency-blocked. The next trigger is a capable installed upgrade or pre-P21.
