import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  deleteEquipment,
  loadEquipment,
  makeEquipmentId,
  saveEquipment,
  updateEquipment,
} from '../utils/equipment';
import { computeEquipmentKm } from '../utils/equipmentStats';
import { loadAllWorkouts } from '../utils/storage';
import type {
  Equipment,
  Session,
  Sport
} from "../utils/types";

import { useSafeAreaInsets } from 'react-native-safe-area-context';



// in renderItem:

const ACCENT = '#C8F135';

export default function EquipmentManagerScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Equipment[]>([]);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [sportInput, setSportInput] = useState<Sport>('running');

  const refresh = useCallback(() => {
    loadEquipment().then(setItems);
  }, []);

  const [sessions, setSessions] = useState<Session[]>([]);

  // useFocusEffect(
  //   useCallback(() => {
  //     refresh();
  //     loadAllWorkouts().then(setSessions);
      
  //   }, [refresh])
  // );


  useFocusEffect(
  useCallback(() => {
    refresh();
    loadAllWorkouts().then((all) => {
      console.log('Sessions geladen:', all.length);
      setSessions(all);
    });
  }, [refresh])
);
  function openNew() {
    setEditing(null);
    setNameInput('');
    setSportInput('running');
    setEditorVisible(true);
  }

  function openEdit(item: Equipment) {
    setEditing(item);
    setNameInput(item.name);
    setSportInput(item.sport);
    setEditorVisible(true);
  }

  async function handleSave() {
    const trimmed = nameInput.trim();
    if (!trimmed) return;

const item: Equipment = editing
  ? { ...editing, name: trimmed, sport: sportInput }
  : {
      id: makeEquipmentId(),
      name: trimmed,
      sport: sportInput,
      retired: false,
      createdAt: new Date().toISOString(),
    };

    if (editing) {
      await updateEquipment(item);
    } else {
      await saveEquipment(item);
    }
    setEditorVisible(false);
    refresh();
  }

  function handleDelete(item: Equipment) {
    Alert.alert('Delete equipment', `Remove "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          // Alert.alert ist non-blocking: Löschung bewusst im onPress, nicht davor (siehe learnings.md)
          await deleteEquipment(item.id);
          refresh();
        },
      },
    ]);
  }
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.container, {paddingBottom: insets.bottom + 16}]}>
      <View style={s.content}>
        <Text style={s.title}>Equipment</Text>

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={s.emptyText}>No equipment yet.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.typeRow}
              onPress={() => openEdit(item)}
              onLongPress={() => handleDelete(item)}
            >
              <Ionicons
                name={item.sport === 'running' ? 'footsteps-outline' : 'bicycle-outline'}
                size={20}
                color={ACCENT}
                style={{ marginRight: 12 }}
              />
<View>
<Text style={s.typeName}>{item.name}</Text>
<View >
<Text style={s.kmNote}>{computeEquipmentKm(item.id, sessions).toFixed(1)} km</Text> 
</View>
</View>
           </TouchableOpacity>
          )}
        />

        <TouchableOpacity style={s.button} onPress={openNew}>
          <Text style={s.settingButtonText}>+ Add Equipment</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.closeButton} onPress={() => router.back()}>
          <Text style={s.typeName}>Close</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={editorVisible} animationType="slide" transparent>

        <View style={s.modalOverlay}>
                <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>

          <View style={s.modalContainer}>
            <Text style={s.modalTitle}>{editing ? 'Edit Equipment' : 'New Equipment'}</Text>

            <TextInput
              style={s.nameInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="e.g. Nike Pegasus 41"
              placeholderTextColor="#666"
            />

            <Text style={s.colorLabel}>Sport</Text>
            <View style={s.colorGrid}>
              {(['running', 'bike'] as Sport[]).map((sp) => (
                <TouchableOpacity
                  key={sp}
                  style={[s.sportOption, sportInput === sp && s.sportOptionSelected]}
                  onPress={() => setSportInput(sp)}
                >
                  <Ionicons
                    name={sp === 'running' ? 'footsteps-outline' : 'bicycle-outline'}
                    size={18}
                    color={sportInput === sp ? '#0D0D0D' : '#FFFFFF'}
                  />
                  <Text style={[s.sportOptionText, sportInput === sp && s.sportOptionTextSelected]}>
                    {sp === 'running' ? 'Running' : 'Bike'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.editActions}>
              <TouchableOpacity style={s.editButton} onPress={() => setEditorVisible(false)}>
                <Text style={s.settingButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.editButton, { borderWidth: 1, borderColor: ACCENT }]}
                onPress={handleSave}
              >
                <Text style={s.settingButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
              </View>

      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  content: { flex: 1, gap: 20, paddingTop: 60, paddingHorizontal: 20 },
  title: { fontSize: 22, fontWeight: '800', color: '#F0F0F0', marginBottom: 16 },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  typeName: { color: '#FFFFFF', fontSize: 16 },
    kmNote: { color:  '#666666', fontSize: 14 },

  emptyText: { color: '#666666', fontStyle: 'italic', textAlign: 'center', marginTop: 40 },
  button: {
    backgroundColor: '#222222',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8F135',
  },
  settingButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  closeButton: { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 16, alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: '#0D0D0D',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '600', marginBottom: 16 },
  nameInput: {
    backgroundColor: '#1A1A1A',
    color: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  colorLabel: { color: '#FFFFFF', fontSize: 14, marginBottom: 8 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  sportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: 'transparent',
  },
   sheet: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    // paddingBottom kommt oben dynamisch dazu
  },
  sportOptionSelected: { backgroundColor: '#C8F135', borderColor: '#FFFFFF' },
  sportOptionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  sportOptionTextSelected: { color: '#0D0D0D' },
  editActions: { flexDirection: 'row', gap: 12 },
  editButton: { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 12, padding: 16, alignItems: 'center' },
});
