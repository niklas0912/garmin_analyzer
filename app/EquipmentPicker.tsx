import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Equipment, Sport, loadEquipmentBySport } from '../utils/equipment';

const ACCENT = '#C8F135';

interface Props {
  visible: boolean;
  sport: Sport;
  selectedId?: string;
  onSelect: (equipment: Equipment | null) => void;
  onClose: () => void;
}

// Verwendung in detail.tsx:
//   - Session-weit: ein Button/Zeile oben in der Detailansicht öffnet dies mit
//     selectedId={session.equipmentId}, onSelect setzt session.equipmentId und
//     ruft updateWorkout(session) auf.
//   - Pro Runde: z.B. per Long-Press auf eine Lap-Zeile (Tap ist ja bereits mit
//     isFast-Toggle belegt) öffnet dies mit selectedId={lap.equipmentId},
//     onSelect setzt laps[i].equipmentId und speichert per updateWorkout(session).
export default function EquipmentPicker({ visible, sport, selectedId, onSelect, onClose }: Props) {
  const [items, setItems] = useState<Equipment[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadEquipmentBySport(sport).then(setItems);
    }, [sport])
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.container}>
          <Text style={s.title}>Select Equipment</Text>

          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <Text style={s.emptyText}>No {sport} equipment yet. Add some in Stats.</Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[s.row, item.id === selectedId && s.rowSelected]}
                onPress={() => onSelect(item)}
              >
                <Ionicons
                  name={sport === 'running' ? 'footsteps-outline' : 'bicycle-outline'}
                  size={18}
                  color={ACCENT}
                  style={{ marginRight: 12 }}
                />
                <Text style={s.rowText}>{item.name}</Text>
                {item.id === selectedId && (
                  <Ionicons name="checkmark" size={18} color={ACCENT} style={{ marginLeft: 'auto' }} />
                )}
              </TouchableOpacity>
            )}
          />

          <TouchableOpacity style={s.clearButton} onPress={() => onSelect(null)}>
            <Text style={s.clearButtonText}>Clear selection</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.closeButton} onPress={onClose}>
            <Text style={s.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  container: {
    backgroundColor: '#0D0D0D',
    padding: 16,
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '600', marginBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  rowSelected: { borderWidth: 1, borderColor: ACCENT },
  rowText: { color: '#FFFFFF', fontSize: 16 },
  emptyText: { color: '#666666', fontStyle: 'italic', textAlign: 'center', marginVertical: 20 },
  clearButton: { padding: 12, alignItems: 'center' },
  clearButtonText: { color: '#888888', fontSize: 14 },
  closeButton: { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  closeButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
