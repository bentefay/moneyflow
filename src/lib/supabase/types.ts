/**
 * Supabase Database Types
 *
 * Type definitions for the Supabase database schema.
 * This should match the migrations in supabase/migrations/.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type VaultRole = "owner" | "admin" | "member";
export type InviteRole = "admin" | "member";

export interface Database {
  public: {
    Tables: {
      user_data: {
        Row: {
          pubkey_hash: string;
          encrypted_keypair: string;
          device_fingerprint: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          pubkey_hash: string;
          encrypted_keypair: string;
          device_fingerprint: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          pubkey_hash?: string;
          encrypted_keypair?: string;
          device_fingerprint?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vaults: {
        Row: {
          id: string;
          owner_pubkey_hash: string;
          name_encrypted: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_pubkey_hash: string;
          name_encrypted: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_pubkey_hash?: string;
          name_encrypted?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      vault_memberships: {
        Row: {
          vault_id: string;
          pubkey_hash: string;
          role: VaultRole;
          encrypted_vault_key: string;
          joined_at: string;
        };
        Insert: {
          vault_id: string;
          pubkey_hash: string;
          role: VaultRole;
          encrypted_vault_key: string;
          joined_at?: string;
        };
        Update: {
          vault_id?: string;
          pubkey_hash?: string;
          role?: VaultRole;
          encrypted_vault_key?: string;
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vault_memberships_vault_id_fkey";
            columns: ["vault_id"];
            isOneToOne: false;
            referencedRelation: "vaults";
            referencedColumns: ["id"];
          },
        ];
      };
      vault_invites: {
        Row: {
          id: string;
          vault_id: string;
          code: string;
          role: InviteRole;
          created_by: string;
          created_at: string;
          expires_at: string;
          used_at: string | null;
          used_by: string | null;
        };
        Insert: {
          id?: string;
          vault_id: string;
          code: string;
          role: InviteRole;
          created_by: string;
          created_at?: string;
          expires_at: string;
          used_at?: string | null;
          used_by?: string | null;
        };
        Update: {
          id?: string;
          vault_id?: string;
          code?: string;
          role?: InviteRole;
          created_by?: string;
          created_at?: string;
          expires_at?: string;
          used_at?: string | null;
          used_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "vault_invites_vault_id_fkey";
            columns: ["vault_id"];
            isOneToOne: false;
            referencedRelation: "vaults";
            referencedColumns: ["id"];
          },
        ];
      };
      vault_snapshots: {
        Row: {
          id: string;
          vault_id: string;
          encrypted_data: string;
          version_vector: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          vault_id: string;
          encrypted_data: string;
          version_vector: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          vault_id?: string;
          encrypted_data?: string;
          version_vector?: string;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vault_snapshots_vault_id_fkey";
            columns: ["vault_id"];
            isOneToOne: false;
            referencedRelation: "vaults";
            referencedColumns: ["id"];
          },
        ];
      };
      vault_updates: {
        Row: {
          id: string;
          vault_id: string;
          encrypted_data: string;
          version_vector: string;
          seq: number;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          vault_id: string;
          encrypted_data: string;
          version_vector: string;
          seq?: number;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          vault_id?: string;
          encrypted_data?: string;
          version_vector?: string;
          seq?: number;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vault_updates_vault_id_fkey";
            columns: ["vault_id"];
            isOneToOne: false;
            referencedRelation: "vaults";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_pubkey_hash: {
        Args: Record<string, never>;
        Returns: string;
      };
      is_vault_member: {
        Args: { vault_uuid: string };
        Returns: boolean;
      };
      is_vault_owner: {
        Args: { vault_uuid: string };
        Returns: boolean;
      };
    };
    Enums: {
      vault_role: VaultRole;
      invite_role: InviteRole;
    };
    CompositeTypes: Record<string, never>;
  };
}
