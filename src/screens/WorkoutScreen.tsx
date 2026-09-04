import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';

import { SetRow } from '../components/SetRow';
import { useSettings, useTheme } from '../context/SettingsContext';
import {
  addCatalogEntry,
  bumpCatalogUsage,
  searchCatalog,
} from '../db/catalog';
import { addLocation, listLocations } from '../db/locations';
import {
  addExercise,
  addSet,
  deleteExercise,
  deleteSet,
  getWorkout,
  listExercisesWithSets,
  reorderExercises,
  updateExercise,
  updateSet,
  updateWorkout,
  type ExerciseWithSets,
} from '../db/workouts';
import type {
  ExerciseCatalogEntry,
  SavedLocation,
  WorkoutDay,
} from '../db/types';
import type { RootStackParamList } from '../navigation/types';
import type { AppTheme } from '../theme';
import { formatWorkoutDateTitle } from '../utils/date';

const LABEL_PRESETS = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full'];

type Props = NativeStackScreenProps<RootStackParamList, 'Workout'>;

export function WorkoutScreen({ navigation, route }: Props) {
  const { workoutId } = route.params;
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { weightUnit, trackEnergyLevel } = useSettings();
  const unit = weightUnit ?? 'lbs';

  const [workout, setWorkout] = useState<WorkoutDay | null>(null);
  const [exercises, setExercises] = useState<ExerciseWithSets[]>([]);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [exerciseQuery, setExerciseQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ExerciseCatalogEntry[]>([]);
  const [showTypeahead, setShowTypeahead] = useState(false);
  const [addingExercise, setAddingExercise] = useState(false);
  const [customLabelOpen, setCustomLabelOpen] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [customLocationOpen, setCustomLocationOpen] = useState(false);
  const [customLocation, setCustomLocation] = useState('');
  const [renamingExerciseId, setRenamingExerciseId] = useState<string | null>(
    null
  );
  const [renameDraft, setRenameDraft] = useState('');

  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    const row = await getWorkout(db, workoutId);
    setWorkout(row);
    setSavedLocations(await listLocations(db));
    if (row) {
      navigation.setOptions({
        title: formatWorkoutDateTitle(row.date),
      });
      setExercises(await listExercisesWithSets(db, workoutId));
      if (row.label && !LABEL_PRESETS.includes(row.label)) {
        setCustomLabel(row.label);
      }
    }
  }, [db, navigation, workoutId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!showTypeahead) return;
    void searchCatalog(db, exerciseQuery).then(setSuggestions);
  }, [db, exerciseQuery, showTypeahead]);

  const persistPatch = async (
    patch: Partial<
      Pick<WorkoutDay, 'label' | 'location' | 'energyLevel' | 'notes' | 'date'>
    >
  ) => {
    await updateWorkout(db, workoutId, patch);
    await load();
  };

  const selectLabel = async (label: string) => {
    setCustomLabelOpen(false);
    await persistPatch({ label });
  };

  const commitCustomLabel = async () => {
    const next = customLabel.trim();
    if (!next) {
      setCustomLabelOpen(false);
      return;
    }
    setCustomLabelOpen(false);
    await persistPatch({ label: next });
  };

  const selectLocation = async (location: string) => {
    setCustomLocationOpen(false);
    await persistPatch({ location });
  };

  const commitCustomLocation = async () => {
    const next = customLocation.trim();
    if (!next) {
      setCustomLocationOpen(false);
      return;
    }
    setCustomLocationOpen(false);
    await addLocation(db, next);
    await persistPatch({ location: next });
  };

  const onAddExercise = async (name: string, catalogId: string | null) => {
    if (addingExercise) return;
    setAddingExercise(true);
    try {
      let resolvedCatalogId = catalogId;
      if (!resolvedCatalogId) {
        const entry = await addCatalogEntry(db, name);
        resolvedCatalogId = entry.id;
      }
      await addExercise(db, workoutId, name, resolvedCatalogId, unit);
      await bumpCatalogUsage(db, resolvedCatalogId);
      setExerciseQuery('');
      setShowTypeahead(false);
      await load();
    } finally {
      setAddingExercise(false);
    }
  };

  const openTypeahead = () => {
    setShowTypeahead(true);
    void searchCatalog(db, '').then(setSuggestions);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  };

  const onAddSet = async (exercise: ExerciseWithSets) => {
    const last = exercise.sets[exercise.sets.length - 1];
    await addSet(
      db,
      exercise.id,
      last?.weight ?? 0,
      last?.reps ?? 0,
      last?.unit ?? unit
    );
    await load();
  };

  const onUpdateSet = async (
    setId: string,
    patch: { weight: number; reps: number }
  ) => {
    await updateSet(db, setId, patch);
    await load();
  };

  const onRemoveSet = async (setId: string) => {
    await deleteSet(db, setId);
    await load();
  };

  const startRenameExercise = (exercise: ExerciseWithSets) => {
    setRenamingExerciseId(exercise.id);
    setRenameDraft(exercise.name);
  };

  const commitRenameExercise = async () => {
    if (!renamingExerciseId) return;
    const next = renameDraft.trim();
    const exerciseId = renamingExerciseId;
    setRenamingExerciseId(null);
    if (!next) {
      return;
    }
    const current = exercises.find((e) => e.id === exerciseId);
    if (current && current.name === next) {
      return;
    }
    const entry = await addCatalogEntry(db, next);
    await updateExercise(db, exerciseId, {
      name: next,
      catalogId: entry.id,
    });
    await bumpCatalogUsage(db, entry.id);
    await load();
  };

  const confirmDeleteExercise = (exercise: ExerciseWithSets) => {
    Alert.alert(
      'Delete exercise?',
      `“${exercise.name}” and its sets will be removed from this workout.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              if (renamingExerciseId === exercise.id) {
                setRenamingExerciseId(null);
              }
              await deleteExercise(db, exercise.id);
              await load();
            })();
          },
        },
      ]
    );
  };

  const moveExercise = (exerciseId: string, direction: -1 | 1) => {
    const index = exercises.findIndex((exercise) => exercise.id === exerciseId);
    if (index < 0) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= exercises.length) return;

    const next = [...exercises];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    setExercises(next);
    void reorderExercises(
      db,
      workoutId,
      next.map((exercise) => exercise.id)
    );
  };

  if (!workout) {
    return <View style={styles.screen} />;
  }

  const exactMatch = suggestions.some(
    (s) => s.name.toLowerCase() === exerciseQuery.trim().toLowerCase()
  );
  const labelIsCustom =
    Boolean(workout.label) && !LABEL_PRESETS.includes(workout.label);
  const savedLocationNames = savedLocations.map((l) => l.name);
  const locationIsCustom =
    Boolean(workout.location) &&
    !savedLocationNames.some(
      (name) => name.toLowerCase() === workout.location!.toLowerCase()
    );

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Text style={styles.sectionLabel}>Label</Text>
        <View style={styles.chipRow}>
          {LABEL_PRESETS.map((label) => {
            const selected = workout.label === label;
            return (
              <Pressable
                key={label}
                onPress={() => void selectLabel(label)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text
                  style={[styles.chipText, selected && styles.chipTextSelected]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => {
              setCustomLabelOpen(true);
              setCustomLabel(labelIsCustom ? workout.label : '');
            }}
            style={[
              styles.chip,
              (customLabelOpen || labelIsCustom) && styles.chipSelected,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                (customLabelOpen || labelIsCustom) && styles.chipTextSelected,
              ]}
            >
              {labelIsCustom && !customLabelOpen ? workout.label : '+'}
            </Text>
          </Pressable>
        </View>

        {customLabelOpen ? (
          <TextInput
            autoFocus
            value={customLabel}
            onChangeText={setCustomLabel}
            onBlur={() => void commitCustomLabel()}
            onSubmitEditing={() => void commitCustomLabel()}
            placeholder="Custom label"
            placeholderTextColor={theme.colors.mutedForeground}
            style={styles.input}
            returnKeyType="done"
          />
        ) : null}

        <Text style={styles.sectionLabel}>Location</Text>
        <View style={styles.chipRow}>
          {savedLocations.map((location) => {
            const selected =
              workout.location?.toLowerCase() === location.name.toLowerCase();
            return (
              <Pressable
                key={location.id}
                onPress={() => void selectLocation(location.name)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text
                  style={[styles.chipText, selected && styles.chipTextSelected]}
                >
                  {location.name}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => {
              setCustomLocationOpen(true);
              setCustomLocation(
                locationIsCustom ? (workout.location ?? '') : ''
              );
            }}
            style={[
              styles.chip,
              (customLocationOpen || locationIsCustom) && styles.chipSelected,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                (customLocationOpen || locationIsCustom) &&
                  styles.chipTextSelected,
              ]}
            >
              {locationIsCustom && !customLocationOpen
                ? workout.location
                : '+'}
            </Text>
          </Pressable>
        </View>

        {customLocationOpen ? (
          <TextInput
            autoFocus
            value={customLocation}
            onChangeText={setCustomLocation}
            onBlur={() => void commitCustomLocation()}
            onSubmitEditing={() => void commitCustomLocation()}
            placeholder="Home Gym, Planet Fitness…"
            placeholderTextColor={theme.colors.mutedForeground}
            style={styles.input}
            returnKeyType="done"
          />
        ) : null}

        {trackEnergyLevel ? (
          <>
            <Text style={styles.sectionLabel}>Energy</Text>
            <View style={styles.energyBar}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => {
                const selected = workout.energyLevel === level;
                return (
                  <Pressable
                    key={level}
                    onPress={() =>
                      void persistPatch({
                        energyLevel: selected ? null : level,
                      })
                    }
                    style={[
                      styles.energySegment,
                      selected && styles.energySegmentSelected,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Energy level ${level}`}
                    accessibilityState={{ selected }}
                  >
                    <Text
                      style={[
                        styles.energySegmentText,
                        selected && styles.energySegmentTextSelected,
                      ]}
                    >
                      {level}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Exercises</Text>

        {exercises.map((exercise, index) => (
          <View key={exercise.id} style={styles.exerciseBlock}>
            <View style={styles.exerciseHeader}>
              <View style={styles.reorderBtns}>
                <Pressable
                  onPress={() => moveExercise(exercise.id, -1)}
                  disabled={index === 0}
                  hitSlop={6}
                  style={styles.reorderBtn}
                  accessibilityLabel={`Move ${exercise.name} up`}
                >
                  <Text
                    style={[
                      styles.reorderIcon,
                      index === 0 && styles.reorderIconDisabled,
                    ]}
                  >
                    ↑
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => moveExercise(exercise.id, 1)}
                  disabled={index === exercises.length - 1}
                  hitSlop={6}
                  style={styles.reorderBtn}
                  accessibilityLabel={`Move ${exercise.name} down`}
                >
                  <Text
                    style={[
                      styles.reorderIcon,
                      index === exercises.length - 1 &&
                        styles.reorderIconDisabled,
                    ]}
                  >
                    ↓
                  </Text>
                </Pressable>
              </View>
              {renamingExerciseId === exercise.id ? (
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
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Pressable
                    onPress={() => startRenameExercise(exercise)}
                    hitSlop={10}
                    style={styles.editBtn}
                    accessibilityLabel={`Rename ${exercise.name}`}
                  >
                    <Text style={styles.editIcon}>✎</Text>
                  </Pressable>
                </>
              )}
              <Pressable
                onPress={() => confirmDeleteExercise(exercise)}
                hitSlop={8}
                style={styles.exerciseDelete}
              >
                <Text style={styles.exerciseDeleteText}>Delete</Text>
              </Pressable>
            </View>
            {exercise.sets.map((set) => (
              <SetRow
                key={set.id}
                set={set}
                onChange={(patch) => void onUpdateSet(set.id, patch)}
                onRemove={
                  exercise.sets.length > 1
                    ? () => void onRemoveSet(set.id)
                    : undefined
                }
              />
            ))}
            <Pressable
              onPress={() => void onAddSet(exercise)}
              style={styles.addSet}
            >
              <Text style={styles.addSetText}>+ Set</Text>
            </Pressable>
          </View>
        ))}

        {!showTypeahead ? (
          <Pressable onPress={openTypeahead} style={styles.addExercise}>
            <Text style={styles.addExerciseText}>+ Add Exercise</Text>
          </Pressable>
        ) : (
          <View style={styles.typeahead}>
            <TextInput
              autoFocus
              value={exerciseQuery}
              onChangeText={setExerciseQuery}
              onFocus={() => {
                requestAnimationFrame(() => {
                  scrollRef.current?.scrollToEnd({ animated: true });
                });
              }}
              placeholder="Search or type an exercise"
              placeholderTextColor={theme.colors.mutedForeground}
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={() => {
                const name = exerciseQuery.trim();
                if (name) void onAddExercise(name, null);
              }}
            />
            <View style={styles.suggestions}>
              {exerciseQuery.trim() && !exactMatch ? (
                <Pressable
                  onPress={() => void onAddExercise(exerciseQuery.trim(), null)}
                  style={styles.suggestionRow}
                >
                  <Text style={styles.suggestionPrimary}>
                    Add “{exerciseQuery.trim()}” as new exercise
                  </Text>
                </Pressable>
              ) : null}
              {suggestions.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => void onAddExercise(item.name, item.id)}
                  style={styles.suggestionRow}
                >
                  <Text style={styles.suggestionText}>{item.name}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => setShowTypeahead(false)}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 3,
  },
  sectionLabel: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.mutedForeground,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.muted,
  },
  chipSelected: {
    backgroundColor: theme.colors.accent,
  },
  chipText: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.foreground,
  },
  chipTextSelected: {
    color: theme.colors.accentForeground,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontFamily: theme.fonts.sans,
    fontSize: theme.fontSizes.md,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.lg,
  },
  energyBar: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: theme.spacing.lg,
  },
  energySegment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.muted,
  },
  energySegmentSelected: {
    backgroundColor: theme.colors.accent,
  },
  energySegmentText: {
    fontFamily: theme.fonts.monoMedium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.foreground,
  },
  energySegmentTextSelected: {
    color: theme.colors.accentForeground,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  exerciseBlock: {
    marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  reorderBtns: {
    flexDirection: 'column',
    marginLeft: -4,
    marginRight: 2,
  },
  reorderBtn: {
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  reorderIcon: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: 14,
    lineHeight: 16,
    color: theme.colors.mutedForeground,
  },
  reorderIconDisabled: {
    opacity: 0.25,
  },
  exerciseName: {
    flexShrink: 1,
    fontFamily: theme.fonts.serifRegular,
    fontSize: theme.fontSizes.lg,
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
    fontFamily: theme.fonts.serifRegular,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.foreground,
  },
  exerciseDelete: {
    marginLeft: 'auto',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  exerciseDeleteText: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.mutedForeground,
  },
  addSet: {
    alignSelf: 'flex-start',
    paddingVertical: theme.spacing.sm,
    marginTop: 4,
  },
  addSetText: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.accent,
  },
  addExercise: {
    paddingVertical: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    marginTop: theme.spacing.sm,
  },
  addExerciseText: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: theme.fontSizes.md,
    color: theme.colors.accent,
  },
  typeahead: {
    marginTop: theme.spacing.sm,
  },
  suggestions: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  suggestionRow: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  suggestionText: {
    fontFamily: theme.fonts.serifRegular,
    fontSize: theme.fontSizes.md,
    color: theme.colors.foreground,
  },
  suggestionPrimary: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: theme.fontSizes.md,
    color: theme.colors.accent,
  },
  cancel: {
    fontFamily: theme.fonts.sans,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.mutedForeground,
    paddingVertical: theme.spacing.sm,
  },
});
}
