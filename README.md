# MoneyFlow

A client-side encrypted, real-time collaborative household expense tracker. All financial data is encrypted on your device before storage—the server never sees your plaintext data.

## ✨ Features

- **🔒 Zero-Knowledge Security**: End-to-end encryption using XChaCha20-Poly1305. Your data is encrypted locally before it leaves your device.
- **📊 Single View of All Finances**: Consolidate transactions from multiple banks and accounts in one place.
- **🏷️ Smart Categorization**: Tag and filter transactions with hierarchical categories. Automation rules learn to categorize for you.
- **👥 Shared Finance Management**: Track ownership and split expenses with household members. Real-time collaboration via CRDT sync.
- **📥 Easy Data Import**: Import CSV or OFX files from any bank. Duplicate detection included.
- **🔑 Key-Only Authentication**: No passwords to remember or reset. Your 12-word recovery phrase IS your identity.

## 🚀 Quick Start

### Prerequisites

| Tool         | Version  | Installation                                      |
| ------------ | -------- | ------------------------------------------------- |
| Node.js      | 20.x LTS | [nodejs.org](https://nodejs.org) or `nvm install 20` |
| pnpm         | 8.x+     | `npm install -g pnpm`                             |
| Docker       | Latest   | [docker.com](https://www.docker.com/get-started)  |
| Supabase CLI | Latest   | `brew install supabase/tap/supabase`              |

### Development Setup

```bash
# Clone repository
git clone https://github.com/your-org/moneyflow.git
cd moneyflow

# Install dependencies
pnpm install

# Copy environment template
cp .env.local.example .env.local

# Start local Supabase (requires Docker)
supabase start

# The above command outputs local credentials. Update .env.local with:
# - NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
# - NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-local-anon-key>

# Start Next.js dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Running Tests

```bash
# Unit tests (Vitest)
pnpm test

# Unit tests in watch mode
pnpm test:watch

# E2E tests (requires Supabase running)
supabase start
pnpm test:e2e

# E2E tests with UI
pnpm test:e2e:ui
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
# Development
pnpm dev              # Start dev server (Turbopack)
pnpm build            # Production build
pnpm start            # Start production server

# Code Quality
pnpm lint             # ESLint
pnpm typecheck        # TypeScript type checking
pnpm format           # Biome format
pnpm format:check     # Check formatting (CI)

# Testing
pnpm test             # Run all unit tests
pnpm test:watch       # Unit tests in watch mode
pnpm test:e2e         # E2E tests (Playwright)
pnpm test:e2e:ui      # E2E tests with UI

# Database
pnpm db:start         # Start local Supabase
pnpm db:stop          # Stop local Supabase
pnpm db:reset         # Reset DB and apply migrations
pnpm db:types         # Generate TypeScript types from schema
```

## 🔐 Security Architecture

MoneyFlow implements a **zero-knowledge architecture**:

1. **Identity**: Users generate a BIP39 12-word seed phrase that derives their Ed25519 keypair
2. **Authentication**: API requests are signed with Ed25519—no passwords, no sessions on server
3. **Encryption**: All vault data is encrypted client-side with XChaCha20-Poly1305
4. **Sharing**: Vault keys are shared via X25519 key exchange (ECIES)
5. **Sync**: Server only stores and relays encrypted binary blobs—never sees plaintext

See [specs/001-core-mvp/data-model.md](specs/001-core-mvp/data-model.md) for detailed cryptographic design.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests and linting (`pnpm test && pnpm lint && pnpm typecheck`)
4. Commit your changes (`git commit -m 'feat: add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

See [.github/copilot-instructions.md](.github/copilot-instructions.md) for coding guidelines.

## 📚 Documentation

- [Specification](specs/001-core-mvp/spec.md) - Feature requirements
- [Implementation Plan](specs/001-core-mvp/plan.md) - Technical architecture
- [Data Model](specs/001-core-mvp/data-model.md) - CRDT schema and encryption
- [Quickstart](specs/001-core-mvp/quickstart.md) - Detailed development setup

## 📄 License

This project is proprietary. All rights reserved.
