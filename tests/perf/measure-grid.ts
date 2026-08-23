/**
 * The measurement runner. One arm in, one JSON report plus one table out.
 *
 * Runs unchanged against any arm (BEFORE / deps-only / AFTER) because it only
 * touches the DOM contract documented in `grid-sampler.ts`.
 *
 * PRODUCTION-ONLY, AND WHY IT NEEDS TLS. The production build refuses tRPC over
 * plain HTTP (`route.ts`: "Secure transport required") and refuses an `http://`
 * Supabase URL once `NODE_ENV=production` (`src/lib/supabase/url.ts`). So a
 * local production measurement requires (a) an HTTPS reverse proxy in front of
 * the Next server that sets `x-forwarded-proto: https`, and (b) the app rebuilt
 * with `NEXT_PUBLIC_SUPABASE_URL` pointing at an HTTPS proxy for Supabase,
 * because `NEXT_PUBLIC_*` is inlined at build time. Both are supplied by the
 * caller; this module only consumes the resulting base URL.
 *
 * INPUT IS DRIVEN FROM HERE, ON A WALL CLOCK. Route deltas are dispatched as
 * real wheel events through `Input.dispatchMouseEvent` at absolute deadlines, so
 * a slow grid receives the same input sequence over the same wall-clock duration
 * as a fast one. See the measured justification in `scroll-routes.ts`.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { connect as netConnect } from "node:net";
import type { AddressInfo } from "node:net";

import { chromium, type Browser, type CDPSession, type Page } from "@playwright/test";

import {
    measurementLaunchOptions,
    MEASUREMENT_VIEWPORT,
    PRESENTATION_TRACE_CATEGORIES
} from "./browser-environment";
import { enrichmentPlan, FIXTURE_TRANSACTION_COUNT } from "./fixture/transaction-fixture";
import {
    assertFixtureDomEvidence,
    createAccounts,
    createFieldRules,
    createIdentity,
    createPeople,
    createTags,
    importAllAccounts,
    readFixtureDomEvidence,
    readImportLedger,
    type FixtureDomEvidence,
    type ImportLedger,
    type ImportOutcome
} from "./fixture/vault-setup";
import {
    buildCadenceReport,
    buildRouteReport,
    classifyFrame,
    combinedRouteFailures,
    DEFAULT_CLASSIFICATION_THRESHOLDS,
    type CadenceReport,
    type RouteReport,
    type SemanticSample
} from "./frame-report";
import {
    GRID_CLEAN_SAMPLE_LOOP_SOURCE,
    GRID_SAMPLE_LOOP_SOURCE,
    HOLD_SCROLL_OFFSET_SOURCE,
    INSTALL_GRID_OBSERVER_SOURCE,
    PREFIX_PRELOAD_SOURCE,
    type RawGridSample,
    type RawTimingSample,
    type RouteRunResult
} from "./grid-sampler";
import { routeDistance, SCROLL_ROUTES, type ScrollRoute } from "./scroll-routes";
import {
    buildExpectedFrames,
    declaredVsyncIntervalMicroseconds,
    expectedFrameCountFromSpan,
    extractUserTimingMarks
} from "./trace-presentation";

export interface ProxyHandle {
    readonly baseUrl: string;
    readonly close: () => Promise<void>;
}

/**
 * HTTPS reverse proxy to the Next server. Loopback-only, and it only claims
 * `https` for `/api/trpc/**` so the rest of the app sees its real scheme.
 */
