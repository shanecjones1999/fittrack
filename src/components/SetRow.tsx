import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { WorkoutSet } from '../db/types';
import { theme } from '../theme';

type Props = {
  set: WorkoutSet;
  onChange: (patch: { weight: number; reps: number }) => void;
  onRemove?: () => void;
};

/** Weight is added load; 0 means bodyweight. */
export function displayWeight(weight: number): string {
  return weight === 0 ? 'BW' : String(weight);
}

function displayReps(n: number): string {
  return n === 0 ? '' : String(n);
}

export function parseWeight(text: string): number {
  const t = text.trim().toLowerCase();
  if (!t || t === 'bw' || t === 'bodyweight' || t === 'body' || t === '+') {
    return 0;
  }
  const cleaned = t.replace(/^\+/, '').replace(/[^\d.]/g, '');
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseReps(text: string): number {
  const cleaned = text.replace(/[^\d]/g, '');
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/**
 * Parse shorthand into added-load weight × reps.
 * Supports: 225x5, +25x8, bwx10, bw x 10, bodyweight*8
 */
export function parseSetShorthand(
  text: string
): { weight: number; reps: number } | null {
  const match = text
    .trim()
    .match(/^(bw|bodyweight|\+?\d+(?:\.\d+)?)\s*[x*×]\s*(\d+)$/i);
  if (!match) {
    // Also allow "bw 10" / "25 8" (space as separator)
    const spaceMatch = text
      .trim()
      .match(/^(bw|bodyweight|\+?\d+(?:\.\d+)?)\s+(\d+)$/i);
    if (!spaceMatch) return null;
    return {
      weight: parseWeight(spaceMatch[1]),
      reps: Number(spaceMatch[2]),
    };
  }
  return {
    weight: parseWeight(match[1]),
    reps: Number(match[2]),
  };
}

export function SetRow({ set, onChange, onRemove }: Props) {
  const [weightText, setWeightText] = useState(displayWeight(set.weight));
  const [repsText, setRepsText] = useState(displayReps(set.reps));

  useEffect(() => {
    setWeightText(displayWeight(set.weight));
    setRepsText(displayReps(set.reps));
  }, [set.id, set.weight, set.reps]);

  const commit = (nextWeight: string, nextReps: string) => {
    const shorthand = parseSetShorthand(nextWeight);
    if (shorthand) {
      setWeightText(displayWeight(shorthand.weight));
      setRepsText(displayReps(shorthand.reps));
      onChange(shorthand);
      return;
    }
    const weight = parseWeight(nextWeight);
    const reps = parseReps(nextReps);
    setWeightText(displayWeight(weight));
    setRepsText(displayReps(reps));
    onChange({ weight, reps });
  };

  return (
    <View style={styles.row}>
      <Text style={styles.index}>{set.setIndex}</Text>
      <TextInput
        value={weightText}
        onChangeText={setWeightText}
        onBlur={() => commit(weightText, repsText)}
        onSubmitEditing={() => commit(weightText, repsText)}
        placeholder="BW"
        placeholderTextColor={theme.colors.mutedForeground}
        keyboardType="decimal-pad"
        returnKeyType="next"
        style={styles.input}
        selectTextOnFocus
      />
      <Text style={styles.times}>×</Text>
      <TextInput
        value={repsText}
        onChangeText={setRepsText}
        onBlur={() => commit(weightText, repsText)}
        onSubmitEditing={() => commit(weightText, repsText)}
        placeholder="0"
        placeholderTextColor={theme.colors.mutedForeground}
        keyboardType="number-pad"
        returnKeyType="done"
        style={styles.input}
        selectTextOnFocus
      />
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={10} style={styles.remove}>
          <Text style={styles.removeText}>✕</Text>
        </Pressable>
      ) : (
        <View style={styles.removeSpacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: 6,
  },
  index: {
    width: 24,
    fontFamily: theme.fonts.mono,
    fontSize: theme.fontSizes.md,
    color: theme.colors.mutedForeground,
  },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 10,
    fontFamily: theme.fonts.mono,
    fontSize: theme.fontSizes.md,
    color: theme.colors.foreground,
    textAlign: 'center',
  },
  times: {
    fontFamily: theme.fonts.sans,
    fontSize: theme.fontSizes.md,
    color: theme.colors.mutedForeground,
  },
  remove: {
    width: 28,
    alignItems: 'center',
  },
  removeSpacer: {
    width: 28,
  },
  removeText: {
    fontFamily: theme.fonts.sans,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.mutedForeground,
  },
});
