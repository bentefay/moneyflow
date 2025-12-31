# MoneyFlow Constitution

## Core Principles

### I. Security & Privacy First

User financial data MUST be encrypted end-to-end; the server (and operators) MUST NOT have access
to decrypted transaction data. All cryptographic operations MUST occur client-side.

- All sensitive data (transactions, allocations, balances) MUST be encrypted before leaving the client
- Encryption keys MUST be derived from user credentials and MUST NOT be stored server-side
- No plaintext financial data in server logs, analytics, or error reports
- Authentication MUST use secure, modern protocols (no plaintext passwords transmitted)

**Rationale**: Users are trusting MoneyFlow with their complete financial picture across multiple
accounts and households. This trust requires absolute privacy guarantees.

### II. Multi-Party Financial Integrity

All expense allocations and settlements MUST maintain mathematical consistency and auditability
across multiple parties and accounts.

- Percentage allocations for any transaction MUST sum to exactly 100%
- Settlement calculations MUST be deterministic and reproducible
- Inter-party balances MUST support bidirectional debt (A owes B, B owes A → net settlement)
- Recurring obligations (e.g., loan interest) MUST be tracked separately from expense allocations
- All allocation changes MUST be versioned with timestamps for audit trail

**Rationale**: The core use case involves splitting expenses between household members (couples,
parents, roommates) with periodic net settlement. Calculation errors erode trust between parties.

### III. Data Portability & Import Flexibility

Users MUST be able to import transaction data from any financial institution without requiring
API integrations or credentials sharing.

- Support copy-paste import from bank web interfaces (HTML table parsing) — future scope; MVP supports CSV/OFX only
- Support CSV upload with flexible column mapping
- Support manual transaction entry as fallback
- Imported data MUST be normalized to a canonical format
- Duplicate detection MUST prevent double-counting: MVP uses same amount + date + merchant/description similarity (Levenshtein < 3); advanced fuzzy matching is future scope
- Future: Desktop automation for scraping (open source, user-auditable)

**Rationale**: Bank API access is fragmented, credential-sharing is a security risk, and most users
can access their bank's website. Painless import without compromising security is a key differentiator.

### IV. Auditability & Transparency

Every financial calculation MUST be explainable and traceable to source transactions.

- Settlement summaries MUST link back to individual transactions and their allocations
- Allocation rules (e.g., "dinner = 30% parents, 35% Ben, 35% wife") MUST be named and reusable
- Category-based auto-allocation MUST show confidence scores and allow manual override
- All automated categorization MUST be reviewable and correctable
- Historical settlements MUST be immutable once confirmed by all parties

**Rationale**: When settling finances with family members, users need to answer "why do I owe this
amount?" with specific transaction-level detail.

### V. User-Owned Data Architecture

Users MUST have complete ownership and control of their financial data.

- Full data export in standard formats (JSON, CSV) MUST always be available
- Account deletion MUST be complete and verifiable
- No vendor lock-in: data format MUST be documented for portability
- Offline-capable: core functionality MUST work without network connectivity
- Self-hosting option SHOULD be supported for privacy-conscious users

**Rationale**: Financial data spans years or decades. Users must not be trapped if MoneyFlow
changes pricing, policies, or ceases operation.

### VI. Performance, Beauty & Craft

MoneyFlow MUST be fast, beautiful, and delightful to use. Quality of experience is non-negotiable.

- **Performance**: Every interaction MUST feel instant (<100ms perceived latency); no loading spinners
  for common operations; offline-first architecture ensures responsiveness regardless of network
- **Beauty**: UI MUST be visually refined with consistent design language, thoughtful typography,
  smooth animations, and attention to pixel-level detail; no "developer UI"
- **Mobile Responsive**: UI MUST be usable on mobile devices; layouts MUST adapt gracefully to
  small screens (scrollable tables, stacked layouts); not mobile-first, but mobile-friendly
- **Ease of Use**: Complex financial workflows MUST be simplified; progressive disclosure over
  overwhelming options; sensible defaults that work for 90% of cases
- **Craft**: Keyboard shortcuts for power users; micro-interactions that spark joy; polish the
  details others ignore; if something feels clunky, fix it before shipping
