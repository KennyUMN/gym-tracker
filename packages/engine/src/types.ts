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
