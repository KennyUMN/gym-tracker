# Gym Tracker Mobile App — M1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a real, installable Expo mobile app that lets a user create a routine, log a workout offline, and see a correct rule-based next-session weight suggestion — matching M1 of `docs/superpowers/specs/2026-07-02-mobile-app-m1-design.md`.

**Architecture:** Convert `gym-tracker` into a pnpm workspace monorepo (`apps/web`, `apps/mobile`, `packages/engine`). The progression engine becomes a shared, framework-agnostic package. The mobile app uses Expo Router, NativeWind, Supabase (same project as web), and an offline-first local SQLite layer with a sync queue that replays to Supabase on reconnect.

**Tech Stack:** pnpm workspaces · Next.js 16 (web, unchanged) · Expo (managed) + Expo Router + NativeWind (mobile) · Supabase (`@supabase/supabase-js`) · `expo-sqlite` · `@react-native-community/netinfo` · `@tanstack/react-query` · Vitest (engine) · Jest (`jest-expo`, mobile)

## Global Constraints

- pnpm version: `10.19.0` (already installed; pin via root `package.json` `packageManager` field)
- Package manager: pnpm workspaces only — no npm/yarn commands anywhere in the monorepo after Task 1
- Engine package (`packages/engine`) must have zero React/React Native/Next.js dependencies — pure TypeScript only, importable by both apps
- Conflict resolution for offline sync: last-write-wins (no merge UI, no vector clocks) — per spec §6
- No push notifications, no RPE/1RM UI, no AI chat — explicitly out of scope for M1 (spec §3)
- The routine builder (Task 7) is create-only for M1 — no edit-existing-routine screen. The design spec's screen table mentions `routines/[id]/edit`, but the spec's own exit criteria (§2) only requires *creating* a routine, not editing one; editing is a small follow-up once creation is verified end-to-end, not worth the duplicated form logic in M1
- Every task must leave `pnpm --filter web build` and `pnpm --filter web test:run` (or the mobile equivalents once they exist) green before moving to the next task

---

### Task 1: Convert to pnpm monorepo, move web app into `apps/web`

**Files:**
- Create: `pnpm-workspace.yaml`, `package.json` (root, replaces current)
- Modify: `.gitignore`
- Move (git mv): `src/`, `tests/`, `public/`, `eslint.config.mjs`, `next.config.ts`, `postcss.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `package.json` → `apps/web/package.json`, `.env.example` → all under `apps/web/`
- Move (plain mv): `scripts/`, `exercises-dataset.json`, `.env.local`, `.env.local.example` → all under `apps/web/`
- Delete: root `package-lock.json`, root `next-env.d.ts`, root `.next/`, root `node_modules/`

**Interfaces:**
- Produces: a working `apps/web` package (name `"web"` in its `package.json`) that builds and tests identically to the current app. All later tasks depend on this existing and being green.

- [ ] **Step 1: Move all web-app files into `apps/web/`**

```bash
cd /Users/kennyvws/gym-tracker
mkdir -p apps/web

git mv src apps/web/src
git mv tests apps/web/tests
git mv public apps/web/public
git mv eslint.config.mjs apps/web/eslint.config.mjs
git mv next.config.ts apps/web/next.config.ts
git mv postcss.config.mjs apps/web/postcss.config.mjs
git mv tsconfig.json apps/web/tsconfig.json
git mv vitest.config.ts apps/web/vitest.config.ts
git mv package.json apps/web/package.json
git mv .env.example apps/web/.env.example

mv scripts apps/web/scripts
mv exercises-dataset.json apps/web/exercises-dataset.json
mv .env.local apps/web/.env.local
mv .env.local.example apps/web/.env.local.example

git rm package-lock.json
rm -f next-env.d.ts
rm -rf .next node_modules
```

- [ ] **Step 2: Rename the moved package**

Edit `apps/web/package.json` — change only the `name` field:

```json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
```

(Leave every other field — `scripts`, `dependencies`, `devDependencies` — exactly as they are today.)

- [ ] **Step 3: Create the workspace manifest**

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 4: Create the new root `package.json`**

```json
{
  "name": "gym-tracker-monorepo",
  "private": true,
  "packageManager": "pnpm@10.19.0",
  "scripts": {
    "dev:web": "pnpm --filter web dev",
    "dev:mobile": "pnpm --filter mobile start",
    "build:web": "pnpm --filter web build",
    "test": "pnpm -r --if-present test:run"
  }
}
```

- [ ] **Step 5: Fix `.gitignore` for monorepo depth + ignore the exercise data dump**

The current file anchors patterns like `/node_modules` and `/.next/` to the repo root with a leading `/`, which will silently stop matching `apps/web/node_modules`, `apps/mobile/node_modules`, etc. Replace the whole file:

```
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# testing
coverage

# next.js
.next/
out/

# production
build/

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files (can opt-in for committing if needed)
.env*
!.env.example

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# data dumps (regenerate via scripts/seed-exercises.ts)
exercises-dataset.json
```

- [ ] **Step 6: Install and verify**

```bash
pnpm install
pnpm --filter web build
pnpm --filter web test:run
```

Expected: install succeeds and creates `pnpm-lock.yaml` at the root; build succeeds with the same route list as before (now just relocated); all 21 tests pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: convert repo to pnpm monorepo, move web app to apps/web"
```

---

### Task 2: Extract the progression engine into `packages/engine`

**Files:**
- Create: `packages/engine/package.json`, `packages/engine/tsconfig.json`, `packages/engine/vitest.config.ts`
- Create: `packages/engine/src/types.ts`, `packages/engine/src/math.ts`, `packages/engine/src/progression.ts`, `packages/engine/src/index.ts`
- Create: `packages/engine/tests/progression.test.ts`
- Modify: `apps/web/src/types/index.ts` (remove moved types/functions, re-export from `@gym-tracker/engine`)
- Delete: `apps/web/src/engine/progression.ts`, `apps/web/tests/progression.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks (only the current `apps/web/src/engine/progression.ts` and `apps/web/src/types/index.ts`, both being extracted from).
- Produces: `@gym-tracker/engine` package exporting `generateProgressionRecommendation(context: ProgressionContext, progressionState: ProgressionState | null): ProgressionRecommendation`, `getDefaultProgressionRule(type?: ProgressionRuleType): ProgressionRule`, `calculateProgressionState(recommendation, currentState, context): ProgressionState`, plus `Exercise`, `WorkoutSet`, `ProgressionRule`, `ProgressionRuleType`, `ProgressionContext`, `ProgressionState`, `ProgressionRecommendation` types and `kgToLb`, `lbToKg`, `roundToPlateIncrement`, `calculateEpley1RM`, `calculateBrzycki1RM`, `estimate1RM`, `KG_TO_LB`, `LB_TO_KG`. Task 4 onward (mobile app) imports this package directly; `apps/web` continues working unchanged via its re-exports.

- [ ] **Step 1: Scaffold the package**

Create `packages/engine/package.json`:

```json
{
  "name": "@gym-tracker/engine",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5",
    "vitest": "^4.1.9"
  }
}
```

Create `packages/engine/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

Create `packages/engine/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: true,
  },
})
```

- [ ] **Step 2: Write the extracted types**

Create `packages/engine/src/types.ts`:

```typescript
export interface Exercise {
  id: string
  name: string
  category: string
  primary_muscles: string[]
  secondary_muscles: string[]
  equipment: string[]
  force_type: 'push' | 'pull' | 'static' | 'legs'
  mechanic_type: 'compound' | 'isolation'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  instructions: string | null
  video_url: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface WorkoutSet {
  id: string
  session_id: string
  exercise_id: string
  exercise: Exercise
  set_number: number
  weight_kg: number | null
  weight_lb: number | null
  reps: number
  rpe: number | null
  is_warmup: boolean
  completed_at: string
  created_at: string
}

export type ProgressionRuleType =
  | 'linear'
  | 'double_progression'
  | 'rpe_based'
  | 'periodized'

export interface ProgressionRule {
  type: ProgressionRuleType
  weight_increment_kg: number
  weight_increment_lb: number
  rep_target_min: number
  rep_target_max: number
  deload_trigger_failed_sessions: number
  deload_percentage: number
  rpe_target?: number
  rpe_increment_threshold?: number
}

export interface ProgressionContext {
  exerciseId: string
  exercise: Exercise
  recentSets: WorkoutSet[]
  currentRule: ProgressionRule
  userUnitSystem: 'metric' | 'imperial'
  plateIncrement: number
  lastRecommendedWeight?: number
}

export interface ProgressionState {
  exerciseId: string
  consecutiveSuccessCount: number
  consecutiveFailureCount: number
  lastEstimated1RM: number | null
  currentTargetWeight: number | null
  lastUpdatedAt: string
}

export interface ProgressionRecommendation {
  exercise_id: string
  exercise_name: string
  recommended_weight_kg: number | null
  recommended_weight_lb: number | null
  target_reps_min: number
  target_reps_max: number
  reason: string
  confidence: 'high' | 'medium' | 'low'
  should_deload: boolean
  deload_percentage?: number
  suggested_rpe?: number
}
```

- [ ] **Step 3: Write the extracted math helpers**

Create `packages/engine/src/math.ts`:

```typescript
export const KG_TO_LB = 2.20462
export const LB_TO_KG = 0.453592

export function kgToLb(kg: number): number {
  return Math.round(kg * KG_TO_LB * 10) / 10
}

export function lbToKg(lb: number): number {
  return Math.round(lb * LB_TO_KG * 100) / 100
}

export function roundToPlateIncrement(weight: number, unit: 'kg' | 'lb'): number {
  const increment = unit === 'kg' ? 1.25 : 2.5
  return Math.round(weight / increment) * increment
}

export function calculateEpley1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight
  return Math.round(weight * (1 + reps / 30) * 10) / 10
}

export function calculateBrzycki1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight
  if (reps >= 37) return weight
  return Math.round(weight * 36 / (37 - reps) * 10) / 10
}

export function estimate1RM(weight: number, reps: number, method: 'epley' | 'brzycki' = 'epley'): number {
  return method === 'epley' ? calculateEpley1RM(weight, reps) : calculateBrzycki1RM(weight, reps)
}
```

- [ ] **Step 4: Move the engine logic, updating only its imports**

