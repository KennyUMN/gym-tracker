import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatWeight(weight: number | null | undefined, unit: 'kg' | 'lb'): string {
  if (weight === null || weight === undefined) return '--'
  return `${weight.toFixed(weight % 1 === 0 ? 0 : 1)}${unit}`
}

export function formatVolume(volumeKg: number): string {
  if (volumeKg >= 1000) {
    return `${(volumeKg / 1000).toFixed(1)}k kg`
  }
  return `${Math.round(volumeKg)} kg`
}

export function calculateVolume(weight: number | null, reps: number): number {
  if (!weight || weight <= 0) return 0
  return weight * reps
}