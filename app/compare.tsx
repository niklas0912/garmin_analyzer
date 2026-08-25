import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { loadWorkoutsByName } from '../utils/storage';




export default function SessionsScreen() {
    type Session = {
        id: string;
        name: string;
        date: Date;
        laps: any[];
        temperature: number
    }; 
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
    <View style={s.container}>
     <Text style={s.title}> Test </Text>
    <View style={{ flexDirection: 'row', gap: 8 }}>
             

  {sessions.map(session => (
    <View key={session.id}>
      {/* Detail-Inhalte dieser Session */}
      <Text style={s.title}> test2 {session.temperature}</Text>
    </View>
  ))}
</View>
</View>

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

