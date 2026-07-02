import { supabase } from '@/lib/supabase'
import { getDb } from '@/db/client'

export interface LocalExercise {
  id: string
  name: string
  category: string
  primary_muscles: string[]
  equipment: string[]
}

export async function refreshExercisesFromSupabase(search: string): Promise<void> {
  let query = supabase
    .from('exercises')
    .select('id, name, category, primary_muscles, secondary_muscles, equipment, force_type, mechanic_type, difficulty, image_url')
    .limit(50)

  if (search.trim()) {
    query = query.ilike('name', `%${search.trim()}%`)
  }

  const { data, error } = await query
  if (error) throw error

  const db = await getDb()
  for (const ex of data ?? []) {
    await db.runAsync(
      `INSERT OR REPLACE INTO exercises_cache
       (id, name, category, primary_muscles_json, secondary_muscles_json, equipment_json, force_type, mechanic_type, difficulty, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ex.id, ex.name, ex.category,
        JSON.stringify(ex.primary_muscles), JSON.stringify(ex.secondary_muscles), JSON.stringify(ex.equipment),
        ex.force_type, ex.mechanic_type, ex.difficulty, ex.image_url,
      ]
    )
  }
}

export async function listLocalExercises(search: string): Promise<LocalExercise[]> {
  const db = await getDb()
  const rows = search.trim()
    ? await db.getAllAsync<any>('SELECT * FROM exercises_cache WHERE name LIKE ? ORDER BY name ASC LIMIT 50', [`%${search.trim()}%`])
    : await db.getAllAsync<any>('SELECT * FROM exercises_cache ORDER BY name ASC LIMIT 50', [])

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    category: row.category,
    primary_muscles: JSON.parse(row.primary_muscles_json),
    equipment: JSON.parse(row.equipment_json),
  }))
}

export async function searchExercises(search: string): Promise<LocalExercise[]> {
  try {
    await refreshExercisesFromSupabase(search)
  } catch {
    // offline or network error — fall back to whatever's cached
  }
  return listLocalExercises(search)
}
