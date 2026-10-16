/**
 * A single task. Dates are stored as ISO strings (e.g. "2026-10-15T15:00:00.000Z")
 * so they survive being saved as JSON.
 *
 * A task's notification id is not stored: it is always `task-<id>` (see reminders/plan.ts).
 * Other reminder fields (snooze count, reminders sent, intensity, recurrence) will be added
 * when those features are built.
 */
export type Task = {
  id: string;
  title: string;
  /** When the task is due / when the first reminder should fire. */
  dueAt: string;
  /** When the task was marked complete, or null if it is still open. */
  completedAt: string | null;
  /**
   * When the user pressed Snooze on a reminder: the time it should ring again. null if not
   * snoozed. A snooze never moves `dueAt`. It is cleared when the due time changes or the
   * task is completed / reopened.
   */
  snoozedUntil: string | null;
  createdAt: string;
};

/** The fields a user fills in on the task form. */
export type TaskInput = Pick<Task, 'title' | 'dueAt'>;
