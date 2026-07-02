import { useEffect, useState } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useAuth } from '@/auth/AuthProvider'
import { listLocalRoutines, LocalRoutine } from '@/api/routines'
import { computeSuggestion, recordProgressionState } from '@/api/progression'
import { startWorkoutSession, logWorkoutSet, completeWorkoutSession } from '@/api/workout'
import { useRestTimer } from '@/workout/useRestTimer'
import type { ProgressionRecommendation, Exercise } from '@gym-tracker/engine'

function buildEngineExercise(id: string, name: string): Exercise {
  return {
    id,
    name,
    category: '',
    primary_muscles: [],
    secondary_muscles: [],
    equipment: [],
    force_type: 'push',
    mechanic_type: 'compound',
    difficulty: 'beginner',
    instructions: null,
    video_url: null,
    image_url: null,
    created_at: '',
    updated_at: '',
  }
}

interface LoggedSet {
  set_number: number
  weight_kg: number
  reps: number
}

export default function ActiveWorkoutScreen() {
  const { routine: routineId } = useLocalSearchParams<{ routine: string }>()
  const { user, profile } = useAuth()
  const [routine, setRoutine] = useState<LocalRoutine | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Record<string, ProgressionRecommendation>>({})
  const [loggedSets, setLoggedSets] = useState<Record<string, LoggedSet[]>>({})
  const [weightInput, setWeightInput] = useState<Record<string, string>>({})
  const [repsInput, setRepsInput] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timer = useRestTimer()

  const unitSystem = profile?.unit_system ?? 'metric'
  const plateIncrement = unitSystem === 'metric' ? (profile?.plate_increment_kg ?? 1.25) : (profile?.plate_increment_lb ?? 2.5)

  useEffect(() => {
    if (!user || !routineId) return
    const userId = user.id

    async function init() {
      setLoading(true)
      const routines = await listLocalRoutines(userId)
      const found = routines.find(r => r.id === routineId) ?? null
      setRoutine(found)

      if (found) {
        const newSessionId = await startWorkoutSession(userId, found.id)
        setSessionId(newSessionId)

        const nextSuggestions: Record<string, ProgressionRecommendation> = {}
        for (const re of found.exercises) {
          const exercise = buildEngineExercise(re.exercise_id, re.exercise_name)
          nextSuggestions[re.exercise_id] = await computeSuggestion(userId, exercise, re.progression_rule, unitSystem, plateIncrement)
        }
        setSuggestions(nextSuggestions)
      }

      setLoading(false)
    }

    init()
  }, [user, routineId])

  const handleLogSet = async (exerciseId: string, restSeconds: number) => {
    if (!user || !sessionId) return
    const weight = parseFloat(weightInput[exerciseId] ?? '')
    const reps = parseInt(repsInput[exerciseId] ?? '', 10)
    if (!weight || !reps) return

    setError(null)
    const setNumber = (loggedSets[exerciseId]?.length ?? 0) + 1

    try {
      await logWorkoutSet(user.id, sessionId, exerciseId, setNumber, weight, reps, false)
    } catch {
      setError('Could not save that set locally. Your in-progress workout is unaffected — try logging it again.')
      return
    }

    setLoggedSets(prev => ({
      ...prev,
      [exerciseId]: [...(prev[exerciseId] ?? []), { set_number: setNumber, weight_kg: weight, reps }],
    }))
    setRepsInput(prev => ({ ...prev, [exerciseId]: '' }))
    timer.start(restSeconds)
  }

  const handleFinish = async () => {
    if (!user || !sessionId || !routine) return
    setFinishing(true)
    setError(null)

    try {
      await completeWorkoutSession(user.id, sessionId)

      for (const re of routine.exercises) {
        const exercise = buildEngineExercise(re.exercise_id, re.exercise_name)
        const recommendation = suggestions[re.exercise_id]
        if (recommendation) {
          await recordProgressionState(user.id, exercise, re.progression_rule, unitSystem, plateIncrement, recommendation)
        }
      }
    } catch {
      setError('Could not finish the workout locally. Your logged sets are safe — try finishing again.')
      setFinishing(false)
      return
    }

    setFinishing(false)
    router.replace('/(app)/routines')
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (!routine) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-gray-500">Routine not found. It may not have synced to this device yet.</Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingTop: 64, paddingHorizontal: 16, paddingBottom: 32 }}>
      <Text className="text-2xl font-bold mb-1">{routine.name}</Text>

      {error && (
        <View className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <Text className="text-red-800 text-sm">{error}</Text>
        </View>
      )}

      {timer.running && (
        <View className="bg-black rounded-lg p-3 mb-4 items-center">
          <Text className="text-white font-bold text-lg">Rest: {timer.remainingSeconds}s</Text>
        </View>
      )}

      {routine.exercises.map(re => {
        const suggestion = suggestions[re.exercise_id]
        const sets = loggedSets[re.exercise_id] ?? []
        const unit = unitSystem === 'metric' ? 'kg' : 'lb'
        const suggestedWeight = unitSystem === 'metric' ? suggestion?.recommended_weight_kg : suggestion?.recommended_weight_lb

        return (
          <View key={re.id} className="mb-6 border border-gray-200 rounded-lg p-4">
            <Text className="font-bold text-lg mb-1">{re.exercise_name}</Text>
            <Text className="text-sm text-gray-500 mb-2">
              Target: {re.target_sets} × {re.target_reps_min}–{re.target_reps_max}
            </Text>

            {suggestion && (
              <View className="bg-gray-50 rounded-lg p-3 mb-3">
                <Text className="text-2xl font-bold">
                  {suggestedWeight ? `${suggestedWeight}${unit}` : '—'}
                </Text>
                <Text className="text-sm text-gray-500 mt-1">{suggestion.reason}</Text>
                {suggestion.should_deload && (
                  <Text className="text-red-600 text-sm font-medium mt-1">Deload {suggestion.deload_percentage}%</Text>
                )}
              </View>
            )}

            {sets.map(s => (
              <Text key={s.set_number} className="text-sm text-gray-600 mb-1">
                Set {s.set_number}: {s.weight_kg}{unit} × {s.reps}
              </Text>
            ))}

            <View className="flex-row gap-2 mt-2">
              <TextInput
                className="flex-1 h-11 border border-gray-300 rounded-lg px-3"
                placeholder={`Weight (${unit})`}
                keyboardType="decimal-pad"
                value={weightInput[re.exercise_id] ?? ''}
                onChangeText={v => setWeightInput(prev => ({ ...prev, [re.exercise_id]: v }))}
              />
              <TextInput
                className="flex-1 h-11 border border-gray-300 rounded-lg px-3"
                placeholder="Reps"
                keyboardType="number-pad"
                value={repsInput[re.exercise_id] ?? ''}
                onChangeText={v => setRepsInput(prev => ({ ...prev, [re.exercise_id]: v }))}
              />
              <Pressable
                className="h-11 px-4 rounded-lg bg-black items-center justify-center"
                onPress={() => handleLogSet(re.exercise_id, re.rest_seconds)}
              >
                <Text className="text-white font-medium">Log</Text>
              </Pressable>
            </View>
          </View>
        )
      })}

      <Pressable
        className="h-12 rounded-lg bg-black items-center justify-center mt-2"
        onPress={handleFinish}
        disabled={finishing}
      >
        {finishing ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Finish Workout</Text>}
      </Pressable>
    </ScrollView>
  )
}
