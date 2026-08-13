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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      learning_days: {
        Row: {
          completed_at: string | null
          created_at: string
          day_number: number
          estimated_minutes: number
          id: string
          notes: string | null
          planned_date: string | null
          status: string
          subject_id: string
          subtopics: string[]
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          day_number: number
          estimated_minutes?: number
          id?: string
          notes?: string | null
          planned_date?: string | null
          status?: string
          subject_id: string
          subtopics?: string[]
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          day_number?: number
          estimated_minutes?: number
          id?: string
          notes?: string | null
          planned_date?: string | null
          status?: string
          subject_id?: string
          subtopics?: string[]
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_days_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          coding_level: string | null
          created_at: string
          daily_target_minutes: number
          default_session_minutes: number
          display_name: string | null
          id: string
          languages: string[]
          onboarded: boolean
          pomodoro_break_minutes: number
          pomodoro_focus_minutes: number
          preferred_study_time: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          coding_level?: string | null
          created_at?: string
          daily_target_minutes?: number
          default_session_minutes?: number
          display_name?: string | null
          id: string
          languages?: string[]
          onboarded?: boolean
          pomodoro_break_minutes?: number
          pomodoro_focus_minutes?: number
          preferred_study_time?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          coding_level?: string | null
          created_at?: string
          daily_target_minutes?: number
          default_session_minutes?: number
          display_name?: string | null
          id?: string
          languages?: string[]
          onboarded?: boolean
          pomodoro_break_minutes?: number
          pomodoro_focus_minutes?: number
          preferred_study_time?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          actual_minutes: number
          completed_notes: string | null
          created_at: string
          difficulty: number | null
          ended_at: string | null
          id: string
          learning_day_id: string | null
          mode: string
          planned_minutes: number
          started_at: string
          struggled_with: string | null
          subject_id: string | null
          topic: string | null
          understood: boolean | null
          user_id: string
          wants_practice: boolean | null
        }
        Insert: {
          actual_minutes?: number
          completed_notes?: string | null
          created_at?: string
          difficulty?: number | null
          ended_at?: string | null
          id?: string
          learning_day_id?: string | null
          mode?: string
          planned_minutes?: number
          started_at?: string
          struggled_with?: string | null
          subject_id?: string | null
          topic?: string | null
          understood?: boolean | null
          user_id: string
          wants_practice?: boolean | null
        }
        Update: {
          actual_minutes?: number
          completed_notes?: string | null
          created_at?: string
          difficulty?: number | null
          ended_at?: string | null
          id?: string
          learning_day_id?: string | null
          mode?: string
          planned_minutes?: number
          started_at?: string
          struggled_with?: string | null
          subject_id?: string | null
          topic?: string | null
          understood?: boolean | null
          user_id?: string
          wants_practice?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_learning_day_id_fkey"
            columns: ["learning_day_id"]
            isOneToOne: false
            referencedRelation: "learning_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          archived: boolean
          category: string | null
          color: string
          created_at: string
          description: string | null
          difficulty: string
          icon: string
          id: string
          name: string
          sort_order: number
          start_date: string | null
          target_date: string | null
          total_planned_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          category?: string | null
          color?: string
          created_at?: string
          description?: string | null
          difficulty?: string
          icon?: string
          id?: string
          name: string
          sort_order?: number
          start_date?: string | null
          target_date?: string | null
          total_planned_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          category?: string | null
          color?: string
          created_at?: string
          description?: string | null
          difficulty?: string
          icon?: string
          id?: string
          name?: string
          sort_order?: number
          start_date?: string | null
          target_date?: string | null
          total_planned_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          estimated_minutes: number | null
          id: string
          priority: string
          status: string
          subject_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          id?: string
          priority?: string
          status?: string
          subject_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          id?: string
          priority?: string
          status?: string
          subject_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
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
