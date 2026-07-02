import * as Crypto from 'expo-crypto'
import { getDb } from './client'
import { createSyncQueueEntry, SyncEntityType, SyncOperation } from '@/sync/queue'

export async function writeLocalAndQueue(
  userId: string,
  entityType: SyncEntityType,
  entityId: string,
  operation: SyncOperation,
  payload: Record<string, unknown>
): Promise<void> {
  const db = await getDb()
  const entry = createSyncQueueEntry(
    Crypto.randomUUID(),
    userId,
    entityType,
    entityId,
    operation,
    payload,
    new Date().toISOString()
  )

  await db.runAsync(
    `INSERT INTO sync_queue (id, user_id, entity_type, entity_id, operation, payload_json, synced, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    [entry.id, entry.user_id, entry.entity_type, entry.entity_id, entry.operation, JSON.stringify(entry.payload), entry.created_at]
  )
}
