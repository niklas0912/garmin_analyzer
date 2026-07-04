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
  console.log('Buffer size:', buffer.byteLength);
  const view = new DataView(buffer);
  const headerSize = view.getUint8(0);
  console.log('Header size:', headerSize);
  let offset = headerSize;
  const localDefs = {};
  const laps = [];

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
      console.log(`Def: local=${localMsgNum} global=${globalMsgNum} fields=${fields.length} size=${size}`);

    } else {
      const def = localDefs[localMsgNum];
      if (!def) { offset += 1; continue; }

      const msgStart = offset;

      if (def.globalMsgNum === 19) {
        console.log(`Lap Message bei offset=${msgStart}, def.size=${def.size}`);
        let rawBytes = '';
        for (let i = 0; i < 8; i++) {
          rawBytes += view.getUint8(msgStart + i) + ' ';
        }
        console.log('Raw bytes:', rawBytes);
        // Direkt nach console.log('Raw bytes:...')
        const testVal = view.getUint32(msgStart, true); // little endian
        const testVal2 = view.getUint32(msgStart, false); // big endian
        console.log('Direct read LE:', testVal, 'BE:', testVal2);
        const lap = {};
        let fieldOffset = msgStart;
        let isFirstLap = laps.length === 0; // nur erste Lap loggen

        for (const f of def.fields) {
          const val = readFieldValue(view, fieldOffset, f.fieldSize, f.baseType, def.littleEndian);
        //  if ([7, 9, 25, 111].includes(f.fieldNum)) {
         //   console.log(`Feld ${f.fieldNum}: val=${val}, size=${f.fieldSize}`);
         // }
         if (isFirstLap) {
          console.log(`  Feld ${f.fieldNum} @ ${fieldOffset} size=${f.fieldSize} val=${val}`);
        }
          switch (f.fieldNum) {
            case 7:   lap.total_elapsed_time = val / 1000; break;
            case 9:   lap.total_distance = val / 100; break;
            case 111: lap.avg_speed = val / 1000; break;
            case 18:  lap.avg_heart_rate = val; break;
            case 17:  lap.max_heart_rate = val; break;
            case 14:  lap.avg_grade = val / 100; break;
            case 25:  lap.lap_trigger = val; break;
          }
          fieldOffset += f.fieldSize;
        }
        console.log('lap_trigger:', lap.lap_trigger, 'dist:', lap.total_distance);
        if (lap.lap_trigger === 1) {
          laps.push(lap);
        }
      }

      offset = msgStart + def.size;
      
    }
  }

  return laps;
}



export async function parseFitFile(uri, workoutName) {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: 'base64',

});

  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  const binaryString = atob(base64);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);

  // Prüfe erste Bytes
  const check = new DataView(buffer);
  console.log('Erste Bytes:', check.getUint8(0), check.getUint8(1), check.getUint8(2), check.getUint8(3));
  const rawLaps = parseFit(buffer);

  const laps = rawLaps.map((lap, i) => {
    const avgSpeed = lap.avg_speed || 0;
    const rawPaceSpm = avgSpeed > 0 ? 1 / avgSpeed : null;
  
    return {
      index: i + 1,
      avgHr: lap.avg_heart_rate > 0 && lap.avg_heart_rate < 220 ? Math.round(lap.avg_heart_rate) : null,
      maxHr: lap.max_heart_rate > 0 && lap.max_heart_rate < 220 ? Math.round(lap.max_heart_rate) : null,
      gap: rawPaceSpm,  // vorerst ohne GAP-Korrektur, einfach rohe Pace
      distance: lap.total_distance || 0,
      duration: lap.total_elapsed_time || 0,
    };
  });

  return {
    name: workoutName,
    date: new Date(),
    laps,
    id: `${workoutName}_${Date.now()}`,
  };
}