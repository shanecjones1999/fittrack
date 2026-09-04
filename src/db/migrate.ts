import type { SQLiteDatabase } from 'expo-sqlite';

import { createId } from './id';
import { SEEDED_EXERCISES } from './seed';

const DATABASE_VERSION = 2;

export async function migrateDb(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  if (current >= DATABASE_VERSION) {
    return;
  }

  if (current < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS exercise_catalog (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL COLLATE NOCASE UNIQUE,
        is_seeded INTEGER NOT NULL DEFAULT 0,
        use_count INTEGER NOT NULL DEFAULT 0,
        last_used_at TEXT
      );

      CREATE TABLE IF NOT EXISTS workout_days (
        id TEXT PRIMARY KEY NOT NULL,
        date TEXT NOT NULL,
        start_time TEXT,
        label TEXT NOT NULL,
        location TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_workout_days_date
        ON workout_days(date DESC, start_time DESC);

      CREATE TABLE IF NOT EXISTS exercises (
        id TEXT PRIMARY KEY NOT NULL,
        workout_id TEXT NOT NULL,
        catalog_id TEXT,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        FOREIGN KEY (workout_id) REFERENCES workout_days(id) ON DELETE CASCADE,
        FOREIGN KEY (catalog_id) REFERENCES exercise_catalog(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_exercises_workout
        ON exercises(workout_id, sort_order);

      CREATE TABLE IF NOT EXISTS sets (
        id TEXT PRIMARY KEY NOT NULL,
        exercise_id TEXT NOT NULL,
        set_index INTEGER NOT NULL,
        weight REAL NOT NULL,
        reps INTEGER NOT NULL,
        unit TEXT NOT NULL CHECK (unit IN ('lbs', 'kg')),
        rpe REAL,
        is_warmup INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_sets_exercise
        ON sets(exercise_id, set_index);
    `);

    await seedExerciseCatalog(db);
    await db.runAsync(
      "INSERT OR IGNORE INTO settings (key, value) VALUES ('units_chosen', '0')"
    );
  }

  if (current < 2) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS locations (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL COLLATE NOCASE UNIQUE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_locations_sort
        ON locations(sort_order ASC, name COLLATE NOCASE ASC);
    `);
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

async function seedExerciseCatalog(db: SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM exercise_catalog'
  );
  if ((existing?.count ?? 0) > 0) {
    return;
  }

  for (const name of SEEDED_EXERCISES) {
    await db.runAsync(
      `INSERT INTO exercise_catalog (id, name, is_seeded, use_count, last_used_at)
       VALUES (?, ?, 1, 0, NULL)`,
      createId(),
      name
    );
  }
}
