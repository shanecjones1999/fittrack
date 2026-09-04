import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';

import { EmptyState } from '../components/EmptyState';
import { Fab } from '../components/Fab';
import { SwipeableRow } from '../components/SwipeableRow';
import {
  createWorkout,
  deleteWorkout,
  listWorkoutSummaries,
} from '../db/workouts';
import type { WorkoutDaySummary } from '../db/types';
import { useTheme } from '../context/SettingsContext';
import type { RootStackParamList } from '../navigation/types';
import type { AppTheme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

type Section = {
  title: string;
  data: WorkoutDaySummary[];
};

function monthTitle(dateIso: string): string {
  const [y, m] = dateIso.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function weekdayLabel(dateIso: string): string {
  const [y, m, day] = dateIso.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
}

function formatTime(startTime: string | null): string | null {
  if (!startTime) return null;
  const [h, min] = startTime.split(':').map(Number);
  const d = new Date();
  d.setHours(h, min, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function groupByMonth(workouts: WorkoutDaySummary[]): Section[] {
  const map = new Map<string, WorkoutDaySummary[]>();
  for (const w of workouts) {
    const key = monthTitle(w.date);
    const list = map.get(key) ?? [];
    list.push(w);
    map.set(key, list);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

export function HistoryScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const db = useSQLiteContext();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const rows = await listWorkoutSummaries(db);
    setSections(groupByMonth(rows));
    setLoading(false);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onAddWorkout = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const workout = await createWorkout(db);
      navigation.navigate('Workout', { workoutId: workout.id });
    } finally {
      setCreating(false);
    }
  };

  const confirmDelete = (item: WorkoutDaySummary) => {
    const title = item.label.trim() || 'Untitled';
    Alert.alert(
      'Delete workout?',
      `“${title}” and all of its exercises and sets will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await deleteWorkout(db, item.id);
              await load();
            })();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      {loading ? (
        <ActivityIndicator color={theme.colors.accent} style={styles.loader} />
      ) : sections.length === 0 ? (
        <EmptyState
          title="No workouts yet"
          subtitle="Tap + to log your first session. Keep it simple — label, exercises, sets."
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={styles.month}>{section.title}</Text>
          )}
          renderItem={({ item, index, section }) => {
            const sameDateCount = section.data.filter((w) => w.date === item.date)
              .length;
            const showTime = sameDateCount > 1;
            const time = formatTime(item.startTime);

            return (
              <SwipeableRow
                onDelete={() => confirmDelete(item)}
                onPress={() =>
                  navigation.navigate('Workout', { workoutId: item.id })
                }
              >
                <View
                  style={[
                    styles.row,
                    index < section.data.length - 1 && styles.rowBorder,
                  ]}
                >
                  <View style={styles.rowTop}>
                    <Text style={styles.weekday}>
                      {showTime && time ? time : weekdayLabel(item.date)}
                    </Text>
                    <Text style={styles.label}>
                      {item.label.trim() || 'Untitled'}
                    </Text>
                    {item.location ? (
                      <Text style={styles.location} numberOfLines={1}>
                        {item.location}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.exerciseNames
                      ? `${item.exerciseNames}  ·  ${item.setCount} sets`
                      : 'No exercises yet'}
                  </Text>
                </View>
              </SwipeableRow>
            );
          }}
          ItemSeparatorComponent={() => null}
        />
      )}

      <Fab onPress={() => void onAddWorkout()} />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loader: {
    marginTop: theme.spacing.xl * 2,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 96,
  },
  month: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    fontFamily: theme.fonts.serif,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.foreground,
  },
  row: {
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.spacing.sm,
  },
  weekday: {
    width: 72,
    fontFamily: theme.fonts.sansMedium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.mutedForeground,
  },
  label: {
    fontFamily: theme.fonts.serif,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.foreground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  location: {
    flex: 1,
    textAlign: 'right',
    fontFamily: theme.fonts.sans,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.mutedForeground,
  },
  meta: {
    marginTop: 4,
    marginLeft: 72 + theme.spacing.sm,
    fontFamily: theme.fonts.sans,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.mutedForeground,
  },
});
}
