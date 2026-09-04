import { Pressable, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useSettings } from '../context/SettingsContext';
import { HistoryScreen } from '../screens/HistoryScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { UnitPickerScreen } from '../screens/UnitPickerScreen';
import { WorkoutScreen } from '../screens/WorkoutScreen';
import { theme } from '../theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const headerOptions = {
  headerStyle: { backgroundColor: theme.colors.background },
  headerShadowVisible: false,
  headerTintColor: theme.colors.foreground,
  headerTitleStyle: {
    fontFamily: theme.fonts.serif,
    fontSize: theme.fontSizes.lg,
  },
  contentStyle: { backgroundColor: theme.colors.background },
};

function SettingsButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={12} style={styles.settingsBtn}>
      <Text style={styles.settingsText}>Settings</Text>
    </Pressable>
  );
}

export function RootNavigator() {
  const { ready, unitsChosen } = useSettings();

  if (!ready) {
    return null;
  }

  return (
    <NavigationContainer>
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

const styles = StyleSheet.create({
  settingsBtn: {
    paddingHorizontal: 4,
  },
  settingsText: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.accent,
  },
});
