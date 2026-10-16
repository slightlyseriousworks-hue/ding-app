import Constants from 'expo-constants';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  requestNotificationPermission,
  scheduleTestNotification,
} from '@/reminders/notifications';

const TEST_DELAY_SECONDS = 10;

export default function SettingsScreen() {
  const theme = useTheme();
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);

  async function sendTestNotification() {
    setIsScheduling(true);
    try {
      const permission = await requestNotificationPermission();
      if (permission === 'unavailable') {
        setTestStatus('Notifications are not available on web.');
      } else if (permission === 'denied') {
        setTestStatus('Notifications are off. Turn them on for Ding in system settings.');
      } else {
        await scheduleTestNotification(TEST_DELAY_SECONDS);
        setTestStatus(`Scheduled. It should arrive in about ${TEST_DELAY_SECONDS} seconds.`);
      }
    } catch (error) {
      console.error('Failed to schedule test notification', error);
      setTestStatus('Something went wrong scheduling the notification.');
    } finally {
      setIsScheduling(false);
    }
  }

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
        <View style={[styles.card, styles.testCard, { backgroundColor: theme.backgroundElement }]}>
          <Button
            label={`Send test notification (${TEST_DELAY_SECONDS}s)`}
            variant="secondary"
            disabled={isScheduling}
            onPress={sendTestNotification}
          />
          {testStatus && (
            <ThemedText type="small" themeColor="textSecondary">
              {testStatus}
            </ThemedText>
          )}
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
  testCard: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footer: {
    textAlign: 'center',
  },
});
