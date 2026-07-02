'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dumbbell, Zap, ArrowRight, Clock, BarChart2, Plus, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Routine {
  id: string
  name: string
  description: string | null
  is_active: boolean
  routine_exercises: Array<{
    id: string
    exercise_id: string
    exercise: {
      id: string
      name: string
      category: string
      primary_muscles: string[]
      equipment: string[]
      image_url: string | null
    }
    order_index: number
    target_sets: number
    target_reps_min: number
    target_reps_max: number
    rest_seconds: number
  }>
}

interface ProgressionRec {
  exercise_id: string
  exercise_name: string
  recommended_weight_kg: number | null
  recommended_weight_lb: number | null
  target_reps_min: number
  target_reps_max: number
  reason: string
  confidence: 'high' | 'medium' | 'low'
  should_deload: boolean
  deload_percentage?: number
}

export default function DashboardPage() {
  const { user, loading: authLoading, profile } = useAuth()
  const router = useRouter()
  const [routines, setRoutines] = useState<Routine[]>([])
  const [recommendations, setRecommendations] = useState<Record<string, ProgressionRec>>({})
  const [loading, setLoading] = useState(true)
  const [selectedRoutine, setSelectedRoutine] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return

    async function fetchData() {
      setLoading(true)
      try {
        const userId = user!.id
        // Fetch routines
        const { data: routinesData } = await supabase
          .from('routines')
          .select(`
            *,
            routine_exercises (
              *,
              exercises (id, name, category, primary_muscles, equipment, image_url)
            )
          `)
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (routinesData) {
          const sortedRoutines = routinesData.map(r => ({
            ...r,
            routine_exercises: (r.routine_exercises || []).sort((a: any, b: any) => a.order_index - b.order_index)
          }))
          setRoutines(sortedRoutines)

          // Auto-select first routine
          if (sortedRoutines.length > 0 && !selectedRoutine) {
            setSelectedRoutine(sortedRoutines[0].id)
          }
        }

        // Fetch progression recommendations for all exercises in routines
        for (const routine of routinesData || []) {
          for (const re of routine.routine_exercises || []) {
            try {
              const response = await fetch('/api/progression', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  exercise_id: re.exercise_id,
                  routine_exercise_id: re.id,
                }),
              })
              if (response.ok) {
                const data = await response.json()
                setRecommendations(prev => ({
                  ...prev,
                  [re.exercise_id]: data.recommendation,
                }))
              }
            } catch (e) {
              console.error('Failed to fetch progression:', e)
            }
          }
        }
      } catch (error) {
        console.error('Dashboard fetch error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, selectedRoutine, supabase])

  const handleStartWorkout = (routineId: string) => {
    router.push(`/dashboard/workout?routine=${routineId}`)
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) return null

  const currentRoutine = routines.find(r => r.id === selectedRoutine)
  const routineExercises = currentRoutine?.routine_exercises || []

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {profile?.display_name || user.email?.split('@')[0]}</h1>
          <p className="text-muted-foreground mt-1">Pick a routine and start your session. The engine has your next weights ready.</p>
        </div>
        <div className="flex gap-2">
                  <Link href="/dashboard/routines">
                    <Button variant="outline" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Routine
                    </Button>
                  </Link>
                </div>
      </div>

      {/* Routine selector */}
      {routines.length > 1 && (
        <div className="brutalist-card p-4">
          <label className="block text-sm font-medium mb-2">Active Routine</label>
          <div className="flex flex-wrap gap-2">
            {routines.map(routine => (
              <Button
                key={routine.id}
                variant={selectedRoutine === routine.id ? 'default' : 'outline'}
                className="brutalist-button"
                onClick={() => setSelectedRoutine(routine.id)}
              >
                {routine.name}
                <span className="ml-2 text-xs opacity-70">
                  {routine.routine_exercises?.length || 0} exercises
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* No routines */}
      {routines.length === 0 && (
        <Card className="brutalist-card text-center py-12">
          <CardContent>
            <Dumbbell className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-bold mb-2">No routines yet</h2>
            <p className="text-muted-foreground mb-6">Create your first workout routine to get started.</p>
            <Link href="/dashboard/routines">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Routine
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Current routine with progression recommendations */}
      {currentRoutine && routineExercises.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">{currentRoutine.name}</h2>
            <Button onClick={() => handleStartWorkout(currentRoutine.id)} className="gap-2" size="lg">
              <Dumbbell className="h-5 w-5" />
              Start Workout
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {routineExercises.map((re, index) => {
              const rec = recommendations[re.exercise_id]
              const recWeightKg = rec?.recommended_weight_kg
              const recWeightLb = rec?.recommended_weight_lb
              const isMetric = profile?.unit_system === 'metric'
              const displayWeight = isMetric ? recWeightKg : recWeightLb
              const unit = isMetric ? 'kg' : 'lb'

              return (
                <Card key={re.id} className="brutalist-card overflow-hidden">
                  <div className={cn(
                    'p-4 border-b border-border',
                    rec?.should_deload && 'bg-destructive/10 border-destructive/20'
                  )}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Dumbbell className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-bold">{re.exercise.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {re.target_sets}×{re.target_reps_min}–{re.target_reps_max} • {re.rest_seconds}s rest
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-mono text-primary/70">#{index + 1}</span>
                    </div>
                  </div>

                  {rec && (
                    <div className="p-4 bg-muted/30">
                      <div className="flex items-baseline justify-between mb-2">
                        <span className="text-3xl font-bold font-mono tabular-nums">
                          {displayWeight ? `${displayWeight}${unit}` : '--'}
                        </span>
                        <span className={cn(
                          'text-xs font-medium px-2 py-1 rounded',
                          rec.confidence === 'high' && 'bg-green-100 text-green-800',
                          rec.confidence === 'medium' && 'bg-yellow-100 text-yellow-800',
                          rec.confidence === 'low' && 'bg-gray-100 text-gray-800'
                        )}>
                          {rec.confidence}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{rec.reason}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Target: {rec.target_reps_min}–{rec.target_reps_max} reps</span>
                        {rec.should_deload && (
                          <span className="text-destructive font-medium">
                            ⚠ Deload {rec.deload_percentage}%
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Quick stats */}
      {currentRoutine && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="brutalist-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Exercises</p>
                  <p className="text-3xl font-bold">{routineExercises.length}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Dumbbell className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="brutalist-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sets</p>
                  <p className="text-3xl font-bold">
                    {routineExercises.reduce((sum, ex) => sum + ex.target_sets, 0)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="brutalist-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Est. Time</p>
                  <p className="text-3xl font-bold">
                    {Math.round(routineExercises.reduce((sum, ex) =>
                      sum + ex.target_sets * (ex.rest_seconds + 30), 0) / 60)} min
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}