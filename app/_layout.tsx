import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

// Legt fest, welche Route als "Anchor" (Ausgangspunkt) für die
// Deep-Link- bzw. Zurück-Navigation dient. Hier: die Tab-Navigation
// unter dem Ordner "(tabs)".
export const unstable_settings = {
  anchor: '(tabs)',
};

/**
 * RootLayout
 *
 * Wurzel-Layout der gesamten App (expo-router lädt diese Datei als
 * äußerstes Layout für alle Screens). Verantwortlich für:
 *
 * 1. Light/Dark-Theming: liest das System-Farbschema aus und stellt
 *    per ThemeProvider das passende Navigation-Theme (DarkTheme/
 *    DefaultTheme) für alle darunterliegenden Screens bereit.
 * 2. Globale Stack-Navigation: definiert die oberste Navigationsebene
 *    mit der Tab-Gruppe "(tabs)" als Hauptbereich (ohne eigenen Header,
 *    da die Tabs ihren eigenen Header verwalten) sowie einem "modal"-
 *    Screen, der als natives Modal über allem angezeigt wird.
 * 3. StatusBar-Styling: passt sich automatisch dem aktuellen Theme an
 *    (style="auto").
 */
export default function RootLayout() {
  // Aktuelles System-Farbschema ('light' | 'dark' | null/undefined)
  const colorScheme = useColorScheme();

  return (
    // Stellt Navigation-Farben (Hintergrund, Header, Border etc.)
    // passend zum Farbschema für alle verschachtelten Navigatoren bereit
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* Haupt-Tab-Navigation; eigener Header wird ausgeblendet,
            da die Tabs darunter ihre eigenen Header rendern */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Modal-Screen (z.B. für Einstellungen, Detail-Dialoge etc.),
            wird als natives Modal von unten eingeblendet */}
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>

      {/* Statusleiste passt Text-/Icon-Farbe automatisch an das aktuelle Theme an */}
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}