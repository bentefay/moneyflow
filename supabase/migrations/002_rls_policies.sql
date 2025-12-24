-- ============================================
-- MoneyFlow Core MVP - RLS Policies
-- ============================================
-- Row Level Security policies for pubkey_hash-based access control

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get current user's pubkey_hash from request header
-- Set via tRPC middleware after signature verification
CREATE OR REPLACE FUNCTION public.current_pubkey_hash()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('request.pubkey_hash', true), '');
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION public.current_pubkey_hash() IS 
  'Returns pubkey_hash from request context (set by tRPC middleware after Ed25519 signature verification)';

-- Check if current user is a vault member
CREATE OR REPLACE FUNCTION public.is_vault_member(p_vault_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vault_memberships
    WHERE vault_id = p_vault_id
      AND pubkey_hash = public.current_pubkey_hash()
  );
$$ LANGUAGE sql SECURITY DEFINER;

COMMENT ON FUNCTION public.is_vault_member(UUID) IS 
  'Checks if the current user (by pubkey_hash) is a member of the specified vault';

-- Check if current user is vault owner
CREATE OR REPLACE FUNCTION public.is_vault_owner(p_vault_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vault_memberships
    WHERE vault_id = p_vault_id
      AND pubkey_hash = public.current_pubkey_hash()
      AND role = 'owner'
  );
$$ LANGUAGE sql SECURITY DEFINER;

COMMENT ON FUNCTION public.is_vault_owner(UUID) IS 
  'Checks if the current user (by pubkey_hash) is an owner of the specified vault';

-- ============================================
-- RLS POLICIES: user_data
-- ============================================

-- Users can only read/write their own data
CREATE POLICY "Users can access own data"
  ON public.user_data FOR ALL
  USING (pubkey_hash = public.current_pubkey_hash())
  WITH CHECK (pubkey_hash = public.current_pubkey_hash());

-- ============================================
-- RLS POLICIES: vaults
-- ============================================

-- Users can only see vaults they're members of
CREATE POLICY "Members can view vaults"
  ON public.vaults FOR SELECT
  USING (public.is_vault_member(id));

-- Authenticated users can create vaults
CREATE POLICY "Users can create vaults"
  ON public.vaults FOR INSERT
  WITH CHECK (public.current_pubkey_hash() IS NOT NULL);

-- Only owners can delete vaults
CREATE POLICY "Owners can delete vaults"
  ON public.vaults FOR DELETE
  USING (public.is_vault_owner(id));

-- ============================================
-- RLS POLICIES: vault_memberships
-- ============================================

-- Users can see memberships for vaults they belong to
CREATE POLICY "Members can view vault memberships"
  ON public.vault_memberships FOR SELECT
  USING (public.is_vault_member(vault_id));

-- Only owners can add members (or first member for new vault)
CREATE POLICY "Owners can add members"
  ON public.vault_memberships FOR INSERT
  WITH CHECK (
    -- Allow first membership (vault creator becomes owner)
    NOT EXISTS (
      SELECT 1 FROM public.vault_memberships WHERE vault_id = vault_memberships.vault_id
    )
    -- Or allow owners to add new members
    OR public.is_vault_owner(vault_id)
  );

-- Users can remove themselves; owners can remove anyone
CREATE POLICY "Members can leave or owners can remove"
  ON public.vault_memberships FOR DELETE
  USING (
    pubkey_hash = public.current_pubkey_hash()
    OR public.is_vault_owner(vault_id)
  );

-- ============================================
-- RLS POLICIES: vault_invites
-- ============================================

-- Anyone can read invites by invite_pubkey (for redemption)
-- The invite_pubkey acts as a capability token
CREATE POLICY "Invites readable by invite_pubkey"
  ON public.vault_invites FOR SELECT
  USING (true);

-- Only vault owners can create invites
CREATE POLICY "Owners can create invites"
  ON public.vault_invites FOR INSERT
  WITH CHECK (public.is_vault_owner(vault_id));

-- Anyone can delete invites (for redemption cleanup)
-- Invites are single-use and should be deleted after redemption
CREATE POLICY "Invites deletable"
  ON public.vault_invites FOR DELETE
  USING (true);

-- ============================================
-- RLS POLICIES: vault_snapshots
-- ============================================

CREATE POLICY "Members can read snapshots"
  ON public.vault_snapshots FOR SELECT
  USING (public.is_vault_member(vault_id));

CREATE POLICY "Members can create snapshots"
  ON public.vault_snapshots FOR INSERT
  WITH CHECK (public.is_vault_member(vault_id));

CREATE POLICY "Members can delete snapshots"
  ON public.vault_snapshots FOR DELETE
  USING (public.is_vault_member(vault_id));

-- ============================================
-- RLS POLICIES: vault_updates
-- ============================================

CREATE POLICY "Members can read updates"
  ON public.vault_updates FOR SELECT
  USING (public.is_vault_member(vault_id));

CREATE POLICY "Members can create updates"
  ON public.vault_updates FOR INSERT
  WITH CHECK (public.is_vault_member(vault_id));

CREATE POLICY "Members can delete updates"
  ON public.vault_updates FOR DELETE
  USING (public.is_vault_member(vault_id));

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

-- Enable Realtime for vault_updates (sync notifications)
-- Note: Must create publication first if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.vault_updates;

-- Note: RLS automatically filters Realtime events.
-- Users only receive INSERT events for vaults they're members of.

-- ============================================
-- CLEANUP FUNCTION
-- ============================================

-- Function to delete expired invites (run via pg_cron or Edge Function)
CREATE OR REPLACE FUNCTION public.cleanup_expired_invites()
RETURNS void AS $$
  DELETE FROM public.vault_invites WHERE expires_at < NOW();
$$ LANGUAGE sql;

COMMENT ON FUNCTION public.cleanup_expired_invites() IS 
  'Deletes expired vault invites. Run periodically via pg_cron or Edge Function.';
