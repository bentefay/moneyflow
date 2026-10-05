export type ParsedCurrency = { readonly ok: true; readonly value: number } | { readonly ok: false };

/** Parse a currency string to finite major units without inventing zero for invalid input. */
export function parseCurrency(str: string): ParsedCurrency {
    const normalized = str.trim().replace(/^\p{Sc}\s*/u, "");
    if (!/^-?(?:\d{1,3}(?:,\d{3})+(?:\.\d*)?|\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) {
        return { ok: false };
    }
    const value = Number(normalized.replaceAll(",", ""));
    return Number.isFinite(value) ? { ok: true, value } : { ok: false };
}

/** Commit-path seam kept separate from render-time presentation parsing. */
export function validateCurrencyDraft(str: string): ParsedCurrency {
    return parseCurrency(str);
}
