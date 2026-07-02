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
