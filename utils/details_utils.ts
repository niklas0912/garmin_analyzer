import { Lap } from '../utils/types';
import { parsePace } from './fitParser';


export function applyThresholdToLaps(laps: Lap[], thresholdInput: string): Lap[] | null {
    const thresholdSecPerMeter = parsePace(thresholdInput);
    if (thresholdSecPerMeter == null) {
      return null;
    }
  
    return laps.map((lap) => ({
      ...lap,
      isFast: lap.pace != null && lap.pace <= thresholdSecPerMeter,
    }));
  }

export function formatThresholdInput(raw: string) {
    // Nur Ziffern behalten
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 3); // max 3 Ziffern, z.B. "430"
  
    if (digits.length <= 1) return digits;
    // Letzte 2 Ziffern sind Sekunden, Rest sind Minuten
    const min = digits.slice(0, -2);
    const sec = digits.slice(-2);
    return `${min}:${sec}`;
  }
export function meanOf(laps: any[], key: string) {
    const vals = laps.map((l: any) => l[key]).filter((v: any) => v != null && v > 0 && v < 220);
    return vals.length ? Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length) : null;
  }


  
 