# MoneyFlow

[MoneyFlow](https://moneyflow.azurewebsites.net/) tracks your money and how it flows in and out of your various banks and accounts.

[![Build Status](https://dev.azure.com/btefay/MoneyFlow/_apis/build/status/MoneyFlow)](https://dev.azure.com/btefay/MoneyFlow/_build/latest?definitionId=1)

## :page_facing_up: Single view of all your finances

View all your transactions in a single view, consolidating many banks and accounts.
Tag and filter to your hearts content.
Get the benefits of a modern, beautiful spend tracking app without being tied to a particular bank.

## :ledger: Know what you're spending money on

Categorise and visualize your spending, and MoneyFlow will learn over time to do this for you automatically.

## :lock: Safe and secure by design

You own your data. Your data is encrypted, end-to-end, so nobody can access it but you.

## :couple: Manage shared finances

Track ownership of spending if you share your accounts with people you :heart: (multi-party cost allocation across several accounts, with periodic net settlement)

## :inbox_tray: Simple data import

Data import is designed to be painless without comprimising your security. Visit your bank's online banking website
as you normally would, then either:

1. Copy and paste straight out of the web page.
2. Download CSV files of your transactions and upload them to MoneyFlow.
3. In the future, a desktop app will do this for you automatically
   (it will all be open source, so you can be sure nothing :fish: is going on).

## Getting started

### Prerequisites

- Node.js 20.x LTS
- pnpm 8.x+
- Docker (for local Supabase)
- Supabase CLI (`brew install supabase/tap/supabase`)

### Development Setup

```bash
# Install dependencies
pnpm install

# Start local Supabase (requires Docker)
supabase start

# Start Next.js dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Running Tests

```bash
# Unit tests
pnpm test

# E2E tests (requires Supabase running)
supabase start
pnpm test:e2e
```

See [specs/001-core-mvp/quickstart.md](specs/001-core-mvp/quickstart.md) for detailed setup instructions.

## Resources

## Features

- [ ] Coming soon... :wink:
