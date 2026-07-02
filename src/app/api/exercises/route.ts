import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const equipment = searchParams.get('equipment') || ''
    const muscle = searchParams.get('muscle') || ''
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('exercises')
      .select('*', { count: 'exact' })

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }
    if (category) {
      query = query.eq('category', category)
    }
    if (equipment) {
      query = query.contains('equipment', [equipment])
    }
    if (muscle) {
      query = query.or(`primary_muscles.cs.{${muscle}},secondary_muscles.cs.{${muscle}}`)
    }

    query = query.order('name').range(offset, offset + limit - 1)

    const { data: exercises, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      exercises: exercises || [], 
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Exercises GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}