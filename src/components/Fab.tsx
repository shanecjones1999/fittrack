import { Pressable, StyleSheet, Text } from 'react-native';

import { theme } from '../theme';

type FabProps = {
  onPress: () => void;
  label?: string;
};

export function Fab({ onPress, label = '+' }: FabProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add workout"
      onPress={onPress}
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: theme.spacing.lg,
    bottom: theme.spacing.lg,
    width: 56,
    height: 56,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    color: theme.colors.accentForeground,
    fontFamily: theme.fonts.sansSemiBold,
    fontSize: 28,
    lineHeight: 32,
    marginTop: -2,
  },
});
