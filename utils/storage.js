import AsyncStorage from '@react-native-async-storage/async-storage';

// Schlüssel, unter dem ALLE Workouts als ein einziges JSON-Array
// in AsyncStorage gespeichert werden. "_v1" als Versions-Suffix,
// damit man das Speicherformat später (z.B. bei Strukturänderungen)
// über einen neuen Key ("workouts_v2") migrieren könnte, ohne alte
// Daten zu zerstören.
const KEY = 'workouts_v1';

/**
 * Speichert ein neues Workout (bzw. überschreibt ein vorhandenes mit
 * gleicher ID). AsyncStorage kennt kein "Anhängen" an bestehende Daten,
 * deshalb muss hier immer der komplette Datensatz neu zusammengebaut
 * und als Ganzes wieder gespeichert werden.
 *
 * Ablauf:
 * 1. Alle vorhandenen Workouts laden
 * 2. Ein eventuell vorhandenes Workout mit derselben ID entfernen
 *    (verhindert Duplikate, falls z.B. dieselbe FIT-Datei zweimal
 *    importiert wird)
 * 3. Das neue Workout hinten anhängen und alles zusammen speichern
 *
 * @param {object} workout - Das zu speichernde Workout-Objekt (muss ein eindeutiges `id`-Feld haben)
 */
export async function saveWorkout(workout) {
  const existing = await loadAllWorkouts();
  const filtered = existing.filter(w => w.id !== workout.id);
  await AsyncStorage.setItem(KEY, JSON.stringify([...filtered, workout]));
}

/**
 * Lädt alle Workouts eines bestimmten Namens/Typs (z.B. "Intervalle 400m"),
 * chronologisch aufsteigend sortiert nach Datum (älteste zuerst).
 * Wird u.a. für die Sessions-Liste und die Fortschritts-Charts genutzt,
 * die auf eine zeitliche Reihenfolge angewiesen sind.
 *
 * @param {string} name - Der Workout-Typ, nach dem gefiltert wird
 * @returns {Promise<object[]>} Liste der passenden Workouts, sortiert nach Datum (aufsteigend)
 */
export async function loadWorkoutsByName(name) {
  const all = await loadAllWorkouts();
  return all
    .filter(w => w.name === name)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * Lädt sämtliche gespeicherten Workouts, unabhängig vom Typ.
 * Bildet die Basis für alle anderen Storage-Funktionen dieser Datei,
 * da AsyncStorage nur EIN großes JSON-Array unter `KEY` verwaltet.
 *
 * Wandelt dabei das `date`-Feld jedes Workouts von einem reinen
 * JSON-String zurück in ein echtes `Date`-Objekt, da beim
 * Serialisieren (JSON.stringify) Date-Objekte automatisch zu Strings
 * werden und dieser Schritt sie beim Laden wieder "reparieren" muss.
 *
 * @returns {Promise<object[]>} Alle gespeicherten Workouts (leeres Array, falls noch nichts gespeichert wurde)
 */
export async function loadAllWorkouts() {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  return JSON.parse(raw).map(w => ({ ...w, date: new Date(w.date) }));
}

/**
 * Entfernt ein einzelnes Workout anhand seiner ID unwiderruflich
 * aus dem Speicher.
 *
 * @param {string} id - Die ID des zu löschenden Workouts
 */
export async function deleteWorkout(id) {
  const all = await loadAllWorkouts();
  await AsyncStorage.setItem(KEY, JSON.stringify(all.filter(w => w.id !== id)));
}

/**
 * Aktualisiert ein bereits vorhandenes Workout (z.B. nachdem in
 * detail.tsx eine Runde als "schnell" markiert wurde). Im Unterschied
 * zu saveWorkout wird hier die Position in der Liste beibehalten
 * (map statt filter + append), auch wenn das Endergebnis dasselbe ist.
 *
 * Hinweis: Enthält das übergebene `workout` keine ID, die in den
 * gespeicherten Daten existiert, passiert nichts – map() ersetzt
 * dann einfach kein Element.
 *
 * @param {object} workout - Das aktualisierte Workout-Objekt (muss die ID eines vorhandenen Workouts tragen)
 */
export async function updateWorkout(workout) {
  const existing = await loadAllWorkouts();
  const updated = existing.map(w => w.id === workout.id ? workout : w);
  await AsyncStorage.setItem(KEY, JSON.stringify(updated));
}