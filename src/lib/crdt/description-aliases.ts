/**
 * Atomic description-alias mutations.
 *
 * Every exported mutation validates its complete input before changing the Mirror draft. Callers
 * must invoke exactly one function inside one `setState` call so forward and reverse references
 * are committed and undone together.
 */

import { Temporal } from "temporal-polyfill";

import { normalizeDescriptionAliasName } from "@/lib/domain/description-aliases";

export { normalizeDescriptionAliasName } from "@/lib/domain/description-aliases";

import {
    deleteTransaction,
    deleteTransactionsByImport,
    findTransactionInStore,
    findTransactionsInStore,
    type DeleteTransactionInput,
    type InsertTransactionInput,
    insertTransaction,
    type TransactionLocation,
    type UpdateTransactionInput,
    updateTransaction
} from "./mutations";
import type { DescriptionAliasWire, NestedDuplicate, Transaction, VaultState } from "./schema";

export type DescriptionAliasMutationErrorCode =
    | "alias-id-conflict"
    | "alias-not-found"
    | "alias-not-real"
    | "deleted-alias"
    | "duplicate-name"
    | "empty-name"
    | "invalid-symlink-backlink"
    | "invalid-transaction-allocations"
    | "same-alias"
    | "stale-alias"
    | "transaction-id-conflict"
    | "transaction-not-found";

export interface DescriptionAliasMutationError {
    readonly code: DescriptionAliasMutationErrorCode;
    readonly message: string;
}

export type DescriptionAliasMutationResult<Value = undefined> =
    | { readonly ok: true; readonly value: Value }
    | { readonly ok: false; readonly error: DescriptionAliasMutationError };

export type DescriptionAliasTarget =
    | { readonly kind: "existing"; readonly aliasId: string }
    | { readonly kind: "new"; readonly aliasId: string; readonly name: string };

export interface AssignDescriptionAliasInput {
    readonly location: TransactionLocation;
    readonly aliasId: string;
}

export interface CreateAndAssignDescriptionAliasInput {
    readonly location: TransactionLocation;
    readonly aliasId: string;
    readonly name: string;
}

export interface AssignDescriptionAliasByExactNameInput {
    readonly location: TransactionLocation;
    readonly newAliasId: string;
    readonly name: string;
}

export interface InsertManualDescriptionAliasedTransactionInput {
    readonly transaction: Omit<
        InsertTransactionInput["transaction"],
        "description" | "descriptionAliasId" | "importId" | "originalAmount"
    >;
    readonly newAliasId: string;
    readonly name: string;
}

export interface ChangeOneDescriptionAliasInput {
    readonly location: TransactionLocation;
    readonly expectedAliasId: string;
    readonly target: DescriptionAliasTarget;
}

export interface ChangeAllDescriptionAliasesInput {
    readonly sourceAliasId: string;
    readonly target: DescriptionAliasTarget;
}

export interface RemoveOneDescriptionAliasInput {
    readonly location: TransactionLocation;
    readonly expectedAliasId: string;
}

export type DescriptionAliasMaintenanceReference =
    | {
          readonly kind: "parent";
          readonly accountId: string;
          readonly yearIndex: number;
          readonly monthIndex: number;
          readonly dayIndex: number;
          readonly transactionCid: string;
          readonly transactionId: string;
          readonly transactionIndex: number;
      }
    | {
          readonly kind: "nested";
          readonly accountId: string;
          readonly yearIndex: number;
          readonly monthIndex: number;
          readonly dayIndex: number;
          readonly parentTransactionCid: string;
          readonly transactionCid: string;
          readonly transactionId: string;
          readonly transactionIndex: number;
          readonly nestedIndex: number;
      };

export interface RewriteDescriptionAliasMaintenanceReferenceInput {
    readonly reference: DescriptionAliasMaintenanceReference;
    readonly sourceAliasId: string;
    readonly targetAliasId: string;
}

function ok<Value>(value: Value): DescriptionAliasMutationResult<Value> {
    return { ok: true, value };
}

function err(
    code: DescriptionAliasMutationErrorCode,
    message: string
): DescriptionAliasMutationResult<never> {
    return { ok: false, error: { code, message } };
}

