/**
 * Supabase Database Types
 *
 * Type definitions for the Supabase database schema.
 * This should match the migrations in supabase/migrations/001_initial.sql
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type VaultRole = "owner" | "member";
export type InviteRole = "owner" | "member";

export interface Database {
  public: {
    Tables: {
      user_data: {
        Row: {
          pubkey_hash: string;
          encrypted_data: string;
          updated_at: string;
        };
        Insert: {
          pubkey_hash: string;
          encrypted_data: string;
          updated_at?: string;
        };
        Update: {
          pubkey_hash?: string;
          encrypted_data?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vaults: {
        Row: {
          id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      vault_memberships: {
        Row: {
          id: string;
          vault_id: string;
          pubkey_hash: string;
          encrypted_vault_key: string;
          role: VaultRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          vault_id: string;
          pubkey_hash: string;
          encrypted_vault_key: string;
          role: VaultRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          vault_id?: string;
          pubkey_hash?: string;
          encrypted_vault_key?: string;
          role?: VaultRole;
          created_at?: string;
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
          invite_pubkey: string;
          encrypted_vault_key: string;
          role: InviteRole;
          created_by: string;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          vault_id: string;
          invite_pubkey: string;
          encrypted_vault_key: string;
          role: InviteRole;
          created_by: string;
          created_at?: string;
          expires_at: string;
        };
        Update: {
          id?: string;
          vault_id?: string;
          invite_pubkey?: string;
          encrypted_vault_key?: string;
          role?: InviteRole;
          created_by?: string;
          created_at?: string;
          expires_at?: string;
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
          version: number;
          hlc_timestamp: string;
          encrypted_data: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          vault_id: string;
          version: number;
          hlc_timestamp: string;
          encrypted_data: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          vault_id?: string;
          version?: number;
          hlc_timestamp?: string;
          encrypted_data?: string;
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
          base_snapshot_version: number;
          hlc_timestamp: string;
          encrypted_data: string;
          author_pubkey_hash: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          vault_id: string;
          base_snapshot_version: number;
          hlc_timestamp: string;
          encrypted_data: string;
          author_pubkey_hash: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          vault_id?: string;
          base_snapshot_version?: number;
          hlc_timestamp?: string;
          encrypted_data?: string;
          author_pubkey_hash?: string;
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
