import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { generateProgressionRecommendation, getDefaultProgressionRule, calculateProgressionState } from '@gym-tracker/engine'
import type { ProgressionContext, ProgressionState, WorkoutSet, Exercise, ProgressionRule } from '@gym-tracker/engine'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { exercise_id, routine_exercise_id } = body

    if (!exercise_id) {
      return NextResponse.json({ error: 'exercise_id required' }, { status: 400 })
    }

    // Fetch exercise
    const { data: exercise, error: exerciseError } = await supabase
      .from('exercises')
      .select('*')
      .eq('id', exercise_id)
      .single()

    if (exerciseError || !exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
    }

    // Fetch user profile for unit system
    const { data: profile } = await supabase
      .from('profiles')
      .select('unit_system, plate_increment_kg, plate_increment_lb')
      .eq('id', user.id)
      .single()

    const unitSystem = profile?.unit_system || 'metric'
    const plateIncrement = unitSystem === 'metric' 
      ? (profile?.plate_increment_kg || 1.25) 
      : (profile?.plate_increment_lb || 2.5)

    // Fetch progression rule (from routine_exercise or default)
    let progressionRule: ProgressionRule
    if (routine_exercise_id) {
      const { data: routineExercise } = await supabase
        .from('routine_exercises')
        .select('progression_rule')
        .eq('id', routine_exercise_id)
        .single()
      
      if (routineExercise?.progression_rule) {
        progressionRule = routineExercise.progression_rule as unknown as ProgressionRule
      } else {
        progressionRule = getDefaultProgressionRule('double_progression')
      }
    } else {
      progressionRule = getDefaultProgressionRule('double_progression')
    }

    // Fetch recent workout sets for this exercise (last 5 sessions)
    const { data: recentSets, error: setsError } = await supabase
      .from('workout_sets')
      .select(`
        *,
        workout_sessions!inner(user_id, started_at),
        exercises!inner(*)
      `)
      .eq('exercise_id', exercise_id)
      .eq('workout_sessions.user_id', user.id)
      .order('workout_sessions(started_at)', { ascending: false })
      .limit(50)

    if (setsError) {
      console.error('Sets error:', setsError)
      return NextResponse.json({ error: 'Failed to fetch workout history' }, { status: 500 })
    }

    // Transform sets to our type
    const workoutSets: WorkoutSet[] = (recentSets || []).map(set => ({
      id: set.id,
      session_id: set.session_id,
      exercise_id: set.exercise_id,
      exercise: exercise as Exercise,
      set_number: set.set_number,
      weight_kg: set.weight_kg,
      weight_lb: set.weight_lb,
      reps: set.reps,
      rpe: set.rpe,
      is_warmup: set.is_warmup,
      completed_at: set.completed_at,
      created_at: set.created_at,
    }))

    // Fetch current progression state
    const { data: progressionState } = await supabase
      .from('progression_states')
      .select('*')
      .eq('user_id', user.id)
      .eq('exercise_id', exercise_id)
      .single()

    const currentState: ProgressionState | null = progressionState ? {
      exerciseId: progressionState.exercise_id,
      consecutiveSuccessCount: progressionState.consecutive_success_count,
      consecutiveFailureCount: progressionState.consecutive_failure_count,
      lastEstimated1RM: progressionState.last_estimated_1rm_kg,
      currentTargetWeight: progressionState.current_target_weight_kg,
      lastUpdatedAt: progressionState.last_updated_at,
    } : null

    // Build context for progression engine
    const context: ProgressionContext = {
      exerciseId: exercise.id,
      exercise: exercise as Exercise,
      recentSets: workoutSets,
      currentRule: progressionRule,
      userUnitSystem: unitSystem,
      plateIncrement,
      lastRecommendedWeight: currentState?.currentTargetWeight ? currentState.currentTargetWeight : undefined,
    }

    // Generate recommendation
    const recommendation = generateProgressionRecommendation(context, currentState)
    
    // Calculate new state
    const newState = calculateProgressionState(recommendation, currentState, context)

    // Upsert progression state
    const { error: upsertError } = await supabase
      .from('progression_states')
      .upsert({
        user_id: user.id,
        exercise_id: exercise.id,
        consecutive_success_count: newState.consecutiveSuccessCount,
        consecutive_failure_count: newState.consecutiveFailureCount,
        last_estimated_1rm_kg: newState.lastEstimated1RM,
        current_target_weight_kg: newState.currentTargetWeight,
        last_updated_at: newState.lastUpdatedAt,
      }, {
        onConflict: 'user_id,exercise_id'
      })

    if (upsertError) {
      console.error('Upsert error:', upsertError)
    }

    return NextResponse.json({
      recommendation,
      progressionState: newState,
    })
  } catch (error) {
    console.error('Progression API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}