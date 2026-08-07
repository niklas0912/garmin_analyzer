import { Tabs } from 'expo-router';

/**
 * TabLayout
 *
 * Layout für die untere Tab-Navigation der App (Ordner "(tabs)").
 * Definiert die beiden Haupt-Tabs "Workouts" und "Fortschritt" sowie
 * das gemeinsame Styling der Tab-Bar im dunklen App-Design.
 */
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        // Eigene Header werden ausgeblendet, jeder Screen kümmert sich selbst darum
        headerShown: false,
        // Dunkles Tab-Bar-Design passend zum Rest der App
        tabBarStyle: { backgroundColor: '#1A1A1A', borderTopColor: '#2E2E2E' },
        // Akzentfarbe für den aktiven Tab (Grün-Ton wie z.B. "schnelle" Runden)
        tabBarActiveTintColor: '#C8F135',
        // Gedämpfte Farbe für inaktive Tabs
        tabBarInactiveTintColor: '#555555',
      }}
    >
      {/* Startbildschirm: Liste aller erfassten Workouts */}
      <Tabs.Screen
        name="index"
        options={{ title: 'Workouts' }}
      />

      {/* Fortschritts-Screen: Verlauf/Statistiken über mehrere Sessions hinweg
      <Tabs.Screen
        name="explore"
        options={{ title: 'Fortschritt' }}
      /> */}
    </Tabs>
  );
}