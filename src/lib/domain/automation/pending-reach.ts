import { assertNever } from "@/lib/utils/exhaustive";

import {
    selectWinningRule,
    type FieldRule,
    type RuleField,
    type RuleMatchSubject,
    type RuleReach,
    type RuleReachKind
} from "./rules";

export type PendingReachAction =
    | { readonly kind: "keep" }
    | { readonly kind: "update"; readonly host: FieldRule }
    | {
          readonly kind: "widen";
          readonly reach: Exclude<RuleReach, { readonly kind: "transactions" }>;
      };

/** All edits the winning wide version; from starts a version at the edited row's date. */
export function pendingReachAction(
    rules: readonly FieldRule[],
    field: RuleField,
    subject: RuleMatchSubject,
    choice: RuleReachKind
): PendingReachAction {
    switch (choice) {
        case "transactions":
            return { kind: "keep" };
        case "from":
            return { kind: "widen", reach: { kind: "from", date: subject.date } };
        case "all": {
            const host = selectWinningRule(
                rules.filter((rule) => rule.reach.kind !== "transactions"),
                field,
                subject
            );
            return host == null
                ? { kind: "widen", reach: { kind: "all" } }
                : { kind: "update", host };
        }
        default:
            return assertNever(choice);
    }
}
