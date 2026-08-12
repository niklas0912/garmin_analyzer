// ─────────────────────────────────────────────────────────────────────────────
// sessions.tsx
// Zeigt alle importierten Sessions eines bestimmten Workout-Typs (z.B. "Intervalle 400m").
// Von hier aus kann man:
//   - Neue FIT-Dateien importieren
//   - Eine Session antippen → Detailansicht (detail.tsx)
//   - Den Fortschritt anzeigen (progress.tsx)
//   - Eine Session lang drücken → Löschen
// ─────────────────────────────────────────────────────────────────────────────

import * as DocumentPicker from 'expo-document-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatPace, parseFitFile } from '../utils/fitParser';
import { deleteWorkout, loadWorkoutsByName, saveWorkout } from '../utils/storage';

export default function SessionsScreen() {
  // useLocalSearchParams liest die URL-Parameter aus.
  // Wenn wir von der Startseite navigieren mit { workout: "Intervalle 400m" },
  // bekommen wir hier genau diesen Wert zurück.
  const { workout } = useLocalSearchParams();

  // useState speichert die Liste der Sessions im Arbeitsspeicher.
  // Wenn sich sessions ändert, rendert React Native den Screen automatisch neu.
  // <any[]> sagt TypeScript: das ist ein Array, wir kümmern uns nicht um den genauen Typ.
  type Lap = {
    index: number;
    distance: number;
    avgHr: number | null;
    maxHr: number | null;
    pace: number | null;
    isFast: boolean;
  };
  
  type Session = {
    id: string;
    name: string;
    date: Date;
    laps: Lap[];
  };
   
  const [sessions, setSessions] = useState<Session[]>([]);
  // useFocusEffect läuft jedes Mal wenn dieser Screen sichtbar wird –
  // also auch wenn man von der Detailansicht zurücknavigiert.
  // Wichtig: So sehen wir sofort aktualisierte isFast-Markierungen.
  // useCallback verhindert dass die Funktion bei jedem Render neu erstellt wird.
  useFocusEffect(useCallback(() => {
    console.log('Sessions neu laden...');
    loadWorkoutsByName(workout as string).then(data => {
      setSessions(data as Session[]);
    });
  }, [workout])); // [workout] bedeutet: nur neu ausführen wenn sich workout ändert

  // ── FIT-Datei importieren ─────────────────────────────────────────────────
  // async/await: Wir warten auf Nutzeraktionen (Datei auswählen) und
  // auf asynchrone Operationen (Datei lesen, speichern).
  async function handleImport() {
    try {
      // Öffnet den nativen Datei-Browser des Handys.
      // type: '*/*' = alle Dateitypen erlaubt (FIT-Dateien haben keinen Standard-MIME-Type)
      // copyToCacheDirectory: true = Datei in einen temporären Ordner kopieren,
      // damit wir sie lesen können
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      // Nutzer hat abgebrochen → nichts tun
      if (result.canceled) return;

      // result.assets ist ein Array – wir nehmen die erste (und einzige) Datei
      const file = result.assets[0];

      // FIT-Datei parsen: Binärdaten → JavaScript-Objekt mit Laps, Datum, etc.
      const data = await parseFitFile(file.uri, workout as string);

      // Im lokalen Speicher (AsyncStorage) sichern
      await saveWorkout(data);

      // Liste neu laden damit die neue Session sofort erscheint
      const updated = await loadWorkoutsByName(workout as string);
      setSessions(updated as Session[]);

      Alert.alert('Importiert!', `${data.laps.length} Runden gespeichert.`);
    } catch (e) {
      if (e instanceof Error) {
        Alert.alert('Fehler', e.message);
      } else {
        Alert.alert('Fehler', 'Ein unbekannter Fehler ist aufgetreten.');
    }
    }
  }

  // ── Session löschen ───────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    // Erst nachfragen bevor wir löschen
    Alert.alert('Löschen?', 'Diese Session wird entfernt.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen', style: 'destructive',
        onPress: async () => {
          await deleteWorkout(id);
          // Lokalen State aktualisieren ohne neu zu laden:
          // filter() gibt ein neues Array zurück ohne die gelöschte Session
          setSessions(s => s.filter(w => w.id !== id));
        },
      },
    ]);
  }

  async function multiplehandleDelete(id: string) {
    // Erst nachfragen bevor wir löschen
    Alert.alert('Löschen?', 'Diese Session wird entfernt.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen', style: 'destructive',
        onPress: async () => {
          await deleteWorkout(id);
          // Lokalen State aktualisieren ohne neu zu laden:
          // filter() gibt ein neues Array zurück ohne die gelöschte Session
          setSessions(s => s.filter(w => w.id !== id));
        },
      },
    ]);
  }

  // ── Hilfsfunktionen für Statistiken ──────────────────────────────────────

  // Berechnet den Durchschnitt eines numerischen Felds über alle Laps.
  // Filtert ungültige Werte heraus (null, 0, oder > 220 bei HF-Werten).
  function meanOf(laps: Lap[], key: string) {
    const vals = laps.map((l: any) => l[key]).filter((v: any) => v != null && v > 0 && v < 220);
    return vals.length
      ? Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length)
      : null;
  }

  // Gibt den Maximalwert eines Felds über alle Laps zurück.
  function maxOf(laps: Lap[], key: string) {
    const vals = laps.map((l: any) => l[key]).filter((v: any) => v != null && v > 0 && v < 220);
    return vals.length ? Math.max(...vals) : null;
  }

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      {/* FlatList rendert nur die sichtbaren Elemente – effizienter als map() für lange Listen */}
      <FlatList
        data={[...sessions].reverse()} // Neueste Session zuerst anzeigen
        keyExtractor={item => item.id}  // Eindeutiger Key für jedes Element (React braucht das)
        contentContainerStyle={s.list}

