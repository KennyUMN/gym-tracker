'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dumbbell, Save, Loader2, User, Weight, Target, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const { user, loading: authLoading, profile, refreshProfile } = useAuth()

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [displayName, setDisplayName] = useState('')
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric')
  const [experienceLevel, setExperienceLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner')
  const [plateIncrementKg, setPlateIncrementKg] = useState(1.25)
  const [plateIncrementLb, setPlateIncrementLb] = useState(2.5)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/auth/login'
    }
  }, [user, authLoading])

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '')
      setUnitSystem(profile.unit_system)
      setExperienceLevel(profile.experience_level)
      setPlateIncrementKg(profile.plate_increment_kg || 1.25)
      setPlateIncrementLb(profile.plate_increment_lb || 2.5)
    }
  }, [profile])

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    setMessage(null)
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          display_name: displayName,
          unit_system: unitSystem,
          experience_level: experienceLevel,
          plate_increment_kg: plateIncrementKg,
          plate_increment_lb: plateIncrementLb,
        })

      if (error) throw error

      await refreshProfile()
      setMessage({ type: 'success', text: 'Settings saved successfully!' })
    } catch (error) {
      console.error('Save settings error:', error)
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      {message && (
        <div className={cn(
          'p-4 rounded-lg border text-sm',
          message.type === 'success' && 'bg-green-50 border-green-200 text-green-800',
          message.type === 'error' && 'bg-red-50 border-red-200 text-red-800'
        )}>
          {message.text}
        </div>
      )}

      {/* Profile */}
      <Card className="brutalist-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Profile</CardTitle>
          </div>
          <CardDescription>Manage your display name and account info</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Display Name</label>
            <Input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>
        </CardContent>
      </Card>

      {/* Units & Preferences */}
      <Card className="brutalist-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Weight className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Units & Preferences</CardTitle>
          </div>
          <CardDescription>Choose your measurement system and training preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-3">Unit System</label>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={unitSystem === 'metric' ? 'default' : 'outline'}
                className="brutalist-button h-24 flex flex-col items-center justify-center gap-3"
                onClick={() => setUnitSystem('metric')}
              >
                <div className="text-4xl font-bold">kg</div>
                <div className="text-sm text-muted-foreground">Metric</div>
                <div className="text-xs text-muted-foreground">cm, kg, km</div>
              </Button>
              <Button
                variant={unitSystem === 'imperial' ? 'default' : 'outline'}
                className="brutalist-button h-24 flex flex-col items-center justify-center gap-3"
                onClick={() => setUnitSystem('imperial')}
              >
                <div className="text-4xl font-bold">lb</div>
                <div className="text-sm text-muted-foreground">Imperial</div>
                <div className="text-xs text-muted-foreground">in, lb, mi</div>
              </Button>
            </div>
          </div>

          <div className="border-t pt-6">
            <label className="block text-sm font-medium mb-3">Experience Level</label>
            <div className="grid grid-cols-3 gap-4">
              {(['beginner', 'intermediate', 'advanced'] as const).map(level => (
                <Button
                  key={level}
                  variant={experienceLevel === level ? 'default' : 'outline'}
                  className="brutalist-button h-20 flex flex-col items-center justify-center gap-2 capitalize"
                  onClick={() => setExperienceLevel(level)}
                >
                  <div className="font-medium">{level}</div>
                  <div className="text-xs text-muted-foreground">
                    {level === 'beginner' && 'Linear progression, faster gains'}
                    {level === 'intermediate' && 'Double progression, weekly increments'}
                    {level === 'advanced' && 'Periodized, RPE autoregulation'}
                  </div>
                </Button>
              ))}
            </div>
          </div>

          <div className="border-t pt-6">
            <label className="block text-sm font-medium mb-3">Plate Increments</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Metric (kg)</label>
                <Input
                  type="number"
                  step="0.25"
                  min="0.25"
                  max="5"
                  value={plateIncrementKg}
                  onChange={e => setPlateIncrementKg(parseFloat(e.target.value) || 1.25)}
                  className="brutalist-input"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Imperial (lb)</label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="10"
                  value={plateIncrementLb}
                  onChange={e => setPlateIncrementLb(parseFloat(e.target.value) || 2.5)}
                  className="brutalist-input"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              The smallest plate increment available at your gym. Used for rounding suggested weights.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Progression Engine Info */}
      <Card className="brutalist-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Progression Engine</CardTitle>
          </div>
          <CardDescription>How the app calculates your next session's weights</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="brutalist-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Target className="h-4 w-4 text-blue-600" />
                </div>
                <h4 className="font-bold">Tier 1: Linear</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Hit top of rep range → add weight. Miss bottom 2x → deload 10%.
              </p>
            </div>
            <div className="brutalist-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Target className="h-4 w-4 text-green-600" />
                </div>
                <h4 className="font-bold">Tier 2: %1RM</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Epley/Brzycki 1RM estimation. Plate-rounded percentages.
              </p>
            </div>
            <div className="brutalist-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-purple-600" />
                </div>
                <h4 className="font-bold">Tier 3: RPE</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Autoregulation via RPE trends. Auto-deload on fatigue signals.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2 w-full sm:w-auto">
          <Save className="h-4 w-4" />
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Settings'}
        </Button>
      </div>

      {/* Account Actions */}
      <Card className="brutalist-card border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Deleting your account will permanently remove all your workout data, routines, and progression history.
          </p>
          <Button variant="destructive" className="w-full sm:w-auto">
            Delete Account
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}