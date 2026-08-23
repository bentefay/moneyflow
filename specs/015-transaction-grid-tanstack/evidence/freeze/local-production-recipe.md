# Local production measurement recipe

**Arms A, B and C are not comparable unless built and served identically.** This is the exact
invocation.

## This is a measurement-harness accommodation, not product code

The production build correctly refuses insecure transport. Nothing here changes that: no product
source is modified, and **encryption, auth and sync semantics are untouched**. The two proxies are
plain byte forwarders bound to loopback only; they terminate TLS in front of a local server and
forward the same request. Client-side encryption still happens in the browser, Ed25519 request
signing is unchanged, and the CRDT/sync path is unchanged.

Specifically it must NOT leak into product code:

- `NEXT_PUBLIC_SUPABASE_URL` is overridden only in the worktree's untracked `.env.local`, never in a
  committed file.
- `x-forwarded-proto: https` is set by the harness proxy for `/api/trpc/**` only, so the app sees
  its real scheme everywhere else.
- `NODE_EXTRA_CA_CERTS` is passed to the measurement server process only.
- The self-signed certificate lives in `/tmp`, never in the repository.

## Why both shims are required

Two independent production-only guards reject a plain-HTTP local stack:

1. `src/app/api/trpc/[trpc]/route.ts` — returns 400 `Secure transport required` when
   `NODE_ENV=production` and the request URL is not `https:`. Fixed by an HTTPS reverse proxy in
   front of Next that sets `x-forwarded-proto: https` on tRPC routes.
2. `src/lib/supabase/url.ts` — `requireSecureSupabaseUrl` throws
   `Supabase URL must use HTTPS outside loopback development` because its loopback exemption is
   gated on `environment !== "production"`. Fixed by an HTTPS proxy in front of Supabase and
   pointing `NEXT_PUBLIC_SUPABASE_URL` at it.

`NEXT_PUBLIC_*` is inlined at build time, so (2) forces a **rebuild**, not just a different runtime
env. That is the step most likely to be missed when preparing another arm.

`SUPABASE_JWT_SECRET` must also be passed to `pnpm start`. `playwright.config.ts` derives it from
the running Realtime container and injects it into its dev `webServer`; `pnpm start` gets nothing,
and identity creation fails.

## Recipe

```bash
ARM_DIR=/tmp/mf-before-cd81290        # per-arm worktree
ARM_PORT=3100                          # never 3000, never 3200
CERT_DIR=/tmp/mf-perf-probe

# 0. Self-signed cert (once). cert.pem is the CA for Node; tls.pem is cert+key.
openssl req -x509 -newkey rsa:2048 -keyout "$CERT_DIR/key.pem" \
  -out "$CERT_DIR/cert.pem" -days 30 -nodes -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
cat "$CERT_DIR/key.pem" "$CERT_DIR/cert.pem" > "$CERT_DIR/tls.pem"

# 1. Worktree pinned to the arm's commit. Never copy or symlink node_modules:
#    a copied node_modules carries a stale vite/vitest cache.
git worktree add "$ARM_DIR" <commit>
cp /home/ben-agents/Code/moneyflow/.env.local "$ARM_DIR/.env.local"
cd "$ARM_DIR" && pnpm install --frozen-lockfile

# 2. Record the binding for the report.
git -C "$ARM_DIR" rev-parse HEAD
sha256sum "$ARM_DIR/pnpm-lock.yaml"
ls -d "$ARM_DIR"/node_modules/.pnpm/@tanstack+react-virtual@* \
      "$ARM_DIR"/node_modules/.pnpm/@tanstack+virtual-core@*

# 3. TLS proxy for Supabase on 54443 -> 54321. MUST forward WebSocket upgrades,
#    or Realtime silently loses sync and a stale tab looks like a product bug.
node /tmp/mf-perf-probe/sb-proxy.mjs &

# 4. Point the build at it, then REBUILD (NEXT_PUBLIC_* is baked in).
sed -i 's#^NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321#NEXT_PUBLIC_SUPABASE_URL=https://127.0.0.1:54443#' \
  "$ARM_DIR/.env.local"
NODE_EXTRA_CA_CERTS="$CERT_DIR/cert.pem" pnpm build

# 5. Serve, with the JWT secret the dev config would have injected.
SECRET=$(docker inspect supabase_realtime_moneyflow \
  --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep -o 'API_JWT_JWKS=.*' | sed 's/^API_JWT_JWKS=//' \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const k=JSON.parse(d).keys.find(x=>x.kty==='oct');process.stdout.write(Buffer.from(k.k,'base64url').toString('utf8'))})")
NODE_EXTRA_CA_CERTS="$CERT_DIR/cert.pem" SUPABASE_JWT_SECRET="$SECRET" \
  PORT="$ARM_PORT" pnpm start &
```

The runner starts its own ephemeral HTTPS proxy in front of `$ARM_PORT` (`startHttpsProxy` in
`tests/perf/measure-grid.ts`) and drives the browser with `ignoreHTTPSErrors: true`.

## Verifying the shims are actually working

A misconfigured arm fails in a way that impersonates a product break — every run dies identically at
identity creation. Check in this order:

| symptom                                                        | cause                                                                                                       |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 400 `Secure transport required`                                | request reached Next as `http:`; proxy not setting `x-forwarded-proto`                                      |
| 500 `Supabase URL must use HTTPS outside loopback development` | built with the `http://` Supabase URL; rebuild needed                                                       |
| identity creation hangs, no error                              | `SUPABASE_JWT_SECRET` not passed to `pnpm start`                                                            |
| `EADDRINUSE` on start, old build keeps serving                 | previous arm's server still holds the port; the new process exits and the STALE build answers every request |

That last one is the dangerous one: it does not look like a failure. Confirm the listener belongs to
the arm you think you are measuring:

```bash
ss -lptn "sport = :$ARM_PORT"
readlink /proc/<pid>/cwd     # must be $ARM_DIR
```

## Ports in use on this host

| port  | owner                                         |
| ----- | --------------------------------------------- |
| 3000  | free (orphaned dev server killed by the lead) |
| 3100  | arm measurement server — mine                 |
| 3200  | **human-owned fixture — do not touch**        |
| 32443 | **human-owned TLS proxy — do not touch**      |
| 32444 | harness HTTPS proxy — mine                    |
| 54321 | Supabase local stack                          |
| 54443 | harness Supabase TLS proxy — mine             |