function getAlias(state: VaultState, aliasId: string): DescriptionAliasWire | undefined {
    const alias = state.descriptionAliases[aliasId];
    return typeof alias === "object" && alias != null ? alias : undefined;
}

function getActiveAlias(
    state: VaultState,
    aliasId: string
): DescriptionAliasMutationResult<DescriptionAliasWire> {
    const alias = getAlias(state, aliasId);
    if (!alias) return err("alias-not-found", `Alias ${aliasId} does not exist`);
    if (alias.deletedAt) return err("deleted-alias", `Alias ${aliasId} is deleted`);
    return ok(alias);
}

function getFinalRealAlias(
    state: VaultState,
    aliasId: string
): DescriptionAliasMutationResult<DescriptionAliasWire> {
    const sourceResult = getActiveAlias(state, aliasId);
    if (!sourceResult.ok) return sourceResult;
    const source = sourceResult.value;
    if (source.kind === "real") return sourceResult;
    if (!source.targetAliasId) {
        return err("alias-not-real", `Symlink ${aliasId} has no target`);
    }

    const targetResult = getActiveAlias(state, source.targetAliasId);
    if (!targetResult.ok) return targetResult;
    if (targetResult.value.kind !== "real") {
        return err("alias-not-real", `Alias ${aliasId} does not resolve in one hop`);
    }
    return targetResult;
}

function addRealAlias(state: VaultState, aliasId: string, normalizedName: string): void {
    Object.assign(state.descriptionAliases, {
        [aliasId]: {
            id: aliasId,
            kind: "real",
            name: normalizedName,
            targetAliasId: undefined,
            symlinkIds: {},
            transactionIds: {},
            deletedAt: undefined
        }
    });
}

function clearReferenceMap(referenceMap: Record<string, boolean>): void {
    for (const id of Object.keys(referenceMap)) {
        if (id !== "$cid") delete referenceMap[id];
    }
}

function moveTransactionReference(
    transaction: Transaction | NestedDuplicate,
    state: VaultState,
    targetAlias: DescriptionAliasWire
): void {
    const currentAliasId = transaction.descriptionAliasId;
    if (currentAliasId) {
        const currentAlias = getAlias(state, currentAliasId);
        if (currentAlias) delete currentAlias.transactionIds[transaction.id];
    }
    transaction.descriptionAliasId = targetAlias.id;
    targetAlias.transactionIds[transaction.id] = true;
}

function findMaintenanceReference(
    state: VaultState,
    reference: DescriptionAliasMaintenanceReference
): Transaction | NestedDuplicate | undefined {
    const tree = state.transactions[reference.accountId];
    if (typeof tree !== "object" || tree == null) return undefined;
    const year = tree.years[reference.yearIndex];
    const month = year?.months[reference.monthIndex];
    const day = month?.days[reference.dayIndex];
    if (!day) return undefined;

    if (reference.kind === "parent") {
        const candidate = day.transactions[reference.transactionIndex];
        return candidate?.$cid === reference.transactionCid &&
            candidate.id === reference.transactionId
            ? candidate
            : undefined;
    }

    const parent = day.transactions[reference.transactionIndex];
    if (!parent || parent.$cid !== reference.parentTransactionCid) return undefined;
    const candidate = parent.suspectedDuplicates[reference.nestedIndex];
    return candidate?.$cid === reference.transactionCid && candidate.id === reference.transactionId
        ? candidate
        : undefined;
}

/** Rewrite one still-current direct symlink reference and both exact reverse maps. */
export function rewriteDescriptionAliasMaintenanceReference(
    state: VaultState,
    input: RewriteDescriptionAliasMaintenanceReferenceInput
): boolean {
    const transaction = findMaintenanceReference(state, input.reference);
    if (!transaction || transaction.descriptionAliasId !== input.sourceAliasId) return false;
    const source = getAlias(state, input.sourceAliasId);
    const target = getAlias(state, input.targetAliasId);
    if (
        !source ||
        source.deletedAt != null ||
        source.kind !== "symlink" ||
        source.targetAliasId !== input.targetAliasId ||
        !target ||
        target.deletedAt != null ||
        target.kind !== "real"
    ) {
        return false;
    }

    delete source.transactionIds[transaction.id];
    transaction.descriptionAliasId = target.id;
    target.transactionIds[transaction.id] = true;
    return true;
}

