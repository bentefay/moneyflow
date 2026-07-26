/**
 * Production import-commit updater (P14 batch insert + HS-007/P17A field-rule application).
 *
 * This is the single seam a user's committed import runs through. It is a pure draft-style updater
 * over the full {@link VaultState}: it creates the import record, inserts every imported transaction
 * (preserving the P14 suspected-duplicate nesting), and then applies the winning field rule to each
 * imported transaction via {@link applyFieldRulesToImport}.
 *
 * Rule application is deliberately the last step, after all rows exist, so the highest-precedence
 * rule is chosen against the committed batch. It is additive to P14 (no existing insert behaviour
 * changes), bounded (one pass per imported transaction), idempotent and convergent (re-running the
 * same batch and rules yields the same state). Callers invoke it inside ONE vault action so the
 * insert and the rule application share a single undo group (P09).
 *
 * The write boundaries are unchanged: tags go through `updateTransaction`, allocations EXCLUSIVELY
 * through P16C `replaceTransactionAllocations`, and description aliases EXCLUSIVELY through the P11
 * `assignDescriptionAlias` path — all inside {@link applyFieldRulesToImport}. This module never
 * writes an allocation key or an alias record directly.
 */

import { Temporal } from "temporal-polyfill";

import { type MoneyMinorUnits } from "@/lib/domain/currency";

import { applyFieldRulesToImport, type BulkFieldRuleEntry } from "./field-rules";
import {
    type InsertTransactionInput,
    insertTransaction,
    type TransactionLocation
} from "./mutations";
import { findTransactionById } from "./queries";
import { type ImportInput, type VaultState } from "./schema";

/** One imported row, already parsed/mapped by the import pipeline. */
export interface ImportBatchTransactionInput {
    readonly id: string;
    readonly date: Temporal.PlainDate;
    readonly description: string;
    readonly amount: MoneyMinorUnits;
    readonly accountId: string;
    readonly statusId: string;
    readonly importRowIndex: number;
    /** Id of an existing transaction this row is a suspected duplicate of, if any. */
    readonly duplicateOf: string | null;
}

export interface CommitImportBatchInput {
    readonly importId: string;
    readonly fileName: string;
    readonly creationInstant: Temporal.Instant;
    readonly transactions: readonly ImportBatchTransactionInput[];
}

function suspectedDuplicateLocation(
    state: VaultState,
    duplicateOf: string | null
): TransactionLocation | undefined {
    if (duplicateOf == null) return undefined;
    const parent = findTransactionById(state.transactions, duplicateOf);
    if (!parent) return undefined;
    return {
        accountId: parent.transaction.accountId,
        date: parent.transaction.date,
        transactionId: parent.transaction.id
    };
}

/**
 * Commit an import batch and apply active field rules to it, in place on the full vault draft.
 * Returns the per-transaction rule-application outcomes (empty when no rule matched or exists).
 */
export function commitImportBatch(
    state: VaultState,
    data: CommitImportBatchInput
): readonly BulkFieldRuleEntry[] {
    // Write the import record through the input-typed view of the record so a plain (unbranded)
    // input object slots in without an unsafe cast (same technique as the field-rule migration).
    const importsDraft: Record<string, ImportInput> = state.imports;
    importsDraft[data.importId] = {
        id: data.importId,
        filename: data.fileName,
        transactionCount: data.transactions.length,
        createdAt: data.creationInstant,
        deletedAt: undefined
    };

    for (const tx of data.transactions) {
        const transaction: InsertTransactionInput["transaction"] = {
            id: tx.id,
            date: tx.date,
            description: tx.description,
            descriptionAliasId: undefined,
            notes: "",
            amount: tx.amount,
            originalAmount: undefined,
            accountId: tx.accountId,
            tagIds: [],
            statusId: tx.statusId,
            importId: data.importId,
            allocations: {},
            creationInstant: data.creationInstant,
            importRowIndex: tx.importRowIndex,
            deletedAt: undefined
        };
        insertTransaction(state.transactions, {
            transaction,
            suspectedDuplicateOf: suspectedDuplicateLocation(state, tx.duplicateOf)
        });
    }

    // Apply the highest-precedence field rule to each freshly imported transaction. Description
    // aliases route through the P11 boundary inside this call, which needs the full VaultState.
    return applyFieldRulesToImport(state, { importId: data.importId });
}