export async function startHttpsProxy(upstreamPort: number, tlsPem: Buffer): Promise<ProxyHandle> {
    const isLoopback = (address: string | undefined): boolean =>
        address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";

    const server = createHttpsServer({ cert: tlsPem, key: tlsPem }, (incoming, response) => {
        if (!isLoopback(incoming.socket.remoteAddress)) {
            response.writeHead(403).end("Loopback only");
            return;
        }
        const headers = { ...incoming.headers };
        delete headers["x-forwarded-proto"];
        if (incoming.url?.startsWith("/api/trpc/") === true) {
            headers["x-forwarded-proto"] = "https";
        }
        const upstream = httpRequest(
            {
                headers,
                host: "127.0.0.1",
                method: incoming.method,
                path: incoming.url,
                port: upstreamPort
            },
            (upstreamResponse) => {
                response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
                upstreamResponse.pipe(response);
            }
        );
        upstream.on("error", () => {
            if (!response.headersSent) response.writeHead(502);
            response.end("Upstream unavailable");
        });
        incoming.pipe(upstream);
    });

    // Realtime rides a WebSocket; without upgrade forwarding the client loses
    // sync and a stale tab looks like a product defect.
    server.on("upgrade", (incoming, socket, head) => {
        const upstream = netConnect(upstreamPort, "127.0.0.1", () => {
            const headerLines = Object.entries(incoming.headers)
                .map(
                    ([key, value]) =>
                        `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`
                )
                .join("\r\n");
            upstream.write(
                `${incoming.method ?? "GET"} ${incoming.url ?? "/"} HTTP/1.1\r\n${headerLines}\r\n\r\n`
            );
            if (head.length > 0) upstream.write(head);
            upstream.pipe(socket);
            socket.pipe(upstream);
        });
        upstream.on("error", () => socket.destroy());
        socket.on("error", () => upstream.destroy());
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address: string | AddressInfo | null = server.address();
    if (address == null || typeof address === "string")
        throw new Error("proxy did not bind a port");
    return {
        baseUrl: `https://127.0.0.1:${String(address.port)}`,
        close: () => new Promise<void>((resolve) => server.close(() => resolve()))
    };
}

export interface ScrollerGeometry {
    readonly clientHeight: number;
    readonly height: number;
    readonly left: number;
    readonly maxOffset: number;
    readonly scrollHeight: number;
    readonly scrollTop: number;
    readonly top: number;
    readonly width: number;
}

export interface SeedOutcome {
    readonly accountsCreated: readonly string[];
    readonly domEvidence: FixtureDomEvidence;
    readonly geometry: ScrollerGeometry;
    readonly identitySeconds: number;
    readonly importLedger: ImportLedger;
    readonly imports: readonly ImportOutcome[];
    readonly peopleCreated: readonly string[];
    readonly preload: {
        /** The grid's own row count, from the toolbar. */
        readonly gridRowCount: number | null;
        readonly highestIndex: number;
        readonly iterations: number;
        readonly scrollHeight: number;
    };
    readonly preloadSeconds: number;
    readonly rowsImported: number;
    readonly rulesCreated: number;
    readonly seedSeconds: number;
    readonly tagsCreated: readonly string[];
}

/**
 * Build the whole fixture in a fresh vault, then preload the grid's prefix.
 *
 * The order is the fixture's contract: accounts, people and tags first because
 * the rules reference them; rules before the imports because the import applies
 * them; the preload last because it needs every row present.
 */
export async function seedVault(page: Page, baseUrl: string): Promise<SeedOutcome> {
    const seedStarted = performance.now();
    const identity = await createIdentity(page, baseUrl);
    const accountsCreated = await createAccounts(page, baseUrl);
    const peopleCreated = await createPeople(page, baseUrl);
    const tagsCreated = await createTags(page, baseUrl);
    const rulesCreated = await createFieldRules(page, baseUrl);
    const imports = await importAllAccounts(page, baseUrl);
    // Read the vault's own per-import ledger BEFORE the preload, while the page is
    // cheap to navigate. See `readImportLedger`: it separates "the row is in the
    // vault but not in the list" from "the write was lost".
    const importLedger = await readImportLedger(page, baseUrl);
    await page.goto(`${baseUrl}/transactions`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="transaction-table"]', { timeout: 300_000 });
    await page.waitForFunction(
        () => document.querySelectorAll("[data-index]").length > 0,
        undefined,
        {
            timeout: 300_000
        }
    );

    const rowsImported = imports.reduce((total, outcome) => total + outcome.rowsImported, 0);
    if (rowsImported !== FIXTURE_TRANSACTION_COUNT) {
        throw new Error(
            `imports produced ${String(rowsImported)} rows across ${String(imports.length)} files, expected ${String(FIXTURE_TRANSACTION_COUNT)}`
        );
    }

    const preloadStarted = performance.now();
    const preload: unknown = await page.evaluate(
        `${PREFIX_PRELOAD_SOURCE}(${String(FIXTURE_TRANSACTION_COUNT)})`
    );
    const preloadSeconds = (performance.now() - preloadStarted) / 1000;
    if (!isPreloadResult(preload)) throw new Error("prefix preload returned an unexpected shape");
    // The property that matters is "the grid is showing every row it has", so the
    // target is the grid's OWN count, read from the toolbar the user reads — not
    // the number of rows imported.
    //
    // MEASURED reason they can differ: with four imports of similar data the
    // product detected one cross-file duplicate and nested it under its original,
    // where `getCanonicalTransactions` keeps only public transactions. 10,000 rows
    // imported, 9,999 top-level rows. Asserting against the import count failed on
    // a correctly seeded vault.
    const gridRowCount = preload.gridRowCount;
    if (gridRowCount == null) {
        throw new Error(
            "could not read the grid's row count from the transaction toolbar, so 'showing every row' cannot be verified"
        );
    }
    // THE PROPERTY, not the workaround. What a capture requires is that every row
    // is addressable before a route runs; HOW the grid gets there is the thing
    // under test and differs between arms.
    //
    // The pre-port grid pages 50 rows at a time, so this took exactly 200
    // iterations. A grid sized from the cursor's own count needs none, and its
    // `iterations` will be ~0. Asserting "exactly 200 steps" would therefore fail
    // the ported grid for having fixed the very thing the preload works around —
    // so the step count is REPORTED, and only reachability is asserted.
    if (preload.highestIndex !== gridRowCount - 1) {
        throw new Error(
            `The deepest reachable row was index ${String(preload.highestIndex)} of a grid reporting ${String(gridRowCount)} rows. Rows beyond that are not addressable, so any measurement would describe the loader rather than the grid.`
        );
    }
    // A LOST WRITE OUTRANKS THIS PERFORMANCE GOAL. The Imports page's own ledger is
    // the discriminator: if it sums to every imported row while the grid shows
    // fewer, the row is in the vault and missing from the LIST — a query or
    // propagation bug. If the LEDGER itself is short, a write was lost, and in a
    // client-side-encrypted financial ledger that is a product defect to escalate
    // rather than a fixture detail to note.
    //
    // The abort is gated on the ledger being TRUSTED, so a misparse of the imports
    // table can never masquerade as data loss.
    if (importLedger.trusted && importLedger.total < FIXTURE_TRANSACTION_COUNT) {
        throw new Error(
            `LOST WRITE: the Imports page reports ${importLedger.perImport.join(" + ")} = ${String(importLedger.total)} transactions for ${String(FIXTURE_TRANSACTION_COUNT)} imported, and every import parsed its full file. This is a data-loss signal, not a performance result. STOP and escalate before capturing anything.`
        );
    }
    if (!importLedger.trusted) {
        // Reported, never acted on: an unreadable ledger is not evidence.
        console.warn(
            `import ledger not trusted, so the lost-write check is inconclusive: ${importLedger.note ?? "unknown"}`
        );
    }
    const missingRows = FIXTURE_TRANSACTION_COUNT - gridRowCount;
    if (missingRows < 0 || missingRows > FIXTURE_TRANSACTION_COUNT / 200) {
        throw new Error(
            `the grid shows ${String(gridRowCount)} rows for ${String(FIXTURE_TRANSACTION_COUNT)} imported. A handful of nested duplicates is expected; ${String(missingRows)} missing is not.`
        );
    }

    const domEvidence = await readFixtureDomEvidence(page);
    assertFixtureDomEvidence(domEvidence);

    const geometry = await installGridObserver(page);

    return {
        accountsCreated,
        domEvidence,
        geometry,
        identitySeconds: identity.seconds,
        importLedger,
        imports,
        peopleCreated,
        preload,
        preloadSeconds,
        rowsImported,
        rulesCreated,
        seedSeconds: (performance.now() - seedStarted) / 1000,
        tagsCreated
    };
}

/** Install the passive wheel witness and read the scroller's geometry. */
export async function installGridObserver(page: Page): Promise<ScrollerGeometry> {
    const geometry: unknown = await page.evaluate(`${INSTALL_GRID_OBSERVER_SOURCE}()`);
    if (!isScrollerGeometry(geometry)) {
        throw new Error("grid observer returned an unexpected shape");
    }
    return geometry;
}

export interface NotesOutcome {
    readonly annotatedRows: number;
    /** Row height with the notes row open, from the DOM. */
    readonly expandedHeight: number;
    readonly seconds: number;
    /** Row height collapsed, from the DOM. */
    readonly unexpandedHeight: number;
    /** ARIA rows inside one expanded virtual index. Must be 2. */
    readonly expandedAriaRows: number;
}

/**
 * Give a deterministic subset of rows real notes, through the product's own
 * notes editor, and leave them expanded so they are taller than their siblings.
 *
 * WHY EXPANSION IS REQUIRED, MEASURED: writing a note does NOT make a row
 * taller. `TransactionRow` renders `data-testid="notes-row"` only when
 * `isExpanded`, and `expandedIds` is local `useState` in `TransactionTable`
 * seeded empty — nothing auto-expands a row because it has notes. Measured on
 * the production build: collapsed 57px / 1 ARIA row; expanded 103px / 2 ARIA
 * rows; expanded with a long note 123px (the textarea grows 30px -> 50px). So
 * note LENGTH does vary height, but only while expanded.
 *
 * Because `expandedIds` is component state, expansion cannot be pre-seeded and
 * does not survive a reload — it must be applied in the same session as the
 * measurement, after the prefix preload. The notes themselves DO persist: a note
 * written this way was read back unchanged after a full page reload.
 *
 * This drives the real Textarea's `onChange`/`onBlur`, which is the same
 * `onFieldUpdate("notes", ...)` path a user's typing takes. No seam is added to
 * `src/`, and no cell is simplified.
 */
export async function applyNotesAndExpand(
    page: Page,
    plan: readonly { readonly note: string; readonly rowIndex: number }[]
): Promise<NotesOutcome> {
    const started = performance.now();
    // String.raw is REQUIRED: in a plain template literal the regex's `\(`
    // collapses to `(`, turning the literal paren into a capture group so
    // `translateY(0px)` stops matching and every row reads as unpositioned.
    const outcome: unknown = await page.evaluate(
        String.raw`(async (plan) => {
            const table = document.querySelector('[data-testid="transaction-table"]');
            if (table == null) throw new Error("transaction table not found");
            let scroller = table;
            while (scroller != null && !(scroller.scrollHeight > scroller.clientHeight + 10)) {
                scroller = scroller.parentElement;
            }
            if (scroller == null) throw new Error("scrollable ancestor not found");

            const frame = () => new Promise((r) => requestAnimationFrame(r));
            const readTranslateY = (element) => {
                const m = /translateY\(\s*(-?[\d.]+)px\s*\)/.exec(element.style.transform);
                return m == null ? null : Number(m[1]);
            };
            const windowRows = () => {
                const entries = [];
                for (const element of scroller.querySelectorAll("[data-index]")) {
                    const index = Number(element.getAttribute("data-index"));
                    const offset = readTranslateY(element);
                    if (Number.isFinite(index) && offset != null) entries.push({ index, offset });
                }
                entries.sort((a, b) => a.index - b.index);
                return entries;
            };
            const hold = async (offset) => {
                const maxOffset = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
                const clamped = Math.min(maxOffset, Math.max(0, offset));
                // A single assignment is reverted on the next frame; hold it.
                for (let i = 0; i < 4; i += 1) { scroller.scrollTop = clamped; await frame(); }
            };
            const bring = async (targetIndex) => {
                for (let attempt = 0; attempt < 8; attempt += 1) {
                    const entries = windowRows();
                    if (entries.length === 0) return false;
                    if (entries.some((e) => e.index === targetIndex)) return true;
                    const first = entries[0];
                    const last = entries[entries.length - 1];
                    const pitch = last.index > first.index
                        ? (last.offset - first.offset) / (last.index - first.index)
                        : Math.max(1, scroller.clientHeight / Math.max(1, entries.length));
                    const anchor = targetIndex < first.index ? first : last;
                    await hold(anchor.offset + (targetIndex - anchor.index) * pitch - scroller.clientHeight / 3);
                }
                return windowRows().some((e) => e.index === targetIndex);
            };

            // React controlled textarea: assigning .value directly does not run
            // onChange. Going through the prototype's own setter and dispatching
            // the same events the browser would means the component's real
            // onChange/onBlur handler runs - the same path a user's typing takes.
            const valueSetter = Object.getOwnPropertyDescriptor(
                HTMLTextAreaElement.prototype, "value"
            ).set;

            let annotated = 0;
            const unreachable = [];
            for (const entry of plan.slice().sort((a, b) => a.rowIndex - b.rowIndex)) {
                if (!(await bring(entry.rowIndex))) { unreachable.push(entry.rowIndex); continue; }
                const row = scroller.querySelector('[data-index="' + entry.rowIndex + '"]');
                if (row == null) { unreachable.push(entry.rowIndex); continue; }
                const toggle = row.querySelector('[data-testid="expand-notes-button"]');
                if (toggle == null) { unreachable.push(entry.rowIndex); continue; }
                if (row.querySelector('[data-testid="notes-row"]') == null) {
                    toggle.click();
                    await frame(); await frame();
                }
                const editor = row.querySelector('[data-testid="notes-editable"]');
                if (editor == null) { unreachable.push(entry.rowIndex); continue; }
                valueSetter.call(editor, entry.note);
                editor.dispatchEvent(new Event("input", { bubbles: true }));
                editor.dispatchEvent(new Event("blur", { bubbles: true }));
                await frame();
                annotated += 1;
            }

            // Measure a collapsed row and an expanded one from the SAME DOM, so
            // the height comparison cannot be against a stale reading.
            await hold(0);
            let unexpandedHeight = 0;
            for (const element of scroller.querySelectorAll("[data-index]")) {
                if (element.querySelector('[data-testid="notes-row"]') != null) continue;
                unexpandedHeight = element.getBoundingClientRect().height;
                break;
            }
            const firstIndex = plan.slice().sort((a, b) => a.rowIndex - b.rowIndex)[0].rowIndex;
            await bring(firstIndex);
            const target = scroller.querySelector('[data-index="' + firstIndex + '"]');
            const editor = target == null ? null : target.querySelector('[data-testid="notes-editable"]');
            return {
                annotatedRows: annotated,
                ariaRows: target == null ? 0 : target.querySelectorAll('[role="row"]').length,
                expandedHeight: target == null ? 0 : target.getBoundingClientRect().height,
                noteValue: editor == null ? null : editor.value,
                unexpandedHeight,
                unreachable: unreachable.length
            };
        })(${JSON.stringify([...plan])})`
    );

    if (!isNotesVerification(outcome)) throw new Error("notes pass returned an unexpected shape");
    const expected = [...plan].sort((left, right) => left.rowIndex - right.rowIndex)[0];
    if (expected == null) throw new Error("notes plan is empty");
    // Assert on the DOM rather than trusting the writes landed.
    if (outcome.ariaRows !== 2) {
        throw new Error(
            `expanded row ${String(expected.rowIndex)} rendered ${String(outcome.ariaRows)} ARIA rows, expected 2`
        );
    }
    if (outcome.noteValue !== expected.note) {
        throw new Error(
            `note on row ${String(expected.rowIndex)} did not persist: read back ${JSON.stringify(outcome.noteValue)}`
        );
    }
    if (!(outcome.expandedHeight > outcome.unexpandedHeight)) {
        throw new Error(
            `expanded row is ${String(outcome.expandedHeight)}px, not taller than a collapsed ${String(outcome.unexpandedHeight)}px row`
        );
    }
    if (outcome.annotatedRows < plan.length) {
        throw new Error(
            `only ${String(outcome.annotatedRows)} of ${String(plan.length)} planned rows were annotated (${String(outcome.unreachable)} unreachable)`
        );
    }
    return {
        annotatedRows: outcome.annotatedRows,
        expandedAriaRows: outcome.ariaRows,
        expandedHeight: outcome.expandedHeight,
        seconds: (performance.now() - started) / 1000,
        unexpandedHeight: outcome.unexpandedHeight
    };
}

function isNotesVerification(value: unknown): value is {
    readonly annotatedRows: number;
    readonly ariaRows: number;
    readonly expandedHeight: number;
    readonly noteValue: string | null;
    readonly unexpandedHeight: number;
    readonly unreachable: number;
} {
    if (typeof value !== "object" || value == null) return false;
    const record: Record<string, unknown> = { ...value };
    return (
        typeof record.annotatedRows === "number" &&
        typeof record.ariaRows === "number" &&
        typeof record.expandedHeight === "number" &&
        typeof record.unexpandedHeight === "number" &&
        typeof record.unreachable === "number"
    );
}

function isPreloadResult(value: unknown): value is {
    readonly gridRowCount: number | null;
    readonly highestIndex: number;
    readonly iterations: number;
    readonly scrollHeight: number;
} {
    if (typeof value !== "object" || value == null) return false;
    const record: Record<string, unknown> = { ...value };
    return (
        (record.gridRowCount == null || typeof record.gridRowCount === "number") &&
        typeof record.highestIndex === "number" &&
        typeof record.iterations === "number" &&
        typeof record.scrollHeight === "number"
    );
}

function isScrollerGeometry(value: unknown): value is ScrollerGeometry {
    if (typeof value !== "object" || value == null) return false;
    const record: Record<string, unknown> = { ...value };
    return (
        typeof record.clientHeight === "number" &&
        typeof record.height === "number" &&
        typeof record.left === "number" &&
        typeof record.maxOffset === "number" &&
        typeof record.scrollHeight === "number" &&
        typeof record.top === "number" &&
        typeof record.width === "number"
    );
}

function isHoldResult(value: unknown): value is {
    readonly maxOffset: number;
    readonly requested: number;
    readonly scrollTop: number;
    readonly settled: boolean;
} {
    if (typeof value !== "object" || value == null) return false;
    const record: Record<string, unknown> = { ...value };
    return (
        typeof record.maxOffset === "number" &&
        typeof record.requested === "number" &&
        typeof record.scrollTop === "number" &&
        typeof record.settled === "boolean"
    );
}

/** What the traced closure returns: the page's run plus the input schedule. */
function isTracedRouteResult(value: unknown): value is {
    readonly run: unknown;
    readonly schedule: WheelScheduleOutcome;
} {
    if (typeof value !== "object" || value == null) return false;
    if (!("run" in value) || !("schedule" in value)) return false;
    const schedule: unknown = value.schedule;
    if (typeof schedule !== "object" || schedule == null) return false;
    const record: Record<string, unknown> = { ...schedule };
    return (
        typeof record.achievedDurationMilliseconds === "number" &&
        typeof record.dispatchedTicks === "number" &&
        typeof record.intendedDurationMilliseconds === "number" &&
        typeof record.requestedAbsoluteDistance === "number" &&
        typeof record.scheduleErrorMaxMilliseconds === "number" &&
        typeof record.scheduleErrorP50Milliseconds === "number" &&
        typeof record.scheduleErrorP95Milliseconds === "number"
    );
}

/** A sample that carries the instrumented loop's geometry fields. */
function isSemanticSampleShape(sample: RawTimingSample): sample is RawGridSample {
    return "rowRectangles" in sample && "viewport" in sample;
}

function isRouteRunResult(value: unknown): value is RouteRunResult<RawTimingSample> {
    if (typeof value !== "object" || value == null) return false;
    const record: Record<string, unknown> = { ...value };
    return (
        Array.isArray(record.samples) &&
        typeof record.finalScrollTop === "number" &&
        typeof record.maxScrollTop === "number" &&
        typeof record.minScrollTop === "number" &&
        typeof record.stickyMaskDrift === "boolean" &&
        typeof record.wheelAbsoluteDeltaObserved === "number" &&
        typeof record.wheelDeltaObserved === "number" &&
        typeof record.wheelEventsObserved === "number"
    );
}

/**
 * Optionally keep the raw trace so a human can open it in the DevTools
 * Performance panel.
 *
 * The harness parses each trace and discards it, so traces from a completed
 * campaign CANNOT be recovered afterwards — saving one requires a run that was
 * told to save it. Off unless `saveTracePath` is given, so the scored path writes
 * nothing and a 12s trace (tens of MB) is not multiplied by 80 passes.
 */
async function readTrace(
    page: Page,
    categories: readonly string[],
    run: () => Promise<unknown>,
    saveTracePath?: string
): Promise<{
    readonly events: readonly unknown[];
    readonly result: unknown;
}> {
    const client = await page.context().newCDPSession(page);
    await client.send("Tracing.start", {
        traceConfig: { includedCategories: [...categories], recordMode: "recordAsMuchAsPossible" },
        streamFormat: "json",
        transferMode: "ReturnAsStream"
    });
    const result = await run();
    const stream = await new Promise<string>((resolve) => {
        client.once("Tracing.tracingComplete", (event) => {
            const handle =
                "stream" in event && typeof event.stream === "string" ? event.stream : "";
            resolve(handle);
        });
        void client.send("Tracing.end");
    });
    let payload = "";
    for (;;) {
        const chunk = await client.send("IO.read", { handle: stream, size: 8 * 1024 * 1024 });
        payload += chunk.data;
        if (chunk.eof) break;
    }
    await client.send("IO.close", { handle: stream });
    await client.detach();
    if (saveTracePath != null) {
        // The payload is already a chrome-trace JSON document; DevTools opens it
        // as-is. Written before parsing so a parse failure still leaves the trace.
        writeFileSync(saveTracePath, payload);
    }
    const parsed: unknown = JSON.parse(payload);
    const events =
        typeof parsed === "object" &&
        parsed != null &&
        "traceEvents" in parsed &&
        Array.isArray(parsed.traceEvents)
            ? parsed.traceEvents
            : [];
    return { events, result };
}

/**
 * Join page samples to the trace clock, keeping only the ones that carry the
 * semantic fields. A clean run's samples carry none, and pass through as absent
 * rather than as empty geometry that would read as a blank viewport.
 */
function toSemanticSamples(
    raw: readonly RawTimingSample[],
    marks: ReadonlyMap<string, number>
): readonly SemanticSample[] {
    return raw.flatMap((sample) => {
        const timestampMicroseconds = marks.get(sample.markName);
        if (timestampMicroseconds == null) return [];
        if (!isSemanticSampleShape(sample)) return [];
        return [
            {
                clientHeight: sample.clientHeight,
                scrollHeightPx: sample.scrollHeightPx,
                totalSizePx: sample.totalSizePx,
                rowGeometry: sample.rowGeometry,
                hasDuplicateRowId: sample.hasDuplicateRowId,
                portalMasks: sample.portalMasks,
                renderedScrollTop: sample.renderedScrollTop,
                rowIndexesAscending: sample.rowIndexesAscending,
                rowRectangles: sample.rowRectangles,
                scrollTop: sample.scrollTop,
                timestampMicroseconds,
                viewport: sample.viewport,
                visibleRowCount: sample.visibleRowCount
            }
        ];
    });
}

/**
 * Sleep until an absolute `performance.now()` deadline: a timer down to 1.5ms
 * out, then yields until the deadline passes.
 *
 * MEASURED: over 60 ticks at 60Hz this achieved p50 0.00ms and max 0.53ms
 * absolute deviation from the intended tick times, and held to max 0.42ms while
 * the page's main thread was blocked in 100ms chunks. A plain `setTimeout` loop
 * cannot make that claim, and `page.mouse.wheel` cannot either — it awaits the
 * renderer and measured 17ms for a single event, one whole frame.
 */
async function sleepUntil(deadlineMilliseconds: number): Promise<void> {
    for (;;) {
        const remaining = deadlineMilliseconds - performance.now();
        if (remaining <= 0) return;
        if (remaining > 1.5) {
            await new Promise((resolve) => setTimeout(resolve, remaining - 1.5));
        } else {
            await new Promise((resolve) => setImmediate(resolve));
        }
    }
}

export interface WheelScheduleOutcome {
    readonly achievedDurationMilliseconds: number;
    readonly dispatchedTicks: number;
    readonly intendedDurationMilliseconds: number;
    readonly requestedAbsoluteDistance: number;
    readonly scheduleErrorMaxMilliseconds: number;
    readonly scheduleErrorP50Milliseconds: number;
    readonly scheduleErrorP95Milliseconds: number;
}

/**
 * Dispatch a route's deltas as real wheel events on a wall-clock schedule.
 *
 * Sends are NOT awaited individually: awaiting each one would put the renderer's
 * response time inside the input schedule and reintroduce exactly the coupling
 * this replaces. They are awaited collectively at the end, and any protocol
 * failure is surfaced rather than swallowed.
 */
export async function dispatchWheelSchedule(
    client: CDPSession,
    route: ScrollRoute,
    point: { readonly x: number; readonly y: number }
): Promise<WheelScheduleOutcome> {
    const startedAt = performance.now();
    const errors: number[] = [];
    const pending: Promise<unknown>[] = [];
    const failures: string[] = [];

    for (const [index, delta] of route.deltasPerTick.entries()) {
        const deadline = startedAt + index * route.tickIntervalMilliseconds;
        await sleepUntil(deadline);
        errors.push(Math.abs(performance.now() - deadline));
        if (delta === 0) continue;
        pending.push(
            client
                .send("Input.dispatchMouseEvent", {
                    deltaX: 0,
                    deltaY: delta,
                    modifiers: 0,
                    pointerType: "mouse",
                    type: "mouseWheel",
                    x: point.x,
                    y: point.y
                })
                .catch((error: unknown) => {
                    failures.push(String(error).slice(0, 200));
                })
        );
    }
    const achievedDurationMilliseconds = performance.now() - startedAt;
    await Promise.all(pending);
    if (failures.length > 0) {
        throw new Error(
            `${String(failures.length)} wheel dispatches failed on route ${route.id}: ${failures[0] ?? ""}`
        );
    }

    const sorted = [...errors].sort((left, right) => left - right);
    const at = (fraction: number): number =>
        sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1))] ??
        Number.NaN;
    return {
        achievedDurationMilliseconds,
        dispatchedTicks: pending.length,
        intendedDurationMilliseconds: route.deltasPerTick.length * route.tickIntervalMilliseconds,
        requestedAbsoluteDistance: route.deltasPerTick.reduce(
            (total, delta) => total + Math.abs(delta),
            0
        ),
        scheduleErrorMaxMilliseconds: sorted.at(-1) ?? Number.NaN,
        scheduleErrorP50Milliseconds: at(0.5),
        scheduleErrorP95Milliseconds: at(0.95)
    };
}

