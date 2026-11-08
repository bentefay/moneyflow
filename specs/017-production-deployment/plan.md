# Plan: Production Deployment

Records the deployment design as of 2026-11-08. Research came from Claude agents and an independent
Codex session. Work happens on the `feat-production-deployment` branch.

## Goals

- Merging a PR to `main` deploys to production with no manual steps.
- GitHub, Vercel and Supabase are configured as code with Pulumi, written in TypeScript.
- No secrets are committed or left on disk. Unlocking 1Password unlocks every privileged operation.
- As simple as possible: reuse vendor integrations, write no deploy glue, and use free tiers.

## Decisions

| Concern                 | Decision                                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| IaC tool                | Pulumi, TypeScript, run only from a laptop through `run infra …`                                   |
| Root of trust           | 1Password. The repo holds only `op://` references, resolved at runtime by `op run`                 |
| Pulumi state            | Pulumi Cloud free tier                                                                             |
| Pulumi secrets provider | `passphrase`. The passphrase lives only in 1Password, so Pulumi Cloud stores ciphertext            |
| Pulumi login            | `PULUMI_ACCESS_TOKEN` comes from 1Password through `op run`. Never run `pulumi login`              |
| Builds and deploys      | Vercel's existing GitHub integration. Production is built on every merge to `main`                 |
| Production migrations   | Supabase's GitHub integration with "Deploy to production" on. No GitHub runner                     |
| Migration style         | Expand/contract. Every migration must work with the previous app release                           |
| PR checks               | None in CI for now. Run `run check` locally before merging                                         |
| Environments            | Production only. No staging. Previews get no secrets and no database                               |
| Domain                  | No custom domain yet. Production is `moneyflow-bens-projects-6a7cb393.vercel.app`                  |
| Supabase plan           | Free for now. Free projects pause after a week of inactivity and need restoring from the dashboard |

### Consequences of these decisions

- **No ordering between deploy and migration.** Vercel and Supabase both start on merge,
  independently. A failed migration does not stop the new app going live. Backward-compatible
  migrations are what make this safe.
- **Passkeys are tied to the `.vercel.app` hostname.** If a custom domain is added later, existing
  passkeys stop matching and users must register new ones.
- **Deployment Protection must leave the production URL public.** It is currently "all except custom
  domains", which with no custom domain protects production too. Change it to protect preview
  deployments only.
- **A paused free project takes production down.** That happened once already. Restoring it is a
  manual dashboard step.

### Why not the alternatives

- **A GitHub Actions release job gated by a Vercel Deployment Check:** it gives migrate-then-promote
  ordering, but needs a workflow, a 1Password service account and secrets in GitHub. Revisit if the
  lack of ordering causes a real problem.
- **Migrating in the Vercel build command:** it gives ordering too, but puts the database password
  into Vercel, where every production build and its dependencies can read it.
- **State in 1Password:** 1Password isn't a Pulumi backend. A wrapper would have no locking and
  could lose state if a run crashes before upload.
- **AWS (aws-vault, S3, KMS, Parameter Store):** secure, with MFA per session, but much more to run.
- **State in Vercel, the repo or Supabase:** Vercel has no state backend. The repo is public.
  Supabase would hold the state of the infrastructure it is part of, and free projects pause.
- **`vercel deploy --prebuilt` from Actions:** Vercel recommends its Git integration instead.

## Current state of production

Found on 2026-11-01 and not yet fixed:

- **Vercel project `moneyflow`** (team `bens-projects-6a7cb393`) is linked to `bentefay/moneyflow`
  with production branch `main`. Every merge builds production and every PR builds a preview.
