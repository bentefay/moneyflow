/**
 * Tests for BIP39 Seed Phrase Generation
 *
 * Table-driven tests for pure functions, property-based tests for invariants.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  generateSeedPhrase,
  validateSeedPhrase,
  mnemonicToMasterSeed,
  normalizeMnemonic,
  splitMnemonic,
  joinMnemonic,
} from "@/lib/crypto/seed";

describe("generateSeedPhrase", () => {
  it("generates a valid 12-word mnemonic", () => {
    const mnemonic = generateSeedPhrase();
    const words = mnemonic.split(" ");

    expect(words).toHaveLength(12);
    expect(validateSeedPhrase(mnemonic)).toBe(true);
  });

  it("generates unique mnemonics on each call", () => {
    const mnemonics = new Set(Array.from({ length: 10 }, () => generateSeedPhrase()));

    // All 10 should be unique (collision probability ~0 with 128-bit entropy)
    expect(mnemonics.size).toBe(10);
  });
});

describe("validateSeedPhrase", () => {
  const validCases = [
    {
      name: "accepts valid 12-word mnemonic",
      mnemonic:
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    },
    {
      name: "accepts freshly generated mnemonic",
      mnemonic: generateSeedPhrase(),
    },
  ] as const;

  const invalidCases = [
    { name: "rejects empty string", mnemonic: "" },
    { name: "rejects single word", mnemonic: "abandon" },
    { name: "rejects 11 words", mnemonic: "abandon ".repeat(11).trim() },
    { name: "rejects 13 words", mnemonic: "abandon ".repeat(13).trim() },
    { name: "rejects invalid words", mnemonic: "notaword ".repeat(12).trim() },
    { name: "rejects invalid checksum", mnemonic: "abandon ".repeat(12).trim() },
    {
      name: "rejects mixed invalid/valid",
      mnemonic:
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon wrong",
    },
  ] as const;

  validCases.forEach(({ name, mnemonic }) => {
    it(name, () => {
      expect(validateSeedPhrase(mnemonic)).toBe(true);
    });
  });

  invalidCases.forEach(({ name, mnemonic }) => {
    it(name, () => {
      expect(validateSeedPhrase(mnemonic)).toBe(false);
    });
  });
});

describe("mnemonicToMasterSeed", () => {
  it("derives 64-byte master seed from valid mnemonic", async () => {
    const mnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    const seed = await mnemonicToMasterSeed(mnemonic);

    expect(seed).toBeInstanceOf(Uint8Array);
    expect(seed.length).toBe(64);
  });

  it("throws for invalid mnemonic", async () => {
    await expect(mnemonicToMasterSeed("invalid mnemonic phrase")).rejects.toThrow(
      "Invalid recovery phrase"
    );
  });

  it("is deterministic - same mnemonic produces same seed", async () => {
    const mnemonic = generateSeedPhrase();
    const seed1 = await mnemonicToMasterSeed(mnemonic);
    const seed2 = await mnemonicToMasterSeed(mnemonic);

    expect(seed1).toEqual(seed2);
  });

  it("produces different seeds for different mnemonics", async () => {
    const mnemonic1 = generateSeedPhrase();
    const mnemonic2 = generateSeedPhrase();

    const seed1 = await mnemonicToMasterSeed(mnemonic1);
    const seed2 = await mnemonicToMasterSeed(mnemonic2);

    expect(seed1).not.toEqual(seed2);
  });
});

describe("normalizeMnemonic", () => {
  const cases = [
    { name: "lowercases uppercase", input: "ABANDON ABANDON", expected: "abandon abandon" },
    { name: "trims leading/trailing whitespace", input: "  abandon  ", expected: "abandon" },
    { name: "collapses multiple spaces", input: "abandon    abandon", expected: "abandon abandon" },
    {
      name: "handles mixed case and extra spaces",
      input: "  ABANDON   Abandon  ",
      expected: "abandon abandon",
    },
    { name: "preserves valid mnemonic", input: "abandon about", expected: "abandon about" },
  ] as const;

  cases.forEach(({ name, input, expected }) => {
    it(name, () => {
      expect(normalizeMnemonic(input)).toBe(expected);
    });
  });
});

describe("splitMnemonic", () => {
  it("splits 12-word mnemonic into array", () => {
    const mnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    const words = splitMnemonic(mnemonic);

    expect(words).toHaveLength(12);
    expect(words[0]).toBe("abandon");
    expect(words[11]).toBe("about");
  });

  it("normalizes before splitting", () => {
    const mnemonic = "  ABANDON   ABOUT  ";
    const words = splitMnemonic(mnemonic);

    expect(words).toEqual(["abandon", "about"]);
  });
});

describe("joinMnemonic", () => {
  it("joins array of words into mnemonic", () => {
    const words = ["abandon", "about"];
    expect(joinMnemonic(words)).toBe("abandon about");
  });

  it("normalizes words during join", () => {
    const words = ["  ABANDON  ", "  ABOUT  "];
    expect(joinMnemonic(words)).toBe("abandon about");
  });
});

describe("splitMnemonic + joinMnemonic roundtrip", () => {
  it("roundtrips valid mnemonic", () => {
    const original =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    const roundtripped = joinMnemonic(splitMnemonic(original));

    expect(roundtripped).toBe(original);
    expect(validateSeedPhrase(roundtripped)).toBe(true);
  });

  it("roundtrips with property-based testing", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const mnemonic = generateSeedPhrase();
        const roundtripped = joinMnemonic(splitMnemonic(mnemonic));
        return roundtripped === mnemonic && validateSeedPhrase(roundtripped);
      }),
      { numRuns: 20 }
    );
  });
});
