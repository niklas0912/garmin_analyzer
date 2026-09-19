import AsyncStorage from '@react-native-async-storage/async-storage';

export type Sport = 'running' | 'bike';

export interface Equipment {
  id: string;
  name: string;
  sport: Sport;
  retired: boolean;
  createdAt: string; // ISO date string
}

const EQUIPMENT_KEY = 'equipment_v1';

export async function loadEquipment(): Promise<Equipment[]> {
  const raw = await AsyncStorage.getItem(EQUIPMENT_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Equipment[];
  } catch {
    return [];
  }
}

export async function loadEquipmentBySport(sport: Sport): Promise<Equipment[]> {
  const all = await loadEquipment();
  return all.filter((e) => e.sport === sport && !e.retired);
}

// Dedupliziert per id, gleiches Muster wie saveWorkout() in storage.ts
export async function saveEquipment(item: Equipment): Promise<void> {
  const all = await loadEquipment();
  const deduped = all.filter((e) => e.id !== item.id);
  deduped.push(item);
  await AsyncStorage.setItem(EQUIPMENT_KEY, JSON.stringify(deduped));
}

export async function updateEquipment(item: Equipment): Promise<void> {
  await saveEquipment(item);
}

export async function deleteEquipment(id: string): Promise<void> {
  const all = await loadEquipment();
  const filtered = all.filter((e) => e.id !== id);
  await AsyncStorage.setItem(EQUIPMENT_KEY, JSON.stringify(filtered));
}

export function makeEquipmentId(): string {
  return `eq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
