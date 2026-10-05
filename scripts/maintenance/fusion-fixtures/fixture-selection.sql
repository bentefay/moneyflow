-- MF-006 — canonical fixture-selection predicate.
--
-- Single source of truth for "which vaults are provably synthetic test fixtures".
-- The runner (purge-fixtures.mjs) extracts the block between the BEGIN/END
-- markers below *verbatim* and reuses it, so live selection and the manifest
-- can never drift apart.
--
-- Markers are read from source, not guessed:
--   membership : encrypted_vault_key = 'd3JhcHBlZA==' AND enc_public_key = 'cHVibGlj'
--                (tests/integration/helpers/realtime-stack.ts createVaultOwnedBy/addVaultMember)
--   op         : encrypted_data = 'aHMwMTUtZW5jcnlwdGVkLW9w' AND version_vector = 'e30='
--                (tests/integration/helpers/realtime-stack.ts appendVaultOp)
--
-- A vault qualifies only when ALL of the following hold:
--   1. created_at IS NOT NULL AND created_at <= :cutoff   (unknown / after-cutoff excluded)
--   2. it has NO vault_snapshots, vault_invites or vault_updates_legacy row
--      (an unexplained child means we cannot prove the vault synthetic)
--   3. none of its ops carry any legacy_* column value
--   4. EVERY extant membership matches the marker pair (IS NOT DISTINCT FROM,
--      so NULL is contradictory rather than SQL UNKNOWN slipping through)
--   5. EVERY extant op matches both op markers
--   6. positive evidence exists:
--        cohort A = at least one synthetic membership
--        cohort B = zero memberships and at least one synthetic op
--
-- Explicitly NOT evidence: age, UUID/hash shape, ciphertext length, absent
-- owner, or realtime_grants rows. Grants are dependents only.
--
-- Requires psql variable :cutoff (a timestamptz literal).

-- fixture-selection:begin
WITH marked_memberships AS (
    SELECT
        m.vault_id,
        count(*) AS n_total,
        count(*) FILTER (
            WHERE m.encrypted_vault_key IS NOT DISTINCT FROM 'd3JhcHBlZA=='
              AND m.enc_public_key IS NOT DISTINCT FROM 'cHVibGlj'
        ) AS n_synthetic
    FROM public.vault_memberships m
    GROUP BY m.vault_id
),
marked_ops AS (
    SELECT
        o.vault_id,
        count(*) AS n_total,
        count(*) FILTER (
            WHERE o.encrypted_data IS NOT DISTINCT FROM 'aHMwMTUtZW5jcnlwdGVkLW9w'
              AND o.version_vector IS NOT DISTINCT FROM 'e30='
        ) AS n_synthetic,
        count(*) FILTER (
            WHERE o.legacy_update_id IS NOT NULL
               OR o.legacy_base_snapshot_version IS NOT NULL
               OR o.legacy_hlc_timestamp IS NOT NULL
        ) AS n_legacy
    FROM public.vault_ops o
    GROUP BY o.vault_id
),
classified AS (
    SELECT
        v.id,
        v.created_at,
        coalesce(mm.n_total, 0)     AS membership_total,
        coalesce(mm.n_synthetic, 0) AS membership_synthetic,
        coalesce(mo.n_total, 0)     AS op_total,
        coalesce(mo.n_synthetic, 0) AS op_synthetic,
        coalesce(mo.n_legacy, 0)    AS op_legacy,
        EXISTS (SELECT 1 FROM public.vault_snapshots s WHERE s.vault_id = v.id)        AS has_snapshot,
        EXISTS (SELECT 1 FROM public.vault_invites i WHERE i.vault_id = v.id)          AS has_invite,
        EXISTS (SELECT 1 FROM public.vault_updates_legacy l WHERE l.vault_id = v.id)   AS has_legacy
    FROM public.vaults v
    LEFT JOIN marked_memberships mm ON mm.vault_id = v.id
    LEFT JOIN marked_ops mo ON mo.vault_id = v.id
),
selected_vaults AS (
    SELECT
        c.id,
        c.created_at,
        CASE
            WHEN c.membership_synthetic > 0 THEN 'A'
            ELSE 'B'
        END AS cohort
    FROM classified c
    WHERE c.created_at IS NOT NULL
      AND c.created_at <= :'cutoff'::timestamptz
      AND NOT c.has_snapshot
      AND NOT c.has_invite
      AND NOT c.has_legacy
      AND c.op_legacy = 0
      AND c.membership_total = c.membership_synthetic
      AND c.op_total = c.op_synthetic
      AND (
            c.membership_synthetic > 0
            OR (c.membership_total = 0 AND c.op_synthetic > 0)
          )
)
-- fixture-selection:end
SELECT id, created_at, cohort
FROM selected_vaults
ORDER BY id;
