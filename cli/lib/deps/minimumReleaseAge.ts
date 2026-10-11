import path from "node:path";

import { repoRoot } from "../paths";

/** Reads `[install] minimumReleaseAge` (seconds) from the root bunfig, the single source of truth. */
export const readMinimumReleaseAgeSeconds = async (): Promise<number> => {
    const config: unknown = Bun.TOML.parse(
        await Bun.file(path.join(repoRoot, "bunfig.toml")).text()
    );
    const install =
        typeof config === "object" && config !== null && "install" in config
            ? config.install
            : undefined;
    const seconds =
        typeof install === "object" && install !== null && "minimumReleaseAge" in install
            ? install.minimumReleaseAge
            : undefined;
    if (typeof seconds !== "number")
        throw new Error("bunfig.toml has no [install] minimumReleaseAge");
    return seconds;
};
