BEGIN;

-- WebAuthn PRF passkey credentials.
--
-- This table holds NO plaintext secret. `wrapped_secret` is a client-side XChaCha20-Poly1305
-- envelope around the user's master identity secret, encrypted under a key-encryption key derived
-- from the credential's WebAuthn PRF output. That PRF output never leaves the browser, so the
-- server cannot open the envelope. Every other column is non-secret WebAuthn metadata needed to
-- verify future assertions.
CREATE TABLE public.passkey_credentials (
    credential_id text PRIMARY KEY CHECK (length(credential_id) BETWEEN 16 AND 1023),
    pubkey_hash text NOT NULL CHECK (pubkey_hash ~ '^[0-9a-f]{64}$'),
    public_key text NOT NULL CHECK (length(public_key) BETWEEN 16 AND 4096),
    counter bigint NOT NULL DEFAULT 0 CHECK (counter >= 0),
    transports text[] NOT NULL DEFAULT '{}',
    aaguid text,
    backed_up boolean NOT NULL DEFAULT false,
    device_type text NOT NULL DEFAULT 'singleDevice'
        CHECK (device_type IN ('singleDevice', 'multiDevice')),
    wrapped_secret text NOT NULL CHECK (length(wrapped_secret) BETWEEN 32 AND 4096),
    wrap_version smallint NOT NULL DEFAULT 1 CHECK (wrap_version > 0),
    label text NOT NULL DEFAULT '' CHECK (length(label) <= 64),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    last_used_at timestamptz
);

COMMENT ON TABLE public.passkey_credentials IS
    'WebAuthn credential metadata plus the client-encrypted wrapped master identity secret.';
COMMENT ON COLUMN public.passkey_credentials.wrapped_secret IS
    'Client-side ciphertext. The PRF-derived key that opens it never reaches the server.';

CREATE INDEX passkey_credentials_pubkey_hash_idx
    ON public.passkey_credentials (pubkey_hash, created_at);

-- Server-generated single-use WebAuthn challenges. Modelled on request_nonces from
-- 006_rls_hardening.sql: a challenge is claimable exactly once, and expiry is enforced in the
-- database rather than trusted from the caller.
CREATE TABLE public.passkey_challenges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge text NOT NULL CHECK (length(challenge) BETWEEN 16 AND 256),
    ceremony text NOT NULL CHECK (ceremony IN ('registration', 'authentication')),
    pubkey_hash text CHECK (pubkey_hash ~ '^[0-9a-f]{64}$'),
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

COMMENT ON TABLE public.passkey_challenges IS
    'Single-use server-minted WebAuthn challenges. A claimed row is deleted, never reusable.';

CREATE INDEX passkey_challenges_expires_at_idx ON public.passkey_challenges (expires_at);

