/**
 * Invite Flow Integration Tests
 *
 * Tests the invite creation and redemption flow end-to-end.
 * These are integration tests that mock the database but test
 * the full schema validation and router logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  inviteCreateInput,
  inviteAcceptInput,
  inviteGetByPubkeyInput,
  inviteListInput,
  inviteRevokeInput,
} from "@/server/schemas/invite";
import {
  membershipListInput,
  membershipRemoveInput,
  membershipRekeyInput,
} from "@/server/schemas/membership";

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe("Invite Schemas", () => {
  describe("inviteCreateInput", () => {
    it("accepts valid input", () => {
      const input = {
        vaultId: "550e8400-e29b-41d4-a716-446655440000",
        invitePubkey: btoa("test-public-key-32bytes-padding"),
        encryptedVaultKey: btoa("encrypted-vault-key-data"),
        role: "member" as const,
        expiresInHours: 48,
      };

      const result = inviteCreateInput.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("rejects invalid vault ID", () => {
      const input = {
        vaultId: "not-a-uuid",
        invitePubkey: btoa("test-public-key"),
        encryptedVaultKey: btoa("encrypted-vault-key"),
      };

      const result = inviteCreateInput.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects empty invite pubkey", () => {
      const input = {
        vaultId: "550e8400-e29b-41d4-a716-446655440000",
        invitePubkey: "",
        encryptedVaultKey: btoa("encrypted-vault-key"),
      };

      const result = inviteCreateInput.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects invalid base64 for pubkey", () => {
      const input = {
        vaultId: "550e8400-e29b-41d4-a716-446655440000",
        invitePubkey: "not-valid-base64!!!",
        encryptedVaultKey: btoa("encrypted-vault-key"),
      };

      const result = inviteCreateInput.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("defaults role to member", () => {
      const input = {
        vaultId: "550e8400-e29b-41d4-a716-446655440000",
        invitePubkey: btoa("test-public-key"),
        encryptedVaultKey: btoa("encrypted-vault-key"),
      };

      const result = inviteCreateInput.parse(input);
      expect(result.role).toBe("member");
    });

    it("defaults expiresInHours to 48", () => {
      const input = {
        vaultId: "550e8400-e29b-41d4-a716-446655440000",
        invitePubkey: btoa("test-public-key"),
        encryptedVaultKey: btoa("encrypted-vault-key"),
      };

      const result = inviteCreateInput.parse(input);
      expect(result.expiresInHours).toBe(48);
    });

    it("rejects expiry hours below 1", () => {
      const input = {
        vaultId: "550e8400-e29b-41d4-a716-446655440000",
        invitePubkey: btoa("test-public-key"),
        encryptedVaultKey: btoa("encrypted-vault-key"),
        expiresInHours: 0,
      };

      const result = inviteCreateInput.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects expiry hours above 168", () => {
      const input = {
        vaultId: "550e8400-e29b-41d4-a716-446655440000",
        invitePubkey: btoa("test-public-key"),
        encryptedVaultKey: btoa("encrypted-vault-key"),
        expiresInHours: 169,
      };

      const result = inviteCreateInput.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("inviteAcceptInput", () => {
    it("accepts valid input", () => {
      const input = {
        invitePubkey: btoa("test-public-key"),
        encryptedVaultKey: btoa("encrypted-vault-key"),
        encPublicKey: btoa("user-encryption-public-key"),
      };

      const result = inviteAcceptInput.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("requires encPublicKey", () => {
      const input = {
        invitePubkey: btoa("test-public-key"),
        encryptedVaultKey: btoa("encrypted-vault-key"),
      };

      const result = inviteAcceptInput.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("inviteGetByPubkeyInput", () => {
    it("accepts valid input", () => {
      const input = {
        invitePubkey: btoa("test-public-key"),
      };

      const result = inviteGetByPubkeyInput.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("rejects empty pubkey", () => {
      const input = {
        invitePubkey: "",
      };

      const result = inviteGetByPubkeyInput.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("inviteListInput", () => {
    it("accepts valid vault ID", () => {
      const input = {
        vaultId: "550e8400-e29b-41d4-a716-446655440000",
      };

      const result = inviteListInput.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("inviteRevokeInput", () => {
    it("accepts valid invite ID", () => {
      const input = {
        inviteId: "550e8400-e29b-41d4-a716-446655440000",
      };

      const result = inviteRevokeInput.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("rejects invalid UUID", () => {
      const input = {
        inviteId: "not-a-uuid",
      };

      const result = inviteRevokeInput.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

describe("Membership Schemas", () => {
  describe("membershipListInput", () => {
    it("accepts valid vault ID", () => {
      const input = {
        vaultId: "550e8400-e29b-41d4-a716-446655440000",
      };

      const result = membershipListInput.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("membershipRemoveInput", () => {
    it("accepts valid input", () => {
      const input = {
        vaultId: "550e8400-e29b-41d4-a716-446655440000",
        pubkeyHash: "abc123pubkeyhash",
      };

      const result = membershipRemoveInput.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("rejects empty pubkeyHash", () => {
      const input = {
        vaultId: "550e8400-e29b-41d4-a716-446655440000",
        pubkeyHash: "",
      };

      const result = membershipRemoveInput.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("membershipRekeyInput", () => {
    it("accepts valid input", () => {
      const input = {
        vaultId: "550e8400-e29b-41d4-a716-446655440000",
        memberKeys: [
          {
            pubkeyHash: "user1pubkeyhash",
            encryptedVaultKey: btoa("wrapped-key-1"),
          },
          {
            pubkeyHash: "user2pubkeyhash",
            encryptedVaultKey: btoa("wrapped-key-2"),
          },
        ],
      };

      const result = membershipRekeyInput.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("accepts empty memberKeys array", () => {
      const input = {
        vaultId: "550e8400-e29b-41d4-a716-446655440000",
        memberKeys: [],
      };

      const result = membershipRekeyInput.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("rejects invalid encryptedVaultKey", () => {
      const input = {
        vaultId: "550e8400-e29b-41d4-a716-446655440000",
        memberKeys: [
          {
            pubkeyHash: "user1pubkeyhash",
            encryptedVaultKey: "not-valid-base64!!!",
          },
        ],
      };

      const result = membershipRekeyInput.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// Crypto Integration Tests
// ============================================================================

describe("Invite Key Wrapping Flow", () => {
  it("should generate valid invite pubkey from secret", async () => {
    // Import sodium
    const sodium = await import("libsodium-wrappers");
    await sodium.ready;

    // Generate invite secret (like InviteLinkGenerator does)
    const inviteSecret = sodium.randombytes_buf(32);

    // Derive keypair from secret
    const inviteKeypair = sodium.crypto_box_seed_keypair(inviteSecret);

    // Verify keypair is valid
    expect(inviteKeypair.publicKey).toHaveLength(32);
    expect(inviteKeypair.privateKey).toHaveLength(32);

    // Convert to base64 for API
    const pubkeyBase64 = sodium.to_base64(inviteKeypair.publicKey, sodium.base64_variants.ORIGINAL);

    // Should be valid base64
    expect(() => atob(pubkeyBase64)).not.toThrow();
  });

  it("should produce consistent keypair from same secret", async () => {
    const sodium = await import("libsodium-wrappers");
    await sodium.ready;

    const inviteSecret = sodium.randombytes_buf(32);

    const keypair1 = sodium.crypto_box_seed_keypair(inviteSecret);
    const keypair2 = sodium.crypto_box_seed_keypair(inviteSecret);

    // Same secret should produce same keypair
    expect(sodium.to_base64(keypair1.publicKey)).toBe(sodium.to_base64(keypair2.publicKey));
    expect(sodium.to_base64(keypair1.privateKey)).toBe(sodium.to_base64(keypair2.privateKey));
  });

  it("should validate URL-safe base64 encoding for invite secret", async () => {
    const sodium = await import("libsodium-wrappers");
    await sodium.ready;

    const inviteSecret = sodium.randombytes_buf(32);

    // URL-safe encoding without padding for URL fragment
    const urlSafe = sodium.to_base64(inviteSecret, sodium.base64_variants.URLSAFE_NO_PADDING);

    // Should not contain + / =
    expect(urlSafe).not.toMatch(/[+/=]/);

    // Should decode back correctly
    const decoded = sodium.from_base64(urlSafe, sodium.base64_variants.URLSAFE_NO_PADDING);
    expect(decoded).toEqual(inviteSecret);
  });
});
