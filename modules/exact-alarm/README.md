# exact-alarm (temporary local module)

**Delete this module once expo-notifications can do these two things itself.**

## Why it exists

On Android 12 and newer, a reminder only arrives on time if Ding may use **exact alarms**
(the "Alarms & reminders" switch in Android Settings, permission `SCHEDULE_EXACT_ALARM`).

expo-notifications already uses an exact alarm when that switch is on, and falls back to a
best-effort alarm (which Android may delay) when it is off. But expo-notifications 57
(Expo SDK 57) has no JavaScript way to:

1. check whether the switch is on (`AlarmManager.canScheduleExactAlarms()`), or
2. open the switch's settings page (`Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM`).

This module adds exactly those two functions. It does not schedule anything.

## What uses it

Only `src/reminders/notifications.ts` (`getReminderTiming` and `openExactTimingSettings`).
The permission itself is declared in `app.json` under `android.permissions`.

## How to remove it

When an Expo SDK upgrade adds these checks to expo-notifications (or another Expo module):

1. Point `getReminderTiming` and `openExactTimingSettings` in `notifications.ts` at the
   official API.
2. Delete this `modules/exact-alarm` folder.
3. Make a new development build (the native code changed).
