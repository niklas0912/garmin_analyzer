
import type { Session, Sport } from './types';


// Datum -> 'YYYY-MM-DD' Key, unabhängig von Uhrzeit
export function dateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function groupSessionsByDate(sessions: Session[]): Record<string, Session[]> {
  return sessions.reduce((acc, s) => {
    const key = dateKey(new Date(s.date));
    (acc[key] ??= []).push(s);
    return acc;
  }, {} as Record<string, Session[]>);
}

// Summe über alle Laps aller Sessions einer Woche
export function weekDistance(sessions: Session[], sports:Sport): number {
  return sessions.filter(s => s.woType.sports === sports).reduce(
    (sum, s) => sum + s.laps.reduce((a, l) => a + (l.distance ?? 0), 0), 0);
}

export function weekDuration(sessions: Session[], sport: Sport): string {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return '0:0';
  }

  const totalMinutes = sessions
    .filter(s => s?.woType?.sports === sport)
    .reduce((sum, s) => {
      const sessionMinutes = (s.laps ?? []).reduce((a, l) => {
        const value = l?.duration; // ggf. l.distance, falls das eigentlich Dauer sein soll
        return a + (typeof value === 'number' && !Number.isNaN(value) ? value : 0);
      }, 0);
      return sum + sessionMinutes;
    }, 0);

  const safeTotal = Number.isFinite(totalMinutes) ? Math.max(0, totalMinutes) : 0;
  const hours = Math.floor(safeTotal / 3600);
  const minutes = Math.round(safeTotal/60 % 60);
  if (minutes < 10) {
      return `${hours}:0${minutes}`;

  }
  return `${hours}:${minutes}`;
}
