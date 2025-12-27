# Tasks: MoneyFlow Core MVP

**Input**: Design documents from `/specs/001-core-mvp/`  
**Prerequisites**: plan.md ✅, spec.md ✅, data-model.md ✅, contracts/api.md ✅, quickstart.md ✅, research.md ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, etc.)
- **[T]**: Test task - must be completed before phase checkpoint
- Includes exact file paths in descriptions

**⚠️ Tests are not optional.** Each phase includes test tasks. A phase is not complete until its tests pass.

## Path Conventions

Based on plan.md structure:

- `src/app/` - Next.js App Router pages
- `src/components/` - React components (ui/, forms/, features/)
- `src/lib/` - Core libraries (crypto/, crdt/, sync/, domain/)
- `src/server/` - tRPC routers and schemas
- `tests/` - Test files (unit/, integration/, e2e/)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, tooling, and base configuration

- [x] T001 Initialize Next.js 15 project with TypeScript, App Router, and Tailwind CSS in repository root
- [x] T002 [P] Install and configure shadcn/ui with dark mode support in src/components/ui/
- [x] T003 [P] Install core dependencies: libsodium-wrappers, @scure/bip39, @noble/hashes, loro-crdt, loro-mirror, loro-mirror-react, zod, remeda
- [x] T004 [P] Install tRPC v11 dependencies: @trpc/server, @trpc/client, @trpc/react-query, @tanstack/react-query, superjson
- [x] T005 [P] Configure ESLint, Prettier, and TypeScript strict mode in root config files
- [x] T006 [P] Install Supabase client (@supabase/supabase-js) and configure environment variables in .env.local.example
- [x] T007 [P] Install testing dependencies: vitest, @testing-library/react, playwright, fast-check
- [x] T008 Create base TypeScript types and Zod schemas in src/types/index.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Crypto Foundation

- [x] T009 Implement BIP39 seed phrase generation (12 words, 128-bit) in src/lib/crypto/seed.ts
- [x] T010 Implement Ed25519 keypair derivation from seed in src/lib/crypto/keypair.ts
- [x] T011 Implement pubkeyHash (BLAKE2b) computation in src/lib/crypto/identity.ts
- [x] T012 [P] Implement sessionStorage helpers for keypair in src/lib/crypto/session.ts
- [x] T013 [P] Implement XChaCha20-Poly1305 encrypt/decrypt functions in src/lib/crypto/encryption.ts
- [x] T014 [P] Implement X25519 key wrapping for vault key sharing in src/lib/crypto/keywrap.ts
- [x] T015 Implement Ed25519 request signing (timestamp, method, path, body hash) in src/lib/crypto/signing.ts

### CRDT Foundation

- [x] T016 Define Loro schema for Vault document (accounts, people, tags, transactions, etc.) in src/lib/crdt/schema.ts
- [x] T017 Create loro-mirror Mirror instance with schema validation in src/lib/crdt/mirror.ts
- [x] T018 Create loro-mirror-react context with createLoroContext in src/lib/crdt/context.tsx
- [x] T019 [P] Implement binary export/import helpers for Loro updates in src/lib/crdt/sync.ts
- [x] T020 [P] Implement encrypted snapshot serialization in src/lib/crdt/snapshot.ts

### Database & API Foundation

- [x] T021 Create Supabase database schema (user_data, vaults, vault_memberships, vault_invites, vault_snapshots, vault_updates) in supabase/migrations/001_initial.sql
- [x] T022 Create RLS policies for pubkey_hash-based access control in supabase/migrations/002_rls_policies.sql
- [ ] T022a Add enc_public_key column to vault_memberships table (X25519 public key for re-keying operations) in supabase/migrations/003_enc_public_key.sql
- [x] T023 Create tRPC instance with context and Ed25519 signature verification middleware in src/server/trpc.ts
- [x] T024 Create root tRPC router merging all sub-routers in src/server/routers/\_app.ts
- [x] T025 [P] Create tRPC client configuration for React in src/lib/trpc/client.ts
- [x] T026 [P] Create Next.js API route handler for tRPC in src/app/api/trpc/[trpc]/route.ts
- [x] T027 Create TRPCProvider wrapper with QueryClientProvider in src/components/providers/trpc-provider.tsx

### Supabase Realtime Foundation

- [x] T028 Implement Supabase Realtime subscription for vault_updates channel in src/lib/supabase/realtime.ts
- [x] T029 Implement sync manager (send/receive encrypted updates) in src/lib/sync/manager.ts

