import { describe, expectTypeOf, it } from "vitest";

import { useVaultAction, useVaultSelector, type DescriptionAlias } from "@/lib/crdt";
// @ts-expect-error Raw vault state is internal to CRDT serialization and maintenance.
type RawVaultState = import("@/lib/crdt").VaultState;
// @ts-expect-error The full writable store input is internal to CRDT maintenance.
type RawVaultInput = import("@/lib/crdt").VaultInput;
// @ts-expect-error Raw wire aliases are not part of the ordinary application module.
type RawDescriptionAlias = import("@/lib/crdt").DescriptionAliasWire;
// @ts-expect-error The raw Mirror context is not part of the ordinary application module.
type RawContextHook = typeof import("@/lib/crdt").useVaultContext;

function useCompileOrdinaryApplicationBoundary(): void {
    useVaultSelector((state) => {
        // @ts-expect-error Generic application selection cannot read recovery-name wire aliases.
        return state.descriptionAliases;
    });
    useVaultAction((state) => {
        // @ts-expect-error Generic application actions cannot write raw alias combinations.
        state.descriptionAliases.illegal = {
            id: "illegal",
            kind: "real",
            name: "Illegal",
            targetAliasId: "also-real",
            symlinkIds: {},
            transactionIds: {}
        };
    });
    expectTypeOf<RawVaultState>();
    expectTypeOf<RawVaultInput>();
    expectTypeOf<RawDescriptionAlias>();
    expectTypeOf<RawContextHook>();
}

void useCompileOrdinaryApplicationBoundary;

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
