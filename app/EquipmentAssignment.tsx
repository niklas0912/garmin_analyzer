import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  onStartLapSelection: () => void; // "Per lap" im Alert gewählt
  onCancelLapSelection: () => void; // Cancel-Button während der Auswahl
  selectedLapCount: number; // Anzahl aktuell markierter Runden (aus detail.tsx)
  onAssignToSelectedLaps: (equipment: Equipment | null) => void;
}

// Rendert die "Equipment"-Zeile oben in der Detailansicht.
// Tap fragt: ganze Session oder pro Runde unterschiedlich?
//   - "Whole session" öffnet direkt den Picker und setzt session.equipmentId
//     (löscht dabei vorhandene Pro-Runde-Zuweisungen, um Mehrdeutigkeit zu vermeiden).
//   - "Per lap" aktiviert den Auswahlmodus: Tippen auf Runden markiert/entmarkiert
//     sie nur (in detail.tsx), hier erscheint eine Leiste mit der Anzahl und
//     einem "Assign equipment"-Button, der EINMAL den Picker öffnet und das
//     Ergebnis auf alle markierten Runden anwendet (statt pro Runde einzeln).
export default function EquipmentAssignment<T extends SessionLike>({
  session,
  sport,
  equipmentNameById,
  onUpdateSession,
  assignMode,
  onStartLapSelection,
  onCancelLapSelection,
  selectedLapCount,
  onAssignToSelectedLaps,
}: Props<T>) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [batchPickerVisible, setBatchPickerVisible] = useState(false);

  const perLapCount = session.laps.filter((l) => l.equipmentId).length;

  function summaryText(): string {
    if (assignMode) return 'Selecting laps…';
    if (session.equipmentId) {
      return equipmentNameById(session.equipmentId) ?? 'Whole session';
    }
    if (perLapCount > 0) {
      return `${perLapCount} lap${perLapCount === 1 ? '' : 's'} assigned`;
    }
    return 'Not set';
  }

  function handlePress() {
    if (assignMode) return; // während der Auswahl steuert die Leiste unten, nicht die Zeile selbst
    Alert.alert(
      'Assign Equipment',
      'Use the same equipment for the whole session, or assign different equipment per lap?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Whole session', onPress: () => setPickerVisible(true) },
        { text: 'Per lap', onPress: onStartLapSelection },
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

  function handleBatchEquipmentSelect(equipment: Equipment | null) {
    setBatchPickerVisible(false);
    onAssignToSelectedLaps(equipment);
  }

  return (
    <>
    <View style={s.all}>
      <TouchableOpacity style={s.row} onPress={handlePress} disabled={assignMode}>
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
        <View style={s.selectionBar}>
          <Text style={s.selectionText}>
            {selectedLapCount === 0
              ? 'Tap laps to select them'
              : `${selectedLapCount} lap${selectedLapCount === 1 ? '' : 's'} selected`}
          </Text>
          <View style={s.selectionActions}>
            <TouchableOpacity style={s.cancelButton} onPress={onCancelLapSelection}>
              <Text style={s.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.assignButton, selectedLapCount === 0 && s.assignButtonDisabled]}
              disabled={selectedLapCount === 0}
              onPress={() => setBatchPickerVisible(true)}
            >
              <Text style={s.assignButtonText}>Assign equipment</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <EquipmentPicker
        visible={pickerVisible}
        sport={sport}
        selectedId={session.equipmentId}
        onSelect={handleSessionEquipmentSelect}
        onClose={() => setPickerVisible(false)}
      />

      <EquipmentPicker
        visible={batchPickerVisible}
        sport={sport}
        onSelect={handleBatchEquipmentSelect}
        onClose={() => setBatchPickerVisible(false)}
      />
      </View>
    </>
  );
}

const s = StyleSheet.create({
  all: {paddingTop: 30},
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
  selectionBar: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 10,
  },
  selectionText: { color: '#CCCCCC', fontSize: 13 },
  selectionActions: { flexDirection: 'row', gap: 8 },
  cancelButton: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: { color: '#CCCCCC', fontWeight: '600', fontSize: 14 },
  assignButton: {
    flex: 1,
    backgroundColor: ACCENT,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  assignButtonDisabled: { backgroundColor: '#3A3F1E' },
  assignButtonText: { color: '#0D0D0D', fontWeight: '700', fontSize: 14 },
});