/**
 * How much of the route's input the page actually received, and how far it moved.
 *
 * This exists because "identical stimulus across arms" is a claim that has to be
 * checked per run, not assumed. Wheel events coalesce when the main thread is
 * busy, and the measured property that makes the comparison valid is that
 * coalescing preserves the SUM of the deltas.
 */
export interface StimulusFidelity {
    readonly netScrollTravel: number;
    /** Observed |deltaY| as a fraction of the route's requested |delta| total. */
    readonly observedAbsoluteDistanceRatio: number;
    readonly requestedAbsoluteDistance: number;
    readonly requestedNetDistance: number;
    readonly settledStart: boolean;
    readonly startOffset: number;
    readonly wheelAbsoluteDeltaObserved: number;
    readonly wheelDeltaObserved: number;
    readonly wheelEventsObserved: number;
}

/** How a route run observed the page. */
export type SamplingMode = "clean" | "instrumented";

/** One traced pass over one route. */
export interface RouteRun {
    readonly cadence: CadenceReport;
    readonly droppedSampleCount: number;
    readonly inputMode: ScrollRoute["inputMode"];
    readonly loadAverageOneMinute: number;
    readonly maxScrollTop: number;
    readonly minScrollTop: number;
    readonly mode: SamplingMode;
    /** Present only for an instrumented run: blank / stale / partial / full. */
    readonly semantic: RouteReport | null;
    /** Instrument overhead: cost of taking one sample, inside the frame. */
    readonly sampleCostP50Milliseconds: number;
    readonly sampleCostMaxMilliseconds: number;
    readonly sampleCount: number;
    readonly schedule: WheelScheduleOutcome;
    readonly stickyMaskDrift: boolean;
    readonly stimulus: StimulusFidelity;
}

