"use client";

/**
 * Date Locale Provider
 *
 * Resolves the viewer's stored date presentation once and publishes the locale it means, so every
 * date surface renders and parses the same way.
 *
 * A context rather than a hook each cell calls for itself: the transaction grid mounts one date
 * cell per row, and a per-cell vault subscription would put a store read on the hot path of a
 * virtualised list to answer a question whose answer is identical for every row.
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { usePubkeyHash } from "@/hooks/use-identity";
import { useUserDateFormat } from "@/lib/crdt/context";
import {
    DEFAULT_DATE_FORMAT_PREFERENCE,
    localeForDateFormatPreference,
    type DateFormatPreference
} from "@/lib/domain/date-format-preference";

/** What the provider publishes: the choice, and the locale it resolves to. */
interface DateLocaleValue {
    /** The viewer's stored choice, for the settings control to render as selected. */
    readonly preference: DateFormatPreference;
    /** The locale every date helper should be given; `undefined` follows the browser. */
    readonly locale: string | undefined;
}

const FOLLOW_THE_BROWSER: DateLocaleValue = {
    preference: DEFAULT_DATE_FORMAT_PREFERENCE,
    locale: undefined
};

const DateLocaleContext = createContext<DateLocaleValue>(FOLLOW_THE_BROWSER);

export function DateLocaleProvider({ children }: { children: ReactNode }) {
    // Resolves in an effect, so the first paint has no identity and follows the browser. Dates
    // re-render once it arrives; the alternative is holding back every date until it does.
    const pubkeyHash = usePubkeyHash();
    const preference = useUserDateFormat(pubkeyHash);

    const value = useMemo<DateLocaleValue>(
        () => ({ preference, locale: localeForDateFormatPreference(preference) }),
        [preference]
    );

    return <DateLocaleContext.Provider value={value}>{children}</DateLocaleContext.Provider>;
}

/**
 * The locale to format and parse dates with, or `undefined` to follow the browser.
 *
 * Safe outside the provider, where it means the same thing it means before a viewer has chosen.
 */
export function useDateLocale(): string | undefined {
    return useContext(DateLocaleContext).locale;
}

/** The viewer's stored choice, for the control that changes it. */
export function useDateFormatPreference(): DateFormatPreference {
    return useContext(DateLocaleContext).preference;
}
