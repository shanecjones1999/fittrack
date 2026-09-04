import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { getSettings, setWeightUnit as persistWeightUnit } from '../db/settings';
import type { WeightUnit } from '../db/types';

type SettingsContextValue = {
  ready: boolean;
  unitsChosen: boolean;
  weightUnit: WeightUnit | null;
  chooseUnit: (unit: WeightUnit) => Promise<void>;
  refresh: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [ready, setReady] = useState(false);
  const [unitsChosen, setUnitsChosen] = useState(false);
  const [weightUnit, setWeightUnit] = useState<WeightUnit | null>(null);

  const refresh = useCallback(async () => {
    const settings = await getSettings(db);
    setUnitsChosen(settings.unitsChosen);
    setWeightUnit(settings.weightUnit);
    setReady(true);
  }, [db]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const chooseUnit = useCallback(
    async (unit: WeightUnit) => {
      await persistWeightUnit(db, unit);
      setWeightUnit(unit);
      setUnitsChosen(true);
    },
    [db]
  );

  const value = useMemo(
    () => ({ ready, unitsChosen, weightUnit, chooseUnit, refresh }),
    [ready, unitsChosen, weightUnit, chooseUnit, refresh]
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
}
