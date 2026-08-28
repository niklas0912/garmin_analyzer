import * as FileSystem from 'expo-file-system/legacy';

/**
 * Berechnet einen Faktor zur Umrechnung der tatsächlichen Pace
 * in eine Grade Adjusted Pace (GAP).
 *
 * Grundlage ist das Energieverbrauchsmodell nach Minetti.
 *
 * @param gradePct Steigung in Prozent, z. B. 5 für eine Steigung von 5 %.
 * @returns Faktor zur Anpassung der Pace an die Steigung.
 *
 * Hinweis:
 * Diese Funktion wird aktuell in dieser Datei nicht verwendet.
 */
function gapFactor(gradePct) {
  const g = gradePct / 100;

  // Minetti-Modell für die Laufökonomie in Abhängigkeit
  // von der Steigung.
  const cost =
    155.4 * Math.pow(g, 5)
    - 30.4 * Math.pow(g, 4)
    - 43.3 * Math.pow(g, 3)
    + 46.3 * Math.pow(g, 2)
    + 19.5 * g
    + 3.6;

  // 3.6 entspricht dem Kostenfaktor bei ebener Strecke.
  // Math.max verhindert eine Division durch einen sehr kleinen
  // oder negativen Wert.
  return 3.6 / Math.max(cost, 0.1);
}

/**
 * Formatiert eine Geschwindigkeit in Sekunden pro Meter
 * als Pace im Format "Minuten:Sekunden".
 *
 * Beispiel:
 *   0.3 s/m → 300 s/km → "5:00"
 *
 * @param secPerMeter Zeit in Sekunden pro Meter.
 * @returns Formatierte Pace, z. B. "5:00".
 *          "--", falls kein gültiger positiver Wert vorliegt.
 */
export function formatPace(secPerMeter) {
  if (!secPerMeter || secPerMeter <= 0 || !isFinite(secPerMeter)) {
    return '--';
  }

  // Umrechnung von Sekunden pro Meter
  // in Sekunden pro Kilometer.
  const secPerKm = secPerMeter * 1000;

  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);

  return `${min}:${sec.toString().padStart(2, '0')}`;
}

/**
 * Liest einen einzelnen Wert aus einem DataView.
 *
 * FIT-Dateien speichern numerische Werte in verschiedenen
 * Größen (1, 2 oder 4 Byte) und mit unterschiedlichen Datentypen.
 *
 * @param view DataView des gesamten FIT-Dateiinhalts.
 * @param offset Byteposition, an der das Feld beginnt.
 * @param size Größe des Feldes in Bytes.
 * @param baseType FIT-Basistyp des Feldes.
 * @param le Gibt an, ob die Daten Little Endian gespeichert sind.
 * @returns Ausgelesener numerischer Wert.
 *
 * Bei einer nicht unterstützten Feldgröße oder einem Lesefehler
 * wird 0 zurückgegeben.
 */
function readFieldValue(view, offset, size, baseType, le) {
  try {
    switch (size) {
      case 1:
        return view.getUint8(offset);

      case 2:
        return view.getUint16(offset, le);

      case 4:
        // FIT Base Type 0x85 entspricht einem signed int32.
        if ((baseType & 0x9F) === 0x85) {
          return view.getInt32(offset, le);
        }

        return view.getUint32(offset, le);

      default:
        return 0;
    }
  } catch {
    // Falls die angegebene Position außerhalb des Puffers liegt.
    return 0;
  }
}

/**
 * Parst den binären Inhalt einer FIT-Datei.
 *
 * Die Funktion verarbeitet die FIT-Records und sucht insbesondere
 * nach:
 *
 * - Session-Daten
 * - Lap-Daten
 * - Datum der Session
 *
 * FIT-Dateien verwenden sogenannte Definition Messages, um festzulegen,
 * wie die nachfolgenden Data Messages interpretiert werden müssen.
 *
 * @param buffer Binärer Inhalt der FIT-Datei als ArrayBuffer.
 * @returns Objekt mit allen gefundenen Laps und dem Datum der Session.
 */
