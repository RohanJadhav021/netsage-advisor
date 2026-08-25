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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      cases: {
        Row: {
          additional_notes: string
          case_id: string
          concept: string
          created_at: string
          device_info: string
          expected_fault: string
          id: string
          is_demo: boolean
          issue_type: string
          osi_layer: string
          severity: string
          show_output: string
          symptom: string
          topology: string
        }
        Insert: {
          additional_notes?: string
          case_id: string
          concept?: string
          created_at?: string
          device_info?: string
          expected_fault?: string
          id?: string
          is_demo?: boolean
          issue_type?: string
          osi_layer?: string
          severity?: string
          show_output?: string
          symptom: string
          topology?: string
        }
        Update: {
          additional_notes?: string
          case_id?: string
          concept?: string
          created_at?: string
          device_info?: string
          expected_fault?: string
          id?: string
          is_demo?: boolean
          issue_type?: string
          osi_layer?: string
          severity?: string
          show_output?: string
          symptom?: string
          topology?: string
        }
        Relationships: []
      }
      diagnoses: {
        Row: {
          case_id: string
          concept: string
          confidence: number
          created_at: string
          evidence: string[]
          fix_steps: string[]
          id: string
          model: string
          next_command: string
          osi_layer: string
          raw_response: Json | null
          root_cause: string
          severity: string
        }
        Insert: {
          case_id: string
          concept?: string
          confidence?: number
          created_at?: string
          evidence?: string[]
          fix_steps?: string[]
          id?: string
          model?: string
          next_command?: string
          osi_layer?: string
          raw_response?: Json | null
          root_cause: string
          severity?: string
        }
        Update: {
          case_id?: string
          concept?: string
          confidence?: number
          created_at?: string
          evidence?: string[]
          fix_steps?: string[]
          id?: string
          model?: string
          next_command?: string
          osi_layer?: string
          raw_response?: Json | null
          root_cause?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnoses_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      responsible_ai_logs: {
        Row: {
          case_id: string
          created_at: string
          decision: string
          diagnosis_id: string
          final_diagnosis: Json | null
          human_correction: Json | null
          id: string
          original_diagnosis: Json
          reason: string
          review_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          decision: string
          diagnosis_id: string
          final_diagnosis?: Json | null
          human_correction?: Json | null
          id?: string
          original_diagnosis: Json
          reason?: string
          review_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          decision?: string
          diagnosis_id?: string
          final_diagnosis?: Json | null
          human_correction?: Json | null
          id?: string
          original_diagnosis?: Json
          reason?: string
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "responsible_ai_logs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responsible_ai_logs_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnoses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responsible_ai_logs_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          case_id: string
          comment: string
          correction: Json | null
          created_at: string
          decision: string
          diagnosis_id: string
          id: string
          reviewer: string
        }
        Insert: {
          case_id: string
          comment?: string
          correction?: Json | null
          created_at?: string
          decision: string
          diagnosis_id: string
          id?: string
          reviewer?: string
        }
        Update: {
          case_id?: string
          comment?: string
          correction?: Json | null
          created_at?: string
          decision?: string
          diagnosis_id?: string
          id?: string
          reviewer?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnoses"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_check_results: {
        Row: {
          case_id: string
          check_name: string
          created_at: string
          engine: string
          evidence: string
          explanation: string
          id: string
          status: string
        }
        Insert: {
          case_id: string
          check_name: string
          created_at?: string
          engine?: string
          evidence?: string
          explanation?: string
          id?: string
          status: string
        }
        Update: {
          case_id?: string
          check_name?: string
          created_at?: string
          engine?: string
          evidence?: string
          explanation?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rule_check_results_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
