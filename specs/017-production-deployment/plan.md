# Plan: Production Deployment

Draft for review. Records the deployment design agreed in conversation on 2026-10-13 and revised on
2026-10-25. Research came from Claude agents and an independent Codex session, which reached the
same core design. Nothing here is implemented yet.

## Goals

- Merging a PR to `main` deploys to production with no manual steps.
- GitHub, Vercel and Supabase are configured as code with Pulumi, written in TypeScript.
- No secrets are committed or left on disk. Unlocking 1Password unlocks every privileged operation.
- As simple as possible: reuse vendor integrations, and write no glue for state storage.

## Decisions

| Concern                 | Decision                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| IaC tool                | Pulumi, TypeScript                                                                                            |
| Root of trust           | 1Password. Unlocking it with a password or fingerprint gives access to everything else                        |
| Secrets                 | A dedicated 1Password vault. The repo holds only `op://` references, resolved at runtime by `op run`          |
| Pulumi state            | Pulumi Cloud free tier                                                                                        |
| Pulumi secrets provider | `passphrase`. The passphrase lives only in 1Password, so Pulumi Cloud stores ciphertext it can't decrypt      |
| Pulumi login            | `PULUMI_ACCESS_TOKEN` comes from 1Password through `op run`. Nothing is saved by `pulumi login`               |
| Who runs `pulumi up`    | A human, from a laptop, through `run infra up`. Not CI, at least initially                                    |
| Builds and deploys      | Vercel's existing GitHub integration. Production is built on merge to `main`                                  |
| Production migrations   | One owner: a GitHub Actions job gated by a Vercel Deployment Check. Supabase "Deploy to production" stays off |
| PR checks               | GitHub Actions `run check` on standard hosted runners, free because the repo is public                        |
| Migration style         | Expand/contract. Every migration must work with the previous app release                                      |

### Why not the alternatives

- **State in 1Password:** 1Password isn't a Pulumi backend. Using it would need a wrapper that
  downloads, runs and re-uploads the state. That wrapper would have no locking, could lose state if
  a run crashes before upload, and is exactly the kind of custom glue we want to avoid.
- **AWS (aws-vault, S3, KMS, Parameter Store):** secure, and it gives MFA on every session. But it
  adds an AWS account, IAM, KMS and a bootstrap stack. 1Password gives one unlock with much less to
  run.
- **State in Vercel:** Vercel has no state backend. Vercel "Secret" env vars are write-only, so
  Vercel can't act as a secret store.
- **State in the repo:** the repo is public, so the encrypted secrets would sit in public history
  forever. There is no locking, and CI would have to commit state back to `main`.
- **State in Supabase:** the state would live inside the infrastructure it manages. Free projects
  pause when idle. It also needs a passphrase plus database credentials.
- **Deploying from Actions with `vercel deploy --prebuilt`:** Vercel recommends its Git integration
  instead. It needs a Vercel token in CI and loses Vercel's build-time system variables.
- **Supabase "Deploy to production" switch:** it migrates in parallel with the Vercel build, with no
  ordering and no gate on promotion. It's an acceptable fallback if the Actions job proves to be
  more trouble than it's worth.

## How Pulumi protects secrets

Pulumi encrypts only values marked as secret. The rest of the state is plain JSON.

- **What counts as secret:**
    - config set with `pulumi config set --secret`
    - fields the provider marks sensitive (the bridged Terraform providers carry `sensitive`
      through)
    - values wrapped in `pulumi.secret()` or listed in `additionalSecretOutputs`
    - anything derived from a secret
- **With the `passphrase` provider,** encryption happens locally before upload.
  `Pulumi.<stack>.yaml` holds only ciphertext and a salt, so it's safe to commit even though the
  repo is public.
- **Unmarked values stay readable** by whoever holds the state, which means Pulumi Cloud. For this
  project that's resource IDs, names, URLs and domains, which is acceptable.
- **The passphrase is the whole system.** Losing it means losing the ability to decrypt the stack's
  secrets. Anyone with both the state and the passphrase can see everything with
  `pulumi stack export --show-secrets`.

## 1Password layout

**Vault `MoneyFlow`**, for infrastructure admin. Only you can read it.

| Item                    | Used for                                                            |
| ----------------------- | ------------------------------------------------------------------- |
| Pulumi access token     | `PULUMI_ACCESS_TOKEN`                                               |
| Pulumi stack passphrase | `PULUMI_CONFIG_PASSPHRASE`                                          |
| Vercel token            | `VERCEL_API_TOKEN`, scoped to the team, with an expiry              |
| Supabase access token   | `SUPABASE_ACCESS_TOKEN`, scoped to the organisation, with an expiry |
| GitHub token            | `GITHUB_TOKEN`, fine-grained and limited to `bentefay/moneyflow`    |
| Captcha secret          | Written into Vercel by Pulumi                                       |
| Realtime signing key    | ES256 private key, written into Vercel by Pulumi (once it exists)   |

**Vault `MoneyFlow Release`**, for CI. A 1Password service account can read only this vault.

| Item                    | Used for                                           |
| ----------------------- | -------------------------------------------------- |
| Supabase release token  | Scoped to the production project only, with expiry |
| Production DB password  | `supabase db push`                                 |
| Smoke-test account seed | Credentials for the synthetic smoke-test account   |

