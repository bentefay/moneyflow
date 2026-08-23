/**
 * The in-page semantic sampler, the scroll positioner, and the prefix preload.
 *
 * These functions are stringified and evaluated inside the page, so they must
 * not reference anything from this module's scope. They are written here rather
 * than inline in the runner so the DOM contract is in one reviewable place.
 *
 * EVERY page-side source string in this file uses `String.raw`, and must. In a
 * plain template literal a page-side `\(` collapses to `(`, turning a literal
 * paren into a regex capture group — which silently stopped `translateY(0px)`
 * from matching and made the notes pass report 0 of 20 rows reachable.
 *
 * DOM CONTRACT — deliberately minimal, so the same harness runs unchanged
 * against the ported grid:
 *   - `[data-testid="transaction-table"]` exists somewhere inside the scroller.
 *   - The scroller is found by walking ancestors until one actually scrolls.
 *     No class name, no fixed depth.
 *   - Each rendered row carries `data-index` with its index in the row list.
 *   - Rows are positioned by a `translateY(...)` transform.
 * Nothing else about the markup is assumed.
 *
 * WHAT DRIVES THE SCROLL. Nothing here does, during a route. The route's wheel
 * deltas are dispatched from Node on a wall-clock schedule (see
 * `scroll-routes.ts` and `measure-grid.ts`); this module only observes. That
 * separation is the point: input timing must not depend on how fast the page
 * renders.
 */

/**
 * The subset of a sample both loops produce: enough to pin the frame to the trace
 * clock and to decide whether the grid was moving.
 */
export interface RawTimingSample {
    /** `performance.mark` name that pins this sample to the trace clock. */
    readonly markName: string;
    /** Cost of taking this sample, so instrument overhead is disclosed. */
    readonly sampleCostMilliseconds: number;
    readonly scrollTop: number;
    /** True when the scroller moved since the previous sample. */
    readonly scrollTopChanged: boolean;
    /** Wheel deltaY observed by a passive listener since the previous sample. */
    readonly wheelDeltaSincePreviousSample: number;
    readonly wheelEventsSincePreviousSample: number;
}

/** One mounted row's virtualiser offset against its real rendered height. */
export interface RawRowGeometry {
    readonly index: number;
    readonly offsetHeight: number;
    readonly translateY: number | null;
}

/** Serialised sample as produced by the INSTRUMENTED loop. */
export interface RawGridSample extends RawTimingSample {
    /** The scroll container's real viewport height. */
    readonly clientHeight: number;
    /** `getTotalSize()` as painted: the row container's height. */
    readonly totalSizePx: number | null;
    readonly scrollHeightPx: number;
    readonly firstIndex: number | null;
    readonly rowGeometry: readonly RawRowGeometry[];
    readonly hasDuplicateRowId: boolean;
    /** Sticky overlays that legitimately cover the viewport. */
    readonly portalMasks: readonly {
        readonly bottom: number;
        readonly left: number;
        readonly right: number;
        readonly top: number;
    }[];
    /** Scroll offset implied by the rendered rows' own transforms. */
    readonly renderedScrollTop: number;
    readonly rowIndexesAscending: boolean;
    readonly rowRectangles: readonly {
        readonly bottom: number;
        readonly left: number;
        readonly right: number;
        readonly top: number;
    }[];
    readonly viewport: {
        readonly bottom: number;
        readonly left: number;
        readonly right: number;
        readonly top: number;
    };
    readonly visibleRowCount: number;
}

export interface RouteRunResult<Sample extends RawTimingSample = RawGridSample> {
    readonly finalScrollTop: number;
    readonly maxOffset: number;
    readonly maxScrollTop: number;
    readonly minScrollTop: number;
    readonly samples: readonly Sample[];
    /** Wheel events the page observed across the whole route. */
    readonly wheelEventsObserved: number;
    /** Signed sum of observed wheel deltaY across the route, in CSS pixels. */
    readonly wheelDeltaObserved: number;
    /**
     * Sum of |deltaY| across the route. This is the one that measures how much
     * input arrived: a reversing route's signed sum is ~0 however well it landed.
     */
    readonly wheelAbsoluteDeltaObserved: number;
    /**
     * True when a fresh scan on the final frame found a different set of sticky
     * overlays than the one cached at the start. Masks are cached per route
     * because a full `getComputedStyle` sweep every frame is instrument cost
     * inside the frame being measured; this flag is the safety net that says the
     * cache was wrong.
     */
    readonly stickyMaskDrift: boolean;
}