Create `packages/engine/src/progression.ts` with this exact content (identical logic to today's `apps/web/src/engine/progression.ts`, only the import block changes):

```typescript
import {
  ProgressionRule,
  ProgressionRuleType,
  ProgressionRecommendation,
  WorkoutSet,
  Exercise,
  ProgressionContext,
  ProgressionState,
} from './types'
import { calculateEpley1RM, roundToPlateIncrement } from './math'

function getWeightInKg(set: WorkoutSet): number {
  return set.weight_kg ?? (set.weight_lb ? set.weight_lb * 0.453592 : 0)
}

function getTopWorkingSets(sets: WorkoutSet[], count = 3): WorkoutSet[] {
  const workingSets = sets.filter(s => !s.is_warmup && s.weight_kg && s.weight_kg > 0)
  return workingSets
    .sort((a, b) => getWeightInKg(b) - getWeightInKg(a))
    .slice(0, count)
}

function calculateSessionVolume(sets: WorkoutSet[]): number {
  return sets
    .filter(s => !s.is_warmup)
    .reduce((sum, s) => sum + getWeightInKg(s) * s.reps, 0)
}

function calculateAverageRPE(sets: WorkoutSet[]): number | null {
  const rpeSets = sets.filter(s => s.rpe !== null && s.rpe !== undefined)
  if (rpeSets.length === 0) return null
  return rpeSets.reduce((sum, s) => sum + (s.rpe ?? 0), 0) / rpeSets.length
}

function didHitRepTarget(sets: WorkoutSet[], targetMin: number, targetMax: number): boolean {
  const workingSets = sets.filter(s => !s.is_warmup)
  if (workingSets.length === 0) return false
  return workingSets.every(s => s.reps >= targetMin && s.reps <= targetMax)
}

function didFailRepTarget(sets: WorkoutSet[], targetMin: number): boolean {
  const workingSets = sets.filter(s => !s.is_warmup)
  if (workingSets.length === 0) return false
  return workingSets.some(s => s.reps < targetMin)
}

export function generateProgressionRecommendation(
  context: ProgressionContext,
  progressionState: ProgressionState | null
): ProgressionRecommendation {
  const { exercise, recentSets, currentRule, userUnitSystem, plateIncrement, lastRecommendedWeight } = context
  const isMetric = userUnitSystem === 'metric'

  const latestSession = recentSets[0]
  const latestSessionSets = recentSets.filter(s => s.session_id === latestSession?.session_id)

  const topSets = getTopWorkingSets(latestSessionSets)
  const topSet = topSets[0]
  const topSetWeightKg = topSet ? getWeightInKg(topSet) : 0
  const topSetReps = topSet?.reps ?? 0

  const sessionVolume = calculateSessionVolume(latestSessionSets)
  const avgRPE = calculateAverageRPE(latestSessionSets)

  const hitTarget = didHitRepTarget(latestSessionSets, currentRule.rep_target_min, currentRule.rep_target_max)
  const failedTarget = didFailRepTarget(latestSessionSets, currentRule.rep_target_min)

  let newConsecutiveSuccess = progressionState?.consecutiveSuccessCount ?? 0
  let newConsecutiveFailure = progressionState?.consecutiveFailureCount ?? 0
  let recommendedWeightKg = progressionState?.currentTargetWeight ?? lastRecommendedWeight ?? topSetWeightKg
  let shouldDeload = false
  const deloadPercentage = currentRule.deload_percentage
  let reason = ''
  let confidence: 'high' | 'medium' | 'low' = 'medium'

  if (currentRule.type === 'linear' || currentRule.type === 'double_progression') {
    if (hitTarget) {
      newConsecutiveSuccess += 1
      newConsecutiveFailure = 0
      const incrementKg = isMetric
        ? currentRule.weight_increment_kg
        : currentRule.weight_increment_lb * 0.453592
      recommendedWeightKg = roundToPlateIncrement(
        recommendedWeightKg + incrementKg,
        isMetric ? 'kg' : 'lb'
      )
      reason = `All sets hit target rep range (${currentRule.rep_target_min}-${currentRule.rep_target_max}). Increasing weight.`
      confidence = 'high'
    } else if (failedTarget) {
      newConsecutiveFailure += 1
      newConsecutiveSuccess = 0

      if (newConsecutiveFailure >= currentRule.deload_trigger_failed_sessions) {
        shouldDeload = true
        recommendedWeightKg = roundToPlateIncrement(
          recommendedWeightKg * (1 - deloadPercentage / 100),
          isMetric ? 'kg' : 'lb'
        )
        reason = `Failed to hit minimum reps for ${currentRule.deload_trigger_failed_sessions} consecutive sessions. Deloading ${deloadPercentage}%.`
        confidence = 'high'
      } else {
        reason = `Did not hit minimum reps (${currentRule.rep_target_min}). Holding weight.`
        confidence = 'medium'
      }
    } else {
      newConsecutiveSuccess = 0
      newConsecutiveFailure = 0
      reason = 'Within target rep range. Holding weight.'
      confidence = 'medium'
    }
  } else if (currentRule.type === 'rpe_based' && avgRPE !== null) {
    const rpeTarget = currentRule.rpe_target ?? 8
    const incrementThreshold = currentRule.rpe_increment_threshold ?? 1

    if (avgRPE <= rpeTarget - incrementThreshold) {
      newConsecutiveSuccess += 1
      newConsecutiveFailure = 0
      const incrementKg = isMetric
        ? currentRule.weight_increment_kg
        : currentRule.weight_increment_lb * 0.453592
      recommendedWeightKg = roundToPlateIncrement(
        recommendedWeightKg + incrementKg,
        isMetric ? 'kg' : 'lb'
      )
      reason = `Average RPE ${avgRPE.toFixed(1)} is below target (${rpeTarget}). Progressing faster.`
      confidence = 'high'
    } else if (avgRPE > rpeTarget + incrementThreshold) {
      newConsecutiveFailure += 1
      newConsecutiveSuccess = 0

      if (newConsecutiveFailure >= currentRule.deload_trigger_failed_sessions) {
        shouldDeload = true
        recommendedWeightKg = roundToPlateIncrement(
          recommendedWeightKg * (1 - deloadPercentage / 100),
          isMetric ? 'kg' : 'lb'
        )
        reason = `Average RPE ${avgRPE.toFixed(1)} trending above target (${rpeTarget}) for ${currentRule.deload_trigger_failed_sessions} sessions. Deloading.`
        confidence = 'high'
      } else {
        reason = `Average RPE ${avgRPE.toFixed(1)} above target (${rpeTarget}). Holding weight.`
        confidence = 'medium'
      }
    } else {
      newConsecutiveSuccess = 0
      newConsecutiveFailure = 0
      reason = `Average RPE ${avgRPE.toFixed(1)} on target. Holding weight.`
      confidence = 'medium'
    }
  } else {
    reason = 'Insufficient data for progression decision. Holding current weight.'
    confidence = 'low'
  }

  return {
    exercise_id: exercise.id,
    exercise_name: exercise.name,
    recommended_weight_kg: recommendedWeightKg > 0 ? roundToPlateIncrement(recommendedWeightKg, isMetric ? 'kg' : 'lb') : null,
    recommended_weight_lb: recommendedWeightKg > 0 ? Math.round(recommendedWeightKg * 2.20462 * 10) / 10 : null,
    target_reps_min: currentRule.rep_target_min,
    target_reps_max: currentRule.rep_target_max,
    reason,
    confidence,
    should_deload: shouldDeload,
    deload_percentage: shouldDeload ? deloadPercentage : undefined,
    suggested_rpe: currentRule.rpe_target,
  }
}

export function getDefaultProgressionRule(type: ProgressionRuleType = 'double_progression'): ProgressionRule {
  switch (type) {
    case 'linear':
      return {
        type: 'linear',
        weight_increment_kg: 2.5,
        weight_increment_lb: 5,
        rep_target_min: 8,
        rep_target_max: 12,
        deload_trigger_failed_sessions: 2,
        deload_percentage: 10,
      }
    case 'double_progression':
      return {
        type: 'double_progression',
        weight_increment_kg: 2.5,
        weight_increment_lb: 5,
        rep_target_min: 8,
        rep_target_max: 12,
        deload_trigger_failed_sessions: 2,
        deload_percentage: 10,
      }
    case 'rpe_based':
      return {
        type: 'rpe_based',
        weight_increment_kg: 2.5,
        weight_increment_lb: 5,
        rep_target_min: 6,
        rep_target_max: 10,
        deload_trigger_failed_sessions: 2,
        deload_percentage: 15,
        rpe_target: 8,
        rpe_increment_threshold: 1,
      }
    case 'periodized':
      return {
        type: 'periodized',
        weight_increment_kg: 2.5,
        weight_increment_lb: 5,
        rep_target_min: 6,
        rep_target_max: 12,
        deload_trigger_failed_sessions: 3,
        deload_percentage: 20,
      }
    default:
      return getDefaultProgressionRule('double_progression')
  }
}

export function calculateProgressionState(
  recommendation: ProgressionRecommendation,
  currentState: ProgressionState | null,
  context: ProgressionContext
): ProgressionState {
  const { exercise, recentSets } = context
  const latestSession = recentSets.length > 0 ? recentSets[0] : null
  const latestSessionSets = latestSession
    ? recentSets.filter(s => s.session_id === latestSession.session_id)
    : []
  const topSets = getTopWorkingSets(latestSessionSets)
  const topSet = topSets[0]
  const topSetWeightKg = topSet ? getWeightInKg(topSet) : 0
  const topSetReps = topSet?.reps ?? 0
  const estimated1RM = topSetWeightKg > 0 && topSetReps > 0
    ? calculateEpley1RM(topSetWeightKg, topSetReps)
    : currentState?.lastEstimated1RM ?? null

  return {
    exerciseId: exercise.id,
    consecutiveSuccessCount: currentState?.consecutiveSuccessCount ?? 0,
    consecutiveFailureCount: currentState?.consecutiveFailureCount ?? 0,
    lastEstimated1RM: estimated1RM,
    currentTargetWeight: recommendation.recommended_weight_kg,
    lastUpdatedAt: new Date().toISOString(),
  }
}
```

Note: `newConsecutiveSuccess` / `newConsecutiveFailure` are computed but not read back into a return value in the original code either — this is carried over unchanged from the current implementation, not a new bug introduced by the move.

- [ ] **Step 5: Barrel export**

Create `packages/engine/src/index.ts`:

```typescript
export * from './types'
export * from './math'
export * from './progression'
```

- [ ] **Step 6: Move the test file, importing from the package**

Delete `apps/web/tests/progression.test.ts`. Create `packages/engine/tests/progression.test.ts` — identical test bodies to the current file, only the import block at the top changes:

```typescript
import { describe, it, expect } from 'vitest'
import {
  generateProgressionRecommendation,
  getDefaultProgressionRule,
  calculateProgressionState,
  calculateEpley1RM,
  calculateBrzycki1RM,
  roundToPlateIncrement,
  kgToLb,
  lbToKg,
  estimate1RM,
} from '../src/index'
import type {
  Exercise,
  WorkoutSet,
  ProgressionContext,
  ProgressionState,
} from '../src/index'

const mockExercise: Exercise = {
  id: 'ex-1',
  name: 'Bench Press',
  category: 'Chest',
  primary_muscles: ['pectorals'],
  secondary_muscles: ['triceps', 'deltoids'],
  equipment: ['barbell'],
  force_type: 'push',
  mechanic_type: 'compound',
  difficulty: 'intermediate',
  instructions: 'Lie on bench, lower bar to chest, press up.',
  video_url: null,
  image_url: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const createMockSet = (overrides: Partial<WorkoutSet> = {}): WorkoutSet => ({
  id: 'set-1',
  session_id: 'session-1',
  exercise_id: 'ex-1',
  exercise: mockExercise,
  set_number: 1,
  weight_kg: 80,
  weight_lb: null,
  reps: 10,
  rpe: 8,
  is_warmup: false,
  completed_at: '2024-01-01T10:00:00Z',
  created_at: '2024-01-01T10:00:00Z',
  ...overrides,
})

const createMockContext = (overrides: Partial<ProgressionContext> = {}): ProgressionContext => ({
  exerciseId: 'ex-1',
  exercise: mockExercise,
  recentSets: [],
  currentRule: getDefaultProgressionRule('double_progression'),
  userUnitSystem: 'metric',
  plateIncrement: 1.25,
  ...overrides,
})

describe('Unit Conversion', () => {
  it('converts kg to lb correctly', () => {
    expect(kgToLb(100)).toBe(220.5)
    expect(kgToLb(0)).toBe(0)
    expect(kgToLb(2.5)).toBe(5.5)
  })

  it('converts lb to kg correctly', () => {
    expect(lbToKg(220)).toBe(99.79)
    expect(lbToKg(0)).toBe(0)
    expect(lbToKg(5)).toBe(2.27)
  })
})

describe('1RM Calculations', () => {
  it('calculates Epley 1RM correctly', () => {
    expect(calculateEpley1RM(100, 10)).toBe(133.3)
    expect(calculateEpley1RM(80, 5)).toBe(93.3)
    expect(calculateEpley1RM(100, 1)).toBe(100)
    expect(calculateEpley1RM(0, 10)).toBe(0)
  })

  it('calculates Brzycki 1RM correctly', () => {
    expect(calculateBrzycki1RM(100, 10)).toBe(133.3)
    expect(calculateBrzycki1RM(80, 5)).toBe(90)
    expect(calculateBrzycki1RM(100, 1)).toBe(100)
    expect(calculateBrzycki1RM(100, 36)).toBe(3600)
  })

  it('estimates 1RM with specified method', () => {
    expect(estimate1RM(100, 10, 'epley')).toBe(133.3)
    expect(estimate1RM(100, 10, 'brzycki')).toBe(133.3)
  })
})

describe('Plate Rounding', () => {
  it('rounds to nearest 1.25kg increment for metric', () => {
    expect(roundToPlateIncrement(80.1, 'kg')).toBe(80)
    expect(roundToPlateIncrement(80.7, 'kg')).toBe(81.25)
    expect(roundToPlateIncrement(80.625, 'kg')).toBe(81.25)
    expect(roundToPlateIncrement(0, 'kg')).toBe(0)
  })

  it('rounds to nearest 2.5lb increment for imperial', () => {
    expect(roundToPlateIncrement(175, 'lb')).toBe(175)
    expect(roundToPlateIncrement(177, 'lb')).toBe(177.5)
    expect(roundToPlateIncrement(176.25, 'lb')).toBe(177.5)
    expect(roundToPlateIncrement(0, 'lb')).toBe(0)
  })
})

describe('Default Progression Rules', () => {
  it('returns correct linear progression rule', () => {
    const rule = getDefaultProgressionRule('linear')
    expect(rule.type).toBe('linear')
    expect(rule.weight_increment_kg).toBe(2.5)
    expect(rule.rep_target_min).toBe(8)
    expect(rule.rep_target_max).toBe(12)
    expect(rule.deload_trigger_failed_sessions).toBe(2)
    expect(rule.deload_percentage).toBe(10)
  })

  it('returns correct double progression rule', () => {
    const rule = getDefaultProgressionRule('double_progression')
    expect(rule.type).toBe('double_progression')
    expect(rule.weight_increment_kg).toBe(2.5)
    expect(rule.rep_target_min).toBe(8)
    expect(rule.rep_target_max).toBe(12)
  })

  it('returns correct RPE-based rule', () => {
    const rule = getDefaultProgressionRule('rpe_based')
    expect(rule.type).toBe('rpe_based')
    expect(rule.rpe_target).toBe(8)
    expect(rule.rpe_increment_threshold).toBe(1)
    expect(rule.deload_percentage).toBe(15)
  })

  it('returns correct periodized rule', () => {
    const rule = getDefaultProgressionRule('periodized')
    expect(rule.type).toBe('periodized')
    expect(rule.deload_percentage).toBe(20)
    expect(rule.deload_trigger_failed_sessions).toBe(3)
  })
})

describe('Progression Engine - Double Progression (Tier 1)', () => {
  it('progresses weight when all sets hit top of rep range', () => {
    const sets = [
      createMockSet({ set_number: 1, weight_kg: 80, reps: 12 }),
      createMockSet({ set_number: 2, weight_kg: 80, reps: 12 }),
      createMockSet({ set_number: 3, weight_kg: 80, reps: 12 }),
    ]

    const context = createMockContext({
      recentSets: sets,
      currentRule: getDefaultProgressionRule('double_progression'),
    })

    const state: ProgressionState = {
      exerciseId: 'ex-1',
      consecutiveSuccessCount: 0,
      consecutiveFailureCount: 0,
      lastEstimated1RM: null,
      currentTargetWeight: 80,
      lastUpdatedAt: new Date().toISOString(),
    }

    const recommendation = generateProgressionRecommendation(context, state)

    expect(recommendation.recommended_weight_kg).toBe(82.5)
    expect(recommendation.should_deload).toBe(false)
    expect(recommendation.confidence).toBe('high')
    expect(recommendation.reason).toContain('hit target rep range')
  })

  it('holds weight when reps are within range but not at top', () => {
    const sets = [
      createMockSet({ set_number: 1, weight_kg: 80, reps: 10 }),
      createMockSet({ set_number: 2, weight_kg: 80, reps: 9 }),
      createMockSet({ set_number: 3, weight_kg: 80, reps: 10 }),
    ]

    const context = createMockContext({
      recentSets: sets,
      currentRule: getDefaultProgressionRule('double_progression'),
    })

    const state: ProgressionState = {
      exerciseId: 'ex-1',
      consecutiveSuccessCount: 0,
      consecutiveFailureCount: 0,
      lastEstimated1RM: null,
      currentTargetWeight: 80,
      lastUpdatedAt: new Date().toISOString(),
    }

    const recommendation = generateProgressionRecommendation(context, state)

    expect(recommendation.recommended_weight_kg).toBe(82.5)
    expect(recommendation.should_deload).toBe(false)
    expect(recommendation.confidence).toBe('high')
    expect(recommendation.reason).toContain('hit target rep range')
  })

  it('deloads after consecutive failed sessions', () => {
    const sets = [
      createMockSet({ set_number: 1, weight_kg: 80, reps: 6 }),
      createMockSet({ set_number: 2, weight_kg: 80, reps: 5 }),
      createMockSet({ set_number: 3, weight_kg: 80, reps: 6 }),
    ]

    const context = createMockContext({
      recentSets: sets,
      currentRule: getDefaultProgressionRule('double_progression'),
    })

    const state: ProgressionState = {
      exerciseId: 'ex-1',
      consecutiveSuccessCount: 0,
      consecutiveFailureCount: 1,
      lastEstimated1RM: null,
      currentTargetWeight: 80,
      lastUpdatedAt: new Date().toISOString(),
    }

    const recommendation = generateProgressionRecommendation(context, state)

    expect(recommendation.should_deload).toBe(true)
    expect(recommendation.recommended_weight_kg).toBe(72.5)
    expect(recommendation.deload_percentage).toBe(10)
    expect(recommendation.confidence).toBe('high')
    expect(recommendation.reason).toContain('Deloading')
  })

  it('holds weight on first failed session (no deload yet)', () => {
    const sets = [
      createMockSet({ set_number: 1, weight_kg: 80, reps: 6 }),
      createMockSet({ set_number: 2, weight_kg: 80, reps: 5 }),
      createMockSet({ set_number: 3, weight_kg: 80, reps: 6 }),
    ]

    const context = createMockContext({
      recentSets: sets,
      currentRule: getDefaultProgressionRule('double_progression'),
    })

    const state: ProgressionState = {
      exerciseId: 'ex-1',
      consecutiveSuccessCount: 0,
      consecutiveFailureCount: 0,
      lastEstimated1RM: null,
      currentTargetWeight: 80,
      lastUpdatedAt: new Date().toISOString(),
    }

    const recommendation = generateProgressionRecommendation(context, state)

    expect(recommendation.should_deload).toBe(false)
    expect(recommendation.recommended_weight_kg).toBe(80)
    expect(recommendation.reason).toContain('Holding weight')
  })

  it('handles warmup sets correctly (ignores them)', () => {
    const sets = [
      createMockSet({ set_number: 1, weight_kg: 40, reps: 10, is_warmup: true }),
      createMockSet({ set_number: 2, weight_kg: 60, reps: 8, is_warmup: true }),
      createMockSet({ set_number: 3, weight_kg: 80, reps: 12, is_warmup: false }),
      createMockSet({ set_number: 4, weight_kg: 80, reps: 12, is_warmup: false }),
      createMockSet({ set_number: 5, weight_kg: 80, reps: 12, is_warmup: false }),
    ]

    const context = createMockContext({
      recentSets: sets,
      currentRule: getDefaultProgressionRule('double_progression'),
    })

    const state: ProgressionState = {
      exerciseId: 'ex-1',
      consecutiveSuccessCount: 0,
      consecutiveFailureCount: 0,
      lastEstimated1RM: null,
      currentTargetWeight: 80,
      lastUpdatedAt: new Date().toISOString(),
    }

    const recommendation = generateProgressionRecommendation(context, state)

    expect(recommendation.recommended_weight_kg).toBe(82.5)
    expect(recommendation.confidence).toBe('high')
  })
})

describe('Progression Engine - RPE-Based (Tier 3)', () => {
  it('progresses faster when RPE is below target', () => {
    const sets = [
      createMockSet({ set_number: 1, weight_kg: 80, reps: 10, rpe: 6 }),
      createMockSet({ set_number: 2, weight_kg: 80, reps: 10, rpe: 6 }),
      createMockSet({ set_number: 3, weight_kg: 80, reps: 10, rpe: 6 }),
    ]

    const context = createMockContext({
      recentSets: sets,
      currentRule: getDefaultProgressionRule('rpe_based'),
    })

    const state: ProgressionState = {
      exerciseId: 'ex-1',
      consecutiveSuccessCount: 0,
      consecutiveFailureCount: 0,
      lastEstimated1RM: null,
      currentTargetWeight: 80,
      lastUpdatedAt: new Date().toISOString(),
    }

    const recommendation = generateProgressionRecommendation(context, state)

    expect(recommendation.recommended_weight_kg).toBe(82.5)
    expect(recommendation.confidence).toBe('high')
    expect(recommendation.reason).toContain('below target')
  })

  it('holds weight when RPE is on target', () => {
    const sets = [
      createMockSet({ set_number: 1, weight_kg: 80, reps: 8, rpe: 8 }),
      createMockSet({ set_number: 2, weight_kg: 80, reps: 8, rpe: 8 }),
      createMockSet({ set_number: 3, weight_kg: 80, reps: 8, rpe: 8 }),
    ]

    const context = createMockContext({
      recentSets: sets,
      currentRule: getDefaultProgressionRule('rpe_based'),
    })

    const state: ProgressionState = {
      exerciseId: 'ex-1',
      consecutiveSuccessCount: 0,
      consecutiveFailureCount: 0,
      lastEstimated1RM: null,
      currentTargetWeight: 80,
      lastUpdatedAt: new Date().toISOString(),
    }

    const recommendation = generateProgressionRecommendation(context, state)

    expect(recommendation.recommended_weight_kg).toBe(80)
    expect(recommendation.confidence).toBe('medium')
    expect(recommendation.reason).toContain('on target')
  })

  it('deloads when RPE trends above target for multiple sessions', () => {
    const sets = [
      createMockSet({ set_number: 1, weight_kg: 80, reps: 6, rpe: 10 }),
      createMockSet({ set_number: 2, weight_kg: 80, reps: 5, rpe: 10 }),
      createMockSet({ set_number: 3, weight_kg: 80, reps: 6, rpe: 10 }),
    ]

    const context = createMockContext({
      recentSets: sets,
      currentRule: getDefaultProgressionRule('rpe_based'),
    })

    const state: ProgressionState = {
      exerciseId: 'ex-1',
      consecutiveSuccessCount: 0,
      consecutiveFailureCount: 1,
      lastEstimated1RM: null,
      currentTargetWeight: 80,
      lastUpdatedAt: new Date().toISOString(),
    }

    const recommendation = generateProgressionRecommendation(context, state)

    expect(recommendation.should_deload).toBe(true)
    expect(recommendation.deload_percentage).toBe(15)
    expect(recommendation.recommended_weight_kg).toBe(67.5)
  })
})

describe('Progression State Calculation', () => {
  it('updates progression state correctly after recommendation', () => {
    const sets = [
      createMockSet({ set_number: 1, weight_kg: 80, reps: 12 }),
      createMockSet({ set_number: 2, weight_kg: 80, reps: 12 }),
      createMockSet({ set_number: 3, weight_kg: 80, reps: 12 }),
    ]

    const context = createMockContext({
      recentSets: sets,
      currentRule: getDefaultProgressionRule('double_progression'),
    })

    const currentState: ProgressionState = {
      exerciseId: 'ex-1',
      consecutiveSuccessCount: 0,
      consecutiveFailureCount: 0,
      lastEstimated1RM: null,
      currentTargetWeight: 80,
      lastUpdatedAt: new Date().toISOString(),
    }

    const recommendation = generateProgressionRecommendation(context, currentState)
    const newState = calculateProgressionState(recommendation, currentState, context)

    expect(newState.currentTargetWeight).toBe(82.5)
    expect(newState.lastEstimated1RM).toBeGreaterThan(0)
    expect(newState.exerciseId).toBe('ex-1')
  })
})

describe('Imperial Units', () => {
  it('recommends weight in lbs when user unit system is imperial', () => {
    const sets = [
      createMockSet({ set_number: 1, weight_kg: 80, reps: 12 }),
      createMockSet({ set_number: 2, weight_kg: 80, reps: 12 }),
      createMockSet({ set_number: 3, weight_kg: 80, reps: 12 }),
    ]

    const context = createMockContext({
      recentSets: sets,
      currentRule: getDefaultProgressionRule('double_progression'),
      userUnitSystem: 'imperial',
      plateIncrement: 2.5,
    })

    const state: ProgressionState = {
      exerciseId: 'ex-1',
      consecutiveSuccessCount: 0,
      consecutiveFailureCount: 0,
      lastEstimated1RM: null,
      currentTargetWeight: 80,
      lastUpdatedAt: new Date().toISOString(),
    }

    const recommendation = generateProgressionRecommendation(context, state)

    expect(recommendation.recommended_weight_lb).toBeGreaterThan(0)
    expect(recommendation.recommended_weight_lb).toBe(181.9)
  })
})
```

- [ ] **Step 7: Delete the now-duplicated engine from `apps/web`**

```bash
rm -rf apps/web/src/engine
```

- [ ] **Step 8: Update `apps/web/src/types/index.ts`**

Replace the file's contents entirely with:

```typescript
export interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  user_id: string
  display_name: string | null
  unit_system: 'metric' | 'imperial'
  experience_level: 'beginner' | 'intermediate' | 'advanced'
  plate_increment_kg: number
  plate_increment_lb: number
  created_at: string
  updated_at: string
}

export type {
  Exercise,
  WorkoutSet,
  ProgressionRuleType,
  ProgressionRule,
  ProgressionContext,
  ProgressionState,
  ProgressionRecommendation,
} from '@gym-tracker/engine'

export {
  kgToLb,
  lbToKg,
  roundToPlateIncrement,
  calculateEpley1RM,
  calculateBrzycki1RM,
  estimate1RM,
  KG_TO_LB,
  LB_TO_KG,
} from '@gym-tracker/engine'

import type { Exercise, WorkoutSet, ProgressionRule } from '@gym-tracker/engine'

export interface Routine {
  id: string
  user_id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RoutineExercise {
  id: string
  routine_id: string
  exercise_id: string
  exercise: Exercise
  order_index: number
  target_sets: number
  target_reps_min: number
  target_reps_max: number
  rest_seconds: number
  progression_rule: ProgressionRule
  created_at: string
  updated_at: string
}

export interface WorkoutSession {
  id: string
  user_id: string
  routine_id: string | null
  name: string | null
  started_at: string
  completed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ExerciseLog {
  exercise_id: string
  exercise: Exercise
  sets: WorkoutSet[]
  previous_session_volume_kg: number
  previous_session_top_set_weight_kg: number | null
  previous_session_top_set_reps: number | null
}

export interface WorkoutSessionWithSets extends WorkoutSession {
  sets: WorkoutSet[]
}

export interface VolumeMetrics {
  exercise_id: string
  exercise_name: string
  total_volume_kg: number
  total_sets: number
  total_reps: number
  top_set_weight_kg: number | null
  top_set_reps: number | null
  estimated_1rm_kg: number | null
  sessions_count: number
}

export interface VolumeTrend {
  exercise_id: string
  exercise_name: string
  data_points: {
    date: string
    volume_kg: number
    top_set_weight_kg: number | null
    estimated_1rm_kg: number | null
  }[]
}

export interface UnitSystem {
  system: 'metric' | 'imperial'
  weight_unit: 'kg' | 'lb'
  distance_unit: 'm' | 'ft'
}

export const UNIT_SYSTEMS: Record<UnitSystem['system'], UnitSystem> = {
  metric: { system: 'metric', weight_unit: 'kg', distance_unit: 'm' },
  imperial: { system: 'imperial', weight_unit: 'lb', distance_unit: 'ft' },
}
```

- [ ] **Step 9: Add the engine as a workspace dependency of `apps/web`**

Edit `apps/web/package.json` — add to `dependencies`:

```json
"@gym-tracker/engine": "workspace:*",
```

- [ ] **Step 10: Install and verify**

```bash
pnpm install
pnpm --filter engine test:run
pnpm --filter web build
pnpm --filter web test:run
```

Expected: `@gym-tracker/engine` shows 21 passing tests; `apps/web` builds with no type errors (the `api/progression/route.ts` and `auth-provider.tsx` imports from `@/types` still resolve because of the re-exports); `apps/web`'s own `test:run` now reports 0 test files (its only test moved) — this is expected, not a failure.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "refactor: extract progression engine into @gym-tracker/engine package"
```

---

### Task 3: Scaffold the Expo app with Router, NativeWind, and Jest

**Files:**
- Create: `apps/mobile/` (via `create-expo-app`), then modify its generated `app/`, `babel.config.js`, `metro.config.js`, `tailwind.config.js`, `global.css`, `tsconfig.json`, `package.json`
- Create: root `.npmrc`

**Interfaces:**
- Produces: a runnable Expo app at `apps/mobile` with file-based routing (`app/`), Tailwind styling via NativeWind, and Jest configured. Task 4 onward adds screens under `apps/mobile/app/`.

- [ ] **Step 1: pnpm + Metro compatibility setting**

Metro's bundler resolver doesn't fully support pnpm's strict symlink `node_modules` layout without hoisting — this is Expo's own documented workaround for pnpm monorepos. Create `.npmrc` at the repo root:

```
node-linker=hoisted
```

```bash
pnpm install
```

- [ ] **Step 2: Scaffold the Expo project**

```bash
cd /Users/kennyvws/gym-tracker
npx create-expo-app@latest apps/mobile --no-install
```

This generates a TypeScript project with Expo Router already wired up (default template, current as of SDK 50+), including an example tab layout we'll replace.

- [ ] **Step 3: Rename the package for pnpm filtering**

Edit `apps/mobile/package.json` — ensure the `name` field reads:

```json
{
  "name": "mobile",
```

- [ ] **Step 4: Remove the example scaffold content, keep the app shell**

```bash
cd apps/mobile
rm -rf app/(tabs) components/HelloWave.tsx components/ParallaxScrollView.tsx components/ThemedText.tsx components/ThemedView.tsx components/Collapsible.tsx app-example
```

Replace `app/_layout.tsx` with a minimal root layout:

```typescript
import { Stack } from 'expo-router'
import './global.css'

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
```

Create a placeholder `app/index.tsx` (Task 4 replaces this with the real auth-gated redirect):

```typescript
import { View, Text } from 'react-native'

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-bold">Gym Tracker</Text>
    </View>
  )
}
```

- [ ] **Step 5: Install NativeWind**

```bash
cd /Users/kennyvws/gym-tracker
pnpm --filter mobile exec -- npx expo install nativewind tailwindcss react-native-reanimated react-native-safe-area-context
```

Create `apps/mobile/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Create `apps/mobile/global.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Replace `apps/mobile/babel.config.js`:

```javascript
module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  }
}
```

Replace `apps/mobile/metro.config.js`:

```javascript
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

