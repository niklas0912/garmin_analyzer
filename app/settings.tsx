import { loadAllWorkouts, reparseAndUpdateWorkout } from '@/utils/storage';
import type { Session } from '@/utils/types';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
  const [isReparsing, setIsReparsing] = useState(false);

  async function reparseAllWorkouts(): Promise<void> {
    const existing: Session[] = await loadAllWorkouts();

    for (const workout of existing) {
      try {
        await reparseAndUpdateWorkout(workout.id,workout.fitFileUri, workout.name);
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
      </View>
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
  


  });