// da filename index.tsx: startseite
import { WorkoutType } from '@/utils/types';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { addWorkoutType, deleteWorkoutType, loadWorkoutTypes } from '../../utils/storage';

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
const WORKOUT_TYPES:WorkoutType[] = [
  { name: 'Intervalle 400m', color: '#C8F135', sports:"run" },
  { name: 'Intervalle 6min', color: '#4DB8FF', sports:"run" },
  { name: 'Intervalle all Out', color: '#FF4D4D',  sports:"run" },
];

const SPORTS_PRESET = ["run", "walk", "bike", "padel"]
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
  



// Feste Farbauswahl für neue Typen (statt freier Farbwahl, einfacher für den Nutzer)
const COLOR_CHOICES = ['#C8F135', '#4DB8FF', '#FF4D4D', '#A78BFA', '#F59E0B'];

export default function WorkoutsScreen() {
  const [types, setTypes] = useState<WorkoutType[]>([]);
  const [newName, setNewName] = useState('');
  const [newSports, setNewSports] = useState('');


    useFocusEffect(useCallback(() => {
    loadWorkoutTypes().then(setTypes);
  }, []));

  async function handleAdd() {
    if (!newName.trim()) return;
    const color = COLOR_CHOICES[types.length % COLOR_CHOICES.length];
    const updated = await addWorkoutType({ name: newName.trim(), color ,sports: newSports.trim() });
    setTypes(updated);
    setNewName('');
        setNewSports('');

  }


function handleDelete(wt: WorkoutType) {
  Alert.alert(
    'Delete Workout Type',
    `Are you sure you want to delete "${wt.name}"? This cannot be undone.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = await deleteWorkoutType(wt);
          setTypes(updated);
        },
      },
    ]
  );
}
  return (
    <ScrollView>
    <View style={s.container}>
          
         <View style={{ flexDirection: 'row', gap: 15 }}>
          <View style={{flex:1}}>
         <Text style={s.title}>Garmin Analyzer</Text>
         <Text style={s.subtitle}>Choose or add a workout </Text>

         </View>
         <View style={{flex:0.4}}>
              <TouchableOpacity
                style={[s.button, { borderColor: '#4DB8FF', marginBottom: 24 }]}
                onPress={() => router.push({ pathname: '/settings'})}
              >
                  <Ionicons name="settings-outline" size={30} color="#333333" />
              </TouchableOpacity>
      </View>
     
      </View>

      {types.map(workout => (
        <TouchableOpacity
          key={workout.name}
          style={[s.card, { borderLeftColor: workout.color }]}
          onPress={() => router.push({ pathname: '/sessions', params: { workout: workout.name } })}
            onLongPress={() => handleDelete(workout)}
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
                <TextInput
          style={s.input}
          placeholder="sports"
          placeholderTextColor="#555555"
          value={newSports}
          onChangeText={setNewSports}
        />
        <TouchableOpacity style={s.addButton} onPress={handleAdd}>
          <Text style={s.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
    </ScrollView>
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

button: {
  backgroundColor: '#0D0D0D', borderRadius: 12, padding: 16,
  alignItems: 'center',  // Text horizontal zentrieren
  borderWidth: 0, borderColor: '#C8F135', marginBottom: 24,
},
buttonText: { color: '#C8F135', fontWeight: '700', fontSize: 15 },

});

