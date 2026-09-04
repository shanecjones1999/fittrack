import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useSettings, useTheme } from '../context/SettingsContext';
import { HistoryScreen } from '../screens/HistoryScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { UnitPickerScreen } from '../screens/UnitPickerScreen';
import { WorkoutScreen } from '../screens/WorkoutScreen';
import type { AppTheme } from '../theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function SettingsButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable onPress={onPress} hitSlop={12} style={styles.settingsBtn}>
      <Text style={styles.settingsText}>Settings</Text>
    </Pressable>
  );
}

export function RootNavigator() {
  const { unitsChosen, theme } = useSettings();

  const navigationTheme = useMemo(
    () => ({
      ...DefaultTheme,
      dark: theme.colorScheme === 'dark',
      colors: {
        ...DefaultTheme.colors,
        primary: theme.colors.accent,
        background: theme.colors.background,
        card: theme.colors.background,
        text: theme.colors.foreground,
        border: theme.colors.border,
        notification: theme.colors.accent,
      },
    }),
    [theme]
  );

  const headerOptions = useMemo(
    () => ({
      headerStyle: { backgroundColor: theme.colors.background },
      headerShadowVisible: false,
      headerTintColor: theme.colors.foreground,
      headerTitleStyle: {
        fontFamily: theme.fonts.serif,
        fontSize: theme.fontSizes.lg,
      },
      contentStyle: { backgroundColor: theme.colors.background },
    }),
    [theme]
  );

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={headerOptions}>
        {!unitsChosen ? (
          <Stack.Screen
            name="UnitPicker"
            component={UnitPickerScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="History"
              component={HistoryScreen}
              options={({ navigation }) => ({
                title: 'FitTrack',
                headerRight: () => (
                  <SettingsButton onPress={() => navigation.navigate('Settings')} />
                ),
              })}
            />
            <Stack.Screen
              name="Workout"
              component={WorkoutScreen}
              options={{ title: 'Workout' }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ title: 'Settings', presentation: 'modal' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    settingsBtn: {
      paddingHorizontal: 4,
    },
    settingsText: {
      fontFamily: theme.fonts.sansMedium,
      fontSize: theme.fontSizes.sm,
      color: theme.colors.accent,
    },
  });
}
