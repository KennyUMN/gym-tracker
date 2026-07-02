import {
  ProgressionRule,
  ProgressionRuleType,
  ProgressionRecommendation,
  WorkoutSet,
  Exercise,
  calculateEpley1RM,
  roundToPlateIncrement,
  ProgressionContext,
  ProgressionState,
} from '@/types'

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
  let deloadPercentage = currentRule.deload_percentage
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
  
  const estimated1RM = topSetWeightKg > 0 && topSetReps > 0 
    ? calculateEpley1RM(topSetWeightKg, topSetReps)
    : progressionState?.lastEstimated1RM ?? null
  
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
  const { exercise, recentSets, currentRule } = context
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