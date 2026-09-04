import type { SQLiteDatabase } from 'expo-sqlite';

import { createId } from './id';
import type { SavedLocation } from './types';

type LocationRow = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

function mapLocation(row: LocationRow): SavedLocation {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export async function listLocations(
  db: SQLiteDatabase
): Promise<SavedLocation[]> {
  const rows = await db.getAllAsync<LocationRow>(
    `SELECT * FROM locations
     ORDER BY sort_order ASC, name COLLATE NOCASE ASC`
  );
  return rows.map(mapLocation);
}

export async function findLocationByName(
  db: SQLiteDatabase,
  name: string
): Promise<SavedLocation | null> {
  const row = await db.getFirstAsync<LocationRow>(
    'SELECT * FROM locations WHERE name = ? COLLATE NOCASE',
    name.trim()
  );
  return row ? mapLocation(row) : null;
}

export async function addLocation(
  db: SQLiteDatabase,
  name: string
): Promise<SavedLocation> {
  const trimmed = name.trim();
  const existing = await findLocationByName(db, trimmed);
  if (existing) {
    return existing;
  }

  const maxOrder = await db.getFirstAsync<{ max_order: number | null }>(
    'SELECT MAX(sort_order) as max_order FROM locations'
  );
  const sortOrder = (maxOrder?.max_order ?? -1) + 1;
  const id = createId();
  const createdAt = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO locations (id, name, sort_order, created_at)
     VALUES (?, ?, ?, ?)`,
    id,
    trimmed,
    sortOrder,
    createdAt
  );

  return {
    id,
    name: trimmed,
    sortOrder,
    createdAt,
  };
}

export async function deleteLocation(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync('DELETE FROM locations WHERE id = ?', id);
}
