import type { SQLiteDatabase } from 'expo-sqlite';

import { createId } from './id';
import type { ExerciseCatalogEntry } from './types';

type CatalogRow = {
  id: string;
  name: string;
  is_seeded: number;
  use_count: number;
  last_used_at: string | null;
};

function mapCatalog(row: CatalogRow): ExerciseCatalogEntry {
  return {
    id: row.id,
    name: row.name,
    isSeeded: row.is_seeded,
    useCount: row.use_count,
    lastUsedAt: row.last_used_at,
  };
}

/** Ranked typeahead: prefix > substring, boosted by recency/frequency. */
export async function searchCatalog(
  db: SQLiteDatabase,
  query: string,
  limit = 12
): Promise<ExerciseCatalogEntry[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    const recent = await db.getAllAsync<CatalogRow>(
      `SELECT * FROM exercise_catalog
       ORDER BY
         CASE WHEN last_used_at IS NULL THEN 1 ELSE 0 END,
         last_used_at DESC,
         use_count DESC,
         name COLLATE NOCASE ASC
       LIMIT ?`,
      limit
    );
    return recent.map(mapCatalog);
  }

  const like = `%${trimmed}%`;
  const rows = await db.getAllAsync<CatalogRow>(
    `SELECT * FROM exercise_catalog
     WHERE name LIKE ? COLLATE NOCASE
     ORDER BY
       CASE
         WHEN name LIKE ? COLLATE NOCASE THEN 0
         ELSE 1
       END,
       use_count DESC,
       CASE WHEN last_used_at IS NULL THEN 1 ELSE 0 END,
       last_used_at DESC,
       name COLLATE NOCASE ASC
     LIMIT ?`,
    like,
    `${trimmed}%`,
    limit
  );
  return rows.map(mapCatalog);
}

export async function findCatalogByName(
  db: SQLiteDatabase,
  name: string
): Promise<ExerciseCatalogEntry | null> {
  const row = await db.getFirstAsync<CatalogRow>(
    'SELECT * FROM exercise_catalog WHERE name = ? COLLATE NOCASE',
    name.trim()
  );
  return row ? mapCatalog(row) : null;
}

export async function addCatalogEntry(
  db: SQLiteDatabase,
  name: string
): Promise<ExerciseCatalogEntry> {
  const trimmed = name.trim();
  const existing = await findCatalogByName(db, trimmed);
  if (existing) {
    return existing;
  }

  const id = createId();
  await db.runAsync(
    `INSERT INTO exercise_catalog (id, name, is_seeded, use_count, last_used_at)
     VALUES (?, ?, 0, 0, NULL)`,
    id,
    trimmed
  );
  return {
    id,
    name: trimmed,
    isSeeded: 0,
    useCount: 0,
    lastUsedAt: null,
  };
}

export async function bumpCatalogUsage(
  db: SQLiteDatabase,
  catalogId: string
): Promise<void> {
  await db.runAsync(
    `UPDATE exercise_catalog
     SET use_count = use_count + 1,
         last_used_at = ?
     WHERE id = ?`,
    new Date().toISOString(),
    catalogId
  );
}

/** User-created catalog entries (typos, custom lifts) — not the seeded set. */
export async function listCustomCatalogEntries(
  db: SQLiteDatabase
): Promise<ExerciseCatalogEntry[]> {
  const rows = await db.getAllAsync<CatalogRow>(
    `SELECT * FROM exercise_catalog
     WHERE is_seeded = 0
     ORDER BY name COLLATE NOCASE ASC`
  );
  return rows.map(mapCatalog);
}

export async function renameCatalogEntry(
  db: SQLiteDatabase,
  id: string,
  newName: string
): Promise<ExerciseCatalogEntry | null> {
  const trimmed = newName.trim();
  if (!trimmed) {
    return null;
  }

  const current = await db.getFirstAsync<CatalogRow>(
    'SELECT * FROM exercise_catalog WHERE id = ?',
    id
  );
  if (!current) {
    return null;
  }

  if (current.name.toLowerCase() === trimmed.toLowerCase()) {
    // Same spelling aside from casing — just normalize the stored name.
    await db.runAsync(
      'UPDATE exercise_catalog SET name = ? WHERE id = ?',
      trimmed,
      id
    );
    await db.runAsync(
      'UPDATE exercises SET name = ? WHERE catalog_id = ?',
      trimmed,
      id
    );
    return mapCatalog({ ...current, name: trimmed });
  }

  const existing = await findCatalogByName(db, trimmed);
  if (existing && existing.id !== id) {
    // Merge into the existing entry so typos collapse into the real name.
    await db.runAsync(
      `UPDATE exercises
       SET catalog_id = ?, name = ?
       WHERE catalog_id = ?`,
      existing.id,
      existing.name,
      id
    );

    const mergedLastUsed =
      [current.last_used_at, existing.lastUsedAt]
        .filter((v): v is string => Boolean(v))
        .sort()
        .at(-1) ?? null;

    await db.runAsync(
      `UPDATE exercise_catalog
       SET use_count = use_count + ?,
           last_used_at = ?
       WHERE id = ?`,
      current.use_count,
      mergedLastUsed,
      existing.id
    );
    await db.runAsync('DELETE FROM exercise_catalog WHERE id = ?', id);
    return {
      ...existing,
      useCount: existing.useCount + current.use_count,
      lastUsedAt: mergedLastUsed,
    };
  }

  await db.runAsync(
    'UPDATE exercise_catalog SET name = ? WHERE id = ?',
    trimmed,
    id
  );
  await db.runAsync(
    'UPDATE exercises SET name = ? WHERE catalog_id = ?',
    trimmed,
    id
  );
  return mapCatalog({ ...current, name: trimmed });
}

export async function deleteCatalogEntry(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  // Workout exercises keep their logged name (FK ON DELETE SET NULL).
  await db.runAsync('DELETE FROM exercise_catalog WHERE id = ?', id);
}
