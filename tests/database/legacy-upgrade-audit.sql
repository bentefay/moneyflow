BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(27);

SELECT is((SELECT count(*) FROM public.vault_updates_legacy), 2::bigint, 'all legacy rows remain quarantined');
SELECT has_table('public', 'realtime_grants', 'upgrade creates realtime grant table');
SELECT has_function('public', 'rotate_realtime_grant', ARRAY['text', 'uuid', 'text', 'uuid', 'integer']);
SELECT has_function('public', 'realtime_topic_send_allowed', ARRAY['text', 'text']);
SELECT is((SELECT count(*) FROM public.vault_ops), 3::bigint, 'existing op and both legacy rows are permanent');
SELECT is((SELECT count(*) FROM public.vault_ops WHERE legacy_update_id IS NOT NULL), 2::bigint, 'every legacy row has provenance');
SELECT results_eq(
    $$SELECT legacy_update_id FROM public.vault_ops WHERE legacy_update_id IS NOT NULL ORDER BY legacy_update_id$$,
    $$VALUES ('13000000-0000-4000-8000-000000000001'::uuid), ('13000000-0000-4000-8000-000000000002'::uuid)$$,
    'legacy identities are exact'
);
SELECT results_eq(
    $$SELECT encrypted_data FROM public.vault_ops WHERE legacy_update_id IS NOT NULL ORDER BY legacy_update_id$$,
    $$VALUES ('bGVnYWN5LWNpcGhlci0x'::text), ('bGVnYWN5LWNpcGhlci0y'::text)$$,
    'legacy ciphertext is byte-preserved'
);
SELECT results_eq(
    $$SELECT author_pubkey_hash FROM public.vault_ops WHERE legacy_update_id IS NOT NULL ORDER BY legacy_update_id$$,
    $$VALUES (repeat('1', 64)), (repeat('2', 64))$$,
    'legacy authors are preserved'
);
SELECT results_eq(
    $$SELECT legacy_base_snapshot_version FROM public.vault_ops WHERE legacy_update_id IS NOT NULL ORDER BY legacy_update_id$$,
    $$VALUES (9), (10)$$,
    'legacy base versions are preserved'
);
SELECT results_eq(
    $$SELECT legacy_hlc_timestamp FROM public.vault_ops WHERE legacy_update_id IS NOT NULL ORDER BY legacy_update_id$$,
    $$VALUES ('legacy-hlc-1'::text), ('legacy-hlc-2'::text)$$,
    'legacy clocks are preserved'
);
SELECT isnt(
    (SELECT id FROM public.vault_ops WHERE legacy_update_id = '13000000-0000-4000-8000-000000000001'),
    extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'moneyflow:legacy-vault-update:13000000-0000-4000-8000-000000000001'),
    'pre-existing deterministic ID collision uses the safe alternate identity'
);
SELECT is((SELECT encrypted_data FROM public.vault_ops WHERE version_vector = 'existing-vector'), 'ZXhpc3RpbmctY2lwaGVy', 'pre-existing op is untouched');
SELECT is((SELECT encrypted_data FROM public.vault_snapshots WHERE id = '12000000-0000-4000-8000-000000000001'), 'c25hcHNob3QtY2lwaGVy', 'snapshot cache survives upgrade');
SELECT is((SELECT role FROM public.vault_memberships WHERE id = '11000000-0000-4000-8000-000000000001'), 'owner', 'membership survives upgrade');
SELECT is((SELECT count(*) FROM public.vault_updates), 3::bigint, 'compatibility view exposes the permanent source');
SELECT is((SELECT string_agg(tablename, ',' ORDER BY tablename) FROM pg_publication_tables WHERE pubname = 'supabase_realtime'), 'vault_ops', 'legacy publication is removed');
SELECT ok(has_table_privilege('authenticated', 'public.vault_ops', 'SELECT'), 'upgrade grants only scoped RLS read reachability');
SELECT ok(NOT has_table_privilege('authenticated', 'public.vault_ops', 'INSERT'), 'upgrade retains server-mediated append writes');

