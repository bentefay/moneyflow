BEGIN;

-- This intentionally deletes the unused opaque legacy blob. It cannot be reconstructed by a down
-- migration; recovery requires a pre-migration backup. Identity and registration metadata stay on
-- the existing row, while vault keys and content remain in their normalized encrypted stores.
ALTER TABLE public.user_data
    DROP COLUMN encrypted_data;

COMMENT ON TABLE public.user_data IS
    'Verified public-key identity registry. Vault access and encrypted content live in vault-scoped tables.';

REVOKE UPDATE ON public.user_data FROM service_role;

COMMIT;
