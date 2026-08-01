/** Pure legal-state utilities for curated transaction description aliases. */

/** Q-016 exact matching is trim + Unicode NFC and remains case-sensitive. */
export function normalizeDescriptionAliasName(name: string): string {
    return name.trim().normalize("NFC");
}

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

/**
 * Maps an alias id to the display name shown for it, following the one-hop symlink relationship.
 * Injected into pure consumers so they can read displayed description text without a React scope.
 */
export type DescriptionAliasNameResolver = (aliasId: string) => string | undefined;

export interface DescriptionAliasLookupStatistics {
    readonly sourceEntryCount: number;
    readonly activeAliasCount: number;
    readonly activeRealAliasCount: number;
    readonly backlinkVisitCount: number;
}

/** Stable read index built once per alias collection and reused by every visible transaction row. */
export interface DescriptionAliasLookup {
    readonly activeRealAliases: readonly RealDescriptionAlias[];
    readonly statistics: DescriptionAliasLookupStatistics;
    readonly resolve: (aliasId: string) => RealDescriptionAlias | undefined;
    readonly findExactAliasId: (normalizedName: string) => string | undefined;
    readonly getTotalTransactionCount: (aliasId: string) => number;
}

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

function recordEntryCount(record: Readonly<Record<string, boolean | string>>): number {
    return Object.keys(record).filter((key) => key !== "$cid").length;
}

/**
 * Build all alias read structures in one bounded pass plus declared real-alias backlinks.
 * Subsequent resolution, exact matching and complete group counts are O(1).
 */
export function createDescriptionAliasLookup(
    aliases: DescriptionAliasReadableCollection
): DescriptionAliasLookup {
    const legalActiveById = new Map<string, DescriptionAlias>();
    const activeRealAliases: RealDescriptionAlias[] = [];
    const exactAliasIds = new Map<string, string>();

    for (const [id, value] of Object.entries(aliases)) {
        if (typeof value !== "object" || value == null) continue;
        const alias = toDescriptionAlias(value);
        if (!alias || alias.deletedAt) continue;
        legalActiveById.set(id, alias);
        if (alias.kind !== "real") continue;
        activeRealAliases.push(alias);
        const normalizedName = normalizeDescriptionAliasName(alias.name);
        const existingId = exactAliasIds.get(normalizedName);
        if (existingId == null || id.localeCompare(existingId) < 0) {
            exactAliasIds.set(normalizedName, id);
        }
    }

    const resolvedByAliasId = new Map<string, RealDescriptionAlias>();
    const totalTransactionCountByRealId = new Map<string, number>();
    let backlinkVisitCount = 0;
    for (const alias of activeRealAliases) {
        resolvedByAliasId.set(alias.id, alias);
        let transactionCount = recordEntryCount(alias.transactionIds);
        for (const symlinkId of Object.keys(alias.symlinkIds).filter((key) => key !== "$cid")) {
            backlinkVisitCount += 1;
            const symlink = legalActiveById.get(symlinkId);
            if (symlink?.kind !== "symlink" || symlink.targetAliasId !== alias.id) continue;
            resolvedByAliasId.set(symlink.id, alias);
            transactionCount += recordEntryCount(symlink.transactionIds);
        }
        totalTransactionCountByRealId.set(alias.id, transactionCount);
    }

    return {
        activeRealAliases,
        statistics: {
            sourceEntryCount: Object.keys(aliases).filter((key) => key !== "$cid").length,
            activeAliasCount: legalActiveById.size,
            activeRealAliasCount: activeRealAliases.length,
            backlinkVisitCount
        },
        resolve: (aliasId) => resolvedByAliasId.get(aliasId),
        findExactAliasId: (normalizedName) => exactAliasIds.get(normalizedName),
        getTotalTransactionCount: (aliasId) => {
            const resolved = resolvedByAliasId.get(aliasId);
            return resolved ? (totalTransactionCountByRealId.get(resolved.id) ?? 0) : 0;
        }
    };
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

export function getAliasTotalTransactionCount(
    aliasId: string,
    aliases: DescriptionAliasReadableCollection
): number {
    const value = aliases[aliasId];
    if (typeof value !== "object" || value == null) return 0;
    const alias = toDescriptionAlias(value);
    if (!alias) return 0;
    let count = recordEntryCount(alias.transactionIds);
    if (alias.kind === "symlink") return count;
    for (const symlinkId of Object.keys(alias.symlinkIds).filter((key) => key !== "$cid")) {
        const symlinkValue = aliases[symlinkId];
        if (typeof symlinkValue !== "object" || symlinkValue == null) continue;
        const symlink = toDescriptionAlias(symlinkValue);
        if (symlink?.kind === "symlink" && !symlink.deletedAt) {
            count += recordEntryCount(symlink.transactionIds);
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