module.exports = withNativeWind(config, { input: './global.css' })
```

Append to `apps/mobile/tsconfig.json` `compilerOptions` (create the file with this shape if the generated one differs):

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", "nativewind-env.d.ts"]
}
```

Create `apps/mobile/nativewind-env.d.ts`:

```typescript
/// <reference types="nativewind/types" />
```

- [ ] **Step 6: Install Jest**

```bash
pnpm --filter mobile exec -- npx expo install jest-expo jest @types/jest react-test-renderer --save-dev
```

Edit `apps/mobile/package.json` — add a `test` script and `jest` config block:

```json
"scripts": {
  "test": "jest",
  "test:run": "jest --ci"
},
"jest": {
  "preset": "jest-expo"
}
```

- [ ] **Step 7: Add the engine as a dependency and verify the app boots**

Edit `apps/mobile/package.json` — add to `dependencies`:

```json
"@gym-tracker/engine": "workspace:*",
```

```bash
cd /Users/kennyvws/gym-tracker
pnpm install
pnpm --filter mobile exec -- npx tsc --noEmit
```

Expected: no type errors. Then manually verify the app boots:

```bash
pnpm --filter mobile start
```

Expected: Metro bundler starts; scanning the QR code with Expo Go on a physical device (or pressing `a` for an Android emulator) shows the "Gym Tracker" placeholder screen with no red-screen errors.

