export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          unit_system: 'metric' | 'imperial'
          experience_level: 'beginner' | 'intermediate' | 'advanced'
          plate_increment_kg: number | null
          plate_increment_lb: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          unit_system?: 'metric' | 'imperial'
          experience_level?: 'beginner' | 'intermediate' | 'advanced'
          plate_increment_kg?: number | null
          plate_increment_lb?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          unit_system?: 'metric' | 'imperial'
          experience_level?: 'beginner' | 'intermediate' | 'advanced'
          plate_increment_kg?: number | null
          plate_increment_lb?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          id: string
          name: string
          category: string
          primary_muscles: string[]
          secondary_muscles: string[]
          equipment: string[]
          force_type: 'push' | 'pull' | 'static' | 'legs' | null
          mechanic_type: 'compound' | 'isolation' | null
          difficulty: 'beginner' | 'intermediate' | 'advanced' | null
          instructions: string | null
          video_url: string | null
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category: string
          primary_muscles?: string[]
          secondary_muscles?: string[]
          equipment?: string[]
          force_type?: 'push' | 'pull' | 'static' | 'legs' | null
          mechanic_type?: 'compound' | 'isolation' | null
          difficulty?: 'beginner' | 'intermediate' | 'advanced' | null
          instructions?: string | null
          video_url?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          primary_muscles?: string[]
          secondary_muscles?: string[]
          equipment?: string[]
          force_type?: 'push' | 'pull' | 'static' | 'legs' | null
          mechanic_type?: 'compound' | 'isolation' | null
          difficulty?: 'beginner' | 'intermediate' | 'advanced' | null
          instructions?: string | null
          video_url?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      routines: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routines_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      routine_exercises: {
        Row: {
          id: string
          routine_id: string
          exercise_id: string
          order_index: number
          target_sets: number
          target_reps_min: number
          target_reps_max: number
          rest_seconds: number
          progression_rule: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          routine_id: string
          exercise_id: string
          order_index?: number
          target_sets?: number
          target_reps_min?: number
          target_reps_max?: number
          rest_seconds?: number
          progression_rule?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          routine_id?: string
          exercise_id?: string
          order_index?: number
          target_sets?: number
          target_reps_min?: number
          target_reps_max?: number
          rest_seconds?: number
          progression_rule?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_exercises_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          }
        ]
      }
      workout_sessions: {
        Row: {
          id: string
          user_id: string
          routine_id: string | null
          name: string | null
          started_at: string
          completed_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          routine_id?: string | null
          name?: string | null
          started_at?: string
          completed_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          routine_id?: string | null
          name?: string | null
          started_at?: string
          completed_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          }
        ]
      }
      workout_sets: {
        Row: {
          id: string
          session_id: string
          exercise_id: string
          set_number: number
          weight_kg: number | null
          weight_lb: number | null
          reps: number
          rpe: number | null
          is_warmup: boolean
          completed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          exercise_id: string
          set_number: number
          weight_kg?: number | null
          weight_lb?: number | null
          reps: number
          rpe?: number | null
          is_warmup?: boolean
          completed_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          exercise_id?: string
          set_number?: number
          weight_kg?: number | null
          weight_lb?: number | null
          reps?: number
          rpe?: number | null
          is_warmup?: boolean
          completed_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          }
        ]
      }
      progression_states: {
        Row: {
          id: string
          user_id: string
          exercise_id: string
          consecutive_success_count: number
          consecutive_failure_count: number
          last_estimated_1rm_kg: number | null
          current_target_weight_kg: number | null
          last_updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          exercise_id: string
          consecutive_success_count?: number
          consecutive_failure_count?: number
          last_estimated_1rm_kg?: number | null
          current_target_weight_kg?: number | null
          last_updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          exercise_id?: string
          consecutive_success_count?: number
          consecutive_failure_count?: number
          last_estimated_1rm_kg?: number | null
          current_target_weight_kg?: number | null
          last_updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "progression_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progression_states_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      handle_new_user: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_updated_at_column: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}