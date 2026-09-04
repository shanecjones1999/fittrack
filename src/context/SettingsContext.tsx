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

import {
  getSettings,
  setColorScheme as persistColorScheme,
  setTrackEnergyLevel as persistTrackEnergyLevel,
  setWeightUnit as persistWeightUnit,
} from '../db/settings';
import type { ColorScheme, WeightUnit } from '../db/types';
import { createTheme, type AppTheme } from '../theme';

type SettingsContextValue = {
  ready: boolean;
  unitsChosen: boolean;
  weightUnit: WeightUnit | null;
  trackEnergyLevel: boolean;
  colorScheme: ColorScheme;
  theme: AppTheme;
  chooseUnit: (unit: WeightUnit) => Promise<void>;
  setTrackEnergyLevel: (enabled: boolean) => Promise<void>;
  setColorScheme: (scheme: ColorScheme) => Promise<void>;
  refresh: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [ready, setReady] = useState(false);
  const [unitsChosen, setUnitsChosen] = useState(false);
  const [weightUnit, setWeightUnit] = useState<WeightUnit | null>(null);
  const [trackEnergyLevel, setTrackEnergyLevelState] = useState(false);
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('light');

  const refresh = useCallback(async () => {
    const settings = await getSettings(db);
    setUnitsChosen(settings.unitsChosen);
    setWeightUnit(settings.weightUnit);
    setTrackEnergyLevelState(settings.trackEnergyLevel);
    setColorSchemeState(settings.colorScheme);
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

  const setTrackEnergyLevel = useCallback(
    async (enabled: boolean) => {
      await persistTrackEnergyLevel(db, enabled);
      setTrackEnergyLevelState(enabled);
    },
    [db]
  );

  const setColorScheme = useCallback(
    async (scheme: ColorScheme) => {
      await persistColorScheme(db, scheme);
      setColorSchemeState(scheme);
    },
    [db]
  );

  const theme = useMemo(() => createTheme(colorScheme), [colorScheme]);

  const value = useMemo(
    () => ({
      ready,
      unitsChosen,
      weightUnit,
      trackEnergyLevel,
      colorScheme,
      theme,
      chooseUnit,
      setTrackEnergyLevel,
      setColorScheme,
      refresh,
    }),
    [
      ready,
      unitsChosen,
      weightUnit,
      trackEnergyLevel,
      colorScheme,
      theme,
      chooseUnit,
      setTrackEnergyLevel,
      setColorScheme,
      refresh,
    ]
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

export function useTheme(): AppTheme {
  return useSettings().theme;
}
