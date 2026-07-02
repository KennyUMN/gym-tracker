import { useState } from 'react'
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native'
import { Link, router } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function SignupScreen() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmationSent, setConfirmationSent] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })

    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }

    if (data.session) {
      router.replace('/(app)')
      return
    }

    setConfirmationSent(true)
    setSubmitting(false)
  }

  if (confirmationSent) {
    return (
      <View className="flex-1 justify-center px-6 bg-white">
        <View className="p-4 rounded-lg bg-green-50 border border-green-200">
          <Text className="text-green-800 text-sm">Check your email to confirm your account, then sign in.</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 justify-center px-6 bg-white">
      <Text className="text-3xl font-bold mb-1 text-center">Create your account</Text>
      <Text className="text-base text-gray-500 mb-8 text-center">Start letting your history decide the weight.</Text>

      {error && (
        <View className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <Text className="text-red-800 text-sm">{error}</Text>
        </View>
      )}

      <Text className="text-sm font-medium mb-1">Display Name</Text>
      <TextInput
        className="h-11 border border-gray-300 rounded-lg px-3 mb-4"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Your name"
        autoComplete="name"
      />

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
        placeholder="At least 6 characters"
        secureTextEntry
        autoComplete="password-new"
      />

      <Pressable
        className="h-11 rounded-lg bg-black items-center justify-center mb-6"
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-medium">Create Account</Text>}
      </Pressable>

      <Text className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/(auth)/login" className="text-black font-medium">
          Sign in
        </Link>
      </Text>
    </View>
  )
}
