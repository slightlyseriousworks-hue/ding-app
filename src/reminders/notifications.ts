import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  REMINDER_ID_PREFIX,
  type ReminderToSchedule,
  type ScheduledReminder,
} from '@/reminders/plan';

/**
 * The ONLY file that talks to expo-notifications (web uses notifications.web.ts instead).
 * Screens call these small functions and never import expo-notifications directly.
 */

export type PermissionResult = 'granted' | 'denied' | 'unavailable';

/** Android groups notifications into "channels". Ding sends everything through this one. */
export const REMINDERS_CHANNEL_ID = 'reminders';

/**
 * Lets notifications show while Ding is open. Without this, a notification that fires
 * while the app is in the foreground is silently dropped. Call once at startup.
 */
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      // Must stay true: on Android, false also hides the drop-down (heads-up) banner.
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Creates (or updates) the Reminders channel. Safe to call many times.
 * HIGH importance + sound is what lets Android show a heads-up banner.
 * `sound` is left out on purpose: that gives the system default sound
 * (passing 'default' would be treated as a custom sound file name).
 */
export async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(REMINDERS_CHANNEL_ID, {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
}

/**
 * Asks for notification permission, but only shows the system prompt if the user
 * hasn't decided yet. Call this from a user action (a button tap), not at launch.
 */
export async function requestNotificationPermission(): Promise<PermissionResult> {
  // Android 13+ won't show the prompt until at least one channel exists.
  await ensureAndroidChannel();

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  if (!current.canAskAgain) return 'denied';

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted ? 'granted' : 'denied';
}

/** R1 proof: schedules one notification `seconds` from now. Returns its id. */
export async function scheduleTestNotification(seconds: number) {
  await ensureAndroidChannel();

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Ding!',
      body: 'Your test notification arrived. Reminders work on this phone.',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      channelId: REMINDERS_CHANNEL_ID,
    },
  });
}

/** True if Ding is currently allowed to show notifications. Never shows a prompt. */
export async function hasNotificationPermission() {
  const current = await Notifications.getPermissionsAsync();
  return current.granted;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

/** Lists the task reminders scheduled on this device (ignores other notifications). */
export async function getScheduledTaskReminders(): Promise<ScheduledReminder[]> {
  const requests = await Notifications.getAllScheduledNotificationsAsync();
  return requests
    .filter((request) => request.identifier.startsWith(REMINDER_ID_PREFIX))
    .map((request) => ({
      id: request.identifier,
      dueAt: readString(request.content.data?.dueAt),
      title: readString(request.content.data?.title),
    }));
}

export async function cancelReminder(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id);
}

/**
 * Schedules one reminder at the task's due time. The due time and title are saved inside
 * the notification so sync can tell later whether it is still up to date.
 * Call ensureAndroidChannel() first.
 */
export async function scheduleTaskReminder(reminder: ReminderToSchedule) {
  await Notifications.scheduleNotificationAsync({
    identifier: reminder.id,
    content: {
      title: reminder.title,
      body: 'Ding! This is due now.',
      sound: true,
      data: { taskId: reminder.taskId, dueAt: reminder.dueAt, title: reminder.title },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(reminder.dueAt),
      channelId: REMINDERS_CHANNEL_ID,
    },
  });
}
