import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { formatPace, parsePace } from '../utils/fitParser';
import { loadAllWorkouts, updateWorkout } from '../utils/storage';

/**
 * DetailScreen
 *
 * Zeigt die Detailansicht einer einzelnen Trainingssession an: alle
 * einzelnen Runden (Laps) mit Distanz, Herzfrequenz und Pace.
 *
 * Der Nutzer kann einzelne Runden per Tap als "schnell" markieren
 * (z.B. um Tempo-Intervalle innerhalb eines längeren Laufs zu
 * kennzeichnen). Für diese markierten Runden wird oben eine
 * zusammenfassende Statistik-Box (Ø HF, Max HF, Ø GAP) eingeblendet.
 */
export default function DetailScreen() {
  // ID der anzuzeigenden Session kommt als Route-Parameter
  const { sessionId } = useLocalSearchParams();

  // Die geladene Session inkl. aller Laps; null solange noch nicht geladen
  const [session, setSession] = useState<any>(null);

  // Eingabe für die manuelle Pace-Schwelle (Format m:ss), z.B. "4:30"
  const [thresholdInput, setThresholdInput] = useState('4:15');
  const [showOnlyFast, setShowOnlyFast] = useState(false);

  // Lädt beim Mounten alle Workouts und sucht die passende Session anhand
  // der sessionId heraus. Die console.log-Aufrufe dienen aktuell dem
  // Debugging beim Auffinden der Session (können später entfernt werden).
  useEffect(() => {
    loadAllWorkouts().then((all: any[]) => {
      console.log('Alle IDs:', all.map(w => w.id));
      console.log('Suche:', sessionId);
      const found = all.find((w: any) => w.id === sessionId);
      console.log('Gefunden:', found ? 'ja' : 'nein');

      if (found) setSession(found);
    });
  }, []);

  // Solange die Session noch nicht geladen ist, wird nur ein leerer
  // dunkler Hintergrund gerendert (verhindert Flackern/weißen Screen)
  if (!session) return <View style={{ flex: 1, backgroundColor: '#0D0D0D' }} />;

  // Datum der Session als Date-Objekt für die Anzeige oben
  const date = new Date(session.date);

  /**
   * Schaltet die "schnell"-Markierung (isFast) einer Runde per Lap-Index um.
   * Aktualisiert sowohl den lokalen State (für sofortiges UI-Feedback)
   * als auch den persistenten Speicher via updateWorkout.
   *
   * @param index - Der Lap-Index der umzuschaltenden Runde
   */
  function toggleLap(index: number) {
    console.log('Toggle Lap:', index);
    console.log('Laps indices:', session.laps.map((l: any) => l.index));

    const updatedLaps = session.laps.map((lap: any) =>
      lap.index === index ? { ...lap, isFast: !lap.isFast } : lap
    );
    console.log('isFast nach update:', updatedLaps.map((l: any) => l.isFast));

    const updatedSession = { ...session, laps: updatedLaps };
    setSession(updatedSession);       // optimistisches Update der UI
    updateWorkout(updatedSession);    // Persistierung im Speicher
  }

  /**
   * Markiert alle Runden als "schnell", deren GAP-Pace unter (bzw. gleich)
   * der eingegebenen Schwelle liegt. Erwartet Eingabe im Format m:ss.
   */
  function applyThreshold() {
    const thresholdSecPerMeter = parsePace(thresholdInput);
    if (thresholdSecPerMeter == null) {
      Alert.alert('Ungültige Eingabe', 'Bitte im Format m:ss eingeben, z.B. 4:30');
      return;
    }

    const updatedLaps = session.laps.map((lap: any) => ({
      ...lap,
      isFast: lap.pace != null && lap.pace <= thresholdSecPerMeter,
    }));

    const updatedSession = { ...session, laps: updatedLaps };
    setSession(updatedSession);
    updateWorkout(updatedSession);
  }

  // Alle als "schnell" markierten Runden, plus Flag ob überhaupt welche existieren
  const fastLaps = session.laps.filter((l: any) => l.isFast);
  const hasFastLaps = fastLaps.length > 0;

  /**
   * Berechnet den Durchschnitt eines bestimmten Feldes (z.B. 'avgHr' oder
   * 'maxHr') über eine Liste von Laps. Filtert dabei unrealistische bzw.
   * fehlende Werte heraus (<= 0 oder >= 220 bpm gelten als ungültig).
   *
   * @param laps - Liste der Laps, über die gemittelt werden soll
   * @param key - Der Feldname im Lap-Objekt, der gemittelt wird
   * @returns Gerundeter Durchschnittswert, oder null falls keine gültigen Werte vorhanden sind
   */

  function formatThresholdInput(raw: string) {
    // Nur Ziffern behalten
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 3); // max 3 Ziffern, z.B. "430"
  
    if (digits.length <= 1) return digits;
    // Letzte 2 Ziffern sind Sekunden, Rest sind Minuten
    const min = digits.slice(0, -2);
    const sec = digits.slice(-2);
    return `${min}:${sec}`;
  }
  function meanOf(laps: any[], key: string) {
    const vals = laps.map((l: any) => l[key]).filter((v: any) => v != null && v > 0 && v < 220);
    return vals.length ? Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length) : null;
  }

  const visibleLaps = showOnlyFast ? fastLaps : session.laps;
  return (
    <ScrollView contentContainerStyle={s.list}>
      {/* Kopfbereich: Datum der Session */}
      {/* <Text style={s.title}>
        {date.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
    <Ionicons name="thermometer-outline" size={14} color="#C8F135" />
  
      {session.temperature != null ? `${session.temperature.toFixed(1)}°C` : "--"}
    </Text> */}
       <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={s.title}>
        {date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
      </Text>
    
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Ionicons name="thermometer-outline" size={14} color="#C8F135" />
        <Text style={s.temperature}>
          {session.temperature != null ? `${session.temperature.toFixed(1)}°C` : "--"}
        </Text>
      </View>
    </View>
      <Text style={s.hint}>Tippe auf eine Runde um sie als schnell zu markieren</Text>

      {/* Zusammenfassungs-Box für "schnelle" Runden, nur wenn welche markiert sind */}
      {hasFastLaps && (
        <View style={s.summary}>
          <Text style={s.summaryTitle}>Fast laps only ({fastLaps.length})</Text>
          <View style={s.summaryStats}>
            <View style={s.stat}>
              <Text style={s.statLabel}>Ø HR</Text>
              <Text style={[s.statValue, { color: '#FF4D4D' }]}>{meanOf(fastLaps, 'avgHr') ?? '--'}</Text>
            </View>
            <View style={s.stat}>
              <Text style={s.statLabel}>Max HR</Text>
              <Text style={[s.statValue, { color: '#FF4D4D' }]}>{meanOf(fastLaps, 'maxHr') ?? '--'}</Text>
            </View>
            <View style={s.stat}>
              <Text style={s.statLabel}>Ø Pace</Text>
              <Text style={[s.statValue, { color: '#4DB8FF' }]}>
                {/*
                  Gewichteter Durchschnitt der Pace über alle schnellen Runden:
                  Summe von (Wert / Anzahl) statt Summe/Anzahl, mathematisch
                  äquivalent, aber in einem einzigen reduce-Durchlauf berechnet.
                  Runden ohne gültige Pace (<= 0) werden vorher rausgefiltert.
                */}
                {formatPace(fastLaps.map((l: any) => l.pace).filter((v: any) => v > 0).reduce((a: number, b: number, _: any, arr: any[]) => a + b / arr.length, 0) || null)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Automatische Erkennung per Pace-Schwelle */}
      <View style={s.thresholdRow}>
      <TextInput
        style={s.thresholdInput}
        placeholder="z.B. 4:30"
        placeholderTextColor="#555555"
        value={thresholdInput}
        onChangeText={(text) => setThresholdInput(formatThresholdInput(text))}
        keyboardType="number-pad"
        maxLength={4}
/>
        <TouchableOpacity style={s.thresholdButton} onPress={applyThreshold}>
          <Text style={s.thresholdButtonText}>Select threshhold</Text>
        </TouchableOpacity>
      </View>
      {hasFastLaps && (
  <TouchableOpacity
    style={s.filterToggle}
    onPress={() => setShowOnlyFast(!showOnlyFast)}
  >
    <Text style={s.filterToggleText}>
      {showOnlyFast ? 'Show all' : 'Fast laps only'}
    </Text>
  </TouchableOpacity>
)}
      {/* Tabellenkopf für die Lap-Liste */}
      <View style={s.tableHeader}>
        <Text style={[s.th, { flex: 0.5 }]}>#</Text>
        <Text style={s.th}>Dist</Text>
        <Text style={s.th}>Ø HR</Text>
        <Text style={s.th}>Max HR</Text>
        <Text style={s.th}>Pace</Text>
      </View>

      {/* Liste aller Runden, antippbar zum Markieren als "schnell" */}
      {visibleLaps.map((item: any, index: number) => (
        <TouchableOpacity
          key={item.index}
          style={[s.row, index % 2 === 0 && s.rowEven, item.isFast && s.rowFast]}
          onPress={() => toggleLap(item.index)}
        >
          {/* Bei markierten Runden wird statt der Nummer ein Blitz-Symbol angezeigt */}
          <Text style={[s.td, { flex: 0.5 }]}>{item.isFast ? '⚡' : item.index}</Text>
          {/* Distanz: ab 1000m in km mit 2 Nachkommastellen, sonst in ganzen Metern */}
          <Text style={s.td}>
            {item.distance >= 1000
              ? `${(item.distance / 1000).toFixed(2)}k`
              : `${Math.round(item.distance)}m`}
          </Text>
          <Text style={[s.td, { color: '#FF4D4D' }]}>{item.avgHr ?? '--'}</Text>
          <Text style={[s.td, { color: '#FF4D4D' }]}>{item.maxHr ?? '--'}</Text>
          <Text style={[s.td, { color: '#4DB8FF' }]}>{formatPace(item.pace)}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// Styles im dunklen Design des restlichen Apps
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  list: { padding: 16, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '800', color: '#F0F0F0', marginBottom: 4 },
  hint: { fontSize: 12, color: '#555555', marginBottom: 16 },
  summary: {
    backgroundColor: '#1A1A1A', borderRadius: 12,
    padding: 16, marginBottom: 16,
    borderLeftWidth: 3, borderLeftColor: '#C8F135',
  },
  summaryTitle: { color: '#C8F135', fontWeight: '700', fontSize: 13, marginBottom: 12 },
  summaryStats: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statLabel: { color: '#555555', fontSize: 11, marginBottom: 2 },
  statValue: { fontSize: 20, fontWeight: '800' },
  tableHeader: {
    flexDirection: 'row', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: '#2E2E2E', marginBottom: 4,
  },
  th: { flex: 1, color: '#555555', fontSize: 11, textAlign: 'center' },
  row: { flexDirection: 'row', paddingVertical: 10, borderRadius: 6 },
  rowEven: { backgroundColor: '#1A1A1A' },
  rowFast: { backgroundColor: '#1A2A0A', borderLeftWidth: 3, borderLeftColor: '#C8F135' },
  td: { flex: 1, color: '#F0F0F0', fontSize: 14, textAlign: 'center' },

  thresholdRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  thresholdInput: {
    flex: 1, backgroundColor: '#1A1A1A', borderRadius: 8,
    padding: 10, color: '#F0F0F0', borderWidth: 1, borderColor: '#2E2E2E',
  },
  thresholdButton: {
    backgroundColor: '#1A2A0A', borderRadius: 8, paddingHorizontal: 14,
    justifyContent: 'center', borderWidth: 1, borderColor: '#C8F135',
  },
  thresholdButtonText: { color: '#C8F135', fontSize: 13, fontWeight: '700' },
  filterToggle: {
    alignSelf: 'flex-start',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  filterToggleText: { color: '#C8F135', fontSize: 12, fontWeight: '600' },
  temperature: {
    textAlign: "right",
    color: '#C8F135', // euer Akzent
    fontSize: 13,
  },
});
