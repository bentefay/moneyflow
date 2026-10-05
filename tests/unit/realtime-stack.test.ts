/**
 * @vitest-environment node
 *
 * Unit Tests: the live-stack test helper's setup boundary.
 *
 * The realtime integration suites are the only callers of `requireRealtimeStack`, and they can only
 * run against a real Supabase stack. That makes the *failure* path the part a developer meets
 * first: a fresh worktree has no `.env.local` (it is gitignored), and before this the suite died on
 * a raw `ENOENT '.env.local'` that named neither the missing variables nor the way to supply them.
 *
 * These cases pin the setup contract without Docker: what is accepted, what is refused, and that no
 * diagnostic ever carries the secret it is complaining about.
 *
 * They also pin the fixture boundary reachable without a database — the SQL each writer emits, the
 * marker ciphertext that later proves those rows synthetic, the order and scoping of cleanup, and
 * what happens when psql fails. Every case mocks the process boundary: nothing here starts Docker,
 * runs psql or touches the shared local database, so what is proved is the SQL this file emits,
 * never the database's own enforcement of it.
 */

import { describe, expect, it, vi } from "vitest";

const files = vi.hoisted(() => {
    const contents = new Map<string, string | { readonly code: string }>();
    return {
        contents,
        readFileSync: vi.fn((path: string) => {
            const entry = contents.get(path);
            if (entry === undefined) {
                throw Object.assign(new Error(`ENOENT: no such file '${path}'`), {
                    code: "ENOENT"
                });
            }
            if (typeof entry !== "string") {
                throw Object.assign(new Error(`EACCES: permission denied '${path}'`), entry);
            }
            return entry;
        })
    };
});

const processes = vi.hoisted(() => ({
    execFileSync: vi.fn(
        (
            _command: string,
            _args: readonly string[],
            _options?: { readonly input?: string }
        ): string => ""
    )
}));

vi.mock("node:fs", async (importOriginal) => ({
    ...(await importOriginal<typeof import("node:fs")>()),
    readFileSync: files.readFileSync
}));

vi.mock("node:child_process", async (importOriginal) => ({
    ...(await importOriginal<typeof import("node:child_process")>()),
    execFileSync: processes.execFileSync
}));

const STACK_SECRET = "local-realtime-symmetric-key-of-sufficient-length";
const INHERITED_SECRET = "inherited-server-only-secret-of-sufficient-length";

/**
 * Runs `body` with exactly the given `.env.local` contents and environment variables, restoring
 * both afterwards. Absent map entries mean the file does not exist; absent environment entries mean
 * the variable is unset, which is not the same as an empty one.
 */
async function withSetup<T>(
    setup: {
        readonly envFile?: string | { readonly code: string };
        readonly environment?: Readonly<Record<string, string | undefined>>;
        readonly jwks?: string;
        /** Stdout psql is made to return, so a helper's own parsing can be exercised. */
        readonly sql?: string;
    },
    body: (helpers: typeof import("../integration/helpers/realtime-stack")) => Promise<T> | T
): Promise<T> {
    const names = [
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "SUPABASE_JWT_SECRET"
    ] as const;
    const restored = names.map((name) => [name, process.env[name]] as const);
    files.contents.clear();
    files.readFileSync.mockClear();
    processes.execFileSync.mockClear();
    processes.execFileSync.mockImplementation((_command, args) =>
        args.includes("psql")
            ? (setup.sql ?? "")
            : setup.jwks === undefined
              ? ""
              : `API_JWT_JWKS=${setup.jwks}\n`
    );
    if (setup.envFile !== undefined) files.contents.set(".env.local", setup.envFile);
    for (const name of names) {
        const value = setup.environment?.[name];
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
    }

    try {
        vi.resetModules();
        return await body(await import("../integration/helpers/realtime-stack"));
    } finally {
        for (const [name, value] of restored) {
            if (value === undefined) delete process.env[name];
            else process.env[name] = value;
        }
    }
}

function symmetricJwks(secret: string): string {
    return JSON.stringify({
        keys: [{ kty: "oct", k: Buffer.from(secret, "utf8").toString("base64url") }]
    });
}

