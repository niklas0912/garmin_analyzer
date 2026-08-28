// da filename index.tsx: startseite
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { addWorkoutType, loadWorkoutTypes } from '../../utils/storage';

/*
router	Navigation
StyleSheet	Styling
Text	Text anzeigen
TouchableOpacity	Klick-/Touch-Element
View	Container/Layout
*/

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
  


type WorkoutType = { name: string; color: string };

// Feste Farbauswahl für neue Typen (statt freier Farbwahl, einfacher für den Nutzer)
const COLOR_CHOICES = ['#C8F135', '#4DB8FF', '#FF4D4D', '#A78BFA', '#F59E0B'];

export default function WorkoutsScreen() {
  const [types, setTypes] = useState<WorkoutType[]>([]);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    loadWorkoutTypes().then(setTypes);
  }, []);

  async function handleAdd() {
    if (!newName.trim()) return;
    const color = COLOR_CHOICES[types.length % COLOR_CHOICES.length];
    const updated = await addWorkoutType({ name: newName.trim(), color });
    setTypes(updated);
    setNewName('');
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>Garmin Analyzer</Text>
      <Text style={s.subtitle}>Choose or add a workout type</Text>

      {types.map(workout => (
        <TouchableOpacity
          key={workout.name}
          style={[s.card, { borderLeftColor: workout.color }]}
          onPress={() => router.push({ pathname: '/sessions', params: { workout: workout.name } })}
        >
          <Text style={[s.cardTitle, { color: workout.color }]}>{workout.name}</Text>
          {/* <Text style={s.cardHint}>Tippen → Sessions · Lang drücken → Import</Text> */}
        </TouchableOpacity>
      ))}

      {/* Neuen Typ hinzufügen */}
      <View style={s.addRow}>
        <TextInput
          style={s.input}
          placeholder="Add new workout type..."
          placeholderTextColor="#555555"
          value={newName}
          onChangeText={setNewName}
        />
        <TouchableOpacity style={s.addButton} onPress={handleAdd}>
          <Text style={s.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>
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
  addRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
input: {
  flex: 1, backgroundColor: '#1A1A1A', borderRadius: 8,
  padding: 12, color: '#F0F0F0', borderWidth: 1, borderColor: '#2E2E2E',
},
addButton: {
  backgroundColor: '#222222', borderRadius: 8, paddingHorizontal: 20,
  justifyContent: 'center', borderWidth: 1, borderColor: '#C8F135',
},
addButtonText: { color: '#C8F135', fontSize: 20, fontWeight: '700' },
});