/**
 * Find the scroller and install the passive wheel witness. Idempotent: the
 * listener is installed at most once per document, because a session runs the
 * route set many times and N stacked listeners would make later repeats more
 * expensive than earlier ones — an instrument that degrades its own subject.
 */
export const INSTALL_GRID_OBSERVER_SOURCE = String.raw`
(() => {
    const table = document.querySelector('[data-testid="transaction-table"]');
    if (table == null) throw new Error("transaction table not found");
    let scroller = table;
    while (scroller != null && !(scroller.scrollHeight > scroller.clientHeight + 10)) {
        scroller = scroller.parentElement;
    }
    if (scroller == null) throw new Error("scrollable ancestor not found");

    if (window.__mfGridObserver == null || window.__mfGridObserver.scroller !== scroller) {
        // Both sums are needed. The SIGNED sum measures net travel; the ABSOLUTE
        // sum measures how much input arrived, and only the absolute one can
        // check a reversing route - fast-reversal's deltas net to ~0px while
        // delivering ~23,500px of movement, so a signed check on it reads as
        // "no input arrived" no matter how well the input landed.
        const witness = { absoluteDeltaSum: 0, deltaSum: 0, events: 0, scroller };
        // passive: Chromium is free to keep the scroll off the main thread; a
        // cancelable listener would force main-thread handling and change the
        // very path being measured.
        scroller.addEventListener(
            "wheel",
            (event) => {
                witness.events += 1;
                witness.deltaSum += event.deltaY;
                witness.absoluteDeltaSum += Math.abs(event.deltaY);
            },
            { capture: true, passive: true }
        );
        window.__mfGridObserver = witness;
    }
    const rect = scroller.getBoundingClientRect();
    return {
        clientHeight: scroller.clientHeight,
        height: rect.height,
        left: rect.left,
        maxOffset: Math.max(0, scroller.scrollHeight - scroller.clientHeight),
        scrollHeight: scroller.scrollHeight,
        scrollTop: scroller.scrollTop,
        top: rect.top,
        width: rect.width
    };
})
`;

/**
 * Hold an absolute offset until it sticks, then report it.
 *
 * MEASURED BEHAVIOUR THIS EXISTS FOR: a single assignment to `scrollTop` is
 * reverted on the very next frame and stays reverted — observed, setting 0 from
 * 506,905 read back as 506,905 for 90 consecutive frames. Assigning it every
 * frame does hold. This runs BEFORE a route, never during one.
 */
export const HOLD_SCROLL_OFFSET_SOURCE = String.raw`
(async (target) => {
    const observer = window.__mfGridObserver;
    if (observer == null) throw new Error("grid observer not installed");
    const scroller = observer.scroller;
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    const maxOffset = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const clamped = Math.min(maxOffset, Math.max(0, target));
    let settledFor = 0;
    for (let attempt = 0; attempt < 90; attempt += 1) {
        scroller.scrollTop = clamped;
        await frame();
        if (Math.abs(scroller.scrollTop - clamped) <= 1) {
            settledFor += 1;
            if (settledFor >= 6) break;
        } else {
            settledFor = 0;
        }
    }
    // Two clean frames with no assignment at all, so "settled" means the grid
    // holds the offset on its own rather than only while being pushed.
    await frame();
    await frame();
    return {
        maxOffset,
        requested: clamped,
        scrollTop: scroller.scrollTop,
        settled: Math.abs(scroller.scrollTop - clamped) <= 1
    };
})
`;

/**
 * Sample the grid once per animation frame for `durationMilliseconds`.
 *
 * The loop is wall-clock bounded, not tick-counted, so a page that presents 25
 * frames a second produces fewer samples over the same window rather than
 * stretching the window — the route's duration is a property of the stimulus,
 * not of the grid's speed.
 */
