import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { formatPace } from '../utils/fitParser';
import { loadWorkoutsByName } from '../utils/storage';

const W = Dimensions.get('window').width - 64;

function mean(arr: any[]) {
  const v = arr.filter(x => x != null && x > 0);
  return v.length ? v.reduce((a: number, b: number) => a + b, 0) / v.length : null;
}

// Konvertiert sec/meter → sec/km gerundet
function toSecKm(val: number | null) {
  return val ? Math.round(val * 1000) : 0;
}

const METRICS = [
  { key: 'gap',   label: 'Pace (GAP)',  color: '#4DB8FF' },
  { key: 'avgHr', label: 'Ø HF',        color: '#FF4D4D' },
  { key: 'maxHr', label: 'Max HF',      color: '#FF4D4D' },
];

export default function ProgressScreen() {
  const { workout } = useLocalSearchParams();
  const [sessions, setSessions] = useState([]);
  const [metric, setMetric] = useState('gap');

  useEffect(() => {
    loadWorkoutsByName(workout as string).then(setSessions);
  }, []);

  const current = METRICS.find(m => m.key === metric)!;

  // Pace-Chart: drei Linien
  const avgPaceData = sessions.map((w: any) => {
    const avg = mean(w.laps.map((l: any) => l.gap));
    return {
      value: toSecKm(avg),
      label: new Date(w.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
    };
  });

  const fastestData = sessions.map((w: any) => {
    const vals = w.laps.map((l: any) => l.gap).filter((v: any) => v != null && v > 0);
    const fastest = vals.length ? Math.min(...vals) : null;
    return { value: toSecKm(fastest) };
  });

  const slowestData = sessions.map((w: any) => {
    const vals = w.laps.map((l: any) => l.gap).filter((v: any) => v != null && v > 0);
    const slowest = vals.length ? Math.max(...vals) : null;
    return { value: toSecKm(slowest) };
  });

  // HF-Chart: eine Linie
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

  const isPace = metric === 'gap';

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>{workout}</Text>
      <Text style={s.subtitle}>{sessions.length} Sessions</Text>

      {/* Tabs */}
      <View style={s.tabs}>
        {METRICS.map(m => (
          <TouchableOpacity
            key={m.key}
            style={[s.tab, metric === m.key && { borderColor: m.color, backgroundColor: '#222222' }]}
            onPress={() => setMetric(m.key)}
          >
            <Text style={[s.tabText, metric === m.key && { color: m.color }]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart */}
      <View style={s.chartCard}>
        {sessions.length >= 2 ? (
          <>
            {isPace ? (
              <>
                {/* Legende */}
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
                <Text style={s.note}>Niedrigerer Wert = schnellere Pace</Text>
              </>
            ) : (
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
          <Text style={s.empty}>Mindestens 2 Sessions nötig für eine Kurve.</Text>
        )}
      </View>

      {/* Tabelle */}
      <View style={s.tableHeader}>
        <Text style={s.th}>Datum</Text>
        <Text style={s.th}>Ø GAP</Text>
        <Text style={s.th}>Schnell</Text>
        <Text style={s.th}>Langsam</Text>
      </View>
      {[...sessions].reverse().map((w: any, i: number) => {
        const gaps = w.laps.map((l: any) => l.gap).filter((v: any) => v != null && v > 0);
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
});