BEGIN;

CREATE TABLE public.realtime_grants (
    id uuid PRIMARY KEY,
    vault_id uuid NOT NULL REFERENCES public.vaults(id),
    pubkey_hash text NOT NULL CHECK (pubkey_hash ~ '^[0-9a-f]{64}$'),
    vault_role text NOT NULL CHECK (vault_role IN ('owner', 'member')),
    purpose text NOT NULL CHECK (purpose IN ('sync', 'presence')),
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

COMMENT ON TABLE public.realtime_grants IS
    'Server-minted short-lived Realtime grants. Browser JWTs contain only the opaque grant id.';

CREATE INDEX realtime_grants_active_membership_idx
    ON public.realtime_grants (vault_id, pubkey_hash, purpose, expires_at)
    WHERE revoked_at IS NULL;

ALTER TABLE public.realtime_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtime_grants FORCE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_realtime_claims()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
    SELECT COALESCE(
        NULLIF(current_setting('request.jwt.claims', true), '')::jsonb,
        '{}'::jsonb
    );
$$;

CREATE OR REPLACE FUNCTION public.realtime_grant_allows(
    p_vault_id uuid,
    p_purpose text
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.realtime_grants grant_row
        JOIN public.vault_memberships membership
          ON membership.vault_id = grant_row.vault_id
         AND membership.pubkey_hash = grant_row.pubkey_hash
         AND membership.role = grant_row.vault_role
        JOIN public.vaults vault ON vault.id = grant_row.vault_id
        CROSS JOIN LATERAL public.current_realtime_claims() claims
        WHERE grant_row.id::text = claims ->> 'jti'
          AND grant_row.vault_id = p_vault_id
          AND grant_row.purpose = p_purpose
          AND grant_row.revoked_at IS NULL
          AND grant_row.expires_at > clock_timestamp()
          AND vault.deleted_at IS NULL
          AND claims ->> 'role' = 'authenticated'
          AND claims ->> 'vault_id' = p_vault_id::text
          AND claims ->> 'realtime_table' = 'vault_ops'
          AND claims ->> 'realtime_purpose' = p_purpose
          AND claims ->> 'realtime_topic' = 'vault:' || p_vault_id::text || ':' || p_purpose
          AND claims ->> 'vault_role' = grant_row.vault_role
    );
$$;

CREATE OR REPLACE FUNCTION public.realtime_topic_allowed(
    p_topic text,
    p_extension text
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    claims jsonb := public.current_realtime_claims();
    claimed_vault_id text := claims ->> 'vault_id';
    claimed_purpose text := claims ->> 'realtime_purpose';
BEGIN
    IF claimed_vault_id IS NULL
        OR claimed_vault_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        OR p_topic <> claims ->> 'realtime_topic'
        OR NOT (
            (claimed_purpose = 'sync' AND p_extension = 'broadcast')
            OR (claimed_purpose = 'presence' AND p_extension = 'presence')
        )
    THEN
        RETURN false;
    END IF;

    RETURN public.realtime_grant_allows(claimed_vault_id::uuid, claimed_purpose);
END;
$$;

CREATE OR REPLACE FUNCTION public.rotate_realtime_grant(
    p_pubkey_hash text,
    p_vault_id uuid,
    p_purpose text,
    p_previous_grant_id uuid,
    p_ttl_seconds integer
) RETURNS TABLE (grant_id uuid, vault_role text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    selected_role text;
    created_grant_id uuid := gen_random_uuid();
    created_expiry timestamptz := clock_timestamp() + make_interval(secs => p_ttl_seconds);
    revoked_count integer;
BEGIN
    IF p_pubkey_hash !~ '^[0-9a-f]{64}$'
        OR p_purpose NOT IN ('sync', 'presence')
        OR p_ttl_seconds NOT BETWEEN 30 AND 300
    THEN
        RAISE EXCEPTION 'realtime grant denied' USING ERRCODE = '42501';
    END IF;

    SELECT membership.role INTO selected_role
    FROM public.vault_memberships membership
    JOIN public.vaults vault ON vault.id = membership.vault_id
    WHERE membership.vault_id = p_vault_id
      AND membership.pubkey_hash = p_pubkey_hash
      AND membership.role IN ('owner', 'member')
      AND vault.deleted_at IS NULL
    FOR SHARE OF membership, vault;

    IF selected_role IS NULL THEN
        RAISE EXCEPTION 'realtime grant denied' USING ERRCODE = '42501';
    END IF;

    IF p_previous_grant_id <> '00000000-0000-0000-0000-000000000000'::uuid THEN
        UPDATE public.realtime_grants
        SET revoked_at = clock_timestamp()
        WHERE id = p_previous_grant_id
          AND vault_id = p_vault_id
          AND pubkey_hash = p_pubkey_hash
          AND purpose = p_purpose
          AND revoked_at IS NULL;
        GET DIAGNOSTICS revoked_count = ROW_COUNT;
        IF revoked_count <> 1 THEN
            RAISE EXCEPTION 'realtime grant rotation denied' USING ERRCODE = '42501';
        END IF;
    END IF;

    -- A caller may lose its in-memory previous id during a process restart. Keep the database
    -- invariant stronger than the browser lifecycle: only one live grant exists for a member's
    -- exact vault/purpose, including sentinel-based initial minting.
    UPDATE public.realtime_grants grant_row
    SET revoked_at = COALESCE(grant_row.revoked_at, clock_timestamp())
    WHERE grant_row.pubkey_hash = p_pubkey_hash
      AND grant_row.vault_id = p_vault_id
      AND grant_row.purpose = p_purpose
      AND grant_row.revoked_at IS NULL;

    INSERT INTO public.realtime_grants (
        id, vault_id, pubkey_hash, vault_role, purpose, expires_at
    ) VALUES (
        created_grant_id, p_vault_id, p_pubkey_hash, selected_role, p_purpose, created_expiry
    );

    RETURN QUERY SELECT created_grant_id, selected_role, created_expiry;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_realtime_grant(
    p_pubkey_hash text,
    p_vault_id uuid,
    p_purpose text,
    p_grant_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.realtime_grants
    SET revoked_at = COALESCE(revoked_at, clock_timestamp())
    WHERE id = p_grant_id
      AND vault_id = p_vault_id
      AND pubkey_hash = p_pubkey_hash
      AND purpose = p_purpose;
    RETURN FOUND;
END;
$$;

DROP POLICY "Direct API access denied" ON public.vault_ops;
CREATE POLICY "Exact live Realtime grant reads vault ops"
ON public.vault_ops
FOR SELECT
TO authenticated
USING (public.realtime_grant_allows(vault_id, 'sync'));

DROP POLICY IF EXISTS "MoneyFlow private Realtime receives" ON realtime.messages;
CREATE POLICY "MoneyFlow private Realtime receives"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.realtime_topic_allowed(realtime.topic(), extension::text));

DROP POLICY IF EXISTS "MoneyFlow private Realtime sends" ON realtime.messages;
CREATE POLICY "MoneyFlow private Realtime sends"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (public.realtime_topic_allowed(realtime.topic(), extension::text));

REVOKE ALL ON public.realtime_grants FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.current_realtime_claims() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.realtime_grant_allows(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.realtime_topic_allowed(text, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.rotate_realtime_grant(text, uuid, text, uuid, integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.revoke_realtime_grant(text, uuid, text, uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON public.vault_ops TO authenticated;
GRANT SELECT, INSERT ON realtime.messages TO authenticated;
GRANT EXECUTE ON FUNCTION public.realtime_grant_allows(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.realtime_topic_allowed(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_realtime_grant(text, uuid, text, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_realtime_grant(text, uuid, text, uuid) TO service_role;

COMMIT;
