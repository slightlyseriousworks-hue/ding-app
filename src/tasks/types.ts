/**
 * A single task. Dates are stored as ISO strings (e.g. "2026-10-15T15:00:00.000Z")
 * so they survive being saved as JSON.
 *
 * Reminder fields (snooze count, reminders sent, intensity, recurrence, notification ids)
 * will be added when the reminder system is built.
 */
export type Task = {
  id: string;
  title: string;
  /** When the task is due / when the first reminder should fire. */
  dueAt: string;
  /** When the task was marked complete, or null if it is still open. */
  completedAt: string | null;
  createdAt: string;
};

/** The fields a user fills in on the task form. */
export type TaskInput = Pick<Task, 'title' | 'dueAt'>;
