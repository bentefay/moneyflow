-- ============================================
-- MoneyFlow - Vault Operations Table
-- ============================================
-- New persistence architecture: all ops stored forever,
-- shallow snapshots for fast cold start

-- ============================================
-- NEW TABLE: vault_ops
-- ============================================
-- Stores ALL operations forever. Server source of truth.
-- Version vector stored plaintext for server-side filtering.

CREATE TABLE public.vault_ops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vault_id UUID NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
  version_vector TEXT NOT NULL,           -- Loro version vector (plaintext for filtering)
  encrypted_data TEXT NOT NULL,           -- XChaCha20-Poly1305 encrypted op bytes (base64)
  author_pubkey_hash TEXT NOT NULL,       -- Who created this op
  created_at TIMESTAMPTZ DEFAULT NOW()    -- Server timestamp for ordering
);

COMMENT ON TABLE public.vault_ops IS 'All vault CRDT operations, stored forever. Server cannot decrypt data.';
COMMENT ON COLUMN public.vault_ops.version_vector IS 'Loro version vector as JSON string. Plaintext to enable server-side filtering without decryption.';
COMMENT ON COLUMN public.vault_ops.encrypted_data IS 'XChaCha20-Poly1305 encrypted Loro update bytes (base64)';
COMMENT ON COLUMN public.vault_ops.author_pubkey_hash IS 'BLAKE2b hash of the author public key';
COMMENT ON COLUMN public.vault_ops.created_at IS 'Server-assigned timestamp for consistent ordering';

-- Index for fetching ops since a version (most common query)
CREATE INDEX idx_vault_ops_vault_created
  ON public.vault_ops(vault_id, created_at);

-- Index for counting ops/bytes since snapshot (for threshold checks)
CREATE INDEX idx_vault_ops_vault_id
  ON public.vault_ops(vault_id);

-- ============================================
-- UPDATE: vault_snapshots
-- ============================================
-- Replace version/hlc_timestamp with version_vector for consistency

-- Add new column
ALTER TABLE public.vault_snapshots 
  ADD COLUMN IF NOT EXISTS version_vector TEXT;

-- Migrate existing data (set version_vector from version if exists)
UPDATE public.vault_snapshots 
SET version_vector = '{}' 
WHERE version_vector IS NULL;

-- Make version_vector required
ALTER TABLE public.vault_snapshots 
  ALTER COLUMN version_vector SET NOT NULL;

-- Add updated_at column if not exists
ALTER TABLE public.vault_snapshots 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Drop old columns (version, hlc_timestamp) - they're replaced by version_vector
-- Note: Keeping for now to avoid breaking existing code, can remove later
-- ALTER TABLE public.vault_snapshots DROP COLUMN IF EXISTS version;
-- ALTER TABLE public.vault_snapshots DROP COLUMN IF EXISTS hlc_timestamp;

-- Drop the old unique constraint and index on (vault_id, version)
DROP INDEX IF EXISTS idx_vault_snapshots_vault_version;
ALTER TABLE public.vault_snapshots 
  DROP CONSTRAINT IF EXISTS vault_snapshots_vault_id_version_key;

-- Create new index for latest snapshot lookup
CREATE INDEX idx_vault_snapshots_vault_updated
  ON public.vault_snapshots(vault_id, updated_at DESC);

-- Add unique constraint - one snapshot per vault (we only keep latest)
-- First, delete any duplicate snapshots keeping only the newest
DELETE FROM public.vault_snapshots a
USING public.vault_snapshots b
WHERE a.vault_id = b.vault_id 
  AND a.created_at < b.created_at;

-- Now add the unique constraint
ALTER TABLE public.vault_snapshots 
  ADD CONSTRAINT vault_snapshots_vault_id_unique UNIQUE (vault_id);

-- Update comments
COMMENT ON TABLE public.vault_snapshots IS 'Latest shallow snapshot per vault for fast cold start. Client creates and uploads when threshold exceeded.';
COMMENT ON COLUMN public.vault_snapshots.version_vector IS 'Loro version vector as JSON string. Plaintext for server-side filtering.';
COMMENT ON COLUMN public.vault_snapshots.updated_at IS 'When this snapshot was last updated';

-- ============================================
-- ENABLE RLS ON vault_ops
-- ============================================

ALTER TABLE public.vault_ops ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: vault_ops
-- ============================================

CREATE POLICY "Members can read ops"
  ON public.vault_ops FOR SELECT
  USING (public.is_vault_member(vault_id));

CREATE POLICY "Members can create ops"
  ON public.vault_ops FOR INSERT
  WITH CHECK (public.is_vault_member(vault_id));

-- No delete policy - ops are kept forever
-- If needed for admin cleanup, use service role

-- ============================================
-- UPDATE REALTIME: Add vault_ops
-- ============================================

-- Add vault_ops to realtime publication for sync notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.vault_ops;

-- ============================================
-- HELPER FUNCTION: Get ops stats since snapshot
-- ============================================
-- Used by server to decide ops vs snapshot for sync

CREATE OR REPLACE FUNCTION public.get_ops_stats_since_snapshot(p_vault_id UUID)
RETURNS TABLE (
  op_count BIGINT,
  total_bytes BIGINT,
  snapshot_updated_at TIMESTAMPTZ
) AS $$
  SELECT 
    COUNT(o.id) as op_count,
    COALESCE(SUM(LENGTH(o.encrypted_data)), 0) as total_bytes,
    s.updated_at as snapshot_updated_at
  FROM public.vault_snapshots s
  LEFT JOIN public.vault_ops o ON o.vault_id = s.vault_id 
    AND o.created_at > COALESCE(s.updated_at, '1970-01-01'::timestamptz)
  WHERE s.vault_id = p_vault_id
  GROUP BY s.updated_at;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_ops_stats_since_snapshot(UUID) IS 
  'Returns count and total bytes of ops since last snapshot. Used to decide ops vs snapshot for sync.';
