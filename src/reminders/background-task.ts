/**
 * Handles Done / Snooze presses while Ding is in the background or closed (Android).
 *
 * Android starts Ding's JavaScript without any screens and runs this task. It must be
 * defined as soon as the JavaScript loads, which is why the root index.ts imports this file
 * before anything else. See reminder-responses.ts for who handles which press.
 */
import * as TaskManager from 'expo-task-manager';

import { trace } from '@/reminders/action-trace';
import {
  describeResponse,
  registerBackgroundPressTask,
  toReminderPress,
} from '@/reminders/notifications';
import { handleBackgroundPress } from '@/reminders/reminder-responses';

export const REMINDER_PRESS_TASK = 'ding-reminder-press';

// DEV trace: shows every time Ding's JS starts (a headless start has its own run id).
trace('bg-task', 'JS loaded, defining task');

TaskManager.defineTask(REMINDER_PRESS_TASK, async ({ data, error }) => {
  trace('bg-task', `task ran: ${error ? `error=${String(error)}` : describeResponse(data)}`);
  if (error) {
    console.error('Reminder press task failed', error);
    return;
  }
  const press = toReminderPress(data);
  if (press) await handleBackgroundPress(press);
  else trace('bg-task', 'ignored: not a notification response (unreadable payload)');
});

registerBackgroundPressTask(REMINDER_PRESS_TASK)
  .then(() => trace('bg-task', `registered "${REMINDER_PRESS_TASK}" with expo-notifications`))
  .catch((error) => {
    trace('bg-task', `registering task failed: ${String(error)}`);
    console.error('Failed to register the reminder press task', error);
  });
