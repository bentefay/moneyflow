-- ============================================
-- MoneyFlow - Fix Function Search Path Security
-- ============================================
-- Addresses "role mutable search_path" warning by setting
-- an immutable search_path on all public functions.
-- See: https://supabase.com/docs/guides/database/database-linter

-- Fix current_pubkey_hash function
CREATE OR REPLACE FUNCTION public.current_pubkey_hash()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('request.pubkey_hash', true), '');
$$ LANGUAGE sql STABLE
SET search_path = '';

-- Fix is_vault_member function
CREATE OR REPLACE FUNCTION public.is_vault_member(p_vault_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vault_memberships
    WHERE vault_id = p_vault_id
      AND pubkey_hash = public.current_pubkey_hash()
  );
$$ LANGUAGE sql SECURITY DEFINER
SET search_path = '';

-- Fix is_vault_owner function
CREATE OR REPLACE FUNCTION public.is_vault_owner(p_vault_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vault_memberships
    WHERE vault_id = p_vault_id
      AND pubkey_hash = public.current_pubkey_hash()
      AND role = 'owner'
  );
$$ LANGUAGE sql SECURITY DEFINER
SET search_path = '';

-- Fix cleanup_expired_invites function
CREATE OR REPLACE FUNCTION public.cleanup_expired_invites()
RETURNS void AS $$
  DELETE FROM public.vault_invites WHERE expires_at < NOW();
$$ LANGUAGE sql
SET search_path = '';