export const GRID_SAMPLE_LOOP_SOURCE = String.raw`
(async (markPrefix, durationMilliseconds) => {
    const observer = window.__mfGridObserver;
    if (observer == null) throw new Error("grid observer not installed");
    const scroller = observer.scroller;
    observer.events = 0;
    observer.deltaSum = 0;
    observer.absoluteDeltaSum = 0;

    const readTranslateY = (element) => {
        const match = /translateY\(\s*(-?[\d.]+)px\s*\)/.exec(element.style.transform);
        return match == null ? null : Number(match[1]);
    };

    // Sticky descendants of the scroller (the column header) cover the viewport
    // without being rows; unmasked, their band reads as blank on every frame.
    const scanStickyElements = () => {
        const found = [];
        for (const candidate of Array.from(scroller.querySelectorAll("*"))) {
            if (getComputedStyle(candidate).position !== "sticky") continue;
            found.push(candidate);
        }
        return found;
    };
    const stickyElements = scanStickyElements();

    const rectangleOf = (element) => {
        const rect = element.getBoundingClientRect();
        return rect.width <= 0 || rect.height <= 0
            ? null
            : { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top };
    };

    const samples = [];
    let previousScrollTop = scroller.scrollTop;
    let previousEvents = 0;
    let previousDelta = 0;
    let maxScrollTop = previousScrollTop;
    let minScrollTop = previousScrollTop;

    const sample = (markName) => {
        const costStart = performance.now();
        const viewportRect = scroller.getBoundingClientRect();
        const viewport = {
            bottom: viewportRect.bottom,
            left: viewportRect.left,
            right: viewportRect.right,
            top: viewportRect.top
        };
        const portalMasks = [];
        for (const element of stickyElements) {
            const rectangle = rectangleOf(element);
            if (rectangle != null) portalMasks.push(rectangle);
        }

        const rowElements = Array.from(scroller.querySelectorAll("[data-index]"));
        const indexes = rowElements.map((element) => Number(element.getAttribute("data-index")));
        // Per-row geometry, for the blank-frame diagnostic. translateY is the
        // virtualiser's own cumulative measurement offset; offsetHeight is what the
        // row actually rendered as. Their relationship is the discriminator.
        const rowGeometry = [];
        for (const element of rowElements) {
            rowGeometry.push({
                index: Number(element.getAttribute("data-index")),
                offsetHeight: element.offsetHeight,
                translateY: readTranslateY(element)
            });
        }
        const rowRectangles = [];
        const seenIds = new Set();
        let hasDuplicateRowId = false;
        let visibleRowCount = 0;
        let firstVisible = null;

        for (const element of rowElements) {
            const rect = element.getBoundingClientRect();
            if (rect.bottom <= viewport.top || rect.top >= viewport.bottom) continue;
            rowRectangles.push({
                bottom: rect.bottom,
                left: rect.left,
                right: rect.right,
                top: rect.top
            });
            visibleRowCount += 1;
            if (firstVisible == null || rect.top < firstVisible.rect.top) {
                firstVisible = { element, rect };
            }
            const id = element.getAttribute("data-index");
            if (id != null) {
                if (seenIds.has(id)) hasDuplicateRowId = true;
                seenIds.add(id);
            }
        }

        // The rendered rows' own transforms imply a scroll offset. translateY is
        // relative to the row container, NOT the scroller, and the container sits
        // below a sticky header — so comparing against the scroller's rect
        // carries a constant ~header-height bias that reads as permanent
        // staleness. Referencing the row's actual parent removes it, and leaves
        // only genuine transform/scroll desync.
        const scrollTop = scroller.scrollTop;
        let renderedScrollTop = scrollTop;
        if (firstVisible != null) {
            const translateY = readTranslateY(firstVisible.element);
            const parent = firstVisible.element.parentElement;
            if (translateY != null && parent != null) {
                const parentTop = parent.getBoundingClientRect().top;
                renderedScrollTop = translateY + parentTop + scrollTop - firstVisible.rect.top;
            }
        }

        let ascending = true;
        for (let i = 1; i < indexes.length; i += 1) {
            if (indexes[i] <= indexes[i - 1]) { ascending = false; break; }
        }

        const events = observer.events - previousEvents;
        const delta = observer.deltaSum - previousDelta;
        previousEvents = observer.events;
        previousDelta = observer.deltaSum;
        const scrollTopChanged = Math.abs(scrollTop - previousScrollTop) > 0.5;
        previousScrollTop = scrollTop;
        if (scrollTop > maxScrollTop) maxScrollTop = scrollTop;
        if (scrollTop < minScrollTop) minScrollTop = scrollTop;

        // Proxy for the virtualiser's count: the row container's height IS
        // getTotalSize(), so a container of ~440,000px cannot be a list of 92
        // rows. Read from the first mounted row's parent, which is the container
        // the rows are positioned inside.
        const rowParent = rowElements.length === 0 ? null : rowElements[0].parentElement;
        performance.mark(markName);
        return {
            clientHeight: scroller.clientHeight,
            totalSizePx: rowParent == null ? null : rowParent.offsetHeight,
            scrollHeightPx: scroller.scrollHeight,
            rowGeometry,
            firstIndex: indexes.length === 0 ? null : Math.min.apply(null, indexes),
            hasDuplicateRowId,
            markName,
            portalMasks,
            renderedScrollTop,
            rowIndexesAscending: ascending,
            rowRectangles,
            sampleCostMilliseconds: performance.now() - costStart,
            scrollTop,
            scrollTopChanged,
            viewport,
            visibleRowCount,
            wheelDeltaSincePreviousSample: delta,
            wheelEventsSincePreviousSample: events
        };
    };

    const startedAt = performance.now();
    let index = 0;
    for (;;) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        samples.push(sample(markPrefix + index));
        index += 1;
        if (performance.now() - startedAt >= durationMilliseconds) break;
    }

    const finalSticky = scanStickyElements();
    const stickyMaskDrift =
        finalSticky.length !== stickyElements.length ||
        finalSticky.some((element, position) => element !== stickyElements[position]);

    // Marks accumulate across every route of every repeat in one session; clear
    // them so a late repeat is not paying for an early one's buffer.
    performance.clearMarks();

    return {
        finalScrollTop: scroller.scrollTop,
        maxOffset: Math.max(0, scroller.scrollHeight - scroller.clientHeight),
        maxScrollTop,
        minScrollTop,
        samples,
        stickyMaskDrift,
        wheelAbsoluteDeltaObserved: observer.absoluteDeltaSum,
        wheelDeltaObserved: observer.deltaSum,
        wheelEventsObserved: observer.events
    };
})
`;