- **Clear Dependencies**: Favour functional code with explicit dependencies; React Context/Providers
  and tRPC context are fine (scoped, testable); avoid module-level mutable singletons and implicit
  global state; don't fight JS ecosystem patterns, but prefer clarity when there's a choice
- **No Compromises**: Performance and beauty are not traded for features; a fast, elegant app with
  fewer features beats a slow, ugly app with more features

**Rationale**: Managing finances is already stressful. The tool should reduce friction, not add it.
Inspired by Linear's philosophy: software can be both powerful and delightful. Users deserve tools
that respect their time and aesthetic sensibility.

### VII. Robustness & Reliability

MoneyFlow MUST be rock-solid. Financial software has zero tolerance for bugs or data corruption.

- **Test Philosophy**: Favour concise, high-level tests over thousands of unit tests with excessive
  mocking; aim for fewer high-value, readable tests that verify behavior, not implementation
- **Test Harnesses**: Create test harnesses that make tests easy to understand; for pure functions,
  use declarative table-driven tests where it's immediately obvious which cases are covered
- **Test Coverage**: All financial calculations MUST have comprehensive tests; edge cases
  (rounding, zero amounts, negative balances) MUST be explicitly tested
- **Integration Testing**: End-to-end flows (import → allocate → settle) MUST be tested as a whole
- **Property-Based Testing**: Settlement calculations SHOULD use property-based tests to verify
  invariants (e.g., allocations always sum to 100%, settlements are zero-sum between parties)
- **Local Development**: The entire stack MUST be runnable locally; use Vercel CLI for Next.js
  and Supabase CLI for database/auth/realtime; no cloud dependency required for development
- **Regression Prevention**: Every bug fix MUST include a test that would have caught it
- **Data Integrity**: Database migrations MUST be tested; backup/restore MUST be verified
- **Graceful Degradation**: Network failures, malformed imports, and unexpected data MUST be
  handled gracefully with clear error messages, never crashes or data loss
- **Continuous Integration**: All tests MUST pass before merge; no "fix it later" exceptions

**Rationale**: Users are trusting MoneyFlow with their financial relationships. A calculation error
could cause real disputes between family members. Quality tests are readable tests—if you can't
quickly see what's being tested and whether edge cases are covered, the test suite has failed.
Local-first development ensures fast iteration and prevents "works on my machine" issues.

### VIII. LLM-Agent Friendly Codebase

MoneyFlow MUST be designed for effective collaboration with LLM coding agents. The codebase
structure, documentation, and conventions should optimize for AI-assisted development.

- **Global Instructions**: Primary agent guidance lives in `.github/copilot-instructions.md`;
  this file is always loaded by GitHub Copilot and provides architecture, conventions, and
  always-apply rules
- **Path-Specific Instructions**: Domain-specific guidance lives in `.github/instructions/` as
  `NAME.instructions.md` files with YAML frontmatter specifying `applyTo` glob patterns; these
  automatically apply when Copilot works on matching files and combine with global instructions
- **Avoid Scattered Files**: Do NOT use `AGENTS.md` files throughout the codebase; centralize
  all agent instructions in `.github/` for discoverability and consistency
- **Focused Documentation**: Agent instruction files SHOULD be 200-500 lines max; use headers,
  bullet points, and prioritize critical information first; agents have limited context windows
- **Why Over What**: Document _rationale_ for decisions, not just rules; agents can read code to
  see "what", but struggle to infer "why" without explicit documentation
- **Reference, Don't Duplicate**: Point to specs and detailed docs rather than copying content;
  reduces drift and keeps instruction files focused on actionable guidance
- **Consistent Patterns**: Use the same patterns throughout the codebase; consistency reduces
  the context agents need to make correct decisions; document deviations explicitly
- **Self-Describing Code**: Prefer explicit over clever; named constants over magic numbers;
  descriptive function names over comments; code that reads like documentation
- **Spec-Driven Development**: Feature specs in `/specs/` serve as source of truth; agents should
  reference specs when implementing features; keep specs updated as implementation evolves
- **Scannable Structure**: File and folder naming should be predictable; related code should be
  co-located; agents should be able to find relevant code from names alone