/**
 * Both passes over one route, plus the verdict that draws each threshold from the
 * pass entitled to it.
 */
export interface RouteMeasurement {
    readonly clean: RouteRun;
    /** Clean minus instrumented, so the instrument's perturbation is a number. */
    readonly cleanMinusInstrumented: {
        readonly fullyPresentedRatio: number;
        readonly droppedFrames: number;
        readonly p95IntervalMilliseconds: number;
        readonly presentedFramesPerSecond: number;
    };
    readonly failures: readonly string[];
    readonly instrumented: RouteRun;
    readonly passed: boolean;
    readonly routeId: string;
}

/**
 * Frames past the last input, still sampled so a viewport that goes blank while
 * the grid settles is counted. 300ms is 18 vsyncs — long enough to cover the
 * worst settle observed on the baseline (a 1,050ms stall would exceed it, and
 * that case shows up as `dropped`, which is scored anyway).
 */
const ROUTE_TAIL_MILLISECONDS = 300;

/** 1-minute load average, recorded with every run so contention is self-evident. */
export function loadAverageOneMinute(): number {
    const [oneMinute] = readFileSync("/proc/loadavg", "utf8").trim().split(/\s+/);
    return Number(oneMinute ?? Number.NaN);
}

/** Drive one route under tracing, in one sampling mode, and report it. */
export async function measureRoute(
    page: Page,
    inputClient: CDPSession,
    route: ScrollRoute,
    geometry: ScrollerGeometry,
    mode: SamplingMode
): Promise<RouteRun> {
    const hold: unknown = await page.evaluate(
        `${HOLD_SCROLL_OFFSET_SOURCE}(${String(route.startOffsetPixels)})`
    );
    if (!isHoldResult(hold)) throw new Error("scroll positioning returned an unexpected shape");
    if (!hold.settled) {
        throw new Error(
            `route ${route.id} could not be positioned at ${String(route.startOffsetPixels)}px: the grid settled at ${String(hold.scrollTop)}px of a ${String(hold.maxOffset)}px range. Measuring from the wrong offset would make this route a different stimulus.`
        );
    }

    const point = {
        x: Math.round(geometry.left + geometry.width / 2),
        y: Math.round(geometry.top + geometry.height / 2)
    };
    await page.mouse.move(point.x, point.y);

    const markPrefix = `mf:${mode}:${route.id}:`;
    const loopSource = mode === "clean" ? GRID_CLEAN_SAMPLE_LOOP_SOURCE : GRID_SAMPLE_LOOP_SOURCE;
    const durationMilliseconds =
        route.deltasPerTick.length * route.tickIntervalMilliseconds + ROUTE_TAIL_MILLISECONDS;

    // PERF_TRACE_OUT=<dir> keeps the raw trace for this route+mode, for a human to
    // open in DevTools. Unset during a scored campaign.
    const traceDirectory = process.env.PERF_TRACE_OUT;
    // Only the CLEAN pass is saved: it is the one without the sampler's own work
    // in it, so what a human sees in DevTools is the product rather than the
    // harness.
    const saveTracePath =
        traceDirectory == null || traceDirectory === "" || mode !== "clean"
            ? undefined
            : `${traceDirectory}/trace-${process.env.PERF_ARM ?? "arm"}-${route.id}.json`;

    const { events, result } = await readTrace(
        page,
        PRESENTATION_TRACE_CATEGORIES.concat("blink.user_timing"),
        async () => {
            const sampling = page.evaluate(
                `${loopSource}(${JSON.stringify(markPrefix)}, ${String(durationMilliseconds)})`
            );
            // Let the sampler take its first frames before input starts, so the
            // route's opening frames are covered by a sample.
            await new Promise((resolve) => setTimeout(resolve, 50));
            const schedule = await dispatchWheelSchedule(inputClient, route, point);
            const run: unknown = await sampling;
            return { run, schedule };
        },
        saveTracePath
    );
    if (!isTracedRouteResult(result)) {
        throw new Error(`route ${route.id} returned an unexpected shape`);
    }
    const { run, schedule } = result;
    if (!isRouteRunResult(run)) throw new Error(`route ${route.id} returned an unexpected shape`);

    const marks = extractUserTimingMarks(events, markPrefix);
    const samples = mode === "instrumented" ? toSemanticSamples(run.samples, marks) : [];
    if (mode === "instrumented" && samples.length === 0) {
        throw new Error(`route ${route.id} produced no joinable samples`);
    }
    if (marks.size === 0) throw new Error(`route ${route.id} produced no marks`);

    // Window the trace to the route: from the first sample mark to the last.
    const markTimes = [...marks.values()].sort((left, right) => left - right);
    const start = markTimes[0];
    const end = markTimes.at(-1);
    if (start == null || end == null) throw new Error(`route ${route.id} produced no marks`);

    const interval = declaredVsyncIntervalMicroseconds(events);
    const frames = buildExpectedFrames(events, start, end);

    // Frames during which the route was moving the grid, taken from the samples
    // themselves rather than from the route definition.
    //
    // A range is included when input arrived in it, when the scroller moved in
    // it, OR when input arrived in the NEXT sample. That last clause is what
    // covers a main-thread block: no sample can be taken while the thread is
    // blocked, so the frames inside the block belong to the range that ENDS at
    // the first sample afterwards. Without it, a grid that janked hard enough to
    // starve the sampler would have its worst frames excluded from the cadence
    // denominator and would score better for being worse.
    const movingRanges = run.samples.flatMap((sample, index) => {
        const from = marks.get(sample.markName);
        if (from == null) return [];
        const next = run.samples[index + 1];
        const to = next == null ? from + interval : (marks.get(next.markName) ?? from + interval);
        const moving =
            sample.wheelEventsSincePreviousSample > 0 ||
            sample.scrollTopChanged ||
            (next?.wheelEventsSincePreviousSample ?? 0) > 0;
        return moving ? [{ from, to }] : [];
    });
    const movingFrames = frames.filter((frame) =>
        movingRanges.some(
            (range) =>
                frame.frameTimeMicroseconds >= range.from - interval &&
                frame.frameTimeMicroseconds <= range.to
        )
    );
    const cadence = buildCadenceReport({
        expectedFrames: expectedFrameCountFromSpan(frames, interval),
        frames,
        intervalMicroseconds: interval,
        movingFrames,
        routeId: route.id
    });
    // The semantic classification needs samples, so it only exists for the
    // instrumented pass. Computing it from an empty sample set would score every
    // frame `no-semantic-sample` and report 0% fully presented.
    const semantic =
        mode === "instrumented"
            ? buildRouteReport({
                  expectedFrames: expectedFrameCountFromSpan(frames, interval),
                  frames,
                  intervalMicroseconds: interval,
                  movingFrames,
                  routeId: route.id,
                  verdicts: frames.map((frame) =>
                      classifyFrame(frame, samples, DEFAULT_CLASSIFICATION_THRESHOLDS)
                  )
              })
            : null;

    const requestedAbsoluteDistance = schedule.requestedAbsoluteDistance;
    // ABSOLUTE, not signed. fast-reversal's deltas net to ~0px while delivering
    // ~23,500px of travel, so a signed ratio reported 0.0% on a route whose input
    // had in fact all arrived - measured, and it aborted the run.
    const observedAbsoluteDistanceRatio =
        requestedAbsoluteDistance > 0
            ? run.wheelAbsoluteDeltaObserved / requestedAbsoluteDistance
            : Number.NaN;

    const costs = run.samples
        .map((sample) => sample.sampleCostMilliseconds)
        .sort((left, right) => left - right);

    return {
        cadence,
        droppedSampleCount: mode === "instrumented" ? run.samples.length - samples.length : 0,
        inputMode: route.inputMode,
        loadAverageOneMinute: loadAverageOneMinute(),
        maxScrollTop: run.maxScrollTop,
        minScrollTop: run.minScrollTop,
        mode,
        sampleCostMaxMilliseconds: costs.at(-1) ?? Number.NaN,
        sampleCostP50Milliseconds: costs[Math.floor(costs.length / 2)] ?? Number.NaN,
        sampleCount: run.samples.length,
        schedule,
        semantic,
        stickyMaskDrift: run.stickyMaskDrift,
        stimulus: {
            netScrollTravel: run.finalScrollTop - hold.scrollTop,
            observedAbsoluteDistanceRatio,
            requestedAbsoluteDistance,
            requestedNetDistance: routeDistance(route),
            settledStart: hold.settled,
            startOffset: hold.scrollTop,
            wheelAbsoluteDeltaObserved: run.wheelAbsoluteDeltaObserved,
            wheelDeltaObserved: run.wheelDeltaObserved,
            wheelEventsObserved: run.wheelEventsObserved
        }
    };
}