- **Env vars were set by hand, Production only:** `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. The app now reads the new names,
  so these must be replaced.
- **Missing:** `SUPABASE_JWT_SECRET`, so Realtime can't issue tokens, and `NEXT_PUBLIC_APP_ORIGIN`,
  so passkeys fall back to the per-deployment `VERCEL_URL` and break on every deploy.
- **Previews have no env vars.**
- **The production URL redirects to Vercel login** because of Deployment Protection.
- **Supabase project `moneyflow`** (`jyzsetsvvhawrbmhzyas`, Sydney, Postgres 17) was paused and has
  been restored. It has no GitHub integration and no branches, so nothing applies migrations. Which
  of `005`–`010` it already has is unknown.

## Environment variables

| Variable                               | Read by | Type   | Purpose                                                                  |
| -------------------------------------- | ------- | ------ | ------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | Both    | Config | The Supabase project address                                             |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser | Config | `sb_publishable_…`. Only reaches what RLS allows; used for Realtime      |
| `SUPABASE_SECRET_KEY`                  | Server  | Secret | `sb_secret_…`, a key dedicated to Vercel. Bypasses RLS                   |
| `SUPABASE_JWT_SECRET`                  | Server  | Secret | Signs 60-second Realtime tokens. To be replaced by an ES256 signing key  |
| `NEXT_PUBLIC_APP_ORIGIN`               | Server  | Config | The canonical origin passkeys are bound to: the production `.vercel.app` |

All are scoped to Production only. `NEXT_PUBLIC_` values are baked into the browser bundle at build
time, so changing one needs a redeploy. `VERCEL_URL` and `NODE_ENV` are provided by Vercel. The
captcha and analytics variables in `.env.local.example` are not read by any code.

## How Pulumi protects secrets

Pulumi encrypts only values marked as secret. The rest of the state is plain JSON.

- **What counts as secret:** config set with `pulumi config set --secret`; fields the provider marks
  sensitive; values wrapped in `pulumi.secret()` or listed in `additionalSecretOutputs`; anything
  derived from a secret.
- **With the `passphrase` provider,** encryption happens locally before upload.
  `Pulumi.<stack>.yaml` holds only ciphertext and a salt, so it is safe to commit.
- **Unmarked values stay readable** by Pulumi Cloud: resource IDs, names, URLs. That is acceptable.
- **The passphrase is the whole system.** Losing it means losing the stack's secrets.

## 1Password layout

Vault `MoneyFlow` in the personal account. Every `op` command passes
`--account FWBJECLB75BRHG3VE7ALXONP5A` so nothing reaches the work account. Each item has
`token name`, `url` and `environment variable` fields, plus setup and rotation steps in its notes.

| Item                | Secret field | Environment variable       | Token scope                                                            |
| ------------------- | ------------ | -------------------------- | ---------------------------------------------------------------------- |
| `Pulumi`            | `credential` | `PULUMI_ACCESS_TOKEN`      | Personal Pulumi Cloud account, 90 days                                 |
| `Pulumi Passphrase` | `password`   | `PULUMI_CONFIG_PASSPHRASE` | Generated by 1Password. Never change it once the stack exists          |
| `Vercel`            | `credential` | `VERCEL_API_TOKEN`         | Project `moneyflow` if the provider allows it, otherwise the team      |
| `Supabase`          | `credential` | `SUPABASE_ACCESS_TOKEN`    | Scoped token for project `moneyflow`, 90 days                          |
| `GitHub`            | `credential` | `GITHUB_TOKEN`             | Fine-grained, `bentefay/moneyflow` only: Administration RW, Metadata R |

The repo will commit `infra/.env.op` with only references, for example
`VERCEL_API_TOKEN=op://MoneyFlow/Vercel/credential`. `run infra <command>` wraps
`op run --env-file=infra/.env.op -- pulumi <command>`.

## Least privilege

- **You** are the only member of each account, with two-factor authentication everywhere. Routine
  work uses the scoped tokens above, never an owner session.
- **GitHub:** a ruleset on `main` requires PRs and blocks force-pushes and deletion, with owner
  bypass. The Vercel and Supabase GitHub Apps are limited to this repo. No secrets in GitHub.
