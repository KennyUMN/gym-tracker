import { useState } from 'react'
import { View, Text, TextInput, FlatList, ActivityIndicator } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { searchExercises } from '@/api/exercises'

export default function ExerciseLibraryScreen() {
  const [search, setSearch] = useState('')
  const { data: exercises, isLoading } = useQuery({
    queryKey: ['exercises', search],
    queryFn: () => searchExercises(search),
  })

  return (
    <View className="flex-1 pt-16 px-4 bg-white">
      <Text className="text-2xl font-bold mb-4">Exercises</Text>
      <TextInput
        className="h-11 border border-gray-300 rounded-lg px-3 mb-4"
        value={search}
        onChangeText={setSearch}
        placeholder="Search exercises..."
      />
      {isLoading && <ActivityIndicator />}
      <FlatList
        data={exercises ?? []}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View className="py-3 border-b border-gray-100">
            <Text className="font-medium">{item.name}</Text>
            <Text className="text-sm text-gray-500">{item.category} · {item.equipment.join(', ')}</Text>
          </View>
        )}
      />
    </View>
  )
}
