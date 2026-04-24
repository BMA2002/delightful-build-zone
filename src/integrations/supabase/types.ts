export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type  Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          file_name: string
          file_type: Database["public"]["Enums"]["file_type"] | null
          id: string
          status: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          file_name: string
          file_type?: Database["public"]["Enums"]["file_type"] | null
          id?: string
          status?: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          file_name?: string
          file_type?: Database["public"]["Enums"]["file_type"] | null
          id?: string
          status?: string
        }
        Relationships: []
      }
      allocations: {
        Row: {
          allocation_data: Json | null
          cartons: number | null
          container_id: string
          created_at: string
          gross_weight_kg: number | null
          id: string
          items_count: number | null
          method: Database["public"]["Enums"]["allocation_method"]
          pallets: number | null
          source_file_id: string
          volume_m3: number | null
        }
        Insert: {
          allocation_data?: Json | null
          cartons?: number | null
          container_id: string
          created_at?: string
          gross_weight_kg?: number | null
          id?: string
          items_count?: number | null
          method: Database["public"]["Enums"]["allocation_method"]
          pallets?: number | null
          source_file_id: string
          volume_m3?: number | null
        }
        Update: {
          allocation_data?: Json | null
          cartons?: number | null
          container_id?: string
          created_at?: string
          gross_weight_kg?: number | null
          id?: string
          items_count?: number | null
          method?: Database["public"]["Enums"]["allocation_method"]
          pallets?: number | null
          source_file_id?: string
          volume_m3?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "allocations_container_id_fkey"
            columns: ["container_id"]
            isOneToOne: false
            referencedRelation: "containers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_source_file_id_fkey"
            columns: ["source_file_id"]
            isOneToOne: false
            referencedRelation: "uploaded_files"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      containers: {
        Row: {
          container_number: string
          created_at: string
          gross_weight_kg: number | null
          id: string
          is_dummy: boolean
          seal_number: string | null
          source_file_id: string | null
          status: Database["public"]["Enums"]["container_status"]
          total_cartons: number | null
          total_pallets: number | null
          updated_at: string
          volume_m3: number | null
        }
        Insert: {
          container_number: string
          created_at?: string
          gross_weight_kg?: number | null
          id?: string
          is_dummy?: boolean
          seal_number?: string | null
          source_file_id?: string | null
          status?: Database["public"]["Enums"]["container_status"]
          total_cartons?: number | null
          total_pallets?: number | null
          updated_at?: string
          volume_m3?: number | null
        }
        Update: {
          container_number?: string
          created_at?: string
          gross_weight_kg?: number | null
          id?: string
          is_dummy?: boolean
          seal_number?: string | null
          source_file_id?: string | null
          status?: Database["public"]["Enums"]["container_status"]
          total_cartons?: number | null
          total_pallets?: number | null
          updated_at?: string
          volume_m3?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "containers_source_file_id_fkey"
            columns: ["source_file_id"]
            isOneToOne: false
            referencedRelation: "uploaded_files"
            referencedColumns: ["id"]
          },
        ]
      }
      uploaded_files: {
        Row: {
          column_mapping: Json | null
          created_at: string
          file_name: string
          file_size: number | null
          file_type: Database["public"]["Enums"]["file_type"]
          has_container_info: boolean | null
          has_seal_info: boolean | null
          id: string
          parsed_data: Json | null
          row_count: number | null
          rows_with_containers: number | null
          status: Database["public"]["Enums"]["file_status"]
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          column_mapping?: Json | null
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type: Database["public"]["Enums"]["file_type"]
          has_container_info?: boolean | null
          has_seal_info?: boolean | null
          id?: string
          parsed_data?: Json | null
          row_count?: number | null
          rows_with_containers?: number | null
          status?: Database["public"]["Enums"]["file_status"]
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          column_mapping?: Json | null
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: Database["public"]["Enums"]["file_type"]
          has_container_info?: boolean | null
          has_seal_info?: boolean | null
          id?: string
          parsed_data?: Json | null
          row_count?: number | null
          rows_with_containers?: number | null
          status?: Database["public"]["Enums"]["file_status"]
          storage_path?: string | null
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
      allocation_method:
        | "by_pallets"
        | "by_cartons"
        | "by_column_value"
        | "equal_distribution"
      container_status: "pending" | "loading" | "sealed" | "dispatched"
      file_status: "uploaded" | "processing" | "processed" | "error"
      file_type: "po" | "mt" | "excel" | "csv"
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
      allocation_method: [
        "by_pallets",
        "by_cartons",
        "by_column_value",
        "equal_distribution",
      ],
      container_status: ["pending", "loading", "sealed", "dispatched"],
      file_status: ["uploaded", "processing", "processed", "error"],
      file_type: ["po", "mt", "excel", "csv"],
    },
  },
} as const
