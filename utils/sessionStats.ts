
import type { Session } from './types';



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
export function weekDistance(sessions: Session[]): number {
  return sessions.reduce((sum, s) => sum + s.laps.reduce((a, l) => a + (l.distance ?? 0), 0), 0);
}