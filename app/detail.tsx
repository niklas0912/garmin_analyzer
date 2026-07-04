import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatPace } from '../utils/fitParser';
import { loadAllWorkouts, updateWorkout } from '../utils/storage';

export default function DetailScreen() {
  const { sessionId } = useLocalSearchParams();
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    loadAllWorkouts().then((all: any[]) => {
      console.log('Alle IDs:', all.map(w => w.id));
      console.log('Suche:', sessionId);
      const found = all.find((w: any) => w.id === sessionId);
      console.log('Gefunden:', found ? 'ja' : 'nein');

      if (found) setSession(found);
    });
  }, []);

  if (!session) return <View style={{ flex: 1, backgroundColor: '#0D0D0D' }} />;

  const date = new Date(session.date);

  function toggleLap(index: number) {
    console.log('Toggle Lap:', index);
    console.log('Laps indices:', session.laps.map((l: any) => l.index));

    const updatedLaps = session.laps.map((lap: any) =>
      lap.index === index ? { ...lap, isFast: !lap.isFast } : lap
    );
    console.log('isFast nach update:', updatedLaps.map((l: any) => l.isFast));

    const updatedSession = { ...session, laps: updatedLaps };
    setSession(updatedSession);
    updateWorkout(updatedSession);
  }

  const fastLaps = session.laps.filter((l: any) => l.isFast);
  const hasFastLaps = fastLaps.length > 0;

  function meanOf(laps: any[], key: string) {
    const vals = laps.map((l: any) => l[key]).filter((v: any) => v != null && v > 0 && v < 220);
    return vals.length ? Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length) : null;
  }

  return (
<ScrollView contentContainerStyle={s.list}>
  <Text style={s.title}>
    {date.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
  </Text>
  <Text style={s.hint}>Tippe auf eine Runde um sie als schnell zu markieren</Text>

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
            {formatPace(fastLaps.map((l: any) => l.gap).filter((v: any) => v > 0).reduce((a: number, b: number, _: any, arr: any[]) => a + b / arr.length, 0) || null)}
          </Text>
        </View>
      </View>
    </View>
  )}

  <View style={s.tableHeader}>
    <Text style={[s.th, { flex: 0.5 }]}>#</Text>
    <Text style={s.th}>Dist</Text>
    <Text style={s.th}>Ø HF</Text>
    <Text style={s.th}>Max HF</Text>
    <Text style={s.th}>GAP</Text>
  </View>

  {session.laps.map((item: any, index: number) => (
    <TouchableOpacity
      key={item.index}
      style={[s.row, index % 2 === 0 && s.rowEven, item.isFast && s.rowFast]}
      onPress={() => toggleLap(item.index)}
    >
      <Text style={[s.td, { flex: 0.5 }]}>{item.isFast ? '⚡' : item.index}</Text>
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