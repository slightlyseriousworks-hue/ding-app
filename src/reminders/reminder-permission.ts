/**
 * What screens call before saving a task, so Ding can ask for notification permission at
 * the moment it matters: the first time a task with a future due time is saved.
 *
 * The system prompt only ever appears once. After that this just checks the answer.
 */
import { Alert, Platform } from 'react-native';

import { requestNotificationPermission } from '@/reminders/notifications';
import { isReminderTime } from '@/reminders/plan';

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
