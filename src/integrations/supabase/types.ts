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
      bank_sov_lines: {
        Row: {
          created_at: string | null
          description: string
          id: string
          line_number: number
          project_id: string | null
          scheduled_value: number | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          line_number: number
          project_id?: string | null
          scheduled_value?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          line_number?: number
          project_id?: string | null
          scheduled_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_sov_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bookkeeping_entries: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          description: string
          entry_date: string
          entry_type: string
          extraction_method: string | null
          file_filename: string | null
          file_url: string | null
          id: string
          linked_draw_id: string | null
          linked_invoice_id: string | null
          linked_wire_id: string | null
          notes: string | null
          payment_method: string | null
          project_id: string | null
          reference_number: string | null
          status: string | null
          subcategory: string | null
          updated_at: string | null
          vendor_payee: string | null
          visible_to_client: boolean | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          description: string
          entry_date: string
          entry_type: string
          extraction_method?: string | null
          file_filename?: string | null
          file_url?: string | null
          id?: string
          linked_draw_id?: string | null
          linked_invoice_id?: string | null
          linked_wire_id?: string | null
          notes?: string | null
          payment_method?: string | null
          project_id?: string | null
          reference_number?: string | null
          status?: string | null
          subcategory?: string | null
          updated_at?: string | null
          vendor_payee?: string | null
          visible_to_client?: boolean | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          description?: string
          entry_date?: string
          entry_type?: string
          extraction_method?: string | null
          file_filename?: string | null
          file_url?: string | null
          id?: string
          linked_draw_id?: string | null
          linked_invoice_id?: string | null
          linked_wire_id?: string | null
          notes?: string | null
          payment_method?: string | null
          project_id?: string | null
          reference_number?: string | null
          status?: string | null
          subcategory?: string | null
          updated_at?: string | null
          vendor_payee?: string | null
          visible_to_client?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "bookkeeping_entries_linked_draw_id_fkey"
            columns: ["linked_draw_id"]
            isOneToOne: false
            referencedRelation: "draws"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookkeeping_entries_linked_invoice_id_fkey"
            columns: ["linked_invoice_id"]
            isOneToOne: false
            referencedRelation: "gc_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookkeeping_entries_linked_wire_id_fkey"
            columns: ["linked_wire_id"]
            isOneToOne: false
            referencedRelation: "developer_wires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookkeeping_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
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
      cashflow_entries: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          description: string | null
          direction: string
          draw_id: string | null
          entry_date: string
          entry_type: string
          id: string
          is_projected: boolean | null
          notes: string | null
          project_id: string | null
          week_number: number | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          description?: string | null
          direction: string
          draw_id?: string | null
          entry_date: string
          entry_type: string
          id?: string
          is_projected?: boolean | null
          notes?: string | null
          project_id?: string | null
          week_number?: number | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          description?: string | null
          direction?: string
          draw_id?: string | null
          entry_date?: string
          entry_type?: string
          id?: string
          is_projected?: boolean | null
          notes?: string | null
          project_id?: string | null
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cashflow_entries_draw_id_fkey"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "draws"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashflow_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      developer_wires: {
        Row: {
          amount: number
          bank_reference: string | null
          beneficiary: string | null
          concept: string | null
          created_at: string | null
          draw_id: string | null
          extraction_method: string | null
          file_filename: string | null
          file_url: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          project_id: string | null
          status: string | null
          updated_at: string | null
          visible_to_client: boolean | null
          wire_date: string
          wire_number: string | null
        }
        Insert: {
          amount: number
          bank_reference?: string | null
          beneficiary?: string | null
          concept?: string | null
          created_at?: string | null
          draw_id?: string | null
          extraction_method?: string | null
          file_filename?: string | null
          file_url?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          project_id?: string | null
          status?: string | null
          updated_at?: string | null
          visible_to_client?: boolean | null
          wire_date: string
          wire_number?: string | null
        }
        Update: {
          amount?: number
          bank_reference?: string | null
          beneficiary?: string | null
          concept?: string | null
          created_at?: string | null
          draw_id?: string | null
          extraction_method?: string | null
          file_filename?: string | null
          file_url?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          project_id?: string | null
          status?: string | null
          updated_at?: string | null
          visible_to_client?: boolean | null
          wire_date?: string
          wire_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "developer_wires_draw_id_fkey"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "draws"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "developer_wires_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gc_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "developer_wires_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_categories: {
        Row: {
          code: string
          color: string | null
          description: string | null
          icon: string | null
          id: string
          is_required_check: boolean | null
          name: string
          sequence: number | null
        }
        Insert: {
          code: string
          color?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_required_check?: boolean | null
          name: string
          sequence?: number | null
        }
        Update: {
          code?: string
          color?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_required_check?: boolean | null
          name?: string
          sequence?: number | null
        }
        Relationships: []
      }
      doc_required_templates: {
        Row: {
          category_code: string | null
          description: string | null
          expiration_alert_days: number | null
          expiration_required: boolean | null
          id: string
          is_mandatory: boolean | null
          name: string
          responsible_role: string | null
          sequence: number | null
        }
        Insert: {
          category_code?: string | null
          description?: string | null
          expiration_alert_days?: number | null
          expiration_required?: boolean | null
          id?: string
          is_mandatory?: boolean | null
          name: string
          responsible_role?: string | null
          sequence?: number | null
        }
        Update: {
          category_code?: string | null
          description?: string | null
          expiration_alert_days?: number | null
          expiration_required?: boolean | null
          id?: string
          is_mandatory?: boolean | null
          name?: string
          responsible_role?: string | null
          sequence?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_required_templates_category_code_fkey"
            columns: ["category_code"]
            isOneToOne: false
            referencedRelation: "doc_categories"
            referencedColumns: ["code"]
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
      draw_line_items: {
        Row: {
          amount_cumulative: number | null
          amount_previous: number | null
          amount_this_draw: number | null
          balance_to_finish: number | null
          bank_sov_line_id: string | null
          created_at: string | null
          description: string
          draw_id: string | null
          id: string
          line_number: number | null
          pct_complete: number | null
          project_id: string | null
          scheduled_value: number | null
        }
        Insert: {
          amount_cumulative?: number | null
          amount_previous?: number | null
          amount_this_draw?: number | null
          balance_to_finish?: number | null
          bank_sov_line_id?: string | null
          created_at?: string | null
          description: string
          draw_id?: string | null
          id?: string
          line_number?: number | null
          pct_complete?: number | null
          project_id?: string | null
          scheduled_value?: number | null
        }
        Update: {
          amount_cumulative?: number | null
          amount_previous?: number | null
          amount_this_draw?: number | null
          balance_to_finish?: number | null
          bank_sov_line_id?: string | null
          created_at?: string | null
          description?: string
          draw_id?: string | null
          id?: string
          line_number?: number | null
          pct_complete?: number | null
          project_id?: string | null
          scheduled_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "draw_line_items_bank_sov_line_id_fkey"
            columns: ["bank_sov_line_id"]
            isOneToOne: false
            referencedRelation: "bank_sov_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draw_line_items_draw_id_fkey"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "draws"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draw_line_items_project_id_fkey"
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
          pdf_url: string | null
          project_id: string | null
          request_date: string | null
          sent_to_bank_at: string | null
          source: string | null
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
          pdf_url?: string | null
          project_id?: string | null
          request_date?: string | null
          sent_to_bank_at?: string | null
          source?: string | null
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
          pdf_url?: string | null
          project_id?: string | null
          request_date?: string | null
          sent_to_bank_at?: string | null
          source?: string | null
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
      field_visits: {
        Row: {
          action_items: string | null
          concerns: string | null
          created_at: string | null
          general_summary: string | null
          highlights: string | null
          id: string
          next_visit_date: string | null
          phase: string | null
          physical_progress_observed: number | null
          project_id: string | null
          updated_at: string | null
          visible_to_client: boolean | null
          visit_date: string
          visited_by: string
          weather_conditions: string | null
          workers_on_site: number | null
        }
        Insert: {
          action_items?: string | null
          concerns?: string | null
          created_at?: string | null
          general_summary?: string | null
          highlights?: string | null
          id?: string
          next_visit_date?: string | null
          phase?: string | null
          physical_progress_observed?: number | null
          project_id?: string | null
          updated_at?: string | null
          visible_to_client?: boolean | null
          visit_date: string
          visited_by: string
          weather_conditions?: string | null
          workers_on_site?: number | null
        }
        Update: {
          action_items?: string | null
          concerns?: string | null
          created_at?: string | null
          general_summary?: string | null
          highlights?: string | null
          id?: string
          next_visit_date?: string | null
          phase?: string | null
          physical_progress_observed?: number | null
          project_id?: string | null
          updated_at?: string | null
          visible_to_client?: boolean | null
          visit_date?: string
          visited_by?: string
          weather_conditions?: string | null
          workers_on_site?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "field_visits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      gc_invoice_lines: {
        Row: {
          amount: number | null
          created_at: string | null
          description: string | null
          id: string
          invoice_id: string | null
          line_number: number | null
          product_service: string
          project_id: string | null
          quantity: number | null
          sov_line_id: string | null
          unit_price: number | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          line_number?: number | null
          product_service: string
          project_id?: string | null
          quantity?: number | null
          sov_line_id?: string | null
          unit_price?: number | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          line_number?: number | null
          product_service?: string
          project_id?: string | null
          quantity?: number | null
          sov_line_id?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gc_invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gc_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gc_invoice_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gc_invoice_lines_sov_line_id_fkey"
            columns: ["sov_line_id"]
            isOneToOne: false
            referencedRelation: "sov_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      gc_invoices: {
        Row: {
          created_at: string | null
          extraction_method: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          notes: string | null
          pdf_filename: string | null
          pdf_url: string | null
          period_from: string | null
          period_to: string | null
          project_id: string | null
          status: string | null
          total_amount: number | null
          updated_at: string | null
          visible_to_client: boolean | null
        }
        Insert: {
          created_at?: string | null
          extraction_method?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          notes?: string | null
          pdf_filename?: string | null
          pdf_url?: string | null
          period_from?: string | null
          period_to?: string | null
          project_id?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          visible_to_client?: boolean | null
        }
        Update: {
          created_at?: string | null
          extraction_method?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          notes?: string | null
          pdf_filename?: string | null
          pdf_url?: string | null
          period_from?: string | null
          period_to?: string | null
          project_id?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          visible_to_client?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "gc_invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      gc_profiles: {
        Row: {
          address: string | null
          company_name: string
          contact_name: string | null
          created_at: string | null
          email: string
          id: string
          license_number: string | null
          logo_url: string | null
          notes: string | null
          phone: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          company_name: string
          contact_name?: string | null
          created_at?: string | null
          email: string
          id?: string
          license_number?: string | null
          logo_url?: string | null
          notes?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          company_name?: string
          contact_name?: string | null
          created_at?: string | null
          email?: string
          id?: string
          license_number?: string | null
          logo_url?: string | null
          notes?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      gc_project_access: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          gc_user_id: string
          id: string
          permissions: Json | null
          project_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          gc_user_id: string
          id?: string
          permissions?: Json | null
          project_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          gc_user_id?: string
          id?: string
          permissions?: Json | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gc_project_access_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      gc_waivers: {
        Row: {
          amount: number | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          draw_id: string | null
          file_filename: string | null
          file_url: string | null
          gc_user_id: string | null
          id: string
          notes: string | null
          project_id: string
          status: string | null
          submitted_at: string | null
          through_date: string | null
          waiver_type: string
        }
        Insert: {
          amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          draw_id?: string | null
          file_filename?: string | null
          file_url?: string | null
          gc_user_id?: string | null
          id?: string
          notes?: string | null
          project_id: string
          status?: string | null
          submitted_at?: string | null
          through_date?: string | null
          waiver_type: string
        }
        Update: {
          amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          draw_id?: string | null
          file_filename?: string | null
          file_url?: string | null
          gc_user_id?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          status?: string | null
          submitted_at?: string | null
          through_date?: string | null
          waiver_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "gc_waivers_draw_id_fkey"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "draws"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gc_waivers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          completed_date: string | null
          created_at: string | null
          id: string
          inspector_name: string | null
          name: string
          notes: string | null
          permit_id: string | null
          phase: string
          project_id: string | null
          re_inspection_date: string | null
          re_inspection_required: boolean | null
          result: string | null
          scheduled_date: string | null
          sequence: number | null
          status: string | null
          updated_at: string | null
          visible_to_client: boolean | null
        }
        Insert: {
          completed_date?: string | null
          created_at?: string | null
          id?: string
          inspector_name?: string | null
          name: string
          notes?: string | null
          permit_id?: string | null
          phase: string
          project_id?: string | null
          re_inspection_date?: string | null
          re_inspection_required?: boolean | null
          result?: string | null
          scheduled_date?: string | null
          sequence?: number | null
          status?: string | null
          updated_at?: string | null
          visible_to_client?: boolean | null
        }
        Update: {
          completed_date?: string | null
          created_at?: string | null
          id?: string
          inspector_name?: string | null
          name?: string
          notes?: string | null
          permit_id?: string | null
          phase?: string
          project_id?: string | null
          re_inspection_date?: string | null
          re_inspection_required?: boolean | null
          result?: string | null
          scheduled_date?: string | null
          sequence?: number | null
          status?: string | null
          updated_at?: string | null
          visible_to_client?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "inspections_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "permits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          assigned_to: string | null
          category: string | null
          description: string
          due_date: string | null
          id: string
          level: string
          opened_at: string | null
          project_id: string | null
          resolution_note: string | null
          resolved_at: string | null
          severity: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          visible_to_client: boolean | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          description: string
          due_date?: string | null
          id?: string
          level: string
          opened_at?: string | null
          project_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          visible_to_client?: boolean | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          description?: string
          due_date?: string | null
          id?: string
          level?: string
          opened_at?: string | null
          project_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          visible_to_client?: boolean | null
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
      milestones: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          baseline_end: string | null
          baseline_start: string | null
          created_at: string | null
          id: string
          is_critical_path: boolean | null
          name: string
          notes: string | null
          phase: string
          project_id: string | null
          sequence: number
          status: string | null
          updated_at: string | null
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          baseline_end?: string | null
          baseline_start?: string | null
          created_at?: string | null
          id?: string
          is_critical_path?: boolean | null
          name: string
          notes?: string | null
          phase: string
          project_id?: string | null
          sequence?: number
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          baseline_end?: string | null
          baseline_start?: string | null
          created_at?: string | null
          id?: string
          is_critical_path?: boolean | null
          name?: string
          notes?: string | null
          phase?: string
          project_id?: string | null
          sequence?: number
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications_log: {
        Row: {
          id: string
          project_id: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
          type: string
          user_id: string
        }
        Insert: {
          id?: string
          project_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          type: string
          user_id: string
        }
        Update: {
          id?: string
          project_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_items: {
        Row: {
          assigned_to: string | null
          block: string
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          due_date: string | null
          id: string
          item_text: string
          notes: string | null
          project_id: string | null
          section: string
          sequence: number
          status: string | null
          updated_at: string | null
          visible_to_client: boolean | null
        }
        Insert: {
          assigned_to?: string | null
          block: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          item_text: string
          notes?: string | null
          project_id?: string | null
          section: string
          sequence?: number
          status?: string | null
          updated_at?: string | null
          visible_to_client?: boolean | null
        }
        Update: {
          assigned_to?: string | null
          block?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          item_text?: string
          notes?: string | null
          project_id?: string | null
          section?: string
          sequence?: number
          status?: string | null
          updated_at?: string | null
          visible_to_client?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      permits: {
        Row: {
          applied_date: string | null
          created_at: string | null
          expiration_date: string | null
          id: string
          inspection_date: string | null
          inspection_required: boolean | null
          inspection_result: string | null
          inspection_status: string | null
          inspector_name: string | null
          issued_date: string | null
          issuing_authority: string | null
          notes: string | null
          permit_number: string | null
          project_id: string | null
          status: string | null
          type: string
          updated_at: string | null
          visible_to_client: boolean | null
        }
        Insert: {
          applied_date?: string | null
          created_at?: string | null
          expiration_date?: string | null
          id?: string
          inspection_date?: string | null
          inspection_required?: boolean | null
          inspection_result?: string | null
          inspection_status?: string | null
          inspector_name?: string | null
          issued_date?: string | null
          issuing_authority?: string | null
          notes?: string | null
          permit_number?: string | null
          project_id?: string | null
          status?: string | null
          type: string
          updated_at?: string | null
          visible_to_client?: boolean | null
        }
        Update: {
          applied_date?: string | null
          created_at?: string | null
          expiration_date?: string | null
          id?: string
          inspection_date?: string | null
          inspection_required?: boolean | null
          inspection_result?: string | null
          inspection_status?: string | null
          inspector_name?: string | null
          issued_date?: string | null
          issuing_authority?: string | null
          notes?: string | null
          permit_number?: string | null
          project_id?: string | null
          status?: string | null
          type?: string
          updated_at?: string | null
          visible_to_client?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "permits_project_id_fkey"
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
      project_documents: {
        Row: {
          action_notes: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          assigned_to: string | null
          category: string
          chase_count: number | null
          created_at: string | null
          description: string | null
          due_date: string | null
          expiration_date: string | null
          file_name: string | null
          file_size_kb: number | null
          file_url: string | null
          id: string
          is_current_version: boolean | null
          is_required: boolean | null
          last_chased_at: string | null
          name: string
          notes: string | null
          parent_document_id: string | null
          priority: string | null
          project_id: string | null
          rejection_reason: string | null
          review_requested_at: string | null
          review_requested_by: string | null
          status: string | null
          subcategory: string | null
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          uploaded_by_role: string | null
          version: number | null
          visible_to_client: boolean | null
          visible_to_gc: boolean | null
        }
        Insert: {
          action_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          category: string
          chase_count?: number | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          expiration_date?: string | null
          file_name?: string | null
          file_size_kb?: number | null
          file_url?: string | null
          id?: string
          is_current_version?: boolean | null
          is_required?: boolean | null
          last_chased_at?: string | null
          name: string
          notes?: string | null
          parent_document_id?: string | null
          priority?: string | null
          project_id?: string | null
          rejection_reason?: string | null
          review_requested_at?: string | null
          review_requested_by?: string | null
          status?: string | null
          subcategory?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          uploaded_by_role?: string | null
          version?: number | null
          visible_to_client?: boolean | null
          visible_to_gc?: boolean | null
        }
        Update: {
          action_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          category?: string
          chase_count?: number | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          expiration_date?: string | null
          file_name?: string | null
          file_size_kb?: number | null
          file_url?: string | null
          id?: string
          is_current_version?: boolean | null
          is_required?: boolean | null
          last_chased_at?: string | null
          name?: string
          notes?: string | null
          parent_document_id?: string | null
          priority?: string | null
          project_id?: string | null
          rejection_reason?: string | null
          review_requested_at?: string | null
          review_requested_by?: string | null
          status?: string | null
          subcategory?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          uploaded_by_role?: string | null
          version?: number | null
          visible_to_client?: boolean | null
          visible_to_gc?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "project_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_financials: {
        Row: {
          arv_current: number | null
          arv_original: number | null
          arv_updated_at: string | null
          contingency_pct: number | null
          cost_variance_pct: number | null
          created_at: string | null
          equity_invested: number | null
          estimated_days_to_sell: number | null
          exit_strategy: string | null
          financing_costs: number | null
          hard_costs: number | null
          id: string
          interest_rate: number | null
          land_cost: number | null
          loan_amount: number | null
          loan_maturity_date: string | null
          loan_start_date: string | null
          loan_term_months: number | null
          price_variance_pct: number | null
          project_id: string | null
          sale_price_conservative: number | null
          sale_price_minimum: number | null
          sale_price_target: number | null
          soft_costs: number | null
          time_variance_months: number | null
          updated_at: string | null
        }
        Insert: {
          arv_current?: number | null
          arv_original?: number | null
          arv_updated_at?: string | null
          contingency_pct?: number | null
          cost_variance_pct?: number | null
          created_at?: string | null
          equity_invested?: number | null
          estimated_days_to_sell?: number | null
          exit_strategy?: string | null
          financing_costs?: number | null
          hard_costs?: number | null
          id?: string
          interest_rate?: number | null
          land_cost?: number | null
          loan_amount?: number | null
          loan_maturity_date?: string | null
          loan_start_date?: string | null
          loan_term_months?: number | null
          price_variance_pct?: number | null
          project_id?: string | null
          sale_price_conservative?: number | null
          sale_price_minimum?: number | null
          sale_price_target?: number | null
          soft_costs?: number | null
          time_variance_months?: number | null
          updated_at?: string | null
        }
        Update: {
          arv_current?: number | null
          arv_original?: number | null
          arv_updated_at?: string | null
          contingency_pct?: number | null
          cost_variance_pct?: number | null
          created_at?: string | null
          equity_invested?: number | null
          estimated_days_to_sell?: number | null
          exit_strategy?: string | null
          financing_costs?: number | null
          hard_costs?: number | null
          id?: string
          interest_rate?: number | null
          land_cost?: number | null
          loan_amount?: number | null
          loan_maturity_date?: string | null
          loan_start_date?: string | null
          loan_term_months?: number | null
          price_variance_pct?: number | null
          project_id?: string | null
          sale_price_conservative?: number | null
          sale_price_minimum?: number | null
          sale_price_target?: number | null
          soft_costs?: number | null
          time_variance_months?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_financials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
          gc_construction_fee_pct: number | null
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
          gc_construction_fee_pct?: number | null
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
          gc_construction_fee_pct?: number | null
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
      quality_checklist_items: {
        Row: {
          category: string
          created_at: string | null
          id: string
          item: string
          notes: string | null
          phase: string
          project_id: string | null
          requires_action: boolean | null
          result: string | null
          sequence: number | null
          visit_id: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          item: string
          notes?: string | null
          phase: string
          project_id?: string | null
          requires_action?: boolean | null
          result?: string | null
          sequence?: number | null
          visit_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          item?: string
          notes?: string | null
          phase?: string
          project_id?: string | null
          requires_action?: boolean | null
          result?: string | null
          sequence?: number | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_checklist_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_checklist_items_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "field_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_issues: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          phase: string | null
          project_id: string | null
          resolution: string | null
          resolved_at: string | null
          severity: string | null
          status: string | null
          title: string
          updated_at: string | null
          visible_to_client: boolean | null
          visit_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          phase?: string | null
          project_id?: string | null
          resolution?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          visible_to_client?: boolean | null
          visit_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          phase?: string | null
          project_id?: string | null
          resolution?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          visible_to_client?: boolean | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_issues_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "field_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      risks: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          impact: string
          level: string | null
          mitigation: string | null
          owner: string | null
          probability: string
          project_id: string | null
          status: string | null
          title: string
          updated_at: string | null
          visible_to_client: boolean | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          impact?: string
          level?: string | null
          mitigation?: string | null
          owner?: string | null
          probability?: string
          project_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          visible_to_client?: boolean | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          impact?: string
          level?: string | null
          mitigation?: string | null
          owner?: string | null
          probability?: string
          project_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          visible_to_client?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "risks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sov_lines: {
        Row: {
          budget: number | null
          budget_progress_pct: number | null
          end_date: string | null
          excluded_from_total: boolean | null
          fase: string | null
          font_color: string | null
          id: string
          line_number: string
          name: string
          progress_pct: number | null
          project_id: string | null
          real_cost: number | null
          row_color: string | null
          start_date: string | null
          subfase: string | null
          updated_at: string | null
        }
        Insert: {
          budget?: number | null
          budget_progress_pct?: number | null
          end_date?: string | null
          excluded_from_total?: boolean | null
          fase?: string | null
          font_color?: string | null
          id?: string
          line_number: string
          name: string
          progress_pct?: number | null
          project_id?: string | null
          real_cost?: number | null
          row_color?: string | null
          start_date?: string | null
          subfase?: string | null
          updated_at?: string | null
        }
        Update: {
          budget?: number | null
          budget_progress_pct?: number | null
          end_date?: string | null
          excluded_from_total?: boolean | null
          fase?: string | null
          font_color?: string | null
          id?: string
          line_number?: string
          name?: string
          progress_pct?: number | null
          project_id?: string | null
          real_cost?: number | null
          row_color?: string | null
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
      visit_photos: {
        Row: {
          caption: string | null
          category: string | null
          created_at: string | null
          id: string
          is_issue: boolean | null
          phase: string | null
          photo_url: string
          project_id: string | null
          taken_at: string | null
          visible_to_client: boolean | null
          visit_id: string | null
        }
        Insert: {
          caption?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          is_issue?: boolean | null
          phase?: string | null
          photo_url: string
          project_id?: string | null
          taken_at?: string | null
          visible_to_client?: boolean | null
          visit_id?: string | null
        }
        Update: {
          caption?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          is_issue?: boolean | null
          phase?: string | null
          photo_url?: string
          project_id?: string | null
          taken_at?: string | null
          visible_to_client?: boolean | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_photos_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "field_visits"
            referencedColumns: ["id"]
          },
        ]
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
      delete_platform_user: { Args: { target_user_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_editor: { Args: never; Returns: boolean }
      is_gc: { Args: never; Returns: boolean }
      is_viewer: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "editor" | "viewer" | "gc"
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
      app_role: ["admin", "user", "editor", "viewer", "gc"],
    },
  },
} as const
