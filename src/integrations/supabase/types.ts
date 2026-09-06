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
      assessments: {
        Row: {
          activity_id: string | null
          created_at: string
          id: string
          kind: string
          max_score: number
          notes: string | null
          plan_id: string | null
          score: number
          taken_at: string
          topic_id: string | null
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          max_score?: number
          notes?: string | null
          plan_id?: string | null
          score?: number
          taken_at?: string
          topic_id?: string | null
          user_id: string
        }
        Update: {
          activity_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          max_score?: number
          notes?: string | null
          plan_id?: string | null
          score?: number
          taken_at?: string
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "plan_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "learning_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      coding_problems: {
        Row: {
          approach: string | null
          attempts: number
          category: string
          created_at: string
          difficulties: string | null
          difficulty: string
          id: string
          language: string | null
          learned: string | null
          minutes_taken: number
          name: string
          needs_revision: boolean
          platform: string
          result: string
          revision_due_date: string | null
          solved_on: string
          topic: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          approach?: string | null
          attempts?: number
          category?: string
          created_at?: string
          difficulties?: string | null
          difficulty?: string
          id?: string
          language?: string | null
          learned?: string | null
          minutes_taken?: number
          name: string
          needs_revision?: boolean
          platform?: string
          result?: string
          revision_due_date?: string | null
          solved_on?: string
          topic?: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          approach?: string | null
          attempts?: number
          category?: string
          created_at?: string
          difficulties?: string | null
          difficulty?: string
          id?: string
          language?: string | null
          learned?: string | null
          minutes_taken?: number
          name?: string
          needs_revision?: boolean
          platform?: string
          result?: string
          revision_due_date?: string | null
          solved_on?: string
          topic?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          completed_at: string | null
          created_at: string
          detail: string | null
          goal_date: string
          id: string
          material_id: string | null
          period: string
          plan_id: string | null
          sort_order: number
          source: string
          status: string
          subject_id: string | null
          target_minutes: number
          title: string
          topic_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          detail?: string | null
          goal_date: string
          id?: string
          material_id?: string | null
          period?: string
          plan_id?: string | null
          sort_order?: number
          source?: string
          status?: string
          subject_id?: string | null
          target_minutes?: number
          title: string
          topic_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          detail?: string | null
          goal_date?: string
          id?: string
          material_id?: string | null
          period?: string
          plan_id?: string | null
          sort_order?: number
          source?: string
          status?: string
          subject_id?: string | null
          target_minutes?: number
          title?: string
          topic_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "learning_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
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
      learning_objectives: {
        Row: {
          created_at: string
          id: string
          sort_order: number
          text: string
          topic_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sort_order?: number
          text: string
          topic_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sort_order?: number
          text?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_objectives_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_plans: {
        Row: {
          created_at: string
          daily_minutes: number
          feasibility: Json
          id: string
          knowledge_level: string
          material_id: string | null
          notes: string | null
          preferred_days: number[]
          priority: string
          status: string
          subject_id: string | null
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_minutes?: number
          feasibility?: Json
          id?: string
          knowledge_level?: string
          material_id?: string | null
          notes?: string | null
          preferred_days?: number[]
          priority?: string
          status?: string
          subject_id?: string | null
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_minutes?: number
          feasibility?: Json
          id?: string
          knowledge_level?: string
          material_id?: string | null
          notes?: string | null
          preferred_days?: number[]
          priority?: string
          status?: string
          subject_id?: string | null
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_plans_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_plans_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      mastery_history: {
        Row: {
          created_at: string
          id: string
          mastery: number
          reason: string | null
          state: string
          topic_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mastery: number
          reason?: string | null
          state: string
          topic_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mastery?: number
          reason?: string | null
          state?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mastery_history_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      material_analyses: {
        Row: {
          created_at: string
          id: string
          material_id: string
          model: string
          result: Json
          summary: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          model?: string
          result?: Json
          summary?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          model?: string
          result?: Json
          summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_analyses_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          author: string | null
          bookmarks: Json
          char_count: number
          created_at: string
          duration_seconds: number
          error_message: string | null
          extracted_text: string | null
          file_name: string
          id: string
          last_page: number
          last_position_seconds: number
          metadata: Json
          mime_type: string
          size_bytes: number
          source_type: string
          source_url: string | null
          status: string
          storage_path: string | null
          subject_id: string | null
          title: string
          updated_at: string
          user_id: string
          watched_seconds: number
        }
        Insert: {
          author?: string | null
          bookmarks?: Json
          char_count?: number
          created_at?: string
          duration_seconds?: number
          error_message?: string | null
          extracted_text?: string | null
          file_name: string
          id?: string
          last_page?: number
          last_position_seconds?: number
          metadata?: Json
          mime_type?: string
          size_bytes?: number
          source_type?: string
          source_url?: string | null
          status?: string
          storage_path?: string | null
          subject_id?: string | null
          title: string
          updated_at?: string
          user_id: string
          watched_seconds?: number
        }
        Update: {
          author?: string | null
          bookmarks?: Json
          char_count?: number
          created_at?: string
          duration_seconds?: number
          error_message?: string | null
          extracted_text?: string | null
          file_name?: string
          id?: string
          last_page?: number
          last_position_seconds?: number
          metadata?: Json
          mime_type?: string
          size_bytes?: number
          source_type?: string
          source_url?: string | null
          status?: string
          storage_path?: string | null
          subject_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "materials_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          created_at: string
          id: string
          material_id: string | null
          page: number | null
          subject_id: string | null
          timestamp_seconds: number | null
          topic_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          material_id?: string | null
          page?: number | null
          subject_id?: string | null
          timestamp_seconds?: number | null
          topic_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          material_id?: string | null
          page?: number | null
          subject_id?: string | null
          timestamp_seconds?: number | null
          topic_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_records: {
        Row: {
          activity_id: string | null
          activity_type: string
          actual_minutes: number
          completion: number
          confidence: number | null
          created_at: string
          difficulty: number | null
          id: string
          planned_minutes: number
          reflection: string | null
          score: number | null
          session_id: string | null
          signals: Json
          topic_id: string | null
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          activity_type?: string
          actual_minutes?: number
          completion?: number
          confidence?: number | null
          created_at?: string
          difficulty?: number | null
          id?: string
          planned_minutes?: number
          reflection?: string | null
          score?: number | null
          session_id?: string | null
          signals?: Json
          topic_id?: string | null
          user_id: string
        }
        Update: {
          activity_id?: string | null
          activity_type?: string
          actual_minutes?: number
          completion?: number
          confidence?: number | null
          created_at?: string
          difficulty?: number | null
          id?: string
          planned_minutes?: number
          reflection?: string | null
          score?: number | null
          session_id?: string | null
          signals?: Json
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_records_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "plan_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_records_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_activities: {
        Row: {
          activity_type: string
          actual_minutes: number
          completed_at: string | null
          created_at: string
          description: string | null
          estimated_minutes: number
          id: string
          locked: boolean
          plan_id: string
          priority: number
          scheduled_date: string
          sort_order: number
          source: string
          status: string
          title: string
          topic_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type?: string
          actual_minutes?: number
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_minutes?: number
          id?: string
          locked?: boolean
          plan_id: string
          priority?: number
          scheduled_date: string
          sort_order?: number
          source?: string
          status?: string
          title: string
          topic_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: string
          actual_minutes?: number
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_minutes?: number
          id?: string
          locked?: boolean
          plan_id?: string
          priority?: number
          scheduled_date?: string
          sort_order?: number
          source?: string
          status?: string
          title?: string
          topic_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_activities_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "learning_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_activities_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_adjustments: {
        Row: {
          adjusted_on: string
          created_at: string
          details: Json
          id: string
          plan_id: string | null
          reason: string
          user_id: string
        }
        Insert: {
          adjusted_on?: string
          created_at?: string
          details?: Json
          id?: string
          plan_id?: string | null
          reason: string
          user_id: string
        }
        Update: {
          adjusted_on?: string
          created_at?: string
          details?: Json
          id?: string
          plan_id?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_adjustments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "learning_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_attempts: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_correct: boolean
          question_id: string | null
          seconds_taken: number
          selected_index: number | null
          session_id: string | null
          topic: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string | null
          seconds_taken?: number
          selected_index?: number | null
          session_id?: string | null
          topic?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string | null
          seconds_taken?: number
          selected_index?: number | null
          session_id?: string | null
          topic?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "practice_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "practice_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_questions: {
        Row: {
          archived: boolean
          category: string
          correct_index: number
          created_at: string
          difficulty: string
          estimated_seconds: number
          explanation: string | null
          id: string
          last_attempted_at: string | null
          options: string[]
          question: string
          source: string | null
          times_attempted: number
          times_correct: number
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          category?: string
          correct_index?: number
          created_at?: string
          difficulty?: string
          estimated_seconds?: number
          explanation?: string | null
          id?: string
          last_attempted_at?: string | null
          options?: string[]
          question: string
          source?: string | null
          times_attempted?: number
          times_correct?: number
          topic?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          category?: string
          correct_index?: number
          created_at?: string
          difficulty?: string
          estimated_seconds?: number
          explanation?: string | null
          id?: string
          last_attempted_at?: string | null
          options?: string[]
          question?: string
          source?: string | null
          times_attempted?: number
          times_correct?: number
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      practice_sessions: {
        Row: {
          completed_at: string | null
          correct_count: number
          created_at: string
          duration_seconds: number
          id: string
          mode: string
          practiced_on: string
          question_count: number
          target_minutes: number
          topics: Json
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          correct_count?: number
          created_at?: string
          duration_seconds?: number
          id?: string
          mode?: string
          practiced_on?: string
          question_count?: number
          target_minutes?: number
          topics?: Json
          user_id: string
        }
        Update: {
          completed_at?: string | null
          correct_count?: number
          created_at?: string
          duration_seconds?: number
          id?: string
          mode?: string
          practiced_on?: string
          question_count?: number
          target_minutes?: number
          topics?: Json
          user_id?: string
        }
        Relationships: []
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
          practice_difficulty: string
          practice_mode: string
          practice_questions_per_day: number
          practice_target_minutes: number
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
          practice_difficulty?: string
          practice_mode?: string
          practice_questions_per_day?: number
          practice_target_minutes?: number
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
          practice_difficulty?: string
          practice_mode?: string
          practice_questions_per_day?: number
          practice_target_minutes?: number
          preferred_study_time?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      revision_schedule: {
        Row: {
          created_at: string
          due_date: string
          id: string
          interval_days: number
          plan_id: string | null
          reason: string | null
          status: string
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_date: string
          id?: string
          interval_days?: number
          plan_id?: string | null
          reason?: string | null
          status?: string
          topic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_date?: string
          id?: string
          interval_days?: number
          plan_id?: string | null
          reason?: string | null
          status?: string
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revision_schedule_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "learning_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_schedule_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
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
      topic_mastery: {
        Row: {
          created_at: string
          ease: number
          id: string
          interval_days: number
          lapses: number
          last_reviewed_at: string | null
          mastery: number
          next_review_date: string | null
          reps: number
          state: string
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ease?: number
          id?: string
          interval_days?: number
          lapses?: number
          last_reviewed_at?: string | null
          mastery?: number
          next_review_date?: string | null
          reps?: number
          state?: string
          topic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ease?: number
          id?: string
          interval_days?: number
          lapses?: number
          last_reviewed_at?: string | null
          mastery?: number
          next_review_date?: string | null
          reps?: number
          state?: string
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_mastery_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          description: string | null
          difficulty: number
          end_seconds: number | null
          estimated_minutes: number
          id: string
          key_concepts: string[]
          kind: string
          material_id: string | null
          parent_id: string | null
          prerequisites: string[]
          sort_order: number
          source_page: number | null
          start_seconds: number | null
          subject_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          difficulty?: number
          end_seconds?: number | null
          estimated_minutes?: number
          id?: string
          key_concepts?: string[]
          kind?: string
          material_id?: string | null
          parent_id?: string | null
          prerequisites?: string[]
          sort_order?: number
          source_page?: number | null
          start_seconds?: number | null
          subject_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          difficulty?: number
          end_seconds?: number | null
          estimated_minutes?: number
          id?: string
          key_concepts?: string[]
          kind?: string
          material_id?: string | null
          parent_id?: string | null
          prerequisites?: string[]
          sort_order?: number
          source_page?: number | null
          start_seconds?: number | null
          subject_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_subject_id_fkey"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
