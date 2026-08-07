import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/**
 * Definiert die auswählbaren Workout-Typen auf dem Startbildschirm.
 * Jeder Typ hat einen Namen (dient gleichzeitig als Identifikator beim
 * Filtern der Sessions) und eine Akzentfarbe für die Kartendarstellung.
 */
const WORKOUT_TYPES = [
  { name: 'Intervalle 400m', color: '#C8F135' },
  { name: 'Intervalle 6min', color: '#4DB8FF' },
  { name: 'Intervalle all Out', color: '#FF4D4D' },
];

/**
 * WorkoutsScreen
 *
 * Startbildschirm der App. Zeigt eine Liste der verfügbaren
 * Workout-Typen als antippbare Karten an. Ein Tap navigiert zur
 * Sessions-Übersicht des jeweiligen Typs (Route "/sessions" mit dem
 * Workout-Namen als Parameter).
 *
 * Hinweis: Der Hinweistext auf den Karten ("Lang drücken → Import")
 * deutet auf eine Long-Press-Funktion zum Importieren hin, die aktuell
 * aber noch nicht implementiert ist (kein onLongPress-Handler vorhanden).
 */
export default function WorkoutsScreen() {
  return (
    <View style={s.container}>
      <Text style={s.title}>Garmin Analyzer</Text>
      <Text style={s.subtitle}>Wähle einen Workout-Typ</Text>

      {/* Eine Karte pro Workout-Typ, farblich passend zum jeweiligen Typ */}
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

// Styles im dunklen Design des restlichen Apps
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