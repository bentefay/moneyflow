/** Pure legal-state utilities for curated transaction description aliases. */

/** Internal CRDT/wire shape. Recovery names on symlinks never cross the public read boundary. */
export interface DescriptionAliasWireLike {
    readonly id: string;
    readonly name: string;
    readonly kind?: "real" | "symlink";
    readonly targetAliasId?: string;
    readonly symlinkIds: Readonly<Record<string, boolean | string>>;
    readonly transactionIds: Readonly<Record<string, boolean | string>>;
    readonly deletedAt?: unknown;
}

export interface RealDescriptionAlias {
    readonly kind: "real";
    readonly id: string;
    readonly name: string;
    readonly symlinkIds: Readonly<Record<string, boolean | string>>;
    readonly transactionIds: Readonly<Record<string, boolean | string>>;
    readonly deletedAt?: unknown;
}

export interface SymlinkDescriptionAlias {
    readonly kind: "symlink";
    readonly id: string;
    readonly targetAliasId: string;
    readonly transactionIds: Readonly<Record<string, boolean | string>>;
    readonly deletedAt?: unknown;
}

/** Public application state: real and symlink fields are mutually exclusive. */
export type DescriptionAlias = RealDescriptionAlias | SymlinkDescriptionAlias;
export type DescriptionAliasCollection = Readonly<Record<string, DescriptionAlias | string>>;

type DescriptionAliasReadable = DescriptionAlias | DescriptionAliasWireLike;
type DescriptionAliasReadableCollection = Readonly<
    Record<string, DescriptionAliasReadable | string>
>;

function hasTargetAliasId(
    alias: DescriptionAliasReadable
): alias is DescriptionAliasReadable & { readonly targetAliasId?: string } {
    return "targetAliasId" in alias;
}

/** Convert a wire record into a legal state, rejecting contradictory/incomplete combinations. */
export function toDescriptionAlias(alias: DescriptionAliasReadable): DescriptionAlias | undefined {
    const targetAliasId = hasTargetAliasId(alias) ? alias.targetAliasId : undefined;
    const isSymlink = alias.kind === "symlink" || (alias.kind == null && targetAliasId != null);
    if (isSymlink) {
        return targetAliasId
            ? {
                  kind: "symlink",
                  id: alias.id,
                  targetAliasId,
                  transactionIds: alias.transactionIds,
                  deletedAt: alias.deletedAt
              }
            : undefined;
    }
    if (targetAliasId != null || !("name" in alias) || !("symlinkIds" in alias)) return undefined;
    return {
        kind: "real",
        id: alias.id,
        name: alias.name,
        symlinkIds: alias.symlinkIds,
        transactionIds: alias.transactionIds,
        deletedAt: alias.deletedAt
    };
}

/** Convert the raw Mirror record into the only alias collection exposed to application consumers. */
export function toDescriptionAliasCollection(
    aliases: DescriptionAliasReadableCollection
): DescriptionAliasCollection {
    const legalEntries: Array<[string, DescriptionAlias | string]> = [];
    for (const [id, alias] of Object.entries(aliases)) {
        if (typeof alias === "string") {
            if (id === "$cid") legalEntries.push([id, alias]);
            continue;
        }
        const legal = toDescriptionAlias(alias);
        if (legal) legalEntries.push([id, legal]);
    }
    return Object.fromEntries(legalEntries);
}

export function getActiveDescriptionAliases(
    aliases: DescriptionAliasReadableCollection
): DescriptionAlias[] {
    return Object.values(toDescriptionAliasCollection(aliases)).filter(
        (alias): alias is DescriptionAlias => typeof alias === "object" && !alias.deletedAt
    );
}

export function getRealAliases(
    aliases: readonly DescriptionAliasReadable[]
): RealDescriptionAlias[] {
    return aliases
        .map(toDescriptionAlias)
        .filter((alias): alias is RealDescriptionAlias => alias?.kind === "real");
}

export function getActiveRealAliases(
    aliases: DescriptionAliasReadableCollection
): RealDescriptionAlias[] {
    return getRealAliases(getActiveDescriptionAliases(aliases));
}

/** Resolve with one source lookup and, for a symlink, one target lookup. */
export function resolveAlias(
    aliasId: string,
    aliases: DescriptionAliasReadableCollection
): RealDescriptionAlias | undefined {
    const sourceValue = aliases[aliasId];
    if (typeof sourceValue !== "object" || sourceValue == null) return undefined;
    const source = toDescriptionAlias(sourceValue);
    if (!source || source.deletedAt) return undefined;
    if (source.kind === "real") return source;

    const targetValue = aliases[source.targetAliasId];
    if (typeof targetValue !== "object" || targetValue == null) return undefined;
    const target = toDescriptionAlias(targetValue);
    return target?.kind === "real" && !target.deletedAt ? target : undefined;
}

function countObjectKeys(record: Readonly<Record<string, boolean | string>>): number {
    return Object.keys(record).filter((key) => key !== "$cid").length;
}

export function getAliasTotalTransactionCount(
    aliasId: string,
    aliases: DescriptionAliasReadableCollection
): number {
    const value = aliases[aliasId];
    if (typeof value !== "object" || value == null) return 0;
    const alias = toDescriptionAlias(value);
    if (!alias) return 0;
    let count = countObjectKeys(alias.transactionIds);
    if (alias.kind === "symlink") return count;
    for (const symlinkId of Object.keys(alias.symlinkIds).filter((key) => key !== "$cid")) {
        const symlinkValue = aliases[symlinkId];
        if (typeof symlinkValue !== "object" || symlinkValue == null) continue;
        const symlink = toDescriptionAlias(symlinkValue);
        if (symlink?.kind === "symlink" && !symlink.deletedAt) {
            count += countObjectKeys(symlink.transactionIds);
        }
    }
    return count;
}

export interface SymlinkMutation {
    readonly addSymlinksToTarget: string[];
    readonly repointerSymlinks: Array<{
        readonly symlinkId: string;
        readonly newTargetId: string;
    }>;
    readonly sourceBecomesSymlink: { readonly sourceId: string; readonly targetId: string };
    readonly clearSourceSymlinkIds: string[];
}

/** @deprecated P11A callers use the atomic CRDT change-all action. */
export function makeSymlinkMutations(
    sourceAliasId: string,
    targetAliasId: string,
    aliases: DescriptionAliasReadableCollection
): SymlinkMutation {
    const sourceValue = aliases[sourceAliasId];
    const source =
        typeof sourceValue === "object" && sourceValue != null
            ? toDescriptionAlias(sourceValue)
            : undefined;
    const existingSymlinkIds =
        source?.kind === "real"
            ? Object.keys(source.symlinkIds).filter((key) => key !== "$cid")
            : [];
    return {
        addSymlinksToTarget: [...existingSymlinkIds, sourceAliasId],
        repointerSymlinks: existingSymlinkIds.map((symlinkId) => ({
            symlinkId,
            newTargetId: targetAliasId
        })),
        sourceBecomesSymlink: { sourceId: sourceAliasId, targetId: targetAliasId },
        clearSourceSymlinkIds: existingSymlinkIds
    };
}
