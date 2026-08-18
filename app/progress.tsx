import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { formatPace } from '../utils/fitParser';
import { loadWorkoutsByName } from '../utils/storage';
// oder: import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

// Breite des Charts: Bildschirmbreite abzüglich horizontalem Padding (2x 32px = 64px)
const W = Dimensions.get('window').width - 64;
type Session = {
  id: string;
  name: string;
  date: Date;
  laps: any[];
};
/**
 * Berechnet den Durchschnitt eines Arrays von Zahlen.
 * Filtert dabei null/undefined sowie Werte <= 0 heraus (z.B. fehlerhafte
 * oder nicht erfasste Messwerte aus den Lap-Daten).
 *
 * @param arr - Array von Werten (z.B. Pace- oder Herzfrequenzwerte pro Lap)
 * @returns Der Durchschnitt der gültigen Werte, oder null falls keine vorhanden sind
 */
function mean(arr: any[]) {
  const v = arr.filter(x => x != null && x > 0);
  return v.length ? v.reduce((a: number, b: number) => a + b, 0) / v.length : null;
}

/**
 * Konvertiert einen Pace-Wert von Sekunden/Meter in Sekunden/Kilometer.
 * Wird benötigt, weil die Rohdaten (GAP = Grade Adjusted Pace) in sec/m
 * vorliegen, die Chart- und Tabellenanzeige aber in der gebräuchlicheren
 * Einheit sec/km erfolgen soll.
 *
 * @param val - Pace in Sekunden pro Meter, oder null wenn nicht vorhanden
 * @returns Gerundete Pace in Sekunden pro Kilometer (0 falls val null ist)
 */
function toSecKm(val: number | null) {
  return val ? Math.round(val * 1000/60) : 0;
}

/**
 * Definiert die auswählbaren Metriken für die Tab-Leiste oben im Screen.
 * Jede Metrik hat einen internen Key (zum Filtern/Vergleichen), ein
 * Anzeige-Label und eine Farbe, die konsistent für Chart, Tabs und Legende
 * verwendet wird.
 */

type Metric = 'pace' | 'avgHr' | 'maxHr';

const METRICS: {
  key: Metric;
  label: string;
  color: string;
}[] = [
  { key: 'pace', label: 'Pace (GAP)', color: '#4DB8FF' },
  { key: 'avgHr', label: 'Ø HF', color: '#FF4D4D' },
  { key: 'maxHr', label: 'Max HF', color: '#FF4D4D' },
];

/**
 * ProgressScreen
 *
 * Zeigt den Trainingsfortschritt für einen bestimmten Workout-Namen an,
 * der als Route-Parameter übergeben wird (z.B. "5km Tempolauf").
 *
 * Der Screen besteht aus drei Teilen:
 * 1. Tab-Leiste zum Umschalten zwischen Pace (GAP), Ø Herzfrequenz und
 *    Max. Herzfrequenz
 * 2. Liniendiagramm mit dem zeitlichen Verlauf der gewählten Metrik
 *    (bei Pace: drei Linien für Durchschnitt/schnellste/langsamste Runde)
 * 3. Tabelle mit allen Sessions inkl. Datum, Ø GAP, schnellster und
 *    langsamster Runde
 */
