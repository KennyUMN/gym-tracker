import { View, Text, Pressable } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/auth/AuthProvider'

const LINKS: Array<{ label: string; href: '/(app)/routines' | '/(app)/exercises' | '/(app)/history' | '/(app)/settings' }> = [
  { label: 'Routines', href: '/(app)/routines' },
  { label: 'Exercises', href: '/(app)/exercises' },
  { label: 'History', href: '/(app)/history' },
  { label: 'Settings', href: '/(app)/settings' },
]

export default function Home() {
  const { user, profile } = useAuth()

  return (
    <View className="flex-1 px-6 pt-16 bg-white">
      <Text className="text-2xl font-bold mb-1">
        Welcome back, {profile?.display_name || user?.email?.split('@')[0]}
      </Text>
      <Text className="text-gray-500 mb-8">Pick a routine and start your session.</Text>

      {LINKS.map(link => (
        <Pressable
          key={link.href}
          className="h-12 rounded-lg border border-gray-300 items-center justify-center mb-3"
          onPress={() => router.push(link.href)}
        >
          <Text className="font-medium">{link.label}</Text>
        </Pressable>
      ))}
    </View>
  )
}
