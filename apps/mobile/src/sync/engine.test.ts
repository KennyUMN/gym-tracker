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
