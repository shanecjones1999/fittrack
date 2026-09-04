import type { SQLiteDatabase } from 'expo-sqlite';

import type { AppSettings, ColorScheme, WeightUnit } from './types';

function parseColorScheme(value: string | undefined): ColorScheme {
  return value === 'dark' ? 'dark' : 'light';
}

export async function getSettings(db: SQLiteDatabase): Promise<AppSettings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings'
  );
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const unit = map.weight_unit;
  return {
    weightUnit: unit === 'lbs' || unit === 'kg' ? unit : null,
    unitsChosen: map.units_chosen === '1',
    trackEnergyLevel: map.track_energy_level === '1',
    colorScheme: parseColorScheme(map.color_scheme),
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

export async function setTrackEnergyLevel(
  db: SQLiteDatabase,
  enabled: boolean
): Promise<void> {
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES ('track_energy_level', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    enabled ? '1' : '0'
  );
}

export async function setColorScheme(
  db: SQLiteDatabase,
  scheme: ColorScheme
): Promise<void> {
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES ('color_scheme', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    scheme
  );
}
