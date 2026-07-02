import { useState } from 'react'
import { View, Text, TextInput, Pressable, FlatList, ActivityIndicator } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useAuth } from '@/auth/AuthProvider'
import { searchExercises, LocalExercise } from '@/api/exercises'
import { createRoutine } from '@/api/routines'

interface DraftExercise {
  exercise_id: string
  exercise_name: string
  target_sets: number
  target_reps_min: number
  target_reps_max: number
  rest_seconds: number
}

export default function NewRoutineScreen() {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState<DraftExercise[]>([])
  const [saving, setSaving] = useState(false)

  const { data: results } = useQuery({
    queryKey: ['exercises', search],
    queryFn: () => searchExercises(search),
    enabled: search.length > 0,
  })

  const addExercise = (exercise: LocalExercise) => {
    if (draft.some(d => d.exercise_id === exercise.id)) return
    setDraft(prev => [
      ...prev,
      { exercise_id: exercise.id, exercise_name: exercise.name, target_sets: 3, target_reps_min: 8, target_reps_max: 12, rest_seconds: 120 },
    ])
    setSearch('')
  }

  const removeExercise = (exerciseId: string) => {
    setDraft(prev => prev.filter(d => d.exercise_id !== exerciseId))
  }

  const handleSave = async () => {
    if (!user || !name.trim() || draft.length === 0) return
    setSaving(true)
    await createRoutine(
      user.id,
      name.trim(),
      draft.map((d, index) => ({
        exercise_id: d.exercise_id,
        order_index: index,
        target_sets: d.target_sets,
        target_reps_min: d.target_reps_min,
        target_reps_max: d.target_reps_max,
        rest_seconds: d.rest_seconds,
      }))
    )
    setSaving(false)
    router.replace('/(app)/routines')
  }

  return (
    <View className="flex-1 pt-16 px-4 bg-white">
      <Text className="text-2xl font-bold mb-4">New Routine</Text>

      <TextInput
        className="h-11 border border-gray-300 rounded-lg px-3 mb-4"
        value={name}
        onChangeText={setName}
        placeholder="Routine name"
      />

      <TextInput
        className="h-11 border border-gray-300 rounded-lg px-3 mb-2"
        value={search}
        onChangeText={setSearch}
        placeholder="Search exercises to add..."
      />

      {search.length > 0 && (
        <FlatList
          data={results ?? []}
          keyExtractor={item => item.id}
          style={{ maxHeight: 160 }}
          renderItem={({ item }) => (
            <Pressable className="py-2 border-b border-gray-100" onPress={() => addExercise(item)}>
              <Text>{item.name}</Text>
            </Pressable>
          )}
        />
      )}

      <Text className="text-sm font-medium mt-4 mb-2">Exercises ({draft.length})</Text>
      <FlatList
        data={draft}
        keyExtractor={item => item.exercise_id}
        renderItem={({ item }) => (
          <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
            <View>
              <Text className="font-medium">{item.exercise_name}</Text>
              <Text className="text-sm text-gray-500">
                {item.target_sets} × {item.target_reps_min}–{item.target_reps_max}
              </Text>
            </View>
            <Pressable onPress={() => removeExercise(item.exercise_id)}>
              <Text className="text-red-600">Remove</Text>
            </Pressable>
          </View>
        )}
      />

      <Pressable
        className="h-11 rounded-lg bg-black items-center justify-center mt-6"
        onPress={handleSave}
        disabled={saving || !name.trim() || draft.length === 0}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-medium">Save Routine</Text>}
      </Pressable>
    </View>
  )
}
