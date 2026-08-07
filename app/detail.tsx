import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatPace } from '../utils/fitParser';
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
  function meanOf(laps: any[], key: string) {
    const vals = laps.map((l: any) => l[key]).filter((v: any) => v != null && v > 0 && v < 220);
    return vals.length ? Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length) : null;
  }

  return (
    <ScrollView contentContainerStyle={s.list}>
      {/* Kopfbereich: Datum der Session */}
      <Text style={s.title}>
        {date.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
      </Text>
      <Text style={s.hint}>Tippe auf eine Runde um sie als schnell zu markieren</Text>

      {/* Zusammenfassungs-Box für "schnelle" Runden, nur wenn welche markiert sind */}
      {hasFastLaps && (
        <View style={s.summary}>
          <Text style={s.summaryTitle}>Schnelle Runden ({fastLaps.length})</Text>
          <View style={s.summaryStats}>
            <View style={s.stat}>
              <Text style={s.statLabel}>Ø HF</Text>
              <Text style={[s.statValue, { color: '#FF4D4D' }]}>{meanOf(fastLaps, 'avgHr') ?? '--'}</Text>
            </View>
            <View style={s.stat}>
              <Text style={s.statLabel}>Max HF</Text>
              <Text style={[s.statValue, { color: '#FF4D4D' }]}>{meanOf(fastLaps, 'maxHr') ?? '--'}</Text>
            </View>
            <View style={s.stat}>
              <Text style={s.statLabel}>Ø GAP</Text>
              <Text style={[s.statValue, { color: '#4DB8FF' }]}>
                {/*
                  Gewichteter Durchschnitt der Pace über alle schnellen Runden:
                  Summe von (Wert / Anzahl) statt Summe/Anzahl, mathematisch
                  äquivalent, aber in einem einzigen reduce-Durchlauf berechnet.
                  Runden ohne gültige Pace (<= 0) werden vorher rausgefiltert.
                */}
                {formatPace(fastLaps.map((l: any) => l.gap).filter((v: any) => v > 0).reduce((a: number, b: number, _: any, arr: any[]) => a + b / arr.length, 0) || null)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Tabellenkopf für die Lap-Liste */}
      <View style={s.tableHeader}>
        <Text style={[s.th, { flex: 0.5 }]}>#</Text>
        <Text style={s.th}>Dist</Text>
        <Text style={s.th}>Ø HF</Text>
        <Text style={s.th}>Max HF</Text>
        <Text style={s.th}>GAP</Text>
      </View>

      {/* Liste aller Runden, antippbar zum Markieren als "schnell" */}
      {session.laps.map((item: any, index: number) => (
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
          <Text style={[s.td, { color: '#4DB8FF' }]}>{formatPace(item.gap)}</Text>
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
});