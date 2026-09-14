import { Lap, Session } from '@/utils/types';
import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';




/**
 * Interne Repräsentation eines FIT-Laps.
 */
type RawLap = {
  total_elapsed_time?: number;
  total_distance?: number;
  avg_speed?: number;
  temperature?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  lap_trigger?: number;
  isFast: boolean;
};


/**
 * Ein Feld innerhalb einer FIT Definition Message.
 */
type FitField = {
  fieldNum: number;
  fieldSize: number;
  baseType: number;
};


/**
 * Definition einer lokalen FIT Message.
 */
type FitDefinition = {
  globalMsgNum: number;
  fields: FitField[];
  size: number;
  littleEndian: boolean;
};


/**
 * Ergebnis des FIT-Parsers.
 */
type ParsedFit = {
  laps: RawLap[];
  sessionDate: Date | null;
  average_temp: number | null;
};


/**
 * Berechnet einen Faktor zur Umrechnung der tatsächlichen Pace
 * in eine Grade Adjusted Pace (GAP).
 *
 * Grundlage ist das Energieverbrauchsmodell nach Minetti.
 */
function gapFactor(gradePct: number): number {
  const g = gradePct / 100;

  const cost =
    155.4 * Math.pow(g, 5)
    - 30.4 * Math.pow(g, 4)
    - 43.3 * Math.pow(g, 3)
    + 46.3 * Math.pow(g, 2)
    + 19.5 * g
    + 3.6;

  return 3.6 / Math.max(cost, 0.1);
}


/**
 * Formatiert eine Geschwindigkeit in Sekunden pro Meter
 * als Pace im Format "Minuten:Sekunden".
 */
export function formatPace(secPerMeter: number | null): string {
  if (
    secPerMeter === null ||
    secPerMeter <= 0 ||
    !isFinite(secPerMeter)
  ) {
    return '--';
  }

  const secPerKm = secPerMeter * 1000;

  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);

  return `${min}:${sec.toString().padStart(2, '0')}`;
}


/**
 * Liest einen einzelnen Wert aus einem DataView.
 */
function readFieldValue(
  view: DataView,
  offset: number,
  size: number,
  baseType: number,
  le: boolean
): number {
  try {
    switch (size) {
      case 1:
        return view.getUint8(offset);

      case 2:
        return view.getUint16(offset, le);

      case 4:
        // FIT Base Type 0x85 = signed int32
        if ((baseType & 0x9F) === 0x85) {
          return view.getInt32(offset, le);
        }

        return view.getUint32(offset, le);

      default:
        return 0;
    }
  } catch {
    return 0;
  }
}


/**
 * Parst den binären Inhalt einer FIT-Datei.
 */
