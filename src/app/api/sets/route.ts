import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { session_id, exercise_id, set_number, weight_kg, weight_lb, reps, rpe, is_warmup } = body

    if (!session_id || !exercise_id || set_number === undefined || reps === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify session belongs to user
    const { data: session } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('id', session_id)
      .eq('user_id', user.id)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const { data: set, error } = await supabase
      .from('workout_sets')
      .insert({
        session_id,
        exercise_id,
        set_number,
        weight_kg,
        weight_lb,
        reps,
        rpe,
        is_warmup: is_warmup || false,
        completed_at: new Date().toISOString(),
      })
      .select(`
        *,
        exercises (id, name, category, primary_muscles, equipment)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ set })
  } catch (error) {
    console.error('Sets POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { set_id, weight_kg, weight_lb, reps, rpe, is_warmup } = body

    if (!set_id) {
      return NextResponse.json({ error: 'set_id required' }, { status: 400 })
    }

    // Verify set belongs to user's session
    const { data: set } = await supabase
      .from('workout_sets')
      .select('id, session_id, workout_sessions!inner(user_id)')
      .eq('id', set_id)
      .single()

    if (!set || (set as any).workout_sessions?.user_id !== user.id) {
      return NextResponse.json({ error: 'Set not found' }, { status: 404 })
    }

    const { data: updatedSet, error } = await supabase
      .from('workout_sets')
      .update({
        weight_kg,
        weight_lb,
        reps,
        rpe,
        is_warmup,
      })
      .eq('id', set_id)
      .select(`
        *,
        exercises (id, name, category, primary_muscles, equipment)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ set: updatedSet })
  } catch (error) {
    console.error('Sets PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const set_id = searchParams.get('set_id')

    if (!set_id) {
      return NextResponse.json({ error: 'set_id required' }, { status: 400 })
    }

    // Verify set belongs to user's session
    const { data: set } = await supabase
      .from('workout_sets')
      .select('id, session_id, workout_sessions!inner(user_id)')
      .eq('id', set_id)
      .single()

    if (!set || (set as any).workout_sessions?.user_id !== user.id) {
      return NextResponse.json({ error: 'Set not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('workout_sets')
      .delete()
      .eq('id', set_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Sets DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}