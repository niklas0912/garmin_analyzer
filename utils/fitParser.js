import * as FileSystem from 'expo-file-system/legacy';

// GAP (Grade Adjusted Pace) nach Minetti-Modell
function gapFactor(gradePct) {
  const g = gradePct / 100;
  const cost = 155.4 * Math.pow(g, 5) - 30.4 * Math.pow(g, 4)
    - 43.3 * Math.pow(g, 3) + 46.3 * Math.pow(g, 2) + 19.5 * g + 3.6;
  return 3.6 / Math.max(cost, 0.1);
}

export function formatPace(secPerMeter) {
  if (!secPerMeter || secPerMeter <= 0 || !isFinite(secPerMeter)) return '--';
  const secPerKm = secPerMeter * 1000;
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function readFieldValue(view, offset, size, baseType, le) {
  try {
    switch (size) {
      case 1: return view.getUint8(offset);
      case 2: return view.getUint16(offset, le);
      case 4:
        if ((baseType & 0x9F) === 0x85) return view.getInt32(offset, le);
        return view.getUint32(offset, le);
      default: return 0;
    }
  } catch { return 0; }
}

function parseFit(buffer) {
  const view = new DataView(buffer);
  const headerSize = view.getUint8(0);
  let offset = headerSize;
  const localDefs = {};
  const laps = [];
  let sessionDate = null;

  while (offset < buffer.byteLength - 2) {
    const recordHeader = view.getUint8(offset);
    offset += 1;

    const isCompressedTimestamp = (recordHeader & 0x80) !== 0;
    if (isCompressedTimestamp) {
      const localNum = (recordHeader >> 5) & 0x03;
      const def = localDefs[localNum];
      if (def) offset += def.size;
      continue;
    }

    const isDefinition = (recordHeader & 0x40) !== 0;
    const localMsgNum = recordHeader & 0x0F;

    if (isDefinition) {
      offset += 1;
      const littleEndian = view.getUint8(offset) === 0; offset += 1;
      const globalMsgNum = view.getUint16(offset, littleEndian); offset += 2;
      const numFields = view.getUint8(offset); offset += 1;

      const fields = [];
      let size = 0;
      for (let i = 0; i < numFields; i++) {
        const fieldNum = view.getUint8(offset);
        const fieldSize = view.getUint8(offset + 1);
        const baseType = view.getUint8(offset + 2);
        offset += 3;
        fields.push({ fieldNum, fieldSize, baseType });
        size += fieldSize;
      }

      if (recordHeader & 0x20) {
        const numDevFields = view.getUint8(offset); offset += 1;
        for (let i = 0; i < numDevFields; i++) {
          const devFieldSize = view.getUint8(offset + 1);
          offset += 3;
          size += devFieldSize;
        }
      }

      localDefs[localMsgNum] = { globalMsgNum, fields, size, littleEndian };

    } else {
      const def = localDefs[localMsgNum];
      if (!def) { offset += 1; continue; }

      const msgStart = offset;

      // Session Message → Datum auslesen
      if (def.globalMsgNum === 18) {
        let fieldOffset = msgStart;
        for (const f of def.fields) {
          const val = readFieldValue(view, fieldOffset, f.fieldSize, f.baseType, def.littleEndian);
          if (f.fieldNum === 253 && val > 0) {
            // FIT Timestamp: Sekunden seit 31.12.1989 00:00:00 UTC
            sessionDate = new Date((val + 631065600) * 1000);
          }
          fieldOffset += f.fieldSize;
        }
      }

      // Lap Message
      if (def.globalMsgNum === 19) {
        const lap = {};
        let fieldOffset = msgStart;
        for (const f of def.fields) {
          const val = readFieldValue(view, fieldOffset, f.fieldSize, f.baseType, def.littleEndian);
          switch (f.fieldNum) {
            case 7:   lap.total_elapsed_time = val / 1000; break;
            case 9:   lap.total_distance = val / 100; break;
            case 111: lap.avg_speed = val / 1500; break;
            case 18:  lap.avg_heart_rate = val; break;
            case 17:  lap.max_heart_rate = val; break;
            case 25:  lap.lap_trigger = val; break;
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

  return { laps, sessionDate };
}


export async function parseFitFile(uri, workoutName) {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: 'base64',
  });

  const binaryString = atob(base64);
  const buffer = new ArrayBuffer(binaryString.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i) & 0xff;
  }

  const { laps: rawLaps, sessionDate } = parseFit(buffer);

  const laps = rawLaps.map((lap, i) => {
    const avgSpeed = lap.avg_speed || 0;
    const rawPaceSpm = avgSpeed > 0 ? 1 / avgSpeed : null;

    return {
      index: i + 1,
      avgHr: lap.avg_heart_rate > 0 && lap.avg_heart_rate < 220 ? Math.round(lap.avg_heart_rate) : null,
      maxHr: lap.max_heart_rate > 0 && lap.max_heart_rate < 220 ? Math.round(lap.max_heart_rate) : null,
      gap: rawPaceSpm,
      distance: lap.total_distance || 0,
      duration: lap.total_elapsed_time || 0,
    };
  });

  return {
    name: workoutName,
    date: sessionDate || new Date(),
    laps,
    id: `${workoutName}_${Date.now()}`,
  };
}