function parseFit(buffer) {
  const view = new DataView(buffer);

  // Die ersten Bytes der FIT-Datei enthalten den Header.
  // Danach beginnt der eigentliche Datenbereich.
  const headerSize = view.getUint8(0);
  let offset = headerSize;

  // Speichert die Definitionen der lokalen Message-Nummern.
  //
  // FIT verwendet lokale Message-Nummern, deren Definition vorher
  // festgelegt wird. Dadurch kann eine Data Message später interpretiert
  // werden.
  const localDefs = {};

  const laps = [];

  // Wird aus dem timestamp-Feld der Session Message bestimmt.
  let sessionDate = null;
  let temps = []
  // Solange noch genügend Bytes für einen weiteren Record vorhanden sind.
  while (offset < buffer.byteLength - 2) {
    const recordHeader = view.getUint8(offset);
    offset += 1;

    /*
     * Compressed Timestamp Message
     *
     * Diese speziellen FIT-Records enthalten einen komprimierten
     * Timestamp. Die Implementierung überspringt sie aktuell,
     * da für die Auswertung keine Timestamp-Werte aus diesen
     * Records benötigt werden.
     */
    const isCompressedTimestamp = (recordHeader & 0x80) !== 0;

    if (isCompressedTimestamp) {
      const localNum = (recordHeader >> 5) & 0x03;
      const def = localDefs[localNum];

      if (def) {
        offset += def.size;
      }

      continue;
    }

    // Bit 6 zeigt an, ob es sich um eine Definition Message handelt.
    const isDefinition = (recordHeader & 0x40) !== 0;

    // Die unteren vier Bits enthalten die lokale Message-Nummer.
    const localMsgNum = recordHeader & 0x0F;

    /*
     * Definition Message
     *
     * Eine Definition Message beschreibt den Aufbau der
     * nachfolgenden Data Messages.
     */
    if (isDefinition) {
      // Reserved Byte überspringen.
      offset += 1;

      // Byte 0 = Little Endian, Byte 1 = Big Endian.
      const littleEndian = view.getUint8(offset) === 0;
      offset += 1;

      // Globale Message-Nummer.
      const globalMsgNum = view.getUint16(offset, littleEndian);
      offset += 2;

      // Anzahl der Felder in der Message.
      const numFields = view.getUint8(offset);
      offset += 1;

      const fields = [];
      let size = 0;

      // Beschreibung jedes einzelnen Feldes.
      for (let i = 0; i < numFields; i++) {
        const fieldNum = view.getUint8(offset);
        const fieldSize = view.getUint8(offset + 1);
        const baseType = view.getUint8(offset + 2);

        offset += 3;

        fields.push({
          fieldNum,
          fieldSize,
          baseType
        });

        size += fieldSize;
      }

      /*
       * Developer Fields
       *
       * Einige FIT-Dateien können zusätzliche herstellerspezifische
       * Felder enthalten. Deren Größe muss berücksichtigt werden,
       * damit der Offset anschließend korrekt ist.
       */
      if (recordHeader & 0x20) {
        const numDevFields = view.getUint8(offset);
        offset += 1;

        for (let i = 0; i < numDevFields; i++) {
          const devFieldSize = view.getUint8(offset + 1);

          offset += 3;
          size += devFieldSize;
        }
      }

      // Definition unter der lokalen Message-Nummer speichern.
      localDefs[localMsgNum] = {
        globalMsgNum,
        fields,
        size,
        littleEndian
      };

    } else {
      /*
       * Data Message
       *
       * Hier werden die zuvor definierten Felder tatsächlich
       * aus der FIT-Datei gelesen.
       */
      const def = localDefs[localMsgNum];

      // Keine passende Definition vorhanden.
      if (!def) {
        offset += 1;
        continue;
      }

      // Startposition der eigentlichen Daten.
      const msgStart = offset;

      /*
       * Session Message
       *
       * Global Message Number 18 = Session.
       *
       * Feld 253 enthält den FIT Timestamp.
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
       // console.log(`field ${f.fieldNum} @offset ${fieldOffset}, size ${f.fieldSize}, val=${val}`);
        switch (f.fieldNum) {
        case 13: // temperature
        if (val !== 0x7F) {
          temps.push(val); // bereits in °C, keine Skalierung nötig
        }
        break;
      }  fieldOffset += f.fieldSize;   // ← Offset wird weitergezählt
    }}
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

          // FIT Timestamp.
          if (f.fieldNum === 253 && val > 0) {
            /*
             * FIT verwendet Sekunden seit
             * 1989-12-31 00:00:00 UTC.
             *
             * 631065600 Sekunden entsprechen dem Offset
             * zwischen der FIT-Epoche und der Unix-Epoche.
             */
            sessionDate = new Date(
              (val + 631065600) * 1000
            );
          
          }

          fieldOffset += f.fieldSize;
        }
      }

      /*
       * Lap Message
       *
       * Global Message Number 19 = Lap.
       *
       * Hier werden die für die App relevanten
       * Rundeninformationen ausgelesen.
       */
      if (def.globalMsgNum === 19) {
        const lap = {};
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
          lap.isFast = false;
          fieldOffset += f.fieldSize;
        }
      
        if (lap.lap_trigger === 1) {
          laps.push(lap);
        }
      }

        /*
         * Nur Laps mit dem gewünschten Lap-Trigger werden
         * in das Ergebnis aufgenommen.
         */


      // Zum nächsten Data Record springen.
      offset = msgStart + def.size;
    }
   
  }