describe("requireRealtimeStack resolves the local stack", () => {
    it("reads the URL and anon key from .env.local and the key from the running container", async () => {
        const stack = await withSetup(
            {
                envFile: [
                    "# comment",
                    "NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321",
                    "NEXT_PUBLIC_SUPABASE_ANON_KEY=file-anon-key",
                    ""
                ].join("\n"),
                jwks: symmetricJwks(STACK_SECRET)
            },
            (helpers) => helpers.requireRealtimeStack()
        );

        expect(stack.supabaseUrl).toBe("http://127.0.0.1:54321");
        expect(stack.anonKey).toBe("file-anon-key");
        expect(stack.jwtSecret).toBe(STACK_SECRET);
    });

    it("lets an inherited variable win over the file, so CI can override without editing it", async () => {
        const stack = await withSetup(
            {
                envFile: [
                    "NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321",
                    "NEXT_PUBLIC_SUPABASE_ANON_KEY=file-anon-key"
                ].join("\n"),
                environment: {
                    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:64321",
                    SUPABASE_JWT_SECRET: INHERITED_SECRET
                }
            },
            (helpers) => helpers.requireRealtimeStack()
        );

        expect(stack.supabaseUrl).toBe("http://127.0.0.1:64321");
        expect(stack.anonKey).toBe("file-anon-key");
    });

    it("succeeds with no .env.local at all when the environment is complete", async () => {
        const stack = await withSetup(
            {
                environment: {
                    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
                    NEXT_PUBLIC_SUPABASE_ANON_KEY: "inherited-anon-key",
                    SUPABASE_JWT_SECRET: INHERITED_SECRET
                }
            },
            (helpers) => helpers.requireRealtimeStack()
        );

        expect(stack.anonKey).toBe("inherited-anon-key");
        expect(stack.jwtSecret).toBe(INHERITED_SECRET);
        // An inherited secret is authoritative, so no container is inspected for one.
        expect(processes.execFileSync).not.toHaveBeenCalled();
    });

    it("falls back to the container when the inherited secret is too short to be a real key", async () => {
        const stack = await withSetup(
            {
                environment: {
                    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
                    NEXT_PUBLIC_SUPABASE_ANON_KEY: "inherited-anon-key",
                    SUPABASE_JWT_SECRET: "too-short"
                },
                jwks: symmetricJwks(STACK_SECRET)
            },
            (helpers) => helpers.requireRealtimeStack()
        );

        expect(stack.jwtSecret).toBe(STACK_SECRET);
    });
});

describe("requireRealtimeStack refuses an unusable setup with an actionable message", () => {
    it("names both variables and the worktree bootstrap when .env.local is absent", async () => {
        const failure = await withSetup({ environment: {} }, (helpers) => {
            try {
                helpers.requireRealtimeStack();
                return null;
            } catch (error) {
                return error instanceof Error ? error : new Error(String(error));
            }
        });

        expect(failure?.message).toContain("NEXT_PUBLIC_SUPABASE_URL");
        expect(failure?.message).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
        expect(failure?.message).toContain(".env.local");
        expect(failure?.message).toContain("pnpm db:start");
        // The raw filesystem error is not what a developer needs to read here.
        expect(failure?.message).not.toContain("ENOENT");
    });

    it("still refuses when the file exists but only supplies half the configuration", async () => {
        const failure = await withSetup(
            { envFile: "NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321\n" },
            (helpers) => {
                try {
                    helpers.requireRealtimeStack();
                    return null;
                } catch (error) {
                    return error instanceof Error ? error : new Error(String(error));
                }
            }
        );

        expect(failure?.message).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    });

    it("reports a missing stack key without echoing any secret material", async () => {
        const failure = await withSetup(
            {
                environment: {
                    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
                    NEXT_PUBLIC_SUPABASE_ANON_KEY: "inherited-anon-key"
                },
                jwks: JSON.stringify({ keys: [{ kty: "RSA", n: "not-symmetric" }] })
            },
            (helpers) => {
                try {
                    helpers.requireRealtimeStack();
                    return null;
                } catch (error) {
                    return error instanceof Error ? error : new Error(String(error));
                }
            }
        );

        expect(failure?.message).toContain("SUPABASE_JWT_SECRET");
        expect(failure?.message).toContain("pnpm db:start");
        expect(failure?.message).not.toContain("not-symmetric");
        expect(String(failure?.cause)).not.toContain("not-symmetric");
    });

    it("does not treat a permission failure on .env.local as an absent file", async () => {
        const failure = await withSetup(
            {
                envFile: { code: "EACCES" },
                environment: {
                    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
                    NEXT_PUBLIC_SUPABASE_ANON_KEY: "inherited-anon-key",
                    SUPABASE_JWT_SECRET: INHERITED_SECRET
                }
            },
            (helpers) => {
                try {
                    helpers.requireRealtimeStack();
                    return null;
                } catch (error) {
                    return error instanceof Error ? error : new Error(String(error));
                }
            }
        );

        // Silently degrading an unreadable file into "no configuration" would hide a real problem.
        expect(failure?.message).toContain("EACCES");
    });
});