/**
 * Run one route twice — sampler off, then sampler on — and combine the verdicts.
 *
 * The clean pass runs FIRST so that, if anything aborts the pair, what survives is
 * the pass the thresholds are evaluated against.
 */
export async function measureRoutePair(
    page: Page,
    inputClient: CDPSession,
    route: ScrollRoute,
    geometry: ScrollerGeometry
): Promise<RouteMeasurement> {
    const clean = await measureRoute(page, inputClient, route, geometry, "clean");
    const instrumented = await measureRoute(page, inputClient, route, geometry, "instrumented");
    const semantic = instrumented.semantic;
    if (semantic == null) {
        throw new Error(`route ${route.id}: the instrumented pass produced no semantic report`);
    }
    const failures = combinedRouteFailures(clean.cadence, semantic);
    return {
        clean,
        cleanMinusInstrumented: {
            droppedFrames: clean.cadence.droppedFrames - instrumented.cadence.droppedFrames,
            fullyPresentedRatio:
                clean.cadence.fullyPresentedRatio - instrumented.cadence.fullyPresentedRatio,
            p95IntervalMilliseconds:
                clean.cadence.intervals.p95Milliseconds -
                instrumented.cadence.intervals.p95Milliseconds,
            presentedFramesPerSecond:
                clean.cadence.presentedFramesPerSecond -
                instrumented.cadence.presentedFramesPerSecond
        },
        failures,
        instrumented,
        passed: failures.length === 0,
        routeId: route.id
    };
}

