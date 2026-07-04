import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const WORKOUT_TYPES = [
  { name: 'Intervalle 400m', color: '#C8F135' },
  { name: 'Intervalle 6min', color: '#4DB8FF' },
  { name: 'Intervalle all Out', color: '#FF4D4D' },
];

export default function WorkoutsScreen() {
  return (
    <View style={s.container}>
      <Text style={s.title}>Garmin Analyzer</Text>
      <Text style={s.subtitle}>Wähle einen Workout-Typ</Text>

      {WORKOUT_TYPES.map(workout => (
        <TouchableOpacity
          key={workout.name}
          style={[s.card, { borderLeftColor: workout.color }]}
          onPress={() => router.push({ pathname: '/sessions', params: { workout: workout.name } })}
        >
          <Text style={[s.cardTitle, { color: workout.color }]}>{workout.name}</Text>
          <Text style={s.cardHint}>Tippen → Sessions · Lang drücken → Import</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D', padding: 16, paddingTop: 80 },
  title: { fontSize: 28, fontWeight: '800', color: '#F0F0F0', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#888888', marginBottom: 32 },
  card: {
    backgroundColor: '#222222',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  cardHint: { fontSize: 12, color: '#555555' },
});