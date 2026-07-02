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
