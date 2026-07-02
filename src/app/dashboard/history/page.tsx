'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/components/auth-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dumbbell, ChevronDown, ChevronUp, Calendar, Clock, Loader2 } from 'lucide-react'
import { formatDate, formatDateTime, formatWeight, formatVolume, calculateVolume } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Session {
  id: string
  user_id: string
  routine_id: string | null
  name: string | null
  started_at: string
  completed_at: string | null
  notes: string | null
  routines: { id: string; name: string } | null
  workout_sets: Array<{
    id: string
    exercise_id: string
    set_number: number
    weight_kg: number | null
    weight_lb: number | null
    reps: number
    rpe: number | null
    is_warmup: boolean
    exercises: { id: string; name: string; category: string }
  }>
}

export default function HistoryPage() {
  const { user, loading: authLoading, profile } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const LIMIT = 10

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const isMetric = profile?.unit_system === 'metric'

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/auth/login'
    }
  }, [user, authLoading])

  useEffect(() => {
    if (!user) return

    async function fetchSessions() {
      setLoading(true)
      try {
        const userId = user!.id
        const { data, error } = await supabase
          .from('workout_sessions')
          .select(`
            *,
            routines (id, name),
            workout_sets (
              *,
              exercises (id, name, category)
            )
          `)
          .eq('user_id', userId)
          .order('started_at', { ascending: false })
          .range(page * LIMIT, (page + 1) * LIMIT - 1)

        if (error) throw error

        const newSessions = (data || []).map(s => ({
          ...s,
          workout_sets: s.workout_sets?.sort((a: any, b: any) => a.set_number - b.set_number) || []
        })) as Session[]

        setSessions(prev => page === 0 ? newSessions : [...prev, ...newSessions])
        setHasMore(newSessions.length === LIMIT)
      } catch (error) {
        console.error('Fetch sessions error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSessions()
  }, [user, page, supabase])

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1)
    }
  }

  const toggleSession = (id: string) => {
    setExpandedSession(prev => prev === id ? null : id)
  }

  const getSessionVolume = (session: Session) => {
    return session.workout_sets
      .filter(s => !s.is_warmup)
      .reduce((sum, s) => {
        const weight = isMetric ? s.weight_kg : s.weight_lb
        return sum + (weight ? weight * s.reps : 0)
      }, 0)
  }

  const getSessionDuration = (session: Session) => {
    if (!session.completed_at) return null
    const start = new Date(session.started_at).getTime()
    const end = new Date(session.completed_at).getTime()
    const diff = end - start
    const mins = Math.floor(diff / 60000)
    const secs = Math.floor((diff % 60000) / 1000)
    return `${mins}m ${secs}s`
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Workout History</h1>

      {sessions.length === 0 ? (
        <Card className="brutalist-card text-center py-12">
          <CardContent>
            <Dumbbell className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-bold mb-2">No workouts yet</h2>
            <p className="text-muted-foreground">Complete your first workout to see history here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map(session => {
            const volume = getSessionVolume(session)
            const duration = getSessionDuration(session)
            const exerciseCount = new Set(
              session.workout_sets.filter(s => !s.is_warmup).map(s => s.exercise_id)
            ).size
            const isExpanded = expandedSession === session.id

            return (
              <Card key={session.id} className={cn('brutalist-card', isExpanded && 'ring-2 ring-primary')}>
                <CardContent className="pt-6">
                  <Button
                    variant="ghost"
                    className="w-full justify-between py-3"
                    onClick={() => toggleSession(session.id)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Dumbbell className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-bold">{session.routines?.name || session.name || 'Custom Workout'}</h3>
                          <p className="text-sm text-muted-foreground">
                            {formatDateTime(session.started_at)} • {exerciseCount} exercises • {duration}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="font-mono tabular-nums font-medium">
                          {formatVolume(volume)}
                        </span>
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </div>
                    </div>
                  </Button>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      {session.workout_sets
                        .filter(s => !s.is_warmup)
                        .reduce((acc: any[], s) => {
                          const existing = acc.find(e => e.exercise_id === s.exercise_id)
                          if (existing) {
                            existing.sets.push(s)
                          } else {
                            acc.push({ exercise_id: s.exercise_id, exercise_name: s.exercises.name, sets: [s] })
                          }
                          return acc
                        }, [])
                        .map(ex => (
                          <div key={ex.exercise_id} className="brutalist-card p-3">
                            <h4 className="font-medium mb-2">{ex.exercise_name}</h4>
                            <div className="grid grid-cols-5 gap-2 text-sm">
                              <div className="font-medium text-center">Set</div>
                              <div className="font-medium text-center">Weight</div>
                              <div className="font-medium text-center">Reps</div>
                              <div className="font-medium text-center">RPE</div>
                              <div className="font-medium text-center">Vol</div>
                              {ex.sets.map((set: any) => (
                                <>
                                  <div className="text-center text-muted-foreground">{set.set_number}</div>
                                  <div className="text-center font-mono">
                                    {formatWeight(isMetric ? set.weight_kg : set.weight_lb, isMetric ? 'kg' : 'lb')}
                                  </div>
                                  <div className="text-center">{set.reps}</div>
                                  <div className="text-center">{set.rpe ?? '—'}</div>
                                  <div className="text-center font-mono text-primary">
                                    {formatWeight(calculateVolume(isMetric ? set.weight_kg : set.weight_lb, set.reps), isMetric ? 'kg' : 'lb')}
                                  </div>
                                </>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}

          {hasMore && (
            <div className="text-center">
              <Button variant="outline" onClick={loadMore} disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Load More
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}