CREATE TEMP TABLE upgrade_first_grant AS
SELECT * FROM public.rotate_realtime_grant(
    repeat('1', 64),
    '10000000-0000-4000-8000-000000000001',
    'sync',
    '00000000-0000-0000-0000-000000000000',
    60
);
CREATE TEMP TABLE upgrade_sibling_grant AS
SELECT * FROM public.rotate_realtime_grant(
    repeat('1', 64),
    '10000000-0000-4000-8000-000000000001',
    'sync',
    '00000000-0000-0000-0000-000000000000',
    60
);
SELECT is(
    (SELECT count(*) FROM public.realtime_grants WHERE pubkey_hash = repeat('1', 64) AND purpose = 'sync' AND revoked_at IS NULL),
    2::bigint,
    'upgrade supports independent simultaneous grants'
);
CREATE TEMP TABLE upgrade_rotated_grant AS
SELECT * FROM public.rotate_realtime_grant(
    repeat('1', 64),
    '10000000-0000-4000-8000-000000000001',
    'sync',
    (SELECT grant_id FROM upgrade_first_grant),
    60
);
SELECT ok(
    (SELECT revoked_at IS NOT NULL FROM public.realtime_grants WHERE id = (SELECT grant_id FROM upgrade_first_grant)),
    'upgrade refresh revokes its explicit predecessor'
);
SELECT ok(
    (SELECT revoked_at IS NULL FROM public.realtime_grants WHERE id = (SELECT grant_id FROM upgrade_sibling_grant)),
    'upgrade refresh preserves an active sibling'
);

CREATE TEMP TABLE upgrade_presence_grant AS
SELECT * FROM public.rotate_realtime_grant(
    repeat('1', 64),
    '10000000-0000-4000-8000-000000000001',
    'presence',
    '00000000-0000-0000-0000-000000000000',
    60
);
DO $$
BEGIN
    PERFORM set_config(
        'request.jwt.claims',
        jsonb_build_object(
            'jti', (SELECT grant_id FROM upgrade_presence_grant),
            'role', 'authenticated',
            'vault_id', '10000000-0000-4000-8000-000000000001',
            'realtime_table', 'vault_ops',
            'realtime_purpose', 'presence',
            'realtime_topic', 'vault:10000000-0000-4000-8000-000000000001:presence',
            'vault_role', 'owner'
        )::text,
        true
    );
END;
$$;
SELECT ok(
    public.realtime_topic_allowed('vault:10000000-0000-4000-8000-000000000001:presence', 'broadcast'),
    'upgraded Presence topic permits the private join Broadcast read check'
);
SELECT ok(
    public.realtime_topic_allowed('vault:10000000-0000-4000-8000-000000000001:presence', 'presence'),
    'upgraded Presence topic permits Presence reads'
);
SELECT ok(
    public.realtime_topic_send_allowed('vault:10000000-0000-4000-8000-000000000001:presence', 'presence'),
    'upgraded Presence topic permits Presence writes'
);
SELECT ok(
    NOT public.realtime_topic_send_allowed('vault:10000000-0000-4000-8000-000000000001:presence', 'broadcast'),
    'upgraded Presence purpose cannot write Broadcast payloads'
);

INSERT INTO public.realtime_grants (
    id, vault_id, pubkey_hash, vault_role, purpose, expires_at, revoked_at, created_at
) VALUES
    (
        '41000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001', repeat('1', 64), 'owner', 'presence',
        clock_timestamp() - interval '10 minutes', NULL, clock_timestamp() - interval '11 minutes'
    ),
    (
        '41000000-0000-4000-8000-000000000002',
        '10000000-0000-4000-8000-000000000001', repeat('1', 64), 'owner', 'presence',
        clock_timestamp() + interval '1 minute', clock_timestamp() - interval '10 minutes',
        clock_timestamp() - interval '11 minutes'
    );
CREATE TEMP TABLE upgrade_pruned_presence_grant AS
SELECT * FROM public.rotate_realtime_grant(
    repeat('1', 64),
    '10000000-0000-4000-8000-000000000001',
    'presence',
    '00000000-0000-0000-0000-000000000000',
    60
);
SELECT is(
    (SELECT count(*) FROM public.realtime_grants WHERE id IN (
        '41000000-0000-4000-8000-000000000001',
        '41000000-0000-4000-8000-000000000002'
    )),
    0::bigint,
    'upgrade prunes expired and old revoked stale rows without encrypted-data changes'
);

SELECT * FROM finish();
ROLLBACK;
