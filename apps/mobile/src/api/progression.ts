import { getDb } from '@/db/client'
import { generateProgressionRecommendation, calculateProgressionState } from '@gym-tracker/engine'
import type {
  ProgressionContext,
  ProgressionState,
  ProgressionRecommendation,
  ProgressionRule,
  WorkoutSet,
  Exercise,
} from '@gym-tracker/engine'

export async function getLocalProgressionState(userId: string, exerciseId: string): Promise<ProgressionState | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM progression_states WHERE user_id = ? AND exercise_id = ?',
    [userId, exerciseId]
  )
  if (!row) return null
  return {
    exerciseId: row.exercise_id,
    consecutiveSuccessCount: row.consecutive_success_count,
    consecutiveFailureCount: row.consecutive_failure_count,
    lastEstimated1RM: row.last_estimated_1rm_kg,
    currentTargetWeight: row.current_target_weight_kg,
    lastUpdatedAt: row.last_updated_at,
  }
}

export async function saveLocalProgressionState(userId: string, state: ProgressionState): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    `INSERT OR REPLACE INTO progression_states
     (user_id, exercise_id, consecutive_success_count, consecutive_failure_count, last_estimated_1rm_kg, current_target_weight_kg, last_updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, state.exerciseId, state.consecutiveSuccessCount, state.consecutiveFailureCount, state.lastEstimated1RM, state.currentTargetWeight, state.lastUpdatedAt]
  )
}

export async function getRecentSetsForExercise(userId: string, exerciseId: string, sessionLimit = 3): Promise<WorkoutSet[]> {
  const db = await getDb()
  const sessionRows = await db.getAllAsync<any>(
    'SELECT id FROM workout_sessions WHERE user_id = ? AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT ?',
    [userId, sessionLimit]
  )
  const sessionIds = sessionRows.map(r => r.id)
  if (sessionIds.length === 0) return []

  const placeholders = sessionIds.map(() => '?').join(',')
  const setRows = await db.getAllAsync<any>(
    `SELECT * FROM workout_sets WHERE exercise_id = ? AND session_id IN (${placeholders}) ORDER BY completed_at DESC`,
    [exerciseId, ...sessionIds]
  )

  return setRows.map(row => ({
    id: row.id,
    session_id: row.session_id,
    exercise_id: row.exercise_id,
    exercise: { id: exerciseId } as Exercise,
    set_number: row.set_number,
    weight_kg: row.weight_kg,
    weight_lb: row.weight_lb,
    reps: row.reps,
    rpe: row.rpe,
    is_warmup: !!row.is_warmup,
    completed_at: row.completed_at,
    created_at: row.created_at,
  }))
}

export async function computeSuggestion(
  userId: string,
  exercise: Exercise,
  rule: ProgressionRule,
  unitSystem: 'metric' | 'imperial',
  plateIncrement: number
): Promise<ProgressionRecommendation> {
  const recentSets = await getRecentSetsForExercise(userId, exercise.id)
  const state = await getLocalProgressionState(userId, exercise.id)

  const context: ProgressionContext = {
    exerciseId: exercise.id,
    exercise,
    recentSets,
    currentRule: rule,
    userUnitSystem: unitSystem,
    plateIncrement,
  }

  return generateProgressionRecommendation(context, state)
}

export async function recordProgressionState(
  userId: string,
  exercise: Exercise,
  rule: ProgressionRule,
  unitSystem: 'metric' | 'imperial',
  plateIncrement: number,
  recommendation: ProgressionRecommendation
): Promise<void> {
  const recentSets = await getRecentSetsForExercise(userId, exercise.id)
  const currentState = await getLocalProgressionState(userId, exercise.id)
  const context: ProgressionContext = {
    exerciseId: exercise.id,
    exercise,
    recentSets,
    currentRule: rule,
    userUnitSystem: unitSystem,
    plateIncrement,
  }
  const newState = calculateProgressionState(recommendation, currentState, context)
  await saveLocalProgressionState(userId, newState)
}
