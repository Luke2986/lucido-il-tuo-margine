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
      clients: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["client_kind"]
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          kind: Database["public"]["Enums"]["client_kind"]
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["client_kind"]
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
          period_label: string
          published_at: string | null
          sector: string
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
          updated_at?: string
          vat_number?: string
        }
        Relationships: []
      }
      entries: {
        Row: {
          amount: number
          client_id: string | null
          confidence: Database["public"]["Enums"]["confidence_band"]
          cost_type: Database["public"]["Enums"]["cost_type"] | null
          counterparty: string
          created_at: string
          description: string
          direction: Database["public"]["Enums"]["entry_direction"]
          entry_date: string
          id: string
          invoice_number: string | null
          source: Database["public"]["Enums"]["entry_source"]
          status: Database["public"]["Enums"]["validation_status"]
          updated_at: string
          validated_by: Database["public"]["Enums"]["validator"] | null
        }
        Insert: {
          amount: number
          client_id?: string | null
          confidence: Database["public"]["Enums"]["confidence_band"]
          cost_type?: Database["public"]["Enums"]["cost_type"] | null
          counterparty: string
          created_at?: string
          description: string
          direction: Database["public"]["Enums"]["entry_direction"]
          entry_date: string
          id: string
          invoice_number?: string | null
          source: Database["public"]["Enums"]["entry_source"]
          status: Database["public"]["Enums"]["validation_status"]
          updated_at?: string
          validated_by?: Database["public"]["Enums"]["validator"] | null
        }
        Update: {
          amount?: number
          client_id?: string | null
          confidence?: Database["public"]["Enums"]["confidence_band"]
          cost_type?: Database["public"]["Enums"]["cost_type"] | null
          counterparty?: string
          created_at?: string
          description?: string
          direction?: Database["public"]["Enums"]["entry_direction"]
          entry_date?: string
          id?: string
          invoice_number?: string | null
          source?: Database["public"]["Enums"]["entry_source"]
          status?: Database["public"]["Enums"]["validation_status"]
          updated_at?: string
          validated_by?: Database["public"]["Enums"]["validator"] | null
        }
        Relationships: [
          {
            foreignKeyName: "entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          id: string
          threshold_high: number
          threshold_medium: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          threshold_high?: number
          threshold_medium?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          threshold_high?: number
          threshold_medium?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      client_kind: "cliente" | "commessa"
      confidence_band: "alta" | "media" | "bassa"
      cost_type: "fisso" | "variabile" | "non_costo"
      entry_direction: "ricavo" | "costo"
      entry_source: "manuale" | "fattura" | "banca" | "excel"
      validation_status: "da_validare" | "validato"
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
      client_kind: ["cliente", "commessa"],
      confidence_band: ["alta", "media", "bassa"],
      cost_type: ["fisso", "variabile", "non_costo"],
      entry_direction: ["ricavo", "costo"],
      entry_source: ["manuale", "fattura", "banca", "excel"],
      validation_status: ["da_validare", "validato"],
      validator: ["AI", "Operatore"],
    },
  },
} as const
