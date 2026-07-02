import { Redirect, Stack } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { useAuth } from '@/auth/AuthProvider'
import { useSyncOnReconnect } from '@/sync/useSyncOnReconnect'

export default function AppLayout() {
  const { user, loading } = useAuth()
  useSyncOnReconnect(user?.id)

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />
  }

  return <Stack screenOptions={{ headerShown: false }} />
}
