import Constants from 'expo-constants';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function SettingsScreen() {
  const theme = useTheme();

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
          Reminders
        </ThemedText>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText themeColor="textSecondary">
            Snooze length and reminder intensity will live here once reminders are built.
          </ThemedText>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
          About
        </ThemedText>
        <View style={[styles.card, styles.row, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText>Version</ThemedText>
          <ThemedText themeColor="textSecondary">{Constants.expoConfig?.version ?? '—'}</ThemedText>
        </View>
      </View>

      <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
        Ding by Slightly Serious
      </ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.four,
    padding: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    textTransform: 'uppercase',
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footer: {
    textAlign: 'center',
  },
});