export default function ProgressScreen() {

  // Workout-Name kommt als Query-Parameter aus der Navigation (expo-router)
  const { workout } = useLocalSearchParams();
  const [yAxis, setYAxis] = useState({
    pace: {
      min: '3.5',
      max: '4.5',
    },
    avgHr: {
      min: '150',
      max: '170',
    },
    maxHr: {
      min: '160',
      max: '180',
    },
  });
  

  // Alle gespeicherten Sessions für diesen Workout-Namen
  const [sessions, setSessions] = useState<Session[]>([]);
  // Aktuell in den Tabs ausgewählte Metrik (Standard: Pace)
  const [metric, setMetric] = useState<Metric>('pace');
  
  const currentYAxis = yAxis[metric];

  // Lädt beim Mounten der Komponente alle bisherigen Workouts mit
  // passendem Namen aus dem lokalen Speicher.
  useFocusEffect(
    useCallback(() => {
      loadWorkoutsByName(workout as string).then(data => {
        setSessions(data as Session[]);
      });
    }, [workout])
  );


  // Metadaten (Label, Farbe) der aktuell gewählten Metrik
  const current = METRICS.find(m => m.key === metric) ?? METRICS[0];
  // --- Datenaufbereitung für das Pace-Chart (3 Linien) ---
  // Linie 1: Durchschnittliche GAP-Pace pro Session, mit Datum als X-Achsen-Label
  const avgPaceData = sessions.map((w: any) => {
    const fastLaps = w.laps.filter((l: any) => l.isFast);
    const relevantLaps = fastLaps.length ? fastLaps : w.laps;
    const avg = mean(relevantLaps.map((l: any) => l.pace));
    return {
      //value: toSecKm(avg),
      value: avg ? (1000/60) * avg : undefined,
      label: new Date(w.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
    };
  });


  // Linie 2: Schnellste Runde (Minimum-Pace) pro Session
  const fastestData = sessions.map((w: any) => {
    const vals = w.laps.map((l: any) => l.pace).filter((v: any) => v != null && v > 0);
    const fastest = vals.length ? Math.min(...vals) : null;
    return {   value: fastest ? (1000/60) * fastest : undefined, };
  });

  // Linie 3: Langsamste Runde (Maximum-Pace) pro Session
  const slowestData = sessions.map((w: any) => {
    const fastLaps = w.laps.filter((l: any) => l.isFast);
    const vals = fastLaps.map((l: any) => l.pace).filter((v: any) => v != null && v > 0);
    const slowest = vals.length ? Math.max(...vals) : null;
    return {   value: slowest ? (1000/60) * slowest : undefined, };
  });

  // --- Datenaufbereitung für das Herzfrequenz-Chart (1 Linie) ---
  // Je nach gewählter Metrik wird entweder die maximale HF pro Session
  // (Max HF) oder die durchschnittliche HF über alle Laps (Ø HF) berechnet.
  const hrData = sessions.map((w: any) => {
    let val: number;
    if (metric === 'maxHr') {
      const vals = w.laps.map((l: any) => l.maxHr).filter(Boolean);
      val = vals.length ? Math.max(...vals) : 0;
    } else {
      val = Math.round(mean(w.laps.map((l: any) => l.avgHr)) || 0);
    }
    return {
      value: val,
      label: new Date(w.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
    };
  });






  
  // Steuert, ob das Pace-Chart (3 Linien) oder das HF-Chart (1 Linie) angezeigt wird
  const isPace = metric === 'pace';

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Kopfbereich: Workout-Name und Anzahl der erfassten Sessions */}
      <Text style={s.title}>{workout}</Text>
      <Text style={s.subtitle}>{sessions.length} Sessions</Text>

      {/* Tabs zum Umschalten der angezeigten Metrik */}
      <View style={s.tabs}>
        {METRICS.map( m => (
          <TouchableOpacity
            key={m.key}
            style={[s.tab, metric === m.key && { borderColor: m.color, backgroundColor: '#222222' }]}
            onPress={() => setMetric(m.key)}
          >
            <Text style={[s.tabText, metric === m.key && { color: m.color }]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart-Bereich: benötigt mindestens 2 Sessions für eine sinnvolle Kurve */}
      <View style={s.chartCard}>
        {sessions.length >= 2 ? (
          <>
          <View style={s.yAxisRow}>
  <Text style={s.yAxisLabel}>Y-Achse:</Text>
  <TextInput
    style={s.yAxisInput}
    placeholder="min"
    placeholderTextColor="#555555"
    value={yAxisMin}
    onChangeText={setYAxisMin}
    keyboardType="numeric"
  />
  <Text style={s.yAxisLabel}>–</Text>
  <TextInput
    style={s.yAxisInput}
    placeholder="max"
    placeholderTextColor="#555555"
    value={yAxisMax}
    onChangeText={setYAxisMax}
    keyboardType="numeric"
  />
</View>
            {isPace ? (
              // --- Pace-Ansicht: 3 Linien (Ø, schnellste, langsamste) ---
              <>
                {/* Farblegende zur Zuordnung der drei Linien */}
                <View style={s.legend}>
                  <View style={s.legendItem}>
                    <View style={[s.dot, { backgroundColor: '#4DB8FF' }]} />
                    <Text style={s.legendText}>Ø Pace</Text>
                  </View>

                  <View style={s.legendItem}>
                    <View style={[s.dot, { backgroundColor: '#C8F135' }]} />
                    <Text style={s.legendText}>Schnellstes</Text>
                  </View>
                  <View style={s.legendItem}>
                    <View style={[s.dot, { backgroundColor: '#FF4D4D' }]} />
                    <Text style={s.legendText}>Langsamtes</Text>
                  </View>
                </View>
                <LineChart
                  data={avgPaceData}
                  data2={fastestData}
                  data3={slowestData}
                  width={W}
                  height={200}
                  maxValue={parseFloat(yAxisMax)-parseFloat(yAxisMin)}        // oberes Ende der Y-Achse
                  yAxisOffset={parseFloat(yAxisMin)} // unteres Ende (Standard ist meist 0)
                  color={'#4DB8FF'}
                  color2={'#C8F135'}
                  color3={'#FF4D4D'}
                  thickness={2}
                  thickness2={2}
                  thickness3={2}
                  dataPointsColor={'#4DB8FF'}
                  dataPointsColor2={'#C8F135'}
                  dataPointsColor3={'#FF4D4D'}
                  dataPointsRadius={4}
                  xAxisColor={'#2E2E2E'}
                  yAxisColor={'#2E2E2E'}
                  yAxisTextStyle={{ color: '#555555', fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: '#555555', fontSize: 9 }}
                  backgroundColor={'#1A1A1A'}
                  rulesColor={'#2E2E2E'}
                  rulesType="dashed"
                  curved
                  noOfSections={4}
                  hideOrigin
                
                />
                {/* Hinweis, da bei Pace ein niedrigerer Wert besser ist (im Gegensatz zu z.B. Distanz) */}
                <Text style={s.note}>Niedrigerer Wert = schnellere Pace</Text>
              </>
            ) : (
              // --- Herzfrequenz-Ansicht: 1 Linie (Ø HF oder Max HF) ---
              <LineChart
                data={hrData}
                width={W}
                height={200}
                color={current.color}
                thickness={2}
                dataPointsColor={current.color}
                dataPointsRadius={5}
                xAxisColor={'#2E2E2E'}
                yAxisColor={'#2E2E2E'}
                yAxisTextStyle={{ color: '#555555', fontSize: 10 }}
                xAxisLabelTextStyle={{ color: '#555555', fontSize: 9 }}
                backgroundColor={'#1A1A1A'}
                rulesColor={'#2E2E2E'}
                rulesType="dashed"
                curved
                noOfSections={4}
                hideOrigin
              />
            )}
          </>
        ) : (
          // Fallback, solange nicht genug Sessions für eine Kurve vorliegen
          <Text style={s.empty}>Mindestens 2 Sessions nötig für eine Kurve.</Text>
        )}
      </View>

      {/* Tabellenkopf */}
      <View style={s.tableHeader}>
        <Text style={s.th}>Datum</Text>
        <Text style={s.th}>Ø GAP</Text>
        <Text style={s.th}>Schnell</Text>
        <Text style={s.th}>Langsam</Text>
      </View>

      {/* Tabellenzeilen: neueste Session zuerst (reverse), abwechselnde Zeilenfarben */}
      {[...sessions].reverse().map((w: any, i: number) => {
        const gaps = w.laps.map((l: any) => l.pace).filter((v: any) => v != null && v > 0);
        const avgGap = mean(gaps);
        const fastest = gaps.length ? Math.min(...gaps) : null;
        const slowest = gaps.length ? Math.max(...gaps) : null;
        return (
          <View key={w.id} style={[s.row, i % 2 === 0 && s.rowEven]}>
            <Text style={s.td}>
              {new Date(w.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
            </Text>
            <Text style={[s.td, { color: '#4DB8FF' }]}>{formatPace(avgGap)}</Text>
            <Text style={[s.td, { color: '#C8F135' }]}>{formatPace(fastest)}</Text>
            <Text style={[s.td, { color: '#FF4D4D' }]}>{formatPace(slowest)}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

// Styles im dunklen Design des restlichen Apps
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  content: { padding: 16, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', color: '#F0F0F0' },
  subtitle: { fontSize: 13, color: '#888888', marginBottom: 16 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#1A1A1A', alignItems: 'center',
    borderWidth: 1, borderColor: '#2E2E2E',
  },
  tabText: { color: '#555555', fontWeight: '600', fontSize: 13 },
  chartCard: {
    backgroundColor: '#1A1A1A', borderRadius: 12,
    padding: 16, marginBottom: 24,
  },
  legend: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: '#888888', fontSize: 11 },
  empty: { color: '#555555', textAlign: 'center', paddingVertical: 40 },
  note: { color: '#555555', fontSize: 11, textAlign: 'center', marginTop: 8 },
  tableHeader: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#2E2E2E', marginBottom: 4 },
  th: { flex: 1, color: '#555555', fontSize: 11, textAlign: 'center' },
  row: { flexDirection: 'row', paddingVertical: 8, borderRadius: 6 },
  rowEven: { backgroundColor: '#1A1A1A' },
  td: { flex: 1, color: '#F0F0F0', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  yAxisRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
yAxisLabel: { color: '#555555', fontSize: 12 },
yAxisInput: {
  backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10,
  color: '#F0F0F0', borderWidth: 1, borderColor: '#2E2E2E', width: 60, fontSize: 13,
},
});