/**
 * Highest 1-minute load average the host may show before a capture starts.
 *
 * JUSTIFICATION — a judgement, with two measurements behind it. This host has 16
 * cores / 32 threads and measured a 1-minute average of 0.54 while idle. A capture
 * in progress contributes roughly 1-2 itself (the runner plus one Chromium), which
 * is why this is checked BEFORE the browser launches rather than continuously. The
 * number that matters is the one that spoiled a real campaign: another agent's
 * typecheck, lint, build and 32-thread unit suite took the 1-minute average to 9.14
 * during a capture's setup, and contention on the BEFORE arm makes production look
 * slow, which FLATTERS the port. 2.5 sits far above 0.54 and far below 9.14.
 *
 * Override with PERF_MAX_LOADAVG for a deliberately noisy diagnostic run; the
 * value used is recorded in the artifact either way.
 */
export const DEFAULT_MAXIMUM_LOAD_AVERAGE = 2.5;

export interface HostQuietOutcome {
    readonly loadAverageOneMinute: number;
    readonly maximumAllowed: number;
}

/**
 * Refuse to measure a contended host.
 *
 * A quietly contaminated arm is worse than a missing one: it is the single result
 * that could make this comparison wrong in the favourable direction.
 */
export function requireQuietHost(maximumAllowed: number): HostQuietOutcome {
    const observed = loadAverageOneMinute();
    if (!(observed <= maximumAllowed)) {
        throw new Error(
            `host is not quiet: 1-minute load average ${observed.toFixed(2)} exceeds ${maximumAllowed.toFixed(2)}. Another process is competing for the CPU, and contention on the BEFORE arm flatters the port. Wait for the host, or set PERF_MAX_LOADAVG deliberately for a diagnostic run.`
        );
    }
    return { loadAverageOneMinute: observed, maximumAllowed };
}

