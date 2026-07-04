import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#1A1A1A', borderTopColor: '#2E2E2E' },
        tabBarActiveTintColor: '#C8F135',
        tabBarInactiveTintColor: '#555555',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Workouts' }}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: 'Fortschritt' }}
      />
    </Tabs>
  );
}