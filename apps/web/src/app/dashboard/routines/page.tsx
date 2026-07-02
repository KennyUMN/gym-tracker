'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dumbbell, Plus, Trash2, Edit, Search, Loader2, Save, X, GripVertical, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Exercise {
  id: string
  name: string
  category: string
  primary_muscles: string[]
  secondary_muscles: string[]
  equipment: string[]
  image_url: string | null
}

interface Routine {
  id: string
  name: string
  description: string | null
  is_active: boolean
  routine_exercises: Array<{
    id: string
    exercise_id: string
    exercise: Exercise
    order_index: number
    target_sets: number
    target_reps_min: number
    target_reps_max: number
    rest_seconds: number
    progression_rule: any
  }>
}

export default function RoutinesPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [routines, setRoutines] = useState<Routine[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  // Form state for new/edit routine
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formExercises, setFormExercises] = useState<Array<{
    exercise_id: string
    order_index: number
    target_sets: number
    target_reps_min: number
    target_reps_max: number
    rest_seconds: number
  }>>([])

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
          .order('created_at', { ascending: false })

        if (routinesData) {
          setRoutines(routinesData.map(r => ({
            ...r,
            routine_exercises: (r.routine_exercises || []).sort((a: any, b: any) => a.order_index - b.order_index)
          })) as Routine[])
        }

        // Fetch exercises for the picker
        const { data: exercisesData } = await supabase
          .from('exercises')
          .select('*')
          .order('name')

        if (exercisesData) {
          setExercises(exercisesData)
        }
      } catch (error) {
        console.error('Fetch error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, supabase])

  const handleCreateRoutine = async () => {
    if (!formName.trim()) return

    setCreating(true)
    try {
      const { data: routine, error } = await supabase
        .from('routines')
        .insert({
          user_id: user!.id,
          name: formName,
          description: formDescription,
          is_active: true,
        })
        .select()
        .single()

      if (error) throw error

      // Add exercises
      if (formExercises.length > 0) {
        const routineExercises = formExercises.map((ex, idx) => ({
          routine_id: routine.id,
          exercise_id: ex.exercise_id,
          order_index: idx,
          target_sets: ex.target_sets,
          target_reps_min: ex.target_reps_min,
          target_reps_max: ex.target_reps_max,
          rest_seconds: ex.rest_seconds,
          progression_rule: {
            type: 'double_progression',
            weight_increment_kg: 2.5,
            weight_increment_lb: 5,
            rep_target_min: ex.target_reps_min,
            rep_target_max: ex.target_reps_max,
            deload_trigger_failed_sessions: 2,
            deload_percentage: 10,
          },
        }))

        await supabase.from('routine_exercises').insert(routineExercises)
      }

      // Refresh
      setFormName('')
      setFormDescription('')
      setFormExercises([])
      setCreating(false)
    } catch (error) {
      console.error('Create routine error:', error)
      setCreating(false)
    }
  }

  const handleDeleteRoutine = async (id: string) => {
    if (!confirm('Delete this routine?')) return

    try {
      await supabase.from('routines').delete().eq('id', id)
      setRoutines(prev => prev.filter(r => r.id !== id))
    } catch (error) {
      console.error('Delete routine error:', error)
    }
  }

  const addExerciseToForm = (exercise: Exercise) => {
    if (formExercises.some(e => e.exercise_id === exercise.id)) return
    setFormExercises(prev => [...prev, {
      exercise_id: exercise.id,
      order_index: prev.length,
      target_sets: 3,
      target_reps_min: 8,
      target_reps_max: 12,
      rest_seconds: 120,
    }])
  }

  const removeExerciseFromForm = (idx: number) => {
    setFormExercises(prev => prev.filter((_, i) => i !== idx))
  }

  const moveExerciseInForm = (idx: number, direction: 'up' | 'down') => {
    setFormExercises((prev: typeof formExercises) => {
      const newArr = [...prev]
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= newArr.length) return prev
      const temp = newArr[idx]
      newArr[idx] = newArr[targetIdx]
      newArr[targetIdx] = temp
      return newArr
    })
  }

  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || ex.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categories = [...new Set(exercises.map(e => e.category))].sort()

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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Routines</h1>
        <Button onClick={() => setCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Routine
        </Button>
      </div>

      {/* Create/Edit Modal */}
      {(creating || editingId) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="brutalist-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{editingId ? 'Edit Routine' : 'Create Routine'}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { setCreating(false); setEditingId(null); setFormExercises([]); }}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Push/Pull/Legs" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                <Input value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Notes about this routine..." />
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Exercises</h4>
                  <span className="text-sm text-muted-foreground">{formExercises.length} exercises</span>
                </div>

                {/* Exercise search */}
                <div className="space-y-2 mb-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search exercises..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="flex-1"
                    />
                    <select
                      value={selectedCategory}
                      onChange={e => setSelectedCategory(e.target.value)}
                      className="brutalist-input px-3 py-2 w-40"
                    >
                      <option value="">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {filteredExercises.slice(0, 20).map(ex => (
                      <div
                        key={ex.id}
                        className="brutalist-card p-2 flex items-center justify-between"
                        onClick={() => addExerciseToForm(ex)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{ex.name}</span>
                          <span className="text-xs text-muted-foreground">{ex.category}</span>
                        </div>
                        <Plus className="h-5 w-5 text-primary" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selected exercises */}
                {formExercises.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Selected Exercises (drag to reorder)</h4>
                    {formExercises.map((ex, idx) => {
                      const exercise = exercises.find(e => e.id === ex.exercise_id)
                      return (
                        <div key={ex.exercise_id} className="brutalist-card p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                          <Button variant="ghost" size="icon" onClick={() => moveExerciseInForm(idx, 'up')} disabled={idx === 0}>
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => moveExerciseInForm(idx, 'down')} disabled={idx === formExercises.length - 1}>
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
                            <span className="font-medium">{exercise?.name || 'Unknown'}</span>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Input type="number" placeholder="Sets" value={ex.target_sets} onChange={e => setFormExercises(prev => prev.map((x, i) => i === idx ? { ...x, target_sets: parseInt(e.target.value) || 3 } : x))} className="w-20" />
                              <span className="text-muted-foreground">×</span>
                              <Input type="number" placeholder="Min" value={ex.target_reps_min} onChange={e => setFormExercises(prev => prev.map((x, i) => i === idx ? { ...x, target_reps_min: parseInt(e.target.value) || 8 } : x))} className="w-20" />
                              <span className="text-muted-foreground">–</span>
                              <Input type="number" placeholder="Max" value={ex.target_reps_max} onChange={e => setFormExercises(prev => prev.map((x, i) => i === idx ? { ...x, target_reps_max: parseInt(e.target.value) || 12 } : x))} className="w-20" />
                              <span className="text-muted-foreground">reps</span>
                              <Input type="number" placeholder="Rest" value={ex.rest_seconds} onChange={e => setFormExercises(prev => prev.map((x, i) => i === idx ? { ...x, rest_seconds: parseInt(e.target.value) || 120 } : x))} className="w-20" />
                              <span className="text-muted-foreground">s</span>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeExerciseFromForm(idx)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => { setCreating(false); setEditingId(null); setFormExercises([]); }}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRoutine} disabled={creating || !formName.trim()}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Routine'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Routines List */}
      {routines.length === 0 ? (
        <Card className="brutalist-card text-center py-12">
          <CardContent>
            <Dumbbell className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-bold mb-2">No routines yet</h2>
            <p className="text-muted-foreground mb-6">Create your first workout routine to get started.</p>
            <Button onClick={() => setCreating(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Routine
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {routines.map(routine => (
            <Card key={routine.id} className="brutalist-card">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{routine.name}</h3>
                      {routine.is_active && (
                        <span className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-800">Active</span>
                      )}
                    </div>
                    {routine.description && (
                      <p className="text-muted-foreground mb-3">{routine.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <span>{routine.routine_exercises.length} exercises</span>
                      <span>{routine.routine_exercises.reduce((sum, ex) => sum + ex.target_sets, 0)} total sets</span>
                      <span>~{Math.round(routine.routine_exercises.reduce((sum, ex) => sum + ex.target_sets * (ex.rest_seconds + 30), 0) / 60)} min</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/workout?routine=${routine.id}`)}
                      className="gap-1"
                    >
                      <Dumbbell className="h-4 w-4" />
                      Start
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteRoutine(routine.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Exercise list preview */}
                {routine.routine_exercises.length > 0 && (
                  <div className="mt-4 pt-4 border-t space-y-2">
                    {routine.routine_exercises.map((re, idx) => (
                      <div key={re.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground w-6 text-center">{idx + 1}</span>
                          <span className="font-medium">{re.exercise.name}</span>
                          <span className="text-muted-foreground">
                            {re.target_sets}×{re.target_reps_min}–{re.target_reps_max}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}