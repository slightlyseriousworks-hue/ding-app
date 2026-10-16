import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { AppState, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  getReminderTiming,
  openExactTimingSettings,
  requestNotificationPermission,
  scheduleTestNotification,
} from '@/reminders/notifications';

const TEST_DELAY_SECONDS = 10;

/**
 * Android only: shows whether reminders arrive on time, and offers to open Android Settings
 * if they may be late. Re-checks whenever Ding comes back from the background (for example
 * after the user flips the switch in Android Settings).
 */
function PreciseTimingCard() {
  const theme = useTheme();
  const [timing, setTiming] = useState(getReminderTiming);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setTiming(getReminderTiming());
    });
    return () => subscription.remove();
  }, []);

  const isOn = timing === 'exact';
  return (
    <View style={[styles.card, styles.stackedCard, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.row}>
        <ThemedText>Precise timing</ThemedText>
        <ThemedText themeColor="textSecondary">{isOn ? 'On' : 'Off'}</ThemedText>
      </View>
      {!isOn && (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            Reminders may arrive a few minutes late. Android needs Alarms & reminders access
            for Ding to ring at the exact time.
          </ThemedText>
          <Button
            label="Enable precise timing"
            variant="secondary"
            onPress={() => openExactTimingSettings()}
          />
        </>
      )}
    </View>
  );
}

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
        {Platform.OS === 'android' && <PreciseTimingCard />}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText themeColor="textSecondary">
            Snooze length and reminder intensity will live here once reminders are built.
          </ThemedText>
        </View>
        <View style={[styles.card, styles.stackedCard, { backgroundColor: theme.backgroundElement }]}>
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
  stackedCard: {
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
