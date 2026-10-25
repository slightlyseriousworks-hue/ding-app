/**
 * Keeps the phone's scheduled reminders in step with the task list.
 *
 * TasksProvider calls the sync function every time the tasks change, and whenever Ding comes
 * back to the foreground (the user may have turned precise timing on or off in Android
 * Settings meanwhile). Screens never call it.
 * Only one sync runs at a time; if the tasks change while one is running, one more sync runs
 * afterwards with the newest list (any lists in between are skipped, they are already stale).
 *
 * Best effort: errors are logged, never thrown. The next change (or next launch) tries again.
 * On web the notification helpers do nothing, so this does nothing too.
 */
import {
  cancelReminder,
  ensureAndroidChannel,
  ensureReminderActions,
  getReminderTiming,
  getScheduledTaskReminders,
  hasNotificationPermission,
  scheduleTaskReminder,
} from '@/reminders/notifications';
import { planReminderChanges } from '@/reminders/plan';
import type { Task } from '@/tasks/types';

async function syncOnce(tasks: Task[], seenTaskIds: ReadonlySet<string>) {
  const scheduled = await getScheduledTaskReminders();
  const changes = planReminderChanges({
    tasks,
    scheduled,
    seenTaskIds,
    timing: getReminderTiming(),
    now: new Date(),
  });

  // Cancel first, so an out-of-date reminder is gone before its replacement is scheduled.
  for (const id of changes.cancel) {
    await cancelReminder(id);
  }

  if (changes.schedule.length === 0) return;
  // Without permission there is nothing to schedule. The task is still saved.
  if (!(await hasNotificationPermission())) return;

  await ensureAndroidChannel();
  await ensureReminderActions();
  for (const reminder of changes.schedule) {
    await scheduleTaskReminder(reminder);
  }
}

/** Creates a sync function with its own memory of which tasks this session has seen. */
export function createReminderSync() {
  const seenTaskIds = new Set<string>();
  let latest: Task[] | null = null;
  let running: Promise<void> | null = null;

  async function drain() {
    try {
      while (latest) {
        const tasks = latest;
        latest = null;
        try {
          await syncOnce(tasks, seenTaskIds);
        } catch (error) {
          console.error('Failed to sync reminders', error);
        }
      }
    } finally {
      running = null;
    }
  }

  /** Resolves once the reminders match `tasks` (or the newest list, if it changed since). */
  return function syncReminders(tasks: Task[]): Promise<void> {
    for (const task of tasks) seenTaskIds.add(task.id);
    latest = tasks;
    running ??= drain();
    return running;
  };
}
