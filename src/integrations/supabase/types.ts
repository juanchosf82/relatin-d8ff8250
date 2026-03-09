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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cashflow: {
        Row: {
          balance: number | null
          id: string
          inflows: number | null
          outflows: number | null
          project_id: string | null
          week_label: string | null
          week_order: number | null
        }
        Insert: {
          balance?: number | null
          id?: string
          inflows?: number | null
          outflows?: number | null
          project_id?: string | null
          week_label?: string | null
          week_order?: number | null
        }
        Update: {
          balance?: number | null
          id?: string
          inflows?: number | null
          outflows?: number | null
          project_id?: string | null
          week_label?: string | null
          week_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cashflow_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string | null
          file_url: string | null
          id: string
          name: string
          project_id: string | null
          uploaded_at: string | null
          visible_to_client: boolean | null
          visible_to_lender: boolean | null
        }
        Insert: {
          category?: string | null
          file_url?: string | null
          id?: string
          name: string
          project_id?: string | null
          uploaded_at?: string | null
          visible_to_client?: boolean | null
          visible_to_lender?: boolean | null
        }
        Update: {
          category?: string | null
          file_url?: string | null
          id?: string
          name?: string
          project_id?: string | null
          uploaded_at?: string | null
          visible_to_client?: boolean | null
          visible_to_lender?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      draws: {
        Row: {
          amount_certified: number | null
          amount_requested: number | null
          certificate_url: string | null
          draw_number: number
          id: string
          notes: string | null
          paid_at: string | null
          project_id: string | null
          request_date: string | null
          sent_to_bank_at: string | null
          status: string | null
        }
        Insert: {
          amount_certified?: number | null
          amount_requested?: number | null
          certificate_url?: string | null
          draw_number: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          project_id?: string | null
          request_date?: string | null
          sent_to_bank_at?: string | null
          status?: string | null
        }
        Update: {
          amount_certified?: number | null
          amount_requested?: number | null
          certificate_url?: string | null
          draw_number?: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          project_id?: string | null
          request_date?: string | null
          sent_to_bank_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "draws_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          description: string
          id: string
          level: string
          opened_at: string | null
          project_id: string | null
          resolution_note: string | null
          resolved_at: string | null
          status: string | null
        }
        Insert: {
          description: string
          id?: string
          level: string
          opened_at?: string | null
          project_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          status?: string | null
        }
        Update: {
          description?: string
          id?: string
          level?: string
          opened_at?: string | null
          project_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          last_login_at: string | null
          notes: string | null
          phone: string | null
          preferred_language: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          last_login_at?: string | null
          notes?: string | null
          phone?: string | null
          preferred_language?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          notes?: string | null
          phone?: string | null
          preferred_language?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_links: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string
          id: string
          label: string
          project_id: string | null
          sort_order: number | null
          url: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string
          id?: string
          label: string
          project_id?: string | null
          sort_order?: number | null
          url: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string
          id?: string
          label?: string
          project_id?: string | null
          sort_order?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string
          client_user_id: string | null
          co_target_date: string | null
          code: string
          created_at: string | null
          eac: number | null
          gc_license: string | null
          gc_name: string | null
          id: string
          last_visit_date: string | null
          lender_name: string | null
          lender_user_id: string | null
          liens_count: number | null
          loan_amount: number | null
          permit_no: string | null
          permit_status: string | null
          progress_pct: number | null
          status: string | null
        }
        Insert: {
          address: string
          client_user_id?: string | null
          co_target_date?: string | null
          code: string
          created_at?: string | null
          eac?: number | null
          gc_license?: string | null
          gc_name?: string | null
          id?: string
          last_visit_date?: string | null
          lender_name?: string | null
          lender_user_id?: string | null
          liens_count?: number | null
          loan_amount?: number | null
          permit_no?: string | null
          permit_status?: string | null
          progress_pct?: number | null
          status?: string | null
        }
        Update: {
          address?: string
          client_user_id?: string | null
          co_target_date?: string | null
          code?: string
          created_at?: string | null
          eac?: number | null
          gc_license?: string | null
          gc_name?: string | null
          id?: string
          last_visit_date?: string | null
          lender_name?: string | null
          lender_user_id?: string | null
          liens_count?: number | null
          loan_amount?: number | null
          permit_no?: string | null
          permit_status?: string | null
          progress_pct?: number | null
          status?: string | null
        }
        Relationships: []
      }
      sov_lines: {
        Row: {
          budget: number | null
          budget_progress_pct: number | null
          end_date: string | null
          fase: string | null
          id: string
          line_number: string
          name: string
          progress_pct: number | null
          project_id: string | null
          real_cost: number | null
          start_date: string | null
          subfase: string | null
          updated_at: string | null
        }
        Insert: {
          budget?: number | null
          budget_progress_pct?: number | null
          end_date?: string | null
          fase?: string | null
          id?: string
          line_number: string
          name: string
          progress_pct?: number | null
          project_id?: string | null
          real_cost?: number | null
          start_date?: string | null
          subfase?: string | null
          updated_at?: string | null
        }
        Update: {
          budget?: number | null
          budget_progress_pct?: number | null
          end_date?: string | null
          fase?: string | null
          id?: string
          line_number?: string
          name?: string
          progress_pct?: number | null
          project_id?: string | null
          real_cost?: number | null
          start_date?: string | null
          subfase?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sov_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_project_access: {
        Row: {
          access_level: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          permissions: Json | null
          project_id: string
          user_id: string
        }
        Insert: {
          access_level?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permissions?: Json | null
          project_id: string
          user_id: string
        }
        Update: {
          access_level?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permissions?: Json | null
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_project_access_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_reports: {
        Row: {
          closing_balance: number | null
          highlight_text: string | null
          id: string
          pdf_url: string | null
          project_id: string | null
          published_at: string | null
          report_date: string | null
          week_number: number | null
        }
        Insert: {
          closing_balance?: number | null
          highlight_text?: string | null
          id?: string
          pdf_url?: string | null
          project_id?: string | null
          published_at?: string | null
          report_date?: string | null
          week_number?: number | null
        }
        Update: {
          closing_balance?: number | null
          highlight_text?: string | null
          id?: string
          pdf_url?: string | null
          project_id?: string | null
          published_at?: string | null
          report_date?: string | null
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "editor" | "viewer"
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
      app_role: ["admin", "user", "editor", "viewer"],
    },
  },
} as const
