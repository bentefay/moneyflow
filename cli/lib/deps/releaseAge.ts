import semver from "semver";

/** Version -> ISO publish time, as in the npm registry's `time` field (which also holds non-versions). */
export type PublishTimes = Readonly<Record<string, string>>;

export type UpdateStatus =
    | { readonly kind: "current" }
    | { readonly kind: "update"; readonly to: string }
    | { readonly kind: "too-young"; readonly newest: string }
    | { readonly kind: "unknown" };

/**
 * The newest stable version published at or before `cutoff` and not beyond the `latest` dist-tag,
 * which keeps backport majors and canary lines out.
 */
export const newestEligibleVersion = (
    publishTimes: PublishTimes,
    latest: string,
    cutoff: Date
): string | undefined =>
    Object.entries(publishTimes)
        .filter(
            ([version, publishedAt]) =>
                semver.valid(version) !== null &&
                semver.prerelease(version) === null &&
                semver.lte(version, latest) &&
                Date.parse(publishedAt) <= cutoff.getTime()
        )
        .map(([version]) => version)
        .sort(semver.rcompare)[0];

export const updateStatus = (
    current: string,
    publishTimes: PublishTimes,
    latest: string,
    cutoff: Date
): UpdateStatus => {
    const eligible = newestEligibleVersion(publishTimes, latest, cutoff);
    const currentVersion =
        semver.validRange(current) == null ? undefined : semver.minVersion(current)?.version;
    if (eligible == null || currentVersion == null) return { kind: "unknown" };
    if (semver.gt(eligible, currentVersion)) return { kind: "update", to: eligible };
    if (semver.gt(latest, currentVersion)) return { kind: "too-young", newest: latest };
    return { kind: "current" };
};
