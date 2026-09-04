import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useSettings, useTheme } from '../context/SettingsContext';
import type { WeightUnit } from '../db/types';
import type { RootStackParamList } from '../navigation/types';
import type { AppTheme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'UnitPicker'>;

const UNITS: { unit: WeightUnit; blurb: string }[] = [
  { unit: 'lbs', blurb: 'Pounds — common in US gyms' },
  { unit: 'kg', blurb: 'Kilograms — common elsewhere' },
];

export function UnitPickerScreen(_props: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { chooseUnit } = useSettings();

  return (
    <View style={styles.screen}>
      <Text style={styles.brand}>FitTrack</Text>
      <Text style={styles.title}>Which units do you lift in?</Text>
      <Text style={styles.subtitle}>
        You can change this anytime in Settings. Sets always store the unit you
        logged them with.
      </Text>

      <View style={styles.options}>
        {UNITS.map(({ unit, blurb }) => (
          <Pressable
            key={unit}
            onPress={() => void chooseUnit(unit)}
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
          >
            <Text style={styles.optionUnit}>{unit}</Text>
            <Text style={styles.optionBlurb}>{blurb}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl * 2,
  },
  brand: {
    fontFamily: theme.fonts.serif,
    fontSize: theme.fontSizes.xxl,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontFamily: theme.fonts.serif,
    fontSize: theme.fontSizes.xl,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontFamily: theme.fonts.sans,
    fontSize: theme.fontSizes.md,
    color: theme.colors.mutedForeground,
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
  },
  options: {
    gap: theme.spacing.md,
  },
  option: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
  },
  optionPressed: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.muted,
  },
  optionUnit: {
    fontFamily: theme.fonts.monoMedium,
    fontSize: theme.fontSizes.xl,
    color: theme.colors.accent,
    marginBottom: 4,
  },
  optionBlurb: {
    fontFamily: theme.fonts.sans,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.mutedForeground,
  },
});
}