### Vault Selector & Presence Awareness

- [x] T029a Create useActiveVault hook with localStorage persistence in src/hooks/use-active-vault.ts
- [x] T029b Create VaultSelector dropdown component (top-right header) in src/components/features/vault/VaultSelector.tsx
- [x] T029c Create EphemeralStore presence manager in src/lib/sync/presence.ts
- [x] T029d [P] Create PresenceAvatar component (circular, initials, colored border) in src/components/features/presence/PresenceAvatar.tsx
- [x] T029e [P] Create PresenceAvatarGroup component (stacked avatars with tooltip) in src/components/features/presence/PresenceAvatarGroup.tsx
- [x] T029f Create usePresence hook (broadcast own presence, subscribe to peers) in src/hooks/use-vault-presence.ts
- [x] T029g Integrate presence highlighting into TransactionRow (colored left border, cursor indicator) in src/components/features/transactions/TransactionRow.tsx
- [x] T029h Create hashToColor utility for deterministic avatar colors in src/lib/utils/color.ts
- [x] T029i Add VaultSelector and PresenceAvatarGroup to app header in src/app/(app)/layout.tsx

### Layout Foundation

- [x] T030 Create root layout with providers (tRPC, Loro context) in src/app/layout.tsx
- [x] T031 [P] Create app shell layout with sidebar navigation in src/app/(app)/layout.tsx
- [x] T032 [P] Create marketing layout (no auth required) in src/app/(marketing)/layout.tsx
- [x] T033 [P] Create onboarding layout in src/app/(onboarding)/layout.tsx

### Unit Tests for Phases 1-2

- [x] T033a [P] Unit tests for seed phrase generation in tests/unit/crypto/seed.test.ts
- [x] T033b [P] Unit tests for keypair derivation in tests/unit/crypto/keypair.test.ts
- [x] T033c [P] Unit tests for encryption functions in tests/unit/crypto/encryption.test.ts
- [x] T033d [P] Unit tests for key wrapping in tests/unit/crypto/keywrap.test.ts
- [x] T033e [P] Unit tests for request signing in tests/unit/crypto/signing.test.ts
- [x] T033f [P] Unit tests for identity management in tests/unit/crypto/identity.test.ts
- [x] T033g [P] Unit tests for CRDT sync utilities in tests/unit/crdt/sync.test.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Identity Creation & Unlock (Priority: P1) 🎯 MVP

**Goal**: Users can generate a seed phrase to create identity, and unlock their vault by entering the seed phrase each session

**Independent Test**: Generate identity → write down seed → close tab → reopen → enter seed → vault unlocks. Aurora animation plays on successful unlock.

**Important**: Server registration only happens AFTER user confirms they've written down their seed phrase. The flow is:
1. Click "Generate Recovery Phrase" → generates keys locally (no server call)
2. User writes down seed phrase
3. User checks confirmation checkbox
4. Click "Continue to Dashboard" → registers with server and stores session

### API for User Story 1

- [x] T034 Create Zod schemas for user procedures in src/server/schemas/user.ts
- [x] T035 Implement user.register procedure (creates user_data row with pubkey_hash) in src/server/routers/user.ts
- [x] T036 Implement user.getOrCreate procedure (idempotent registration) in src/server/routers/user.ts

### Implementation for User Story 1

- [x] T037 Create createIdentity() function (generates keys WITHOUT storing session) in src/lib/crypto/identity.ts
- [x] T037a Create storeIdentitySession() function (stores session after user confirms) in src/lib/crypto/identity.ts
- [x] T038 Create unlockWithSeed() function for returning users in src/lib/crypto/identity.ts
- [x] T039 Create useIdentity hook (generateNew, registerIdentity, unlock) in src/hooks/use-identity.ts
- [x] T040 [P] Create SeedPhraseDisplay component (12-word grid with copy button) in src/components/features/identity/SeedPhraseDisplay.tsx
- [x] T041 [P] Create SeedPhraseInput component (12 input fields with validation) in src/components/features/identity/SeedPhraseInput.tsx
- [x] T042 [P] Create AuroraBackground component (animated aurora borealis gradient wrapping around the unlock circle, emanating outward) in src/components/features/identity/AuroraBackground.tsx
- [x] T043 Create UnlockCircle component (centered circle with input, instructions, button) in src/components/features/identity/UnlockCircle.tsx
- [x] T044 Create unlock animation (fade inner circle via mask, aurora ring expands outward from circle to reveal app) in src/components/features/identity/UnlockAnimation.tsx
- [x] T045 Create /new-user page (generate seed, confirm checkbox, register on continue) in src/app/(onboarding)/new-user/page.tsx
- [x] T046 Create /unlock page (aurora background + unlock circle + animation) in src/app/(onboarding)/unlock/page.tsx
- [x] T047 Create auth guard HOC/middleware redirecting unauthenticated users to /unlock in src/lib/auth/guard.tsx
- [x] T048 [US1] Integrate auth guard with app layout in src/app/(app)/layout.tsx

