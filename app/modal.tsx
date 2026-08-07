import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';



/**
 * ModalScreen
 *
 * Einfacher Platzhalter-Screen, der als natives Modal angezeigt wird
 * (siehe Registrierung in RootLayout: `presentation: 'modal'`).
 * Aktuell nur ein Beispiel-Boilerplate (Standard-Expo-Template) mit
 * einem Titel und einem Link zurück zur Startseite.
 *
 * ThemedText/ThemedView sorgen dafür, dass Text- und Hintergrundfarben
 * automatisch zum aktuellen Light/Dark-Theme passen.
 */
export default function ModalScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">This is a modal</ThemedText>

      {/* dismissTo sorgt dafür, dass beim Navigieren zur Startseite
          das Modal korrekt geschlossen (dismissed) wird, statt einen
          weiteren Screen auf den Stack zu legen */}
      <Link href="/" dismissTo style={styles.link}>
        <ThemedText type="link">Go to home screen</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});