BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(49);

SELECT has_table('public', 'request_nonces', 'replay table exists');
SELECT has_table('public', 'vault_updates_legacy', 'legacy rows are quarantined');
SELECT has_view('public', 'vault_updates', 'rolling compatibility view exists');
SELECT has_function('public', 'claim_request_nonce', ARRAY['text', 'text', 'bigint']);
SELECT has_function('public', 'accept_vault_invite', ARRAY['text', 'text', 'text', 'text']);
SELECT has_function('public', 'create_vault_for_owner', ARRAY['text', 'text', 'text']);
SELECT has_function('public', 'soft_delete_vault', ARRAY['uuid', 'text']);
SELECT has_function('public', 'rekey_vault_members', ARRAY['uuid', 'text', 'jsonb']);
SELECT has_function('public', 'append_vault_ops', ARRAY['uuid', 'text', 'jsonb']);
SELECT hasnt_function('public', 'current_pubkey_hash', ARRAY[]::text[]);
SELECT hasnt_function('public', 'is_vault_member', ARRAY['uuid']);
SELECT hasnt_function('public', 'is_vault_owner', ARRAY['uuid']);

SELECT ok(NOT has_table_privilege('anon', 'public.user_data', 'SELECT'), 'anon cannot read users');
SELECT ok(NOT has_table_privilege('authenticated', 'public.user_data', 'SELECT'), 'authenticated cannot read users');
SELECT ok(NOT has_table_privilege('anon', 'public.vault_invites', 'SELECT'), 'anon cannot enumerate invites');
SELECT ok(NOT has_table_privilege('authenticated', 'public.vault_invites', 'DELETE'), 'authenticated cannot delete invites');
SELECT ok(NOT has_table_privilege('anon', 'public.vault_ops', 'SELECT'), 'anon cannot read ops');
SELECT ok(NOT has_table_privilege('authenticated', 'public.vault_ops', 'INSERT'), 'authenticated cannot spoof ops');
SELECT ok(has_table_privilege('service_role', 'public.vault_ops', 'SELECT'), 'service role can read authorized ops');
SELECT ok(has_table_privilege('service_role', 'public.vault_ops', 'INSERT'), 'service role can append authorized ops');
SELECT ok(NOT has_table_privilege('service_role', 'public.vault_ops', 'UPDATE'), 'service role cannot rewrite ops');
SELECT ok(NOT has_table_privilege('service_role', 'public.vault_ops', 'DELETE'), 'service role cannot delete ops');
SELECT ok(NOT has_table_privilege('service_role', 'public.vaults', 'DELETE'), 'service role cannot hard-delete vaults');
SELECT ok(has_function_privilege('service_role', 'public.claim_request_nonce(text,text,bigint)', 'EXECUTE'), 'service role can claim verified nonce');
SELECT ok(NOT has_function_privilege('anon', 'public.claim_request_nonce(text,text,bigint)', 'EXECUTE'), 'anon cannot claim a hash');
SELECT is(
    (SELECT string_agg(tablename, ',' ORDER BY tablename) FROM pg_publication_tables WHERE pubname = 'supabase_realtime'),
    'vault_ops',
    'only permanent ops are published'
);
SELECT is((SELECT count(*) FROM pg_policies WHERE policyname = 'Direct API access denied'), 8::bigint, 'all tables explicitly deny direct API roles');

SELECT ok(public.claim_request_nonce(repeat('a', 64), repeat('b', 44), (extract(epoch FROM clock_timestamp()) * 1000)::bigint), 'fresh verified nonce is claimed');
SELECT ok(NOT public.claim_request_nonce(repeat('a', 64), repeat('b', 44), (extract(epoch FROM clock_timestamp()) * 1000)::bigint), 'replay is rejected atomically');

CREATE TEMP TABLE created_vault AS
SELECT public.create_vault_for_owner(repeat('1', 64), 'd3JhcHBlZA==', 'cHVibGlj') AS id;
SELECT ok((SELECT id IS NOT NULL FROM created_vault), 'vault and owner are created atomically');
SELECT is((SELECT role FROM public.vault_memberships WHERE vault_id = (SELECT id FROM created_vault)), 'owner', 'creator owns exact vault');

