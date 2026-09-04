export type WeightUnit = 'lbs' | 'kg';

export type ColorScheme = 'light' | 'dark';

export type WorkoutDay = {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string | null; // HH:MM (24h), optional
  label: string;
  location: string | null;
  energyLevel: number | null; // 1–10, optional
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Exercise = {
  id: string;
  workoutId: string;
  catalogId: string | null;
  name: string;
  sortOrder: number;
};

export type WorkoutSet = {
  id: string;
  exerciseId: string;
  setIndex: number;
  weight: number;
  reps: number;
  unit: WeightUnit;
  rpe: number | null;
  isWarmup: number; // SQLite boolean 0/1
};

export type ExerciseCatalogEntry = {
  id: string;
  name: string;
  isSeeded: number;
  useCount: number;
  lastUsedAt: string | null;
};

export type SavedLocation = {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
};

export type AppSettings = {
  weightUnit: WeightUnit | null;
  unitsChosen: boolean;
  trackEnergyLevel: boolean;
  colorScheme: ColorScheme;
};

export type WorkoutDaySummary = WorkoutDay & {
  exerciseNames: string;
  setCount: number;
};
