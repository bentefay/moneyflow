/**
 * Automation Components
 *
 * Components for managing transaction automations.
 */

export {
    ACTION_TYPES,
    type ActionData,
    ActionEditor,
    type ActionEditorProps
} from "./ActionEditor";
export { AutomationRow, type AutomationRowProps } from "./AutomationRow";
export { AutomationsTable } from "./AutomationsTable";
export {
    CONDITION_COLUMNS,
    CONDITION_OPERATORS,
    type ConditionData,
    ConditionEditor,
    type ConditionEditorProps
} from "./ConditionEditor";
// HS-007 / P17B: shared field-rule editor + reworked automations page manager.
export {
    FieldRuleEditor,
    type FieldRuleEditorProps,
    type RuleEditorOption
} from "./FieldRuleEditor";
export { FieldRulesManager } from "./FieldRulesManager";
export {
    APPLY_MODES,
    type ApplyMode,
    applyModeIsAutomatic,
    applyModeLabel,
    applyModeTargetsNewOnly,
    emptyRuleDraft,
    type ResolvedRuleWrite,
    type RuleEditorDraft,
    type RuleEditorFieldErrors,
    type RuleEditorValidation,
    validateRuleDraft
} from "./rule-editor-model";