/** Apply a graph proof completed immediately beforehand by bounded maintenance discovery. */
export function hardDeleteProvenDescriptionAliasSymlink(
    state: VaultState,
    input: { readonly symlinkId: string; readonly targetAliasId: string }
): boolean {
    const symlink = getAlias(state, input.symlinkId);
    const target = getAlias(state, input.targetAliasId);
    if (
        !symlink ||
        symlink.deletedAt != null ||
        symlink.kind !== "symlink" ||
        symlink.targetAliasId !== input.targetAliasId ||
        !target ||
        target.deletedAt != null ||
        target.kind !== "real" ||
        !target.symlinkIds[symlink.id]
    ) {
        return false;
    }
    delete target.symlinkIds[symlink.id];
    delete state.descriptionAliases[symlink.id];
    return true;
}

function prepareTarget(
    state: VaultState,
    target: DescriptionAliasTarget
):
    | DescriptionAliasMutationResult<{
          readonly aliasId: string;
          readonly createName?: string;
      }>
    | DescriptionAliasMutationResult<never> {
    if (target.kind === "existing") {
        const targetResult = getFinalRealAlias(state, target.aliasId);
        if (!targetResult.ok) return targetResult;
        return ok({ aliasId: targetResult.value.id });
    }

    const normalizedName = normalizeDescriptionAliasName(target.name);
    if (!normalizedName) return err("empty-name", "Alias names cannot be empty");
    if (getAlias(state, target.aliasId)) {
        return err("alias-id-conflict", `Alias ${target.aliasId} already exists`);
    }
    if (findDescriptionAliasByExactName(state, normalizedName)) {
        return err("duplicate-name", `An alias named ${normalizedName} already exists`);
    }
    return ok({ aliasId: target.aliasId, createName: normalizedName });
}

function materializeTarget(
    state: VaultState,
    target: { readonly aliasId: string; readonly createName?: string }
): DescriptionAliasWire {
    if (target.createName) addRealAlias(state, target.aliasId, target.createName);
    const alias = getAlias(state, target.aliasId);
    if (!alias) throw new Error("Validated alias target was not materialized");
    return alias;
}

export function createDescriptionAlias(
    state: VaultState,
    input: { readonly aliasId: string; readonly name: string }
): DescriptionAliasMutationResult<string> {
    const normalizedName = normalizeDescriptionAliasName(input.name);
    if (!normalizedName) return err("empty-name", "Alias names cannot be empty");
    if (getAlias(state, input.aliasId)) {
        return err("alias-id-conflict", `Alias ${input.aliasId} already exists`);
    }
    if (findDescriptionAliasByExactName(state, normalizedName)) {
        return err("duplicate-name", `An alias named ${normalizedName} already exists`);
    }
    addRealAlias(state, input.aliasId, normalizedName);
    return ok(input.aliasId);
}

export function assignDescriptionAlias(
    state: VaultState,
    input: AssignDescriptionAliasInput
): DescriptionAliasMutationResult<string> {
    const transactions = findTransactionsInStore(state.transactions, input.location);
    if (!transactions.length) return err("transaction-not-found", "Transaction does not exist");
    const aliasResult = getFinalRealAlias(state, input.aliasId);
    if (!aliasResult.ok) return aliasResult;
    for (const transaction of transactions) {
        moveTransactionReference(transaction, state, aliasResult.value);
    }
    return ok(aliasResult.value.id);
}

export function createAndAssignDescriptionAlias(
    state: VaultState,
    input: CreateAndAssignDescriptionAliasInput
): DescriptionAliasMutationResult<string> {
    const transactions = findTransactionsInStore(state.transactions, input.location);
    if (!transactions.length) return err("transaction-not-found", "Transaction does not exist");
    const normalizedName = normalizeDescriptionAliasName(input.name);
    if (!normalizedName) return err("empty-name", "Alias names cannot be empty");
    if (getAlias(state, input.aliasId)) {
        return err("alias-id-conflict", `Alias ${input.aliasId} already exists`);
    }
    if (findDescriptionAliasByExactName(state, normalizedName)) {
        return err("duplicate-name", `An alias named ${normalizedName} already exists`);
    }

    addRealAlias(state, input.aliasId, normalizedName);
    const alias = getAlias(state, input.aliasId);
    if (!alias) throw new Error("Created alias is missing from the draft");
    for (const transaction of transactions) moveTransactionReference(transaction, state, alias);
    return ok(alias.id);
}

