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

type SqlParam = string | number | null

interface ReplayDb {
  getAllAsync: (sql: string, params: SqlParam[]) => Promise<QueueRow[]>
  runAsync: (sql: string, params: SqlParam[]) => Promise<unknown>
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
