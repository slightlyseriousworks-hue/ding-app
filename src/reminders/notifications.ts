import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  REMINDER_ID_PREFIX,
  type ReminderTiming,
  type ReminderToSchedule,
  type ScheduledReminder,
} from '@/reminders/plan';

import { ExactAlarm } from '../../modules/exact-alarm';

/**
 * The ONLY file that talks to expo-notifications (web uses notifications.web.ts instead).
 * Screens call these small functions and never import expo-notifications directly.
 * It is also the only file that uses the temporary exact-alarm module.
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

/**
 * Whether reminders scheduled now will arrive on time. Never shows a prompt.
 *
 * Only Android has a switch for this ("Alarms & reminders"). When it is on, expo-notifications
 * schedules exact alarms by itself; when it is off, it falls back to alarms Android may delay.
 */
export function getReminderTiming(): ReminderTiming {
  if (Platform.OS !== 'android') return 'exact';
  // No native module means an older build without the exact-alarm permission.
  if (!ExactAlarm) return 'best-effort';
  return ExactAlarm.canScheduleExactAlarms() ? 'exact' : 'best-effort';
}

/**
 * Opens Ding's "Alarms & reminders" page in Android Settings, where the user can turn on
 * precise timing. Returns false if there was nothing to open.
 */
export function openExactTimingSettings(): boolean {
  if (Platform.OS !== 'android' || !ExactAlarm) return false;
  return ExactAlarm.openExactAlarmSettings();
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function readTiming(value: unknown): ReminderTiming | null {
  return value === 'exact' || value === 'best-effort' ? value : null;
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
      timing: readTiming(request.content.data?.timing),
    }));
}

export async function cancelReminder(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id);
}

/**
 * Schedules one reminder at the task's due time. The due time, title, and timing are saved
 * inside the notification so sync can tell later whether it is still up to date.
 * Call ensureAndroidChannel() first.
 */
export async function scheduleTaskReminder(reminder: ReminderToSchedule) {
  await Notifications.scheduleNotificationAsync({
    identifier: reminder.id,
    content: {
      title: reminder.title,
      body: 'Ding! This is due now.',
      sound: true,
      data: {
        taskId: reminder.taskId,
        dueAt: reminder.dueAt,
        title: reminder.title,
        timing: reminder.timing,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(reminder.dueAt),
      channelId: REMINDERS_CHANNEL_ID,
    },
  });
}
