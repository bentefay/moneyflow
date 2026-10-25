"use client";

/**
 * The shared rule editor's option lists, projected once from the active vault records so the
 * Automations page and the transaction inspector offer the same choices.
 */

import { useMemo } from "react";

import {
    useActiveAccounts,
    useActiveDescriptionAliases,
    useActivePeople,
    useActiveTags
} from "@/lib/crdt";

import { projectRuleEditorOptions, type RuleEditorOptions } from "./rule-editor-data";

export function useRuleEditorOptions(): RuleEditorOptions {
    const accounts = useActiveAccounts();
    const tags = useActiveTags();
    const people = useActivePeople();
    const aliases = useActiveDescriptionAliases();
    return useMemo(
        () => projectRuleEditorOptions({ accounts, tags, people, aliases }),
        [accounts, aliases, people, tags]
    );
}
