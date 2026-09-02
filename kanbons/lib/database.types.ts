export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      customers: {
        Row: {
          address: string | null
          city: string | null
          email_contact: string | null
          id: number
          id_cust: string | null
          name: string
          point_of_contact: string | null
          state: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          email_contact?: string | null
          id?: number
          id_cust?: string | null
          name: string
          point_of_contact?: string | null
          state?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          email_contact?: string | null
          id?: number
          id_cust?: string | null
          name?: string
          point_of_contact?: string | null
          state?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      packing_list_lines: {
        Row: {
          id: number
          packing_list_id: number
          pre_uni: number | null
          product: string | null
          product_id: number | null
          type_of_unit: string | null
          unit: number | null
          yards_pieces: number | null
        }
        Insert: {
          id?: never
          packing_list_id: number
          pre_uni?: number | null
          product?: string | null
          product_id?: number | null
          type_of_unit?: string | null
          unit?: number | null
          yards_pieces?: number | null
        }
        Update: {
          id?: never
          packing_list_id?: number
          pre_uni?: number | null
          product?: string | null
          product_id?: number | null
          type_of_unit?: string | null
          unit?: number | null
          yards_pieces?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "packing_list_lines_packing_list_id_fkey"
            columns: ["packing_list_id"]
            isOneToOne: false
            referencedRelation: "packing_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packing_list_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "contador"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "packing_list_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      packing_lists: {
        Row: {
          customer: string | null
          customer_id: number | null
          customer_po: string | null
          date: string | null
          id: number
          num_pl: number
          ship_date: string | null
          state: string | null
        }
        Insert: {
          customer?: string | null
          customer_id?: number | null
          customer_po?: string | null
          date?: string | null
          id?: never
          num_pl: number
          ship_date?: string | null
          state?: string | null
        }
        Update: {
          customer?: string | null
          customer_id?: number | null
          customer_po?: string | null
          date?: string | null
          id?: never
          num_pl?: number
          ship_date?: string | null
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packing_lists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_mappings: {
        Row: {
          client_name: string
          id: number
          item_code: string | null
          kanbons_name: string | null
          product_id: number | null
        }
        Insert: {
          client_name: string
          id?: never
          item_code?: string | null
          kanbons_name?: string | null
          product_id?: number | null
        }
        Update: {
          client_name?: string
          id?: never
          item_code?: string | null
          kanbons_name?: string | null
          product_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_mappings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "contador"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_mappings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          id: number
          num: string
          pre_uni: number | null
          product: string
          type_of_unit: string | null
          type_of_unit_customer: string | null
          unit_of_measurement: string | null
          unit_pack: number | null
        }
        Insert: {
          id?: never
          num: string
          pre_uni?: number | null
          product: string
          type_of_unit?: string | null
          type_of_unit_customer?: string | null
          unit_of_measurement?: string | null
          unit_pack?: number | null
        }
        Update: {
          id?: never
          num?: string
          pre_uni?: number | null
          product?: string
          type_of_unit?: string | null
          type_of_unit_customer?: string | null
          unit_of_measurement?: string | null
          unit_pack?: number | null
        }
        Relationships: []
      }
      shipment_lines: {
        Row: {
          id: number
          product: string | null
          product_id: number | null
          shipment_id: number
          sku: string | null
          type_of_unit: string | null
          unit: number | null
          yards_pcs: number | null
        }
        Insert: {
          id?: never
          product?: string | null
          product_id?: number | null
          shipment_id: number
          sku?: string | null
          type_of_unit?: string | null
          unit?: number | null
          yards_pcs?: number | null
        }
        Update: {
          id?: never
          product?: string | null
          product_id?: number | null
          shipment_id?: number
          sku?: string | null
          type_of_unit?: string | null
          unit?: number | null
          yards_pcs?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "contador"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "shipment_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_lines_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          arrival_date: string | null
          container_number: string | null
          country: string | null
          departure_date: string | null
          id: number
          number: number
        }
        Insert: {
          arrival_date?: string | null
          container_number?: string | null
          country?: string | null
          departure_date?: string | null
          id?: never
          number: number
        }
        Update: {
          arrival_date?: string | null
          container_number?: string | null
          country?: string | null
          departure_date?: string | null
          id?: never
          number?: number
        }
        Relationships: []
      }
      stock: {
        Row: {
          contador_counted_at: string | null
          contador_physical: number | null
          product_id: number
          quantity: number | null
        }
        Insert: {
          contador_counted_at?: string | null
          contador_physical?: number | null
          product_id: number
          quantity?: number | null
        }
        Update: {
          contador_counted_at?: string | null
          contador_physical?: number | null
          product_id?: number
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "contador"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      contador: {
        Row: {
          book_measurement: number | null
          book_mismatch: boolean | null
          book_quantity: number | null
          contador_counted_at: string | null
          difference: number | null
          have: number | null
          num: string | null
          pre_uni: number | null
          product: string | null
          product_id: number | null
          sold: number | null
          unit_pack: number | null
          warehouse: number | null
          warehouse_mismatch: boolean | null
        }
        Relationships: []
      }
      packing_list_line_totals: {
        Row: {
          id: number | null
          packing_list_id: number | null
          pre_uni: number | null
          product: string | null
          product_id: number | null
          total: number | null
          type_of_unit: string | null
          unit: number | null
          yards_pieces: number | null
        }
        Insert: {
          id?: number | null
          packing_list_id?: number | null
          pre_uni?: number | null
          product?: string | null
          product_id?: number | null
          total?: never
          type_of_unit?: string | null
          unit?: number | null
          yards_pieces?: number | null
        }
        Update: {
          id?: number | null
          packing_list_id?: number | null
          pre_uni?: number | null
          product?: string | null
          product_id?: number | null
          total?: never
          type_of_unit?: string | null
          unit?: number | null
          yards_pieces?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "packing_list_lines_packing_list_id_fkey"
            columns: ["packing_list_id"]
            isOneToOne: false
            referencedRelation: "packing_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packing_list_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "contador"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "packing_list_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