let total = 0;
for(var i = 0; i < temps.length; i++) {
    total += temps[i];
}
let average_temp = total / temps.length;

  return {
    laps,
    sessionDate,
    average_temp
  };
}

/**
 * Liest und parst eine FIT-Datei.
 *
 * Ablauf:
 *
 * 1. FIT-Datei aus dem Dateisystem lesen
 * 2. Base64-Daten in Binärdaten umwandeln
 * 3. FIT-Datei parsen
 * 4. Rohdaten der Laps in das Datenformat der App umwandeln
 * 5. Workout-Objekt zurückgeben
 *
 * @param uri URI der FIT-Datei.
 * @param workoutName Name des Workouts.
 * @returns Aufbereitetes Workout mit Datum und Laps.
 */
export async function parseFitFile(uri, workoutName) {

  /*
   * FIT-Datei aus dem temporären Dateipfad lesen.
   *
   * FIT-Dateien sind binär. Da readAsStringAsync hier verwendet wird,
   * werden die Daten zunächst als Base64-String eingelesen.
   */
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: 'base64',
  });

  /*
   * Base64 → Binärstring.
   */
  const binaryString = atob(base64);

  /*
   * Binärstring → ArrayBuffer.
   *
   * ArrayBuffer ist der eigentliche binäre Speicherbereich,
   * den anschließend DataView zum Auslesen der FIT-Daten verwendet.
   */
  const buffer = new ArrayBuffer(binaryString.length);
  const bytes = new Uint8Array(buffer);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i) & 0xff;
  }

  /*
   * FIT-Datei analysieren.
   */
  const {
    laps: rawLaps,
    sessionDate,
    average_temp
  } = parseFit(buffer);

  /*
   * Rohdaten der FIT-Laps in das Datenformat der App umwandeln.
   */
  const laps = rawLaps.map((lap, i) => {

    // Falls keine Geschwindigkeit vorhanden ist, 0 verwenden.
    const avgSpeed = lap.avg_speed || 0;

    /*
     * Geschwindigkeit [m/s] → Sekunden pro Meter.
     *
     * Beispiel:
     * 3.33 m/s → 1 / 3.33 ≈ 0.30 s/m
     */
    const rawPaceSpm =
      avgSpeed > 0
        ? 1 / avgSpeed
        : null;

    return {
      // Nummer der Runde, beginnend bei 1.
      index: i + 1,

      // Durchschnittliche Herzfrequenz.
      // Unrealistische Werte werden als null behandelt.
      avgHr:
        lap.avg_heart_rate > 0 &&
        lap.avg_heart_rate < 220
          ? Math.round(lap.avg_heart_rate)
          : null,

      // Maximale Herzfrequenz.
      maxHr:
        lap.max_heart_rate > 0 &&
        lap.max_heart_rate < 220
          ? Math.round(lap.max_heart_rate)
          : null,

      /*
       * Aktuell wird hier die aus der Geschwindigkeit berechnete
       * Pace gespeichert.
       *
       * Der Name "gap" ist dabei etwas irreführend:
       * rawPaceSpm ist aktuell noch keine tatsächlich
       * höhenangepasste Grade Adjusted Pace.
       */
      pace: (lap.total_elapsed_time/lap.total_distance),

      // Distanz in Metern.
      distance: lap.total_distance || 0,

      // Dauer in Sekunden.
      duration: lap.total_elapsed_time || 0,
      isFast: false
    };
  });

  /*
   * Finales Workout-Objekt für die App erstellen.
   */
  return {
    name: workoutName,

    // Datum aus der FIT-Datei.
    // Falls kein Datum gefunden wurde, aktuelles Datum verwenden.
    date: sessionDate || new Date(),

    laps,
    temperature: average_temp,
    // Eindeutige ID aus Workout-Name und aktuellem Timestamp.
    id: `${workoutName}_${Date.now()}`,
  };
}

/**
 * Wandelt eine Pace im Format "Minuten:Sekunden" (z.B. "4:30")
 * zurück in Sekunden pro Meter um — das Gegenstück zu formatPace().
 *
 * @param {string} paceStr - Pace-Eingabe im Format "m:ss"
 * @returns {number | null} Sekunden pro Meter, oder null bei ungültiger Eingabe
 */
export function parsePace(paceStr) {
  const match = paceStr.trim().match(/^(\d+):(\d{1,2})$/);
  if (!match) return null;

  const min = parseInt(match[1], 10);
  const sec = parseInt(match[2], 10);
  if (sec >= 60) return null;

  const secPerKm = min * 60 + sec;
  return secPerKm / 1000;
}