The repo commits `infra/.env.op` containing only references, for example
`VERCEL_API_TOKEN=op://MoneyFlow/Vercel/token`. Local use is `run infra up`, which wraps
`op run --env-file=infra/.env.op -- pulumi up`.

In CI, the service account token is the only GitHub secret. It's stored in the `production`
environment and loaded with 1Password's `load-secrets-action`. If the 1Password plan doesn't include
service accounts, the release items go into GitHub `production` environment secrets instead.

Supabase's generated secret key never enters 1Password. Pulumi reads it from the Supabase provider
and writes it straight into a Vercel "Secret" env var, so no human handles it.

## Providers

| Service  | Package                                                                        | Notes                                                                                     |
| -------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| GitHub   | `@pulumi/github`                                                               | Rulesets, the `production` environment, Actions variables                                 |
| Vercel   | Generated: `pulumi package add terraform-provider vercel/vercel <version>`     | `@pulumiverse/vercel` lags far behind and lacks `ProjectDeploymentCheck`                  |
| Supabase | Generated: `pulumi package add terraform-provider supabase/supabase <version>` | No native Pulumi package exists. Covers the project, settings, API keys and branches only |

Pin every provider version. The "Any Terraform Provider" bridge is actively maintained but not
labelled GA, so expect some friction.

## Ownership

| Configuration                                                   | Owner                                                                              |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Repo rulesets, `production` environment, Actions variables      | Pulumi                                                                             |
| Vercel project, domains, env vars, protection, Deployment Check | Pulumi                                                                             |
| Supabase project, API keys, infrastructure-level settings       | Pulumi, importing the existing project                                             |
| Supabase auth and API config                                    | `supabase/config.toml` via `supabase config push`. Never the same fields as Pulumi |
| Schema, grants, RLS                                             | `supabase/migrations`, applied by the Supabase CLI                                 |
| Workflow definitions                                            | Reviewed `.github/workflows/*.yml`                                                 |
| Secret values                                                   | 1Password                                                                          |

## Pipeline

### On a PR

1. Actions runs `run check` against a throwaway local Supabase stack. This includes replaying every
   migration from empty.
2. Vercel builds a preview.
3. No secrets are exposed to PR jobs. Never use `pull_request_target`, because the repo is public
   and fork PRs run untrusted code.

### On merge to `main`

1. Vercel builds the merge commit with production configuration. The Deployment Check holds it off
   the production domain.
2. Vercel's `vercel.deployment.ready` `repository_dispatch` event starts `production-release.yml`.
   The workflow filters for production, checks out the deployment's SHA, and enters the `production`
   environment.
3. It loads the `MoneyFlow Release` items through the 1Password service account.
4. It runs `supabase db push --dry-run`, then `supabase db push`. No reset, no seed and no history
   repair.
5. It runs a smoke test against the deployment URL, using a dedicated synthetic account.
6. It reports the result with `vercel/repository-dispatch/actions/status`. On success Vercel
   promotes the build. On failure the previous deployment keeps serving.

The workflow uses a concurrency group with `cancel-in-progress: false` and rejects stale SHAs, so it
never interrupts a migration that is running.

## App changes needed before go-live

1. **Supabase key names.** Switch to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and
   `SUPABASE_SECRET_KEY`, matching the `sb_publishable_`/`sb_secret_` keys. Supabase is deprecating
   the anon and service_role keys by the end of 2026.
2. **Realtime signing.** `src/server/routers/realtime.ts` signs HS256 tokens with the legacy
   `SUPABASE_JWT_SECRET`. Move to an imported ES256 signing key using an established JOSE library.
   Keep the legacy secret trusted until the change ships and old tokens have expired.
3. **Passkey origin.** Set `NEXT_PUBLIC_APP_ORIGIN` to the production domain. Previews must never
   inherit it.
4. **Production smoke test.** The Playwright suite starts a local dev server and resets data, so it
   can't run against production. Add a separate non-destructive smoke config.
5. **Migration history.** The repo is linked to the hosted project `jyzsetsvvhawrbmhzyas`, and the
   migrations start at `005`. Reconcile what is already applied before automating anything.

## Phases

1. **Secrets bootstrap:** create both 1Password vaults and populate them by hand. Create a Pulumi
   Cloud account. Add `infra/.env.op` and the `run infra` command.
2. **Import existing resources:** a Pulumi `infra/` project with a passphrase-encrypted stack that
   imports the GitHub repo, Vercel project and Supabase project. Previews must show no replacements.
   Mark production resources `protect: true`.
3. **PR CI:** `ci.yml` running `run check`, registered as a required status check.
4. **App readiness:** the "App changes" items above.
5. **Release gate:** the 1Password service account, `production-release.yml`, the Vercel Deployment
   Check, and the smoke test. Prove in a dry run that a failed migration and a failed smoke test
   each block promotion.
6. **Later, optional:** a staging environment, hosted previews with Supabase branching, and running
   `pulumi up` in CI.

## Open questions

- Does your 1Password plan include service accounts? If not, the release items move into GitHub
  environment secrets.
- Should there be a persistent staging environment before the first production launch?
- Should each production release need a manual reviewer approval, or rely on the automated gates?
  Required reviewers are free because the repo is public.
- Does the imported `supabase_project` resource accept an unset database password?
- Which Supabase plan is production on? Free projects pause when idle, and backups and PITR differ
  between plans.
