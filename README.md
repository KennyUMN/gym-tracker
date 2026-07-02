# Progressive-Overload Gym Tracker

A gym tracker that **tells you what weight to lift next** based on your training history — not just a logbook, but a coach.

## The Core Differentiator

Most gym trackers (Strong, Hevy, Jefit free tier) are glorified spreadsheets: you log sets, they show history graphs. The hard part — deciding what weight to lift *next time* — is left to you.

**This project builds the progression engine as the core feature:**
- **Tier 1**: Rule-based linear/double progression (hit top of rep range → +weight, miss bottom 2× → deload 10%)
- **Tier 2**: Percentage-based / 1RM-driven programming (Epley/Brzycki formulas, plate-rounding logic)
- **Tier 3**: RPE/RIR autoregulation (adjust progression speed based on perceived effort trends)

## Tech Stack

- **Frontend**: Next.js 15 (App Router, Server Components, PWA)
- **Backend/DB**: Supabase (PostgreSQL, Auth, Realtime, Row Level Security)
- **Language**: TypeScript (end-to-end type safety)
- **Testing**: Vitest (21 unit tests on progression engine)
- **Styling**: Tailwind CSS (brutalist aesthetic — flat colors, solid 1px borders, no border-radius)
- **Forms**: React Hook Form + Zod validation
- **State**: Zustand + React Hook Form

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/          # Protected routes
│   │   ├── layout.tsx        # Sidebar + header
│   │   ├── page.tsx          # Dashboard with progression recommendations
│   │   ├── workout/page.tsx  # Live workout logging
│   │   ├── routines/page.tsx # Routine builder/manager
│   │   ├── history/page.tsx  # Workout history with expandable sessions
│   │   └── settings/page.tsx # Units, experience level, plate increments
│   ├── api/
│   │   ├── progression/      # Core engine: computes next-session weights
│   │   ├── sessions/         # Workout session CRUD
│   │   ├── sets/             # Set logging (POST/PATCH/DELETE)
│   │   ├── routines/         # Routine CRUD
│   │   └── exercises/        # Exercise search
│   ├── page.tsx              # Landing page
│   ├── layout.tsx            # Root layout + AuthProvider
│   └── globals.css           # Brutalist theme
├── components/
│   ├── auth-provider.tsx     # Supabase auth context
│   └── ui/                   # Button, Input, Card (brutalist style)
├── engine/
│   └── progression.ts        # ISOLATED, TESTABLE progression engine
├── lib/
│   ├── supabase.ts           # Browser client
│   ├── supabase-server.ts    # Server client
│   └── utils.ts              # Formatters, cn()
├── types/
│   ├── index.ts              # Domain types + ProgressionContext/State
│   └── database.ts           # Supabase generated types
└── supabase/
    ├── schema.sql            # Full DB schema with RLS
    └── migrations/           # Exercise seeding migration
scripts/
├── seed-exercises.ts         # Downloads & seeds 1,324 exercises
tests/
└── progression.test.ts       # 21 unit tests (all passing)
```

## Getting Started

### 1. Supabase Setup

**Option A: Local (requires Docker Desktop)**
```bash
supabase init
supabase start
# Copies local URL + keys to .env.local
```

**Option B: Hosted (recommended for quick start)**
1. Create project at [supabase.com](https://supabase.com)
2. Go to Settings → API → copy Project URL and anon key
3. Go to Settings → API → copy service_role secret (for seeding)
4. Run the SQL from `supabase/schema.sql` in Supabase SQL Editor

### 2. Configure Environment

```bash
cp .env.local.example .env.local
# Edit with your Supabase credentials
```

Required:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # for seeding
```

### 3. Install & Run

```bash
npm install
npm run dev
# http://localhost:3000
```

### 4. Seed Exercises (1,324 from hasaneyldrm/exercises-dataset)

```bash
npm run seed
# Downloads exercises.json from GitHub and upserts to your DB
```

## Database Schema

Key tables:
- `profiles` — user preferences (unit system, experience level, plate increments)
- `exercises` — 1,324 exercises with muscles, equipment, instructions
- `routines` + `routine_exercises` — workout templates with progression config per exercise
- `workout_sessions` — logged workouts
- `workout_sets` — individual sets with weight, reps, RPE
- `progression_states` — **the engine's memory**: per-user, per-exercise state (consecutive success/failure, current target weight, estimated 1RM)

All tables have **Row Level Security** policies enforcing user isolation.

## Progression Engine

The engine (`src/engine/progression.ts`) is a pure, isolated module with zero external dependencies:

```typescript
// Input
interface ProgressionContext {
  exerciseId: string
  exercise: Exercise
  recentSets: WorkoutSet[]      // last sessions' sets
  currentRule: ProgressionRule  // from routine_exercises
  userUnitSystem: 'metric' | 'imperial'
  plateIncrement: number
  lastRecommendedWeight?: number
}

// Output
interface ProgressionRecommendation {
  exercise_id: string
  recommended_weight_kg: number | null
  recommended_weight_lb: number | null
  target_reps_min: number
  target_reps_max: number
  reason: string
  confidence: 'high' | 'medium' | 'low'
  should_deload: boolean
  deload_percentage?: number
}
```

### Tier 1 — Double Progression (default)
- All working sets hit target rep range (e.g., 8–12) → +2.5kg / +5lb (rounded to plate increment)
- Any working set below minimum reps for 2 consecutive sessions → deload 10%

### Tier 3 — RPE Autoregulation
- Average RPE below target (e.g., < 7 when target is 8) → progress faster
- Average RPE trending above target for 2+ sessions → deload 15%

### Plate Rounding
- Metric: rounds to nearest 1.25kg (standard plate)
- Imperial: rounds to nearest 2.5lb

### 1RM Estimation
- Epley: `1RM = weight × (1 + reps/30)`
- Brzycki: `1RM = weight × 36/(37 - reps)`

## Testing

```bash
npm run test:run
# 21 tests covering:
# - Unit conversions
# - 1RM formulas (Epley, Brzycki)
# - Plate rounding
# - Double progression (progress, hold, deload)
# - RPE-based progression
# - Imperial units
```

## Deployment

### Vercel + Supabase (recommended)
1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy

### Self-hosted (your homelab)
```bash
npm run build
docker build -t gym-tracker .
docker run -d -p 3000:3000 --env-file .env.local gym-tracker
```
Or use Docker Compose with your existing Tailscale setup.

## License & Credits

- **Exercise data**: [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) (1,324 exercises, educational/non-commercial use only)
- **This project**: Portfolio/educational use only — not a commercial product

## Portfolio Talking Points

- **Isolated, testable progression engine** — 21 unit tests proving correct weight recommendations given specific history
- **1RM estimation + plate rounding** — "boring but correct" detail showing engineering maturity
- **RPE-trend autoregulation** — connects to time-series forecasting experience (same shape: trend signal → adjust next value)
- **Full-stack self-hosted** — Supabase + Next.js + Docker, consistent with "I build and ship full-stack software" narrative
- **RLS everywhere** — security-first architecture, not an afterthought