/**
 * Web version of notifications.ts. expo-notifications only supports Android and iOS,
 * so on web these do nothing. Expo picks this file automatically when running on web.
 */

import type { PermissionResult } from '@/reminders/notifications';

export type { PermissionResult };

export const REMINDERS_CHANNEL_ID = 'reminders';

export function configureNotifications() {}

export async function ensureAndroidChannel() {}

export async function requestNotificationPermission(): Promise<PermissionResult> {
  return 'unavailable';
}

export async function scheduleTestNotification(_seconds: number): Promise<string | null> {
  return null;
}
