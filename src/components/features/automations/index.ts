/**
 * Automation Components
 *
 * The shared rule editor and the Automations page manager.
 */

export { FieldRulesManager, type FieldRulesManagerProps } from "./FieldRulesManager";
export {
    type RuleEditorOption,
    type RuleEditorOptions,
    draftFromProposal,
    draftFromRule,
    mutationErrorToFieldErrors,
    type RuleProposalSeed
} from "./rule-editor-data";
export {
    addDraftOutput,
    type ApplyScope,
    emptyRuleDraft,
    type ResolvedRuleWrite,
    type RuleEditorDraft,
    type RuleEditorFieldErrors,
    type RuleEditorValidation,
    validateRuleDraft
} from "./rule-editor-model";
export {
    RuleEditor,
    type RuleEditorDivergence,
    type RuleEditorProps,
    type RuleEditorResolution,
    type RuleEditorSplitPreview,
    type RuleEditorTitle,
    type RuleEditorTransaction
} from "./RuleEditor";
export { useRuleEditorOptions } from "./use-rule-editor-options";
