import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';

import { useSettings } from '../context/SettingsContext';
import {
  deleteCatalogEntry,
  listCustomCatalogEntries,
  renameCatalogEntry,
} from '../db/catalog';
import {
  addLocation,
  deleteLocation,
  listLocations,
} from '../db/locations';
import type {
  ExerciseCatalogEntry,
  SavedLocation,
  WeightUnit,
} from '../db/types';
import type { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const UNITS: WeightUnit[] = ['lbs', 'kg'];

export function SettingsScreen(_props: Props) {
  const db = useSQLiteContext();
  const { weightUnit, chooseUnit } = useSettings();
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [customExercises, setCustomExercises] = useState<ExerciseCatalogEntry[]>(
    []
  );
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const load = useCallback(async () => {
    const [nextLocations, nextExercises] = await Promise.all([
      listLocations(db),
      listCustomCatalogEntries(db),
    ]);
    setLocations(nextLocations);
    setCustomExercises(nextExercises);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onAddLocation = async () => {
    const name = draft.trim();
    if (!name || adding) return;
    setAdding(true);
    try {
      await addLocation(db, name);
      setDraft('');
      await load();
    } finally {
      setAdding(false);
    }
  };

  const onRemoveLocation = async (id: string) => {
    await deleteLocation(db, id);
    await load();
  };

  const startRenameExercise = (entry: ExerciseCatalogEntry) => {
    setRenamingId(entry.id);
    setRenameDraft(entry.name);
  };

  const commitRenameExercise = async () => {
    if (!renamingId) return;
    const next = renameDraft.trim();
    const id = renamingId;
    setRenamingId(null);
    if (!next) return;
    await renameCatalogEntry(db, id, next);
    await load();
  };

  const onRemoveExercise = (entry: ExerciseCatalogEntry) => {
    Alert.alert(
      'Remove exercise?',
      `“${entry.name}” will no longer appear in typeahead. Past workouts keep the name they logged.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              if (renamingId === entry.id) {
                setRenamingId(null);
              }
              await deleteCatalogEntry(db, entry.id);
              await load();
            })();
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      <Text style={styles.sectionLabel}>Weight units</Text>
      <View style={styles.row}>
        {UNITS.map((unit) => {
          const selected = weightUnit === unit;
          return (
            <Pressable
              key={unit}
              onPress={() => void chooseUnit(unit)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {unit}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.help}>
        New sets use this unit. Existing sets keep the unit they were logged with.
      </Text>

      <Text style={[styles.sectionLabel, styles.sectionGap]}>Locations</Text>
      <Text style={styles.helpTop}>
        Saved places appear as chips when logging a workout. You can still type a
        one-off location there.
      </Text>

      {locations.map((location) => (
        <View key={location.id} style={styles.listRow}>
          <Text style={styles.listName}>{location.name}</Text>
          <Pressable
            onPress={() => void onRemoveLocation(location.id)}
            hitSlop={8}
            style={styles.removeBtn}
          >
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        </View>
      ))}

      <View style={styles.addRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => void onAddLocation()}
          placeholder="Home Gym, Planet Fitness…"
          placeholderTextColor={theme.colors.mutedForeground}
          style={styles.input}
          returnKeyType="done"
        />
        <Pressable
          onPress={() => void onAddLocation()}
          disabled={!draft.trim() || adding}
          style={[
            styles.addBtn,
            (!draft.trim() || adding) && styles.addBtnDisabled,
          ]}
        >
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>

      <Text style={[styles.sectionLabel, styles.sectionGap]}>
        Custom exercises
      </Text>
      <Text style={styles.helpTop}>
        Names you’ve typed while logging. Rename typos or remove ones you don’t
        want in typeahead. Built-in lifts stay available.
      </Text>

      {customExercises.length === 0 ? (
        <Text style={styles.empty}>No custom exercises yet.</Text>
      ) : (
        customExercises.map((entry) => (
          <View key={entry.id} style={styles.listRow}>
            {renamingId === entry.id ? (
              <TextInput
                autoFocus
                value={renameDraft}
                onChangeText={setRenameDraft}
                onBlur={() => void commitRenameExercise()}
                onSubmitEditing={() => void commitRenameExercise()}
                placeholder="Exercise name"
                placeholderTextColor={theme.colors.mutedForeground}
                style={styles.renameInput}
                returnKeyType="done"
              />
            ) : (
              <>
                <Text style={styles.listName}>{entry.name}</Text>
                <Pressable
                  onPress={() => startRenameExercise(entry)}
                  hitSlop={10}
                  style={styles.editBtn}
                  accessibilityLabel={`Rename ${entry.name}`}
                >
                  <Text style={styles.editIcon}>✎</Text>
                </Pressable>
              </>
            )}
            <Pressable
              onPress={() => onRemoveExercise(entry)}
              hitSlop={8}
              style={styles.removeBtn}
            >
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  sectionLabel: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: theme.spacing.sm,
  },
  sectionGap: {
    marginTop: theme.spacing.xl,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  option: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.muted,
    alignItems: 'center',
  },
  optionSelected: {
    backgroundColor: theme.colors.accent,
  },
  optionText: {
    fontFamily: theme.fonts.monoMedium,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.foreground,
  },
  optionTextSelected: {
    color: theme.colors.accentForeground,
  },
  help: {
    marginTop: theme.spacing.md,
    fontFamily: theme.fonts.sans,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.mutedForeground,
    lineHeight: 20,
  },
  helpTop: {
    fontFamily: theme.fonts.sans,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.mutedForeground,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  empty: {
    fontFamily: theme.fonts.sans,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.mutedForeground,
    fontStyle: 'italic',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  listName: {
    flex: 1,
    fontFamily: theme.fonts.sans,
    fontSize: theme.fontSizes.md,
    color: theme.colors.foreground,
  },
  editBtn: {
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  editIcon: {
    fontFamily: theme.fonts.sans,
    fontSize: theme.fontSizes.md,
    color: theme.colors.mutedForeground,
    lineHeight: 20,
  },
  renameInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
    fontFamily: theme.fonts.sans,
    fontSize: theme.fontSizes.md,
    color: theme.colors.foreground,
  },
  removeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  removeText: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.mutedForeground,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontFamily: theme.fonts.sans,
    fontSize: theme.fontSizes.md,
    color: theme.colors.foreground,
  },
  addBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accent,
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  addBtnText: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: theme.fontSizes.md,
    color: theme.colors.accentForeground,
  },
});
