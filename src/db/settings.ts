import type { SQLiteDatabase } from 'expo-sqlite';

import type { AppSettings, WeightUnit } from './types';

export async function getSettings(db: SQLiteDatabase): Promise<AppSettings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings'
  );
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const unit = map.weight_unit;
  return {
    weightUnit: unit === 'lbs' || unit === 'kg' ? unit : null,
    unitsChosen: map.units_chosen === '1',
  };
}

export async function setWeightUnit(
  db: SQLiteDatabase,
  unit: WeightUnit
): Promise<void> {
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES ('weight_unit', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    unit
  );
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES ('units_chosen', '1')
     ON CONFLICT(key) DO UPDATE SET value = '1'`
  );
}
