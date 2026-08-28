import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { meanOf } from "../utils/details_utils";
import { formatPace } from '../utils/fitParser';
import { loadWorkoutsByName } from '../utils/storage.ts';
import { Lap, Session } from '../utils/types';



export default function comparScreen() {
    const [showOnlyFast, setShowOnlyFast] = useState<Boolean>(true);

    const { workout, ids } = useLocalSearchParams();
    const selectedIds = (ids as string).split(',');

    const [sessions, setSessions] = useState<Session[]>([]);

    useEffect(() => {
    loadWorkoutsByName(workout as string).then(all => {
        const filtered = (all as Session[]).filter((w: Session) => selectedIds.includes(w.id));
        setSessions(filtered as Session[]);
    });
    }, [workout, ids]);
    console.log("test")
    console.log(sessions)


    
return (
 <ScrollView contentContainerStyle={s.list}>
    
             <TouchableOpacity
                 style={s.filterToggle}
                 onPress={() => setShowOnlyFast(!showOnlyFast)}
               >
                 <Text style={s.filterToggleText}>
                   {showOnlyFast ? 'Show all' : 'Fast laps only'}
                 </Text>
               </TouchableOpacity>
    <View style={{ flexDirection: 'row', gap: 8 }}>
    {sessions.map(session => {
    const date = new Date(session.date);
    const fastLaps = session.laps.filter((l: Lap) => l.isFast);
    
    const hasFastLaps = fastLaps.length > 0;
    const visibleLaps: Lap[] = showOnlyFast ? fastLaps : session.laps;

    return (
      <View key={session.id} style={{ flex: 1 }}>
        {/* Datum über dem Tabellenkopf dieser Session */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={s.compareDate}>
        {date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
      </Text>
    
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Ionicons name="thermometer-outline" size={14} color="#C8F135" />
        <Text style={s.temperature}>
          {session.temperature != null ? `${session.temperature.toFixed(1)}°C` : "--"}
        </Text>
      </View>
    </View>
         {hasFastLaps && (
                <View style={s.summary}>
                  <Text style={s.summaryTitle}>Fast laps metrics ({fastLaps.length})</Text>
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
        

        <View style={s.tableHeader}>
          <Text style={[s.th, { flex: 0.5 }]}>#</Text>
          <Text style={s.th}>Dist</Text>
          <Text style={s.th}>Ø HR</Text>
          <Text style={s.th}>Max HR</Text>
          <Text style={s.th}>Pace</Text>
        </View>
        {visibleLaps.map((item: any, index: number) => (
              <TouchableOpacity
                key={item.index}
                style={[s.row, index % 2 === 0 && s.rowEven, item.isFast && s.rowFast]}
                onPress={() => console.log("upsi")}
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
      </View>
      
    );
  })}
</View>
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
    padding: 14, marginBottom: 10,
    borderLeftWidth: 3, borderLeftColor: '#C8F135',
  },
  summaryTitle: { color: '#C8F135', fontWeight: '700', fontSize: 13, marginBottom: 12 },
  summaryStats: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statLabel: { color: '#555555', fontSize: 11, marginBottom: 2 },
  statValue: { fontSize: 15, fontWeight: '800' },
  tableHeader: {
    flexDirection: 'row', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: '#2E2E2E', marginBottom: 4,
  },
//   th: { flex: 1, color: '#555555', fontSize: 11, textAlign: 'center' },
th: {flex: 1, color: '#F0F0F0', fontSize: 8, textAlign: 'center' },

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
  compareDate: {
    color: '#F0F0F0',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 6,
  },
});

