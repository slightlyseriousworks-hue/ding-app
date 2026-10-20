/**
 * DEV only: a saved, step-by-step log of what happens when a reminder button is pressed.
 *
 * Why: a press while Ding is in the background or closed may run JavaScript that Metro never
 * shows. So each step is also saved on the phone. Afterwards, open Ding → Settings →
 * "Log action trace (DEV)" to print everything to Metro.
 *
 * This is a debugging aid, not part of the reminder logic: it never throws, never changes
 * tasks or reminders, and does nothing in release builds or in tests.
 */
import { AppState } from 'react-native';

import {
  appendActionTrace,
  clearActionTrace,
  loadActionTrace,
  peekSavedTask,
} from '@/tasks/storage';
import type { Task } from '@/tasks/types';

/** Who wrote a trace line. */
export type TraceSource =
  | 'category' // setting up the Done / Snooze buttons
  | 'bg-task' // TaskManager background task (background-task.ts)
  | 'fg-buttons' // foreground listener for Done / Snooze (useReminderButtons)
  | 'fg-open' // foreground listener for tapping the notification (useOpenTaskFromReminder)
  | 'sync'; // reminder sync

const ENABLED = __DEV__ && process.env.NODE_ENV !== 'test';

/** Each JS run gets a short id, so lines from a background (headless) run stand out. */
const RUN_ID = Math.random().toString(36).slice(2, 6);

// Saves one line at a time, in order, so lines can't overwrite each other.
let queue: Promise<void> = Promise.resolve();

/** Adds one line to the saved trace. Also prints it, in case Metro is listening. */
export function trace(source: TraceSource, message: string) {
  if (!ENABLED) return;
  const line = `${new Date().toISOString()} run=${RUN_ID} app=${AppState.currentState} [${source}] ${message}`;
  console.log(`[Ding trace] ${line}`);
  queue = queue.then(() => appendActionTrace(line)).catch(() => {});
}

/** A short description of a task, for the trace. */
export function describeTask(task: Task | string | null | undefined) {
  if (task === null || task === undefined) return 'task not found';
  if (typeof task === 'string') return task;
  return `completedAt=${task.completedAt} snoozedUntil=${task.snoozedUntil} dueAt=${task.dueAt}`;
}

/** Adds a line with the task as it is saved on the phone (now, or after `delayMs`). */
export function traceSavedTask(source: TraceSource, label: string, taskId: string, delayMs = 0) {
  if (!ENABLED) return;
  setTimeout(() => {
    peekSavedTask(taskId)
      .then((task) => trace(source, `${label}: ${describeTask(task)}`))
      .catch((error) => trace(source, `${label}: storage read failed: ${String(error)}`));
  }, delayMs);
}

/** Prints the whole saved trace to Metro. */
export async function printActionTrace() {
  if (!ENABLED) return;
  await queue;
  const lines = await loadActionTrace();
  console.log(`[Ding trace] ----- ${lines.length} saved line(s) -----`);
  for (const line of lines) console.log(`[Ding trace] ${line}`);
  console.log('[Ding trace] ----- end -----');
}

export async function resetActionTrace() {
  if (!ENABLED) return;
  await queue;
  await clearActionTrace();
  console.log('[Ding trace] cleared');
}
