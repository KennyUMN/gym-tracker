import { Stack } from 'expo-router'
import { AuthProvider } from '@/auth/AuthProvider'
import '../global.css'

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  )
}