**Example structure:**

```
.github/
├── copilot-instructions.md          # Global: architecture, conventions
└── instructions/
    ├── crypto.instructions.md       # applyTo: "src/lib/crypto/**"
    ├── crdt.instructions.md         # applyTo: "src/lib/crdt/**"
    └── components.instructions.md   # applyTo: "src/components/**"
```

**Rationale**: LLM agents are increasingly central to software development. A codebase designed
for human-only comprehension leaves value on the table. By optimizing for agent collaboration—clear
documentation, consistent patterns, explicit rationale—we get faster development, fewer errors,
and better knowledge transfer. Centralized instructions in `.github/` are discoverable, auditable,
and automatically applied, unlike scattered AGENTS.md files that drift and fragment.

### IX. Code Clarity

Code MUST be clear, readable, and self-documenting. Clarity is not optional—it's a feature.

- **Purity**: Favour pure functions with explicit inputs and outputs; side effects should be
  isolated and obvious; given the same inputs, a function should always return the same output
- **Immutability**: Favour immutable data structures; avoid mutation where practical
- **loro-mirror Exception**: ALWAYS use draft-style mutations with loro-mirror `setState()`;
  this allows loro-mirror to track exactly which fields changed and generate optimal CRDT
  operations; never return new objects from setState callbacks
- **Naming**: Use clear, descriptive names; NEVER abbreviate unless the abbreviation is
  universally understood (e.g., `id`, `url`, `html`); `transaction` not `tx` or `txn`;
  `encrypted` not `enc`; `calculate` not `calc`; longer names are fine—clarity beats brevity
- **Comments**: Use comments ONLY when:
  1. The intent is not clear from the code itself (explain _why_, not _what_)
  2. The comment will help an LLM agent make better changes in the future
  3. There's a non-obvious edge case, security consideration, or performance reason
  - If you need a comment to explain _what_ code does, rewrite the code to be clearer instead
- **Structure**: Small, focused functions; early returns over nested conditionals; vertical
  whitespace to group related logic; consistent formatting (Prettier handles this)

**Rationale**: Code is read far more often than it's written. Clear code reduces bugs, speeds up
onboarding, and makes AI-assisted development more effective. Comments that restate code add noise;
comments that explain intent or help future maintainers (human or AI) add value.

---

## Security & Privacy Requirements

Security is not optional. The following constraints apply to all features:

- **Encryption**: XChaCha20-Poly1305 or equivalent for data at rest; TLS 1.3 for data in transit
- **Key Management**: User-derived keys only; no server-side key escrow
- **Authentication**: MFA deferred for key-only authentication model; seed phrase serves as single strong factor (128-bit entropy)
- **Session Management**: Configurable timeout, secure token handling
- **Audit Logging**: Security events logged (login attempts, data exports, sharing changes)
- **Dependency Security**: Regular vulnerability scanning; no dependencies with known critical CVEs

## Financial Domain Constraints

The following constraints reflect the multi-household expense sharing model:

- **Parties**: Support 2+ parties per expense; parties can be individuals or groups (households)
- **Accounts**: A party can have multiple accounts; accounts can be shared between parties
- **Allocations**: Percentage-based allocation per transaction; templates for recurring patterns
- **Settlement Periods**: Configurable reconciliation periods (weekly, monthly, quarterly, custom)
- **Settlement Flow**: Intra-household first (e.g., spouse-to-spouse), then inter-household
- **Loan Tracking**: Support fixed recurring obligations (interest, rent) in settlement calculations
- **Currency**: Single currency per account; multi-currency settlement is out of scope initially

## Governance

This constitution establishes the non-negotiable principles for MoneyFlow development.

- **Supremacy**: Constitution principles override convenience, deadlines, or feature requests
- **Compliance**: All pull requests MUST include a constitution compliance statement
- **Amendments**: Changes require documentation of rationale, impact analysis, and migration plan
- **Versioning**: Semantic versioning (MAJOR.MINOR.PATCH) per standard definitions
- **Review**: Quarterly review of constitution against actual implementation for drift

**Version**: 1.7.0 | **Ratified**: 2025-12-23 | **Last Amended**: 2025-12-24
