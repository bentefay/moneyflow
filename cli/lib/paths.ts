import path from "node:path";

/** Resolved from this file rather than the working directory, so `run` behaves the same anywhere. */
export const repoRoot = path.resolve(import.meta.dirname, "..", "..");

export const cliRoot = path.join(repoRoot, "cli");

export const localBinaryPath = path.join(repoRoot, "node_modules", ".bin");
