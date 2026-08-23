/**
 * Digests of the harness, split by what each part can influence.
 *
 * WHY TWO DIGESTS. Arm A and arm C will NOT share one harness digest, and that is
 * a real product difference rather than sloppiness: the pre-port grid paginates,
 * so its capture must preload 200 steps to make row 9,999 addressable; the ported
 * grid feeds the virtualizer from `cursor.count`, so nothing needs preloading and
 * the preload would be measuring a workaround that no longer exists.
 *
 * A single whole-tree digest cannot express that. It says "the harness differed"
 * and leaves a reader to take on trust that it differed only where it had to. So
 * the files are split:
 *
 *   MEASUREMENT PATH — how a frame is driven, sampled, classified and scored.
 *     If this is identical across arms, "the arms differ in the product, not in
 *     how they were measured" is a checkable claim.
 *   SEEDING PATH — how the vault is built and how the grid is made ready.
 *     This is where the arms are ALLOWED to differ, and where they do.
 *
 * Both are reported for every arm. A difference in the measurement digest between
 * two arms invalidates the comparison; a difference in the seeding digest is
 * expected here and must be explained in the write-up.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Files that decide what a number MEANS: the trace, the classification, the
 * thresholds, the routes, the in-page sampling and the aggregation. No seeding
 * logic lives in any of them.
 */
export const MEASUREMENT_CORE_FILES: readonly string[] = [
    "browser-environment.ts",
    "frame-report.ts",
    "grid-sampler.ts",
    "run-statistics.ts",
    "scroll-routes.ts",
    "trace-presentation.ts",
    "viewport-coverage.ts"
];

/** Files that decide what is IN the vault and how the grid is made ready. */
export const SEEDING_PATH_FILES: readonly string[] = [
    "fixture/transaction-fixture.ts",
    "fixture/vault-setup.ts"
];

/**
 * `measure-grid.ts` spans both concerns — it runs the routes AND orchestrates
 * seeding — so it is digested on its own rather than being folded into either.
 *
 * Folding it into the measurement digest would have made that digest move when
 * only a seeding assertion changed, which is exactly the misreading the split
 * exists to prevent: a reader would see two arms with different "measurement"
 * digests and conclude the comparison was invalid. Splitting the file itself
 * would be the better fix and is left as follow-up work.
 */
export const ORCHESTRATION_FILES: readonly string[] = ["measure-grid.ts"];

function digestOf(directory: string, files: readonly string[]): string {
    const hash = createHash("sha256");
    // Sorted, and each file's bytes are prefixed with its name and length, so
    // renaming or reordering cannot collide with a content change.
    for (const file of [...files].sort()) {
        const bytes = readFileSync(join(directory, file));
        hash.update(`${file}:${String(bytes.byteLength)}:`);
        hash.update(bytes);
    }
    return hash.digest("hex");
}

export interface HarnessDigests {
    /** Identical across arms, or the comparison is invalid. */
    readonly measurementCore: string;
    /** Spans both concerns; a difference needs explaining, not dismissing. */
    readonly orchestration: string;
    /** Expected to differ between a paginating grid and a cursor-sized one. */
    readonly seedingPath: string;
}

/**
 * `directory` is `tests/perf`. Reads from disk deliberately: the digest must
 * describe the bytes that ran, not a constant someone remembered to update.
 */
export function harnessDigests(directory: string): HarnessDigests {
    return {
        measurementCore: digestOf(directory, MEASUREMENT_CORE_FILES),
        orchestration: digestOf(directory, ORCHESTRATION_FILES),
        seedingPath: digestOf(directory, SEEDING_PATH_FILES)
    };
}
