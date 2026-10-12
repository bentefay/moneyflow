import { readFile } from "node:fs/promises";
import path from "node:path";

import type { ExitCode } from "../exec";
import { cliRoot, repoRoot } from "../paths";
import { readMinimumReleaseAgeSeconds } from "./minimumReleaseAge";
import type { PublishTimes, UpdateStatus } from "./releaseAge";
import { updateStatus } from "./releaseAge";

interface Manifest {
    readonly label: string;
    readonly dependencies: Readonly<Record<string, string>>;
}

const isStringRecord = (value: unknown): value is Readonly<Record<string, string>> =>
    typeof value === "object" &&
    value !== null &&
    Object.values(value).every((entry) => typeof entry === "string");

const readManifest = async (label: string, directory: string): Promise<Manifest> => {
    const parsed: unknown = JSON.parse(
        await readFile(path.join(directory, "package.json"), "utf8")
    );
    const field = (key: string): Readonly<Record<string, string>> => {
        const value =
            typeof parsed === "object" && parsed !== null && key in parsed
                ? Reflect.get(parsed, key)
                : {};
        return isStringRecord(value) ? value : {};
    };
    return { label, dependencies: { ...field("dependencies"), ...field("devDependencies") } };
};

interface Packument {
    readonly latest: string;
    readonly publishTimes: PublishTimes;
}

const fetchPackument = async (name: string): Promise<Packument | undefined> => {
    const response = await fetch(`https://registry.npmjs.org/${name.replace("/", "%2f")}`);
    if (!response.ok) return undefined;
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null) return undefined;
    const tags: unknown = Reflect.get(body, "dist-tags");
    const times: unknown = Reflect.get(body, "time");
    const latest =
        typeof tags === "object" && tags !== null ? Reflect.get(tags, "latest") : undefined;
    return typeof latest === "string" && isStringRecord(times)
        ? { latest, publishTimes: times }
        : undefined;
};

const describe = (status: UpdateStatus): string => {
    switch (status.kind) {
        case "current":
            return "up to date";
        case "update":
            return `→ ${status.to}`;
        case "too-young":
            return `${status.newest} is newer than the minimum age`;
        case "unknown":
            return "could not be resolved";
    }
};

/** Lists every dependency with a newer version that is old enough to install. */
export const listOutdated = async (options: { readonly all: boolean }): Promise<ExitCode> => {
    const cutoff = new Date(Date.now() - (await readMinimumReleaseAgeSeconds()) * 1000);
    const manifests = await Promise.all([
        readManifest("app", repoRoot),
        readManifest("cli", cliRoot)
    ]);
    const rows = await Promise.all(
        manifests.flatMap((manifest) =>
            Object.entries(manifest.dependencies).map(async ([name, current]) => {
                const packument = await fetchPackument(name);
                const status: UpdateStatus = packument
                    ? updateStatus(current, packument.publishTimes, packument.latest, cutoff)
                    : { kind: "unknown" };
                return { project: manifest.label, name, current, status };
            })
        )
    );
    const shown = rows
        .filter((row) => options.all || row.status.kind !== "current")
        .sort((a, b) => a.project.localeCompare(b.project) || a.name.localeCompare(b.name));
    const nameWidth = Math.max(7, ...shown.map((row) => row.name.length));
    console.log(`Minimum release age cutoff: ${cutoff.toISOString()}\n`);
    for (const row of shown) {
        console.log(
            `${row.project.padEnd(4)} ${row.name.padEnd(nameWidth)} ${row.current.padEnd(10)} ${describe(row.status)}`
        );
    }
    if (shown.length === 0) console.log("Every dependency is up to date.");
    return 0;
};
