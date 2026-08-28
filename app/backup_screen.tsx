// app/settings/backup.tsx
//
// Simple screen with two actions: export everything (sessions, workout
// types, FIT files) to a shareable JSON file, and import a previously
// exported backup. Uses exportBackup/importBackup from utils/backup.ts.

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { exportBackup, importBackup } from '../utils/backup';

type BusyState = 'idle' | 'exporting' | 'importing';

export default function BackupScreen() {
  const [busy, setBusy] = useState<BusyState>('idle');
  const [lastExportedAt, setLastExportedAt] = useState<Date | null>(null);
  const [lastImportedCount, setLastImportedCount] = useState<number | null>(null);

  const handleExport = async () => {
    setBusy('exporting');
    try {
      await exportBackup();
      setLastExportedAt(new Date());
    } catch (err) {
      Alert.alert('Export failed', String(err));
    } finally {
      setBusy('idle');
    }
  };

  const handleImport = async () => {
    setBusy('importing');
    try {
      const count = await importBackup();
      if (count === 0) {
        // user cancelled the picker, nothing to report
        return;
      }
      setLastImportedCount(count);
      Alert.alert('Import complete', `Restored ${count} session${count === 1 ? '' : 's'}.`);
    } catch (err) {
      Alert.alert('Import failed', String(err));
    } finally {
      setBusy('idle');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="settings-outline" size={22} color="#0000FF" />
        <Text style={styles.headerText}>Backup & Restore</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Ionicons name="cloud-upload-outline" size={20} color="#0000FF" />
          <Text style={styles.cardTitle}>Export Backup</Text>
        </View>
        <Text style={styles.cardSubtitle}>
          Saves all sessions, workout types, and FIT files into a single file
          you can store or share anywhere.
        </Text>
        <Pressable
          style={[styles.button, busy === 'exporting' && styles.buttonDisabled]}
          onPress={handleExport}
          disabled={busy !== 'idle'}
        >
          {busy === 'exporting' ? (
            <ActivityIndicator color="#0D0D0D" />
          ) : (
            <Text style={styles.buttonText}>Export</Text>
          )}
        </Pressable>
        {lastExportedAt && (
          <Text style={styles.meta}>
            Last exported: {lastExportedAt.toLocaleString()}
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Ionicons name="cloud-download-outline" size={20} color="#0000FF" />
          <Text style={styles.cardTitle}>Import Backup</Text>
        </View>
        <Text style={styles.cardSubtitle}>
          Restores sessions and FIT files from a previously exported backup
          file. Existing sessions with the same ID will be overwritten.
        </Text>
        <Pressable
          style={[styles.button, busy === 'importing' && styles.buttonDisabled]}
          onPress={handleImport}
          disabled={busy !== 'idle'}
        >
          {busy === 'importing' ? (
            <ActivityIndicator color="#0D0D0D" />
          ) : (
            <Text style={styles.buttonText}>Import</Text>
          )}
        </Pressable>
        {lastImportedCount !== null && (
          <Text style={styles.meta}>
            Last import restored {lastImportedCount} session
            {lastImportedCount === 1 ? '' : 's'}.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    padding: 16,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cardSubtitle: {
    color: '#9A9A9A',
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#0000FF',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#0D0D0D',
    fontSize: 15,
    fontWeight: '600',
  },
  meta: {
    color: '#6E6E6E',
    fontSize: 12,
    marginTop: 2,
  },
});