/**
 * The CLEAN sample loop: no rectangles, no computed styles, no DOM queries.
 *
 * Per frame it does exactly three things — one `performance.mark` to pin the frame
 * to the trace clock, one `scrollTop` read, and a read of two counters the passive
 * wheel listener maintains. Nothing here can produce a blank/stale/partial
 * classification; that is the point. The cadence thresholds are absolute, and the
 * semantic sampler costs up to 31.5ms of a 16.666ms budget in its worst frame, so
 * the run that the cadence thresholds are evaluated against must not be carrying
 * it.
 *
 * `moving` is derived from exactly the same two signals as in the instrumented
 * run (wheel arrival and scroller movement), so the two runs scope their cadence
 * windows identically and their numbers are comparable.
 *
 * Its own per-frame cost is measured and reported, so "clean" is a number rather
 * than a claim.
 */
export const GRID_CLEAN_SAMPLE_LOOP_SOURCE = String.raw`
(async (markPrefix, durationMilliseconds) => {
    const observer = window.__mfGridObserver;
    if (observer == null) throw new Error("grid observer not installed");
    const scroller = observer.scroller;
    observer.events = 0;
    observer.deltaSum = 0;
    observer.absoluteDeltaSum = 0;

    const samples = [];
    let previousScrollTop = scroller.scrollTop;
    let previousEvents = 0;
    let previousDelta = 0;
    let maxScrollTop = previousScrollTop;
    let minScrollTop = previousScrollTop;

    const startedAt = performance.now();
    let index = 0;
    for (;;) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const costStart = performance.now();
        const markName = markPrefix + index;
        const scrollTop = scroller.scrollTop;
        const events = observer.events - previousEvents;
        const delta = observer.deltaSum - previousDelta;
        previousEvents = observer.events;
        previousDelta = observer.deltaSum;
        const scrollTopChanged = Math.abs(scrollTop - previousScrollTop) > 0.5;
        previousScrollTop = scrollTop;
        if (scrollTop > maxScrollTop) maxScrollTop = scrollTop;
        if (scrollTop < minScrollTop) minScrollTop = scrollTop;
        performance.mark(markName);
        samples.push({
            markName,
            sampleCostMilliseconds: performance.now() - costStart,
            scrollTop,
            scrollTopChanged,
            wheelDeltaSincePreviousSample: delta,
            wheelEventsSincePreviousSample: events
        });
        index += 1;
        if (performance.now() - startedAt >= durationMilliseconds) break;
    }

    performance.clearMarks();

    return {
        finalScrollTop: scroller.scrollTop,
        maxOffset: Math.max(0, scroller.scrollHeight - scroller.clientHeight),
        maxScrollTop,
        minScrollTop,
        samples,
        stickyMaskDrift: false,
        wheelAbsoluteDeltaObserved: observer.absoluteDeltaSum,
        wheelDeltaObserved: observer.deltaSum,
        wheelEventsObserved: observer.events
    };
})
`;

