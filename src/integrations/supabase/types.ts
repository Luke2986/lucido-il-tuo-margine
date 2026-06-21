export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      classifications: {
        Row: {
          client_id: string | null
          confidence: number
          confidence_band: Database["public"]["Enums"]["confidence_band"]
          cost_type: Database["public"]["Enums"]["cost_type"] | null
          created_at: string
          id: string
          method: Database["public"]["Enums"]["classification_method"]
          rationale: string
          status: Database["public"]["Enums"]["classification_status"]
          transaction_id: string
          updated_at: string
          validated_at: string | null
          validated_by: Database["public"]["Enums"]["validator"] | null
        }
        Insert: {
          client_id?: string | null
          confidence?: number
          confidence_band?: Database["public"]["Enums"]["confidence_band"]
          cost_type?: Database["public"]["Enums"]["cost_type"] | null
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["classification_method"]
          rationale?: string
          status?: Database["public"]["Enums"]["classification_status"]
          transaction_id: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: Database["public"]["Enums"]["validator"] | null
        }
        Update: {
          client_id?: string | null
          confidence?: number
          confidence_band?: Database["public"]["Enums"]["confidence_band"]
          cost_type?: Database["public"]["Enums"]["cost_type"] | null
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["classification_method"]
          rationale?: string
          status?: Database["public"]["Enums"]["classification_status"]
          transaction_id?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: Database["public"]["Enums"]["validator"] | null
        }
        Relationships: [
          {
            foreignKeyName: "classifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "margin_by_client"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "classifications_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company_id: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["client_kind"]
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["client_kind"]
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["client_kind"]
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
          period_label: string
          published_at: string | null
          sector: string
          status: Database["public"]["Enums"]["company_status"]
          updated_at: string
          vat_number: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          period_label?: string
          published_at?: string | null
          sector?: string
          status?: Database["public"]["Enums"]["company_status"]
          updated_at?: string
          vat_number?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          period_label?: string
          published_at?: string | null
          sector?: string
          status?: Database["public"]["Enums"]["company_status"]
          updated_at?: string
          vat_number?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          company_id: string
          created_at: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          company_id: string
          created_at: string
          threshold_high: number
          threshold_medium: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          threshold_high?: number
          threshold_medium?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          threshold_high?: number
          threshold_medium?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          client_id: string | null
          company_id: string
          counterparty: string
          created_at: string
          description: string
          direction: Database["public"]["Enums"]["tx_direction"]
          entry_date: string
          id: string
          invoice_number: string | null
          source: Database["public"]["Enums"]["entry_source"]
          updated_at: string
        }
        Insert: {
          amount: number
          client_id?: string | null
          company_id: string
          counterparty?: string
          created_at?: string
          description: string
          direction: Database["public"]["Enums"]["tx_direction"]
          entry_date: string
          id?: string
          invoice_number?: string | null
          source?: Database["public"]["Enums"]["entry_source"]
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          company_id?: string
          counterparty?: string
          created_at?: string
          description?: string
          direction?: Database["public"]["Enums"]["tx_direction"]
          entry_date?: string
          id?: string
          invoice_number?: string | null
          source?: Database["public"]["Enums"]["entry_source"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "margin_by_client"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      margin_by_client: {
        Row: {
          client_id: string | null
          client_kind: Database["public"]["Enums"]["client_kind"] | null
          client_name: string | null
          company_id: string | null
          margin: number | null
          revenues: number | null
          variable_costs: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role_in_company: {
        Args: {
          _company_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_published: { Args: { _company_id: string }; Returns: boolean }
      is_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "operator" | "owner"
      classification_method: "manuale" | "ai" | "regola"
      classification_status: "ai_proposta" | "validata" | "override"
      client_kind: "cliente" | "commessa"
      company_status: "bozza" | "pubblicata"
      confidence_band: "alta" | "media" | "bassa"
      cost_type: "fisso" | "variabile" | "non_costo"
      entry_source: "manuale" | "fattura" | "banca" | "excel"
      tx_direction: "ricavo" | "costo"
      validator: "AI" | "Operatore"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["operator", "owner"],
      classification_method: ["manuale", "ai", "regola"],
      classification_status: ["ai_proposta", "validata", "override"],
      client_kind: ["cliente", "commessa"],
      company_status: ["bozza", "pubblicata"],
      confidence_band: ["alta", "media", "bassa"],
      cost_type: ["fisso", "variabile", "non_costo"],
      entry_source: ["manuale", "fattura", "banca", "excel"],
      tx_direction: ["ricavo", "costo"],
      validator: ["AI", "Operatore"],
    },
  },
} as const
