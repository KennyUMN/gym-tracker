import { useState } from 'react'
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native'
import { Link, router } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }

    router.replace('/(app)')
  }

  return (
    <View className="flex-1 justify-center px-6 bg-white">
      <Text className="text-3xl font-bold mb-1 text-center">Gym Tracker</Text>
      <Text className="text-base text-gray-500 mb-8 text-center">Welcome back. Let's see what's next.</Text>

      {error && (
        <View className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <Text className="text-red-800 text-sm">{error}</Text>
        </View>
      )}

      <Text className="text-sm font-medium mb-1">Email</Text>
      <TextInput
        className="h-11 border border-gray-300 rounded-lg px-3 mb-4"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />

      <Text className="text-sm font-medium mb-1">Password</Text>
      <TextInput
        className="h-11 border border-gray-300 rounded-lg px-3 mb-6"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
        autoComplete="password"
      />

      <Pressable
        className="h-11 rounded-lg bg-black items-center justify-center mb-6"
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-medium">Sign In</Text>}
      </Pressable>

      <Text className="text-center text-sm text-gray-500">
        Don't have an account?{' '}
        <Link href="/(auth)/signup" className="text-black font-medium">
          Get started free
        </Link>
      </Text>
    </View>
  )
}
