'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dumbbell, Check, X, Loader2, Minus, Plus, Save, ArrowLeft, Clock, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RoutineExercise {
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
  progression_rule: any
}

interface SessionExercise {
  routine_exercise_id: string
  exercise_id: string
  exercise: {
    id: string
    name: string
    category: string
  }
  sets: WorkoutSet[]
  target_sets: number
  target_reps_min: number
  target_reps_max: number
  rest_seconds: number
  recommended_weight_kg: number | null
  recommended_weight_lb: number | null
}

interface WorkoutSet {
  id?: string
  set_number: number
  weight_kg: number | null
  weight_lb: number | null
  reps: number | null
  rpe: number | null
  is_warmup: boolean
  completed: boolean
}

interface ProgressionRec {
  exercise_id: string
  recommended_weight_kg: number | null
  recommended_weight_lb: number | null
  target_reps_min: number
  target_reps_max: number
  reason: string
  confidence: 'high' | 'medium' | 'low'
  should_deload: boolean
  deload_percentage?: number
}

export default function WorkoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <WorkoutPageContent />
    </Suspense>
  )
}

function WorkoutPageContent() {
  const { user, loading: authLoading, profile } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const routineId = searchParams.get('routine')

  const [routine, setRoutine] = useState<RoutineExercise[]>([])
  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [startTime] = useState(Date.now())

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  // Fetch routine and create session
  useEffect(() => {
    if (!user || !routineId) return

    async function initWorkout() {
      setLoading(true)
      try {
        const userId = user!.id
        // Fetch routine exercises
        const { data: routineData } = await supabase
          .from('routine_exercises')
          .select(`
            *,
            exercises (id, name, category, primary_muscles, equipment, image_url)
          `)
          .eq('routine_id', routineId)
          .order('order_index')

        if (routineData) {
          setRoutine(routineData as RoutineExercise[])

          // Create workout session
          const { data: session } = await supabase
            .from('workout_sessions')
            .insert({
              user_id: userId,
              routine_id: routineId,
              started_at: new Date().toISOString(),
            })
            .select()
            .single()

          if (session) {
            setSessionId(session.id)

            // Initialize session exercises with empty sets
            const exercises = routineData.map((re, idx) => ({
              routine_exercise_id: re.id,
              exercise_id: re.exercise_id,
              exercise: re.exercise,
              sets: Array.from({ length: re.target_sets }, (_, i) => ({
                set_number: i + 1,
                weight_kg: null,
                weight_lb: null,
                reps: null,
                rpe: null,
                is_warmup: false,
                completed: false,
              })),
              target_sets: re.target_sets,
              target_reps_min: re.target_reps_min,
              target_reps_max: re.target_reps_max,
              rest_seconds: re.rest_seconds,
              recommended_weight_kg: null,
              recommended_weight_lb: null,
            }))
            setSessionExercises(exercises)

            // Fetch progression recommendations
            for (const ex of exercises) {
              try {
                const response = await fetch('/api/progression', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    exercise_id: ex.exercise_id,
                    routine_exercise_id: ex.routine_exercise_id,
                  }),
                })
                if (response.ok) {
                  const data = await response.json()
                  setSessionExercises(prev => prev.map(e =>
                    e.exercise_id === ex.exercise_id
                      ? { ...e, recommended_weight_kg: data.recommendation.recommended_weight_kg, recommended_weight_lb: data.recommendation.recommended_weight_lb }
                      : e
                  ))
                }
              } catch (e) {
                console.error('Failed to fetch progression:', e)
              }
            }
          }
        }
      } catch (error) {
        console.error('Workout init error:', error)
      } finally {
        setLoading(false)
      }
    }

    initWorkout()
  }, [user, routineId, supabase])

  // Timer
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setElapsed(Date.now() - startTime), 1000)
    return () => clearInterval(interval)
  }, [startTime])

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const handleSetChange = (exerciseIdx: number, setIdx: number, field: keyof WorkoutSet, value: any) => {
    setSessionExercises(prev => prev.map((ex, ei) =>
      ei === exerciseIdx
        ? { ...ex, sets: ex.sets.map((s, si) => si === setIdx ? { ...s, [field]: value } : s) }
        : ex
    ))
  }

  const handleSaveSet = async (exerciseIdx: number, setIdx: number) => {
    if (!sessionId) return

    const ex = sessionExercises[exerciseIdx]
    const set = ex.sets[setIdx]
    const isMetric = profile?.unit_system === 'metric'
    const weightKg = isMetric ? set.weight_kg : (set.weight_lb ? set.weight_lb * 0.453592 : null)
    const weightLb = isMetric ? (set.weight_kg ? set.weight_kg * 2.20462 : null) : set.weight_lb

    if (!set.reps || set.reps <= 0) return

    try {
      const { data, error } = await supabase
        .from('workout_sets')
        .upsert({
          id: set.id,
          session_id: sessionId,
          exercise_id: ex.exercise_id,
          set_number: set.set_number,
          weight_kg: weightKg,
          weight_lb: weightLb,
          reps: set.reps,
          rpe: set.rpe,
          is_warmup: set.is_warmup,
          completed_at: new Date().toISOString(),
        }, { onConflict: 'id' })
        .select()
        .single()

      if (error) throw error

      setSessionExercises(prev => prev.map((e, ei) =>
        ei === exerciseIdx
          ? { ...e, sets: e.sets.map((s, si) => si === setIdx ? { ...s, id: data.id, completed: true } : s) }
          : e
      ))
    } catch (error) {
      console.error('Save set error:', error)
    }
  }

  const handleCompleteWorkout = async () => {
    if (!sessionId) return

    setSaving(true)
    try {
      await supabase
        .from('workout_sessions')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', sessionId)

      router.push('/dashboard/history')
    } catch (error) {
      console.error('Complete workout error:', error)
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user || !routineId) return null

  const isMetric = profile?.unit_system === 'metric'
  const completedSets = sessionExercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0)
  const totalSets = sessionExercises.reduce((sum, ex) => sum + ex.target_sets, 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 text-center">
          <div className="text-2xl font-mono tabular-nums font-bold">{formatTime(elapsed)}</div>
          <div className="text-sm text-muted-foreground">{completedSets}/{totalSets} sets completed</div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button onClick={handleCompleteWorkout} disabled={saving} size="lg" className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Finish'}
          </Button>
        </div>
      </div>

      {/* Exercises */}
      <div className="space-y-6">
        {sessionExercises.map((ex, exIdx) => {
          const rec = ex.recommended_weight_kg
          const displayRecWeight = isMetric ? ex.recommended_weight_kg : ex.recommended_weight_lb
          const unit = isMetric ? 'kg' : 'lb'

          return (
            <Card key={ex.routine_exercise_id} className="brutalist-card">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Dumbbell className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{ex.exercise.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {ex.target_sets} sets × {ex.target_reps_min}–{ex.target_reps_max} reps • {ex.rest_seconds}s rest
                      </p>
                    </div>
                  </div>
                  {displayRecWeight && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">SUGGESTED</p>
                      <p className="text-2xl font-bold font-mono tabular-nums text-primary">
                        {displayRecWeight}{unit}
                      </p>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-2">
                  {ex.sets.map((set, setIdx) => (
                    <div key={`${ex.routine_exercise_id}-${set.set_number}`} className="brutalist-card p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="w-10 text-center text-sm font-mono text-muted-foreground">
                        #{set.set_number}
                      </div>

                      <div className="flex-1 flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground w-16">Weight</span>
                          <Input
                            type="number"
                            step={isMetric ? 1.25 : 2.5}
                            min={0}
                            placeholder="--"
                            value={isMetric ? (set.weight_kg ?? '') : (set.weight_lb ?? '')}
                            onChange={(e) => handleSetChange(exIdx, setIdx, isMetric ? 'weight_kg' : 'weight_lb', e.target.value ? parseFloat(e.target.value) : null)}
                            className="w-24"
                          />
                          <span className="text-sm text-muted-foreground">{unit}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground w-10">Reps</span>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            placeholder="--"
                            value={set.reps ?? ''}
                            onChange={(e) => handleSetChange(exIdx, setIdx, 'reps', e.target.value ? parseInt(e.target.value) : null)}
                            className="w-20"
                          />
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground w-10">RPE</span>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            placeholder="--"
                            value={set.rpe ?? ''}
                            onChange={(e) => handleSetChange(exIdx, setIdx, 'rpe', e.target.value ? parseInt(e.target.value) : null)}
                            className="w-20"
                          />
                        </div>

                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={set.is_warmup}
                            onChange={(e) => handleSetChange(exIdx, setIdx, 'is_warmup', e.target.checked)}
                            className="rounded border-input"
                          />
                          <span className="text-muted-foreground">Warmup</span>
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        {set.completed ? (
                          <Button variant="ghost" size="icon" disabled>
                            <Check className="h-5 w-5 text-green-600" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleSaveSet(exIdx, setIdx)}
                            disabled={!set.reps || set.reps <= 0}
                            className="gap-1"
                          >
                            <Save className="h-4 w-4" />
                            Log
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Rest timer for this exercise */}
                <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Rest: {ex.rest_seconds}s between sets</span>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {sessionExercises.length === 0 && (
          <Card className="brutalist-card text-center py-12">
            <CardContent>
              <Dumbbell className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h2 className="text-xl font-bold mb-2">No exercises in this routine</h2>
              <p className="text-muted-foreground">Add exercises to your routine first.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}