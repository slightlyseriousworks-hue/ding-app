/**
 * What screens call around saving a task, so Ding asks for what it needs at the moment it
 * matters: the first time a task with a future due time is saved.
 *
 *   - Before saving: notification permission. The system prompt only ever appears once.
 *     After that this just checks the answer.
 *   - After saving (Android only, once): if reminders may arrive late, explain precise timing
 *     and offer to open Android Settings. Ding never opens Settings without asking first.
 */
import { Alert, Platform } from 'react-native';

import {
  getReminderTiming,
  hasNotificationPermission,
  openExactTimingSettings,
  requestNotificationPermission,
} from '@/reminders/notifications';
import { isReminderTime } from '@/reminders/plan';
import { markPreciseTimingOffered, wasPreciseTimingOffered } from '@/tasks/storage';

/**
 * Asks for permission if a task due at `dueAt` will need a reminder.
 * Resolves to false only when Ding needs a reminder but notifications are turned off.
 * Never throws: saving the task must not depend on this.
 */
export async function prepareReminder(dueAt: string): Promise<boolean> {
  if (!isReminderTime(dueAt, new Date())) return true;

  try {
    return (await requestNotificationPermission()) !== 'denied';
  } catch (error) {
    console.error('Failed to check notification permission', error);
    return true;
  }
}

export function showRemindersOffMessage() {
  const title = 'Task saved, but no reminder';
  const message =
    "Notifications are turned off for Ding, so it can't remind you about this task. " +
    'You can turn them on in your phone settings.';

  // React Native's Alert does nothing on web (and web never gets here anyway).
  if (Platform.OS === 'web') return;
  Alert.alert(title, message);
}

/**
 * Call after saving a task that will get a reminder. The first time reminders may arrive
 * late on this phone, explains why and lets the user open Android Settings (or not).
 * Shown at most once; afterwards the Settings screen is where precise timing lives.
 * Never throws.
 */
export async function offerPreciseTiming(dueAt: string) {
  if (Platform.OS !== 'android') return;
  if (!isReminderTime(dueAt, new Date())) return;

  try {
    if (getReminderTiming() === 'exact') return;
    if (!(await hasNotificationPermission())) return;
    if (await wasPreciseTimingOffered()) return;
    await markPreciseTimingOffered();
  } catch (error) {
    console.error('Failed to check precise reminder timing', error);
    return;
  }

  Alert.alert(
    'Want reminders to arrive on time?',
    'Android needs Alarms & reminders access for Ding to ring at the exact time. ' +
      'Without it, reminders still come, but they may arrive a few minutes late.',
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Enable precise timing', onPress: () => openExactTimingSettings() },
    ]
  );
}
