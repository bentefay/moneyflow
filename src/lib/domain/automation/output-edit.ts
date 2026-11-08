import { assertNever } from "@/lib/utils/exhaustive";

import type { RuleField, RuleOutputsInput, RuleOutputEntry } from "./rules";

type Output<F extends RuleField> = NonNullable<RuleOutputsInput<number>[F]>;

export interface RuleOutputEdit<F extends RuleField> {
    readonly value: Output<F>;
    readonly added: readonly string[];
    readonly removed: readonly string[];
}

export type FieldRuleEdit = {
    readonly [F in RuleField]: { readonly field: F; readonly edit: RuleOutputEdit<F> };
}[RuleField];

const transforms: {
    readonly [F in RuleField]: (base: Output<F> | undefined, edit: RuleOutputEdit<F>) => Output<F>;
} = {
    descriptionAlias: (_base, edit) => edit.value,
    allocation: (_base, edit) => edit.value,
    tags: (base, edit) =>
        base == null
            ? { mode: "add", tagIds: [...edit.value.tagIds] }
            : {
                  mode: base.mode,
                  tagIds: [
                      ...new Set([
                          ...base.tagIds.filter((id) => !edit.removed.includes(id)),
                          ...edit.added
                      ])
                  ]
              }
};

/** Copy the governing output and apply only the edit, preserving tag mode. */
export function transformRuleOutput<F extends RuleField>(
    field: F,
    base: Output<F> | undefined,
    edit: RuleOutputEdit<F>
): Output<F> {
    return transforms[field](base, edit);
}

export function transformFieldRuleEdit(
    base: RuleOutputsInput<number>,
    change: FieldRuleEdit
): RuleOutputEntry<RuleOutputsInput<number>> {
    switch (change.field) {
        case "descriptionAlias":
            return {
                field: change.field,
                output: transformRuleOutput(change.field, base.descriptionAlias, change.edit)
            };
        case "tags":
            return {
                field: change.field,
                output: transformRuleOutput(change.field, base.tags, change.edit)
            };
        case "allocation":
            return {
                field: change.field,
                output: transformRuleOutput(change.field, base.allocation, change.edit)
            };
        default:
            return assertNever(change);
    }
}