- [ ] **Step 8: Commit**

```bash
cd /Users/kennyvws/gym-tracker
git add -A
git commit -m "feat(mobile): scaffold Expo app with Router, NativeWind, and Jest"
```

---

### Task 4: Supabase client, auth context, and login/signup screens

**Files:**
- Create: `apps/mobile/.env`, `apps/mobile/.env.example`
- Create: `apps/mobile/src/lib/supabase.ts`
- Create: `apps/mobile/src/auth/AuthProvider.tsx`
- Create: `apps/mobile/app/(auth)/login.tsx`, `apps/mobile/app/(auth)/signup.tsx`
- Create: `apps/mobile/app/(app)/_layout.tsx`, `apps/mobile/app/(app)/index.tsx`
- Modify: `apps/mobile/app/_layout.tsx`, `apps/mobile/app/index.tsx`

**Interfaces:**
- Consumes: nothing from prior tasks besides the Expo shell from Task 3.
- Produces: `useAuth()` hook exporting `{ user, session, profile, loading, signOut }`, used by every screen added in Tasks 7–10 to gate access and read the current user's id.

- [ ] **Step 1: Install auth dependencies**

```bash
cd /Users/kennyvws/gym-tracker
pnpm --filter mobile exec -- npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
```

- [ ] **Step 2: Env vars**

Create `apps/mobile/.env.example`:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Create `apps/mobile/.env` — use the same values as `apps/web/.env.local` so the mobile app hits the same Supabase project:

```
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

(Replace with your actual Supabase project URL/anon key — same values as `apps/web/.env.local`. This file is gitignored by the root `.gitignore`'s `.env*` rule.)

- [ ] **Step 3: Supabase client**

Create `apps/mobile/src/lib/supabase.ts`:

```typescript
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

- [ ] **Step 4: Auth context**

Create `apps/mobile/src/auth/AuthProvider.tsx` — mirrors `apps/web/src/components/auth-provider.tsx`'s shape, using the mobile Supabase client:

```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface Profile {
  id: string
  display_name: string | null
  unit_system: 'metric' | 'imperial'
  experience_level: 'beginner' | 'intermediate' | 'advanced'
  plate_increment_kg: number
  plate_increment_lb: number
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) setProfile(data)
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id)
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

- [ ] **Step 5: Root layout wires the provider and redirects by auth state**

Replace `apps/mobile/app/_layout.tsx`:

```typescript
import { Stack } from 'expo-router'
import { AuthProvider } from '@/auth/AuthProvider'
import './global.css'

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  )
}
```

Replace `apps/mobile/app/index.tsx`:

```typescript
import { Redirect } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { useAuth } from '@/auth/AuthProvider'

export default function Index() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return <Redirect href={user ? '/(app)' : '/(auth)/login'} />
}
```

- [ ] **Step 6: Login screen**

Create `apps/mobile/app/(auth)/login.tsx`:

```typescript
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
```

- [ ] **Step 7: Signup screen**

Create `apps/mobile/app/(auth)/signup.tsx`:

```typescript
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
```

- [ ] **Step 8: Protected layout and a minimal home screen**

Create `apps/mobile/app/(app)/_layout.tsx` — redirects to login if there's no session, otherwise renders the protected stack:

```typescript
import { Redirect, Stack } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { useAuth } from '@/auth/AuthProvider'

export default function AppLayout() {
  const { user, loading } = useAuth()

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
```

Create `apps/mobile/app/(app)/index.tsx` — a minimal home screen proving the protected route works; Task 7 links routines/exercises from here:

```typescript
import { View, Text, Pressable } from 'react-native'
import { useAuth } from '@/auth/AuthProvider'

export default function Home() {
  const { user, profile, signOut } = useAuth()

  return (
    <View className="flex-1 px-6 pt-16 bg-white">
      <Text className="text-2xl font-bold mb-1">
        Welcome back, {profile?.display_name || user?.email?.split('@')[0]}
      </Text>
      <Text className="text-gray-500 mb-8">Pick a routine and start your session.</Text>

      <Pressable className="h-11 rounded-lg border border-gray-300 items-center justify-center" onPress={signOut}>
        <Text className="font-medium">Sign Out</Text>
      </Pressable>
    </View>
  )
}
```

- [ ] **Step 9: Manual verification**

```bash
cd /Users/kennyvws/gym-tracker
pnpm --filter mobile exec -- npx tsc --noEmit
pnpm --filter mobile start
```

On a physical device via Expo Go (or an emulator): the app opens to the login screen, "Get started free" navigates to signup, creating an account with a fresh email either lands on the home screen (if your Supabase project has email confirmation disabled) or shows the "check your email" message. Signing in with valid credentials lands on the home screen showing "Welcome back, …". Tapping "Sign Out" returns to the login screen. Force-quit and reopen the app while signed in — it should land directly on the home screen (session persisted via AsyncStorage), not the login screen.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(mobile): add Supabase auth, login/signup screens, protected layout"
```

---

### Task 5: Local SQLite schema, db client, and sync queue logic

**Files:**
- Create: `apps/mobile/src/db/schema.ts`, `apps/mobile/src/db/client.ts`, `apps/mobile/src/db/client.test.ts`
- Create: `apps/mobile/src/db/localWrite.ts`
- Create: `apps/mobile/src/sync/queue.ts`, `apps/mobile/src/sync/queue.test.ts`

**Interfaces:**
- Consumes: nothing new from prior tasks.
- Produces: `getDb(): Promise<SQLite.SQLiteDatabase>`, `writeLocalAndQueue(userId, entityType, entityId, operation, payload): Promise<void>`, and the pure `createSyncQueueEntry`, `buildSupabaseMutation`, `sortQueueByCreatedAt`, `partitionSyncQueue` functions. Task 6 (sync engine) consumes the queue functions; Tasks 7–9 consume `writeLocalAndQueue` and `getDb` for their own table-specific read/write helpers.

- [ ] **Step 1: Install SQLite and a UUID source**

```bash
cd /Users/kennyvws/gym-tracker
pnpm --filter mobile exec -- npx expo install expo-sqlite expo-crypto
```

- [ ] **Step 2: Local schema**

Create `apps/mobile/src/db/schema.ts`:

```typescript
export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS routines (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS routine_exercises (
    id TEXT PRIMARY KEY,
    routine_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    target_sets INTEGER NOT NULL,
    target_reps_min INTEGER NOT NULL,
    target_reps_max INTEGER NOT NULL,
    rest_seconds INTEGER NOT NULL,
    progression_rule_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS workout_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    routine_id TEXT,
    name TEXT,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS workout_sets (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    set_number INTEGER NOT NULL,
    weight_kg REAL,
    weight_lb REAL,
    reps INTEGER NOT NULL,
    rpe INTEGER,
    is_warmup INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS exercises_cache (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    primary_muscles_json TEXT NOT NULL,
    secondary_muscles_json TEXT NOT NULL,
    equipment_json TEXT NOT NULL,
    force_type TEXT,
    mechanic_type TEXT,
    difficulty TEXT,
    image_url TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
]
```

- [ ] **Step 3: Write the failing test for schema application**

Create `apps/mobile/src/db/client.test.ts`:

```typescript
import { initSchema } from './client'
import { SCHEMA_STATEMENTS } from './schema'

describe('initSchema', () => {
  it('executes every schema statement against the provided db handle', async () => {
    const execAsync = jest.fn().mockResolvedValue(undefined)
    await initSchema({ execAsync })

    expect(execAsync).toHaveBeenCalledTimes(SCHEMA_STATEMENTS.length)
    SCHEMA_STATEMENTS.forEach((statement, index) => {
      expect(execAsync).toHaveBeenNthCalledWith(index + 1, statement)
    })
  })
})
```

- [ ] **Step 4: Run it to confirm it fails**

```bash
pnpm --filter mobile test -- client.test.ts
```

Expected: FAIL — `./client` has no exported member `initSchema` yet.

- [ ] **Step 5: Implement the db client**

Create `apps/mobile/src/db/client.ts`:

```typescript
import * as SQLite from 'expo-sqlite'
import { SCHEMA_STATEMENTS } from './schema'

let dbInstance: SQLite.SQLiteDatabase | null = null

export async function initSchema(db: { execAsync: (sql: string) => Promise<unknown> }): Promise<void> {
  for (const statement of SCHEMA_STATEMENTS) {
    await db.execAsync(statement)
  }
}

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance
  const db = await SQLite.openDatabaseAsync('gymtracker.db')
  await initSchema(db)
  dbInstance = db
  return dbInstance
}
```

- [ ] **Step 6: Run it to confirm it passes**

```bash
pnpm --filter mobile test -- client.test.ts
```

Expected: PASS.

- [ ] **Step 7: Write the failing tests for sync queue logic**

Create `apps/mobile/src/sync/queue.test.ts`:

```typescript
import {
  createSyncQueueEntry,
  buildSupabaseMutation,
  sortQueueByCreatedAt,
  partitionSyncQueue,
  SyncQueueEntry,
} from './queue'

describe('createSyncQueueEntry', () => {
  it('builds an unsynced entry with the given fields', () => {
    const entry = createSyncQueueEntry(
      'queue-1',
      'user-1',
      'workout_set',
      'set-1',
      'insert',
      { reps: 10 },
      '2026-01-01T00:00:00.000Z'
    )

    expect(entry).toEqual({
      id: 'queue-1',
      user_id: 'user-1',
      entity_type: 'workout_set',
      entity_id: 'set-1',
      operation: 'insert',
      payload: { reps: 10 },
      synced: false,
      created_at: '2026-01-01T00:00:00.000Z',
    })
  })
})

describe('buildSupabaseMutation', () => {
  it('maps each entity type to its Supabase table name', () => {
    const cases: Array<[SyncQueueEntry['entity_type'], string]> = [
      ['routine', 'routines'],
      ['routine_exercise', 'routine_exercises'],
      ['workout_session', 'workout_sessions'],
      ['workout_set', 'workout_sets'],
    ]

    for (const [entityType, expectedTable] of cases) {
      const entry = createSyncQueueEntry('q', 'u', entityType, 'e', 'insert', {}, '2026-01-01T00:00:00.000Z')
      expect(buildSupabaseMutation(entry).table).toBe(expectedTable)
    }
  })

  it('carries through operation, entity id, and payload', () => {
    const entry = createSyncQueueEntry(
      'q',
      'u',
      'workout_set',
      'set-1',
      'update',
      { reps: 12 },
      '2026-01-01T00:00:00.000Z'
    )
    expect(buildSupabaseMutation(entry)).toEqual({
      table: 'workout_sets',
      operation: 'update',
      entityId: 'set-1',
      payload: { reps: 12 },
    })
  })
})

describe('sortQueueByCreatedAt', () => {
  it('orders entries oldest first without mutating the input array', () => {
    const entries: SyncQueueEntry[] = [
      createSyncQueueEntry('q2', 'u', 'workout_set', 'e2', 'insert', {}, '2026-01-02T00:00:00.000Z'),
      createSyncQueueEntry('q1', 'u', 'workout_set', 'e1', 'insert', {}, '2026-01-01T00:00:00.000Z'),
    ]
    const sorted = sortQueueByCreatedAt(entries)

    expect(sorted.map(e => e.id)).toEqual(['q1', 'q2'])
    expect(entries.map(e => e.id)).toEqual(['q2', 'q1'])
  })
})

describe('partitionSyncQueue', () => {
  it('splits entries into pending and synced', () => {
    const pendingEntry = createSyncQueueEntry('q1', 'u', 'workout_set', 'e1', 'insert', {}, '2026-01-01T00:00:00.000Z')
    const syncedEntry = { ...createSyncQueueEntry('q2', 'u', 'workout_set', 'e2', 'insert', {}, '2026-01-01T00:00:00.000Z'), synced: true }

    const result = partitionSyncQueue([pendingEntry, syncedEntry])

    expect(result.pending.map(e => e.id)).toEqual(['q1'])
    expect(result.synced.map(e => e.id)).toEqual(['q2'])
  })
})
```

- [ ] **Step 8: Run it to confirm it fails**

```bash
pnpm --filter mobile test -- queue.test.ts
```

Expected: FAIL — `./queue` does not exist yet.

- [ ] **Step 9: Implement the sync queue logic**

Create `apps/mobile/src/sync/queue.ts`:

```typescript
export type SyncEntityType = 'routine' | 'routine_exercise' | 'workout_session' | 'workout_set'
export type SyncOperation = 'insert' | 'update' | 'delete'

export interface SyncQueueEntry {
  id: string
  user_id: string
  entity_type: SyncEntityType
  entity_id: string
  operation: SyncOperation
  payload: Record<string, unknown>
  synced: boolean
  created_at: string
}

export function createSyncQueueEntry(
  id: string,
  userId: string,
  entityType: SyncEntityType,
  entityId: string,
  operation: SyncOperation,
  payload: Record<string, unknown>,
  createdAt: string
): SyncQueueEntry {
  return {
    id,
    user_id: userId,
    entity_type: entityType,
    entity_id: entityId,
    operation,
    payload,
    synced: false,
    created_at: createdAt,
  }
}

const ENTITY_TABLE: Record<SyncEntityType, string> = {
  routine: 'routines',
  routine_exercise: 'routine_exercises',
  workout_session: 'workout_sessions',
  workout_set: 'workout_sets',
}

export interface SupabaseMutation {
  table: string
  operation: SyncOperation
  entityId: string
  payload: Record<string, unknown>
}

export function buildSupabaseMutation(entry: SyncQueueEntry): SupabaseMutation {
  return {
    table: ENTITY_TABLE[entry.entity_type],
    operation: entry.operation,
    entityId: entry.entity_id,
    payload: entry.payload,
  }
}

export function sortQueueByCreatedAt(entries: SyncQueueEntry[]): SyncQueueEntry[] {
  return [...entries].sort((a, b) => a.created_at.localeCompare(b.created_at))
}

export function partitionSyncQueue(entries: SyncQueueEntry[]): { pending: SyncQueueEntry[]; synced: SyncQueueEntry[] } {
  return {
    pending: entries.filter(e => !e.synced),
    synced: entries.filter(e => e.synced),
  }
}
```

- [ ] **Step 10: Run it to confirm it passes**

```bash
pnpm --filter mobile test -- queue.test.ts
```

Expected: PASS — 5 tests.

- [ ] **Step 11: Generic write-through-then-queue helper**

Create `apps/mobile/src/db/localWrite.ts`:

```typescript
import * as Crypto from 'expo-crypto'
import { getDb } from './client'
import { createSyncQueueEntry, SyncEntityType, SyncOperation } from '@/sync/queue'

export async function writeLocalAndQueue(
  userId: string,
  entityType: SyncEntityType,
  entityId: string,
  operation: SyncOperation,
  payload: Record<string, unknown>
): Promise<void> {
  const db = await getDb()
  const entry = createSyncQueueEntry(
    Crypto.randomUUID(),
    userId,
    entityType,
    entityId,
    operation,
    payload,
    new Date().toISOString()
  )

  await db.runAsync(
    `INSERT INTO sync_queue (id, user_id, entity_type, entity_id, operation, payload_json, synced, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    [entry.id, entry.user_id, entry.entity_type, entry.entity_id, entry.operation, JSON.stringify(entry.payload), entry.created_at]
  )
}
```

- [ ] **Step 12: Verify and commit**

```bash
cd /Users/kennyvws/gym-tracker
pnpm --filter mobile exec -- npx tsc --noEmit
pnpm --filter mobile test:run
git add -A
git commit -m "feat(mobile): add local SQLite schema, db client, and sync queue logic"
```

Expected: typecheck clean, all mobile tests pass (6 tests: 1 in `client.test.ts` + 5 in `queue.test.ts`).

---

### Task 6: Sync engine — replay the queue to Supabase on reconnect

**Files:**
- Create: `apps/mobile/src/sync/engine.ts`, `apps/mobile/src/sync/engine.test.ts`
- Create: `apps/mobile/src/sync/useSyncOnReconnect.ts`
- Modify: `apps/mobile/app/(app)/_layout.tsx`

**Interfaces:**
- Consumes: `SyncQueueEntry`, `sortQueueByCreatedAt`, `buildSupabaseMutation` from Task 5's `@/sync/queue`; `getDb` from `@/db/client`; `supabase` from `@/lib/supabase`.
- Produces: `replaySyncQueue(userId, db, supabaseClient): Promise<{synced: number; failed: number}>` and the `useSyncOnReconnect(userId)` hook, used by the protected layout so every screen benefits from background sync.

- [ ] **Step 1: Install NetInfo**

```bash
cd /Users/kennyvws/gym-tracker
pnpm --filter mobile exec -- npx expo install @react-native-community/netinfo
```

- [ ] **Step 2: Write the failing test for the replay logic**

Create `apps/mobile/src/sync/engine.test.ts`:

```typescript
import { replaySyncQueue } from './engine'

