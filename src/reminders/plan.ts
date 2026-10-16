/**
 * Decides which task reminders to cancel and which to schedule.
 *
 * This file is plain logic (no expo-notifications), so every rule can be tested directly.
 * sync.ts gathers the inputs and carries out the result.
 *
 * Rules:
 *   - An open task gets exactly one reminder, with id `task-<task.id>`. It rings at the task's
 *     reminder time: the snooze time if the task is snoozed, otherwise its due time.
 *   - A reminder that no longer matches its task (done, new reminder time, new title) is
 *     cancelled. If the task still needs one, a fresh reminder is scheduled with the same id.
 *   - A reminder scheduled with a different timing than Ding has now (exact vs best-effort,
 *     see ReminderTiming) is replaced the same way, so turning Android's "Alarms & reminders"
 *     on or off takes effect for every reminder. So is a reminder without the Done / Snooze
 *     buttons (scheduled before R3). Unless it is due too soon to replace safely.
 *   - A reminder for a task that is not in the list is only cancelled if this app session has
 *     seen that task (e.g. it was deleted). Reminders for tasks we have never seen are left
 *     alone, so recovering from damaged saved data can't wipe out every reminder.
 */
import type { Task } from '@/tasks/types';

export const REMINDER_ID_PREFIX = 'task-';

/** Don't schedule anything due sooner than this; the time could pass before it is set up. */
export const MIN_LEAD_MS = 5_000;

/**
 * How precisely reminders can be delivered right now.
 *   'exact'       — on time (iOS, Android 11 and older, or Android with "Alarms & reminders" on).
 *   'best-effort' — Android may deliver them late, sometimes by several minutes.
 */
export type ReminderTiming = 'exact' | 'best-effort';

/** A task reminder that is already scheduled on the device. */
export type ScheduledReminder = {
  id: string;
  /** The time and title the reminder was scheduled with (null if unreadable). */
  remindAt: string | null;
  title: string | null;
  /** The timing it was scheduled with (null if unreadable, or scheduled before R2.5). */
  timing: ReminderTiming | null;
  /** True if it shows the Done / Snooze buttons (false if scheduled before R3). */
  hasActions: boolean;
};

/** A reminder to schedule for one task. */
export type ReminderToSchedule = {
  id: string;
  taskId: string;
  title: string;
  /** When it should ring: the snooze time if snoozed, otherwise the due time. */
  remindAt: string;
  timing: ReminderTiming;
};

export type ReminderChanges = {
  /** Ids to cancel. These are always carried out before `schedule`. */
  cancel: string[];
  schedule: ReminderToSchedule[];
};

export function reminderId(taskId: string) {
  return `${REMINDER_ID_PREFIX}${taskId}`;
}

/** The task id inside a reminder id, or null if the id is not a task reminder's. */
export function taskIdFromReminderId(id: string) {
  if (!id.startsWith(REMINDER_ID_PREFIX)) return null;
  return id.slice(REMINDER_ID_PREFIX.length) || null;
}

/** When the task's reminder should ring: the snooze time if snoozed, otherwise when due. */
export function reminderTime(task: Task) {
  return task.snoozedUntil ?? task.dueAt;
}

/** True if a reminder at this time should be scheduled now. */
export function isReminderTime(remindAt: string, now: Date) {
  return new Date(remindAt).getTime() - now.getTime() >= MIN_LEAD_MS;
}

type PlanInput = {
  tasks: Task[];
  scheduled: ScheduledReminder[];
  /** Every task id this app session has seen, including deleted ones. */
  seenTaskIds: ReadonlySet<string>;
  /** The timing Ding can use right now. */
  timing: ReminderTiming;
  now: Date;
};

export function planReminderChanges({ tasks, scheduled, seenTaskIds, timing, now }: PlanInput) {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const upToDate = new Set<string>();
  const changes: ReminderChanges = { cancel: [], schedule: [] };

  for (const reminder of scheduled) {
    const taskId = taskIdFromReminderId(reminder.id);
    if (taskId === null) continue;
    const task = taskById.get(taskId);

    if (!task) {
      // Deleted this session → cancel. Never seen → leave it alone (see top of file).
      if (seenTaskIds.has(taskId)) changes.cancel.push(reminder.id);
      continue;
    }

    const remindAt = reminderTime(task);
    const sameTask =
      task.completedAt === null && reminder.remindAt === remindAt && reminder.title === task.title;
    const sameSetup = reminder.timing === timing && reminder.hasActions;
    // If it is due too soon, a replacement might not be set up in time; keep the old one.
    if (sameTask && (sameSetup || !isReminderTime(remindAt, now))) upToDate.add(task.id);
    else changes.cancel.push(reminder.id);
  }

  for (const task of tasks) {
    if (task.completedAt !== null || upToDate.has(task.id)) continue;
    const remindAt = reminderTime(task);
    if (!isReminderTime(remindAt, now)) continue;
    changes.schedule.push({
      id: reminderId(task.id),
      taskId: task.id,
      title: task.title,
      remindAt,
      timing,
    });
  }

  return changes;
}
