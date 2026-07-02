import * as Crypto from 'expo-crypto'
import { getDb } from '@/db/client'
import { writeLocalAndQueue } from '@/db/localWrite'

export async function startWorkoutSession(userId: string, routineId: string): Promise<string> {
  const db = await getDb()
  const sessionId = Crypto.randomUUID()
  const now = new Date().toISOString()

  await db.runAsync(
    `INSERT INTO workout_sessions (id, user_id, routine_id, name, started_at, completed_at, notes, created_at, updated_at)
     VALUES (?, ?, ?, NULL, ?, NULL, NULL, ?, ?)`,
    [sessionId, userId, routineId, now, now, now]
  )
  await writeLocalAndQueue(userId, 'workout_session', sessionId, 'insert', {
    user_id: userId, routine_id: routineId, name: null, started_at: now, completed_at: null, notes: null, created_at: now, updated_at: now,
  })

  return sessionId
}

export async function logWorkoutSet(
  userId: string,
  sessionId: string,
  exerciseId: string,
  setNumber: number,
  weightKg: number,
  reps: number,
  isWarmup: boolean
): Promise<void> {
  const db = await getDb()
  const setId = Crypto.randomUUID()
  const now = new Date().toISOString()

  await db.runAsync(
    `INSERT INTO workout_sets (id, session_id, exercise_id, set_number, weight_kg, weight_lb, reps, rpe, is_warmup, completed_at, created_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?, NULL, ?, ?, ?)`,
    [setId, sessionId, exerciseId, setNumber, weightKg, reps, isWarmup ? 1 : 0, now, now]
  )
  await writeLocalAndQueue(userId, 'workout_set', setId, 'insert', {
    session_id: sessionId, exercise_id: exerciseId, set_number: setNumber,
    weight_kg: weightKg, weight_lb: null, reps, rpe: null, is_warmup: isWarmup, completed_at: now, created_at: now,
  })
}

export async function completeWorkoutSession(userId: string, sessionId: string): Promise<void> {
  const db = await getDb()
  const now = new Date().toISOString()

  await db.runAsync('UPDATE workout_sessions SET completed_at = ?, updated_at = ? WHERE id = ?', [now, now, sessionId])
  await writeLocalAndQueue(userId, 'workout_session', sessionId, 'update', { completed_at: now, updated_at: now })
}