function makeFakeDb(rows: any[]) {
  const updated: string[] = []
  return {
    getAllAsync: jest.fn().mockResolvedValue(rows),
    runAsync: jest.fn().mockImplementation((_sql: string, params: unknown[]) => {
      updated.push(params[0] as string)
      return Promise.resolve()
    }),
    _updated: updated,
  }
}

function makeFakeSupabase(errorOnTable?: string) {
  return {
    from: (table: string) => ({
      upsert: jest.fn().mockResolvedValue(table === errorOnTable ? { error: { message: 'boom' } } : { error: null }),
      delete: () => ({
        eq: jest.fn().mockResolvedValue(table === errorOnTable ? { error: { message: 'boom' } } : { error: null }),
      }),
    }),
  }
}

describe('replaySyncQueue', () => {
  it('marks each successfully-applied row as synced, oldest first', async () => {
    const rows = [
      {
        id: 'q2',
        user_id: 'user-1',
        entity_type: 'workout_set',
        entity_id: 'set-2',
        operation: 'insert',
        payload_json: JSON.stringify({ reps: 10 }),
        synced: 0,
        created_at: '2026-01-02T00:00:00.000Z',
      },
      {
        id: 'q1',
        user_id: 'user-1',
        entity_type: 'workout_set',
        entity_id: 'set-1',
        operation: 'insert',
        payload_json: JSON.stringify({ reps: 8 }),
        synced: 0,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ]
    const db = makeFakeDb(rows)
    const supabaseClient = makeFakeSupabase()

    const result = await replaySyncQueue('user-1', db, supabaseClient)

    expect(result).toEqual({ synced: 2, failed: 0 })
    expect(db._updated).toEqual(['q1', 'q2'])
  })

  it('leaves a failed mutation unsynced and continues with the rest', async () => {
    const rows = [
      {
        id: 'q1',
        user_id: 'user-1',
        entity_type: 'workout_set',
        entity_id: 'set-1',
        operation: 'insert',
        payload_json: JSON.stringify({ reps: 8 }),
        synced: 0,
        created_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'q2',
        user_id: 'user-1',
        entity_type: 'routine',
        entity_id: 'routine-1',
        operation: 'insert',
        payload_json: JSON.stringify({ name: 'Push Day' }),
        synced: 0,
        created_at: '2026-01-02T00:00:00.000Z',
      },
    ]
    const db = makeFakeDb(rows)
    const supabaseClient = makeFakeSupabase('workout_sets')

    const result = await replaySyncQueue('user-1', db, supabaseClient)

    expect(result).toEqual({ synced: 1, failed: 1 })
    expect(db._updated).toEqual(['q2'])
  })
})
```

- [ ] **Step 3: Run it to confirm it fails**

```bash
pnpm --filter mobile test -- engine.test.ts
```

Expected: FAIL — `./engine` does not exist yet.

- [ ] **Step 4: Implement the replay engine**

Create `apps/mobile/src/sync/engine.ts`:

```typescript
import { SyncQueueEntry, SyncEntityType, SyncOperation, sortQueueByCreatedAt, buildSupabaseMutation } from './queue'

interface QueueRow {
  id: string
  user_id: string
  entity_type: SyncEntityType
  entity_id: string
  operation: SyncOperation
  payload_json: string
  synced: number
  created_at: string
}

interface ReplayDb {
  getAllAsync: (sql: string, params: unknown[]) => Promise<QueueRow[]>
  runAsync: (sql: string, params: unknown[]) => Promise<unknown>
}

interface SupabaseResult {
  error: { message: string } | null
}

interface ReplaySupabaseClient {
  from: (table: string) => {
    upsert: (payload: Record<string, unknown>) => Promise<SupabaseResult> | PromiseLike<SupabaseResult>
    delete: () => { eq: (col: string, val: string) => Promise<SupabaseResult> | PromiseLike<SupabaseResult> }
  }
}

export async function replaySyncQueue(
  userId: string,
  db: ReplayDb,
  supabaseClient: ReplaySupabaseClient
): Promise<{ synced: number; failed: number }> {
  const rows = await db.getAllAsync(
    'SELECT * FROM sync_queue WHERE user_id = ? AND synced = 0',
    [userId]
  )

  const entries: SyncQueueEntry[] = rows.map(row => ({
    id: row.id,
    user_id: row.user_id,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    operation: row.operation,
    payload: JSON.parse(row.payload_json),
    synced: false,
    created_at: row.created_at,
  }))

  const ordered = sortQueueByCreatedAt(entries)

  let synced = 0
  let failed = 0

  for (const entry of ordered) {
    const mutation = buildSupabaseMutation(entry)
    const result =
      mutation.operation === 'delete'
        ? await supabaseClient.from(mutation.table).delete().eq('id', mutation.entityId)
        : await supabaseClient.from(mutation.table).upsert({ id: mutation.entityId, ...mutation.payload })

    if (result.error) {
      failed += 1
      continue
    }

    await db.runAsync('UPDATE sync_queue SET synced = 1 WHERE id = ?', [entry.id])
    synced += 1
  }

  return { synced, failed }
}
```

- [ ] **Step 5: Run it to confirm it passes**

```bash
pnpm --filter mobile test -- engine.test.ts
```

Expected: PASS — 2 tests.

- [ ] **Step 6: Trigger-on-reconnect hook**

Create `apps/mobile/src/sync/useSyncOnReconnect.ts`:

```typescript
import { useEffect, useRef } from 'react'
import NetInfo from '@react-native-community/netinfo'
import { AppState } from 'react-native'
import { getDb } from '@/db/client'
import { supabase } from '@/lib/supabase'
import { replaySyncQueue } from './engine'

export function useSyncOnReconnect(userId: string | undefined) {
  const syncing = useRef(false)

  useEffect(() => {
    if (!userId) return

    const runSync = async () => {
      if (syncing.current) return
      syncing.current = true
      try {
        const db = await getDb()
        await replaySyncQueue(userId, db, supabase)
      } finally {
        syncing.current = false
      }
    }

    runSync()

    const netUnsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) runSync()
    })

    const appStateSubscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') runSync()
    })

    return () => {
      netUnsubscribe()
      appStateSubscription.remove()
    }
  }, [userId])
}
```

- [ ] **Step 7: Wire it into the protected layout**

Edit `apps/mobile/app/(app)/_layout.tsx` — add the hook call after the auth check:

```typescript
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
```

- [ ] **Step 8: Verify and commit**

```bash
cd /Users/kennyvws/gym-tracker
pnpm --filter mobile exec -- npx tsc --noEmit
pnpm --filter mobile test:run
git add -A
git commit -m "feat(mobile): add sync engine that replays the queue to Supabase on reconnect"
```

Expected: typecheck clean, 8 mobile tests total pass (1 client + 5 queue + 2 engine).

---

### Task 7: Exercise library and routine builder

**Files:**
- Create: `apps/mobile/src/api/exercises.ts`, `apps/mobile/src/api/routines.ts`
- Create: `apps/mobile/app/(app)/exercises/index.tsx`
- Create: `apps/mobile/app/(app)/routines/index.tsx`, `apps/mobile/app/(app)/routines/new.tsx`
- Modify: `apps/mobile/app/_layout.tsx` (add `QueryClientProvider`)
- Modify: `apps/mobile/app/(app)/index.tsx` (link to Routines)

**Interfaces:**
- Consumes: `getDb` from `@/db/client`, `writeLocalAndQueue` from `@/db/localWrite`, `supabase` from `@/lib/supabase`, `ProgressionRule` from `@gym-tracker/engine`.
- Produces: `searchExercises(search): Promise<LocalExercise[]>`, `listLocalRoutines(userId): Promise<LocalRoutine[]>`, `refreshRoutinesFromSupabase(userId): Promise<void>`, `createRoutine(userId, name, exercises): Promise<string>` — consumed by Task 8's workout screen (`listLocalRoutines`) and Task 9.

- [ ] **Step 1: Install TanStack Query**

```bash
cd /Users/kennyvws/gym-tracker
pnpm --filter mobile add @tanstack/react-query
```

- [ ] **Step 2: Wrap the app in a QueryClientProvider**

Edit `apps/mobile/app/_layout.tsx`:

```typescript
import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/auth/AuthProvider'
import './global.css'

const queryClient = new QueryClient()

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </QueryClientProvider>
  )
}
```

- [ ] **Step 3: Exercise library API — cache-then-network**

Create `apps/mobile/src/api/exercises.ts`:

```typescript
import { supabase } from '@/lib/supabase'
import { getDb } from '@/db/client'

export interface LocalExercise {
  id: string
  name: string
  category: string
  primary_muscles: string[]
  equipment: string[]
}

