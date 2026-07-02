export type SyncEntityType = 'routine' | 'routine_exercise' | 'workout_session' | 'workout_set'
export type SyncOperation = 'insert' | 'update' | 'delete'

export interface SyncQueueEntry {
  id: string
  user_id: string
  entity_type: SyncEntityType
  entity_id: string
  operation: SyncOperation
  payload: Record<string, unknown>
  synced: boolean
  created_at: string
}

export function createSyncQueueEntry(
  id: string,
  userId: string,
  entityType: SyncEntityType,
  entityId: string,
  operation: SyncOperation,
  payload: Record<string, unknown>,
  createdAt: string
): SyncQueueEntry {
  return {
    id,
    user_id: userId,
    entity_type: entityType,
    entity_id: entityId,
    operation,
    payload,
    synced: false,
    created_at: createdAt,
  }
}

const ENTITY_TABLE: Record<SyncEntityType, string> = {
  routine: 'routines',
  routine_exercise: 'routine_exercises',
  workout_session: 'workout_sessions',
  workout_set: 'workout_sets',
}

export interface SupabaseMutation {
  table: string
  operation: SyncOperation
  entityId: string
  payload: Record<string, unknown>
}

export function buildSupabaseMutation(entry: SyncQueueEntry): SupabaseMutation {
  return {
    table: ENTITY_TABLE[entry.entity_type],
    operation: entry.operation,
    entityId: entry.entity_id,
    payload: entry.payload,
  }
}

export function sortQueueByCreatedAt(entries: SyncQueueEntry[]): SyncQueueEntry[] {
  return [...entries].sort((a, b) => a.created_at.localeCompare(b.created_at))
}

export function partitionSyncQueue(entries: SyncQueueEntry[]): { pending: SyncQueueEntry[]; synced: SyncQueueEntry[] } {
  return {
    pending: entries.filter(e => !e.synced),
    synced: entries.filter(e => e.synced),
  }
}
