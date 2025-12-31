


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."cleanup_expired_invites"() RETURNS "void"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  DELETE FROM public.vault_invites WHERE expires_at < NOW();
$$;


ALTER FUNCTION "public"."cleanup_expired_invites"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_expired_invites"() IS 'Deletes expired vault invites. Run periodically via pg_cron or Edge Function.';



CREATE OR REPLACE FUNCTION "public"."current_pubkey_hash"() RETURNS "text"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT NULLIF(current_setting('request.pubkey_hash', true), '');
$$;


ALTER FUNCTION "public"."current_pubkey_hash"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_pubkey_hash"() IS 'Returns pubkey_hash from request context (set by tRPC middleware after Ed25519 signature verification)';



CREATE OR REPLACE FUNCTION "public"."get_ops_stats_since_snapshot"("p_vault_id" "uuid") RETURNS TABLE("op_count" bigint, "total_bytes" bigint, "snapshot_updated_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT 
    COUNT(o.id) as op_count,
    COALESCE(SUM(LENGTH(o.encrypted_data)), 0) as total_bytes,
    s.updated_at as snapshot_updated_at
  FROM public.vault_snapshots s
  LEFT JOIN public.vault_ops o ON o.vault_id = s.vault_id 
    AND o.created_at > COALESCE(s.updated_at, '1970-01-01'::timestamptz)
  WHERE s.vault_id = p_vault_id
  GROUP BY s.updated_at;
$$;


ALTER FUNCTION "public"."get_ops_stats_since_snapshot"("p_vault_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_ops_stats_since_snapshot"("p_vault_id" "uuid") IS 'Returns count and total bytes of ops since last snapshot. Used to decide ops vs snapshot for sync.';



CREATE OR REPLACE FUNCTION "public"."is_vault_member"("p_vault_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vault_memberships
    WHERE vault_id = p_vault_id
      AND pubkey_hash = public.current_pubkey_hash()
  );
$$;


ALTER FUNCTION "public"."is_vault_member"("p_vault_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_vault_member"("p_vault_id" "uuid") IS 'Checks if the current user (by pubkey_hash) is a member of the specified vault';



CREATE OR REPLACE FUNCTION "public"."is_vault_owner"("p_vault_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vault_memberships
    WHERE vault_id = p_vault_id
      AND pubkey_hash = public.current_pubkey_hash()
      AND role = 'owner'
  );
$$;


ALTER FUNCTION "public"."is_vault_owner"("p_vault_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_vault_owner"("p_vault_id" "uuid") IS 'Checks if the current user (by pubkey_hash) is an owner of the specified vault';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."user_data" (
    "pubkey_hash" "text" NOT NULL,
    "encrypted_data" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_data" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_data" IS 'User data encrypted client-side. Server only sees opaque pubkey_hash.';



COMMENT ON COLUMN "public"."user_data"."pubkey_hash" IS 'BLAKE2b hash of user public key - server cannot reverse this';



COMMENT ON COLUMN "public"."user_data"."encrypted_data" IS 'Encrypted JSON: { vaults: [{id, wrappedKey}], globalSettings: {...} }';



CREATE TABLE IF NOT EXISTS "public"."vault_invites" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "vault_id" "uuid" NOT NULL,
    "invite_pubkey" "text" NOT NULL,
    "encrypted_vault_key" "text" NOT NULL,
    "role" "text" NOT NULL,
    "created_by" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "enc_public_key" "text",
    CONSTRAINT "vault_invites_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."vault_invites" OWNER TO "postgres";


COMMENT ON TABLE "public"."vault_invites" IS 'Pending invitations. Invite secret shared via URL fragment (never sent to server).';



COMMENT ON COLUMN "public"."vault_invites"."invite_pubkey" IS 'Ephemeral pubkey derived from invite secret - unlinkable to invitee';



COMMENT ON COLUMN "public"."vault_invites"."enc_public_key" IS 'Invitee X25519 public key (base64) to store in membership after redemption';



CREATE TABLE IF NOT EXISTS "public"."vault_memberships" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "vault_id" "uuid" NOT NULL,
    "pubkey_hash" "text" NOT NULL,
    "encrypted_vault_key" "text" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "enc_public_key" "text",
    CONSTRAINT "vault_memberships_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."vault_memberships" OWNER TO "postgres";


COMMENT ON TABLE "public"."vault_memberships" IS 'Maps users to vaults with role-based access.';



COMMENT ON COLUMN "public"."vault_memberships"."encrypted_vault_key" IS 'Vault encryption key wrapped with this user X25519 public key';



COMMENT ON COLUMN "public"."vault_memberships"."enc_public_key" IS 'User X25519 public key (base64) for vault re-keying when members are removed';



CREATE TABLE IF NOT EXISTS "public"."vault_ops" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "vault_id" "uuid" NOT NULL,
    "version_vector" "text" NOT NULL,
    "encrypted_data" "text" NOT NULL,
    "author_pubkey_hash" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vault_ops" OWNER TO "postgres";


COMMENT ON TABLE "public"."vault_ops" IS 'All vault CRDT operations, stored forever. Server cannot decrypt data.';



COMMENT ON COLUMN "public"."vault_ops"."version_vector" IS 'Loro version vector as JSON string. Plaintext to enable server-side filtering without decryption.';



COMMENT ON COLUMN "public"."vault_ops"."encrypted_data" IS 'XChaCha20-Poly1305 encrypted Loro update bytes (base64)';



COMMENT ON COLUMN "public"."vault_ops"."author_pubkey_hash" IS 'BLAKE2b hash of the author public key';



COMMENT ON COLUMN "public"."vault_ops"."created_at" IS 'Server-assigned timestamp for consistent ordering';



CREATE TABLE IF NOT EXISTS "public"."vault_snapshots" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "vault_id" "uuid" NOT NULL,
    "version" integer NOT NULL,
    "hlc_timestamp" "text" NOT NULL,
    "encrypted_data" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "version_vector" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vault_snapshots" OWNER TO "postgres";


COMMENT ON TABLE "public"."vault_snapshots" IS 'Latest shallow snapshot per vault for fast cold start. Client creates and uploads when threshold exceeded.';



COMMENT ON COLUMN "public"."vault_snapshots"."encrypted_data" IS 'XChaCha20-Poly1305 encrypted Loro snapshot bytes (base64)';



COMMENT ON COLUMN "public"."vault_snapshots"."version_vector" IS 'Loro version vector as JSON string. Plaintext for server-side filtering.';



COMMENT ON COLUMN "public"."vault_snapshots"."updated_at" IS 'When this snapshot was last updated';



CREATE TABLE IF NOT EXISTS "public"."vault_updates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "vault_id" "uuid" NOT NULL,
    "base_snapshot_version" integer NOT NULL,
    "hlc_timestamp" "text" NOT NULL,
    "encrypted_data" "text" NOT NULL,
    "author_pubkey_hash" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vault_updates" OWNER TO "postgres";


COMMENT ON TABLE "public"."vault_updates" IS 'Encrypted Loro CRDT updates for real-time sync.';



COMMENT ON COLUMN "public"."vault_updates"."encrypted_data" IS 'XChaCha20-Poly1305 encrypted Loro update bytes (base64)';



CREATE TABLE IF NOT EXISTS "public"."vaults" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vaults" OWNER TO "postgres";


COMMENT ON TABLE "public"."vaults" IS 'Vault metadata only. All financial data is in encrypted snapshots/updates.';



ALTER TABLE ONLY "public"."user_data"
    ADD CONSTRAINT "user_data_pkey" PRIMARY KEY ("pubkey_hash");



ALTER TABLE ONLY "public"."vault_invites"
    ADD CONSTRAINT "vault_invites_invite_pubkey_key" UNIQUE ("invite_pubkey");



ALTER TABLE ONLY "public"."vault_invites"
    ADD CONSTRAINT "vault_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vault_memberships"
    ADD CONSTRAINT "vault_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vault_memberships"
    ADD CONSTRAINT "vault_memberships_vault_id_pubkey_hash_key" UNIQUE ("vault_id", "pubkey_hash");



ALTER TABLE ONLY "public"."vault_ops"
    ADD CONSTRAINT "vault_ops_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vault_snapshots"
    ADD CONSTRAINT "vault_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vault_snapshots"
    ADD CONSTRAINT "vault_snapshots_vault_id_unique" UNIQUE ("vault_id");



ALTER TABLE ONLY "public"."vault_updates"
    ADD CONSTRAINT "vault_updates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vaults"
    ADD CONSTRAINT "vaults_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_vault_invites_expires" ON "public"."vault_invites" USING "btree" ("expires_at");



CREATE INDEX "idx_vault_ops_vault_created" ON "public"."vault_ops" USING "btree" ("vault_id", "created_at");



CREATE INDEX "idx_vault_ops_vault_id" ON "public"."vault_ops" USING "btree" ("vault_id");



CREATE INDEX "idx_vault_snapshots_vault_updated" ON "public"."vault_snapshots" USING "btree" ("vault_id", "updated_at" DESC);



CREATE INDEX "idx_vault_updates_vault_created" ON "public"."vault_updates" USING "btree" ("vault_id", "created_at");



ALTER TABLE ONLY "public"."vault_invites"
    ADD CONSTRAINT "vault_invites_vault_id_fkey" FOREIGN KEY ("vault_id") REFERENCES "public"."vaults"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vault_memberships"
    ADD CONSTRAINT "vault_memberships_vault_id_fkey" FOREIGN KEY ("vault_id") REFERENCES "public"."vaults"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vault_ops"
    ADD CONSTRAINT "vault_ops_vault_id_fkey" FOREIGN KEY ("vault_id") REFERENCES "public"."vaults"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vault_snapshots"
    ADD CONSTRAINT "vault_snapshots_vault_id_fkey" FOREIGN KEY ("vault_id") REFERENCES "public"."vaults"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vault_updates"
    ADD CONSTRAINT "vault_updates_vault_id_fkey" FOREIGN KEY ("vault_id") REFERENCES "public"."vaults"("id") ON DELETE CASCADE;



CREATE POLICY "Invites deletable" ON "public"."vault_invites" FOR DELETE USING (true);



CREATE POLICY "Invites readable by invite_pubkey" ON "public"."vault_invites" FOR SELECT USING (true);



CREATE POLICY "Members can create ops" ON "public"."vault_ops" FOR INSERT WITH CHECK ("public"."is_vault_member"("vault_id"));



CREATE POLICY "Members can create snapshots" ON "public"."vault_snapshots" FOR INSERT WITH CHECK ("public"."is_vault_member"("vault_id"));



CREATE POLICY "Members can create updates" ON "public"."vault_updates" FOR INSERT WITH CHECK ("public"."is_vault_member"("vault_id"));



CREATE POLICY "Members can delete snapshots" ON "public"."vault_snapshots" FOR DELETE USING ("public"."is_vault_member"("vault_id"));



CREATE POLICY "Members can delete updates" ON "public"."vault_updates" FOR DELETE USING ("public"."is_vault_member"("vault_id"));



CREATE POLICY "Members can leave or owners can remove" ON "public"."vault_memberships" FOR DELETE USING ((("pubkey_hash" = "public"."current_pubkey_hash"()) OR "public"."is_vault_owner"("vault_id")));



CREATE POLICY "Members can read ops" ON "public"."vault_ops" FOR SELECT USING ("public"."is_vault_member"("vault_id"));



CREATE POLICY "Members can read snapshots" ON "public"."vault_snapshots" FOR SELECT USING ("public"."is_vault_member"("vault_id"));



CREATE POLICY "Members can read updates" ON "public"."vault_updates" FOR SELECT USING ("public"."is_vault_member"("vault_id"));



CREATE POLICY "Members can view vault memberships" ON "public"."vault_memberships" FOR SELECT USING ("public"."is_vault_member"("vault_id"));



CREATE POLICY "Members can view vaults" ON "public"."vaults" FOR SELECT USING ("public"."is_vault_member"("id"));



CREATE POLICY "Owners can add members" ON "public"."vault_memberships" FOR INSERT WITH CHECK (((NOT (EXISTS ( SELECT 1
   FROM "public"."vault_memberships" "vault_memberships_1"
  WHERE ("vault_memberships_1"."vault_id" = "vault_memberships_1"."vault_id")))) OR "public"."is_vault_owner"("vault_id")));



CREATE POLICY "Owners can create invites" ON "public"."vault_invites" FOR INSERT WITH CHECK ("public"."is_vault_owner"("vault_id"));



CREATE POLICY "Owners can delete vaults" ON "public"."vaults" FOR DELETE USING ("public"."is_vault_owner"("id"));



CREATE POLICY "Users can access own data" ON "public"."user_data" USING (("pubkey_hash" = "public"."current_pubkey_hash"())) WITH CHECK (("pubkey_hash" = "public"."current_pubkey_hash"()));



CREATE POLICY "Users can create vaults" ON "public"."vaults" FOR INSERT WITH CHECK (("public"."current_pubkey_hash"() IS NOT NULL));



ALTER TABLE "public"."user_data" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vault_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vault_memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vault_ops" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vault_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vault_updates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vaults" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."vault_ops";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."vault_updates";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";































































































































































GRANT ALL ON FUNCTION "public"."cleanup_expired_invites"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_invites"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_invites"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_pubkey_hash"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_pubkey_hash"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_pubkey_hash"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_ops_stats_since_snapshot"("p_vault_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_ops_stats_since_snapshot"("p_vault_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_ops_stats_since_snapshot"("p_vault_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_vault_member"("p_vault_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_vault_member"("p_vault_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_vault_member"("p_vault_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_vault_owner"("p_vault_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_vault_owner"("p_vault_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_vault_owner"("p_vault_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."user_data" TO "anon";
GRANT ALL ON TABLE "public"."user_data" TO "authenticated";
GRANT ALL ON TABLE "public"."user_data" TO "service_role";



GRANT ALL ON TABLE "public"."vault_invites" TO "anon";
GRANT ALL ON TABLE "public"."vault_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."vault_invites" TO "service_role";



GRANT ALL ON TABLE "public"."vault_memberships" TO "anon";
GRANT ALL ON TABLE "public"."vault_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."vault_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."vault_ops" TO "anon";
GRANT ALL ON TABLE "public"."vault_ops" TO "authenticated";
GRANT ALL ON TABLE "public"."vault_ops" TO "service_role";



GRANT ALL ON TABLE "public"."vault_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."vault_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."vault_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."vault_updates" TO "anon";
GRANT ALL ON TABLE "public"."vault_updates" TO "authenticated";
GRANT ALL ON TABLE "public"."vault_updates" TO "service_role";



GRANT ALL ON TABLE "public"."vaults" TO "anon";
GRANT ALL ON TABLE "public"."vaults" TO "authenticated";
GRANT ALL ON TABLE "public"."vaults" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
































--
-- Dumped schema changes for auth and storage
--