export async function refreshExercisesFromSupabase(search: string): Promise<void> {
  let query = supabase
    .from('exercises')
    .select('id, name, category, primary_muscles, secondary_muscles, equipment, force_type, mechanic_type, difficulty, image_url')
    .limit(50)

  if (search.trim()) {
    query = query.ilike('name', `%${search.trim()}%`)
  }

  const { data, error } = await query
  if (error) throw error

  const db = await getDb()
  for (const ex of data ?? []) {
    await db.runAsync(
      `INSERT OR REPLACE INTO exercises_cache
       (id, name, category, primary_muscles_json, secondary_muscles_json, equipment_json, force_type, mechanic_type, difficulty, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ex.id, ex.name, ex.category,
        JSON.stringify(ex.primary_muscles), JSON.stringify(ex.secondary_muscles), JSON.stringify(ex.equipment),
        ex.force_type, ex.mechanic_type, ex.difficulty, ex.image_url,
      ]
    )
  }
}

export async function listLocalExercises(search: string): Promise<LocalExercise[]> {
  const db = await getDb()
  const rows = search.trim()
    ? await db.getAllAsync<any>('SELECT * FROM exercises_cache WHERE name LIKE ? ORDER BY name ASC LIMIT 50', [`%${search.trim()}%`])
    : await db.getAllAsync<any>('SELECT * FROM exercises_cache ORDER BY name ASC LIMIT 50', [])

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    category: row.category,
    primary_muscles: JSON.parse(row.primary_muscles_json),
    equipment: JSON.parse(row.equipment_json),
  }))
}

export async function searchExercises(search: string): Promise<LocalExercise[]> {
  try {
    await refreshExercisesFromSupabase(search)
  } catch {
    // offline or network error — fall back to whatever's cached
  }
  return listLocalExercises(search)
}
```

- [ ] **Step 4: Routines API — read-through cache and offline-first writes**

Create `apps/mobile/src/api/routines.ts`:

```typescript
import * as Crypto from 'expo-crypto'
import { supabase } from '@/lib/supabase'
import { getDb } from '@/db/client'
import { writeLocalAndQueue } from '@/db/localWrite'
import type { ProgressionRule } from '@gym-tracker/engine'

export interface LocalRoutineExercise {
  id: string
  routine_id: string
  exercise_id: string
  exercise_name: string
  order_index: number
  target_sets: number
  target_reps_min: number
  target_reps_max: number
  rest_seconds: number
  progression_rule: ProgressionRule
}

export interface LocalRoutine {
  id: string
  name: string
  description: string | null
  is_active: boolean
  exercises: LocalRoutineExercise[]
}

export async function refreshRoutinesFromSupabase(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('routines')
    .select('*, routine_exercises(*)')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error) throw error

  const db = await getDb()
  for (const routine of data ?? []) {
    await db.runAsync(
      `INSERT OR REPLACE INTO routines (id, user_id, name, description, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [routine.id, userId, routine.name, routine.description, routine.is_active ? 1 : 0, routine.created_at, routine.updated_at]
    )
    for (const re of routine.routine_exercises ?? []) {
      await db.runAsync(
        `INSERT OR REPLACE INTO routine_exercises
         (id, routine_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds, progression_rule_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          re.id, re.routine_id, re.exercise_id, re.order_index, re.target_sets,
          re.target_reps_min, re.target_reps_max, re.rest_seconds,
          JSON.stringify(re.progression_rule), re.created_at, re.updated_at,
        ]
      )
    }
  }
}

export async function listLocalRoutines(userId: string): Promise<LocalRoutine[]> {
  const db = await getDb()
  const routineRows = await db.getAllAsync<any>(
    'SELECT * FROM routines WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC',
    [userId]
  )

  const routines: LocalRoutine[] = []
  for (const row of routineRows) {
    const exerciseRows = await db.getAllAsync<any>(
      `SELECT re.*, ec.name as exercise_name
       FROM routine_exercises re
       LEFT JOIN exercises_cache ec ON re.exercise_id = ec.id
       WHERE re.routine_id = ?
       ORDER BY re.order_index ASC`,
      [row.id]
    )
    routines.push({
      id: row.id,
      name: row.name,
      description: row.description,
      is_active: !!row.is_active,
      exercises: exerciseRows.map(re => ({
        id: re.id,
        routine_id: re.routine_id,
        exercise_id: re.exercise_id,
        exercise_name: re.exercise_name ?? 'Unknown exercise',
        order_index: re.order_index,
        target_sets: re.target_sets,
        target_reps_min: re.target_reps_min,
        target_reps_max: re.target_reps_max,
        rest_seconds: re.rest_seconds,
        progression_rule: JSON.parse(re.progression_rule_json),
      })),
    })
  }
  return routines
}

export async function createRoutine(
  userId: string,
  name: string,
  exercises: Array<{
    exercise_id: string
    order_index: number
    target_sets: number
    target_reps_min: number
    target_reps_max: number
    rest_seconds: number
  }>
): Promise<string> {
  const db = await getDb()
  const routineId = Crypto.randomUUID()
  const now = new Date().toISOString()

  await db.runAsync(
    `INSERT INTO routines (id, user_id, name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, NULL, 1, ?, ?)`,
    [routineId, userId, name, now, now]
  )
  await writeLocalAndQueue(userId, 'routine', routineId, 'insert', {
    user_id: userId, name, description: null, is_active: true, created_at: now, updated_at: now,
  })

  const defaultRule: ProgressionRule = {
    type: 'double_progression',
    weight_increment_kg: 2.5,
    weight_increment_lb: 5,
    rep_target_min: 8,
    rep_target_max: 12,
    deload_trigger_failed_sessions: 2,
    deload_percentage: 10,
  }

  for (const ex of exercises) {
    const routineExerciseId = Crypto.randomUUID()
    await db.runAsync(
      `INSERT INTO routine_exercises
       (id, routine_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds, progression_rule_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        routineExerciseId, routineId, ex.exercise_id, ex.order_index, ex.target_sets,
        ex.target_reps_min, ex.target_reps_max, ex.rest_seconds, JSON.stringify(defaultRule), now, now,
      ]
    )
    await writeLocalAndQueue(userId, 'routine_exercise', routineExerciseId, 'insert', {
      routine_id: routineId,
      exercise_id: ex.exercise_id,
      order_index: ex.order_index,
      target_sets: ex.target_sets,
      target_reps_min: ex.target_reps_min,
      target_reps_max: ex.target_reps_max,
      rest_seconds: ex.rest_seconds,
      progression_rule: defaultRule,
      created_at: now,
      updated_at: now,
    })
  }

  return routineId
}
```

- [ ] **Step 5: Exercise library screen**

Create `apps/mobile/app/(app)/exercises/index.tsx`:

```typescript
import { useState } from 'react'
import { View, Text, TextInput, FlatList, ActivityIndicator } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { searchExercises } from '@/api/exercises'

export default function ExerciseLibraryScreen() {
  const [search, setSearch] = useState('')
  const { data: exercises, isLoading } = useQuery({
    queryKey: ['exercises', search],
    queryFn: () => searchExercises(search),
  })

  return (
    <View className="flex-1 pt-16 px-4 bg-white">
      <Text className="text-2xl font-bold mb-4">Exercises</Text>
      <TextInput
        className="h-11 border border-gray-300 rounded-lg px-3 mb-4"
        value={search}
        onChangeText={setSearch}
        placeholder="Search exercises..."
      />
      {isLoading && <ActivityIndicator />}
      <FlatList
        data={exercises ?? []}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View className="py-3 border-b border-gray-100">
            <Text className="font-medium">{item.name}</Text>
            <Text className="text-sm text-gray-500">{item.category} · {item.equipment.join(', ')}</Text>
          </View>
        )}
      />
    </View>
  )
}
```

- [ ] **Step 6: Routine builder screen**

Create `apps/mobile/app/(app)/routines/new.tsx`:

```typescript
import { useState } from 'react'
import { View, Text, TextInput, Pressable, FlatList, ActivityIndicator } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useAuth } from '@/auth/AuthProvider'
import { searchExercises, LocalExercise } from '@/api/exercises'
import { createRoutine } from '@/api/routines'

interface DraftExercise {
  exercise_id: string
  exercise_name: string
  target_sets: number
  target_reps_min: number
  target_reps_max: number
  rest_seconds: number
}

export default function NewRoutineScreen() {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState<DraftExercise[]>([])
  const [saving, setSaving] = useState(false)

  const { data: results } = useQuery({
    queryKey: ['exercises', search],
    queryFn: () => searchExercises(search),
    enabled: search.length > 0,
  })

  const addExercise = (exercise: LocalExercise) => {
    if (draft.some(d => d.exercise_id === exercise.id)) return
    setDraft(prev => [
      ...prev,
      { exercise_id: exercise.id, exercise_name: exercise.name, target_sets: 3, target_reps_min: 8, target_reps_max: 12, rest_seconds: 120 },
    ])
    setSearch('')
  }

  const removeExercise = (exerciseId: string) => {
    setDraft(prev => prev.filter(d => d.exercise_id !== exerciseId))
  }

  const handleSave = async () => {
    if (!user || !name.trim() || draft.length === 0) return
    setSaving(true)
    await createRoutine(
      user.id,
      name.trim(),
      draft.map((d, index) => ({
        exercise_id: d.exercise_id,
        order_index: index,
        target_sets: d.target_sets,
        target_reps_min: d.target_reps_min,
        target_reps_max: d.target_reps_max,
        rest_seconds: d.rest_seconds,
      }))
    )
    setSaving(false)
    router.replace('/(app)/routines')
  }

  return (
    <View className="flex-1 pt-16 px-4 bg-white">
      <Text className="text-2xl font-bold mb-4">New Routine</Text>

      <TextInput
        className="h-11 border border-gray-300 rounded-lg px-3 mb-4"
        value={name}
        onChangeText={setName}
        placeholder="Routine name"
      />

      <TextInput
        className="h-11 border border-gray-300 rounded-lg px-3 mb-2"
        value={search}
        onChangeText={setSearch}
        placeholder="Search exercises to add..."
      />

      {search.length > 0 && (
        <FlatList
          data={results ?? []}
          keyExtractor={item => item.id}
          style={{ maxHeight: 160 }}
          renderItem={({ item }) => (
            <Pressable className="py-2 border-b border-gray-100" onPress={() => addExercise(item)}>
              <Text>{item.name}</Text>
            </Pressable>
          )}
        />
      )}

      <Text className="text-sm font-medium mt-4 mb-2">Exercises ({draft.length})</Text>
      <FlatList
        data={draft}
        keyExtractor={item => item.exercise_id}
        renderItem={({ item }) => (
          <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
            <View>
              <Text className="font-medium">{item.exercise_name}</Text>
              <Text className="text-sm text-gray-500">
                {item.target_sets} × {item.target_reps_min}–{item.target_reps_max}
              </Text>
            </View>
            <Pressable onPress={() => removeExercise(item.exercise_id)}>
              <Text className="text-red-600">Remove</Text>
            </Pressable>
          </View>
        )}
      />

      <Pressable
        className="h-11 rounded-lg bg-black items-center justify-center mt-6"
        onPress={handleSave}
        disabled={saving || !name.trim() || draft.length === 0}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-medium">Save Routine</Text>}
      </Pressable>
    </View>
  )
}
```

- [ ] **Step 7: Routines list screen**

Create `apps/mobile/app/(app)/routines/index.tsx`:

```typescript
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useAuth } from '@/auth/AuthProvider'
import { listLocalRoutines, refreshRoutinesFromSupabase } from '@/api/routines'

export default function RoutinesScreen() {
  const { user } = useAuth()

  const { data: routines, isLoading } = useQuery({
    queryKey: ['routines', user?.id],
    queryFn: async () => {
      if (!user) return []
      try {
        await refreshRoutinesFromSupabase(user.id)
      } catch {
        // offline — fall back to cached data
      }
      return listLocalRoutines(user.id)
    },
    enabled: !!user,
  })

  return (
    <View className="flex-1 pt-16 px-4 bg-white">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-2xl font-bold">Routines</Text>
        <Pressable onPress={() => router.push('/(app)/routines/new')}>
          <Text className="text-black font-medium">+ New</Text>
        </Pressable>
      </View>

      {isLoading && <ActivityIndicator />}

      <FlatList
        data={routines ?? []}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Pressable
            className="py-4 border-b border-gray-100"
            onPress={() => router.push(`/(app)/workout/active?routine=${item.id}`)}
          >
            <Text className="font-bold text-lg">{item.name}</Text>
            <Text className="text-sm text-gray-500">{item.exercises.length} exercises</Text>
          </Pressable>
        )}
        ListEmptyComponent={!isLoading ? <Text className="text-gray-500 mt-4">No routines yet. Create one to get started.</Text> : null}
      />
    </View>
  )
}
```

- [ ] **Step 8: Link routines from the home screen**

Edit `apps/mobile/app/(app)/index.tsx` — add a link above the sign-out button:

```typescript
import { View, Text, Pressable } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/auth/AuthProvider'

export default function Home() {
  const { user, profile, signOut } = useAuth()

  return (
    <View className="flex-1 px-6 pt-16 bg-white">
      <Text className="text-2xl font-bold mb-1">
        Welcome back, {profile?.display_name || user?.email?.split('@')[0]}
      </Text>
      <Text className="text-gray-500 mb-8">Pick a routine and start your session.</Text>

      <Pressable
        className="h-11 rounded-lg bg-black items-center justify-center mb-4"
        onPress={() => router.push('/(app)/routines')}
      >
        <Text className="text-white font-medium">View Routines</Text>
      </Pressable>

      <Pressable className="h-11 rounded-lg border border-gray-300 items-center justify-center" onPress={signOut}>
        <Text className="font-medium">Sign Out</Text>
      </Pressable>
    </View>
  )
}
```

- [ ] **Step 9: Manual verification**

```bash
cd /Users/kennyvws/gym-tracker
pnpm --filter mobile exec -- npx tsc --noEmit
pnpm --filter mobile start
```

On device: tap "View Routines" → "+ New", type a routine name, search for an exercise (e.g. "Bench"), tap a result to add it, save. The new routine appears in the routines list. Turn on airplane mode, create a second routine — it still saves and appears in the list (read from local SQLite), proving the offline-write path works.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(mobile): add exercise library and routine builder with offline-first writes"
```

---

### Task 8: Active workout screen — progression suggestions, set logging, rest timer

