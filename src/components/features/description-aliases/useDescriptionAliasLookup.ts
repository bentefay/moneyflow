"use client";

import { useMemo } from "react";

import {
    createDescriptionAliasLookup,
    type DescriptionAliasCollection,
    type DescriptionAliasLookup
} from "@/lib/domain/description-aliases";

/** Reuse one bounded alias read index until the CRDT alias collection identity changes. */
export function useDescriptionAliasLookup(
    aliases: DescriptionAliasCollection
): DescriptionAliasLookup {
    return useMemo(() => createDescriptionAliasLookup(aliases), [aliases]);
}