function parseFit(buffer: ArrayBuffer): ParsedFit {
  const view = new DataView(buffer);

  const headerSize = view.getUint8(0);
  let offset = headerSize;

  const localDefs: Record<number, FitDefinition> = {};

  const laps: RawLap[] = [];

  let sessionDate: Date | null = null;

  const temps: number[] = [];

  while (offset < buffer.byteLength - 2) {
    const recordHeader = view.getUint8(offset);
    offset += 1;

    const isCompressedTimestamp =
      (recordHeader & 0x80) !== 0;

    if (isCompressedTimestamp) {
      const localNum = (recordHeader >> 5) & 0x03;
      const def = localDefs[localNum];

      if (def) {
        offset += def.size;
      }

      continue;
    }

    const isDefinition =
      (recordHeader & 0x40) !== 0;

    const localMsgNum =
      recordHeader & 0x0F;

    /*
     * Definition Message
     */
    if (isDefinition) {
      // Reserved Byte
      offset += 1;

      // Little Endian?
      const littleEndian =
        view.getUint8(offset) === 0;

      offset += 1;

      // Globale Message-Nummer
      const globalMsgNum =
        view.getUint16(offset, littleEndian);

      offset += 2;

      // Anzahl der Felder
      const numFields =
        view.getUint8(offset);

      offset += 1;

      const fields: FitField[] = [];
      let size = 0;

      for (let i = 0; i < numFields; i++) {
        const fieldNum =
          view.getUint8(offset);

        const fieldSize =
          view.getUint8(offset + 1);

        const baseType =
          view.getUint8(offset + 2);

        offset += 3;

        fields.push({
          fieldNum,
          fieldSize,
          baseType,
        });

        size += fieldSize;
      }

      /*
       * Developer Fields
       */
      if ((recordHeader & 0x20) !== 0) {
        const numDevFields =
          view.getUint8(offset);

        offset += 1;

        for (let i = 0; i < numDevFields; i++) {
          const devFieldSize =
            view.getUint8(offset + 1);

          offset += 3;
          size += devFieldSize;
        }
      }

      localDefs[localMsgNum] = {
        globalMsgNum,
        fields,
        size,
        littleEndian,
      };

    } else {
      /*
       * Data Message
       */
      const def = localDefs[localMsgNum];

      if (!def) {
        offset += 1;
        continue;
      }

      const msgStart = offset;

      /*
       * Session Message
       */
      if (def.globalMsgNum === 20) {
        let fieldOffset = msgStart;

        for (const f of def.fields) {
          const val = readFieldValue(
            view,
            fieldOffset,
            f.fieldSize,
            f.baseType,
            def.littleEndian
          );

          switch (f.fieldNum) {
            case 13:
              if (val !== 0x7F) {
                temps.push(val);
              }
              break;
          }

          fieldOffset += f.fieldSize;
        }
      }

      /*
       * Activity Message / Timestamp
       */
      if (def.globalMsgNum === 18) {
        let fieldOffset = msgStart;

        for (const f of def.fields) {
          const val = readFieldValue(
            view,
            fieldOffset,
            f.fieldSize,
            f.baseType,
            def.littleEndian
          );

          if (
            f.fieldNum === 253 &&
            val > 0
          ) {
            sessionDate = new Date(
              (val + 631065600) * 1000
            );
          }

          fieldOffset += f.fieldSize;
        }
      }

      /*
       * Lap Message
       */
      if (def.globalMsgNum === 19) {
        const lap: RawLap = {
          isFast: false,
        };

        let fieldOffset = msgStart;

        for (const f of def.fields) {
          const val = readFieldValue(
            view,
            fieldOffset,
            f.fieldSize,
            f.baseType,
            def.littleEndian
          );

          switch (f.fieldNum) {
            case 7:
              lap.total_elapsed_time = val / 1000;
              break;

            case 9:
              lap.total_distance = val / 100;
              break;

            case 111:
              lap.avg_speed = val / 1500;
              break;

            case 13:
              lap.temperature = val;
              break;

            case 15:
              lap.avg_heart_rate = val;
              break;

            case 16:
              lap.max_heart_rate = val;
              break;

            case 25:
              lap.lap_trigger = val;
              break;
          }

          fieldOffset += f.fieldSize;
        }

        if (lap.lap_trigger === 1) {
          laps.push(lap);
        }
      }

      offset = msgStart + def.size;
    }
  }

  let average_temp: number | null = null;

  if (temps.length > 0) {
    const total = temps.reduce(
      (sum: number, temp: number) => sum + temp,
      0
    );

    average_temp = total / temps.length;
  }

  return {
    laps,
    sessionDate,
    average_temp,
  };
}


/**
 * Liest und parst eine FIT-Datei.
 */
export async function parseFitFile(
  uri: string,
  workoutName: string
): Promise<Session> {
    const testFile = new File(uri);
    console.log("file exists",testFile.exists)
    console.log("file size",testFile.size)

console.log("uri",uri)
console.log("name",workoutName)
console.log()
  const base64 =
    await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });

  const binaryString = atob(base64);

  const buffer =
    new ArrayBuffer(binaryString.length);

  const bytes =
    new Uint8Array(buffer);

  for (
    let i = 0;
    i < binaryString.length;
    i++
  ) {
    bytes[i] =
      binaryString.charCodeAt(i) & 0xff;
  }

  const {
    laps: rawLaps,
    sessionDate,
    average_temp,
  } = parseFit(buffer);

  const laps: Lap[] = rawLaps.map(
    (lap: RawLap, i: number): Lap => {

      const avgSpeed =
        lap.avg_speed || 0;

      const rawPaceSpm =
        avgSpeed > 0
          ? 1 / avgSpeed
          : null;

      return {
        index: i + 1,

        avgHr:
          lap.avg_heart_rate !== undefined &&
          lap.avg_heart_rate > 0 &&
          lap.avg_heart_rate < 220
            ? Math.round(lap.avg_heart_rate)
            : null,

        maxHr:
          lap.max_heart_rate !== undefined &&
          lap.max_heart_rate > 0 &&
          lap.max_heart_rate < 220
            ? Math.round(lap.max_heart_rate)
            : null,

        pace:
          lap.total_elapsed_time !== undefined &&
          lap.total_distance !== undefined &&
          lap.total_distance > 0
            ? lap.total_elapsed_time /
              lap.total_distance
            : null,

        distance:
          lap.total_distance || 0,

        duration:
          lap.total_elapsed_time || 0,

        isFast: false,
      };
    }
  );

  return {
    name: workoutName,

    date:
      sessionDate ||
      new Date(),

    laps,

    temperature:
      average_temp,

    id:
      `${workoutName}_${Date.now()}`,

    fitFileUri: uri,
  };
}


/**
 * Wandelt eine Pace im Format "Minuten:Sekunden"
 * zurück in Sekunden pro Meter.
 */
export function parsePace(
  paceStr: string
): number | null {

  const match =
    paceStr
      .trim()
      .match(/^(\d+):(\d{1,2})$/);

  if (!match) {
    return null;
  }

  const min =
    parseInt(match[1], 10);

  const sec =
    parseInt(match[2], 10);

  if (sec >= 60) {
    return null;
  }

  const secPerKm =
    min * 60 + sec;

  return secPerKm / 1000;
}