INSERT INTO public.vault_invites (
    id, vault_id, invite_pubkey, encrypted_vault_key, role, created_by, expires_at
) VALUES (
    '20000000-0000-4000-8000-000000000001',
    (SELECT id FROM created_vault),
    'aW52aXRlLXB1YmxpYw==',
    'd3JhcHBlZA==',
    'member',
    repeat('1', 64),
    clock_timestamp() + interval '1 hour'
);
SELECT results_eq(
    $$SELECT role FROM public.accept_vault_invite('aW52aXRlLXB1YmxpYw==', repeat('2', 64), 'bmV3LXdyYXBwZWQ=', 'bmV3LXB1YmxpYw==')$$,
    ARRAY['member'::text],
    'verified invitee becomes the configured role'
);
SELECT is((SELECT count(*) FROM public.vault_invites), 0::bigint, 'invite is consumed once');
SELECT is_empty(
    $$SELECT * FROM public.accept_vault_invite('aW52aXRlLXB1YmxpYw==', repeat('3', 64), 'bmV3LXdyYXBwZWQ=', 'bmV3LXB1YmxpYw==')$$,
    'invite replay yields no membership'
);
SELECT ok(
    NOT public.rekey_vault_members(
        (SELECT id FROM created_vault),
        repeat('1', 64),
        jsonb_build_array(jsonb_build_object('pubkey_hash', repeat('1', 64), 'encrypted_vault_key', 'b25seS1vd25lcg=='))
    ),
    'partial rekey set is rejected'
);
SELECT ok(
    public.rekey_vault_members(
        (SELECT id FROM created_vault),
        repeat('1', 64),
        jsonb_build_array(
            jsonb_build_object('pubkey_hash', repeat('1', 64), 'encrypted_vault_key', 'bmV3LW93bmVy'),
            jsonb_build_object('pubkey_hash', repeat('2', 64), 'encrypted_vault_key', 'bmV3LW1lbWJlcg==')
        )
    ),
    'complete exact rekey set is atomic'
);
SELECT results_eq(
    $$SELECT encrypted_vault_key FROM public.vault_memberships WHERE vault_id = (SELECT id FROM created_vault) ORDER BY pubkey_hash$$,
    $$VALUES ('bmV3LW93bmVy'::text), ('bmV3LW1lbWJlcg=='::text)$$,
    'all wrapped keys update together'
);
SELECT results_eq(
    $$SELECT public.append_vault_ops((SELECT id FROM created_vault), repeat('1', 64), '[{"id":"30000000-0000-4000-8000-000000000001","encrypted_data":"b3duZXItb3A=","version_vector":"owner-vector"}]')$$,
    $$VALUES ('30000000-0000-4000-8000-000000000001'::uuid)$$,
    'owner appends an operation to the exact vault'
);
SELECT results_eq(
    $$SELECT public.append_vault_ops((SELECT id FROM created_vault), repeat('2', 64), '[{"id":"30000000-0000-4000-8000-000000000002","encrypted_data":"bWVtYmVyLW9w","version_vector":"member-vector"}]')$$,
    $$VALUES ('30000000-0000-4000-8000-000000000002'::uuid)$$,
    'member appends an operation to the exact vault'
);
SELECT throws_ok(
    $$SELECT public.append_vault_ops((SELECT id FROM created_vault), repeat('3', 64), '[]')$$,
    '42501',
    'vault access denied',
    'outsider cannot append operations'
);
CREATE TEMP TABLE second_vault AS
SELECT public.create_vault_for_owner(repeat('3', 64), 'd3JhcHBlZA==', 'cHVibGlj') AS id;
SELECT throws_ok(
    $$SELECT public.append_vault_ops((SELECT id FROM second_vault), repeat('3', 64), '[{"id":"30000000-0000-4000-8000-000000000001","encrypted_data":"dGFtcGVy","version_vector":"other-vector"}]')$$,
    '23505',
    'operation identity conflict',
    'cross-vault operation ID collision cannot overwrite or disclose data'
);

INSERT INTO public.vault_updates (
    vault_id, base_snapshot_version, hlc_timestamp, encrypted_data, author_pubkey_hash
) VALUES (
    (SELECT id FROM created_vault), 7, 'legacy-vector', 'Y2lwaGVydGV4dA==', repeat('1', 64)
);
SELECT is((SELECT count(*) FROM public.vault_ops), 3::bigint, 'legacy compatibility writes permanent ops');
SELECT is((SELECT count(*) FROM public.vault_updates_legacy), 0::bigint, 'compatibility writes do not duplicate archive rows');
SELECT throws_ok(
    $$UPDATE public.vault_ops SET encrypted_data = 'dGFtcGVy' WHERE vault_id = (SELECT id FROM created_vault)$$,
    'P0001',
    'vault_ops is append-only',
    'ops cannot be rewritten'
);
SELECT throws_ok(
    $$DELETE FROM public.vault_ops WHERE vault_id = (SELECT id FROM created_vault)$$,
    'P0001',
    'vault_ops is append-only',
    'ops cannot be deleted'
);
SELECT ok(public.soft_delete_vault((SELECT id FROM created_vault), repeat('1', 64)), 'owner can soft-delete exact vault');
SELECT ok((SELECT deleted_at IS NOT NULL FROM public.vaults WHERE id = (SELECT id FROM created_vault)), 'vault lifecycle is soft-deleted');
SELECT is((SELECT count(*) FROM public.vault_memberships WHERE vault_id = (SELECT id FROM created_vault)), 0::bigint, 'soft delete removes all access');
SELECT is((SELECT count(*) FROM public.vault_ops WHERE vault_id = (SELECT id FROM created_vault)), 3::bigint, 'soft delete preserves permanent ops');

SELECT * FROM finish();
ROLLBACK;