**Checkpoint**: Users can create identity and unlock vault. Aurora animation works.

---

## Phase 4: User Story 8 - Marketing Landing Page (Priority: P1) 🎯 MVP

**Goal**: Visitors see a polished marketing page with hero, features, security messaging, and CTAs

**Independent Test**: Visit / → see hero section → scroll through features → click "Get Started" → navigate to /new-user

### Implementation for User Story 8

- [x] T049 [P] [US8] Create HeroSection component (headline, subheadline, CTA buttons) in src/components/features/landing/HeroSection.tsx
- [x] T050 [P] [US8] Create FeaturesSection component (feature grid with icons) in src/components/features/landing/FeaturesSection.tsx
- [x] T051 [P] [US8] Create SecuritySection component (privacy messaging, encryption badge) in src/components/features/landing/SecuritySection.tsx
- [x] T052 [P] [US8] Create CTASection component (final call-to-action) in src/components/features/landing/CTASection.tsx
- [x] T053 [P] [US8] Create Header component (logo, Unlock/Get Started buttons) in src/components/features/landing/Header.tsx
- [x] T054 [P] [US8] Create Footer component (links, copyright) in src/components/features/landing/Footer.tsx
- [x] T055 [US8] Create landing page assembling all sections in src/app/(marketing)/page.tsx

**Checkpoint**: Marketing landing page is live. Lighthouse score 90+.

---

## Phase 5: User Story 5 - View & Edit Transactions (Priority: P1) 🎯 MVP

**Goal**: Users can view transactions in infinite-scrolling table, filter, sort, and edit inline

**Independent Test**: Navigate to /transactions → see table with columns → filter by date → edit a cell → change syncs

### API for User Story 5

