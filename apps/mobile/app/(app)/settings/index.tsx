import { useEffect, useState } from 'react'
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native'
import { useAuth } from '@/auth/AuthProvider'
import { supabase } from '@/lib/supabase'

export default function SettingsScreen() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric')
  const [experienceLevel, setExperienceLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '')
      setUnitSystem(profile.unit_system)
      setExperienceLevel(profile.experience_level)
    }
  }, [profile])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setMessage(null)

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, display_name: displayName, unit_system: unitSystem, experience_level: experienceLevel })

    if (error) {
      setMessage(`Failed to save settings: ${error.message}`)
    } else {
      await refreshProfile()
      setMessage('Settings saved.')
    }
    setSaving(false)
  }

  return (
    <View className="flex-1 pt-16 px-4 bg-white">
      <Text className="text-2xl font-bold mb-4">Settings</Text>

      {message && <Text className="text-sm text-gray-600 mb-4">{message}</Text>}

      <Text className="text-sm font-medium mb-1">Display Name</Text>
      <TextInput
        className="h-11 border border-gray-300 rounded-lg px-3 mb-4"
        value={displayName}
        onChangeText={setDisplayName}
      />

      <Text className="text-sm font-medium mb-2">Unit System</Text>
      <View className="flex-row gap-2 mb-4">
        {(['metric', 'imperial'] as const).map(u => (
          <Pressable
            key={u}
            className={`flex-1 h-11 rounded-lg items-center justify-center border ${unitSystem === u ? 'bg-black border-black' : 'border-gray-300'}`}
            onPress={() => setUnitSystem(u)}
          >
            <Text className={unitSystem === u ? 'text-white font-medium' : 'font-medium'}>{u === 'metric' ? 'kg' : 'lb'}</Text>
          </Pressable>
        ))}
      </View>

      <Text className="text-sm font-medium mb-2">Experience Level</Text>
      <View className="flex-row gap-2 mb-6">
        {(['beginner', 'intermediate', 'advanced'] as const).map(level => (
          <Pressable
            key={level}
            className={`flex-1 h-11 rounded-lg items-center justify-center border ${experienceLevel === level ? 'bg-black border-black' : 'border-gray-300'}`}
            onPress={() => setExperienceLevel(level)}
          >
            <Text className={`text-xs capitalize ${experienceLevel === level ? 'text-white font-medium' : 'font-medium'}`}>{level}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable className="h-11 rounded-lg bg-black items-center justify-center mb-4" onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-medium">Save Settings</Text>}
      </Pressable>

      <Pressable className="h-11 rounded-lg border border-gray-300 items-center justify-center" onPress={signOut}>
        <Text className="font-medium">Sign Out</Text>
      </Pressable>
    </View>
  )
}
