
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {


    return(
        <View style={s.container}>
            <View style={s.content}>
              <TouchableOpacity
                      style={[s.settingsCard]}
                      onPress={() => router.push({ pathname: '/backup_screen',  })}
                    >
                      <Text style={s.settingButtonText}>Import/Export backup</Text>
                      {/* <Text style={s.cardHint}>Tippen → Sessions · Lang drücken → Import</Text> */}
                    </TouchableOpacity>
                    </View>
        </View>


    )

}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D0D0D' },
    // flex: 1 bedeutet "nimm den gesamten verfügbaren Platz"
    content: {
        flex: 0.8,
        gap: 20,
        paddingTop: 40,      // Abstand nach oben
        paddingHorizontal: 20, // Abstand zu linkem/rechtem Rand
      },
    list: { padding: 16, paddingTop: 60, gap: 12 },
    // paddingTop: 60 damit der Inhalt nicht unter der Statusleiste liegt
    // gap: 12 = Abstand zwischen den Karten
    
    title: { fontSize: 22, fontWeight: '800', color: '#F0F0F0', marginBottom: 16 },
    button: {
      backgroundColor: '#222222', borderRadius: 12, padding: 16,
      alignItems: 'center',  // Text horizontal zentrieren
      borderWidth: 1, borderColor: '#C8F135', marginBottom: 24,
    },
    settingButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 20 },
    settingsCard: { backgroundColor: '#222222', borderWidth: 0, borderColor: '#FFFFFF',borderRadius: 12, padding: 12 },
  


  });