//        {/* ListHeaderComponent wird einmal ganz oben angezeigt – vor allen Sessions */}
        ListHeaderComponent={
          <View>
            <Text style={s.title}>{workout}</Text>

            {/* Import-Button */}
            <TouchableOpacity style={s.button} onPress={handleImport}>
              <Text style={s.buttonText}>+ FIT-Datei importieren</Text>
            </TouchableOpacity>

            {/* Fortschritt-Button – nur anzeigen wenn mindestens eine Session vorhanden */}
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

//        {/* Wird angezeigt wenn sessions leer ist */}
        ListEmptyComponent={
          <Text style={s.empty}>Noch keine Sessions importiert.</Text>
        }

//        {/* renderItem wird für jede Session aufgerufen */}
        renderItem={({ item }) => {
          const date = new Date(item.date);

          // Nur markierte Runden für Statistiken verwenden.
          // Falls keine markiert sind → alle Runden als Fallback.
          const fastLaps = item.laps.filter((l: any) => l.isFast);
          const relevantLaps = fastLaps.length > 0 ? fastLaps : item.laps;

          const avgHr = meanOf(relevantLaps, 'avgHr');
          const maxHr = maxOf(relevantLaps, 'maxHr');


          const avgpace = relevantLaps
            .map((l: any) => l.pace)
            .filter((v: any) => v != null && v > 0)
            .reduce((a: number, b: number, _: any, arr: any[]) => a + b / arr.length, 0) || null;

          // Gesamtzeit und -distanz über alle Laps (nicht nur schnelle)
          const totalDuration = item.laps.reduce((a: number, l: any) => a + (l.duration || 0), 0);
          const totalDistance = item.laps.reduce((a: number, l: any) => a + (l.distance || 0), 0);
          const minutes = Math.floor(totalDuration / 60);
          const seconds = Math.round(totalDuration % 60);

          return (
            // Tippen → Detailansicht, Lang drücken → Löschen
            <TouchableOpacity
              style={s.card}
              onPress={() => router.push({ pathname: '/detail', params: { sessionId: item.id } })}
              onLongPress={() => handleDelete(item.id)}
            >
              {/* Datum des Workouts (aus der FIT-Datei, nicht Importdatum) */}
              <Text style={s.date}>
                {date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>

              {/* Statistik-Zeile */}
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
                  <Text style={s.statLabel}>Ø pace</Text>
                  <Text style={[s.statValue, { color: '#4DB8FF' }]}>{formatPace(avgpace)}</Text>
                </View>
                <View style={s.stat}>
                  <Text style={s.statLabel}>Zeit</Text>
                  {/* padStart(2, '0') stellt sicher dass Sekunden immer 2-stellig sind: 5 → "05" */}
                  <Text style={s.statValue}>{minutes}:{seconds.toString().padStart(2, '0')}</Text>
                </View>
                <View style={s.stat}>
                  <Text style={s.statLabel}>km</Text>
                  {/* toFixed(2) = immer 2 Nachkommastellen: 7.8 → "7.80" */}
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

// ── Styles ────────────────────────────────────────────────────────────────────
// StyleSheet.create() ist wie CSS, nur in JavaScript.
// Die Styles werden einmal erstellt und nicht bei jedem Render neu berechnet.
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  // flex: 1 bedeutet "nimm den gesamten verfügbaren Platz"
  
  list: { padding: 16, paddingTop: 60, gap: 12 },
  // paddingTop: 60 damit der Inhalt nicht unter der Statusleiste liegt
  // gap: 12 = Abstand zwischen den Karten
  
  title: { fontSize: 22, fontWeight: '800', color: '#F0F0F0', marginBottom: 16 },
  button: {
    backgroundColor: '#222222', borderRadius: 12, padding: 16,
    alignItems: 'center',  // Text horizontal zentrieren
    borderWidth: 1, borderColor: '#C8F135', marginBottom: 24,
  },
  buttonText: { color: '#C8F135', fontWeight: '700', fontSize: 15 },
  empty: { color: '#555555', textAlign: 'center', marginTop: 32 },
  card: { backgroundColor: '#222222', borderRadius: 12, padding: 16 },
  date: { color: '#F0F0F0', fontWeight: '700', fontSize: 16, marginBottom: 12 },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  // flexDirection: 'row' = Elemente nebeneinander statt untereinander
  // justifyContent: 'space-between' = gleichmäßiger Abstand zwischen den Elementen
  
  stat: { alignItems: 'center' },  // Label und Wert vertikal zentrieren
  statLabel: { color: '#555555', fontSize: 11, marginBottom: 2 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#F0F0F0' },
});