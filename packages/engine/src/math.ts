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
