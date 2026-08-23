"use client";

/**
 * Date Format Selector
 *
 * Chooses how dates are presented to this viewer, listing each option beside an example of the
 * date it produces.
 *
 * The examples are rendered by the same formatter the transaction grid uses rather than written
 * out as literals, so a label cannot drift from what choosing it actually does.
 */

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    DATE_FORMAT_PREFERENCES,
    dateFormatPreferenceExample,
    type DateFormatPreference
} from "@/lib/domain/date-format-preference";

export interface DateFormatSelectorProps {
    /** The viewer's current choice. */
    value: DateFormatPreference;
    /** Called with the newly chosen presentation. */
    onChange: (preference: DateFormatPreference) => void;
    /** Additional CSS classes for the trigger. */
    className?: string;
    /** Whether the control is disabled. */
    disabled?: boolean;
}

/** What each option is called. The example beside it is computed, not written here. */
const PREFERENCE_LABELS: Record<DateFormatPreference, string> = {
    automatic: "Automatic — match my browser",
    dayFirst: "Day first",
    monthFirst: "Month first",
    yearFirst: "Year first"
};

export function DateFormatSelector({
    value,
    onChange,
    className,
    disabled = false
}: DateFormatSelectorProps) {
    return (
        <Select
            value={value}
            onValueChange={(chosen) => onChange(toPreference(chosen, value))}
            disabled={disabled}
        >
            <SelectTrigger id="date-format" aria-label="Date format" className={className}>
                <SelectValue placeholder="Select a date format" />
            </SelectTrigger>
            <SelectContent>
                {DATE_FORMAT_PREFERENCES.map((preference) => (
                    <SelectItem key={preference} value={preference}>
                        <span className="flex w-full items-center justify-between gap-6">
                            <span>{PREFERENCE_LABELS[preference]}</span>
                            <span className="text-muted-foreground tabular-nums">
                                {dateFormatPreferenceExample(preference)}
                            </span>
                        </span>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

/**
 * Narrow the string the select hands back to a preference.
 *
 * It can only ever be one of the values rendered above, but the callback is typed as a bare string,
 * and a type guard is preferable to asserting that.
 */
function toPreference(chosen: string, fallback: DateFormatPreference): DateFormatPreference {
    return DATE_FORMAT_PREFERENCES.find((preference) => preference === chosen) ?? fallback;
}
