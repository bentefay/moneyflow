import { normalizeDescriptionAliasName } from "@/lib/crdt/description-aliases";
import {
    getAliasTotalTransactionCount,
    resolveAlias,
    type DescriptionAliasCollection,
    type RealDescriptionAlias
} from "@/lib/domain/description-aliases";

export type DescriptionAliasTargetIntent =
    | { readonly kind: "existing"; readonly aliasId: string }
    | { readonly kind: "new"; readonly name: string };

export type DescriptionAliasCommitIntent =
    | { readonly kind: "none" }
    | { readonly kind: "assign"; readonly target: DescriptionAliasTargetIntent }
    | { readonly kind: "rename-one"; readonly aliasId: string; readonly name: string }
    | { readonly kind: "change-one"; readonly target: DescriptionAliasTargetIntent }
    | { readonly kind: "remove-one" }
    | { readonly kind: "confirm-change"; readonly target: DescriptionAliasTargetIntent }
    | { readonly kind: "confirm-remove" };

export interface PlanDescriptionAliasCommitInput {
    readonly aliases: DescriptionAliasCollection;
    readonly currentAliasId?: string;
    readonly text: string;
}

function findExactAliasId(
    aliases: DescriptionAliasCollection,
    normalizedName: string
): string | undefined {
    return Object.values(aliases)
        .filter(
            (alias): alias is RealDescriptionAlias =>
                typeof alias === "object" &&
                alias.kind === "real" &&
                !alias.deletedAt &&
                normalizeDescriptionAliasName(alias.name) === normalizedName
        )
        .sort((left, right) => left.id.localeCompare(right.id))[0]?.id;
}

/** Translate edited cell text into one explicit P11A action path without performing a write. */
export function planDescriptionAliasCommit({
    aliases,
    currentAliasId,
    text
}: PlanDescriptionAliasCommitInput): DescriptionAliasCommitIntent {
    const normalizedName = normalizeDescriptionAliasName(text);
    if (!currentAliasId) {
        if (!normalizedName) return { kind: "none" };
        const exactAliasId = findExactAliasId(aliases, normalizedName);
        return {
            kind: "assign",
            target: exactAliasId
                ? { kind: "existing", aliasId: exactAliasId }
                : { kind: "new", name: normalizedName }
        };
    }

    const resolvedCurrent = resolveAlias(currentAliasId, aliases);
    if (!resolvedCurrent) return { kind: "none" };
    const totalTransactions = getAliasTotalTransactionCount(resolvedCurrent.id, aliases);
    if (!normalizedName) {
        return totalTransactions > 1 ? { kind: "confirm-remove" } : { kind: "remove-one" };
    }
    if (normalizeDescriptionAliasName(resolvedCurrent.name) === normalizedName) {
        return { kind: "none" };
    }

    const exactAliasId = findExactAliasId(aliases, normalizedName);
    const target: DescriptionAliasTargetIntent = exactAliasId
        ? { kind: "existing", aliasId: exactAliasId }
        : { kind: "new", name: normalizedName };
    if (totalTransactions > 1) return { kind: "confirm-change", target };
    if (target.kind === "existing") return { kind: "change-one", target };
    return { kind: "rename-one", aliasId: resolvedCurrent.id, name: normalizedName };
}
