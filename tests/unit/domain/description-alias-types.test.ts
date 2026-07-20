import { describe, expectTypeOf, it } from "vitest";

import type { DescriptionAlias } from "@/lib/domain/description-aliases";

describe("description alias public types", () => {
    it("make illegal real/symlink field combinations unrepresentable", () => {
        const real: DescriptionAlias = {
            kind: "real",
            id: "real",
            name: "Real",
            symlinkIds: {},
            transactionIds: {}
        };
        const symlink: DescriptionAlias = {
            kind: "symlink",
            id: "link",
            targetAliasId: "real",
            transactionIds: {}
        };

        expectTypeOf(real).toMatchTypeOf<DescriptionAlias>();
        expectTypeOf(symlink).toMatchTypeOf<DescriptionAlias>();

        // @ts-expect-error A real alias cannot expose a target.
        const illegalReal: DescriptionAlias = { ...real, targetAliasId: "other" };
        // @ts-expect-error A symlink cannot expose a recovery name.
        const illegalSymlinkName: DescriptionAlias = { ...symlink, name: "hidden" };
        // @ts-expect-error A symlink cannot expose real-node backlinks.
        const illegalSymlinkBacklinks: DescriptionAlias = { ...symlink, symlinkIds: {} };
        expectTypeOf(illegalReal).toMatchTypeOf<DescriptionAlias>();
        expectTypeOf(illegalSymlinkName).toMatchTypeOf<DescriptionAlias>();
        expectTypeOf(illegalSymlinkBacklinks).toMatchTypeOf<DescriptionAlias>();
    });
});
