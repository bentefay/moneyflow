INSERT INTO public.user_data (pubkey_hash, encrypted_data, updated_at) VALUES (
    repeat('1', 64),
    'bGVnYWN5LW9wYXF1ZS11c2VyLXN0YXRl',
    '2026-01-01T00:00:00Z'
);

INSERT INTO public.vaults (id) VALUES ('10000000-0000-4000-8000-000000000001');
INSERT INTO public.vault_memberships (
    id, vault_id, pubkey_hash, encrypted_vault_key, role, enc_public_key
) VALUES (
    '11000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    repeat('1', 64),
    'b3duZXItd3JhcHBlZA==',
    'owner',
    'b3duZXItcHVibGlj'
);
INSERT INTO public.vault_snapshots (
    id, vault_id, version, hlc_timestamp, encrypted_data, version_vector
) VALUES (
    '12000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    9,
    'snapshot-hlc',
    'c25hcHNob3QtY2lwaGVy',
    'snapshot-vector'
);
INSERT INTO public.vault_updates (
    id, vault_id, base_snapshot_version, hlc_timestamp, encrypted_data, author_pubkey_hash, created_at
) VALUES
    (
        '13000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001',
        9,
        'legacy-hlc-1',
        'bGVnYWN5LWNpcGhlci0x',
        repeat('1', 64),
        '2026-01-01T00:00:00Z'
    ),
    (
        '13000000-0000-4000-8000-000000000002',
        '10000000-0000-4000-8000-000000000001',
        10,
        'legacy-hlc-2',
        'bGVnYWN5LWNpcGhlci0y',
        repeat('2', 64),
        '2026-01-02T00:00:00Z'
    );
INSERT INTO public.vault_ops (
    id, vault_id, version_vector, encrypted_data, author_pubkey_hash
) VALUES (
    extensions.uuid_generate_v5(
        extensions.uuid_ns_url(),
        'moneyflow:legacy-vault-update:13000000-0000-4000-8000-000000000001'
    ),
    '10000000-0000-4000-8000-000000000001',
    'existing-vector',
    'ZXhpc3RpbmctY2lwaGVy',
    repeat('3', 64)
);
