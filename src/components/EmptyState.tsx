import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/SettingsContext';
import type { AppTheme } from '../theme';

type EmptyStateProps = {
  title: string;
  subtitle?: string;
};

export function EmptyState({ title, subtitle }: EmptyStateProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xl * 2,
      alignItems: 'center',
    },
    title: {
      fontFamily: theme.fonts.serif,
      fontSize: theme.fontSizes.xl,
      color: theme.colors.foreground,
      textAlign: 'center',
    },
    subtitle: {
      marginTop: theme.spacing.sm,
      fontFamily: theme.fonts.sans,
      fontSize: theme.fontSizes.md,
      color: theme.colors.mutedForeground,
      textAlign: 'center',
      lineHeight: 22,
    },
  });
}
