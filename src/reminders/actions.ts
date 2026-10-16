/**
 * The Done and Snooze buttons on a task reminder, and what pressing them does to the tasks.
 *
 * This file is plain logic (no expo-notifications), so every rule can be tested directly.
 * notifications.ts puts the buttons on reminders; handle-response.ts carries out the presses.
 */

/** Android/iOS group buttons into a "category". No `-` or `:` allowed in these ids. */
export const REMINDER_CATEGORY_ID = 'task_reminder';
export const DONE_ACTION_ID = 'done';
export const SNOOZE_ACTION_ID = 'snooze';

/** How long Snooze waits. Development builds use 1 minute so it's quick to test by hand. */
export const SNOOZE_MINUTES = __DEV__ ? 1 : 10;
