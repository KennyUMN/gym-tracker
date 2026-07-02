import { View, Text, Pressable } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/auth/AuthProvider'

export default function Home() {
  const { user, profile, signOut } = useAuth()

  return (
    <View className="flex-1 px-6 pt-16 bg-white">
      <Text className="text-2xl font-bold mb-1">
        Welcome back, {profile?.display_name || user?.email?.split('@')[0]}
      </Text>
      <Text className="text-gray-500 mb-8">Pick a routine and start your session.</Text>

      <Pressable
        className="h-11 rounded-lg bg-black items-center justify-center mb-4"
        onPress={() => router.push('/(app)/routines')}
      >
        <Text className="text-white font-medium">View Routines</Text>
      </Pressable>

      <Pressable className="h-11 rounded-lg border border-gray-300 items-center justify-center" onPress={signOut}>
        <Text className="font-medium">Sign Out</Text>
      </Pressable>
    </View>
  )
}