- [x] T056 Create Zod schemas for vault procedures in src/server/schemas/vault.ts
- [x] T057 Implement vault.create procedure in src/server/routers/vault.ts
- [ ] T057a Update vault.create to accept and store enc_public_key (X25519 public key for re-keying) in src/server/routers/vault.ts
- [x] T058 Implement vault.list procedure (returns user's vaults) in src/server/routers/vault.ts
- [x] T059 Create Zod schemas for sync procedures in src/server/schemas/sync.ts
- [x] T060 Implement sync.getSnapshot procedure (returns encrypted snapshot) in src/server/routers/sync.ts
- [x] T061 Implement sync.pushUpdate procedure (stores encrypted update) in src/server/routers/sync.ts
- [x] T062 Implement sync.getUpdates procedure (returns updates since version) in src/server/routers/sync.ts

### CRDT Domain Models

- [x] T063 [P] Define Transaction type in Loro schema (date, merchant, description, amount, tags, account, status, allocations) in src/lib/crdt/schema.ts
- [x] T064 [P] Define Account type in Loro schema (name, number, currency, type, balance, owners) in src/lib/crdt/schema.ts
- [x] T065 [P] Define Person type in Loro schema (name, linkedIdentity) in src/lib/crdt/schema.ts
- [x] T066 [P] Define Tag type in Loro schema (name, parent, isTransfer) in src/lib/crdt/schema.ts
- [x] T067 [P] Define Status type in Loro schema (name, treatAsPaid) in src/lib/crdt/schema.ts
- [x] T068 Define Allocation type in Loro schema (personId, percentage) in src/lib/crdt/schema.ts

### Transaction Table Components

- [x] T069 Create TransactionTable container with infinite scroll in src/components/features/transactions/TransactionTable.tsx
- [x] T070 [P] Create TransactionRow component with inline editing in src/components/features/transactions/TransactionRow.tsx
- [x] T071 [P] Create DateCell component (date picker on edit) in src/components/features/transactions/cells/DateCell.tsx
- [x] T072 [P] Create AmountCell component (red/green coloring) in src/components/features/transactions/cells/AmountCell.tsx
- [x] T073 [P] Create TagsCell component with inline tag editor in src/components/features/transactions/cells/TagsCell.tsx
- [x] T074 [P] Create AccountCell component (dropdown) in src/components/features/transactions/cells/AccountCell.tsx
- [x] T075 [P] Create StatusCell component (dropdown) in src/components/features/transactions/cells/StatusCell.tsx
- [x] T076 [P] Create BalanceCell component (running balance display) in src/components/features/transactions/cells/BalanceCell.tsx
- [x] T077 [P] Create PersonAllocationCell component (percentage input) in src/components/features/transactions/cells/PersonAllocationCell.tsx
- [x] T078 Create InlineTagEditor component (pills, search, create button) in src/components/features/transactions/InlineTagEditor.tsx

### Transaction Filtering

- [x] T079 Create TransactionFilters component (tags, date, people, accounts, status, search) in src/components/features/transactions/TransactionFilters.tsx
- [x] T080 [P] Create DateRangeFilter with presets (last 14/30/90 days, MTD, etc.) in src/components/features/transactions/filters/DateRangeFilter.tsx
- [x] T081 [P] Create MultiSelectFilter (reusable for tags, people, accounts, status) in src/components/features/transactions/filters/MultiSelectFilter.tsx
- [x] T082 [P] Create SearchFilter (free-text merchant/description search) in src/components/features/transactions/filters/SearchFilter.tsx

### Transaction Selection & Bulk Edit

- [x] T083 Create useTransactionSelection hook (checkboxes, shift-click, select all visible) in src/hooks/useTransactionSelection.ts
- [x] T084 Create BulkEditToolbar component (appears when multiple selected) in src/components/features/transactions/BulkEditToolbar.tsx
- [x] T085 Create AddTransactionRow component (empty row at top) in src/components/features/transactions/AddTransactionRow.tsx

### Page & Integration

- [x] T086 Create /transactions page integrating table, filters, bulk edit in src/app/(app)/transactions/page.tsx
- [x] T087 [US5] Connect TransactionTable to Loro state via useLoroSelector in src/components/features/transactions/TransactionTable.tsx
- [x] T088 [US5] Implement running balance calculation (cumulative per account) in src/lib/domain/balance.ts
- [x] T089 [US5] Integrate real-time sync (Supabase Realtime → Loro updates) in src/lib/sync/manager.ts

### Tests for Phase 5

- [ ] T089a [T] [US5] Property-based tests for balance calculations in tests/unit/domain/balance.test.ts
- [ ] T089b [T] [US5] Property-based tests for allocation math (fast-check) in tests/unit/domain/allocation.test.ts
- [x] T089c [T] [US5] E2E test: transaction CRUD flow in tests/e2e/transactions.spec.ts

**Checkpoint**: Transaction table functional with filtering, inline edit, real-time sync. **Tests passing.**

---

## Phase 6: User Story 6 - Import Transactions (Priority: P1) 🎯 MVP

**Goal**: Users can import transactions from CSV/OFX files via a wizard

**Independent Test**: Click Import → select CSV → map columns → preview → import → transactions appear in table

### Implementation for User Story 6

- [x] T090 [P] [US6] Create CSV parser utility in src/lib/import/csv.ts
- [x] T091 [P] [US6] Create OFX parser utility (using existing library) in src/lib/import/ofx.ts
- [x] T092 [US6] Create Import type in Loro schema (id, filename, timestamp, transactionIds) in src/lib/crdt/schema.ts
- [x] T093 [US6] Create ImportTemplate type in Loro schema (name, columnMappings, formatting) in src/lib/crdt/schema.ts
- [x] T094 [P] [US6] Create FileDropzone component (drag-and-drop + file picker) in src/components/features/import/FileDropzone.tsx
- [x] T095 [P] [US6] Create ColumnMappingStep component (source → target mapping with examples) in src/components/features/import/ColumnMappingStep.tsx
- [x] T096 [P] [US6] Create FormattingStep component (separators, date format) in src/components/features/import/FormattingStep.tsx
- [x] T097 [P] [US6] Create TemplateSelector component (saved templates dropdown) in src/components/features/import/TemplateSelector.tsx
- [x] T098 [P] [US6] Create PreviewStep component (table preview of parsed transactions) in src/components/features/import/PreviewStep.tsx
- [x] T099 [US6] Create ImportWizard component (steps: File → Config → Preview → Done) in src/components/features/import/ImportWizard.tsx
- [x] T100 [US6] Create /imports/new page hosting the ImportWizard in src/app/(app)/imports/new/page.tsx
- [x] T101 [US6] Implement import transaction creator (parse → validate → create transactions → link to import) in src/lib/import/processor.ts

### Duplicate Detection (Part of Import)

- [x] T101a [US6] Implement Levenshtein distance utility for merchant/description comparison in src/lib/import/levenshtein.ts
- [x] T101b [US6] Implement duplicate detection logic (same amount + date + description similarity) in src/lib/import/duplicates.ts
- [x] T101c [US6] Integrate duplicate detection into import processor (flag duplicateOf on matches) in src/lib/import/processor.ts
- [x] T101d [P] [US6] Create DuplicateBadge component ("Dup?" with hover tooltip) in src/components/features/transactions/DuplicateBadge.tsx
- [x] T101e [US6] Add duplicate resolution actions (Keep/Delete) to TransactionRow in src/components/features/transactions/TransactionRow.tsx
- [x] T101f [US6] Add keyboard shortcuts for duplicate resolution (k=keep, d=delete) in src/components/features/transactions/TransactionTable.tsx
- [x] T101g [US6] Add "Show duplicates only" filter option in src/components/features/transactions/TransactionFilters.tsx

### Transaction Deletion

- [x] T101h [US5] Implement single transaction deletion with confirmation in src/components/features/transactions/TransactionRow.tsx
- [x] T101i [US5] Implement bulk transaction deletion in BulkEditToolbar in src/components/features/transactions/BulkEditToolbar.tsx
- [x] T101j [US5] Add delete keyboard shortcut (d or Delete key) for selected transactions in src/components/features/transactions/TransactionTable.tsx

### Tests for Phase 6

- [ ] T101k [T] [US6] Unit tests for CSV parser (table-driven, real bank exports) in tests/unit/import/csv.test.ts
- [ ] T101l [T] [US6] Unit tests for OFX parser in tests/unit/import/ofx.test.ts
- [ ] T101m [T] [US6] Unit tests for Levenshtein distance in tests/unit/import/levenshtein.test.ts
- [ ] T101n [T] [US6] Unit tests for duplicate detection in tests/unit/import/duplicates.test.ts
- [ ] T101o [T] [US6] Integration tests for import processor in tests/integration/import.test.ts
- [x] T101p [T] [US6] E2E test: import wizard flow in tests/e2e/import.spec.ts

**Checkpoint**: Import CSV/OFX works. Duplicates detected. Templates saved. **Tests passing.**

---

## Phase 7: User Story 2 - Configure Accounts (Priority: P2)

**Goal**: Users can create and manage financial accounts with ownership percentages

**Independent Test**: Navigate to /accounts → add account → set owners with percentages → edit inline → sync to other users

### Implementation for User Story 2

- [ ] T102 [P] [US2] Create AccountRow component with inline editing in src/components/features/accounts/AccountRow.tsx
- [ ] T103 [P] [US2] Create OwnershipEditor component (person + percentage pairs) in src/components/features/accounts/OwnershipEditor.tsx
- [ ] T104 [US2] Create AccountsTable component in src/components/features/accounts/AccountsTable.tsx
- [ ] T105 [US2] Create /accounts page in src/app/(app)/accounts/page.tsx
- [ ] T106 [US2] Connect AccountsTable to Loro state via useLoroSelector/useLoroAction

### Tests for Phase 7

- [ ] T106a [T] [US2] Unit tests for ownership percentage validation (must sum to 100%) in tests/unit/domain/ownership.test.ts

**Checkpoint**: Accounts page functional with inline editing and real-time sync. **Tests passing.**

---

## Phase 8: User Story 3 - Configure People (Priority: P2)

**Goal**: Users can manage people in vault and create invite links for vault sharing

**Independent Test**: Navigate to /people → add person → create invite link → new user opens link → both see shared vault

### API for User Story 3

- [ ] T107 Create Zod schemas for invite procedures in src/server/schemas/invite.ts
- [ ] T108 Implement invite.create procedure (generates ephemeral keypair, 24h expiry) in src/server/routers/invite.ts
- [ ] T109 Implement invite.redeem procedure (key exchange, create membership, store enc_public_key) in src/server/routers/invite.ts
- [ ] T110 Create Zod schemas for membership procedures in src/server/schemas/membership.ts
- [ ] T111 Implement membership.list procedure (returns members with enc_public_key for re-keying) in src/server/routers/membership.ts
- [ ] T111a Implement membership.remove procedure (owner only, triggers re-keying) in src/server/routers/membership.ts
- [ ] T111b Implement vault re-keying logic (generate new vault key, re-encrypt all data, wrap for remaining members using stored enc_public_key) in src/lib/crypto/rekey.ts

### Implementation for User Story 3

- [ ] T112 [P] [US3] Create PersonRow component with inline editing in src/components/features/people/PersonRow.tsx
- [ ] T113 [P] [US3] Create InviteLinkGenerator component (creates link, shows expiry) in src/components/features/people/InviteLinkGenerator.tsx
- [ ] T114 [P] [US3] Create BalanceSummary component (who owes whom) in src/components/features/people/BalanceSummary.tsx
- [ ] T115 [US3] Create PeopleTable component in src/components/features/people/PeopleTable.tsx
- [ ] T116 [US3] Create /people page in src/app/(app)/people/page.tsx
- [ ] T117 [US3] Create /invite/[token] page (redeem invite flow) in src/app/(onboarding)/invite/[token]/page.tsx
- [ ] T118 [US3] Implement settlement balance calculation (transactions with "Treat as Paid" status) in src/lib/domain/settlement.ts

### Tests for Phase 8

- [ ] T118a [T] [US3] Property-based tests for settlement calculations in tests/unit/domain/settlement.test.ts
- [ ] T118b [T] [US3] Integration tests for invite/redeem flow in tests/integration/invite.test.ts
- [ ] T118c [T] [US3] E2E test: multi-user sync in tests/e2e/sync.spec.ts

**Checkpoint**: People page with invite links and balance summary. Multi-user sharing works. **Tests passing.**

---

## Phase 9: User Story 4 - Configure Tags (Priority: P2)

**Goal**: Users can create hierarchical tags with transfer flag for categorization

**Independent Test**: Navigate to /tags → create tag → create child tag → mark as transfer → transactions with transfer tag excluded from reports

### Implementation for User Story 4

- [ ] T119 [P] [US4] Create TagRow component with inline editing in src/components/features/tags/TagRow.tsx
- [ ] T120 [P] [US4] Create ParentTagSelector component (dropdown with hierarchy) in src/components/features/tags/ParentTagSelector.tsx
- [ ] T121 [US4] Create TagsTable component (shows hierarchy) in src/components/features/tags/TagsTable.tsx
- [ ] T122 [US4] Create /tags page in src/app/(app)/tags/page.tsx

### Tests for Phase 9

- [ ] T122a [T] [US4] Unit tests for tag hierarchy traversal in tests/unit/domain/tags.test.ts

**Checkpoint**: Tags page with hierarchy and transfer flag. **Tests passing.**

---

## Phase 10: User Story 7 - Manage Imports (Priority: P3)

**Goal**: Users can view past imports and delete imports with their transactions

**Independent Test**: Navigate to /imports → see list of imports → delete import → confirm → transactions removed

### Implementation for User Story 7

- [ ] T123 [P] [US7] Create ImportRow component (date, filename, count, delete button) in src/components/features/imports/ImportRow.tsx
- [ ] T124 [P] [US7] Create DeleteImportDialog component (confirmation with transaction count) in src/components/features/imports/DeleteImportDialog.tsx
- [ ] T125 [US7] Create ImportsTable component in src/components/features/imports/ImportsTable.tsx
- [ ] T126 [US7] Create /imports page in src/app/(app)/imports/page.tsx
- [ ] T127 [US7] Implement import deletion (cascade delete linked transactions) in src/lib/domain/import.ts

**Checkpoint**: Imports management page functional.

---

## Phase 11: User Story 9 - Configure Statuses (Priority: P2)

**Goal**: Users can create custom transaction statuses with behaviors (e.g., "Treat as Paid")

**Independent Test**: Navigate to /statuses → create status with "Treat as Paid" → assign to transaction → appears in settlement calc

### Implementation for User Story 9

- [ ] T128 [P] [US9] Create StatusRow component with inline editing in src/components/features/statuses/StatusRow.tsx
- [ ] T129 [P] [US9] Create BehaviorSelector component (checkbox for "Treat as Paid") in src/components/features/statuses/BehaviorSelector.tsx
- [ ] T130 [US9] Create StatusesTable component in src/components/features/statuses/StatusesTable.tsx
- [ ] T131 [US9] Create /statuses page in src/app/(app)/statuses/page.tsx
- [ ] T132 [US9] Ensure default statuses ("For Review", "Paid") exist on vault creation in src/lib/crdt/defaults.ts

**Checkpoint**: Statuses page with behaviors. Settlement calculation uses "Treat as Paid" flag.

---

## Phase 12: User Story 10 - Configure Automations (Priority: P2)

**Goal**: Users can create automation rules with conditions and actions for automatic transaction processing

**Independent Test**: Navigate to /automations → create rule (description contains "Amazon" → set tag "Shopping") → import transaction with "Amazon" → tag auto-applied

### Implementation for User Story 10

- [ ] T133 [US10] Create Automation type in Loro schema (name, conditions, actions, order) in src/lib/crdt/schema.ts
- [ ] T134 [US10] Create AutomationApplication type (tracks what was changed for undo) in src/lib/crdt/schema.ts
- [ ] T135 [P] [US10] Create ConditionEditor component (column, operator, value, case-sensitive) in src/components/features/automations/ConditionEditor.tsx
- [ ] T136 [P] [US10] Create ActionEditor component (column → value) in src/components/features/automations/ActionEditor.tsx
- [ ] T137 [P] [US10] Create AutomationRow component with inline editing in src/components/features/automations/AutomationRow.tsx
- [ ] T138 [US10] Create AutomationsTable component (ordered, drag-to-reorder) in src/components/features/automations/AutomationsTable.tsx
- [ ] T139 [US10] Create /automations page in src/app/(app)/automations/page.tsx
- [ ] T140 [US10] Implement automation engine (evaluate conditions, apply actions) in src/lib/domain/automation.ts
- [ ] T141 [US10] Implement regex validation for automation conditions in src/lib/domain/automation.ts
- [ ] T142 [US10] Integrate automation execution on transaction create/import in src/lib/import/processor.ts
- [ ] T143 [US10] Implement automation undo capability (revert changes tracked in AutomationApplication) in src/lib/domain/automation.ts

### Transaction Automation Integration (from US5)

- [ ] T144 [US10] Create AutomationCell component (shows applied rules, update button) in src/components/features/transactions/cells/AutomationCell.tsx
- [ ] T145 [US10] Create AutomationDropdown component ("Create automatically" / "Manual") in src/components/features/transactions/AutomationDropdown.tsx
- [ ] T146 [US10] Implement auto-create automation from transaction (when "Create automatically" preference) in src/lib/domain/automation.ts
- [ ] T147 [US10] Store user automation preference in UserPreferences in Loro schema in src/lib/crdt/schema.ts

### Tests for Phase 12

- [ ] T147a [T] [US10] Unit tests for automation condition matching in tests/unit/domain/automation.test.ts
- [ ] T147b [T] [US10] Integration tests for automation engine in tests/integration/automation.test.ts
- [ ] T147c [T] [US10] Performance test: automation eval <2s for 10k transactions in tests/integration/automation-perf.test.ts

**Checkpoint**: Automation rules work. Auto-creation from transactions. Undo capability. **Tests passing, <2s for 10k txns.**

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Performance optimization, testing, documentation, and final polish

### Performance

- [ ] T148 [P] Optimize transaction list virtualization for 10k+ rows in src/components/features/transactions/TransactionTable.tsx
- [ ] T149 [P] Implement transaction pagination in Loro queries in src/lib/crdt/queries.ts
- [ ] T150 [P] Add loading states and skeletons to all pages in src/components/ui/skeleton.tsx

### E2E Tests (Cross-Cutting)

_Note: Most tests are now embedded in their respective phases. These are cross-cutting E2E tests._

- [x] T157 E2E test: identity creation flow in tests/e2e/identity.spec.ts
- [x] T158 E2E test: transaction CRUD flow in tests/e2e/transactions.spec.ts (→ moved to Phase 5)
- [x] T159 E2E test: import wizard flow in tests/e2e/import.spec.ts (→ moved to Phase 6)
- [x] T160 E2E test: multi-user sync in tests/e2e/sync.spec.ts (→ moved to Phase 8)

### Documentation & Validation

- [ ] T161 [P] Create README.md with setup instructions at repository root
- [ ] T162 [P] Document environment variables in .env.local.example
- [ ] T163 Run quickstart.md validation checklist
- [ ] T164 Lighthouse audit for landing page (target 90+)
- [ ] T165 Final security review (no secrets in code, proper key handling)

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) ← BLOCKS ALL USER STORIES
    ↓
