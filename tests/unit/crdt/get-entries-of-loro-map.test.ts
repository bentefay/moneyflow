/**
 * Tests for getEntriesOfLoroMap
 *
 * loro-mirror injects a `$cid` string key into every map record at runtime. Five production
 * components iterate vault records through this helper, so a leaked `$cid` entry would surface as
 * a phantom account/person/status/tag row whose fields are all undefined.
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { getEntriesOfLoroMap } from "@/lib/crdt/utils";

interface NamedEntity {
    readonly name: string;
}

/** Shapes a record the way loro-mirror hands one over: entities plus a `$cid` tracking string. */
function withCid(
    entities: Readonly<Record<string, NamedEntity>>,
    cid = "cid:root-Statuses:Map"
): Record<string, NamedEntity | string> {
    return { ...entities, $cid: cid };
}

describe("getEntriesOfLoroMap", () => {
    interface EntriesCase {
        readonly name: string;
        readonly record: Record<string, NamedEntity | string>;
        readonly expected: ReadonlyArray<[string, NamedEntity]>;
    }

    const paid: NamedEntity = { name: "Paid" };
    const review: NamedEntity = { name: "For Review" };

    const cases: readonly EntriesCase[] = [
        { name: "empty record", record: {}, expected: [] },
        { name: "record holding only $cid", record: withCid({}), expected: [] },
        {
            name: "single entity alongside $cid",
            record: withCid({ "status-paid": paid }),
            expected: [["status-paid", paid]]
        },
        {
            name: "several entities preserve insertion order",
            record: withCid({ "status-paid": paid, "status-review": review }),
            expected: [
                ["status-paid", paid],
                ["status-review", review]
            ]
        },
        {
            name: "record without $cid is passed through unchanged",
            record: { "status-paid": paid },
            expected: [["status-paid", paid]]
        }
    ];

    it.each(cases)("$name", ({ record, expected }) => {
        expect(getEntriesOfLoroMap(record)).toEqual(expected);
    });

    it("drops an entity literally keyed $cid, since that key is reserved", () => {
        // A record can only ever carry one `$cid`, and loro-mirror owns it.
        expect(getEntriesOfLoroMap({ $cid: paid })).toEqual([]);
    });

    it("drops non-object values, which is how a stray $cid string would arrive", () => {
        expect(getEntriesOfLoroMap({ "status-paid": paid, legacy: "cid:orphan" })).toEqual([
            ["status-paid", paid]
        ]);
    });

    it("property: never yields $cid and never yields a non-object value", () => {
        fc.assert(
            fc.property(
                fc.dictionary(fc.string(), fc.record({ name: fc.string() })),
                fc.string(),
                (entities, cid) => {
                    const entries = getEntriesOfLoroMap(withCid(entities, cid));

                    expect(entries.every(([key]) => key !== "$cid")).toBe(true);
                    expect(entries.every(([, value]) => typeof value === "object")).toBe(true);
                }
            )
        );
    });

    it("property: returns every entity key except $cid", () => {
        fc.assert(
            fc.property(
                fc.dictionary(
                    fc.string().filter((key) => key !== "$cid"),
                    fc.record({ name: fc.string() })
                ),
                (entities) => {
                    const keys = getEntriesOfLoroMap(withCid(entities)).map(([key]) => key);

                    expect(keys).toEqual(Object.keys(entities));
                }
            )
        );
    });
});