const VAULT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_VAULT_ID = "22222222-2222-4222-8222-222222222222";

/** The SQL the helpers handed psql on their `index`-th call. */
function emittedSql(index = 0): string {
    const [, , options] = processes.execFileSync.mock.calls[index];
    return options?.input ?? "";
}

describe("fixture SQL fails loudly and owns exactly its own rows", () => {
    it("runs every statement under ON_ERROR_STOP so a failed fixture write cannot pass as success", async () => {
        await withSetup({}, (helpers) => {
            helpers.runSql("SELECT 1;");

            const [, args] = processes.execFileSync.mock.calls[0];
            expect(args).toContain("ON_ERROR_STOP=1");
            // `-X` keeps a developer's own ~/.psqlrc from altering what these statements mean.
            expect(args).toContain("-X");
        });
    });

    it("deletes the operations that hold vaults down before deleting the vaults themselves", async () => {
        await withSetup({}, (helpers) => {
            helpers.cleanUpVaultFixtures([VAULT_ID]);

            const statement = emittedSql();
            // `vault_ops` references `vaults` with ON DELETE RESTRICT: leaving it out is what made
            // the whole cleanup fail, silently, for every run before this.
            expect(statement.indexOf("public.vault_ops")).toBeGreaterThan(-1);
            expect(statement.indexOf("public.vault_ops")).toBeLessThan(
                statement.indexOf("public.vaults WHERE id")
            );
            expect(statement).toContain(VAULT_ID);
        });
    });

    it("touches nothing at all when a suite created no fixtures", async () => {
        await withSetup({}, (helpers) => {
            helpers.cleanUpVaultFixtures([]);
            const counts = helpers.countVaultFixtureRows([]);

            expect(processes.execFileSync).not.toHaveBeenCalled();
            expect(counts).toEqual({ vaults: 0, operations: 0, grants: 0, memberships: 0 });
        });
    });
});

describe("fixture writers carry the marker ciphertext that later proves a row synthetic", () => {
    it("creates a vault through the owner RPC with both membership markers and returns its id", async () => {
        await withSetup({ sql: `${VAULT_ID}\n` }, (helpers) => {
            const ownerHash = "owner-hash";

            const vaultId = helpers.createVaultOwnedBy(ownerHash);

            const statement = emittedSql();
            expect(vaultId).toBe(VAULT_ID);
            expect(statement).toContain("public.create_vault_for_owner");
            expect(statement).toContain(ownerHash);
            expect(statement).toContain("'d3JhcHBlZA=='");
            expect(statement).toContain("'cHVibGlj'");
            expect(statement).not.toContain("vault_snapshots");
        });
    });

    it("adds a member row carrying the same pair, and writes no snapshot beside it", async () => {
        await withSetup({}, (helpers) => {
            const memberHash = "member-hash";

            helpers.addVaultMember(VAULT_ID, memberHash);

            const statement = emittedSql();
            expect(statement).toContain("INSERT INTO public.vault_memberships");
            expect(statement).toContain(VAULT_ID);
            expect(statement).toContain(memberHash);
            expect(statement).toContain("'d3JhcHBlZA=='");
            expect(statement).toContain("'cHVibGlj'");
            expect(statement).not.toContain("vault_snapshots");
        });
    });

    it("appends an op whose marker pair and returned id match the JSON it emitted", async () => {
        await withSetup({}, (helpers) => {
            const authorHash = "author-hash";

            const operationId = helpers.appendVaultOp(VAULT_ID, authorHash);

            const statement = emittedSql();
            expect(statement).toContain("public.append_vault_ops");
            expect(statement).toContain(authorHash);
            expect(statement).toContain('"encrypted_data":"aHMwMTUtZW5jcnlwdGVkLW9w"');
            expect(statement).toContain('"version_vector":"e30="');
            // The caller cleans up and asserts against this id, so it has to be the one written.
            expect(statement).toContain(`"id":"${operationId}"`);
            expect(operationId).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
            );
            expect(statement).not.toContain("vault_snapshots");
        });
    });

    it("propagates a psql failure instead of reporting a fixture that was never written", async () => {
        await withSetup({}, (helpers) => {
            processes.execFileSync.mockImplementation(() => {
                throw new Error("psql: FATAL: database is not accepting connections");
            });

            expect(() => helpers.createVaultOwnedBy("owner-hash")).toThrow(
                "database is not accepting connections"
            );
            // One attempt, no retry and no swallowed error dressed up as a created vault.
            expect(processes.execFileSync).toHaveBeenCalledTimes(1);
        });
    });
});