/**
 * Make every row addressable, and report how much work that took.
 *
 * WHY THIS EXISTS, AND WHY ITS RESULT DIFFERS BETWEEN ARMS. The pre-port grid
 * renders `filteredTransactions.slice(0, displayCount)` with `displayCount`
 * starting at 50 and growing by 50 (`PAGE_SIZE`) whenever the virtualiser reaches
 * the end of the loaded prefix, so a freshly seeded 10,000-row vault presents a
 * 50-row grid whose `scrollHeight` is ~2,500px rather than ~507,000px. Measuring a
 * scroll route against that would measure the pagination loader. Reaching index
 * 9,999 took exactly 200 iterations, one per page.
 *
 * A grid that sizes its virtualiser from the cursor's own count has nothing to
 * preload: row 9,999 is addressable immediately and this loop exits on its first
 * pass. THAT IS A PRODUCT DIFFERENCE, NOT A HARNESS INCONSISTENCY, so this reports
 * `iterations` rather than asserting a particular number. The caller checks the
 * property that actually matters — every row reachable — against the grid's own
 * count. See `measure-grid.ts`.
 */
export const PREFIX_PRELOAD_SOURCE = String.raw`
(async (targetRows) => {
    const table = document.querySelector('[data-testid="transaction-table"]');
    if (table == null) throw new Error("transaction table not found");
    let scroller = table;
    while (scroller != null && !(scroller.scrollHeight > scroller.clientHeight + 10)) {
        scroller = scroller.parentElement;
    }
    if (scroller == null) throw new Error("scrollable ancestor not found");

    const twoFrames = () =>
        new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const highestIndex = () => {
        const elements = Array.from(scroller.querySelectorAll("[data-index]"));
        let highest = -1;
        for (const element of elements) {
            const index = Number(element.getAttribute("data-index"));
            if (index > highest) highest = index;
        }
        return highest;
    };

    // The grid's OWN count of the rows it is showing, from the toolbar the user
    // reads. Needed because the number of top-level rows is not always the number
    // of rows imported: the product nests a detected duplicate under its original,
    // and getCanonicalTransactions keeps only public transactions, so one
    // duplicate across four imports legitimately leaves 9,999 rows in a
    // 10,000-row import. Measuring it beats assuming it.
    // (No backticks in this file's page-side strings: they are template literals.)
    const readGridRowCount = () => {
        const toolbar = document.querySelector('[data-testid="transaction-table-toolbar"]');
        if (toolbar == null) return null;
        const match = /([\d,]+)\s+transactions?/.exec(toolbar.textContent ?? "");
        if (match == null) return null;
        return Number(match[1].replace(/,/g, ""));
    };

    const transitions = [];
    let previous = -1;
    let stalled = 0;
    for (let iteration = 0; iteration < targetRows; iteration += 1) {
        scroller.scrollTop = scroller.scrollHeight;
        await twoFrames();
        const highest = highestIndex();
        if (highest === previous) {
            stalled += 1;
            if (stalled > 15) break;
        } else {
            transitions.push(highest);
            stalled = 0;
        }
        previous = highest;
        const rowCount = readGridRowCount();
        if (rowCount != null && highest >= rowCount - 1) break;
        if (highest >= targetRows - 1) break;
    }

    // A single assignment is reverted on the next frame; hold it until it sticks.
    for (let attempt = 0; attempt < 45; attempt += 1) {
        scroller.scrollTop = 0;
        await twoFrames();
        if (scroller.scrollTop <= 1 && attempt >= 5) break;
    }
    // Report the highest index seen WHILE SCROLLED TO THE BOTTOM. Calling
    // highestIndex() here would instead report the top window (0..17), because
    // only rendered rows carry data-index. Reading it after a scroll-to-top that
    // silently failed is what made an earlier version report a spurious 9999.
    return {
        clientHeight: scroller.clientHeight,
        gridRowCount: readGridRowCount(),
        highestIndex: previous,
        iterations: transitions.length,
        scrollHeight: scroller.scrollHeight,
        settledAtTop: scroller.scrollTop <= 1
    };
})
`;