┌───────────────────────────────────────────────────────────────┐
│  Phase 3 (US1: Identity) ─────────────────────────────────────┤
│      ↓ (auth required for all below)                          │
│  Phase 4 (US8: Landing) ← Can run parallel with US1           │
│  Phase 5 (US5: Transactions) ← Core feature, enables most others
│  Phase 6 (US6: Import) ← Depends on US5 transaction schema    │
│      ↓                                                        │
│  Phase 7-12 (US2,3,4,7,9,10) ← Can run in parallel after US5  │
└───────────────────────────────────────────────────────────────┘
    ↓
Phase 13 (Polish)
```

### User Story Dependencies

| Story              | Depends On | Can Parallel With  |
| ------------------ | ---------- | ------------------ |
| US1 (Identity)     | Phase 2    | US8                |
| US8 (Landing)      | Phase 1    | US1                |
| US5 (Transactions) | US1        | -                  |
| US6 (Import)       | US5        | -                  |
| US2 (Accounts)     | US5        | US3, US4, US7, US9 |
| US3 (People)       | US5        | US2, US4, US7, US9 |
| US4 (Tags)         | US5        | US2, US3, US7, US9 |
| US7 (Imports)      | US6        | US2, US3, US4, US9 |
| US9 (Statuses)     | US5        | US2, US3, US4, US7 |
| US10 (Automations) | US5, US6   | -                  |

### Within Each User Story

1. API schemas → API procedures
2. CRDT schema types → React components
3. Individual cells/components → Container components → Pages
4. Integration with Loro state last

---

## Parallel Opportunities

### Phase 2 (Foundational) - Maximum Parallelism

```bash
# Crypto (all parallel after T009-T011):
T012, T013, T014, T015

