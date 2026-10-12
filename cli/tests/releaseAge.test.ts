import fc from "fast-check";
import semver from "semver";
import { describe, expect, it } from "vitest";

import { newestEligibleVersion, updateStatus } from "../lib/deps/releaseAge";

const cutoff = new Date("2026-10-09T00:00:00Z");

const times = {
    created: "2020-01-01T00:00:00Z",
    modified: "2026-10-10T00:00:00Z",
    "1.0.0": "2026-01-01T00:00:00Z",
    "1.1.0": "2026-10-01T00:00:00Z",
    "1.2.0-beta.1": "2026-10-02T00:00:00Z",
    "1.2.0": "2026-10-10T00:00:00Z",
    "2.0.0": "2026-10-03T00:00:00Z"
};

describe("newestEligibleVersion", () => {
    it.each([
        { latest: "1.2.0", expected: "1.1.0", why: "1.2.0 is too young; 2.0.0 is past latest" },
        { latest: "2.0.0", expected: "2.0.0", why: "latest is old enough" },
        { latest: "1.0.0", expected: "1.0.0", why: "nothing beyond latest counts" }
    ])("picks $expected when latest is $latest ($why)", ({ latest, expected }) => {
        expect(newestEligibleVersion(times, latest, cutoff)).toBe(expected);
    });

    it("never returns a prerelease, a too-young version, or anything beyond latest", () => {
        const version = fc
            .tuple(
                fc.nat(5),
                fc.nat(5),
                fc.nat(5),
                fc.option(fc.constantFrom("alpha.1", "rc.0"), { nil: undefined })
            )
            .map(
                ([major, minor, patch, pre]) => `${major}.${minor}.${patch}${pre ? `-${pre}` : ""}`
            );
        const time = fc.date({
            min: new Date("2026-01-01"),
            max: new Date("2026-12-31"),
            noInvalidDate: true
        });
        fc.assert(
            fc.property(
                fc.dictionary(
                    version,
                    time.map((date) => date.toISOString())
                ),
                version,
                (published, latest) => {
                    const chosen = newestEligibleVersion(published, latest, cutoff);
                    if (chosen == null) return;
                    const publishedAt = published[chosen];
                    expect(semver.prerelease(chosen)).toBeNull();
                    expect(semver.lte(chosen, latest)).toBe(true);
                    expect(publishedAt != null && Date.parse(publishedAt) <= cutoff.getTime()).toBe(
                        true
                    );
                }
            )
        );
    });
});

describe("updateStatus", () => {
    it.each([
        { current: "1.0.0", latest: "1.2.0", expected: { kind: "update", to: "1.1.0" } },
        { current: "1.1.0", latest: "1.2.0", expected: { kind: "too-young", newest: "1.2.0" } },
        { current: "2.0.0", latest: "2.0.0", expected: { kind: "current" } },
        { current: "^1.0.0", latest: "1.2.0", expected: { kind: "update", to: "1.1.0" } },
        { current: "workspace:*", latest: "1.2.0", expected: { kind: "unknown" } }
    ])("$current with latest $latest is $expected.kind", ({ current, latest, expected }) => {
        expect(updateStatus(current, times, latest, cutoff)).toEqual(expected);
    });
});
