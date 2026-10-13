# MoneyFlow

A client-side encrypted, real-time collaborative household expense tracker. All financial data is
encrypted on your device before storage—the server never sees your plaintext data.

## ✨ Features

- **🔒 Zero-Knowledge Security**: End-to-end encryption using XChaCha20-Poly1305. Your data is
  encrypted locally before it leaves your device.
- **📊 Single View of All Finances**: Consolidate transactions from multiple banks and accounts in
  one place.
- **🏷️ Smart Categorization**: Tag and filter transactions with hierarchical categories. Automation
  rules learn to categorize for you.
- **👥 Shared Finance Management**: Track ownership and split expenses with household members.
  Real-time collaboration via CRDT sync.
- **⚖️ Deterministic Settlement**: Per-person percentage allocations derive who owes whom, grouped
  by currency and traceable back to every contributing transaction. See
  [`src/components/features/people/README.md`](src/components/features/people/README.md).
- **📥 Easy Data Import**: Import CSV or OFX files from any bank. Duplicate detection included.
- **🔑 Key-Only Authentication**: No passwords to remember or reset. Your 12-word recovery phrase IS
  your identity.

## 🚀 Quick Start

### Prerequisites

| Tool   | Installation                                                      |
| ------ | ----------------------------------------------------------------- |
| Nix    | [nixos.org/download](https://nixos.org/download) (flakes enabled) |
| direnv | [direnv.net](https://direnv.net) with `nix-direnv`                |
| Docker | [docker.com](https://www.docker.com/get-started)                  |

The flake provides Node.js, Bun, safe-chain and the `run` CLI, and direnv loads it when you enter
the repo. Bun installs packages through safe-chain and only accepts versions at least 48 hours old.

### Development Setup

```bash
# Clone repository
git clone https://github.com/your-org/moneyflow.git
cd moneyflow

# Load the dev shell, which puts `run` on PATH
direnv allow

# Install dependencies
bun install

# Copy environment template
cp .env.local.example .env.local

# Start local Supabase (requires Docker)
run db start

# The above command outputs local credentials. Update .env.local with:
# - NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
# - NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-local-anon-key>

# Start Next.js dev server
run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Working in a git worktree

`.env.local` is gitignored, so a fresh worktree does not have one. Several integration suites talk
to the real local Supabase stack and will refuse to run without it — by design, since a mocked
authorization boundary proves nothing. Bootstrap a new worktree with:

```bash
# From inside the worktree, copy the file from the main checkout. Never commit it.
cp ../../.env.local .env.local
bun install
run db start
```

Exported environment variables take precedence over the file, so CI can supply
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_JWT_SECRET` directly and
skip the file entirely. When `SUPABASE_JWT_SECRET` is absent the helpers read the local Realtime
container's symmetric key via `docker inspect`, which is why Docker must be running. If any of the
three is missing the realtime suites fail with a message naming exactly what to supply; they never
skip themselves silently.

### Running Tests

```bash
# Unit tests (Vitest)
run test unit

# Unit tests in watch mode
run test unit --watch

# E2E tests (requires Supabase running)
run db start
run test e2e

# E2E tests with UI
run test e2e --ui

# Manual browser smoke testing (agent-friendly, no Playwright MCP)
run browser install
run browser -s=smoke open http://localhost:3000
run browser -s=smoke snapshot
run browser -s=smoke console error
run browser -s=smoke close
run browser -s=smoke delete-data
```

## 📁 Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── (onboarding)/         # New user, unlock pages
│   ├── (marketing)/          # Landing page
│   ├── (app)/                # Authenticated app pages
│   │   ├── transactions/     # Transaction management
│   │   ├── accounts/         # Account management
│   │   ├── people/           # People & sharing
│   │   ├── tags/             # Tag hierarchy
│   │   ├── automations/      # Automation rules
│   │   ├── statuses/         # Custom statuses
│   │   └── imports/          # Import history
│   └── api/                  # API routes (tRPC)
├── components/
│   ├── ui/                   # shadcn/ui primitives
│   ├── features/             # Feature-specific components
│   └── providers/            # React context providers
├── lib/
│   ├── crypto/               # Encryption, signing, keys
│   ├── crdt/                 # Loro CRDT state management
│   ├── sync/                 # Real-time sync (Supabase Realtime)
│   ├── import/               # CSV/OFX parsing
│   └── domain/               # Business logic
├── server/                   # tRPC routers and schemas
└── hooks/                    # React hooks

tests/
├── unit/                     # Vitest unit tests
├── integration/              # Integration tests
└── e2e/                      # Playwright E2E tests

supabase/
├── migrations/               # Database migrations
└── config.toml               # Supabase configuration
```

## 🛠️ Available Commands

```bash
run --help                 # Every command; `run <command> --help` for one

# Development
run dev                    # Start dev server (Turbopack)
run build                  # Production build
run start                  # Start production server

# Code Quality
run check                  # Every pre-commit gate, stopping at the first failure
run lint                   # oxlint
run tsc                    # TypeScript type checking for the app and the CLI
run format                 # oxfmt format
run format --check         # Check formatting (CI)

# Testing
run test unit              # App unit and integration tests
run test unit --watch      # Unit tests in watch mode
run test cli               # CLI tests
run test e2e               # E2E tests (Playwright)
run test e2e --ui # E2E tests with UI

# Database
run db start               # Start local Supabase
run db stop                # Stop local Supabase
run db reset               # Reset DB and apply migrations
run db types               # Generate TypeScript types from schema

# Dependencies
run deps outdated          # Updates old enough to pass the minimum release age
```

## 🔐 Security Architecture

MoneyFlow implements a **zero-knowledge architecture**:

1. **Identity**: Users generate a BIP39 12-word seed phrase that derives their Ed25519 keypair
2. **Authentication**: API requests are signed with Ed25519—no passwords, no sessions on server
3. **Encryption**: All vault data is encrypted client-side with XChaCha20-Poly1305
4. **Sharing**: Vault keys are shared via X25519 key exchange (ECIES)
5. **Sync**: Server only stores and relays encrypted binary blobs—never sees plaintext

See [specs/001-core-mvp/data-model.md](specs/001-core-mvp/data-model.md) for detailed cryptographic
design.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run every check (`run check`)
4. Commit your changes (`git commit -m 'feat: add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

See [.github/copilot-instructions.md](.github/copilot-instructions.md) for coding guidelines.

## 📚 Documentation

- [Fusion mission recovery](specs/fusion-mission-recovery/README.md) - Recovered work, complete
  saved specification, and outstanding implementation
- [Specification](specs/001-core-mvp/spec.md) - Feature requirements
- [Implementation Plan](specs/001-core-mvp/plan.md) - Technical architecture
- [Data Model](specs/001-core-mvp/data-model.md) - CRDT schema and encryption
- [Quickstart](specs/001-core-mvp/quickstart.md) - Detailed development setup

## 📄 License

This project is proprietary. All rights reserved.