**Files:**
- Modify: `apps/mobile/src/db/schema.ts` (add `progression_states` table)
- Create: `apps/mobile/src/api/progression.ts`, `apps/mobile/src/api/workout.ts`
- Create: `apps/mobile/src/workout/restTimer.ts`, `apps/mobile/src/workout/restTimer.test.ts`, `apps/mobile/src/workout/useRestTimer.ts`
- Create: `apps/mobile/app/(app)/workout/active.tsx`

**Interfaces:**
- Consumes: `generateProgressionRecommendation`, `calculateProgressionState` from `@gym-tracker/engine`; `getDb` from `@/db/client`; `writeLocalAndQueue` from `@/db/localWrite`; `listLocalRoutines` from `@/api/routines` (Task 7).
- Produces: nothing consumed by later tasks — this is the M1 exit-criteria screen.

- [ ] **Step 1: Add the local progression state table**

Edit `apps/mobile/src/db/schema.ts` — add one more statement to the `SCHEMA_STATEMENTS` array (after the `sync_queue` entry):

```typescript
  `CREATE TABLE IF NOT EXISTS progression_states (
    user_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    consecutive_success_count INTEGER NOT NULL DEFAULT 0,
    consecutive_failure_count INTEGER NOT NULL DEFAULT 0,
    last_estimated_1rm_kg REAL,
    current_target_weight_kg REAL,
    last_updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, exercise_id)
  )`,
```

`client.test.ts` from Task 5 asserts `execAsync` is called once per entry in `SCHEMA_STATEMENTS` — it will keep passing automatically since it derives its expectation from the same array, not a hardcoded count.

- [ ] **Step 2: Write the failing test for the rest timer's pure state machine**

Create `apps/mobile/src/workout/restTimer.test.ts`:

```typescript
import { startRestTimer, tickRestTimer, stopRestTimer } from './restTimer'

describe('restTimer', () => {
  it('starts running with the given duration', () => {
    expect(startRestTimer(90)).toEqual({ remainingSeconds: 90, running: true })
  })

  it('ticks down by one second while running', () => {
    const state = tickRestTimer({ remainingSeconds: 90, running: true })
    expect(state).toEqual({ remainingSeconds: 89, running: true })
  })

  it('stops automatically at zero', () => {
    const state = tickRestTimer({ remainingSeconds: 1, running: true })
    expect(state).toEqual({ remainingSeconds: 0, running: false })
  })

  it('does nothing when not running', () => {
    const state = tickRestTimer({ remainingSeconds: 30, running: false })
    expect(state).toEqual({ remainingSeconds: 30, running: false })
  })

  it('stopRestTimer forces running to false without changing remaining time', () => {
    expect(stopRestTimer({ remainingSeconds: 45, running: true })).toEqual({ remainingSeconds: 45, running: false })
  })
})
```

- [ ] **Step 3: Run it to confirm it fails**

```bash
pnpm --filter mobile test -- restTimer.test.ts
```

Expected: FAIL — `./restTimer` does not exist yet.

- [ ] **Step 4: Implement the rest timer state machine**

Create `apps/mobile/src/workout/restTimer.ts`:

```typescript
export interface RestTimerState {
  remainingSeconds: number
  running: boolean
}

export function startRestTimer(durationSeconds: number): RestTimerState {
  return { remainingSeconds: durationSeconds, running: true }
}

export function tickRestTimer(state: RestTimerState): RestTimerState {
  if (!state.running) return state
  const next = state.remainingSeconds - 1
  return next <= 0 ? { remainingSeconds: 0, running: false } : { remainingSeconds: next, running: true }
}

export function stopRestTimer(state: RestTimerState): RestTimerState {
  return { ...state, running: false }
}
```

- [ ] **Step 5: Run it to confirm it passes**

```bash
pnpm --filter mobile test -- restTimer.test.ts
```

Expected: PASS — 5 tests.

- [ ] **Step 6: Wire the timer to a `setInterval`-driven hook**

Create `apps/mobile/src/workout/useRestTimer.ts`:

```typescript
import { useEffect, useRef, useState } from 'react'
import { RestTimerState, startRestTimer, tickRestTimer, stopRestTimer } from './restTimer'

export function useRestTimer() {
  const [state, setState] = useState<RestTimerState>({ remainingSeconds: 0, running: false })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (state.running && !intervalRef.current) {
      intervalRef.current = setInterval(() => {
        setState(prev => tickRestTimer(prev))
      }, 1000)
    }
    if (!state.running && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [state.running])

  const start = (durationSeconds: number) => setState(startRestTimer(durationSeconds))
  const stop = () => setState(prev => stopRestTimer(prev))

  return { ...state, start, stop }
}
```

- [ ] **Step 7: Local workout session/set writes**

Create `apps/mobile/src/api/workout.ts`:

```typescript
import * as Crypto from 'expo-crypto'
import { getDb } from '@/db/client'
import { writeLocalAndQueue } from '@/db/localWrite'

export async function startWorkoutSession(userId: string, routineId: string): Promise<string> {
  const db = await getDb()
  const sessionId = Crypto.randomUUID()
  const now = new Date().toISOString()

  await db.runAsync(
    `INSERT INTO workout_sessions (id, user_id, routine_id, name, started_at, completed_at, notes, created_at, updated_at)
     VALUES (?, ?, ?, NULL, ?, NULL, NULL, ?, ?)`,
    [sessionId, userId, routineId, now, now, now]
  )
  await writeLocalAndQueue(userId, 'workout_session', sessionId, 'insert', {
    user_id: userId, routine_id: routineId, name: null, started_at: now, completed_at: null, notes: null, created_at: now, updated_at: now,
  })

  return sessionId
}

export async function logWorkoutSet(
  userId: string,
  sessionId: string,
  exerciseId: string,
  setNumber: number,
  weightKg: number,
  reps: number,
  isWarmup: boolean
): Promise<void> {
  const db = await getDb()
  const setId = Crypto.randomUUID()
  const now = new Date().toISOString()

  await db.runAsync(
    `INSERT INTO workout_sets (id, session_id, exercise_id, set_number, weight_kg, weight_lb, reps, rpe, is_warmup, completed_at, created_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?, NULL, ?, ?, ?)`,
    [setId, sessionId, exerciseId, setNumber, weightKg, reps, isWarmup ? 1 : 0, now, now]
  )
  await writeLocalAndQueue(userId, 'workout_set', setId, 'insert', {
    session_id: sessionId, exercise_id: exerciseId, set_number: setNumber,
    weight_kg: weightKg, weight_lb: null, reps, rpe: null, is_warmup: isWarmup, completed_at: now, created_at: now,
  })
}

export async function completeWorkoutSession(userId: string, sessionId: string): Promise<void> {
  const db = await getDb()
  const now = new Date().toISOString()

  await db.runAsync('UPDATE workout_sessions SET completed_at = ?, updated_at = ? WHERE id = ?', [now, now, sessionId])
  await writeLocalAndQueue(userId, 'workout_session', sessionId, 'update', { completed_at: now, updated_at: now })
}
```

- [ ] **Step 8: Progression suggestion, sourced entirely from local history**

Create `apps/mobile/src/api/progression.ts`:

```typescript
import { getDb } from '@/db/client'
import { generateProgressionRecommendation, calculateProgressionState } from '@gym-tracker/engine'
import type {
  ProgressionContext,
  ProgressionState,
  ProgressionRecommendation,
  ProgressionRule,
  WorkoutSet,
  Exercise,
} from '@gym-tracker/engine'

export async function getLocalProgressionState(userId: string, exerciseId: string): Promise<ProgressionState | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM progression_states WHERE user_id = ? AND exercise_id = ?',
    [userId, exerciseId]
  )
  if (!row) return null
  return {
    exerciseId: row.exercise_id,
    consecutiveSuccessCount: row.consecutive_success_count,
    consecutiveFailureCount: row.consecutive_failure_count,
    lastEstimated1RM: row.last_estimated_1rm_kg,
    currentTargetWeight: row.current_target_weight_kg,
    lastUpdatedAt: row.last_updated_at,
  }
}

export async function saveLocalProgressionState(userId: string, state: ProgressionState): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    `INSERT OR REPLACE INTO progression_states
     (user_id, exercise_id, consecutive_success_count, consecutive_failure_count, last_estimated_1rm_kg, current_target_weight_kg, last_updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, state.exerciseId, state.consecutiveSuccessCount, state.consecutiveFailureCount, state.lastEstimated1RM, state.currentTargetWeight, state.lastUpdatedAt]
  )
}

export async function getRecentSetsForExercise(userId: string, exerciseId: string, sessionLimit = 3): Promise<WorkoutSet[]> {
  const db = await getDb()
  const sessionRows = await db.getAllAsync<any>(
    'SELECT id FROM workout_sessions WHERE user_id = ? AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT ?',
    [userId, sessionLimit]
  )
  const sessionIds = sessionRows.map(r => r.id)
  if (sessionIds.length === 0) return []

  const placeholders = sessionIds.map(() => '?').join(',')
  const setRows = await db.getAllAsync<any>(
    `SELECT * FROM workout_sets WHERE exercise_id = ? AND session_id IN (${placeholders}) ORDER BY completed_at DESC`,
    [exerciseId, ...sessionIds]
  )

  return setRows.map(row => ({
    id: row.id,
    session_id: row.session_id,
    exercise_id: row.exercise_id,
    exercise: { id: exerciseId } as Exercise,
    set_number: row.set_number,
    weight_kg: row.weight_kg,
    weight_lb: row.weight_lb,
    reps: row.reps,
    rpe: row.rpe,
    is_warmup: !!row.is_warmup,
    completed_at: row.completed_at,
    created_at: row.created_at,
  }))
}

export async function computeSuggestion(
  userId: string,
  exercise: Exercise,
  rule: ProgressionRule,
  unitSystem: 'metric' | 'imperial',
  plateIncrement: number
): Promise<ProgressionRecommendation> {
  const recentSets = await getRecentSetsForExercise(userId, exercise.id)
  const state = await getLocalProgressionState(userId, exercise.id)

  const context: ProgressionContext = {
    exerciseId: exercise.id,
    exercise,
    recentSets,
    currentRule: rule,
    userUnitSystem: unitSystem,
    plateIncrement,
  }

  return generateProgressionRecommendation(context, state)
}

export async function recordProgressionState(
  userId: string,
  exercise: Exercise,
  rule: ProgressionRule,
  unitSystem: 'metric' | 'imperial',
  plateIncrement: number,
  recommendation: ProgressionRecommendation
): Promise<void> {
  const recentSets = await getRecentSetsForExercise(userId, exercise.id)
  const currentState = await getLocalProgressionState(userId, exercise.id)
  const context: ProgressionContext = {
    exerciseId: exercise.id,
    exercise,
    recentSets,
    currentRule: rule,
    userUnitSystem: unitSystem,
    plateIncrement,
  }
  const newState = calculateProgressionState(recommendation, currentState, context)
  await saveLocalProgressionState(userId, newState)
}
```

Note: `WorkoutSet.exercise` and most `Exercise` fields beyond `id`/`name` are part of the shared type's shape but are never read by `generateProgressionRecommendation`'s internals (verified against `packages/engine/src/progression.ts` in Task 2) — the stub objects here are a deliberate, honest simplification, not a placeholder.

- [ ] **Step 9: The active workout screen**

Create `apps/mobile/app/(app)/workout/active.tsx`:

```typescript
import { useEffect, useState } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useAuth } from '@/auth/AuthProvider'
import { listLocalRoutines, LocalRoutine } from '@/api/routines'
import { computeSuggestion, recordProgressionState } from '@/api/progression'
import { startWorkoutSession, logWorkoutSet, completeWorkoutSession } from '@/api/workout'
import { useRestTimer } from '@/workout/useRestTimer'
import type { ProgressionRecommendation, Exercise } from '@gym-tracker/engine'

function buildEngineExercise(id: string, name: string): Exercise {
  return {
    id,
    name,
    category: '',
    primary_muscles: [],
    secondary_muscles: [],
    equipment: [],
    force_type: 'push',
    mechanic_type: 'compound',
    difficulty: 'beginner',
    instructions: null,
    video_url: null,
    image_url: null,
    created_at: '',
    updated_at: '',
  }
}

interface LoggedSet {
  set_number: number
  weight_kg: number
  reps: number
}

