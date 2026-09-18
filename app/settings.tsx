import { deleteAllWorkouts, loadAllWorkouts, loadWorkoutTypes, reparseAndUpdateWorkout, updateWorkoutType } from '@/utils/storage';
import type { Session, WorkoutType } from '@/utils/types';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
  const [isReparsing, setIsReparsing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);



  const PRESET_COLORS = [
    '#C8F135', '#4DB8FF', '#FF4D4D', '#FF9F4D',
    '#B84DFF', '#4DFFB8', '#FF4DB8', '#FFFFFF',
  ];
  const [typesModalVisible, setTypesModalVisible] = useState(false);
  const [workoutTypes, setWorkoutTypes] = useState<WorkoutType[]>([]);
  const [editingType, setEditingType] = useState<WorkoutType | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editSports, setEditSports] = useState('');

  async function openTypesModal(): Promise<void> {
    const types = await loadWorkoutTypes();
    setWorkoutTypes(types);
    setTypesModalVisible(true);
  }

  function startEditing(type: WorkoutType): void {
    setEditingType(type);
    setEditName(type.name);
    setEditColor(type.color)
    setEditSports(type.sports);
  }

  function cancelEditing(): void {
    setEditingType(null);
    setEditName('');
    setEditColor('');
  }

  async function saveEdit(): Promise<void> {
    if (!editingType) return;
    const trimmedName = editName.trim();
    if (trimmedName.length === 0) {
      Alert.alert('Ungültiger Name', 'Der Name darf nicht leer sein.');
      return;
    }

    const nameChanged = trimmedName !== editingType.name;
    const doSave = async () => {
      const updated = await updateWorkoutType(editingType, {
        name: trimmedName,
        color: editColor,
        sports: editSports,
      });
      setWorkoutTypes(updated);
      cancelEditing();
    };

    if (nameChanged) {
      Alert.alert(
        'Name ändern?',
        `Alle bestehenden Sessions vom Typ "${editingType.name}" werden auf "${trimmedName}" umgezogen.`,
        [
          { text: 'Abbrechen', style: 'cancel' },
          { text: 'Ändern', onPress: doSave },
        ]
      );
    } else {
      await doSave();
    }
  }

  async function reparseAllWorkouts(): Promise<void> {
    const existing: Session[] = await loadAllWorkouts();

    for (const workout of existing) {
      try {
        await reparseAndUpdateWorkout(workout);
      } catch (err) {
        console.log(`Reparse fehlgeschlagen für ${workout.name} (${workout.id}):`, err);
      }
    }
  }

  function confirmReparseAll(): void {
    Alert.alert(
      'Alle Sessions neu parsen?',
      'Alle gespeicherten Workouts werden erneut aus den FIT-Dateien geparst. Manuelle Änderungen (z. B. isFast) gehen dabei verloren.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Neu parsen',
          style: 'destructive',
          onPress: async () => {
            setIsReparsing(true);
            try {
              await reparseAllWorkouts();
            } finally {
              setIsReparsing(false);
            }
          },
        },
      ]
    );
  }

    function confirmDeleteAll(): void {
    Alert.alert(
      'Alle Sessions löschen?',
      'Sämtliche importierten Workouts werden unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Alle löschen',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteAllWorkouts();
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }
  return (
    <View style={s.container}>
      <View style={s.content}>
        <TouchableOpacity
          style={[s.settingsCard]}
          onPress={() => router.push({ pathname: '/backup_screen' })}
        >
          <Text style={s.settingButtonText}>Import/Export backup</Text>
          {/* <Text style={s.cardHint}>Tippen → Sessions · Lang drücken → Import</Text> */}
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.settingsCard]}
          onPress={confirmReparseAll}
          disabled={isReparsing}
        >
          <Text style={s.settingButtonText}>
            {isReparsing ? 'Wird neu geparst…' : 'Alle Sessions neu parsen'}
          </Text>
        </TouchableOpacity>
          <TouchableOpacity
          style={[s.settingsCard]}
          onPress={confirmDeleteAll}
          disabled={isReparsing || isDeleting}
        >
          <Text style={s.settingButtonText}>
            {isDeleting ? 'Wird gelöscht…' : 'Alle Sessions löschen'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
  style={[s.settingsCard]}
  onPress={openTypesModal}
>
  <Text style={s.settingButtonText}>Workout-Typen verwalten</Text>
</TouchableOpacity>
      </View>
           <Modal
        visible={typesModalVisible}
        animationType="slide"
        onRequestClose={() => {
          cancelEditing();
          setTypesModalVisible(false);
        }}
      >
        <View style={s.modalContainer}>
          {!editingType ? (
            <>
              <Text style={s.modalTitle}>Workout-Typen</Text>
              <FlatList
                data={workoutTypes}
                keyExtractor={item => item.name}
                renderItem={({ item }) => (
                  <TouchableOpacity style={s.typeRow} onPress={() => startEditing(item)}>
                    <View style={[s.colorDot, { backgroundColor: item.color }]} />
                    <Text style={s.typeName}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity
                style={s.closeButton}
                onPress={() => setTypesModalVisible(false)}
              >
                <Text style={s.settingButtonText}>Schließen</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={s.modalTitle}>Typ bearbeiten</Text>

              <TextInput
                style={s.nameInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Name"
                placeholderTextColor="#666"
              />
   <TextInput
                style={s.nameInput}
                value={editSports}
                onChangeText={setEditSports}
                placeholder="Name"
                placeholderTextColor="#666"
              />
              <Text style={s.colorLabel}>Farbe</Text>
              <View style={s.colorGrid}>
                {PRESET_COLORS.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      s.colorSwatch,
                      { backgroundColor: color },
                      editColor === color && s.colorSwatchSelected,
                    ]}
                    onPress={() => setEditColor(color)}
                  />
                ))}
              </View>

              <View style={s.editActions}>
                <TouchableOpacity style={s.editButton} onPress={cancelEditing}>
                  <Text style={s.settingButtonText}>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.editButton} onPress={saveEdit}>
                  <Text style={s.settingButtonText}>Speichern</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D0D0D' },
    // flex: 1 bedeutet "nimm den gesamten verfügbaren Platz"
    content: {
        flex: 0.8,
        gap: 20,
        paddingTop: 40,      // Abstand nach oben
        paddingHorizontal: 20, // Abstand zu linkem/rechtem Rand
      },
    list: { padding: 16, paddingTop: 60, gap: 12 },
    // paddingTop: 60 damit der Inhalt nicht unter der Statusleiste liegt
    // gap: 12 = Abstand zwischen den Karten
    
    title: { fontSize: 22, fontWeight: '800', color: '#F0F0F0', marginBottom: 16 },
    button: {
      backgroundColor: '#222222', borderRadius: 12, padding: 16,
      alignItems: 'center',  // Text horizontal zentrieren
      borderWidth: 1, borderColor: '#C8F135', marginBottom: 24,
    },
    settingButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 20 },
    settingsCard: { backgroundColor: '#222222', borderWidth: 0, borderColor: '#FFFFFF',borderRadius: 12, padding: 12 },
  modalContainer: { flex: 1, backgroundColor: '#0D0D0D', padding: 16 },
  modalTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '600', marginBottom: 16 },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  colorDot: { width: 20, height: 20, borderRadius: 10, marginRight: 12 },
  typeName: { color: '#FFFFFF', fontSize: 16 },
  closeButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  nameInput: {
    backgroundColor: '#1A1A1A',
    color: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  colorLabel: { color: '#FFFFFF', fontSize: 14, marginBottom: 8 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchSelected: { borderColor: '#FFFFFF' },
  editActions: { flexDirection: 'row', gap: 12 },
  editButton: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },


  });