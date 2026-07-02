import * as SQLite from 'expo-sqlite'
import { SCHEMA_STATEMENTS } from './schema'

let dbInstance: SQLite.SQLiteDatabase | null = null

export async function initSchema(db: { execAsync: (sql: string) => Promise<unknown> }): Promise<void> {
  for (const statement of SCHEMA_STATEMENTS) {
    await db.execAsync(statement)
  }
}

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance
  const db = await SQLite.openDatabaseAsync('gymtracker.db')
  await initSchema(db)
  dbInstance = db
  return dbInstance
}