-- Mints a challenge for one ceremony. Registration challenges are bound to the verified identity
-- that requested them; authentication challenges are not, because the caller has no identity yet.
-- `p_pubkey_hash` is defaulted rather than required: an authentication challenge is minted before
-- the caller has any identity, so there is genuinely nothing to bind it to.
CREATE OR REPLACE FUNCTION public.create_passkey_challenge(
    p_challenge text,
    p_ceremony text,
    p_ttl_seconds integer,
    p_pubkey_hash text DEFAULT NULL
) RETURNS TABLE (challenge_id uuid, challenge text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    created_id uuid;
BEGIN
    IF p_ceremony NOT IN ('registration', 'authentication')
        OR length(p_challenge) NOT BETWEEN 16 AND 256
        OR p_ttl_seconds NOT BETWEEN 30 AND 600
        OR (p_ceremony = 'registration' AND p_pubkey_hash IS NULL)
        OR (p_pubkey_hash IS NOT NULL AND p_pubkey_hash !~ '^[0-9a-f]{64}$')
    THEN
        RAISE EXCEPTION 'invalid passkey challenge request' USING ERRCODE = '22023';
    END IF;

    DELETE FROM public.passkey_challenges WHERE expires_at < clock_timestamp();

    INSERT INTO public.passkey_challenges (challenge, ceremony, pubkey_hash, expires_at)
    VALUES (
        p_challenge,
        p_ceremony,
        p_pubkey_hash,
        clock_timestamp() + make_interval(secs => p_ttl_seconds)
    )
    RETURNING id INTO created_id;

    RETURN QUERY SELECT created_id, p_challenge;
END;
$$;

COMMENT ON FUNCTION public.create_passkey_challenge(text, text, integer, text) IS
    'Mints one short-lived single-use WebAuthn challenge.';

-- Atomically consumes a challenge. Deleting on claim is what makes replay impossible: a second
-- attempt with the same id returns no rows regardless of timing.
CREATE OR REPLACE FUNCTION public.claim_passkey_challenge(
    p_challenge_id uuid,
    p_ceremony text
) RETURNS TABLE (challenge text, pubkey_hash text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    DELETE FROM public.passkey_challenges
    WHERE id = p_challenge_id
      AND ceremony = p_ceremony
      AND expires_at >= clock_timestamp()
    RETURNING passkey_challenges.challenge, passkey_challenges.pubkey_hash;
END;
$$;

COMMENT ON FUNCTION public.claim_passkey_challenge(uuid, text) IS
    'Consumes a challenge exactly once. Returns no rows for a replayed, expired or wrong-ceremony id.';

-- Registers a verified credential against exactly the caller's identity.
CREATE OR REPLACE FUNCTION public.register_passkey_credential(
    p_pubkey_hash text,
    p_credential_id text,
    p_public_key text,
    p_counter bigint,
    p_transports text[],
    p_aaguid text,
    p_backed_up boolean,
    p_device_type text,
    p_wrapped_secret text,
    p_wrap_version smallint,
    p_label text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF p_pubkey_hash !~ '^[0-9a-f]{64}$' THEN
        RAISE EXCEPTION 'passkey registration denied' USING ERRCODE = '42501';
    END IF;

    -- A credential id is globally unique. Re-registering an existing one must never silently
    -- rebind it to another identity or overwrite another identity's wrapped secret.
    IF EXISTS (
        SELECT 1 FROM public.passkey_credentials
        WHERE credential_id = p_credential_id AND pubkey_hash <> p_pubkey_hash
    ) THEN
        RAISE EXCEPTION 'passkey registration denied' USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.passkey_credentials (
        credential_id, pubkey_hash, public_key, counter, transports, aaguid,
        backed_up, device_type, wrapped_secret, wrap_version, label
    ) VALUES (
        p_credential_id, p_pubkey_hash, p_public_key, p_counter, COALESCE(p_transports, '{}'),
        p_aaguid, p_backed_up, p_device_type, p_wrapped_secret, p_wrap_version,
        COALESCE(p_label, '')
    )
    ON CONFLICT (credential_id) DO NOTHING;

    RETURN FOUND;
END;
$$;

-- Records a successful assertion. The counter is monotonic: a replayed or cloned authenticator
-- presenting a stale counter cannot roll it back.
CREATE OR REPLACE FUNCTION public.record_passkey_authentication(
    p_credential_id text,
    p_counter bigint
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.passkey_credentials
    SET counter = GREATEST(counter, p_counter),
        last_used_at = clock_timestamp()
    WHERE credential_id = p_credential_id;

    RETURN FOUND;
END;
$$;

-- Deletes a credential and, with it, the only copy of that credential's wrapped secret. A
-- revoked authenticator therefore unlocks nothing even if the attacker still holds it.
CREATE OR REPLACE FUNCTION public.revoke_passkey_credential(
    p_pubkey_hash text,
    p_credential_id text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    DELETE FROM public.passkey_credentials
    WHERE credential_id = p_credential_id
      AND pubkey_hash = p_pubkey_hash;

    RETURN FOUND;
END;
$$;

-- Same posture as 006_rls_hardening.sql: no direct PostgREST access to either table under any
-- role. All access is mediated by the signed tRPC layer through the functions above.
ALTER TABLE public.passkey_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passkey_credentials FORCE ROW LEVEL SECURITY;
CREATE POLICY "Direct API access denied" ON public.passkey_credentials
    AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

ALTER TABLE public.passkey_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passkey_challenges FORCE ROW LEVEL SECURITY;
CREATE POLICY "Direct API access denied" ON public.passkey_challenges
    AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

REVOKE ALL ON public.passkey_credentials FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.passkey_challenges FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON public.passkey_credentials TO service_role;

REVOKE ALL ON FUNCTION public.create_passkey_challenge(text, text, integer, text)
    FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.claim_passkey_challenge(uuid, text)
    FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.register_passkey_credential(
    text, text, text, bigint, text[], text, boolean, text, text, smallint, text
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.record_passkey_authentication(text, bigint)
    FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.revoke_passkey_credential(text, text)
    FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.create_passkey_challenge(text, text, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_passkey_challenge(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.register_passkey_credential(
    text, text, text, bigint, text[], text, boolean, text, text, smallint, text
) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_passkey_authentication(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_passkey_credential(text, text) TO service_role;

COMMIT;
