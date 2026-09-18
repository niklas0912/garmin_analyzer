import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
import { parseFitFile } from './fitParser';
import type { Session } from './types';

// ─────────────────────────────────────────────────────────────────────────
// Speicher-Layout (v2): Index (klein, oft gelesen) + 1 Key pro Session
// (volle Daten inkl. Laps). Ersetzt das alte v1-Format, in dem ALLE
// Workouts als ein einziges großes JSON-Array unter `LEGACY_KEY` lagen —
// dort kostete jede Operation (auch das Ändern eines einzigen Lap) das
// Laden+Schreiben sämtlicher jemals importierten Sessions.
// ─────────────────────────────────────────────────────────────────────────
const LEGACY_KEY = 'workouts_v1';
const INDEX_KEY = 'workout_index_v2';
const SESSION_KEY_PREFIX = 'workout_v2:';

type IndexEntry = {
  id: string;
  name: string;
  date: string; // ISO-String im Index
};

function sessionKey(id: string): string {
  return `${SESSION_KEY_PREFIX}${id}`;
}

function toIndexEntry(w: Session): IndexEntry {
  return { id: w.id, name: w.name, date: w.date.toISOString() };
}

function deserializeSession(raw: string): Session {
  const parsed = JSON.parse(raw) as Session;
  return { ...parsed, date: new Date(parsed.date) };
}

// ─────────────────────────────────────────────────────────────────────────
// Migration: altes Gesamt-Array (LEGACY_KEY) → Index + Einzel-Keys.
// Wird automatisch von loadIndex() getriggert (siehe dortiger Kommentar).
// migrationChecked verhindert, dass der Legacy-Check nach der ersten
// erfolgreichen Migration bei jedem einzelnen Storage-Zugriff erneut
// einen AsyncStorage.getItem-Call verursacht.
// ─────────────────────────────────────────────────────────────────────────
let migrationChecked = false;

async function migrateFromLegacyIfNeeded(): Promise<void> {
  if (migrationChecked) return;

  const legacyRaw = await AsyncStorage.getItem(LEGACY_KEY);
  if (!legacyRaw) {
    migrationChecked = true;
    return;
  }

  const legacySessions = (JSON.parse(legacyRaw) as Session[]).map(w => ({
    ...w,
    date: new Date(w.date),
  }));

  const index: IndexEntry[] = legacySessions.map(toIndexEntry);
  const entries: [string, string][] = legacySessions.map(s => [
    sessionKey(s.id),
    JSON.stringify(s),
  ]);
  entries.push([INDEX_KEY, JSON.stringify(index)]);

  await AsyncStorage.multiSet(entries);
  await AsyncStorage.removeItem(LEGACY_KEY);

  console.log(`Migration abgeschlossen: ${legacySessions.length} Workouts überführt.`);
  migrationChecked = true;
}

async function loadIndex(): Promise<IndexEntry[]> {
  // Triggert die Migration beim allerersten Storage-Zugriff nach dem Update —
  // jede öffentliche Funktion unten ruft loadIndex() als ersten Schritt auf.
  await migrateFromLegacyIfNeeded();
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  return raw ? (JSON.parse(raw) as IndexEntry[]) : [];
}

// ─────────────────────────────────────────────────────────────────────────
// Öffentliche API — Signaturen unverändert gegenüber v1
// ─────────────────────────────────────────────────────────────────────────

export async function saveWorkout(workout: Session): Promise<void> {
  const index = await loadIndex();
  const updatedIndex = [...index.filter(e => e.id !== workout.id), toIndexEntry(workout)];

  await AsyncStorage.multiSet([
    [sessionKey(workout.id), JSON.stringify(workout)],
    [INDEX_KEY, JSON.stringify(updatedIndex)],
  ]);
}

export async function loadAllWorkouts(): Promise<Session[]> {
  const index = await loadIndex();
  if (index.length === 0) return [];

  const pairs = await AsyncStorage.multiGet(index.map(e => sessionKey(e.id)));
  return pairs
    .map(([, raw]) => raw)
    .filter((raw): raw is string => raw !== null)
    .map(deserializeSession);
}

