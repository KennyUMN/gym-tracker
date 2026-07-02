'use client'

import Link from 'next/link'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Dumbbell, Zap, Brain, BarChart2, ArrowRight } from 'lucide-react'

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/10 text-primary text-sm font-medium mb-6">
              <Zap className="h-4 w-4" />
              <span>Progressive Overload Coach</span>
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">
              Your gym tracker that{' '}
              <span className="text-primary">tells you what to lift next</span>
            </h1>
            <p className="text-lg lg:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Most trackers are just logbooks. This one runs a progression engine — linear, double progression, 
              RPE-based autoregulation — so every session has a target weight calculated from your history.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? (
                <Link href="/dashboard">
                  <Button size="lg" className="gap-2">
                    Open Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button size="lg" className="gap-2">
                      Sign In
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button size="lg" variant="outline" className="gap-2">
                      Get Started Free
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Why this isn't just another logbook</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The progression engine is the core feature, not an afterthought.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Brain}
              title="Tier 1: Rule-Based Progression"
              description="Linear & double progression — hit your rep target, weight goes up. Miss it twice, automatic deload. Already beats 90% of free apps."
            />
            <FeatureCard
              icon={BarChart2}
              title="Tier 2: Percentage-Based Programming"
              description="1RM estimation (Epley/Brzycki), plate-rounding logic, program templates (5/3/1 style waves, linear blocks). Practical weights, not 72.3kg prescriptions."
            />
            <FeatureCard
              icon={Zap}
              title="Tier 3: RPE Autoregulation"
              description="Log RPE/RIR per set. Engine adjusts progression speed based on perceived effort trends. Auto-deload when fatigue signals accumulate. Same forecasting shape as time-series ML."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">How it works</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="01"
              title="Log your sets"
              description="Quick set entry with weight, reps, RPE. Warmup sets tracked separately. Works offline-first with PWA."
            />
            <StepCard
              number="02"
              title="Engine computes next session"
              description="After each workout, the progression engine updates your per-exercise state and calculates next session's target weight."
            />
            <StepCard
              number="03"
              title="See progress visually"
              description="Volume trends, estimated 1RM progression, top-set history. The charts that actually matter for strength."
            />
          </div>
        </div>
      </section>

      {/* Tech stack */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Built for engineers</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Isolated, testable progression engine. Self-hosted on your infra. Full ownership of your data.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-6 text-center">
            <TechItem name="Next.js 15" description="App Router, Server Components, PWA" />
            <TechItem name="Supabase" description="Postgres, Auth, Realtime, RLS" />
            <TechItem name="TypeScript" description="End-to-end type safety" />
            <TechItem name="Vitest" description="Engine unit tests (21 passing)" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Ready to train smarter?</h2>
            <p className="text-muted-foreground mb-8">
              Stop guessing what weight to put on the bar. Let your history decide.
            </p>
            {user ? (
              <Link href="/dashboard">
                <Button size="lg" className="gap-2">
                  Continue Training
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link href="/auth/signup">
                <Button size="lg" className="gap-2">
                  Start Free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      <footer className="py-8 border-t">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>Gym Tracker — Progressive Overload Coach. Portfolio project. Exercise data from hasaneyldrm/exercises-dataset (educational use).</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description }: { icon: React.ComponentType<{ className?: string }>, title: string, description: string }) {
  return (
    <div className="brutalist-card p-6">
      <div className="mb-4">
        <Icon className="h-10 w-10 text-primary" />
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

function StepCard({ number, title, description }: { number: string, title: string, description: string }) {
  return (
    <div className="brutalist-card p-6">
      <div className="text-4xl font-bold text-primary/20 mb-2">{number}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

function TechItem({ name, description }: { name: string, description: string }) {
  return (
    <div className="brutalist-card p-6">
      <h3 className="font-bold mb-1">{name}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}