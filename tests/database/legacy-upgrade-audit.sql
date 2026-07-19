BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(14);

SELECT is((SELECT count(*) FROM public.vault_updates_legacy), 2::bigint, 'all legacy rows remain quarantined');
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

SELECT * FROM finish();
ROLLBACK;
