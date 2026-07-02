import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useAuth } from '@/auth/AuthProvider'
import { listLoggedExercises } from '@/api/history'

export default function HistoryScreen() {
  const { user } = useAuth()
  const { data: exercises, isLoading } = useQuery({
    queryKey: ['history-exercises', user?.id],
    queryFn: () => (user ? listLoggedExercises(user.id) : []),
    enabled: !!user,
  })

  return (
    <View className="flex-1 pt-16 px-4 bg-white">
      <Text className="text-2xl font-bold mb-4">History</Text>
      {isLoading && <ActivityIndicator />}
      <FlatList
        data={exercises ?? []}
        keyExtractor={item => item.exercise_id}
        renderItem={({ item }) => (
          <Pressable
            className="py-4 border-b border-gray-100"
            onPress={() => router.push(`/(app)/history/${item.exercise_id}` as never)}
          >
            <Text className="font-bold">{item.exercise_name}</Text>
            <Text className="text-sm text-gray-500">{item.total_sets} sets logged</Text>
          </Pressable>
        )}
        ListEmptyComponent={!isLoading ? <Text className="text-gray-500 mt-4">No workouts logged yet.</Text> : null}
      />
    </View>
  )
}
