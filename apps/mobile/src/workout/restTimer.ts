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
