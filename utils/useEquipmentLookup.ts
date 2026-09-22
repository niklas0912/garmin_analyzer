import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Equipment, loadEquipment } from '../utils/equipment';

// Lädt die Equipment-Liste einmal (bei Fokus, damit Änderungen aus dem
// Equipment-Manager berücksichtigt werden) und liefert eine schnelle
// id -> Equipment Nachschlagefunktion für die Anzeige in detail.tsx.
export function useEquipmentLookup() {
  const [byId, setById] = useState<Record<string, Equipment>>({});

  useFocusEffect(
    useCallback(() => {
      loadEquipment().then((list) => {
        const map: Record<string, Equipment> = {};
        for (const e of list) map[e.id] = e;
        setById(map);
      });
    }, [])
  );

  const nameById = useCallback((id?: string) => (id ? byId[id]?.name ?? null : null), [byId]);

  return { byId, nameById };
}
