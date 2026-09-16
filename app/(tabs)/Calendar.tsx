import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View, } from 'react-native';
import { dateKey, groupSessionsByDate, weekDistance } from '../../utils/sessionStats';
import { loadAllWorkouts, loadDayNotes, loadWorkoutTypes, saveDayNote } from '../../utils/storage';
import { Session, WorkoutType } from '../../utils/types';

const COLORS = { bg: '#0D0D0D', card: '#1A1A1A', accent: '#C8F135', text: '#FFFFFF', muted: '#8A8A8A' };

function getMonthGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Montag = 0
  const gridStart = new Date(year, month, 1 - startOffset);
  const weeks: Date[][] = [];
  let cursor = new Date(gridStart);
  while (cursor.getMonth() === month || weeks.length < 6) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    if (cursor.getMonth() !== month && cursor > first) break;
  }
  return weeks;
}

export default function CalendarScreen() {
  const [current, setCurrent] = useState(new Date());
  const [byDate, setByDate] = useState<Record<string, Session[]>>({});
  const [types, setTypes] = useState<WorkoutType[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
const panResponder = useRef(
  PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => {
      // Nur horizontale Wischgesten abfangen, vertikales Scrollen der Wochen nicht blockieren
      return Math.abs(gesture.dx) > 20 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 2;
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx < -40) {
        // nach links wischen → nächster Monat
        setCurrent(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
      } else if (gesture.dx > 40) {
        // nach rechts wischen → vorheriger Monat
        setCurrent(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
      }
    },
  })
).current;
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [sessions, workoutTypes] = await Promise.all([loadAllWorkouts(), loadWorkoutTypes()]);
        setByDate(groupSessionsByDate(sessions));
        setTypes(workoutTypes);
      })();
    }, [])
  );

  const year = current.getFullYear();
  const month = current.getMonth();
  const weeks = getMonthGrid(year, month);

  const colorFor = (name: string) => types.find(t => t.name === name)?.color ?? COLORS.accent;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={styles.header}>
        <Pressable onPress={() => setCurrent(new Date(year, month - 1, 1))}>
          <Text style={styles.nav}>‹</Text>
        </Pressable>
        <Text style={styles.title}>{current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
        <Pressable onPress={() => setCurrent(new Date(year, month + 1, 1))}>
          <Text style={styles.nav}>›</Text>
        </Pressable>
      </View>

      <ScrollView {...panResponder.panHandlers}>
        {weeks.map((week, wi) => {
          const sessionsThisWeek = week.flatMap(d => byDate[dateKey(d)] ?? []);
          return (
            <View key={wi} style={styles.weekRow}>
              {week.map(day => {
                const key = dateKey(day);
                const daySessions = byDate[key] ?? [];
                const inMonth = day.getMonth() === month;
                return (
                  <Pressable
                    key={key}
                    style={[styles.dayCell, !inMonth && { opacity: 0.35 }]}
                    onPress={() => setSelectedDate(key)}
                  >
                    <Text style={styles.dayNumber}>{day.getDate()}</Text>
                    {daySessions.map(s => (
                      <View key={s.id} style={[styles.dot, { backgroundColor: colorFor(s.name) }]}>
                        <Text style={styles.dotText} numberOfLines={1}>
                          {s.name.split(' ')[1] ?? s.name}
                        </Text>
                      </View>
                    ))}
                  </Pressable>
                );
              })}
              <View style={styles.weekSummary}>
                <Text style={styles.weekLabel}>Week</Text>
                <Text style={styles.weekValue}>{(weekDistance(sessionsThisWeek) / 1000).toFixed(1)} km</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {selectedDate && (
        <DayDetailSheet
          date={selectedDate}
          sessions={byDate[selectedDate] ?? []}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </View>
  );
}



function DayDetailSheet({ date, sessions, onClose }: { date: string; sessions: Session[]; onClose: () => void }) {
  const [note, setNote] = useState('');

  useEffect(() => {
    loadDayNotes().then(notes => setNote(notes[date] ?? ''));
  }, [date]);

  return (
    <View style={styles.sheet}>
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>{new Date(date).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        <Pressable onPress={onClose}><Ionicons name="close" size={24} color={COLORS.text} /></Pressable>
      </View>

      {sessions.length === 0 && <Text style={styles.muted}>No workout on this day.</Text>}

      {sessions.map(s => {
        const distanceKm = (s.laps.reduce((a, l) => a + (l.distance ?? 0), 0) / 1000).toFixed(2);
        return (
          <Pressable
            key={s.id}
            style={styles.sessionRow}
            onPress={() => { onClose(); router.push({ pathname: '/detail', params: { sessionId: s.id } }); }}
          >
            <Text style={styles.sessionType}>{s.name}</Text>
            <Text style={styles.sessionDistance}>{distanceKm} km</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
          </Pressable>
        );
      })}

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={styles.notesInput}
        multiline
        value={note}
        onChangeText={setNote}
        onBlur={() => saveDayNote(date, note)}
        placeholder="Add a note for this day..."
        placeholderTextColor={COLORS.muted}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 8,
  },
  nav: {
    color: COLORS.accent,
    fontSize: 28,
    fontWeight: '600',
    paddingHorizontal: 12,
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2A2A2A',
  },
  dayCell: {
    flex: 1,
    minHeight: 64,
    padding: 4,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#2A2A2A',
  },
  dayNumber: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 2,
  },
  dot: {
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginBottom: 2,
  },
  dotText: {
    color: '#0D0D0D',
    fontSize: 10,
    fontWeight: '600',
  },
  weekSummary: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
  },
  weekLabel: {
    color: COLORS.muted,
    fontSize: 10,
  },
  weekValue: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
  },

  // DayDetailSheet
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '600',
  },
  muted: {
    color: COLORS.muted,
    fontSize: 14,
    marginBottom: 12,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#242424',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  sessionType: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
  },
  sessionDistance: {
    color: COLORS.accent,
    fontSize: 14,
    marginRight: 8,
  },
  label: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 12,
    marginBottom: 6,
  },
    notesInput: {
    backgroundColor: '#242424',
    color: COLORS.text,
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    }
})