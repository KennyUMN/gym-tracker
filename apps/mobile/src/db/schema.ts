export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS routines (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS routine_exercises (
    id TEXT PRIMARY KEY,
    routine_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    target_sets INTEGER NOT NULL,
    target_reps_min INTEGER NOT NULL,
    target_reps_max INTEGER NOT NULL,
    rest_seconds INTEGER NOT NULL,
    progression_rule_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS workout_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    routine_id TEXT,
    name TEXT,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS workout_sets (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    set_number INTEGER NOT NULL,
    weight_kg REAL,
    weight_lb REAL,
    reps INTEGER NOT NULL,
    rpe INTEGER,
    is_warmup INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS exercises_cache (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    primary_muscles_json TEXT NOT NULL,
    secondary_muscles_json TEXT NOT NULL,
    equipment_json TEXT NOT NULL,
    force_type TEXT,
    mechanic_type TEXT,
    difficulty TEXT,
    image_url TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS progression_states (
    user_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    consecutive_success_count INTEGER NOT NULL DEFAULT 0,
    consecutive_failure_count INTEGER NOT NULL DEFAULT 0,
    last_estimated_1rm_kg REAL,
    current_target_weight_kg REAL,
    last_updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, exercise_id)
  )`,
]
