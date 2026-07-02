export interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  user_id: string
  display_name: string | null
  unit_system: 'metric' | 'imperial'
  experience_level: 'beginner' | 'intermediate' | 'advanced'
  plate_increment_kg: number
  plate_increment_lb: number
  created_at: string
  updated_at: string
}

export type {
  Exercise,
  WorkoutSet,
  ProgressionRuleType,
  ProgressionRule,
  ProgressionContext,
  ProgressionState,
  ProgressionRecommendation,
} from '@gym-tracker/engine'

export {
  kgToLb,
  lbToKg,
  roundToPlateIncrement,
  calculateEpley1RM,
  calculateBrzycki1RM,
  estimate1RM,
  KG_TO_LB,
  LB_TO_KG,
} from '@gym-tracker/engine'

import type { Exercise, WorkoutSet, ProgressionRule } from '@gym-tracker/engine'

export interface Routine {
  id: string
  user_id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RoutineExercise {
  id: string
  routine_id: string
  exercise_id: string
  exercise: Exercise
  order_index: number
  target_sets: number
  target_reps_min: number
  target_reps_max: number
  rest_seconds: number
  progression_rule: ProgressionRule
  created_at: string
  updated_at: string
}

export interface WorkoutSession {
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

export interface ExerciseLog {
  exercise_id: string
  exercise: Exercise
  sets: WorkoutSet[]
  previous_session_volume_kg: number
  previous_session_top_set_weight_kg: number | null
  previous_session_top_set_reps: number | null
}

export interface WorkoutSessionWithSets extends WorkoutSession {
  sets: WorkoutSet[]
}

export interface VolumeMetrics {
  exercise_id: string
  exercise_name: string
  total_volume_kg: number
  total_sets: number
  total_reps: number
  top_set_weight_kg: number | null
  top_set_reps: number | null
  estimated_1rm_kg: number | null
  sessions_count: number
}

export interface VolumeTrend {
  exercise_id: string
  exercise_name: string
  data_points: {
    date: string
    volume_kg: number
    top_set_weight_kg: number | null
    estimated_1rm_kg: number | null
  }[]
}

export interface UnitSystem {
  system: 'metric' | 'imperial'
  weight_unit: 'kg' | 'lb'
  distance_unit: 'm' | 'ft'
}

export const UNIT_SYSTEMS: Record<UnitSystem['system'], UnitSystem> = {
  metric: { system: 'metric', weight_unit: 'kg', distance_unit: 'm' },
  imperial: { system: 'imperial', weight_unit: 'lb', distance_unit: 'ft' },
}
