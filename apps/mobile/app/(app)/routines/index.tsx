import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useAuth } from '@/auth/AuthProvider'
import { listLocalRoutines, refreshRoutinesFromSupabase } from '@/api/routines'

export default function RoutinesScreen() {
  const { user } = useAuth()

  const { data: routines, isLoading } = useQuery({
    queryKey: ['routines', user?.id],
    queryFn: async () => {
      if (!user) return []
      try {
        await refreshRoutinesFromSupabase(user.id)
      } catch {
        // offline — fall back to cached data
      }
      return listLocalRoutines(user.id)
    },
    enabled: !!user,
  })

  return (
    <View className="flex-1 pt-16 px-4 bg-white">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-2xl font-bold">Routines</Text>
        <Pressable onPress={() => router.push('/(app)/routines/new')}>
          <Text className="text-black font-medium">+ New</Text>
        </Pressable>
      </View>

      {isLoading && <ActivityIndicator />}

      <FlatList
        data={routines ?? []}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Pressable
            className="py-4 border-b border-gray-100"
            // Task 8 creates the workout/active screen; typed routes can't see it yet.
            onPress={() => router.push(`/(app)/workout/active?routine=${item.id}` as never)}
          >
            <Text className="font-bold text-lg">{item.name}</Text>
            <Text className="text-sm text-gray-500">{item.exercises.length} exercises</Text>
          </Pressable>
        )}
        ListEmptyComponent={!isLoading ? <Text className="text-gray-500 mt-4">No routines yet. Create one to get started.</Text> : null}
      />
    </View>
  )
}
