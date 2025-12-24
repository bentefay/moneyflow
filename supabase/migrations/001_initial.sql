-- ============================================
-- MoneyFlow Core MVP - Initial Schema
-- ============================================
-- Zero-Knowledge Design: Server never sees plaintext financial data
-- or user identities - only opaque pubkey_hash values

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABLES (Zero-Knowledge Design)
-- ============================================

-- User data: keyed by pubkey_hash, contains encrypted vault references
-- Server has NO knowledge of user identity
CREATE TABLE public.user_data (
  pubkey_hash TEXT PRIMARY KEY,           -- BLAKE2b(publicKey), opaque to server
  encrypted_data TEXT NOT NULL,           -- Encrypted: { vaults, settings }
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.user_data IS 'User data encrypted client-side. Server only sees opaque pubkey_hash.';
COMMENT ON COLUMN public.user_data.pubkey_hash IS 'BLAKE2b hash of user public key - server cannot reverse this';
COMMENT ON COLUMN public.user_data.encrypted_data IS 'Encrypted JSON: { vaults: [{id, wrappedKey}], globalSettings: {...} }';

-- Vaults (metadata only - no financial data)
CREATE TABLE public.vaults (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.vaults IS 'Vault metadata only. All financial data is in encrypted snapshots/updates.';

-- Vault memberships (who can access which vault)
CREATE TABLE public.vault_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vault_id UUID NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
  pubkey_hash TEXT NOT NULL,              -- User identity (hash of public key)
  encrypted_vault_key TEXT NOT NULL,      -- Vault key wrapped with user's X25519 pubkey
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vault_id, pubkey_hash)
);

COMMENT ON TABLE public.vault_memberships IS 'Maps users to vaults with role-based access.';
COMMENT ON COLUMN public.vault_memberships.encrypted_vault_key IS 'Vault encryption key wrapped with this user X25519 public key';

-- Pending vault invitations
CREATE TABLE public.vault_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vault_id UUID NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
  invite_pubkey TEXT NOT NULL UNIQUE,     -- Ephemeral pubkey from invite secret
  encrypted_vault_key TEXT NOT NULL,      -- Vault key wrapped with invite_pubkey
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  created_by TEXT NOT NULL,               -- pubkey_hash of inviter
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.vault_invites IS 'Pending invitations. Invite secret shared via URL fragment (never sent to server).';
COMMENT ON COLUMN public.vault_invites.invite_pubkey IS 'Ephemeral pubkey derived from invite secret - unlinkable to invitee';

-- Index for cleanup job
CREATE INDEX idx_vault_invites_expires ON public.vault_invites(expires_at);

-- Vault snapshots (encrypted Loro doc.export({ mode: 'snapshot' }))
CREATE TABLE public.vault_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vault_id UUID NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  hlc_timestamp TEXT NOT NULL,
  encrypted_data TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vault_id, version)
);

COMMENT ON TABLE public.vault_snapshots IS 'Encrypted Loro CRDT snapshots. Server cannot decrypt.';
COMMENT ON COLUMN public.vault_snapshots.encrypted_data IS 'XChaCha20-Poly1305 encrypted Loro snapshot bytes (base64)';

-- Index for loading latest snapshot
CREATE INDEX idx_vault_snapshots_vault_version
  ON public.vault_snapshots(vault_id, version DESC);

-- Vault updates (encrypted Loro doc.export({ mode: 'update' }))
CREATE TABLE public.vault_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vault_id UUID NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
  base_snapshot_version INTEGER NOT NULL,
  hlc_timestamp TEXT NOT NULL,
  encrypted_data TEXT NOT NULL,
  author_pubkey_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.vault_updates IS 'Encrypted Loro CRDT updates for real-time sync.';
COMMENT ON COLUMN public.vault_updates.encrypted_data IS 'XChaCha20-Poly1305 encrypted Loro update bytes (base64)';

-- Index for loading updates after snapshot
CREATE INDEX idx_vault_updates_vault_created
  ON public.vault_updates(vault_id, created_at);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_updates ENABLE ROW LEVEL SECURITY;
