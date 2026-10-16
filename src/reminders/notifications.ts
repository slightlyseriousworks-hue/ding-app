import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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
