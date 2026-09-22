import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Equipment, Sport } from '../utils/types';
import EquipmentPicker from './EquipmentPicker';

const ACCENT = '#C8F135';

interface SessionLike {
  equipmentId?: string;
  laps: { equipmentId?: string }[];
}

interface Props<T extends SessionLike> {
  session: T;
  sport: Sport;
  equipmentNameById: (id?: string) => string | null;
  onUpdateSession: (updated: T) => void; // Aufrufer speichert z.B. via updateWorkout(updated)
  assignMode: boolean;
  onAssignModeChange: (active: boolean) => void;
}

// Rendert die "Equipment"-Zeile oben in der Detailansicht.
// Tap fragt: ganze Session oder pro Runde unterschiedlich?
//   - "Whole session" öffnet direkt den Picker und setzt session.equipmentId
//     (löscht dabei vorhandene Pro-Runde-Zuweisungen, um Mehrdeutigkeit zu vermeiden).
//   - "Per lap" aktiviert assignMode; die eigentliche Zuweisung pro Runde
//     passiert dann im Lap-onPress-Handler von detail.tsx (siehe Integrationshinweis).
export default function EquipmentAssignment<T extends SessionLike>({
  session,
  sport,
  equipmentNameById,
  onUpdateSession,
  assignMode,
  onAssignModeChange,
}: Props<T>) {
  const [pickerVisible, setPickerVisible] = useState(false);

  const perLapCount = session.laps.filter((l) => l.equipmentId).length;

  function summaryText(): string {
    if (assignMode) return 'Tap a lap to assign equipment';
    if (session.equipmentId) {
      return equipmentNameById(session.equipmentId) ?? 'Whole session';
    }
    if (perLapCount > 0) {
      return `${perLapCount} lap${perLapCount === 1 ? '' : 's'} assigned`;
    }
    return 'Not set';
  }

  function handlePress() {
    if (assignMode) {
      onAssignModeChange(false);
      return;
    }
    Alert.alert(
      'Assign Equipment',
      'Use the same equipment for the whole session, or assign different equipment per lap?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Whole session', onPress: () => setPickerVisible(true) },
        { text: 'Per lap', onPress: () => onAssignModeChange(true) },
      ]
    );
  }

  function handleSessionEquipmentSelect(equipment: Equipment | null) {
    setPickerVisible(false);
    const updated: T = {
      ...session,
      equipmentId: equipment?.id,
      laps: session.laps.map((l) => ({ ...l, equipmentId: undefined })),
    };
    onUpdateSession(updated);
  }

  return (
    <>
      <TouchableOpacity style={s.row} onPress={handlePress}>
        <Ionicons
          name={sport === 'running' ? 'footsteps-outline' : 'bicycle-outline'}
          size={18}
          color={ACCENT}
          style={{ marginRight: 10 }}
        />
        <Text style={s.label}>Equipment</Text>
        <Text style={s.value} numberOfLines={1}>
          {summaryText()}
        </Text>
      </TouchableOpacity>

      {assignMode && (
        <TouchableOpacity style={s.doneButton} onPress={() => onAssignModeChange(false)}>
          <Text style={s.doneButtonText}>Done assigning</Text>
        </TouchableOpacity>
      )}

      <EquipmentPicker
        visible={pickerVisible}
        sport={sport}
        selectedId={session.equipmentId}
        onSelect={handleSessionEquipmentSelect}
        onClose={() => setPickerVisible(false)}
      />
    </>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  label: { color: '#FFFFFF', fontSize: 16, marginRight: 8 },
  value: { color: '#888888', fontSize: 14, marginLeft: 'auto', flexShrink: 1, textAlign: 'right' },
  doneButton: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  doneButtonText: { color: '#0D0D0D', fontWeight: '700', fontSize: 14 },
});
