# Gym Tracker — Progressive Overload Coach

A full-stack gym tracking app with a built-in **progression engine** that calculates your next session's target weight from your training history. Most trackers are logbooks. This one tells you what to lift next.

## What makes it different

The core idea is a deterministic progression engine that lives in [`src/engine/progression.ts`](src/engine/progression.ts). It's pure logic — no framework dependencies — and supports three tiers:

| Tier | Strategy | Description |
|------|----------|-------------|
| 1 | Linear / Double Progression | Hit your rep target → weight goes up. Miss it twice → auto-deload. |
| 2 | Percentage-Based | 1RM estimation (Epley/Brzycki), plate-rounding, program waves (5/3/1 style). |
| 3 | RPE Autoregulation | Log perceived effort per set. Engine adjusts progression speed from fatigue trends. |

Progression state (consecutive successes/failures, current target, estimated 1RM) is persisted per user/exercise so the engine has memory across sessions.

## Tech stack

- **Next.js 16** — App Router, Server Components, Server Actions
- **Supabase** — Postgres, Auth (JWT + refresh), Row-Level Security, SSR client
- **TypeScript** — end-to-end types shared between the engine, API, and UI
- **Tailwind CSS v4** — utility-first styling
- **Zustand** — client state for active workout sessions
- **React Hook Form + Zod** — type-safe form validation
- **Vitest** — unit tests for the progression engine (21 passing)

## Database schema

Seven tables with full RLS — users can only read/write their own data:

```
profiles            — user settings (unit system, experience level)
exercises           — seeded exercise library
routines            — workout templates
routine_exercises   — exercises in a routine + per-exercise progression config (JSONB)
workout_sessions    — individual training sessions
workout_sets        — logged sets (weight, reps, RPE, warmup flag)
progression_states  — engine memory: success/failure streaks, target weight, est. 1RM
```

Schema: [`supabase/schema.sql`](supabase/schema.sql)

## Project structure

```
src/
├── app/
│   ├── (auth)/          # login / signup routes
│   ├── (dashboard)/     # main app routes (dashboard, workout, history, stats)
│   └── api/             # route handlers
├── components/
│   ├── ui/              # base components (Button, Input, Card, …)
│   └── auth-provider.tsx
├── engine/
│   └── progression.ts   # pure progression logic — testable in isolation
├── lib/
│   ├── supabase.ts      # browser client
│   └── supabase-server.ts
└── types/
    ├── index.ts         # domain types + unit conversion helpers
    └── database.ts      # Supabase-generated DB types
```

## Getting started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier works)

### Setup

```bash
git clone https://github.com/KennyVWS/gym-tracker.git
cd gym-tracker
npm install
cp .env.example .env.local
```

Edit `.env.local` with your Supabase project URL and anon key (found in **Project Settings → API**).

Apply the database schema in the Supabase SQL editor:

```bash
# paste and run the contents of supabase/schema.sql in your Supabase dashboard
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Running tests

```bash
npm test          # watch mode
npm run test:run  # single run
```

## Self-hosting

Deploy to Vercel in one click — set the two environment variables and you're done. The app has no server infrastructure beyond Supabase (Postgres + Auth).

## License

MIT — see [LICENSE](LICENSE).

Exercise data attribution: [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) (educational use).
