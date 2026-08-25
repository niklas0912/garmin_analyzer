export type Lap = {
    index: number;
    distance: number;
    duration: number;
    avgHr: number | null;
    maxHr: number | null;
    pace: number | null;
    isFast: boolean;
  };
  
  export type Session = {
    id: string;
    name: string;
    date: Date;
    laps: Lap[];
    temperature: number | null;
  };