export async function loadWorkoutsByName(name: string): Promise<Session[]> {
  const index = await loadIndex();
  const matching = index.filter(e => e.name === name);
  if (matching.length === 0) return [];

  const pairs = await AsyncStorage.multiGet(matching.map(e => sessionKey(e.id)));
  const sessions = pairs
    .map(([, raw]) => raw)
    .filter((raw): raw is string => raw !== null)
    .map(deserializeSession);

  return sessions.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export async function updateWorkout(workout: Session): Promise<void> {
  const index = await loadIndex();
  const idx = index.findIndex(e => e.id === workout.id);

  // Sicherheitsnetz für den Fall, dass das Workout (noch) nicht im Index
  // steht — verhält sich dann wie saveWorkout statt still nichts zu tun
  // (anders als das alte map()-Verhalten, das bei ID-Mismatch schweigend
  // nichts ersetzte).
  if (idx === -1) {
    await saveWorkout(workout);
    return;
  }

  const updatedIndex = [...index];
  updatedIndex[idx] = toIndexEntry(workout);

  await AsyncStorage.multiSet([
    [sessionKey(workout.id), JSON.stringify(workout)],
    [INDEX_KEY, JSON.stringify(updatedIndex)],
  ]);
}

export async function deleteWorkout(id: string): Promise<void> {
  const index = await loadIndex();
  const entry = index.find(e => e.id === id);
  if (!entry) return;

  // FIT-Datei von Disk löschen — wie im alten deleteWorkout.
  // Dafür muss die volle Session geladen werden (der Index kennt fitFileUri nicht).
  const raw = await AsyncStorage.getItem(sessionKey(id));
  if (raw) {
    const workout = deserializeSession(raw);
    if (workout.fitFileUri) {
      const file = new File(workout.fitFileUri);
      if (file.exists) {
        file.delete();
      }
    }
  }

  const updatedIndex = index.filter(e => e.id !== id);
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(updatedIndex));
  await AsyncStorage.removeItem(sessionKey(id));
}

export async function deleteAllWorkouts(): Promise<void> {
  const index = await loadIndex();
  // FIT-Dateien aller Workouts löschen, bevor die Keys verschwinden
  const pairs = await AsyncStorage.multiGet(index.map(e => sessionKey(e.id)));
  for (const [, raw] of pairs) {
    if (!raw) continue;
    const workout = deserializeSession(raw);
    if (workout.fitFileUri) {
      const file = new File(workout.fitFileUri);
      if (file.exists) {
        file.delete();
      }
    }
  }

  if (index.length > 0) {
    await AsyncStorage.multiRemove(index.map(e => sessionKey(e.id)));
  }
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify([]));
}

export async function reparseAndUpdateWorkout(workout: Session): Promise<Session> {
  const reparsedSession: Session = await parseFitFile(workout.fitFileUri, workout.name);
  reparsedSession.id = workout.id; // ID des Original-Workouts erzwingen

  const oldFastByIndex = new Map(workout.laps.map(lap => [lap.index, lap.isFast]));
  reparsedSession.laps = reparsedSession.laps.map(lap => ({
    ...lap,
    isFast: oldFastByIndex.get(lap.index) ?? false,
  }));

  await updateWorkout(reparsedSession);
  return reparsedSession;
}

// ─────────────────────────────────────────────────────────────────────────
// Unverändert: Workout-Typen und Kalender-Notizen waren schon vorher
// eigene, kleine Keys — keine Migration nötig.
// ─────────────────────────────────────────────────────────────────────────

export interface WorkoutType {
  name: string;
  color: string;
}

const TYPES_KEY = 'workout_types_v1';

const DEFAULT_TYPES: WorkoutType[] = [
  { name: 'Intervalle 400m', color: '#C8F135' },
  { name: 'Intervalle 6min', color: '#4DB8FF' },
  { name: 'Intervalle all Out', color: '#FF4D4D' },
];

export async function loadWorkoutTypes(): Promise<WorkoutType[]> {
  const raw = await AsyncStorage.getItem(TYPES_KEY);
  if (!raw) {
    await AsyncStorage.setItem(TYPES_KEY, JSON.stringify(DEFAULT_TYPES));
    return DEFAULT_TYPES;
  }
  return JSON.parse(raw) as WorkoutType[];
}

export async function addWorkoutType(type: WorkoutType): Promise<WorkoutType[]> {
  const existing = await loadWorkoutTypes();
  const updated = [...existing, type];
  await AsyncStorage.setItem(TYPES_KEY, JSON.stringify(updated));
  return updated;
}

export async function deleteWorkoutType(type: WorkoutType): Promise<WorkoutType[]> {
  const existing = await loadWorkoutTypes();
  const updated = existing.filter(wType => wType.name !== type.name);
  await AsyncStorage.setItem(TYPES_KEY, JSON.stringify(updated));
  return updated;
}

const NOTES_KEY = 'calendar_notes_v1';

export async function loadDayNotes(): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(NOTES_KEY);
  return raw ? JSON.parse(raw) : {};
}

export async function saveDayNote(date: string, note: string): Promise<void> {
  const notes = await loadDayNotes();
  if (note.trim().length === 0) {
    delete notes[date];
  } else {
    notes[date] = note;
  }
  await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}