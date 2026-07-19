BEGIN;

CREATE TABLE public.request_nonces (
    pubkey_hash text NOT NULL CHECK (pubkey_hash ~ '^[0-9a-f]{64}$'),
    nonce text NOT NULL CHECK (length(nonce) BETWEEN 40 AND 64),
    request_timestamp_ms bigint NOT NULL,
    expires_at timestamptz NOT NULL,
    PRIMARY KEY (pubkey_hash, nonce)
);

COMMENT ON TABLE public.request_nonces IS
    'Short-lived replay claims for signatures whose public-key hash was derived after verification.';

CREATE INDEX request_nonces_expires_at_idx ON public.request_nonces (expires_at);

CREATE OR REPLACE FUNCTION public.claim_request_nonce(
    p_pubkey_hash text,
    p_nonce text,
    p_request_timestamp_ms bigint
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    inserted_count integer;
BEGIN
    IF p_pubkey_hash !~ '^[0-9a-f]{64}$'
        OR length(p_nonce) NOT BETWEEN 40 AND 64
        OR abs((extract(epoch FROM clock_timestamp()) * 1000)::bigint - p_request_timestamp_ms) > 300000
    THEN
        RETURN false;
    END IF;

    DELETE FROM public.request_nonces WHERE expires_at < clock_timestamp();

    INSERT INTO public.request_nonces (pubkey_hash, nonce, request_timestamp_ms, expires_at)
    VALUES (
        p_pubkey_hash,
        p_nonce,
        p_request_timestamp_ms,
        to_timestamp(p_request_timestamp_ms / 1000.0) + interval '6 minutes'
    )
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RETURN inserted_count = 1;
END;
$$;

COMMENT ON FUNCTION public.claim_request_nonce(text, text, bigint) IS
    'Atomically accepts one fresh nonce for a server-verified Ed25519 public-key hash.';

ALTER TABLE public.vaults ADD COLUMN deleted_at timestamptz;

CREATE OR REPLACE FUNCTION public.create_vault_for_owner(
    p_owner_pubkey_hash text,
    p_encrypted_vault_key text,
    p_enc_public_key text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    created_vault_id uuid;
BEGIN
    INSERT INTO public.vaults DEFAULT VALUES RETURNING id INTO created_vault_id;
    INSERT INTO public.vault_memberships (
        vault_id,
        pubkey_hash,
        encrypted_vault_key,
        role,
        enc_public_key
    ) VALUES (
        created_vault_id,
        p_owner_pubkey_hash,
        p_encrypted_vault_key,
        'owner',
        p_enc_public_key
    );
    RETURN created_vault_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_vault(
    p_vault_id uuid,
    p_owner_pubkey_hash text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.vault_memberships
        WHERE vault_id = p_vault_id
          AND pubkey_hash = p_owner_pubkey_hash
          AND role = 'owner'
    ) THEN
        RETURN false;
    END IF;

    UPDATE public.vaults
    SET deleted_at = clock_timestamp()
    WHERE id = p_vault_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    DELETE FROM public.vault_invites WHERE vault_id = p_vault_id;
    DELETE FROM public.vault_memberships WHERE vault_id = p_vault_id;
    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_vault_invite(
    p_invite_pubkey text,
    p_pubkey_hash text,
    p_encrypted_vault_key text,
    p_enc_public_key text
) RETURNS TABLE (vault_id uuid, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    selected_invite public.vault_invites%ROWTYPE;
BEGIN
    SELECT * INTO selected_invite
    FROM public.vault_invites
    WHERE invite_pubkey = p_invite_pubkey
      AND expires_at >= clock_timestamp()
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    INSERT INTO public.vault_memberships (
        vault_id,
        pubkey_hash,
        encrypted_vault_key,
        role,
        enc_public_key
    ) VALUES (
        selected_invite.vault_id,
        p_pubkey_hash,
        p_encrypted_vault_key,
        selected_invite.role,
        p_enc_public_key
    );

    DELETE FROM public.vault_invites WHERE id = selected_invite.id;
    RETURN QUERY SELECT selected_invite.vault_id, selected_invite.role;
END;
$$;

CREATE OR REPLACE FUNCTION public.rekey_vault_members(
    p_vault_id uuid,
    p_owner_pubkey_hash text,
    p_member_keys jsonb
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    membership_count integer;
BEGIN
    IF jsonb_typeof(p_member_keys) <> 'array' OR jsonb_array_length(p_member_keys) = 0 THEN
        RETURN false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.vault_memberships
        WHERE vault_id = p_vault_id
          AND pubkey_hash = p_owner_pubkey_hash
          AND role = 'owner'
    ) THEN
        RETURN false;
    END IF;

    SELECT count(*) INTO membership_count
    FROM public.vault_memberships WHERE vault_id = p_vault_id;

    IF membership_count <> jsonb_array_length(p_member_keys)
        OR EXISTS (
            SELECT key.pubkey_hash
            FROM jsonb_to_recordset(p_member_keys) AS key(pubkey_hash text, encrypted_vault_key text)
            GROUP BY key.pubkey_hash
            HAVING count(*) <> 1
        )
        OR EXISTS (
            SELECT 1
            FROM jsonb_to_recordset(p_member_keys) AS key(pubkey_hash text, encrypted_vault_key text)
            LEFT JOIN public.vault_memberships membership
              ON membership.vault_id = p_vault_id
             AND membership.pubkey_hash = key.pubkey_hash
            WHERE membership.id IS NULL OR key.encrypted_vault_key IS NULL OR key.encrypted_vault_key = ''
        )
    THEN
        RETURN false;
    END IF;

    UPDATE public.vault_memberships membership
    SET encrypted_vault_key = key.encrypted_vault_key
    FROM jsonb_to_recordset(p_member_keys) AS key(pubkey_hash text, encrypted_vault_key text)
    WHERE membership.vault_id = p_vault_id
      AND membership.pubkey_hash = key.pubkey_hash;

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.append_vault_ops(
    p_vault_id uuid,
    p_author_pubkey_hash text,
    p_ops jsonb
) RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.vault_memberships
        WHERE vault_id = p_vault_id AND pubkey_hash = p_author_pubkey_hash
    ) THEN
        RAISE EXCEPTION 'vault access denied' USING ERRCODE = '42501';
    END IF;

    IF jsonb_typeof(p_ops) <> 'array' THEN
        RAISE EXCEPTION 'invalid operation batch' USING ERRCODE = '22023';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM jsonb_to_recordset(p_ops) AS incoming(
            id uuid,
            encrypted_data text,
            version_vector text
        )
        JOIN public.vault_ops existing ON existing.id = incoming.id
        WHERE existing.vault_id <> p_vault_id
           OR existing.author_pubkey_hash <> p_author_pubkey_hash
           OR existing.encrypted_data <> incoming.encrypted_data
           OR existing.version_vector <> incoming.version_vector
    ) THEN
        RAISE EXCEPTION 'operation identity conflict' USING ERRCODE = '23505';
    END IF;

    RETURN QUERY
    INSERT INTO public.vault_ops (
        id, vault_id, encrypted_data, version_vector, author_pubkey_hash
    )
    SELECT
        incoming.id,
        p_vault_id,
        incoming.encrypted_data,
        incoming.version_vector,
        p_author_pubkey_hash
    FROM jsonb_to_recordset(p_ops) AS incoming(
        id uuid,
        encrypted_data text,
        version_vector text
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING vault_ops.id;
END;
$$;

ALTER TABLE public.vault_ops
    ADD COLUMN legacy_update_id uuid,
    ADD COLUMN legacy_base_snapshot_version integer,
    ADD COLUMN legacy_hlc_timestamp text;

CREATE UNIQUE INDEX vault_ops_legacy_update_id_key
    ON public.vault_ops (legacy_update_id)
    WHERE legacy_update_id IS NOT NULL;

INSERT INTO public.vault_ops (
    id,
    vault_id,
    version_vector,
    encrypted_data,
    author_pubkey_hash,
    created_at,
    legacy_update_id,
    legacy_base_snapshot_version,
    legacy_hlc_timestamp
)
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM public.vault_ops existing_op
            WHERE existing_op.id = extensions.uuid_generate_v5(
                extensions.uuid_ns_url(),
                'moneyflow:legacy-vault-update:' || update_row.id::text
            )
        ) THEN extensions.uuid_generate_v5(
            extensions.uuid_ns_oid(),
            'moneyflow:legacy-vault-update:' || update_row.id::text
        )
        ELSE extensions.uuid_generate_v5(
            extensions.uuid_ns_url(),
            'moneyflow:legacy-vault-update:' || update_row.id::text
        )
    END,
    update_row.vault_id,
    update_row.hlc_timestamp,
    update_row.encrypted_data,
    update_row.author_pubkey_hash,
    update_row.created_at,
    update_row.id,
    update_row.base_snapshot_version,
    update_row.hlc_timestamp
FROM public.vault_updates AS update_row
ON CONFLICT (legacy_update_id) WHERE legacy_update_id IS NOT NULL DO NOTHING;

DO $$
BEGIN
    IF (
        SELECT count(*) FROM public.vault_updates
    ) <> (
        SELECT count(*) FROM public.vault_ops WHERE legacy_update_id IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Legacy vault update migration did not preserve every row';
    END IF;
END;
$$;

ALTER PUBLICATION supabase_realtime DROP TABLE public.vault_updates;

ALTER TABLE public.vault_updates RENAME TO vault_updates_legacy;
COMMENT ON TABLE public.vault_updates_legacy IS
    'Read-only rollback quarantine. Every row is preserved in append-only vault_ops.';

ALTER TABLE public.vault_ops DROP CONSTRAINT vault_ops_vault_id_fkey;
ALTER TABLE public.vault_ops
    ADD CONSTRAINT vault_ops_vault_id_fkey
    FOREIGN KEY (vault_id) REFERENCES public.vaults(id) ON DELETE RESTRICT;

ALTER TABLE public.vault_updates_legacy DROP CONSTRAINT vault_updates_vault_id_fkey;
ALTER TABLE public.vault_updates_legacy
    ADD CONSTRAINT vault_updates_legacy_vault_id_fkey
    FOREIGN KEY (vault_id) REFERENCES public.vaults(id) ON DELETE RESTRICT;

DROP INDEX public.idx_vault_ops_vault_id;
DROP INDEX public.idx_vault_ops_vault_created;
CREATE INDEX idx_vault_ops_vault_created_id
    ON public.vault_ops (vault_id, created_at, id);
CREATE INDEX idx_vault_memberships_pubkey_vault
    ON public.vault_memberships (pubkey_hash, vault_id);
CREATE INDEX idx_vault_invites_vault_created
    ON public.vault_invites (vault_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.reject_vault_op_mutation() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    RAISE EXCEPTION 'vault_ops is append-only';
END;
$$;

CREATE TRIGGER vault_ops_append_only
BEFORE UPDATE OR DELETE ON public.vault_ops
FOR EACH ROW EXECUTE FUNCTION public.reject_vault_op_mutation();

CREATE VIEW public.vault_updates
WITH (security_invoker = true)
AS
SELECT
    id,
    vault_id,
    COALESCE(legacy_base_snapshot_version, 0) AS base_snapshot_version,
    COALESCE(legacy_hlc_timestamp, version_vector) AS hlc_timestamp,
    encrypted_data,
    author_pubkey_hash,
    created_at
FROM public.vault_ops;

COMMENT ON VIEW public.vault_updates IS
    'Rolling-server compatibility view backed only by permanent vault_ops.';

CREATE OR REPLACE FUNCTION public.route_legacy_vault_update() RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    inserted_id uuid := COALESCE(NEW.id, extensions.uuid_generate_v4());
BEGIN
    INSERT INTO public.vault_ops (
        id,
        vault_id,
        version_vector,
        encrypted_data,
        author_pubkey_hash,
        created_at,
        legacy_base_snapshot_version,
        legacy_hlc_timestamp
    ) VALUES (
        inserted_id,
        NEW.vault_id,
        NEW.hlc_timestamp,
        NEW.encrypted_data,
        NEW.author_pubkey_hash,
        COALESCE(NEW.created_at, clock_timestamp()),
        NEW.base_snapshot_version,
        NEW.hlc_timestamp
    );

    NEW.id := inserted_id;
    NEW.created_at := COALESCE(NEW.created_at, clock_timestamp());
    RETURN NEW;
END;
$$;

CREATE TRIGGER vault_updates_compatibility_insert
INSTEAD OF INSERT ON public.vault_updates
FOR EACH ROW EXECUTE FUNCTION public.route_legacy_vault_update();

DROP POLICY "Invites deletable" ON public.vault_invites;
DROP POLICY "Invites readable by invite_pubkey" ON public.vault_invites;
DROP POLICY "Members can create ops" ON public.vault_ops;
DROP POLICY "Members can create snapshots" ON public.vault_snapshots;
DROP POLICY "Members can create updates" ON public.vault_updates_legacy;
DROP POLICY "Members can delete snapshots" ON public.vault_snapshots;
DROP POLICY "Members can delete updates" ON public.vault_updates_legacy;
DROP POLICY "Members can leave or owners can remove" ON public.vault_memberships;
DROP POLICY "Members can read ops" ON public.vault_ops;
DROP POLICY "Members can read snapshots" ON public.vault_snapshots;
DROP POLICY "Members can read updates" ON public.vault_updates_legacy;
DROP POLICY "Members can view vault memberships" ON public.vault_memberships;
DROP POLICY "Members can view vaults" ON public.vaults;
DROP POLICY "Owners can add members" ON public.vault_memberships;
DROP POLICY "Owners can create invites" ON public.vault_invites;
DROP POLICY "Owners can delete vaults" ON public.vaults;
DROP POLICY "Users can access own data" ON public.user_data;
DROP POLICY "Users can create vaults" ON public.vaults;

DROP FUNCTION public.is_vault_member(uuid);
DROP FUNCTION public.is_vault_owner(uuid);
DROP FUNCTION public.current_pubkey_hash();
DROP FUNCTION public.get_ops_stats_since_snapshot(uuid);

CREATE OR REPLACE FUNCTION public.cleanup_expired_invites() RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    DELETE FROM public.vault_invites WHERE expires_at < clock_timestamp();
$$;

CREATE POLICY "Direct API access denied" ON public.user_data
    AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Direct API access denied" ON public.vaults
    AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Direct API access denied" ON public.vault_memberships
    AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Direct API access denied" ON public.vault_invites
    AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Direct API access denied" ON public.vault_ops
    AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Direct API access denied" ON public.vault_snapshots
    AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Direct API access denied" ON public.vault_updates_legacy
    AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
ALTER TABLE public.request_nonces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Direct API access denied" ON public.request_nonces
    AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE ON public.user_data TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.vaults TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vault_memberships TO service_role;
GRANT SELECT, INSERT, DELETE ON public.vault_invites TO service_role;
GRANT SELECT, INSERT ON public.vault_ops TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.vault_snapshots TO service_role;
GRANT SELECT, INSERT ON public.vault_updates TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_request_nonce(text, text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_vault_for_owner(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.soft_delete_vault(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.accept_vault_invite(text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.rekey_vault_members(uuid, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.append_vault_ops(uuid, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_invites() TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON SEQUENCES FROM anon, authenticated;

COMMIT;
