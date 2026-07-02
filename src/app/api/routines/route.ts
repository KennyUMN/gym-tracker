import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { z } from 'zod'

const routineSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  exercises: z.array(z.object({
    exercise_id: z.string().uuid(),
    order_index: z.number().int().nonnegative(),
    target_sets: z.number().int().positive().max(20),
    target_reps_min: z.number().int().positive().max(50),
    target_reps_max: z.number().int().positive().max(50),
    rest_seconds: z.number().int().nonnegative().max(600),
    progression_rule: z.object({
      type: z.enum(['linear', 'double_progression', 'rpe_based', 'periodized']),
      weight_increment_kg: z.number().positive(),
      weight_increment_lb: z.number().positive(),
      rep_target_min: z.number().int().positive(),
      rep_target_max: z.number().int().positive(),
      deload_trigger_failed_sessions: z.number().int().positive(),
      deload_percentage: z.number().positive().max(100),
      rpe_target: z.number().int().min(1).max(10).optional(),
      rpe_increment_threshold: z.number().int().positive().optional(),
    }).optional(),
  })),
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: routines, error } = await supabase
      .from('routines')
      .select(`
        *,
        routine_exercises (
          *,
          exercises (id, name, category, primary_muscles, equipment, image_url)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Sort routine_exercises by order_index
    const sortedRoutines = routines?.map(routine => ({
      ...routine,
      routine_exercises: routine.routine_exercises?.sort((a, b) => a.order_index - b.order_index) || [],
    })) || []

    return NextResponse.json({ routines: sortedRoutines })
  } catch (error) {
    console.error('Routines GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = routineSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { name, description, exercises } = parsed.data

    // Create routine
    const { data: routine, error: routineError } = await supabase
      .from('routines')
      .insert({
        user_id: user.id,
        name,
        description,
        is_active: true,
      })
      .select()
      .single()

    if (routineError) {
      return NextResponse.json({ error: routineError.message }, { status: 500 })
    }

    // Create routine exercises
    if (exercises.length > 0) {
      const routineExercises = exercises.map(ex => ({
        routine_id: routine.id,
        exercise_id: ex.exercise_id,
        order_index: ex.order_index,
        target_sets: ex.target_sets,
        target_reps_min: ex.target_reps_min,
        target_reps_max: ex.target_reps_max,
        rest_seconds: ex.rest_seconds,
        progression_rule: ex.progression_rule || {
          type: 'double_progression',
          weight_increment_kg: 2.5,
          weight_increment_lb: 5,
          rep_target_min: 8,
          rep_target_max: 12,
          deload_trigger_failed_sessions: 2,
          deload_percentage: 10,
        },
      }))

      const { error: exercisesError } = await supabase
        .from('routine_exercises')
        .insert(routineExercises)

      if (exercisesError) {
        // Rollback routine
        await supabase.from('routines').delete().eq('id', routine.id)
        return NextResponse.json({ error: exercisesError.message }, { status: 500 })
      }
    }

    // Fetch complete routine with exercises
    const { data: fullRoutine } = await supabase
      .from('routines')
      .select(`
        *,
        routine_exercises (
          *,
          exercises (id, name, category, primary_muscles, equipment, image_url)
        )
      `)
      .eq('id', routine.id)
      .single()

    return NextResponse.json({ routine: fullRoutine })
  } catch (error) {
    console.error('Routines POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}