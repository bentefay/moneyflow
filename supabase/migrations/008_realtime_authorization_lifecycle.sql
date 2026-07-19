BEGIN;

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
            OR (claimed_purpose = 'presence' AND p_extension IN ('broadcast', 'presence'))
        )
    THEN
        RETURN false;
    END IF;

    RETURN public.realtime_grant_allows(claimed_vault_id::uuid, claimed_purpose);
END;
$$;

CREATE OR REPLACE FUNCTION public.realtime_topic_send_allowed(
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
    no_previous_grant_id constant uuid := '00000000-0000-0000-0000-000000000000'::uuid;
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

    -- Keep enough history for diagnostics and delayed refresh, but bound abandoned credentials.
    -- The explicitly presented predecessor is excluded so a backgrounded client can rotate it even
    -- after the retention window. Active sibling grants always have a future expiry and survive.
    DELETE FROM public.realtime_grants grant_row
    WHERE grant_row.pubkey_hash = p_pubkey_hash
      AND grant_row.vault_id = p_vault_id
      AND grant_row.purpose = p_purpose
      AND grant_row.id <> p_previous_grant_id
      AND (
          grant_row.expires_at <= clock_timestamp() - interval '5 minutes'
          OR grant_row.revoked_at <= clock_timestamp() - interval '5 minutes'
      );

    IF p_previous_grant_id <> no_previous_grant_id THEN
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

    INSERT INTO public.realtime_grants (
        id, vault_id, pubkey_hash, vault_role, purpose, expires_at
    ) VALUES (
        created_grant_id, p_vault_id, p_pubkey_hash, selected_role, p_purpose, created_expiry
    );

    RETURN QUERY SELECT created_grant_id, selected_role, created_expiry;
END;
$$;

DROP POLICY "MoneyFlow private Realtime receives" ON realtime.messages;
CREATE POLICY "MoneyFlow private Realtime receives"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.realtime_topic_allowed(realtime.topic(), extension::text));

DROP POLICY "MoneyFlow private Realtime sends" ON realtime.messages;
CREATE POLICY "MoneyFlow private Realtime sends"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (public.realtime_topic_send_allowed(realtime.topic(), extension::text));

REVOKE ALL ON FUNCTION public.realtime_topic_send_allowed(text, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.realtime_topic_send_allowed(text, text) TO authenticated;

COMMIT;
