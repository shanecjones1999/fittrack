import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
import {
  Lora_400Regular,
  Lora_600SemiBold,
} from '@expo-google-fonts/lora';
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
} from '@expo-google-fonts/ibm-plex-mono';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SQLiteProvider } from 'expo-sqlite';

import { SettingsProvider, useSettings } from './src/context/SettingsContext';
import { migrateDb } from './src/db/migrate';
import { RootNavigator } from './src/navigation/RootNavigator';
import { theme as bootTheme } from './src/theme';

function AppChrome() {
  const { ready, theme } = useSettings();

  if (!ready) {
    return (
      <View
        style={[styles.boot, { backgroundColor: theme.colors.background }]}
      >
        <ActivityIndicator color={theme.colors.accent} />
        <StatusBar style={theme.colorScheme === 'dark' ? 'light' : 'dark'} />
      </View>
    );
  }

  return (
    <>
      <RootNavigator />
      <StatusBar style={theme.colorScheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Lora_400Regular,
    Lora_600SemiBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  if (!fontsLoaded) {
    return (
      <View
        style={[styles.boot, { backgroundColor: bootTheme.colors.background }]}
      >
        <ActivityIndicator color={bootTheme.colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="fittrack.db" onInit={migrateDb}>
        <SettingsProvider>
          <AppChrome />
        </SettingsProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
