import { View, Text, FlatList, ActivityIndicator } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { useAuth } from '@/auth/AuthProvider'
import { listSetsForExercise } from '@/api/history'

export default function ExerciseHistoryScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>()
  const { user } = useAuth()

  const { data: sets, isLoading } = useQuery({
    queryKey: ['history-sets', user?.id, exerciseId],
    queryFn: () => (user && exerciseId ? listSetsForExercise(user.id, exerciseId) : []),
    enabled: !!user && !!exerciseId,
  })

  return (
    <View className="flex-1 pt-16 px-4 bg-white">
      <Text className="text-2xl font-bold mb-4">Exercise History</Text>
      {isLoading && <ActivityIndicator />}
      <FlatList
        data={sets ?? []}
        keyExtractor={(item, index) => `${item.session_id}-${index}`}
        renderItem={({ item }) => (
          <View className="py-3 border-b border-gray-100 flex-row justify-between">
            <Text className="text-gray-600">{new Date(item.completed_at).toLocaleDateString()}</Text>
            <Text className="font-medium">{item.weight_kg ?? '—'}kg × {item.reps}</Text>
          </View>
        )}
        ListEmptyComponent={!isLoading ? <Text className="text-gray-500 mt-4">No sets logged for this exercise yet.</Text> : null}
      />
    </View>
  )
}