/**
 * Fraction of the route's requested wheel distance the page must observe.
 *
 * MEASURED basis: with the main thread blocked in nine 100ms chunks, Chromium
 * coalesced 60 wheel events into 36 dispatches whose deltas still summed to
 * exactly the requested 600px. So the expected ratio is 1.0 and any material
 * shortfall means the events did not reach the scroller at all — a harness
 * failure (wrong hit-target, an overlay swallowing input), not a slow grid.
 */
const MINIMUM_OBSERVED_DISTANCE_RATIO = 0.98;

export interface ArmMeasurement {
    readonly consoleWarnings: readonly string[];
    /** Load average at the session's start and after its last repeat. */
    readonly hostLoad: {
        readonly atEnd: number;
        readonly atStart: number;
        readonly maximumAllowed: number;
    };
    readonly notes: NotesOutcome;
    /** One entry per repeat of the full route set, in order. */
    readonly runs: readonly (readonly RouteMeasurement[])[];
    readonly seed: SeedOutcome;
}

/**
 * Measure one seeded session: build the fixture, then run the full route set
 * `repeats` times.
 *
 * Repeats live inside a session because setup dominates — minutes of seeding and
 * note-typing against ~30s of routes — and because expansion is component state
 * that cannot survive into another session. Independent sessions are the caller's
 * job, and are required: a seeding artefact would otherwise be indistinguishable
 * from a stable result.
 */
