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

export interface Exercise {
  id: string
  name: string
  category: string
  primary_muscles: string[]
  secondary_muscles: string[]
  equipment: string[]
  force_type: 'push' | 'pull' | 'static' | 'legs'
  mechanic_type: 'compound' | 'isolation'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  instructions: string | null
  video_url: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

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

export type ProgressionRuleType = 
  | 'linear'
  | 'double_progression'
  | 'rpe_based'
  | 'periodized'

export interface ProgressionRule {
  type: ProgressionRuleType
  weight_increment_kg: number
  weight_increment_lb: number
  rep_target_min: number
  rep_target_max: number
  deload_trigger_failed_sessions: number
  deload_percentage: number
  rpe_target?: number
  rpe_increment_threshold?: number
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

export interface WorkoutSet {
  id: string
  session_id: string
  exercise_id: string
  exercise: Exercise
  set_number: number
  weight_kg: number | null
  weight_lb: number | null
  reps: number
  rpe: number | null
  is_warmup: boolean
  completed_at: string
  created_at: string
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

export interface ProgressionRecommendation {
  exercise_id: string
  exercise_name: string
  recommended_weight_kg: number | null
  recommended_weight_lb: number | null
  target_reps_min: number
  target_reps_max: number
  reason: string
  confidence: 'high' | 'medium' | 'low'
  should_deload: boolean
  deload_percentage?: number
  suggested_rpe?: number
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

export const KG_TO_LB = 2.20462
export const LB_TO_KG = 0.453592

export function kgToLb(kg: number): number {
  return Math.round(kg * KG_TO_LB * 10) / 10
}

export function lbToKg(lb: number): number {
  return Math.round(lb * LB_TO_KG * 100) / 100
}

export function roundToPlateIncrement(weight: number, unit: 'kg' | 'lb'): number {
  const increment = unit === 'kg' ? 1.25 : 2.5
  return Math.round(weight / increment) * increment
}

export function calculateEpley1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight
  return Math.round(weight * (1 + reps / 30) * 10) / 10
}

export function calculateBrzycki1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight
  if (reps >= 37) return weight
  return Math.round(weight * 36 / (37 - reps) * 10) / 10
}

export function estimate1RM(weight: number, reps: number, method: 'epley' | 'brzycki' = 'epley'): number {
  return method === 'epley' ? calculateEpley1RM(weight, reps) : calculateBrzycki1RM(weight, reps)
}

export interface ProgressionContext {
  exerciseId: string
  exercise: Exercise
  recentSets: WorkoutSet[]
  currentRule: ProgressionRule
  userUnitSystem: 'metric' | 'imperial'
  plateIncrement: number
  lastRecommendedWeight?: number
}

export interface ProgressionState {
  exerciseId: string
  consecutiveSuccessCount: number
  consecutiveFailureCount: number
  lastEstimated1RM: number | null
  currentTargetWeight: number | null
  lastUpdatedAt: string
}