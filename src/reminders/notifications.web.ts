/**
 * Web version of notifications.ts. expo-notifications only supports Android and iOS,
 * so on web these do nothing. Expo picks this file automatically when running on web.
 */

import type { TraceSource } from '@/reminders/action-trace';
import type { ReminderPress } from '@/reminders/actions';
import type { PermissionResult } from '@/reminders/notifications';
import type { ReminderTiming, ReminderToSchedule, ScheduledReminder } from '@/reminders/plan';

export type { PermissionResult };

export const REMINDERS_CHANNEL_ID = 'reminders';

export function configureNotifications() {}

export async function ensureAndroidChannel() {}

export async function ensureReminderActions() {}

export async function requestNotificationPermission(): Promise<PermissionResult> {
  return 'unavailable';
}

export async function scheduleTestNotification(_seconds: number): Promise<string | null> {
  return null;
}

export async function hasNotificationPermission() {
  return false;
}

export function getReminderTiming(): ReminderTiming {
  return 'exact';
}

export function openExactTimingSettings() {
  return false;
}

export async function getScheduledTaskReminders(): Promise<ScheduledReminder[]> {
  return [];
}

export async function cancelReminder(_id: string) {}

export async function scheduleTaskReminder(_reminder: ReminderToSchedule) {}

export function toReminderPress(_response: unknown): ReminderPress | null {
  return null;
}

export function describeResponse(_response: unknown) {
  return '';
}

export function addReminderPressListener(
  _listener: (press: ReminderPress) => void,
  _traceSource?: TraceSource
) {
  return () => {};
}

export function getLastReminderPress(): ReminderPress | null {
  return null;
}

export function clearLastReminderPress() {}

export async function dismissReminder(_notificationId: string) {}

export async function registerBackgroundPressTask(_taskName: string) {}
