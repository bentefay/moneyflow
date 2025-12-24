/**
 * BIP39 Seed Phrase Generation
 *
 * Generates and validates 12-word BIP39 seed phrases using 128-bit entropy.
 * The seed phrase IS the user's identity - no email/password.
 */

import * as bip39 from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

/**
 * Generates a new 12-word BIP39 seed phrase with 128-bit entropy.
 *
 * @returns A 12-word mnemonic phrase separated by spaces
 * @example
 * const mnemonic = generateSeedPhrase();
 * // "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
 */
export function generateSeedPhrase(): string {
  // 128 bits = 12 words (each word encodes 11 bits, 128/11 ≈ 11.6, rounded up + checksum = 12)
  return bip39.generateMnemonic(wordlist, 128);
}

/**
 * Validates a BIP39 mnemonic phrase.
 *
 * Checks:
 * 1. All words exist in the BIP39 English wordlist
 * 2. Checksum is valid
 * 3. Word count is valid (12 words for 128-bit entropy)
 *
 * @param mnemonic - The seed phrase to validate (space-separated words)
 * @returns true if valid, false otherwise
 */
export function validateSeedPhrase(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic, wordlist);
}

/**
 * Converts a validated mnemonic to a master seed for key derivation.
 *
 * Uses PBKDF2 with 2048 iterations as per BIP39 spec.
 * The seed is 512 bits (64 bytes).
 *
 * @param mnemonic - A valid BIP39 mnemonic phrase
 * @returns 64-byte master seed as Uint8Array
 * @throws Error if mnemonic is invalid
 */
export async function mnemonicToMasterSeed(mnemonic: string): Promise<Uint8Array> {
  if (!validateSeedPhrase(mnemonic)) {
    throw new Error("Invalid recovery phrase");
  }

  // BIP39 spec: PBKDF2 with optional passphrase (we use empty string)
  const seed = await bip39.mnemonicToSeed(mnemonic);
  return new Uint8Array(seed);
}

/**
 * Normalizes a mnemonic phrase by:
 * - Converting to lowercase
 * - Trimming whitespace
 * - Collapsing multiple spaces to single space
 *
 * This helps handle user input variations.
 *
 * @param mnemonic - User-entered seed phrase
 * @returns Normalized mnemonic
 */
export function normalizeMnemonic(mnemonic: string): string {
  return mnemonic.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Splits a mnemonic into individual words.
 * Useful for displaying in a 12-word grid.
 *
 * @param mnemonic - A seed phrase
 * @returns Array of 12 words
 */
export function splitMnemonic(mnemonic: string): string[] {
  return normalizeMnemonic(mnemonic).split(" ");
}

/**
 * Joins an array of words into a mnemonic phrase.
 * Useful for combining input fields.
 *
 * @param words - Array of seed phrase words
 * @returns Space-separated mnemonic
 */
export function joinMnemonic(words: string[]): string {
  return words.map((w) => w.toLowerCase().trim()).join(" ");
}
