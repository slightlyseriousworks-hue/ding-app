/**
 * The Done and Snooze buttons on a task reminder, and what pressing them does to the tasks.
 *
 * This file is plain logic (no expo-notifications), so every rule can be tested directly.
 * notifications.ts puts the buttons on reminders; reminder-responses.ts carries out presses.
 *
 * Rules:
 *   - Done completes the task. Pressing it again (or on an old notification) changes nothing.
 *   - Snooze rings again SNOOZE_MINUTES from now. It only works on the task's CURRENT
 *     reminder: if the notification's `remindAt` no longer matches the task (already snoozed,
 *     due time edited, completed), the press changes nothing. So a repeated press can't
 *     push the snooze further out.
 *   - A press for a task that no longer exists changes nothing.
 */
import { reminderTime, taskIdFromReminderId } from '@/reminders/plan';
import type { Task } from '@/tasks/types';

/** Android/iOS group buttons into a "category". No `-` or `:` allowed in these ids. */
export const REMINDER_CATEGORY_ID = 'task_reminder';
export const DONE_ACTION_ID = 'done';
export const SNOOZE_ACTION_ID = 'snooze';
/** Not a button: the user tapped the notification itself. */
export const OPEN_ACTION_ID = 'open';
/**
 * DEV diagnostic button only: opens Ding but changes nothing. Ding doesn't understand this id,
 * so every handler ignores it (and the action trace records that it arrived).
 */
export const DIAG_OPEN_ACTION_ID = 'diag_open';

/** How long Snooze waits. Development builds use 1 minute so it's quick to test by hand. */
export const SNOOZE_MINUTES = __DEV__ ? 1 : 10;

/** A press on a notification, as notifications.ts reports it. */
export type ReminderPress = {
  /** OPEN_ACTION_ID if the notification itself was tapped, otherwise the button's id. */
  actionId: string;
  /** The notification's id. For task reminders this is `task-<task id>`. */
  notificationId: string;
  /** The `remindAt` saved inside the notification, or null if missing. */
  remindAt: string | null;
  /** Different for every delivered notification + button. Used to skip exact repeats. */
  key: string;
};

export type ReminderAction = {
  kind: 'done' | 'snooze' | 'open';
  taskId: string;
  /** Which reminder was pressed (see the Snooze rule above). */
  remindAt: string | null;
};

const KIND_BY_ACTION_ID: Record<string, ReminderAction['kind']> = {
  [DONE_ACTION_ID]: 'done',
  [SNOOZE_ACTION_ID]: 'snooze',
  [OPEN_ACTION_ID]: 'open',
};

/** What a press asks for, or null if it isn't a press on a task reminder Ding understands. */
export function readReminderPress(press: ReminderPress): ReminderAction | null {
  const kind = KIND_BY_ACTION_ID[press.actionId];
  const taskId = taskIdFromReminderId(press.notificationId);
  if (!kind || !taskId) return null;
  return { kind, taskId, remindAt: press.remindAt };
}

/**
 * Applies a Done or Snooze press to the task list.
 * Returns the new list, or null if nothing should change (see the rules at the top).
 */
export function applyReminderAction(
  tasks: Task[],
  action: ReminderAction,
  now: Date
): Task[] | null {
  const task = tasks.find((t) => t.id === action.taskId);
  if (!task || task.completedAt !== null) return null;

  let updated: Task;
  if (action.kind === 'done') {
    updated = { ...task, completedAt: now.toISOString(), snoozedUntil: null };
  } else if (action.kind === 'snooze') {
    if (action.remindAt !== reminderTime(task)) return null;
    const snoozedUntil = new Date(now.getTime() + SNOOZE_MINUTES * 60_000).toISOString();
    updated = { ...task, snoozedUntil };
  } else {
    return null;
  }

  return tasks.map((t) => (t.id === task.id ? updated : t));
}
