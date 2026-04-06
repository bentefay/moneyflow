/**
 * Description Alias Utilities
 *
 * Pure functions for working with description aliases.
 * Aliases can be "real" (no targetAliasId) or "symlinks" (point to a real alias).
 * Symlinks are one-hop only — a symlink never points to another symlink.
 */

/**
 * Minimal alias interface for domain operations.
 * Compatible with both the full CRDT DescriptionAlias type and simpler test types.
 */
export interface DescriptionAliasLike {
    id: string;
    name: string;
    targetAliasId?: string;
    symlinkIds: Record<string, boolean | string>;
    transactionIds: Record<string, boolean | string>;
    deletedAt?: unknown;
}

/**
 * Filter out deleted aliases from a collection.
 * Also filters out non-object values (loro-mirror may include $cid strings).
 */
export function getActiveDescriptionAliases<T extends DescriptionAliasLike>(
    aliases: Record<string, T | string>
): T[] {
    return Object.values(aliases)
        .filter((item): item is T => typeof item === "object" && item !== null)
        .filter((item) => !item.deletedAt);
}

/**
 * Filter aliases to only real aliases (not symlinks).
 * A real alias has no targetAliasId.
 */
export function getRealAliases<T extends DescriptionAliasLike>(aliases: T[]): T[] {
    return aliases.filter((a) => !a.targetAliasId);
}

/**
 * Get active, real aliases from a collection.
 * Combines getActiveDescriptionAliases and getRealAliases.
 */
export function getActiveRealAliases<T extends DescriptionAliasLike>(
    aliases: Record<string, T | string>
): T[] {
    return getRealAliases(getActiveDescriptionAliases(aliases));
}

/**
 * Resolve an alias ID to its real alias.
 * If the alias is a symlink, return the target. If deleted or missing, return undefined.
 * One hop max — symlinks never chain.
 */
export function resolveAlias<T extends DescriptionAliasLike>(
    aliasId: string,
    aliases: Record<string, T | string>
): T | undefined {
    const alias = aliases[aliasId];
    if (typeof alias !== "object" || alias === null) return undefined;
    if (alias.deletedAt) return undefined;

    // If it's a symlink, follow one hop
    if (alias.targetAliasId) {
        const target = aliases[alias.targetAliasId];
        if (typeof target !== "object" || target === null) return undefined;
        if (target.deletedAt) return undefined;
        return target;
    }

    return alias;
}

/**
 * Count total transactions across an alias and all its symlinks.
 */
function countObjectKeys(record: Record<string, boolean | string>): number {
    return Object.keys(record).filter((k) => k !== "$cid").length;
}

export function getAliasTotalTransactionCount<T extends DescriptionAliasLike>(
    aliasId: string,
    aliases: Record<string, T | string>
): number {
    const alias = aliases[aliasId];
    if (typeof alias !== "object" || alias === null) return 0;

    let count = countObjectKeys(alias.transactionIds);

    // Add transactions from all symlinks pointing to this alias
    const symlinkIdKeys = Object.keys(alias.symlinkIds).filter((k) => k !== "$cid");
    for (const symlinkId of symlinkIdKeys) {
        const symlink = aliases[symlinkId];
        if (typeof symlink === "object" && symlink !== null) {
            count += countObjectKeys(symlink.transactionIds);
        }
    }

    return count;
}

/**
 * Describes the mutations needed to make one alias a symlink to another.
 * Pure function — does not mutate. The caller applies mutations via draft.
 */
export interface SymlinkMutation {
    /** Symlink IDs to add to the target alias's symlinkIds */
    addSymlinksToTarget: string[];
    /** Symlink IDs to remove from the source alias's symlinkIds (repoint them to target) */
    repointerSymlinks: Array<{ symlinkId: string; newTargetId: string }>;
    /** The source alias itself becomes a symlink to target */
    sourceBecomesSymlink: { sourceId: string; targetId: string };
    /** Backlinks to clear from the source alias's symlinkIds */
    clearSourceSymlinkIds: string[];
}

export function makeSymlinkMutations<T extends DescriptionAliasLike>(
    sourceAliasId: string,
    targetAliasId: string,
    aliases: Record<string, T | string>
): SymlinkMutation {
    const source = aliases[sourceAliasId];
    const existingSymlinkIds: string[] =
        typeof source === "object" && source !== null
            ? Object.keys(source.symlinkIds).filter((k) => k !== "$cid")
            : [];

    // All symlinks currently pointing at source need to repoint to target
    const repointerSymlinks = existingSymlinkIds.map((symlinkId) => ({
        symlinkId,
        newTargetId: targetAliasId
    }));

    // Source's existing symlinks + source itself become symlinks to target
    const addSymlinksToTarget = [...existingSymlinkIds, sourceAliasId];

    return {
        addSymlinksToTarget,
        repointerSymlinks,
        sourceBecomesSymlink: { sourceId: sourceAliasId, targetId: targetAliasId },
        clearSourceSymlinkIds: existingSymlinkIds
    };
}