export function findDescriptionAliasByExactName(
    state: VaultState,
    name: string
): DescriptionAliasWire | undefined {
    const normalizedName = normalizeDescriptionAliasName(name);
    if (!normalizedName) return undefined;
    return Object.values(state.descriptionAliases)
        .filter(
            (alias): alias is DescriptionAliasWire =>
                typeof alias === "object" &&
                alias != null &&
                !alias.deletedAt &&
                alias.kind === "real" &&
                normalizeDescriptionAliasName(alias.name) === normalizedName
        )
        .sort((left, right) => left.id.localeCompare(right.id))[0];
}

export function assignDescriptionAliasByExactName(
    state: VaultState,
    input: AssignDescriptionAliasByExactNameInput
): DescriptionAliasMutationResult<string> {
    const existing = findDescriptionAliasByExactName(state, input.name);
    return existing
        ? assignDescriptionAlias(state, { location: input.location, aliasId: existing.id })
        : createAndAssignDescriptionAlias(state, {
              location: input.location,
              aliasId: input.newAliasId,
              name: input.name
          });
}

/** Insert a manual transaction and exact-select/create its alias in one validated CRDT action. */
export function insertManualDescriptionAliasedTransaction(
    state: VaultState,
    input: InsertManualDescriptionAliasedTransactionInput
): DescriptionAliasMutationResult<string> {
    const normalizedName = normalizeDescriptionAliasName(input.name);
    if (!normalizedName) return err("empty-name", "Alias names cannot be empty");

    const existingAlias = findDescriptionAliasByExactName(state, normalizedName);
    if (!existingAlias && getAlias(state, input.newAliasId)) {
        return err("alias-id-conflict", `Alias ${input.newAliasId} already exists`);
    }
    const location = {
        accountId: input.transaction.accountId,
        date: input.transaction.date,
        transactionId: input.transaction.id
    };
    if (findTransactionInStore(state.transactions, location)) {
        return err("transaction-id-conflict", `Transaction ${input.transaction.id} already exists`);
    }

    const insertion = insertTransaction(state.transactions, {
        transaction: {
            ...input.transaction,
            description: "",
            descriptionAliasId: undefined,
            importId: undefined,
            originalAmount: undefined
        }
    });
    if (!insertion.ok) {
        return err(
            "invalid-transaction-allocations",
            `Transaction allocations were rejected: ${insertion.error.type}`
        );
    }
    const transaction = findTransactionInStore(state.transactions, location);
    if (!transaction) throw new Error("Inserted manual transaction is missing from the draft");

    if (existingAlias) {
        moveTransactionReference(transaction, state, existingAlias);
        return ok(existingAlias.id);
    }
    addRealAlias(state, input.newAliasId, normalizedName);
    const createdAlias = getAlias(state, input.newAliasId);
    if (!createdAlias)
        throw new Error("Created manual description alias is missing from the draft");
    moveTransactionReference(transaction, state, createdAlias);
    return ok(createdAlias.id);
}

export function renameDescriptionAlias(
    state: VaultState,
    input: { readonly aliasId: string; readonly name: string }
): DescriptionAliasMutationResult<string> {
    const aliasResult = getActiveAlias(state, input.aliasId);
    if (!aliasResult.ok) return aliasResult;
    if (aliasResult.value.kind !== "real") {
        return err("alias-not-real", "Only real aliases can be renamed");
    }
    const normalizedName = normalizeDescriptionAliasName(input.name);
    if (!normalizedName) return err("empty-name", "Alias names cannot be empty");
    const duplicate = findDescriptionAliasByExactName(state, normalizedName);
    if (duplicate && duplicate.id !== aliasResult.value.id) {
        return err("duplicate-name", `An alias named ${normalizedName} already exists`);
    }
    aliasResult.value.name = normalizedName;
    return ok(aliasResult.value.id);
}

