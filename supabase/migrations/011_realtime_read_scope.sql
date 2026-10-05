-- Scopes the authenticated `vault_ops` read policy to the grant's own vault by an indexable
-- equality, so an unfiltered enumeration is an index scan instead of a whole-table scan.
--
-- This is a logical no-op: `realtime_grant_allows` already requires
-- `claims ->> 'vault_id' = p_vault_id::text`, so no row could ever pass the old predicate with a
-- `vault_id` different from the claim's. Stating that equality directly in the policy makes it
-- visible to the planner as an index condition on `idx_vault_ops_vault_created_id`.
--
-- Without it, every authenticated read of `vault_ops` — including the deliberately unfiltered
-- enumeration the origin-controls security test performs — evaluates the SECURITY DEFINER grant
-- check once per row in the whole table. Measured on a local stack holding 350,160 ops that is a
-- 4,866 ms sequential scan against PostgREST's 8 s `statement_timeout`, so concurrent load turns the
-- read into a 57014 timeout. The same query under this policy is a 1.8 ms index-only scan.

BEGIN;

-- Splitting the claim's vault out of `current_realtime_claims()` gives the planner a STABLE
-- uuid-returning expression it can use as an index parameter.
CREATE OR REPLACE FUNCTION public.current_realtime_vault_id() RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT nullif(public.current_realtime_claims() ->> 'vault_id', '')::uuid;
$$;

DROP POLICY "Exact live Realtime grant reads vault ops" ON public.vault_ops;
CREATE POLICY "Exact live Realtime grant reads vault ops"
ON public.vault_ops
FOR SELECT
TO authenticated
USING (
    vault_id = public.current_realtime_vault_id()
    AND public.realtime_grant_allows(vault_id, 'sync')
);

REVOKE ALL ON FUNCTION public.current_realtime_vault_id() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_realtime_vault_id() TO authenticated;

COMMIT;
