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
                useAmountScope: false,
                applyMode: DEFAULT_REMEMBERED_CHOICE.applyMode
            }
        );
    });

    it("defaults the apply mode when absent but honours a stored one", () => {
        expect(readRememberedChoice({ pubkeyHash: "user-1" }).applyMode).toBe(
            DEFAULT_REMEMBERED_CHOICE.applyMode
        );
        expect(
            readRememberedChoice({ pubkeyHash: "user-1", lastApplyMode: "updatingAll" }).applyMode
        ).toBe("updatingAll");
    });

    it("round-trips a choice through nextUserPreference/readRememberedChoice", () => {
        const choice: RememberedRuleChoice = {
            field: "tags",
            tagMode: "set",
            useAccountScope: true,
            useAmountScope: false,
            applyMode: "updatingNew"
        };
        const record = nextUserPreference("user-1", choice);
        expect(record.pubkeyHash).toBe("user-1");
        expect(record.lastApplyMode).toBe("updatingNew");
        expect(readRememberedChoice(record)).toEqual(choice);
    });
});