# CRDT (after T016-T018):
T019, T020

# API (after T023-T024):
T025, T026

# Layout (after T030):
T031, T032, T033
```

### Phase 5 (Transactions) - Cell Components

```bash
# All cell components can be built in parallel:
T071, T072, T073, T074, T075, T076, T077

# All filter components can be built in parallel:
T080, T081, T082
```

### Phase 6 (Import) - Wizard Steps

```bash
# All wizard step components can be built in parallel:
T094, T095, T096, T097, T098
```

---

## Implementation Strategy

### MVP First (P1 Stories Only)

1. ✅ Phase 1: Setup
2. ✅ Phase 2: Foundational (CRITICAL - includes vault selector & presence)
3. ✅ Phase 3: US1 - Identity Creation & Unlock
4. ✅ Phase 4: US8 - Marketing Landing Page
5. ✅ Phase 5: US5 - View & Edit Transactions
6. ✅ Phase 6: US6 - Import Transactions
7. **STOP**: MVP is complete and deployable

**MVP Scope**: 123 tasks (T001-T101j including T029a-T029i)

### Incremental Delivery

After MVP:

- Add US2 (Accounts) → Deploy
- Add US3 (People) with invites → Deploy
- Add US4 (Tags) → Deploy
- Add US9 (Statuses) → Deploy
- Add US7 (Import Management) → Deploy
- Add US10 (Automations) → Deploy
- Polish phase → Final release

### Parallel Team Strategy

With 2+ developers after Phase 2:

| Developer A        | Developer B       |
| ------------------ | ----------------- |
| US1 (Identity)     | US8 (Landing)     |
| US5 (Transactions) | US6 (Import)      |
| US2 (Accounts)     | US3 (People)      |
| US4 (Tags)         | US9 (Statuses)    |
| US10 (Automations) | US7 (Import Mgmt) |

---

## Task Summary

| Phase | User Story        | Task Count | Tests Included |
| ----- | ----------------- | ---------- | -------------- |
| 1     | Setup             | 8          | -              |
| 2     | Foundational      | 34         | 7 (T033a-g)    |
| 3     | US1: Identity     | 15         | 1 (E2E)        |
| 4     | US8: Landing      | 7          | -              |
| 5     | US5: Transactions | 40         | 3 (T089a-c)    |
| 6     | US6: Import       | 28         | 6 (T101k-p)    |
| 7     | US2: Accounts     | 6          | 1 (T106a)      |
| 8     | US3: People       | 15         | 3 (T118a-c)    |
| 9     | US4: Tags         | 5          | 1 (T122a)      |
| 10    | US7: Imports      | 5          | -              |
| 11    | US9: Statuses     | 5          | -              |
| 12    | US10: Automations | 18         | 3 (T147a-c)    |
| 13    | Polish            | 7          | -              |

**Total**: ~193 tasks (including embedded test tasks)  
**MVP (P1 only)**: ~132 tasks (Phases 1-6 with tests)  
**Test tasks**: 25 (embedded in phases, not deferred)
