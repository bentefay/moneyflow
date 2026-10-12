import type { ExitCode } from "./exec";

export interface Step {
    readonly name: string;
    readonly run: () => Promise<ExitCode>;
}

export interface StepsReporter {
    readonly started: (step: Step, index: number, total: number) => void;
    readonly failed: (step: Step, code: ExitCode) => void;
}

const consoleReporter: StepsReporter = {
    started: (step, index, total) =>
        console.log(`\n\u001b[34m▶ [${index + 1}/${total}] ${step.name}\u001b[0m`),
    failed: (step, code) =>
        console.error(`\n\u001b[31m✗ ${step.name} failed with exit code ${code}\u001b[0m`)
};

/** Runs steps in order and stops at the first failure, returning its exit code (0 if all pass). */
export const runSteps = async (
    steps: readonly Step[],
    reporter: StepsReporter = consoleReporter
): Promise<ExitCode> => {
    for (const [index, step] of steps.entries()) {
        reporter.started(step, index, steps.length);
        const code = await step.run();
        if (code !== 0) {
            reporter.failed(step, code);
            return code;
        }
    }
    return 0;
};