- **Vercel:** holds only the variables above, Production only. Install command
  `bun install --frozen-lockfile`, so builds use exactly the versions safe-chain vetted locally.
  Turn on "Separate Production Secret Values". No database password, and no Supabase or Pulumi
  tokens.
- **Supabase:**
    - The publishable key has no direct table access. RLS is the boundary.
    - A dedicated secret key for Vercel, created by Pulumi and revocable on its own.
    - Disable the legacy `anon` and `service_role` keys once nothing uses them.
    - The database password is used only by Supabase itself. A break-glass copy goes in 1Password.
    - Restrict direct database connections and enforce SSL, after confirming the GitHub
      integration's migrations still work.
- **The app at runtime** holds a full-access secret key, because Supabase secret keys and signing
  keys always carry `service_role`-level power. Client-side encryption means that exposes only
  ciphertext. True least privilege needs a dedicated Postgres role limited to the tables and
  functions the server uses, reached through the pooler. That is a later refactor.

## Providers

| Service  | Package                                                                        | Notes                                                                  |
| -------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| GitHub   | `@pulumi/github`                                                               | Repo settings and the ruleset on `main`                                |
| Vercel   | Generated: `pulumi package add terraform-provider vercel/vercel <version>`     | `@pulumiverse/vercel` lags far behind the official provider            |
| Supabase | Generated: `pulumi package add terraform-provider supabase/supabase <version>` | No native Pulumi package. Covers project, settings, API keys, branches |

Pin every version. Generated providers download Terraform provider binaries from the OpenTofu
registry, which safe-chain does not check. The Pulumi CLI is pinned in `flake.nix` as `pulumi-bin`.

## Ownership

| Configuration                                        | Owner                                                                              |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Repo settings, ruleset on `main`                     | Pulumi                                                                             |
| Vercel project, env vars, protection, build settings | Pulumi, importing the existing project                                             |
| Supabase project, API keys, infrastructure settings  | Pulumi, importing the existing project                                             |
| Supabase auth and API config                         | `supabase/config.toml` via `supabase config push`. Never the same fields as Pulumi |
| Schema, grants, RLS                                  | `supabase/migrations`, applied by Supabase's GitHub integration                    |
| Supabase GitHub integration                          | Manual, in the Supabase dashboard. Pulumi can't manage it                          |
| Secret values                                        | 1Password, or passed provider to provider by Pulumi                                |

## Phases

1. **Done:** the `MoneyFlow` vault and its five items, the Pulumi Cloud account, the Pulumi CLI in
   the flake, and the switch to publishable and secret keys in the app.
2. **Import:** `infra/` project, `infra/.env.op`, the `run infra` command and a `production` stack.
   Import the GitHub repo, Vercel project and Supabase project. The preview must show no changes.
   Mark production resources `protect: true`.
3. **Configure production with Pulumi:** the dedicated Supabase secret key; Vercel env vars under
   the new names, including `SUPABASE_JWT_SECRET` and `NEXT_PUBLIC_APP_ORIGIN`; Deployment
   Protection for previews only; the frozen-lockfile install command; the ruleset on `main`.
4. **Migrations:** find which migrations the hosted database has, reconcile its migration history,
   then connect Supabase's GitHub integration with "Deploy to production" on.
5. **Verify production:** sign up, create a vault, sync between two browsers, register and use a
   passkey, all on the production URL.
6. **Follow-ups:** move Realtime signing to an imported ES256 key; disable the legacy Supabase keys;
   restrict database network access.
7. **Later, if needed:** a PR-test workflow, a custom domain, Supabase Pro, staging, a dedicated
   least-privilege Postgres role for the server.

## Open questions

- Can Pulumi's Vercel provider work with a project-scoped token, or does it need team scope?
- Does the imported `supabase_project` resource accept an unset database password?
- Do Supabase's database network restrictions affect the GitHub integration's migrations?
