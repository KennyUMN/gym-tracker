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
