import type { SQLiteDatabase } from 'expo-sqlite';

import { createId } from './id';
import type {
  Exercise,
  WeightUnit,
  WorkoutDay,
  WorkoutDaySummary,
  WorkoutSet,
} from './types';

export type ExerciseWithSets = Exercise & { sets: WorkoutSet[] };

type WorkoutRow = {
  id: string;
  date: string;
  start_time: string | null;
  label: string;
  location: string | null;
  energy_level: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function mapWorkout(row: WorkoutRow): WorkoutDay {
  return {
    id: row.id,
    date: row.date,
    startTime: row.start_time,
    label: row.label,
    location: row.location,
    energyLevel: row.energy_level,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export async function listWorkoutSummaries(
  db: SQLiteDatabase
): Promise<WorkoutDaySummary[]> {
  const rows = await db.getAllAsync<
    WorkoutRow & { exercise_names: string | null; set_count: number }
  >(
    `SELECT
       w.*,
       (
         SELECT GROUP_CONCAT(e.name, ', ')
         FROM (
           SELECT name FROM exercises
           WHERE workout_id = w.id
           ORDER BY sort_order
           LIMIT 4
         ) e
       ) AS exercise_names,
       (
         SELECT COUNT(*) FROM sets s
         INNER JOIN exercises e ON e.id = s.exercise_id
         WHERE e.workout_id = w.id
       ) AS set_count
     FROM workout_days w
     ORDER BY w.date DESC, w.start_time DESC, w.created_at DESC`
  );

  return rows.map((row) => ({
    ...mapWorkout(row),
    exerciseNames: row.exercise_names ?? '',
    setCount: row.set_count ?? 0,
  }));
}

export async function getWorkout(
  db: SQLiteDatabase,
  id: string
): Promise<WorkoutDay | null> {
  const row = await db.getFirstAsync<WorkoutRow>(
    'SELECT * FROM workout_days WHERE id = ?',
    id
  );
  return row ? mapWorkout(row) : null;
}

export async function createWorkout(
  db: SQLiteDatabase,
  input?: {
    date?: string;
    label?: string;
    location?: string | null;
  }
): Promise<WorkoutDay> {
  const now = new Date().toISOString();
  const workout: WorkoutDay = {
    id: createId(),
    date: input?.date ?? todayIsoDate(),
    startTime: nowTime(),
    label: input?.label ?? '',
    location: input?.location ?? null,
    energyLevel: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO workout_days
      (id, date, start_time, label, location, energy_level, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    workout.id,
    workout.date,
    workout.startTime,
    workout.label,
    workout.location,
    workout.energyLevel,
    workout.notes,
    workout.createdAt,
    workout.updatedAt
  );

  return workout;
}

export async function updateWorkout(
  db: SQLiteDatabase,
  id: string,
  patch: Partial<
    Pick<
      WorkoutDay,
      'date' | 'startTime' | 'label' | 'location' | 'energyLevel' | 'notes'
    >
  >
): Promise<void> {
  const current = await getWorkout(db, id);
  if (!current) {
    return;
  }

  const next = {
    date: patch.date ?? current.date,
    startTime: patch.startTime !== undefined ? patch.startTime : current.startTime,
    label: patch.label ?? current.label,
    location: patch.location !== undefined ? patch.location : current.location,
    energyLevel:
      patch.energyLevel !== undefined ? patch.energyLevel : current.energyLevel,
    notes: patch.notes !== undefined ? patch.notes : current.notes,
    updatedAt: new Date().toISOString(),
  };

  await db.runAsync(
    `UPDATE workout_days
     SET date = ?, start_time = ?, label = ?, location = ?, energy_level = ?, notes = ?, updated_at = ?
     WHERE id = ?`,
    next.date,
    next.startTime,
    next.label,
    next.location,
    next.energyLevel,
    next.notes,
    next.updatedAt,
    id
  );
}

export async function deleteWorkout(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM workout_days WHERE id = ?', id);
}

export async function listExercisesForWorkout(
  db: SQLiteDatabase,
  workoutId: string
): Promise<Exercise[]> {
  const rows = await db.getAllAsync<{
    id: string;
    workout_id: string;
    catalog_id: string | null;
    name: string;
    sort_order: number;
  }>(
    `SELECT * FROM exercises
     WHERE workout_id = ?
     ORDER BY sort_order ASC`,
    workoutId
  );

  return rows.map((row) => ({
    id: row.id,
    workoutId: row.workout_id,
    catalogId: row.catalog_id,
    name: row.name,
    sortOrder: row.sort_order,
  }));
}

function mapSet(row: {
  id: string;
  exercise_id: string;
  set_index: number;
  weight: number;
  reps: number;
  unit: WeightUnit;
  rpe: number | null;
  is_warmup: number;
}): WorkoutSet {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    setIndex: row.set_index,
    weight: row.weight,
    reps: row.reps,
    unit: row.unit,
    rpe: row.rpe,
    isWarmup: row.is_warmup,
  };
}

export async function listExercisesWithSets(
  db: SQLiteDatabase,
  workoutId: string
): Promise<ExerciseWithSets[]> {
  const exercises = await listExercisesForWorkout(db, workoutId);
  if (exercises.length === 0) {
    return [];
  }

  const rows = await db.getAllAsync<{
    id: string;
    exercise_id: string;
    set_index: number;
    weight: number;
    reps: number;
    unit: WeightUnit;
    rpe: number | null;
    is_warmup: number;
  }>(
    `SELECT s.* FROM sets s
     INNER JOIN exercises e ON e.id = s.exercise_id
     WHERE e.workout_id = ?
     ORDER BY e.sort_order ASC, s.set_index ASC`,
    workoutId
  );

  const setsByExercise = new Map<string, WorkoutSet[]>();
  for (const row of rows) {
    const list = setsByExercise.get(row.exercise_id) ?? [];
    list.push(mapSet(row));
    setsByExercise.set(row.exercise_id, list);
  }

  return exercises.map((exercise) => ({
    ...exercise,
    sets: setsByExercise.get(exercise.id) ?? [],
  }));
}

export async function addExercise(
  db: SQLiteDatabase,
  workoutId: string,
  name: string,
  catalogId: string | null,
  unit: WeightUnit
): Promise<string> {
  const countRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM exercises WHERE workout_id = ?',
    workoutId
  );
  const sortOrder = countRow?.count ?? 0;
  const id = createId();

  await db.runAsync(
    `INSERT INTO exercises (id, workout_id, catalog_id, name, sort_order)
     VALUES (?, ?, ?, ?, ?)`,
    id,
    workoutId,
    catalogId,
    name.trim(),
    sortOrder
  );

  // Seed one empty set so the row is immediately ready to fill.
  await addSet(db, id, 0, 0, unit);

  await db.runAsync(
    'UPDATE workout_days SET updated_at = ? WHERE id = ?',
    new Date().toISOString(),
    workoutId
  );

  return id;
}

export async function updateExercise(
  db: SQLiteDatabase,
  exerciseId: string,
  patch: { name: string; catalogId?: string | null }
): Promise<void> {
  const current = await db.getFirstAsync<{
    id: string;
    workout_id: string;
    catalog_id: string | null;
    name: string;
  }>('SELECT id, workout_id, catalog_id, name FROM exercises WHERE id = ?', exerciseId);

  if (!current) {
    return;
  }

  const name = patch.name.trim();
  if (!name) {
    return;
  }

  await db.runAsync(
    `UPDATE exercises
     SET name = ?, catalog_id = ?
     WHERE id = ?`,
    name,
    patch.catalogId !== undefined ? patch.catalogId : current.catalog_id,
    exerciseId
  );

  await db.runAsync(
    'UPDATE workout_days SET updated_at = ? WHERE id = ?',
    new Date().toISOString(),
    current.workout_id
  );
}

export async function deleteExercise(
  db: SQLiteDatabase,
  exerciseId: string
): Promise<void> {
  const row = await db.getFirstAsync<{ workout_id: string; sort_order: number }>(
    'SELECT workout_id, sort_order FROM exercises WHERE id = ?',
    exerciseId
  );
  if (!row) {
    return;
  }

  await db.runAsync('DELETE FROM exercises WHERE id = ?', exerciseId);

  const remaining = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM exercises
     WHERE workout_id = ?
     ORDER BY sort_order ASC`,
    row.workout_id
  );

  for (let i = 0; i < remaining.length; i++) {
    await db.runAsync(
      'UPDATE exercises SET sort_order = ? WHERE id = ?',
      i,
      remaining[i].id
    );
  }

  await db.runAsync(
    'UPDATE workout_days SET updated_at = ? WHERE id = ?',
    new Date().toISOString(),
    row.workout_id
  );
}

/** Persist a new exercise order as contiguous 0-based sort_order values. */
export async function reorderExercises(
  db: SQLiteDatabase,
  workoutId: string,
  orderedIds: string[]
): Promise<void> {
  if (orderedIds.length === 0) {
    return;
  }

  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.runAsync(
        `UPDATE exercises
         SET sort_order = ?
         WHERE id = ? AND workout_id = ?`,
        i,
        orderedIds[i],
        workoutId
      );
    }

    await db.runAsync(
      'UPDATE workout_days SET updated_at = ? WHERE id = ?',
      new Date().toISOString(),
      workoutId
    );
  });
}

export async function addSet(
  db: SQLiteDatabase,
  exerciseId: string,
  weight: number,
  reps: number,
  unit: WeightUnit
): Promise<string> {
  const countRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM sets WHERE exercise_id = ?',
    exerciseId
  );
  const setIndex = (countRow?.count ?? 0) + 1;
  const id = createId();

  await db.runAsync(
    `INSERT INTO sets
      (id, exercise_id, set_index, weight, reps, unit, rpe, is_warmup)
     VALUES (?, ?, ?, ?, ?, ?, NULL, 0)`,
    id,
    exerciseId,
    setIndex,
    weight,
    reps,
    unit
  );

  return id;
}

export async function updateSet(
  db: SQLiteDatabase,
  setId: string,
  patch: Partial<Pick<WorkoutSet, 'weight' | 'reps' | 'unit'>>
): Promise<void> {
  const current = await db.getFirstAsync<{
    id: string;
    exercise_id: string;
    set_index: number;
    weight: number;
    reps: number;
    unit: WeightUnit;
    rpe: number | null;
    is_warmup: number;
  }>('SELECT * FROM sets WHERE id = ?', setId);

  if (!current) {
    return;
  }

  await db.runAsync(
    `UPDATE sets SET weight = ?, reps = ?, unit = ? WHERE id = ?`,
    patch.weight ?? current.weight,
    patch.reps ?? current.reps,
    patch.unit ?? current.unit,
    setId
  );
}

export async function deleteSet(
  db: SQLiteDatabase,
  setId: string
): Promise<void> {
  const row = await db.getFirstAsync<{ exercise_id: string }>(
    'SELECT exercise_id FROM sets WHERE id = ?',
    setId
  );
  if (!row) {
    return;
  }

  await db.runAsync('DELETE FROM sets WHERE id = ?', setId);

  const remaining = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM sets WHERE exercise_id = ? ORDER BY set_index ASC',
    row.exercise_id
  );

  for (let i = 0; i < remaining.length; i++) {
    await db.runAsync(
      'UPDATE sets SET set_index = ? WHERE id = ?',
      i + 1,
      remaining[i].id
    );
  }
}
