/**
 * Handles Done / Snooze presses while Ding is in the background or closed (Android).
 *
 * Android starts Ding's JavaScript without any screens and runs this task. It must be
 * defined as soon as the JavaScript loads, which is why the root index.ts imports this file
 * before anything else. See reminder-responses.ts for who handles which press.
 */
import * as TaskManager from 'expo-task-manager';

import { registerBackgroundPressTask, toReminderPress } from '@/reminders/notifications';
import { handleBackgroundPress } from '@/reminders/reminder-responses';

export const REMINDER_PRESS_TASK = 'ding-reminder-press';

TaskManager.defineTask(REMINDER_PRESS_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Reminder press task failed', error);
    return;
  }
  const press = toReminderPress(data);
  if (press) await handleBackgroundPress(press);
});

registerBackgroundPressTask(REMINDER_PRESS_TASK).catch((error) =>
  console.error('Failed to register the reminder press task', error)
);
