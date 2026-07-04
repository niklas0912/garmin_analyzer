import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'workouts_v1';

export async function saveWorkout(workout) {
  const existing = await loadAllWorkouts();
  const filtered = existing.filter(w => w.id !== workout.id);
  await AsyncStorage.setItem(KEY, JSON.stringify([...filtered, workout]));
}

export async function loadWorkoutsByName(name) {
  const all = await loadAllWorkouts();
  return all
    .filter(w => w.name === name)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

export async function loadAllWorkouts() {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  return JSON.parse(raw).map(w => ({ ...w, date: new Date(w.date) }));
}

export async function deleteWorkout(id) {
  const all = await loadAllWorkouts();
  await AsyncStorage.setItem(KEY, JSON.stringify(all.filter(w => w.id !== id)));
}

export async function updateWorkout(workout) {
    const existing = await loadAllWorkouts();
    const updated = existing.map(w => w.id === workout.id ? workout : w);
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  }