import * as Crypto from 'expo-crypto'
import { supabase } from '@/lib/supabase'
import { getDb } from '@/db/client'
import { writeLocalAndQueue } from '@/db/localWrite'
import type { ProgressionRule } from '@gym-tracker/engine'

export interface LocalRoutineExercise {
  id: string
  routine_id: string
  exercise_id: string
  exercise_name: string
  order_index: number
  target_sets: number
  target_reps_min: number
  target_reps_max: number
  rest_seconds: number
  progression_rule: ProgressionRule
}

export interface LocalRoutine {
  id: string
  name: string
  description: string | null
  is_active: boolean
  exercises: LocalRoutineExercise[]
}

export async function refreshRoutinesFromSupabase(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('routines')
    .select('*, routine_exercises(*)')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error) throw error

  const db = await getDb()
  for (const routine of data ?? []) {
    await db.runAsync(
      `INSERT OR REPLACE INTO routines (id, user_id, name, description, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [routine.id, userId, routine.name, routine.description, routine.is_active ? 1 : 0, routine.created_at, routine.updated_at]
    )
    for (const re of routine.routine_exercises ?? []) {
      await db.runAsync(
        `INSERT OR REPLACE INTO routine_exercises
         (id, routine_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds, progression_rule_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          re.id, re.routine_id, re.exercise_id, re.order_index, re.target_sets,
          re.target_reps_min, re.target_reps_max, re.rest_seconds,
          JSON.stringify(re.progression_rule), re.created_at, re.updated_at,
        ]
      )
    }
  }
}

export async function listLocalRoutines(userId: string): Promise<LocalRoutine[]> {
  const db = await getDb()
  const routineRows = await db.getAllAsync<any>(
    'SELECT * FROM routines WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC',
    [userId]
  )

  const routines: LocalRoutine[] = []
  for (const row of routineRows) {
    const exerciseRows = await db.getAllAsync<any>(
      `SELECT re.*, ec.name as exercise_name
       FROM routine_exercises re
       LEFT JOIN exercises_cache ec ON re.exercise_id = ec.id
       WHERE re.routine_id = ?
       ORDER BY re.order_index ASC`,
      [row.id]
    )
    routines.push({
      id: row.id,
      name: row.name,
      description: row.description,
      is_active: !!row.is_active,
      exercises: exerciseRows.map(re => ({
        id: re.id,
        routine_id: re.routine_id,
        exercise_id: re.exercise_id,
        exercise_name: re.exercise_name ?? 'Unknown exercise',
        order_index: re.order_index,
        target_sets: re.target_sets,
        target_reps_min: re.target_reps_min,
        target_reps_max: re.target_reps_max,
        rest_seconds: re.rest_seconds,
        progression_rule: JSON.parse(re.progression_rule_json),
      })),
    })
  }
  return routines
}

export async function createRoutine(
  userId: string,
  name: string,
  exercises: Array<{
    exercise_id: string
    order_index: number
    target_sets: number
    target_reps_min: number
    target_reps_max: number
    rest_seconds: number
  }>
): Promise<string> {
  const db = await getDb()
  const routineId = Crypto.randomUUID()
  const now = new Date().toISOString()

  await db.runAsync(
    `INSERT INTO routines (id, user_id, name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, NULL, 1, ?, ?)`,
    [routineId, userId, name, now, now]
  )
  await writeLocalAndQueue(userId, 'routine', routineId, 'insert', {
    user_id: userId, name, description: null, is_active: true, created_at: now, updated_at: now,
  })

  const defaultRule: ProgressionRule = {
    type: 'double_progression',
    weight_increment_kg: 2.5,
    weight_increment_lb: 5,
    rep_target_min: 8,
    rep_target_max: 12,
    deload_trigger_failed_sessions: 2,
    deload_percentage: 10,
  }

  for (const ex of exercises) {
    const routineExerciseId = Crypto.randomUUID()
    await db.runAsync(
      `INSERT INTO routine_exercises
       (id, routine_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds, progression_rule_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        routineExerciseId, routineId, ex.exercise_id, ex.order_index, ex.target_sets,
        ex.target_reps_min, ex.target_reps_max, ex.rest_seconds, JSON.stringify(defaultRule), now, now,
      ]
    )
    await writeLocalAndQueue(userId, 'routine_exercise', routineExerciseId, 'insert', {
      routine_id: routineId,
      exercise_id: ex.exercise_id,
      order_index: ex.order_index,
      target_sets: ex.target_sets,
      target_reps_min: ex.target_reps_min,
      target_reps_max: ex.target_reps_max,
      rest_seconds: ex.rest_seconds,
      progression_rule: defaultRule,
      created_at: now,
      updated_at: now,
    })
  }

  return routineId
}