export async function measureArm(
    baseUrl: string,
    options: {
        readonly maximumLoadAverage?: number;
        readonly notesCap: number;
        /**
         * Called after every completed repeat, with everything captured so far.
         *
         * Exists so a campaign that is killed mid-session loses at most one
         * repeat: a 25-minute run that only writes artifacts at the end throws
         * away every number it took if anything reaches it first, and one already
         * did.
         */
        readonly onProgress?: (partial: ArmMeasurement) => void;
        readonly repeats: number;
        readonly routes?: readonly ScrollRoute[];
    }
): Promise<ArmMeasurement> {
    const routes = options.routes ?? SCROLL_ROUTES;
    // Checked BEFORE the browser launches, so the measurement's own load is not
    // being weighed against the threshold.
    const maximumLoadAverage = options.maximumLoadAverage ?? DEFAULT_MAXIMUM_LOAD_AVERAGE;
    const quiet = requireQuietHost(maximumLoadAverage);
    const browser: Browser = await chromium.launch({
        args: [...measurementLaunchOptions.args],
        channel: measurementLaunchOptions.channel,
        headless: measurementLaunchOptions.headless
    });
    try {
        const context = await browser.newContext({
            ignoreHTTPSErrors: true,
            viewport: { height: MEASUREMENT_VIEWPORT.height, width: MEASUREMENT_VIEWPORT.width }
        });
        const page = await context.newPage();
        // The lead flagged these specifically: a flushSync warning appearing in a
        // later arm but absent in the baseline is a real signal, so they are
        // collected rather than filtered.
        const consoleWarnings: string[] = [];
        page.on("console", (message) => {
            const text = message.text();
            if (/flushSync|ResizeObserver|Maximum call stack|hydration/i.test(text)) {
                consoleWarnings.push(`${message.type()}: ${text.slice(0, 300)}`);
            }
        });
        page.on("pageerror", (error) =>
            consoleWarnings.push(`pageerror: ${String(error).slice(0, 300)}`)
        );
        // A vanished browser or page is the most likely way an await never settles,
        // which is how a campaign can exit 0 in silence. Say so at the moment it
        // happens, not by inference afterwards.
        browser.on("disconnected", () =>
            console.error("*** BROWSER DISCONNECTED mid-campaign ***")
        );
        page.on("crash", () => console.error("*** PAGE CRASHED mid-campaign ***"));
        page.on("close", () => console.error("*** PAGE CLOSED mid-campaign ***"));

        const seed = await seedVault(page, baseUrl);
        // Variable-height rows must exist BEFORE any route runs, and expansion
        // is component state that cannot survive into a later session.
        const notes = await applyNotesAndExpand(
            page,
            enrichmentPlan().notedRows.slice(0, options.notesCap)
        );
        // Re-read geometry: 480 expanded rows changed the scrollable range.
        const geometry = await installGridObserver(page);
        const inputClient = await context.newCDPSession(page);

        const runs: RouteMeasurement[][] = [];
        for (let repeat = 0; repeat < options.repeats; repeat += 1) {
            const measurements: RouteMeasurement[] = [];
            for (const route of routes) {
                const measurement = await measureRoutePair(page, inputClient, route, geometry);
                for (const run of [measurement.clean, measurement.instrumented]) {
                    if (
                        run.stimulus.observedAbsoluteDistanceRatio < MINIMUM_OBSERVED_DISTANCE_RATIO
                    ) {
                        throw new Error(
                            `route ${route.id} repeat ${String(repeat + 1)} (${run.mode}): the page observed ${run.stimulus.wheelAbsoluteDeltaObserved.toFixed(0)}px of a requested ${run.stimulus.requestedAbsoluteDistance.toFixed(0)}px of wheel input (${(run.stimulus.observedAbsoluteDistanceRatio * 100).toFixed(1)}%). Wheel input is not reaching the scroller, so the arms are not receiving the same stimulus.`
                        );
                    }
                }
                measurements.push(measurement);
            }
            runs.push(measurements);
            options.onProgress?.({
                consoleWarnings,
                hostLoad: {
                    atEnd: loadAverageOneMinute(),
                    atStart: quiet.loadAverageOneMinute,
                    maximumAllowed: maximumLoadAverage
                },
                notes,
                runs: [...runs],
                seed
            });
        }
        await inputClient.detach();
        return {
            consoleWarnings,
            hostLoad: {
                atEnd: loadAverageOneMinute(),
                atStart: quiet.loadAverageOneMinute,
                maximumAllowed: maximumLoadAverage
            },
            notes,
            runs,
            seed
        };
    } finally {
        await browser.close();
    }
}