export default function ActiveWorkoutScreen() {
  const { routine: routineId } = useLocalSearchParams<{ routine: string }>()
  const { user, profile } = useAuth()
  const [routine, setRoutine] = useState<LocalRoutine | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Record<string, ProgressionRecommendation>>({})
  const [loggedSets, setLoggedSets] = useState<Record<string, LoggedSet[]>>({})
  const [weightInput, setWeightInput] = useState<Record<string, string>>({})
  const [repsInput, setRepsInput] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timer = useRestTimer()

  const unitSystem = profile?.unit_system ?? 'metric'
  const plateIncrement = unitSystem === 'metric' ? (profile?.plate_increment_kg ?? 1.25) : (profile?.plate_increment_lb ?? 2.5)

  useEffect(() => {
    if (!user || !routineId) return

    async function init() {
      setLoading(true)
      const routines = await listLocalRoutines(user.id)
      const found = routines.find(r => r.id === routineId) ?? null
      setRoutine(found)

      if (found) {
        const newSessionId = await startWorkoutSession(user.id, found.id)
        setSessionId(newSessionId)

        const nextSuggestions: Record<string, ProgressionRecommendation> = {}
        for (const re of found.exercises) {
          const exercise = buildEngineExercise(re.exercise_id, re.exercise_name)
          nextSuggestions[re.exercise_id] = await computeSuggestion(user.id, exercise, re.progression_rule, unitSystem, plateIncrement)
        }
        setSuggestions(nextSuggestions)
      }

      setLoading(false)
    }

    init()
  }, [user, routineId])

  const handleLogSet = async (exerciseId: string, restSeconds: number) => {
    if (!user || !sessionId) return
    const weight = parseFloat(weightInput[exerciseId] ?? '')
    const reps = parseInt(repsInput[exerciseId] ?? '', 10)
    if (!weight || !reps) return

    setError(null)
    const setNumber = (loggedSets[exerciseId]?.length ?? 0) + 1

    try {
      await logWorkoutSet(user.id, sessionId, exerciseId, setNumber, weight, reps, false)
    } catch {
      setError('Could not save that set locally. Your in-progress workout is unaffected — try logging it again.')
      return
    }

    setLoggedSets(prev => ({
      ...prev,
      [exerciseId]: [...(prev[exerciseId] ?? []), { set_number: setNumber, weight_kg: weight, reps }],
    }))
    setRepsInput(prev => ({ ...prev, [exerciseId]: '' }))
    timer.start(restSeconds)
  }

  const handleFinish = async () => {
    if (!user || !sessionId || !routine) return
    setFinishing(true)
    setError(null)

    try {
      await completeWorkoutSession(user.id, sessionId)

      for (const re of routine.exercises) {
        const exercise = buildEngineExercise(re.exercise_id, re.exercise_name)
        const recommendation = suggestions[re.exercise_id]
        if (recommendation) {
          await recordProgressionState(user.id, exercise, re.progression_rule, unitSystem, plateIncrement, recommendation)
        }
      }
    } catch {
      setError('Could not finish the workout locally. Your logged sets are safe — try finishing again.')
      setFinishing(false)
      return
    }

    setFinishing(false)
    router.replace('/(app)/routines')
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (!routine) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-gray-500">Routine not found. It may not have synced to this device yet.</Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingTop: 64, paddingHorizontal: 16, paddingBottom: 32 }}>
      <Text className="text-2xl font-bold mb-1">{routine.name}</Text>

      {error && (
        <View className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <Text className="text-red-800 text-sm">{error}</Text>
        </View>
      )}

      {timer.running && (
        <View className="bg-black rounded-lg p-3 mb-4 items-center">
          <Text className="text-white font-bold text-lg">Rest: {timer.remainingSeconds}s</Text>
        </View>
      )}

      {routine.exercises.map(re => {
        const suggestion = suggestions[re.exercise_id]
        const sets = loggedSets[re.exercise_id] ?? []
        const unit = unitSystem === 'metric' ? 'kg' : 'lb'
        const suggestedWeight = unitSystem === 'metric' ? suggestion?.recommended_weight_kg : suggestion?.recommended_weight_lb

        return (
          <View key={re.id} className="mb-6 border border-gray-200 rounded-lg p-4">
            <Text className="font-bold text-lg mb-1">{re.exercise_name}</Text>
            <Text className="text-sm text-gray-500 mb-2">
              Target: {re.target_sets} × {re.target_reps_min}–{re.target_reps_max}
            </Text>

            {suggestion && (
              <View className="bg-gray-50 rounded-lg p-3 mb-3">
                <Text className="text-2xl font-bold">
                  {suggestedWeight ? `${suggestedWeight}${unit}` : '—'}
                </Text>
                <Text className="text-sm text-gray-500 mt-1">{suggestion.reason}</Text>
                {suggestion.should_deload && (
                  <Text className="text-red-600 text-sm font-medium mt-1">Deload {suggestion.deload_percentage}%</Text>
                )}
              </View>
            )}

            {sets.map(s => (
              <Text key={s.set_number} className="text-sm text-gray-600 mb-1">
                Set {s.set_number}: {s.weight_kg}{unit} × {s.reps}
              </Text>
            ))}

            <View className="flex-row gap-2 mt-2">
              <TextInput
                className="flex-1 h-11 border border-gray-300 rounded-lg px-3"
                placeholder={`Weight (${unit})`}
                keyboardType="decimal-pad"
                value={weightInput[re.exercise_id] ?? ''}
                onChangeText={v => setWeightInput(prev => ({ ...prev, [re.exercise_id]: v }))}
              />
              <TextInput
                className="flex-1 h-11 border border-gray-300 rounded-lg px-3"
                placeholder="Reps"
                keyboardType="number-pad"
                value={repsInput[re.exercise_id] ?? ''}
                onChangeText={v => setRepsInput(prev => ({ ...prev, [re.exercise_id]: v }))}
              />
              <Pressable
                className="h-11 px-4 rounded-lg bg-black items-center justify-center"
                onPress={() => handleLogSet(re.exercise_id, re.rest_seconds)}
              >
                <Text className="text-white font-medium">Log</Text>
              </Pressable>
            </View>
          </View>
        )
      })}

      <Pressable
        className="h-12 rounded-lg bg-black items-center justify-center mt-2"
        onPress={handleFinish}
        disabled={finishing}
      >
        {finishing ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Finish Workout</Text>}
      </Pressable>
    </ScrollView>
  )
}
```

- [ ] **Step 10: Manual verification — the M1 exit criteria**

```bash
cd /Users/kennyvws/gym-tracker
pnpm --filter mobile exec -- npx tsc --noEmit
pnpm --filter mobile test:run
pnpm --filter mobile start
```

On device: from Routines, tap a routine → the active workout screen loads, showing a suggestion card per exercise (first time through, it reads "Insufficient data for progression decision" since there's no history yet — this is correct engine behavior, not a bug). Log a few sets, watch the rest timer count down, tap "Finish Workout". Start the **same routine again** — the suggestion card should now show a real weight derived from the sets just logged. Turn on airplane mode before starting a session, complete a full workout offline, then reconnect — on the next foreground/reconnect the sync engine (Task 6) should drain the queue.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(mobile): add active workout screen with progression suggestions, set logging, and rest timer"
```

---

### Task 9: History screens

**Files:**
- Create: `apps/mobile/src/api/history.ts`
- Create: `apps/mobile/app/(app)/history/index.tsx`, `apps/mobile/app/(app)/history/[exerciseId].tsx`

**Interfaces:**
- Consumes: `getDb` from `@/db/client`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: History query helpers**

Create `apps/mobile/src/api/history.ts`:

```typescript
import { getDb } from '@/db/client'

export interface ExerciseHistorySummary {
  exercise_id: string
  exercise_name: string
  last_logged_at: string
  total_sets: number
}

export async function listLoggedExercises(userId: string): Promise<ExerciseHistorySummary[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<any>(
    `SELECT
       ws.exercise_id,
       COALESCE(ec.name, 'Unknown exercise') as exercise_name,
       MAX(ws.completed_at) as last_logged_at,
       COUNT(*) as total_sets
     FROM workout_sets ws
     JOIN workout_sessions s ON s.id = ws.session_id
     LEFT JOIN exercises_cache ec ON ec.id = ws.exercise_id
     WHERE s.user_id = ? AND ws.is_warmup = 0
     GROUP BY ws.exercise_id
     ORDER BY last_logged_at DESC`,
    [userId]
  )
  return rows.map(r => ({
    exercise_id: r.exercise_id,
    exercise_name: r.exercise_name,
    last_logged_at: r.last_logged_at,
    total_sets: r.total_sets,
  }))
}

export interface HistorySetEntry {
  session_id: string
  completed_at: string
  weight_kg: number | null
  reps: number
}

export async function listSetsForExercise(userId: string, exerciseId: string): Promise<HistorySetEntry[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<any>(
    `SELECT ws.session_id, ws.completed_at, ws.weight_kg, ws.reps
     FROM workout_sets ws
     JOIN workout_sessions s ON s.id = ws.session_id
     WHERE s.user_id = ? AND ws.exercise_id = ? AND ws.is_warmup = 0
     ORDER BY ws.completed_at DESC
     LIMIT 100`,
    [userId, exerciseId]
  )
  return rows.map(r => ({
    session_id: r.session_id,
    completed_at: r.completed_at,
    weight_kg: r.weight_kg,
    reps: r.reps,
  }))
}
```

- [ ] **Step 2: History list screen**

Create `apps/mobile/app/(app)/history/index.tsx`:

```typescript
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useAuth } from '@/auth/AuthProvider'
import { listLoggedExercises } from '@/api/history'

export default function HistoryScreen() {
  const { user } = useAuth()
  const { data: exercises, isLoading } = useQuery({
    queryKey: ['history-exercises', user?.id],
    queryFn: () => (user ? listLoggedExercises(user.id) : []),
    enabled: !!user,
  })

  return (
    <View className="flex-1 pt-16 px-4 bg-white">
      <Text className="text-2xl font-bold mb-4">History</Text>
      {isLoading && <ActivityIndicator />}
      <FlatList
        data={exercises ?? []}
        keyExtractor={item => item.exercise_id}
        renderItem={({ item }) => (
          <Pressable
            className="py-4 border-b border-gray-100"
            onPress={() => router.push(`/(app)/history/${item.exercise_id}`)}
          >
            <Text className="font-bold">{item.exercise_name}</Text>
            <Text className="text-sm text-gray-500">{item.total_sets} sets logged</Text>
          </Pressable>
        )}
        ListEmptyComponent={!isLoading ? <Text className="text-gray-500 mt-4">No workouts logged yet.</Text> : null}
      />
    </View>
  )
}
```

- [ ] **Step 3: Per-exercise history screen**

Create `apps/mobile/app/(app)/history/[exerciseId].tsx`:

```typescript
import { View, Text, FlatList, ActivityIndicator } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { useAuth } from '@/auth/AuthProvider'
import { listSetsForExercise } from '@/api/history'

export default function ExerciseHistoryScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>()
  const { user } = useAuth()

  const { data: sets, isLoading } = useQuery({
    queryKey: ['history-sets', user?.id, exerciseId],
    queryFn: () => (user && exerciseId ? listSetsForExercise(user.id, exerciseId) : []),
    enabled: !!user && !!exerciseId,
  })

  return (
    <View className="flex-1 pt-16 px-4 bg-white">
      <Text className="text-2xl font-bold mb-4">Exercise History</Text>
      {isLoading && <ActivityIndicator />}
      <FlatList
        data={sets ?? []}
        keyExtractor={(item, index) => `${item.session_id}-${index}`}
        renderItem={({ item }) => (
          <View className="py-3 border-b border-gray-100 flex-row justify-between">
            <Text className="text-gray-600">{new Date(item.completed_at).toLocaleDateString()}</Text>
            <Text className="font-medium">{item.weight_kg ?? '—'}kg × {item.reps}</Text>
          </View>
        )}
        ListEmptyComponent={!isLoading ? <Text className="text-gray-500 mt-4">No sets logged for this exercise yet.</Text> : null}
      />
    </View>
  )
}
```

- [ ] **Step 4: Verify and commit**

```bash
cd /Users/kennyvws/gym-tracker
pnpm --filter mobile exec -- npx tsc --noEmit
git add -A
git commit -m "feat(mobile): add history list and per-exercise history screens"
```

---

### Task 10: Settings screen, home screen navigation hub, and final M1 verification

**Files:**
- Create: `apps/mobile/app/(app)/settings/index.tsx`
- Modify: `apps/mobile/app/(app)/index.tsx` (link to all four sections)
- Create: `docs/superpowers/plans/2026-07-02-mobile-app-m1-smoke-test.md`

**Interfaces:**
- Consumes: `useAuth` from `@/auth/AuthProvider`, `supabase` from `@/lib/supabase`.
- Produces: nothing — this is the last M1 task.

- [ ] **Step 1: Settings screen**

Create `apps/mobile/app/(app)/settings/index.tsx`:

```typescript
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
      setMessage('Failed to save settings.')
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
```

- [ ] **Step 2: Turn the home screen into a navigation hub**

Replace `apps/mobile/app/(app)/index.tsx`:

```typescript
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
```

- [ ] **Step 3: Verify the full app**

```bash
cd /Users/kennyvws/gym-tracker
pnpm --filter mobile exec -- npx tsc --noEmit
pnpm --filter mobile test:run
pnpm --filter web build
pnpm --filter web test:run
pnpm --filter engine test:run
```

Expected: every check passes. This is the last point where both apps and the shared package must all be simultaneously green.

- [ ] **Step 4: Write the M1 manual smoke test checklist**

Per the design spec §10, the offline sync flow is the one piece of this app that isn't practically covered by an automated test — it needs a real device with airplane mode. Create `docs/superpowers/plans/2026-07-02-mobile-app-m1-smoke-test.md`:

```markdown
# M1 Smoke Test — Offline Workout Flow

Run this on a physical Android device via Expo Go before considering M1 done.

1. Fresh install / clear app data. Sign up with a new account.
2. Create a routine with 2+ exercises via the routine builder.
3. From Routines, tap the new routine to start a workout.
4. Turn on Airplane Mode.
5. Log 2-3 sets per exercise. Confirm each "Log" tap succeeds instantly with no error and no spinner hang (this is the offline-write path — it must never block on network).
6. Tap "Finish Workout". Confirm it completes without error while still offline.
7. Force-quit the app while still in Airplane Mode. Reopen it — you should land on the Home screen (session persisted), and the completed workout should NOT have vanished from History.
8. Turn off Airplane Mode.
9. Wait a few seconds (or background/foreground the app once to trigger the reconnect listener).
10. In the Supabase dashboard (Table Editor), confirm the new `workout_sessions` and `workout_sets` rows now exist for this user — this proves the sync queue drained.
11. Start the same routine again. Confirm the suggested weight now reflects the sets logged in step 5 (e.g. weight increased if all sets hit the top of the rep range) — this is M1's actual exit criteria.

If any step fails, the bug is almost certainly in `apps/mobile/src/sync/engine.ts` (queue replay) or `apps/mobile/src/db/localWrite.ts` (write-through) — both have unit tests (Tasks 5-6) covering their logic in isolation, so a failure here likely means a wiring problem (e.g. `useSyncOnReconnect` not mounted, NetInfo listener not firing) rather than a logic bug.
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(mobile): add settings screen, home navigation hub, and M1 smoke test checklist"
```

---

## Post-plan note

This plan delivers M1 exactly as scoped in `docs/superpowers/specs/2026-07-02-mobile-app-m1-design.md`: routines, exercise library, offline-first workout logging, rule-based progression suggestions computed entirely from local history, and history browsing. RPE logging, 1RM display, autoregulation (Phase 2), the AI coaching assistant (Phase 3), and pose estimation (Phase 4) are intentionally not part of this plan — each gets its own brainstorming → spec → plan cycle when M1 is confirmed working end-to-end (Task 10, Step 4's smoke test).

