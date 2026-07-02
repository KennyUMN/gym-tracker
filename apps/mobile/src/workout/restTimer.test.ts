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
