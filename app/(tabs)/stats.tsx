import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

// ANPASSEN: Funktionsnamen an eure echten Exporte aus storage.ts angleichen
// (z.B. loadAllWorkouts, loadWorkoutTypes o.ä.)
import { loadEquipment, Sport } from '../../utils/equipment';
import { loadAllWorkouts, loadWorkoutTypes } from '../../utils/storage';
import { DateRange, RangePreset } from '../../utils/types';
import { computeWeeklyVolume, presetToRange } from '../../utils/weeklyVolume';

const ACCENT = '#C8F135';
 
function parseDate(input: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return isNaN(date.getTime()) ? null : date;
}


function withThinnedLabels(
  data: { value: number; label: string }[]
): { value: number; label: string }[] {
  const n = data.length;
  if (n <= 8) return data;
  const step = Math.ceil(n / 8);
  return data.map((d, i) => ({ ...d, label: i % step === 0 ? d.label : '' }));
}

export default function StatsScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const [equipmentCount, setEquipmentCount] = useState(0);
  const [sport, setSport] = useState<Sport>('running');
  const [preset, setPreset] = useState<RangePreset>('3m');
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [weeklyData, setWeeklyData] = useState<{ value: number; label: string }[]>([]);

  // useFocusEffect statt useEffect für die Equipment-Zahl, damit sie nach
  // Rückkehr aus dem Equipment-Manager aktuell ist (siehe learnings.md)
  useFocusEffect(
    useCallback(() => {
      loadEquipment().then((list) => setEquipmentCount(list.length));
    }, [])
  );

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const [workouts, types] = await Promise.all([loadAllWorkouts(), loadWorkoutTypes()]);
      const range = preset === 'custom' && customRange ? customRange : presetToRange(preset);
      const weeks = computeWeeklyVolume(workouts, types, sport, range);
      if (cancelled) return;
      setWeeklyData(
        weeks.map((w) => ({
          value: Math.round(w.km * 10) / 10,
          label: `${w.weekStart.getDate()}.${w.weekStart.getMonth() + 1}.`,
        }))
      );
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [sport, preset, customRange]);
  // Fensterbreite minus horizontalem Padding von .list (16*2) und .settingsCard (12*2)
  const chartWidth = windowWidth - 16 * 2 - 12 * 2;
  const barCount = weeklyData.length || 1;
  const initialSpacing = 8;
  const endSpacing = 25;
  const usableWidth = Math.max(chartWidth - initialSpacing - endSpacing, 10);
  const unit = usableWidth / barCount; // Platz pro Balken inkl. Lücke
  const barWidth = Math.max(Math.min(unit * 0.6, 22), 3);
  const barSpacing = Math.max(unit - barWidth, 2);
  const chartData = withThinnedLabels(weeklyData);
  function applyCustomRange() {
    const from = parseDate(fromInput);
    const to = parseDate(toInput);
    if (from && to) {
      setCustomRange({ from, to });
      setPreset('custom');
      setCustomModalVisible(false);
    }
  }

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.list}>
        <Text style={s.title}>Stats</Text>

        <View style={s.settingsCard}>
          <Text style={s.sectionLabel}>Equipment</Text>
          <Text style={s.sectionSub}>
            {equipmentCount} item{equipmentCount === 1 ? '' : 's'}
          </Text>
          <TouchableOpacity style={s.button} onPress={() => router.push('/equipment-manager')}>
            <Text style={s.settingButtonText}>Manage Equipment</Text>
          </TouchableOpacity>
        </View>

        <View style={s.settingsCard}>
          <Text style={s.sectionLabel}>Weekly Volume</Text>

          <View style={s.toggleRow}>
            {(['running', 'bike'] as Sport[]).map((sp) => (
              <TouchableOpacity
                key={sp}
                style={[s.toggleChip, sport === sp && s.toggleChipActive]}
                onPress={() => setSport(sp)}
              >
                <Text style={[s.toggleChipText, sport === sp && s.toggleChipTextActive]}>
                  {sp === 'running' ? 'Running' : 'Bike'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.toggleRow}>
            {(['3m', '6m', '1y'] as RangePreset[]).map((p) => (
              <TouchableOpacity
                key={p}
                style={[s.toggleChip, preset === p && s.toggleChipActive]}
                onPress={() => setPreset(p)}
              >
                <Text style={[s.toggleChipText, preset === p && s.toggleChipTextActive]}>
                  {p === '3m' ? '3M' : p === '6m' ? '6M' : '1Y'}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[s.toggleChip, preset === 'custom' && s.toggleChipActive]}
              onPress={() => setCustomModalVisible(true)}
            >
              <Text style={[s.toggleChipText, preset === 'custom' && s.toggleChipTextActive]}>
                Custom
              </Text>
            </TouchableOpacity>
          </View>

          {weeklyData.length === 0 ? (
            <Text style={s.emptyText}>No sessions in this range.</Text>
          ) : (
            <BarChart
              data={chartData}
              width={chartWidth}
              disableScroll
              initialSpacing={initialSpacing}
              endSpacing={endSpacing}
              barWidth={barWidth}
              spacing={barSpacing}
              roundedTop
              frontColor={ACCENT}
              yAxisTextStyle={{ color: '#888' }}
              xAxisLabelTextStyle={{ color: '#888', fontSize: 10, }}
              labelWidth={15}
                            xAxisLabelsVerticalShift={2}
              noOfSections={4}
              rulesColor="#2A2A2A"
              backgroundColor="transparent"
            />
          )}
        </View>
      </ScrollView>

      <Modal visible={customModalVisible} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContainer}>
            <Text style={s.modalTitle}>Custom Range</Text>

            <Text style={s.colorLabel}>From (YYYY-MM-DD)</Text>
            <TextInput
              style={s.nameInput}
              value={fromInput}
              onChangeText={setFromInput}
              placeholder="2026-01-01"
              placeholderTextColor="#666"
            />

            <Text style={s.colorLabel}>To (YYYY-MM-DD)</Text>
            <TextInput
              style={s.nameInput}
              value={toInput}
              onChangeText={setToInput}
              placeholder="2026-09-18"
              placeholderTextColor="#666"
            />

            <View style={s.editActions}>
              <TouchableOpacity style={s.editButton} onPress={() => setCustomModalVisible(false)}>
                <Text style={s.settingButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.editButton, { borderColor: ACCENT, borderWidth: 1 }]}
                onPress={applyCustomRange}
              >
                <Text style={s.settingButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  list: { padding: 16, paddingTop: 60, gap: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#F0F0F0', marginBottom: 16 },
  settingsCard: {
    backgroundColor: '#222222',
    borderWidth: 0,
    borderColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
  },
  sectionLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  sectionSub: { color: '#888888', fontSize: 13, marginBottom: 12 },
  button: {
    backgroundColor: '#222222',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8F135',
  },
  settingButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  toggleChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
  },
  toggleChipActive: { backgroundColor: '#C8F135', borderColor: '#C8F135' },
  toggleChipText: { color: '#CCCCCC', fontSize: 13, fontWeight: '600' },
  toggleChipTextActive: { color: '#0D0D0D' },
  emptyText: { color: '#666666', fontStyle: 'italic', paddingVertical: 20, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: '#0D0D0D',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '600', marginBottom: 16 },
  colorLabel: { color: '#FFFFFF', fontSize: 14, marginBottom: 8 },
  nameInput: {
    backgroundColor: '#1A1A1A',
    color: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  editActions: { flexDirection: 'row', gap: 12 },
  editButton: { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 12, padding: 16, alignItems: 'center' },
});
