import { getDb } from '@/db/client'

export interface ExerciseHistorySummary {
  exercise_id: string
  exercise_name: string
  last_logged_at: string
  total_sets: number
}

export async function listLoggedExercises(userId: string): Promise<ExerciseHistorySummary[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<any>(
    `SELECT
       ws.exercise_id,
       COALESCE(ec.name, 'Unknown exercise') as exercise_name,
       MAX(ws.completed_at) as last_logged_at,
       COUNT(*) as total_sets
     FROM workout_sets ws
     JOIN workout_sessions s ON s.id = ws.session_id
     LEFT JOIN exercises_cache ec ON ec.id = ws.exercise_id
     WHERE s.user_id = ? AND ws.is_warmup = 0
     GROUP BY ws.exercise_id
     ORDER BY last_logged_at DESC`,
    [userId]
  )
  return rows.map(r => ({
    exercise_id: r.exercise_id,
    exercise_name: r.exercise_name,
    last_logged_at: r.last_logged_at,
    total_sets: r.total_sets,
  }))
}

export interface HistorySetEntry {
  session_id: string
  completed_at: string
  weight_kg: number | null
  reps: number
}

export async function listSetsForExercise(userId: string, exerciseId: string): Promise<HistorySetEntry[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<any>(
    `SELECT ws.session_id, ws.completed_at, ws.weight_kg, ws.reps
     FROM workout_sets ws
     JOIN workout_sessions s ON s.id = ws.session_id
     WHERE s.user_id = ? AND ws.exercise_id = ? AND ws.is_warmup = 0
     ORDER BY ws.completed_at DESC
     LIMIT 100`,
    [userId, exerciseId]
  )
  return rows.map(r => ({
    session_id: r.session_id,
    completed_at: r.completed_at,
    weight_kg: r.weight_kg,
    reps: r.reps,
  }))
}
