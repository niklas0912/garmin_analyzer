import type { Sport } from './types';

// ANPASSEN: Pfad/Namen an eure echten Typen in types.ts angleichen.
// Erwartet wird: Workout { name: string; date: Date | string; laps: { distance: number }[] }
// und WorkoutType { name: string; color: string; sports: Sport | Sport[] }
import type { DateRange, RangePreset, Session, WeekVolume, WorkoutType } from './types';



export function presetToRange(preset: RangePreset, custom?: DateRange): DateRange {
  const to = new Date();
  if (preset === 'custom' && custom) return custom;

  const from = new Date(to);
  if (preset === '3m') from.setMonth(from.getMonth() - 3);
  if (preset === '6m') from.setMonth(from.getMonth() - 6);
  if (preset === '1y') from.setFullYear(from.getFullYear() - 1);
  return { from, to };
}

// Lokales Datum, bewusst ohne toISOString() (siehe learnings.md: Timezone-Bug bei dateKey)
function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 = Sonntag
  const diffToMonday = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diffToMonday);
  return d;
}

function weekKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// Robust gegenüber beiden möglichen Formen von WorkoutType.sports (einzelner Wert oder Array)
function typeMatchesSport(t: WorkoutType, sport: Sport): boolean {
  const val = (t as unknown as { sports?: Sport | Sport[] }).sports;
  if (Array.isArray(val)) return val.includes(sport);
  return val === sport;
}

export function computeWeeklyVolume(
  workouts: Session[],
  workoutTypes: WorkoutType[],
  sport: Sport,
  range: DateRange
): WeekVolume[] {
  const typeNamesForSport = new Set(
    workoutTypes.filter((t) => typeMatchesSport(t, sport)).map((t) => t.name)
  );

  const buckets = new Map<string, WeekVolume>();

  for (const w of workouts) {
    // ANNAHME: w.name entspricht dem WorkoutType-Namen (wie bei loadWorkoutsByName).
    // Falls Sessions stattdessen z.B. ein eigenes Feld wie w.typeName haben,
    // hier austauschen.
    if (!typeNamesForSport.has(w.name)) continue;

    const date = new Date(w.date);
    if (date < range.from || date > range.to) continue;

    const weekStart = startOfWeek(date);
    const key = weekKey(weekStart);

    const totalMeters = (w.laps ?? []).reduce((sum, lap) => {
      const d = lap.distance;
      return sum + (typeof d === 'number' && d > 0 ? d : 0);
    }, 0);

    const existing = buckets.get(key);
    if (existing) {
      existing.km += totalMeters / 1000;
    } else {
      buckets.set(key, { weekStart, km: totalMeters / 1000 });
    }
  }

  return Array.from(buckets.values()).sort(
    (a, b) => a.weekStart.getTime() - b.weekStart.getTime()
  );
}