export function changeOneDescriptionAlias(
    state: VaultState,
    input: ChangeOneDescriptionAliasInput
): DescriptionAliasMutationResult<string> {
    const transactions = findTransactionsInStore(state.transactions, input.location);
    if (!transactions.length) return err("transaction-not-found", "Transaction does not exist");
    if (
        transactions.some(({ descriptionAliasId }) => descriptionAliasId !== input.expectedAliasId)
    ) {
        return err("stale-alias", "The transaction alias changed before this action ran");
    }
    const targetResult = prepareTarget(state, input.target);
    if (!targetResult.ok) return targetResult;
    const target = materializeTarget(state, targetResult.value);
    for (const transaction of transactions) moveTransactionReference(transaction, state, target);
    return ok(target.id);
}

export function changeAllDescriptionAliases(
    state: VaultState,
    input: ChangeAllDescriptionAliasesInput
): DescriptionAliasMutationResult<string> {
    const sourceResult = getActiveAlias(state, input.sourceAliasId);
    if (!sourceResult.ok) return sourceResult;
    const source = sourceResult.value;
    if (source.kind !== "real") {
        return err("alias-not-real", "Change all requires a real source alias");
    }
    const targetResult = prepareTarget(state, input.target);
    if (!targetResult.ok) return targetResult;
    if (targetResult.value.aliasId === source.id) {
        return err("same-alias", "Source and target aliases must differ");
    }

    const inboundSymlinks: DescriptionAliasWire[] = [];
    for (const symlinkId of Object.keys(source.symlinkIds)
        .filter((id) => id !== "$cid")
        .sort()) {
        const symlink = getAlias(state, symlinkId);
        if (
            !symlink ||
            symlink.deletedAt ||
            symlink.kind !== "symlink" ||
            symlink.targetAliasId !== source.id
        ) {
            return err(
                "invalid-symlink-backlink",
                `Alias ${source.id} has an invalid backlink to ${symlinkId}`
            );
        }
        inboundSymlinks.push(symlink);
    }

    const target = materializeTarget(state, targetResult.value);
    for (const symlink of inboundSymlinks) {
        symlink.targetAliasId = target.id;
        target.symlinkIds[symlink.id] = true;
    }
    source.kind = "symlink";
    source.targetAliasId = target.id;
    clearReferenceMap(source.symlinkIds);
    target.symlinkIds[source.id] = true;
    return ok(target.id);
}

export function removeOneDescriptionAlias(
    state: VaultState,
    input: RemoveOneDescriptionAliasInput
): DescriptionAliasMutationResult<undefined> {
    const transactions = findTransactionsInStore(state.transactions, input.location);
    if (!transactions.length) return err("transaction-not-found", "Transaction does not exist");
    if (
        transactions.some(({ descriptionAliasId }) => descriptionAliasId !== input.expectedAliasId)
    ) {
        return err("stale-alias", "The transaction alias changed before this action ran");
    }
    const alias = getAlias(state, input.expectedAliasId);
    if (alias) delete alias.transactionIds[input.location.transactionId];
    for (const transaction of transactions) transaction.descriptionAliasId = undefined;
    return ok(undefined);
}

export function removeAllDescriptionAliases(
    state: VaultState,
    aliasId: string
): DescriptionAliasMutationResult<undefined> {
    const targetResult = getFinalRealAlias(state, aliasId);
    if (!targetResult.ok) return targetResult;
    const target = targetResult.value;
    const inboundSymlinks = new Map<string, DescriptionAliasWire>();
    for (const symlinkId of Object.keys(target.symlinkIds)
        .filter((id) => id !== "$cid")
        .sort()) {
        const symlink = getAlias(state, symlinkId);
        if (
            !symlink ||
            symlink.deletedAt ||
            symlink.kind !== "symlink" ||
            symlink.targetAliasId !== target.id
        ) {
            return err(
                "invalid-symlink-backlink",
                `Alias ${target.id} has an invalid backlink to ${symlinkId}`
            );
        }
        inboundSymlinks.set(symlink.id, symlink);
    }
    for (const aliasValue of Object.values(state.descriptionAliases)) {
        if (
            typeof aliasValue === "object" &&
            aliasValue != null &&
            !aliasValue.deletedAt &&
            aliasValue.kind === "symlink" &&
            aliasValue.targetAliasId === target.id
        ) {
            inboundSymlinks.set(aliasValue.id, aliasValue);
        }
    }

    const deletedAt = Temporal.Now.instant();
    const affectedAliases = [target, ...inboundSymlinks.values()];
    const affectedAliasIds = new Set(affectedAliases.map((alias) => alias.id));
    for (const tree of Object.values(state.transactions)) {
        if (typeof tree !== "object" || tree == null) continue;
        for (const year of tree.years) {
            for (const month of year.months) {
                for (const day of month.days) {
                    for (const transaction of day.transactions) {
                        if (
                            transaction.descriptionAliasId &&
                            affectedAliasIds.has(transaction.descriptionAliasId)
                        ) {
                            transaction.descriptionAliasId = undefined;
                        }
                        for (const duplicate of transaction.suspectedDuplicates) {
                            if (
                                duplicate.descriptionAliasId &&
                                affectedAliasIds.has(duplicate.descriptionAliasId)
                            ) {
                                duplicate.descriptionAliasId = undefined;
                            }
                        }
                    }
                }
            }
        }
    }
    for (const alias of affectedAliases) {
        alias.kind = "real";
        alias.targetAliasId = undefined;
        clearReferenceMap(alias.symlinkIds);
        clearReferenceMap(alias.transactionIds);
        alias.deletedAt = deletedAt;
    }
    return ok(undefined);
}

