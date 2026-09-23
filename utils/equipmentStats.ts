// ANPASSEN: Pfad/Namen an eure echten Typen in types.ts angleichen.
// Erwartet wird: Session { equipmentId?: string; laps: { equipmentId?: string; distance: number }[] }
import type { Session } from './types';

// Summiert die Distanz aller Laps, die diesem Equipment zugeordnet sind —
// entweder direkt (lap.equipmentId) oder über die ganze Session
// (session.equipmentId, z.B. wenn "Whole session" gewählt wurde).
// Bewusst berechnet statt als Feld auf Equipment gespeichert: so kann der
// Wert nie veralten, egal ob eine Zuweisung geändert, eine Session gelöscht
// oder eine Distanz durch Reparse korrigiert wird.
export function computeEquipmentKm(equipmentId: string, sessions: Session[]): number {
  let meters = 0;

  for (const session of sessions) {
    if (session.equipmentId === equipmentId) {
      meters += (session.laps ?? []).reduce((sum, lap) => {
        const d = lap.distance;
        return sum + (typeof d === 'number' && d > 0 ? d : 0);
      }, 0);
      continue; // Session-weite Zuweisung deckt alle Laps ab, kein Doppelzählen prüfen nötig
    }

    meters += (session.laps ?? [])
      .filter((lap) => lap.equipmentId === equipmentId)
      .reduce((sum, lap) => {
        const d = lap.distance;
        return sum + (typeof d === 'number' && d > 0 ? d : 0);
      }, 0);
  }

  return meters / 1000;
}