describe("cleanup owns exactly the vault ids it was handed", () => {
    it("deletes all seven tables once each, in foreign-key order, inside one transaction", async () => {
        await withSetup({}, (helpers) => {
            helpers.cleanUpVaultFixtures([VAULT_ID]);

            expect(processes.execFileSync).toHaveBeenCalledTimes(1);
            const statement = emittedSql();
            const tables = [
                "public.realtime_grants",
                "public.vault_ops",
                "public.vault_updates_legacy",
                "public.vault_snapshots",
                "public.vault_invites",
                "public.vault_memberships",
                "public.vaults"
            ];
            const positions = tables.map((table) => statement.indexOf(`DELETE FROM ${table} `));

            for (const [index, table] of tables.entries()) {
                expect(positions[index]).toBeGreaterThan(-1);
                expect(statement.split(`DELETE FROM ${table} `)).toHaveLength(2);
            }
            expect(positions).toEqual([...positions].sort((a, b) => a - b));
            // The snapshot delete already exists, between legacy updates and invites.
            expect(positions[3]).toBeGreaterThan(positions[2]);
            expect(positions[3]).toBeLessThan(positions[4]);
            // Suspending the append-only trigger has to be inside the transaction it applies to.
            expect(statement.indexOf("BEGIN;")).toBeLessThan(
                statement.indexOf("SET LOCAL session_replication_role = replica")
            );
            expect(statement.indexOf("SET LOCAL session_replication_role = replica")).toBeLessThan(
                Math.min(...positions)
            );
            expect(statement.indexOf("COMMIT;")).toBeGreaterThan(Math.max(...positions));

            const [, args] = processes.execFileSync.mock.calls[0];
            expect(args).toContain("-X");
            expect(args).toContain("ON_ERROR_STOP=1");
        });
    });

    it("scopes every predicate to the complete supplied set, repeats and all", async () => {
        await withSetup({}, (helpers) => {
            helpers.cleanUpVaultFixtures([VAULT_ID, VAULT_ID]);
            const repeated = emittedSql();

            processes.execFileSync.mockClear();
            helpers.cleanUpVaultFixtures([VAULT_ID, OTHER_VAULT_ID]);
            const distinct = emittedSql();

            // A repeated id is still only this suite's id: harmless, and not worth de-duplicating.
            expect(repeated.split(`'${VAULT_ID}'::uuid`)).toHaveLength(15);
            for (const predicate of distinct.match(/IN \([^)]*\)/g) ?? []) {
                expect(predicate).toContain(VAULT_ID);
                expect(predicate).toContain(OTHER_VAULT_ID);
            }
            expect(distinct.match(/IN \([^)]*\)/g)).toHaveLength(7);
        });
    });

    it("propagates a failed cleanup rather than leaving a suite believing it cleaned up", async () => {
        await withSetup({}, (helpers) => {
            processes.execFileSync.mockImplementation(() => {
                throw new Error("psql: ERROR: update or delete on table violates foreign key");
            });

            expect(() => helpers.cleanUpVaultFixtures([VAULT_ID])).toThrow("violates foreign key");
            expect(processes.execFileSync).toHaveBeenCalledTimes(1);
        });
    });
});

describe("fixture row counts stay the four tables a writer exists for", () => {
    it("parses the four counts psql returns and scopes each subquery to the supplied ids", async () => {
        await withSetup({ sql: "1|2|3|4\n" }, (helpers) => {
            const counts = helpers.countVaultFixtureRows([VAULT_ID, OTHER_VAULT_ID]);

            // Snapshots are absent on purpose: nothing writes them, so nothing counts them yet.
            expect(counts).toEqual({ vaults: 1, operations: 2, grants: 3, memberships: 4 });
            const statement = emittedSql();
            expect(statement).not.toContain("vault_snapshots");
            for (const predicate of statement.match(/IN \([^)]*\)/g) ?? []) {
                expect(predicate).toContain(VAULT_ID);
                expect(predicate).toContain(OTHER_VAULT_ID);
            }
            expect(statement.match(/IN \([^)]*\)/g)).toHaveLength(4);
        });
    });

    it("refuses a malformed count row instead of reporting a plausible zero", async () => {
        await withSetup({ sql: "1|2|3\n" }, (helpers) => {
            expect(() => helpers.countVaultFixtureRows([VAULT_ID])).toThrow(
                "Fixture row counts could not be read"
            );
        });

        await withSetup({ sql: "1|2|3|not-a-number\n" }, (helpers) => {
            expect(() => helpers.countVaultFixtureRows([VAULT_ID])).toThrow(
                "Fixture row counts could not be read"
            );
        });
    });
});
