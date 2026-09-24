export type Lap = {
    index: number;
    distance: number;
    duration: number;
    avgHr: number | null;
    maxHr: number | null;
    pace: number | null;
    isFast: boolean;
    equipmentId?: string;
  };
  
  export type Session = {
    id: string;
    name: string;
    date: Date;
    laps: Lap[];
    temperature: number | null;
    fitFileHash?: string;
    fitFileUri: string;
    equipmentId?: string;
    woType: WorkoutType

  };

export interface DayNote {
  date: string;      // 'YYYY-MM-DD'
  note: string;
}

export interface WorkoutType {
  name: string;
  color: string;
  sports: string;
}

export type RangePreset = '3m' | '6m' | '1y' | 'custom';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface WeekVolume {
  weekStart: Date; // Montag der jeweiligen Woche
  km: number;
}

export type Sport = 'running' | 'bike' | "other";

export interface Equipment {
  id: string;
  name: string;
  sport: Sport;
  retired: boolean;
  createdAt: string; // ISO date string
}
