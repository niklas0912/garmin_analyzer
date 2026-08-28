// utils/backup.ts
//
// Full backup/restore: exports all workout sessions, workout types, and the
// original FIT files into a single JSON file that can be shared and later
// re-imported on the same or a different device.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { loadAllWorkouts, saveWorkout } from './storage';
import type { Session } from './types';

const BACKUP_VERSION = 1;
const WORKOUT_TYPES_KEY = 'workout_types_v1';
const FIT_FILES_DIR = new Directory(Paths.document, 'fit-files');

interface BackupFile {
  version: number;
  exportedAt: string;
  workoutTypes: unknown; // shape of whatever is stored under workout_types_v1
  sessions: Session[];
  // sessionId -> base64-encoded contents of the .fit file
  fitFiles: Record<string, string>;
}

/**
 * Builds a single backup JSON file (sessions + workout types + embedded FIT
 * files as base64) and opens the native share sheet so the user can save it
 * wherever they like (Files app, cloud drive, email, etc.).
 */
export async function exportBackup(): Promise<void> {
  const sessions = await loadAllWorkouts();
  const workoutTypesRaw = await AsyncStorage.getItem(WORKOUT_TYPES_KEY);
  const workoutTypes = workoutTypesRaw ? JSON.parse(workoutTypesRaw) : [];

  const fitFiles: Record<string, string> = {};

  for (const session of sessions) {
    if (!session.fitFileUri) continue;
    try {
      const file = new File(session.fitFileUri);
      if (!file.exists) continue;
      fitFiles[session.id] = await file.base64();
    } catch (err) {
      console.warn(`Could not read FIT file for session ${session.id}`, err);
    }
  }

  const backup: BackupFile = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    workoutTypes,
    sessions,
    fitFiles,
  };

  const filename = `garmin-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const backupFile = new File(Paths.cache, filename);

  if (backupFile.exists) {
    backupFile.delete();
  }
  backupFile.create();
  backupFile.write(JSON.stringify(backup));

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(backupFile.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Save backup',
  });
}

/**
 * Opens the document picker for a backup JSON file, restores workout types
 * and sessions, and re-writes every embedded FIT file to
 * Paths.document/fit-files/{sessionId}.fit so `fitFileUri` stays valid on
 * this device.
 *
 * Returns the number of sessions that were restored, or 0 if the user
 * cancelled the picker.
 */
export async function importBackup(): Promise<number> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (picked.canceled || !picked.assets?.[0]) {
    return 0;
  }

  const pickedFile = new File(picked.assets[0].uri);
  const raw = await pickedFile.text();
  const backup = JSON.parse(raw) as BackupFile;

  if (backup.version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${backup.version}`);
  }

  if (!FIT_FILES_DIR.exists) {
    FIT_FILES_DIR.create({ intermediates: true });
  }

  // Restore workout types first so sessions can reference them.
  if (backup.workoutTypes) {
    await AsyncStorage.setItem(WORKOUT_TYPES_KEY, JSON.stringify(backup.workoutTypes));
  }

  let restoredCount = 0;

  for (const session of backup.sessions) {
    const base64 = backup.fitFiles[session.id];
    let fitFileUri = session.fitFileUri;

    if (base64) {
      try {
        const fitFile = new File(FIT_FILES_DIR, `${session.id}.fit`);
        if (fitFile.exists) {
          fitFile.delete();
        }
        fitFile.create();
        fitFile.write(base64, { encoding: 'base64' });
        fitFileUri = fitFile.uri;
      } catch (err) {
        console.warn(`Could not restore FIT file for session ${session.id}`, err);
      }
    }

    await saveWorkout({ ...session, fitFileUri });
    restoredCount += 1;
  }

  return restoredCount;
}