/** Preflight alias and ordinary transaction fields, then commit one all-or-nothing draft. */
export function updateDescriptionAliasedTransaction(
    state: VaultState,
    input: UpdateTransactionInput
): DescriptionAliasMutationResult<undefined> {
    if (Object.prototype.hasOwnProperty.call(input.updates, "allocations")) {
        return err(
            "invalid-transaction-allocations",
            "Use the dedicated allocation mutation boundary"
        );
    }
    const transaction = findTransactionInStore(state.transactions, input.location);
    if (!transaction) return err("transaction-not-found", "Transaction does not exist");

    if ("descriptionAliasId" in input.updates) {
        const requestedAliasId = input.updates.descriptionAliasId;
        const aliasResult = requestedAliasId
            ? assignDescriptionAlias(state, {
                  location: input.location,
                  aliasId: requestedAliasId
              })
            : transaction.descriptionAliasId
              ? removeOneDescriptionAlias(state, {
                    location: input.location,
                    expectedAliasId: transaction.descriptionAliasId
                })
              : ok(undefined);
        if (!aliasResult.ok) return aliasResult;
    }

    updateTransaction(state.transactions, input);
    return ok(undefined);
}

function unlinkTransaction(state: VaultState, transaction: Transaction | NestedDuplicate): void {
    if (!transaction.descriptionAliasId) return;
    const alias = getAlias(state, transaction.descriptionAliasId);
    if (alias) delete alias.transactionIds[transaction.id];
    transaction.descriptionAliasId = undefined;
}

export function deleteDescriptionAliasedTransaction(
    state: VaultState,
    input: DeleteTransactionInput
): DescriptionAliasMutationResult<undefined> {
    const transactions = findTransactionsInStore(state.transactions, input.location);
    if (!transactions.length) return err("transaction-not-found", "Transaction does not exist");
    for (const transaction of transactions) {
        unlinkTransaction(state, transaction);
        if ("suspectedDuplicates" in transaction) {
            for (const duplicate of transaction.suspectedDuplicates)
                unlinkTransaction(state, duplicate);
        }
    }
    deleteTransaction(state.transactions, input);
    return ok(undefined);
}

export function deleteDescriptionAliasedTransactionsByImport(
    state: VaultState,
    importId: string
): DescriptionAliasMutationResult<undefined> {
    for (const tree of Object.values(state.transactions)) {
        if (typeof tree !== "object" || tree == null) continue;
        for (const year of tree.years) {
            for (const month of year.months) {
                for (const day of month.days) {
                    for (const transaction of day.transactions) {
                        if (transaction.importId === importId)
                            unlinkTransaction(state, transaction);
                        for (const duplicate of transaction.suspectedDuplicates) {
                            if (duplicate.importId === importId)
                                unlinkTransaction(state, duplicate);
                        }
                    }
                }
            }
        }
    }
    deleteTransactionsByImport(state.transactions, importId);
    const importRecord = state.imports[importId];
    if (typeof importRecord === "object" && importRecord != null) {
        importRecord.deletedAt = Temporal.Now.instant();
    }
    return ok(undefined);
}
