import type { Equipment } from '@/utils/types';
import { Lap, Session, WorkoutType } from '@/utils/types';
import { useEquipmentLookup } from '@/utils/useEquipmentLookup';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { applyThresholdToLaps, formatThresholdInput, meanOf } from "../utils/details_utils";
import { formatPace } from '../utils/fitParser';
import { loadAllWorkouts, loadWorkoutTypes, repairSessionWoTypes, reparseAndUpdateWorkout, updateWorkout } from '../utils/storage';
import { Sport } from '../utils/types';
import EquipmentAssignment from './EquipmentAssignment';


/**
 * DetailScreen 
 *
 * Zeigt die Detailansicht einer einzelnen Trainingssession an: alle
 * einzelnen Runden (Laps) mit Distanz, Herzfrequenz und Pace.
 *
 * Der Nutzer kann einzelne Runden per Tap als "schnell" markieren
 * (z.B. um Tempo-Intervalle innerhalb eines längeren Laufs zu
 * kennzeichnen). Für diese markierten Runden wird oben eine
 * zusammenfassende Statistik-Box (Ø HF, Max HF, Ø GAP) eingeblendet.
 */
export default function DetailScreen() {
  // ID der anzuzeigenden Session kommt als Route-Parameter
  const { sessionId } = useLocalSearchParams();

  // Die geladene Session inkl. aller Laps; null solange noch nicht geladen
  const [session, setSession] = useState<Session>();

  // Eingabe für die manuelle Pace-Schwelle (Format m:ss), z.B. "4:30"
  const [thresholdInput, setThresholdInput] = useState('4:15');
  const [showOnlyFast, setShowOnlyFast] = useState(false);
  const [typePickerVisible, setTypePickerVisible] = useState(false);
  const [availableTypes, setAvailableTypes] = useState<WorkoutType[]>([]);
  const { nameById } = useEquipmentLookup();

  // Equipment-Zuweisung pro Runde: assignMode = Auswahlmodus aktiv,
  // selectedLapIndices = Set der markierten lap.index-Werte (1-basiert,
  // wie vom FIT-Parser vergeben — NICHT der Array-Index in session.laps!).
  const [assignMode, setAssignMode] = useState(false);
  const [selectedLapIndices, setSelectedLapIndices] = useState<Set<number>>(new Set());

  function handleSaveSession(updated: Session) {
    setSession(updated); // euer lokaler State
    updateWorkout(updated); // eure bestehende Storage-Funktion
  }

  function handleLapPress(index: number) {
    if (assignMode) {
      setSelectedLapIndices((prev) => {
        const next = new Set(prev);
        if (next.has(index)) {
          next.delete(index);
        } else {
          next.add(index);
        }
        return next;
      });
      return;
    }
    toggleLap(index);
  }

  function startLapSelection() {
    setSelectedLapIndices(new Set());
    setAssignMode(true);
  }

  function cancelLapSelection() {
    setAssignMode(false);
    setSelectedLapIndices(new Set());
  }

  // Wendet das gewählte Equipment auf ALLE markierten Runden auf einmal an
  // (Matching über lap.index, nicht über Array-Position — das war die
  // Ursache des Crashs bei der letzten Runde in der alten Einzel-Picker-Variante).
  function applyEquipmentToSelectedLaps(equipment: Equipment | null) {
    if (!session) return;

    const updated: Session = {
      ...session,
      laps: session.laps.map((l) =>
        selectedLapIndices.has(l.index) ? { ...l, equipmentId: equipment?.id } : l
      ),
    };

    cancelLapSelection();
    handleSaveSession(updated);
  }

  function toSport(value: string | undefined): Sport  {
    return value === 'running' || value === 'bike' ? value : "other";
  }

  const sport = toSport(session?.woType?.sports)
  console.log(sport)
  async function openTypePicker(): Promise<void> {
    const types: WorkoutType[] = await loadWorkoutTypes();
    setAvailableTypes(types);
    setTypePickerVisible(true);
  }

  /**
   * Ändert den Workout-Typ (= name) der aktuellen Session.
   * Da `name` sowohl der Typ als auch der Gruppierungsschlüssel für
   * loadWorkoutsByName ist, reicht ein simples updateWorkout mit neuem name —
   * die Session "wandert" dadurch automatisch in die Sessions-Liste des
   * neuen Typs.
   */
  async function changeWorkoutType(session: Session, newType: WorkoutType): Promise<void> {
    if (newType.name === session.name) {
      setTypePickerVisible(false);
      return;
    }

    Alert.alert(
      'Workout-Typ ändern?',
      `Diese Session wird von "${session.name}" zu "${newType.name}" verschoben.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Ändern',
          onPress: async () => {
            const updated: Session = { ...session, name: newType.name, woType:newType };
            await updateWorkout(updated);
            setSession(updated); // optimistisches Update der UI
            setTypePickerVisible(false);
          },
        },
      ]
    );
  }


function logger (){
  console.log(session)
  console.log(session?.woType)
  repairSessionWoTypes()
}
  // Lädt beim Mounten alle Workouts und sucht die passende Session anhand
  // der sessionId heraus. Lädt außerdem gleich die Workout-Typen mit —
  // vorher wurden die erst beim Öffnen des Type-Pickers geladen, wodurch
  // `sport` (und damit die Equipment-Zeile) beim ersten Rendern immer leer war.
  useEffect(() => {
    loadAllWorkouts().then((all: any[]) => {
      const found = all.find((w: any) => w.id === sessionId);
      if (found) setSession(found);
    });
    loadWorkoutTypes().then(setAvailableTypes);

  }, []);

  // Solange die Session noch nicht geladen ist, wird nur ein leerer
  // dunkler Hintergrund gerendert (verhindert Flackern/weißen Screen)
  if (!session) return <View style={{ flex: 1, backgroundColor: '#0D0D0D' }} />;

  // Datum der Session als Date-Objekt für die Anzeige oben
  const date = new Date(session.date);

  /**
   * Schaltet die "schnell"-Markierung (isFast) einer Runde per Lap-Index um.
   * Aktualisiert sowohl den lokalen State (für sofortiges UI-Feedback)
   * als auch den persistenten Speicher via updateWorkout.
   *
   * @param index - Der Lap-Index der umzuschaltenden Runde
   */
  function toggleLap(index: number) {
    if (!session) return;

    const updatedLaps = session.laps.map((lap: Lap) =>
      lap.index === index ? { ...lap, isFast: !lap.isFast } : lap
    );

    const updatedSession: Session = { ...session, laps: updatedLaps };
    setSession(updatedSession); // optimistisches Update der UI
    updateWorkout(updatedSession); // Persistierung im Speicher
  }

  /**
   * Markiert alle Runden als "schnell", deren GAP-Pace unter (bzw. gleich)
   * der eingegebenen Schwelle liegt. Erwartet Eingabe im Format m:ss.
   */
  function applyThreshold() {
    if (!session) return;
    const updatedLaps = applyThresholdToLaps(session.laps, thresholdInput);

    if (updatedLaps == null) {
      Alert.alert('Ungültige Eingabe', 'Bitte im Format m:ss eingeben, z.B. 4:30');
      return;
    }

    const updatedSession = { ...session, laps: updatedLaps };
    setSession(updatedSession);
    updateWorkout(updatedSession);
  }

  async function reparse_workout(wo: Session): Promise<void> {
    const reparsedSession = await reparseAndUpdateWorkout(wo);
    setSession(reparsedSession); // optimistisches Update der UI
  }

  // Alle als "schnell" markierten Runden, plus Flag ob überhaupt welche existieren
  const fastLaps = session.laps.filter((l: Lap) => l.isFast);
  const hasFastLaps = fastLaps.length > 0;

  const visibleLaps: Lap[] = showOnlyFast ? fastLaps : session.laps;
  return (
    <ScrollView contentContainerStyle={s.list}>
      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={s.title}>
            {date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="thermometer-outline" size={14} color="#C8F135" />
            <Text style={s.temperature}>
              {session.temperature != null ? `${session.temperature.toFixed(1)}°C` : '--'}
            </Text>
          </View>
        </View>
        <Text style={s.hint}>Tippe auf eine Runde um sie als schnell zu markieren</Text>

        {/* Zusammenfassungs-Box für "schnelle" Runden, nur wenn welche markiert sind */}
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
                  {formatPace(
                    fastLaps
                      .map((l: any) => l.pace)
                      .filter((v: any) => v > 0)
                      .reduce((a: number, b: number, _: any, arr: any[]) => a + b / arr.length, 0) || null
                  )}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Automatische Erkennung per Pace-Schwelle */}
        <View style={s.thresholdRow}>
          <TextInput
            style={s.thresholdInput}
            placeholder="z.B. 4:30"
            placeholderTextColor="#555555"
            value={thresholdInput}
            onChangeText={(text) => setThresholdInput(formatThresholdInput(text))}
            keyboardType="number-pad"
            maxLength={4}
          />
          <TouchableOpacity style={s.thresholdButton} onPress={applyThreshold}>
            <Text style={s.thresholdButtonText}>Select threshhold</Text>
          </TouchableOpacity>
        </View>

        <View style={{ paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity style={s.filterToggle} onPress={() => setShowOnlyFast(!showOnlyFast)}>
            <Text style={s.filterToggleText}>{showOnlyFast ? 'Show all' : 'Fast laps only'}</Text>
          </TouchableOpacity>
          {session.fitFileUri && (
            <TouchableOpacity style={s.filterToggle} onPress={() => reparse_workout(session)}>
              <Text style={s.filterToggleText}>Reparse</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.filterToggle} onPress={openTypePicker}>
            <Text style={s.filterToggleText}>Workout-Typ ändern</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.filterToggle} onPress={logger}>
            <Text> logger</Text>
            
          </TouchableOpacity>
        </View>

        {/* Tabellenkopf für die Lap-Liste */}
        <View style={s.tableHeader}>
          <Text style={[s.th, { flex: 0.5 }]}>#</Text>
          <Text style={s.th}>Dist</Text>
          <Text style={s.th}>Ø HR</Text>
          <Text style={s.th}>Max HR</Text>
          <Text style={s.th}>Pace</Text>
          <MaterialCommunityIcons name="elevation-rise" style={s.th}/>        
          <MaterialCommunityIcons name="elevation-decline" style={s.th}/>        
        </View>

        {/* Liste aller Runden, antippbar zum Markieren als "schnell" bzw.
            im Auswahlmodus zum Markieren für die Equipment-Zuweisung */}
        {visibleLaps.map((item: any, index: number) => (
          <TouchableOpacity
            key={item.index}
            style={[
              s.row,
              index % 2 === 0 && s.rowEven,
              item.isFast && s.rowFast,
              assignMode && selectedLapIndices.has(item.index) && s.rowSelected,
            ]}
            onPress={() => handleLapPress(item.index)}
          >
            <Text style={[s.td, { flex: 0.5 }]}>{item.isFast ? '⚡' : item.index}</Text>
            <Text style={s.td}>
              {item.distance >= 1000
                ? `${(item.distance / 1000).toFixed(2)}k`
                : `${Math.round(item.distance)}m`}
            </Text>
            <Text style={[s.td, { color: '#FF4D4D' }]}>{item.avgHr ?? '--'}</Text>
            <Text style={[s.td, { color: '#FF4D4D' }]}>{item.maxHr ?? '--'}</Text>
            <Text style={[s.td, { color: '#4DB8FF' }]}>{formatPace(item.pace)}</Text>
            <Text style={[s.td]}>{item.eUp ?? '--'}</Text>
            <Text style={[s.td]}>{item.eDown ?? '--'}</Text>

          </TouchableOpacity>
        ))}

        <Modal
          visible={typePickerVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setTypePickerVisible(false)}
        >
          <View style={s.pickerOverlay}>
            <View style={s.pickerContainer}>
              <Text style={s.modalTitle}>Neuer Workout-Typ</Text>
              {availableTypes.map((type) => (
                <TouchableOpacity
                  key={type.name}
                  style={s.typeOption}
                  onPress={() => changeWorkoutType(session, type)}
                >
                  <View style={[s.colorDot, { backgroundColor: type.color }]} />
                  <Text style={s.typeName}>{type.name}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={s.closeButton} onPress={() => setTypePickerVisible(false)}>
                <Text style={s.settingButtonText}>Abbrechen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>

        <EquipmentAssignment
          session={session}
          sport={sport}
          equipmentNameById={nameById}
          onUpdateSession={handleSaveSession}
          assignMode={assignMode}
          onStartLapSelection={startLapSelection}
          onCancelLapSelection={cancelLapSelection}
          selectedLapCount={selectedLapIndices.size}
          onAssignToSelectedLaps={applyEquipmentToSelectedLaps}
        />
    </ScrollView>
  );
}

// Styles im dunklen Design des restlichen Apps
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  list: { padding: 16, paddingTop: 60, paddingBottom: 60 },
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
  rowSelected: { backgroundColor: '#1A2530', borderLeftWidth: 3, borderLeftColor: '#4DB8FF' },
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
    textAlign: 'right',
    color: '#C8F135',
    fontSize: 13,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: '#0D0D0D',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  settingButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 20 },
  settingsCard: { backgroundColor: '#222222', borderWidth: 0, borderColor: '#FFFFFF', borderRadius: 12, padding: 12 },
  modalContainer: { flex: 1, backgroundColor: '#0D0D0D', padding: 16 },
  modalTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '600', marginBottom: 16 },
  colorDot: { width: 20, height: 20, borderRadius: 10, marginRight: 12 },
  typeName: { color: '#FFFFFF', fontSize: 16 },
  closeButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  modal: {paddingBottom: 15, paddingTop: 15}
});
