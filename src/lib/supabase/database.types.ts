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
      user_data: {
        Row: {
          encrypted_data: string;
          pubkey_hash: string;
          updated_at: string | null;
        };
        Insert: {
          encrypted_data: string;
          pubkey_hash: string;
          updated_at?: string | null;
        };
        Update: {
          encrypted_data?: string;
          pubkey_hash?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      vault_invites: {
        Row: {
          created_at: string | null;
          created_by: string;
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
          },
        ];
      };
      vault_memberships: {
        Row: {
          created_at: string | null;
          encrypted_vault_key: string;
          id: string;
          pubkey_hash: string;
          role: string;
          vault_id: string;
        };
        Insert: {
          created_at?: string | null;
          encrypted_vault_key: string;
          id?: string;
          pubkey_hash: string;
          role: string;
          vault_id: string;
        };
        Update: {
          created_at?: string | null;
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
          },
        ];
      };
      vault_snapshots: {
        Row: {
          created_at: string | null;
          encrypted_data: string;
          hlc_timestamp: string;
          id: string;
          vault_id: string;
          version: number;
        };
        Insert: {
          created_at?: string | null;
          encrypted_data: string;
          hlc_timestamp: string;
          id?: string;
          vault_id: string;
          version: number;
        };
        Update: {
          created_at?: string | null;
          encrypted_data?: string;
          hlc_timestamp?: string;
          id?: string;
          vault_id?: string;
          version?: number;
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
            foreignKeyName: "vault_updates_vault_id_fkey";
            columns: ["vault_id"];
            isOneToOne: false;
            referencedRelation: "vaults";
            referencedColumns: ["id"];
          },
        ];
      };
      vaults: {
        Row: {
          created_at: string | null;
          id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      cleanup_expired_invites: { Args: never; Returns: undefined };
      current_pubkey_hash: { Args: never; Returns: string };
      is_vault_member: { Args: { p_vault_id: string }; Returns: boolean };
      is_vault_owner: { Args: { p_vault_id: string }; Returns: boolean };
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
