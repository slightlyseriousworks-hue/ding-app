/**
 * TEMPORARY local module. See README.md in this folder for why it exists and when to delete it.
 *
 * Only src/reminders/notifications.ts should import this.
 */
import { requireOptionalNativeModule } from 'expo';

type ExactAlarmModule = {
  /** True if Android lets Ding schedule exact alarms right now. */
  canScheduleExactAlarms(): boolean;
  /** Opens Ding's "Alarms & reminders" page. False if nothing could be opened. */
  openExactAlarmSettings(): boolean;
};

/**
 * null when the native code is not in this build: on web, on iOS, in Expo Go, and in
 * Android builds made before this module existed.
 */
export const ExactAlarm = requireOptionalNativeModule<ExactAlarmModule>('ExactAlarm');
