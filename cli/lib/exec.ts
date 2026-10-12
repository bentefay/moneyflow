import { spawn } from "node:child_process";
import { constants } from "node:os";
import path from "node:path";

import { localBinaryPath, repoRoot } from "./paths";

export type ExitCode = number;

export interface ExecOptions {
    readonly cwd?: string;
    readonly env?: Readonly<Record<string, string>>;
}

const signalExitCode = (signal: NodeJS.Signals | null): ExitCode =>
    signal == null ? 1 : 128 + constants.signals[signal];

const childEnvironment = (options: ExecOptions): NodeJS.ProcessEnv => ({
    ...process.env,
    ...options.env,
    PATH: [localBinaryPath, process.env.PATH ?? ""].join(path.delimiter)
});

const spawnTool = (
    command: string,
    args: readonly string[],
    options: ExecOptions,
    stdout: "inherit" | "pipe"
): Promise<{ readonly code: ExitCode; readonly stdout: string }> =>
    new Promise((resolve, reject) => {
        const child = spawn(command, [...args], {
            cwd: options.cwd ?? repoRoot,
            env: childEnvironment(options),
            stdio: ["inherit", stdout, "inherit"]
        });
        const chunks: Buffer[] = [];
        child.stdout?.on("data", (chunk: Buffer) => chunks.push(chunk));

        // The terminal delivers Ctrl-C to the whole process group, so the child already has it.
        // Ignoring it here lets the child shut down cleanly and its exit code become ours.
        const ignoreInterrupt = () => {};
        const forwardTerminate = () => child.kill("SIGTERM");
        process.on("SIGINT", ignoreInterrupt);
        process.on("SIGTERM", forwardTerminate);
        const detach = () => {
            process.off("SIGINT", ignoreInterrupt);
            process.off("SIGTERM", forwardTerminate);
        };

        child.on("error", (error) => {
            detach();
            reject(error);
        });
        child.on("exit", (code, signal) => {
            detach();
            resolve({
                code: code ?? signalExitCode(signal),
                stdout: Buffer.concat(chunks).toString("utf8")
            });
        });
    });

/**
 * Runs a tool with inherited stdio, preferring the repo's `node_modules/.bin`, and resolves with its
 * exit code. Arguments are an array and never pass through a shell, so they cannot split or inject.
 */
export const exec = async (
    command: string,
    args: readonly string[],
    options: ExecOptions = {}
): Promise<ExitCode> => (await spawnTool(command, args, options, "inherit")).code;

/** Like {@link exec}, but captures stdout instead of printing it. */
export const execCapture = (
    command: string,
    args: readonly string[],
    options: ExecOptions = {}
): Promise<{ readonly code: ExitCode; readonly stdout: string }> =>
    spawnTool(command, args, options, "pipe");
