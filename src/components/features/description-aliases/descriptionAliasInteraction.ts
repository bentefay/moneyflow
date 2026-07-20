import {
    normalizeDescriptionAliasName,
    type DescriptionAliasLookup
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
    readonly lookup: DescriptionAliasLookup;
    readonly currentAliasId?: string;
    readonly text: string;
}

/** Translate edited cell text into one explicit P11A action path without performing a write. */
export function planDescriptionAliasCommit({
    lookup,
    currentAliasId,
    text
}: PlanDescriptionAliasCommitInput): DescriptionAliasCommitIntent {
    const normalizedName = normalizeDescriptionAliasName(text);
    if (!currentAliasId) {
        if (!normalizedName) return { kind: "none" };
        const exactAliasId = lookup.findExactAliasId(normalizedName);
        return {
            kind: "assign",
            target: exactAliasId
                ? { kind: "existing", aliasId: exactAliasId }
                : { kind: "new", name: normalizedName }
        };
    }

    const resolvedCurrent = lookup.resolve(currentAliasId);
    if (!resolvedCurrent) return { kind: "none" };
    const totalTransactions = lookup.getTotalTransactionCount(resolvedCurrent.id);
    if (!normalizedName) {
        return totalTransactions > 1 ? { kind: "confirm-remove" } : { kind: "remove-one" };
    }
    if (normalizeDescriptionAliasName(resolvedCurrent.name) === normalizedName) {
        return { kind: "none" };
    }

    const exactAliasId = lookup.findExactAliasId(normalizedName);
    const target: DescriptionAliasTargetIntent = exactAliasId
        ? { kind: "existing", aliasId: exactAliasId }
        : { kind: "new", name: normalizedName };
    if (totalTransactions > 1) return { kind: "confirm-change", target };
    if (target.kind === "existing") return { kind: "change-one", target };
    return { kind: "rename-one", aliasId: resolvedCurrent.id, name: normalizedName };
}
