import * as DocumentPicker from 'expo-document-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatPace, parseFitFile } from '../utils/fitParser';
import { deleteWorkout, loadWorkoutsByName, saveWorkout } from '../utils/storage';




export default function SessionsScreen() {
  const { workout } = useLocalSearchParams();
  const [sessions, setSessions] = useState<any[]>([]);
  useFocusEffect(useCallback(() => {
    console.log('Sessions neu laden...');
    loadWorkoutsByName(workout as string).then(data => {
      console.log('isFast Werte:', data.map((w: any) => w.laps.map((l: any) => l.isFast)));
      setSessions(data);
    });
  }, [workout]));

  async function handleImport() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const file = result.assets[0];
      const data = await parseFitFile(file.uri, workout as string);
      await saveWorkout(data);

      const updated = await loadWorkoutsByName(workout as string);
      setSessions(updated);

      Alert.alert('Importiert!', `${data.laps.length} Runden gespeichert.`);
    } catch (e: any) {
      Alert.alert('Fehler', e.message);
    }
  }

  async function handleDelete(id: string) {
    Alert.alert('Löschen?', 'Diese Session wird entfernt.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen', style: 'destructive',
        onPress: async () => {
          await deleteWorkout(id);
          setSessions(s => s.filter(w => w.id !== id));
        },
      },
    ]);
  }

  function meanOf(laps: any[], key: string) {
    const vals = laps.map((l: any) => l[key]).filter((v: any) => v != null && v > 0 && v < 220);
    return vals.length ? Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length) : null;
  }
  
  function maxOf(laps: any[], key: string) {
    const vals = laps.map((l: any) => l[key]).filter((v: any) => v != null && v > 0 && v < 220);
    return vals.length ? Math.max(...vals) : null;
  }

  return (
    <View style={s.container}>
      <FlatList
        data={[...sessions].reverse()}
        keyExtractor={item => item.id}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <View>
            <Text style={s.title}>{workout}</Text>
            <TouchableOpacity style={s.button} onPress={handleImport}>
              <Text style={s.buttonText}>+ FIT-Datei importieren</Text>
            </TouchableOpacity>
            {sessions.length > 0 && (
              <TouchableOpacity
                style={[s.button, { borderColor: '#4DB8FF', marginBottom: 24 }]}
                onPress={() => router.push({ pathname: '/progress', params: { workout } })}
              >
                <Text style={[s.buttonText, { color: '#4DB8FF' }]}>📈 Fortschritt anzeigen</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          <Text style={s.empty}>Noch keine Sessions importiert.</Text>
        }
        renderItem={({ item }) => {
          const date = new Date(item.date);
          const fastLaps = item.laps.filter((l: any) => l.isFast);
          const relevantLaps = fastLaps.length > 0 ? fastLaps : item.laps;
        
          const avgHr = meanOf(relevantLaps, 'avgHr');
          const maxHr = maxOf(relevantLaps, 'maxHr');
          const avgGap = relevantLaps
            .map((l: any) => l.gap)
            .filter((v: any) => v != null && v > 0)
            .reduce((a: number, b: number, _: any, arr: any[]) => a + b / arr.length, 0) || null;
        
          const totalDuration = item.laps.reduce((a: number, l: any) => a + (l.duration || 0), 0);
          const totalDistance = item.laps.reduce((a: number, l: any) => a + (l.distance || 0), 0);
          const minutes = Math.floor(totalDuration / 60);
          const seconds = Math.round(totalDuration % 60);
        
          return (
            <TouchableOpacity
              style={s.card}
              onPress={() => router.push({ pathname: '/detail', params: { sessionId: item.id } })}
              onLongPress={() => handleDelete(item.id)}
            >
              <Text style={s.date}>
                {date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
              <View style={s.stats}>
                <View style={s.stat}>
                  <Text style={s.statLabel}>Ø HF</Text>
                  <Text style={[s.statValue, { color: '#FF4D4D' }]}>{avgHr ?? '--'}</Text>
                </View>
                <View style={s.stat}>
                  <Text style={s.statLabel}>Max HF</Text>
                  <Text style={[s.statValue, { color: '#FF4D4D' }]}>{maxHr ?? '--'}</Text>
                </View>
                <View style={s.stat}>
                  <Text style={s.statLabel}>Ø GAP</Text>
                  <Text style={[s.statValue, { color: '#4DB8FF' }]}>{formatPace(avgGap)}</Text>
                </View>
                <View style={s.stat}>
                  <Text style={s.statLabel}>Zeit</Text>
                  <Text style={s.statValue}>{minutes}:{seconds.toString().padStart(2, '0')}</Text>
                </View>
                <View style={s.stat}>
                  <Text style={s.statLabel}>km</Text>
                  <Text style={s.statValue}>{(totalDistance / 1000).toFixed(2)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  list: { padding: 16, paddingTop: 60, gap: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#F0F0F0', marginBottom: 16 },
  button: {
    backgroundColor: '#222222', borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#C8F135', marginBottom: 24,
  },
  buttonText: { color: '#C8F135', fontWeight: '700', fontSize: 15 },
  empty: { color: '#555555', textAlign: 'center', marginTop: 32 },
  card: { backgroundColor: '#222222', borderRadius: 12, padding: 16 },
  date: { color: '#F0F0F0', fontWeight: '700', fontSize: 16, marginBottom: 12 },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center' },
  statLabel: { color: '#555555', fontSize: 11, marginBottom: 2 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#F0F0F0' },
});