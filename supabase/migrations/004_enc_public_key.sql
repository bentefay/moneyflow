-- ============================================
-- MoneyFlow Core MVP - Add enc_public_key
-- ============================================
-- Adds X25519 public key storage for vault re-keying operations.
-- When a member is removed, the vault owner can re-encrypt the vault key
-- for all remaining members using their stored enc_public_key.

-- Add enc_public_key column to vault_memberships
-- This stores the user's X25519 encryption public key for key wrapping
ALTER TABLE public.vault_memberships
  ADD COLUMN enc_public_key TEXT;

COMMENT ON COLUMN public.vault_memberships.enc_public_key IS
  'User X25519 public key (base64) for vault re-keying when members are removed';

-- Add enc_public_key column to vault_invites
-- When an invite is redeemed, the invitee's enc_public_key is stored
ALTER TABLE public.vault_invites
  ADD COLUMN enc_public_key TEXT;

COMMENT ON COLUMN public.vault_invites.enc_public_key IS
  'Invitee X25519 public key (base64) to store in membership after redemption';
