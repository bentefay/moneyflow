export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
    graphql_public: {
        Tables: {
            [_ in never]: never;
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            graphql: {
                Args: {
                    extensions?: Json;
                    operationName?: string;
                    query?: string;
                    variables?: Json;
                };
                Returns: Json;
            };
        };
        Enums: {
            [_ in never]: never;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
    public: {
        Tables: {
            passkey_challenges: {
                Row: {
                    ceremony: string;
                    challenge: string;
                    created_at: string;
                    expires_at: string;
                    id: string;
                    pubkey_hash: string | null;
                };
                Insert: {
                    ceremony: string;
                    challenge: string;
                    created_at?: string;
                    expires_at: string;
                    id?: string;
                    pubkey_hash?: string | null;
                };
                Update: {
                    ceremony?: string;
                    challenge?: string;
                    created_at?: string;
                    expires_at?: string;
                    id?: string;
                    pubkey_hash?: string | null;
                };
                Relationships: [];
            };
            passkey_credentials: {
                Row: {
                    aaguid: string | null;
                    backed_up: boolean;
                    counter: number;
                    created_at: string;
                    credential_id: string;
                    device_type: string;
                    label: string;
                    last_used_at: string | null;
                    pubkey_hash: string;
                    public_key: string;
                    transports: string[];
                    wrap_version: number;
                    wrapped_secret: string;
                };
                Insert: {
                    aaguid?: string | null;
                    backed_up?: boolean;
                    counter?: number;
                    created_at?: string;
                    credential_id: string;
                    device_type?: string;
                    label?: string;
                    last_used_at?: string | null;
                    pubkey_hash: string;
                    public_key: string;
                    transports?: string[];
                    wrap_version?: number;
                    wrapped_secret: string;
                };
                Update: {
                    aaguid?: string | null;
                    backed_up?: boolean;
                    counter?: number;
                    created_at?: string;
                    credential_id?: string;
                    device_type?: string;
                    label?: string;
                    last_used_at?: string | null;
                    pubkey_hash?: string;
                    public_key?: string;
                    transports?: string[];
                    wrap_version?: number;
                    wrapped_secret?: string;
                };
                Relationships: [];
            };
            realtime_grants: {
                Row: {
                    created_at: string;
                    expires_at: string;
                    id: string;
                    pubkey_hash: string;
                    purpose: string;
                    revoked_at: string | null;
                    vault_id: string;
                    vault_role: string;
                };
                Insert: {
                    created_at?: string;
                    expires_at: string;
                    id: string;
                    pubkey_hash: string;
                    purpose: string;
                    revoked_at?: string | null;
                    vault_id: string;
                    vault_role: string;
                };
                Update: {
                    created_at?: string;
                    expires_at?: string;
                    id?: string;
                    pubkey_hash?: string;
                    purpose?: string;
                    revoked_at?: string | null;
                    vault_id?: string;
                    vault_role?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "realtime_grants_vault_id_fkey";
                        columns: ["vault_id"];
                        isOneToOne: false;
                        referencedRelation: "vaults";
                        referencedColumns: ["id"];
                    }
                ];
            };
            request_nonces: {
                Row: {
                    expires_at: string;
                    nonce: string;
                    pubkey_hash: string;
                    request_timestamp_ms: number;
                };
                Insert: {
                    expires_at: string;
                    nonce: string;
                    pubkey_hash: string;
                    request_timestamp_ms: number;
                };
                Update: {
                    expires_at?: string;
                    nonce?: string;
                    pubkey_hash?: string;
                    request_timestamp_ms?: number;
                };
                Relationships: [];
            };
            user_data: {
                Row: {
                    pubkey_hash: string;
                    updated_at: string | null;
                };
                Insert: {
                    pubkey_hash: string;
                    updated_at?: string | null;
                };
                Update: {
                    pubkey_hash?: string;
                    updated_at?: string | null;
                };
                Relationships: [];
            };
            vault_invites: {
                Row: {
                    created_at: string | null;
                    created_by: string;
                    enc_public_key: string | null;
                    encrypted_vault_key: string;
                    expires_at: string;
                    id: string;
                    invite_pubkey: string;
                    role: string;
                    vault_id: string;
                };
                Insert: {
                    created_at?: string | null;
                    created_by: string;
                    enc_public_key?: string | null;
                    encrypted_vault_key: string;
                    expires_at: string;
                    id?: string;
                    invite_pubkey: string;
                    role: string;
                    vault_id: string;
                };
                Update: {
                    created_at?: string | null;
                    created_by?: string;
                    enc_public_key?: string | null;
                    encrypted_vault_key?: string;
                    expires_at?: string;
                    id?: string;
                    invite_pubkey?: string;
                    role?: string;
                    vault_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "vault_invites_vault_id_fkey";
                        columns: ["vault_id"];
                        isOneToOne: false;
                        referencedRelation: "vaults";
                        referencedColumns: ["id"];
                    }
                ];
            };
            vault_memberships: {
                Row: {
                    created_at: string | null;
                    enc_public_key: string | null;
                    encrypted_vault_key: string;
                    id: string;
                    pubkey_hash: string;
                    role: string;
                    vault_id: string;
                };
                Insert: {
                    created_at?: string | null;
                    enc_public_key?: string | null;
                    encrypted_vault_key: string;
                    id?: string;
                    pubkey_hash: string;
                    role: string;
                    vault_id: string;
                };
                Update: {
                    created_at?: string | null;
                    enc_public_key?: string | null;
                    encrypted_vault_key?: string;
                    id?: string;
                    pubkey_hash?: string;
                    role?: string;
                    vault_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "vault_memberships_vault_id_fkey";
                        columns: ["vault_id"];
                        isOneToOne: false;
                        referencedRelation: "vaults";
                        referencedColumns: ["id"];
                    }
                ];
            };
            vault_ops: {
                Row: {
                    author_pubkey_hash: string;
                    created_at: string | null;
                    encrypted_data: string;
                    id: string;
                    legacy_base_snapshot_version: number | null;
                    legacy_hlc_timestamp: string | null;
                    legacy_update_id: string | null;
                    vault_id: string;
                    version_vector: string;
                };
                Insert: {
                    author_pubkey_hash: string;
                    created_at?: string | null;
                    encrypted_data: string;
                    id?: string;
                    legacy_base_snapshot_version?: number | null;
                    legacy_hlc_timestamp?: string | null;
                    legacy_update_id?: string | null;
                    vault_id: string;
                    version_vector: string;
                };
                Update: {
                    author_pubkey_hash?: string;
                    created_at?: string | null;
                    encrypted_data?: string;
                    id?: string;
                    legacy_base_snapshot_version?: number | null;
                    legacy_hlc_timestamp?: string | null;
                    legacy_update_id?: string | null;
                    vault_id?: string;
                    version_vector?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "vault_ops_vault_id_fkey";
                        columns: ["vault_id"];
                        isOneToOne: false;
                        referencedRelation: "vaults";
                        referencedColumns: ["id"];
                    }
                ];
            };
            vault_snapshots: {
                Row: {
                    created_at: string | null;
                    encrypted_data: string;
                    hlc_timestamp: string;
                    id: string;
                    updated_at: string | null;
                    vault_id: string;
                    version: number;
                    version_vector: string;
                };
                Insert: {
                    created_at?: string | null;
                    encrypted_data: string;
                    hlc_timestamp: string;
                    id?: string;
                    updated_at?: string | null;
                    vault_id: string;
                    version: number;
                    version_vector: string;
                };
                Update: {
                    created_at?: string | null;
                    encrypted_data?: string;
                    hlc_timestamp?: string;
                    id?: string;
                    updated_at?: string | null;
                    vault_id?: string;
                    version?: number;
                    version_vector?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "vault_snapshots_vault_id_fkey";
                        columns: ["vault_id"];
                        isOneToOne: true;
                        referencedRelation: "vaults";
                        referencedColumns: ["id"];
                    }
                ];
            };
            vault_updates_legacy: {
                Row: {
                    author_pubkey_hash: string;
                    base_snapshot_version: number;
                    created_at: string | null;
                    encrypted_data: string;
                    hlc_timestamp: string;
                    id: string;
                    vault_id: string;
                };
                Insert: {
                    author_pubkey_hash: string;
                    base_snapshot_version: number;
                    created_at?: string | null;
                    encrypted_data: string;
                    hlc_timestamp: string;
                    id?: string;
                    vault_id: string;
                };
                Update: {
                    author_pubkey_hash?: string;
                    base_snapshot_version?: number;
                    created_at?: string | null;
                    encrypted_data?: string;
                    hlc_timestamp?: string;
                    id?: string;
                    vault_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "vault_updates_legacy_vault_id_fkey";
                        columns: ["vault_id"];
                        isOneToOne: false;
                        referencedRelation: "vaults";
                        referencedColumns: ["id"];
                    }
                ];
            };
            vaults: {
                Row: {
                    created_at: string | null;
                    deleted_at: string | null;
                    id: string;
                };
                Insert: {
                    created_at?: string | null;
                    deleted_at?: string | null;
                    id?: string;
                };
                Update: {
                    created_at?: string | null;
                    deleted_at?: string | null;
                    id?: string;
                };
                Relationships: [];
            };
        };
        Views: {
            vault_updates: {
                Row: {
                    author_pubkey_hash: string | null;
                    base_snapshot_version: number | null;
                    created_at: string | null;
                    encrypted_data: string | null;
                    hlc_timestamp: string | null;
                    id: string | null;
                    vault_id: string | null;
                };
                Insert: {
                    author_pubkey_hash?: string | null;
                    base_snapshot_version?: never;
                    created_at?: string | null;
                    encrypted_data?: string | null;
                    hlc_timestamp?: never;
                    id?: string | null;
                    vault_id?: string | null;
                };
                Update: {
                    author_pubkey_hash?: string | null;
                    base_snapshot_version?: never;
                    created_at?: string | null;
                    encrypted_data?: string | null;
                    hlc_timestamp?: never;
                    id?: string | null;
                    vault_id?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "vault_ops_vault_id_fkey";
                        columns: ["vault_id"];
                        isOneToOne: false;
                        referencedRelation: "vaults";
                        referencedColumns: ["id"];
                    }
                ];
            };
        };
        Functions: {
            accept_vault_invite: {
                Args: {
                    p_enc_public_key: string;
                    p_encrypted_vault_key: string;
                    p_invite_pubkey: string;
                    p_pubkey_hash: string;
                };
                Returns: {
                    role: string;
                    vault_id: string;
                }[];
            };
            append_vault_ops: {
                Args: { p_author_pubkey_hash: string; p_ops: Json; p_vault_id: string };
                Returns: string[];
            };
            claim_passkey_challenge: {
                Args: { p_ceremony: string; p_challenge_id: string };
                Returns: {
                    challenge: string;
                    pubkey_hash: string;
                }[];
            };
            claim_request_nonce: {
                Args: {
                    p_nonce: string;
                    p_pubkey_hash: string;
                    p_request_timestamp_ms: number;
                };
                Returns: boolean;
            };
            cleanup_expired_invites: { Args: never; Returns: undefined };
            create_passkey_challenge: {
                Args: {
                    p_ceremony: string;
                    p_challenge: string;
                    p_pubkey_hash?: string;
                    p_ttl_seconds: number;
                };
                Returns: {
                    challenge: string;
                    challenge_id: string;
                }[];
            };
            create_vault_for_owner: {
                Args: {
                    p_enc_public_key: string;
                    p_encrypted_vault_key: string;
                    p_owner_pubkey_hash: string;
                };
                Returns: string;
            };
            current_realtime_claims: { Args: never; Returns: Json };
            realtime_grant_allows: {
                Args: { p_purpose: string; p_vault_id: string };
                Returns: boolean;
            };
            realtime_topic_allowed: {
                Args: { p_extension: string; p_topic: string };
                Returns: boolean;
            };
            realtime_topic_send_allowed: {
                Args: { p_extension: string; p_topic: string };
                Returns: boolean;
            };
            record_passkey_authentication: {
                Args: { p_counter: number; p_credential_id: string };
                Returns: boolean;
            };
            register_passkey_credential: {
                Args: {
                    p_aaguid: string;
                    p_backed_up: boolean;
                    p_counter: number;
                    p_credential_id: string;
                    p_device_type: string;
                    p_label: string;
                    p_pubkey_hash: string;
                    p_public_key: string;
                    p_transports: string[];
                    p_wrap_version: number;
                    p_wrapped_secret: string;
                };
                Returns: boolean;
            };
            rekey_vault_members: {
                Args: {
                    p_member_keys: Json;
                    p_owner_pubkey_hash: string;
                    p_vault_id: string;
                };
                Returns: boolean;
            };
            revoke_passkey_credential: {
                Args: { p_credential_id: string; p_pubkey_hash: string };
                Returns: boolean;
            };
            revoke_realtime_grant: {
                Args: {
                    p_grant_id: string;
                    p_pubkey_hash: string;
                    p_purpose: string;
                    p_vault_id: string;
                };
                Returns: boolean;
            };
            rotate_realtime_grant: {
                Args: {
                    p_previous_grant_id: string;
                    p_pubkey_hash: string;
                    p_purpose: string;
                    p_ttl_seconds: number;
                    p_vault_id: string;
                };
                Returns: {
                    expires_at: string;
                    grant_id: string;
                    vault_role: string;
                }[];
            };
            soft_delete_vault: {
                Args: { p_owner_pubkey_hash: string; p_vault_id: string };
                Returns: boolean;
            };
        };
        Enums: {
            [_ in never]: never;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
    DefaultSchemaTableNameOrOptions extends
        | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends (DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
              DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
        : never) = never
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
          DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
          Row: infer R;
      }
        ? R
        : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
            DefaultSchema["Views"])
      ? (DefaultSchema["Tables"] &
            DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
            Row: infer R;
        }
          ? R
          : never
      : never;

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends
        | keyof DefaultSchema["Tables"]
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends (DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
        : never) = never
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
          Insert: infer I;
      }
        ? I
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
      ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
            Insert: infer I;
        }
          ? I
          : never
      : never;

export type TablesUpdate<
    DefaultSchemaTableNameOrOptions extends
        | keyof DefaultSchema["Tables"]
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends (DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
        : never) = never
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
          Update: infer U;
      }
        ? U
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
      ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
            Update: infer U;
        }
          ? U
          : never
      : never;

export type Enums<
    DefaultSchemaEnumNameOrOptions extends
        | keyof DefaultSchema["Enums"]
        | { schema: keyof DatabaseWithoutInternals },
    EnumName extends (DefaultSchemaEnumNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
        : never) = never
> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
      ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
      : never;

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
        | keyof DefaultSchema["CompositeTypes"]
        | { schema: keyof DatabaseWithoutInternals },
    CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
        : never) = never
> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
      ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
      : never;

export const Constants = {
    graphql_public: {
        Enums: {}
    },
    public: {
        Enums: {}
    }
} as const;
