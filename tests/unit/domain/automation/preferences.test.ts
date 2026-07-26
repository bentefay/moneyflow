import { describe, expect, it } from "vitest";

import {
    DEFAULT_REMEMBERED_CHOICE,
    type RememberedRuleChoice,
    nextUserPreference,
    readRememberedChoice
} from "@/lib/domain/automation/preferences";

describe("user automation preferences", () => {
    it("returns defaults when no record exists", () => {
        expect(readRememberedChoice(undefined)).toEqual(DEFAULT_REMEMBERED_CHOICE);
    });

    it("fills missing fields with defaults", () => {
        expect(readRememberedChoice({ pubkeyHash: "user-1", lastRuleField: "allocation" })).toEqual(
            {
                field: "allocation",
                tagMode: DEFAULT_REMEMBERED_CHOICE.tagMode,
                useAccountScope: false,
                useAmountScope: false
            }
        );
    });

    it("round-trips a choice through nextUserPreference/readRememberedChoice", () => {
        const choice: RememberedRuleChoice = {
            field: "tags",
            tagMode: "set",
            useAccountScope: true,
            useAmountScope: false
        };
        const record = nextUserPreference("user-1", choice);
        expect(record.pubkeyHash).toBe("user-1");
        expect(readRememberedChoice(record)).toEqual(choice);
    });
});
