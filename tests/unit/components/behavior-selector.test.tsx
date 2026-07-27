import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
    BehaviorSelector,
    STATUS_BEHAVIORS
} from "@/components/features/statuses/BehaviorSelector";

/**
 * Regression cover for the "none" sentinel leak.
 *
 * Radix `Select` cannot express "no selection" as an item value, so the None option needs a
 * sentinel string. That sentinel used to be part of the component's public contract: `onChange`
 * handed the caller a raw `string`, and each caller had to remember to map "none" back to
 * undefined. `StatusesTable` did; `StatusRow` did not, so clearing a behaviour through the row
 * editor persisted the literal "none" into a field the CRDT schema declares as
 * `StringEnum(["treatAsPaid"])`.
 *
 * The sentinel is now confined to the component and the props speak only the domain type, which
 * makes the leak unrepresentable rather than merely absent. The end-to-end toggle is covered in
 * tests/e2e/people-settlement.spec.ts; these pin the contract that made the divergence possible.
 */
describe("BehaviorSelector", () => {
    it("offers None as undefined, never as a sentinel string", () => {
        // The old shape was `{ value: "" }`, which is what forced every caller to translate.
        expect(STATUS_BEHAVIORS.map((behavior) => behavior.value)).toEqual([
            undefined,
            "treatAsPaid"
        ]);
    });

    it("renders None for an unset behaviour", () => {
        render(<BehaviorSelector value={undefined} onChange={() => {}} />);

        expect(screen.getByTestId("behavior-selector")).toHaveTextContent("None");
    });

    it("renders the behaviour label when one is set", () => {
        render(<BehaviorSelector value="treatAsPaid" onChange={() => {}} />);

        expect(screen.getByTestId("behavior-selector")).toHaveTextContent("Treat as Paid");
    });
});
