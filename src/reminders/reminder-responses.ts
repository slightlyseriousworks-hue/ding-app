/**
 * Carries out presses on task reminders.
 *
 * Who handles a Done / Snooze press depends on whether Ding is on screen. Each press has
 * exactly one owner:
 *
 *   Ding active (on screen)      → useReminderButtons, inside TasksProvider. The provider changes
 *                                  the task like any other edit, then saves and syncs as usual.
 *   Ding in background / closed  → handleBackgroundPress, run by background-task.ts. It reads the
 *                                  saved tasks, changes them, saves, and updates reminders.
 *
 * Android only runs the background task when Ding is NOT in the foreground, and the foreground
 * listener ignores button presses unless Ding is active. So the two never share a press.
 * Known gap: for about a second after leaving Ding, Android may still count it as foreground
 * while Ding's JS already says "background". A press in that moment is ignored and the
 * notification stays, so pressing again works.
 *
 * Safety nets (not the main mechanism): every action is safe to repeat (see actions.ts), and
 * presses already handled in this run of the app are remembered and skipped.
 *
 * Tapping the notification itself opens the task: see useOpenTaskFromReminder.
 * Only verified on Android so far.
 */
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { describeTask, trace, traceSavedTask, type TraceSource } from '@/reminders/action-trace';
import {
  applyReminderAction,
  readReminderPress,
  type ReminderAction,
  type ReminderPress,
} from '@/reminders/actions';
import {
  addReminderPressListener,
  clearLastReminderPress,
  dismissReminder,
  getLastReminderPress,
} from '@/reminders/notifications';
import { reminderTime } from '@/reminders/plan';
import { createReminderSync } from '@/reminders/sync';
import { loadTasks, saveTasks } from '@/tasks/storage';
import type { Task } from '@/tasks/types';

/** Presses handled in this run of the app (a safety net against exact repeats). */
const handledKeys = new Set<string>();

/** True the first time a press is seen; false if it was already handled. */
function isNewPress(press: ReminderPress) {
  if (handledKeys.has(press.key)) return false;
  handledKeys.add(press.key);
  return true;
}

function dismiss(press: ReminderPress, source: TraceSource) {
  trace(source, `dismiss attempted: ${press.notificationId}`);
  dismissReminder(press.notificationId)
    .then(() => trace(source, 'dismiss succeeded'))
    .catch((error) => {
      trace(source, `dismiss failed: ${String(error)}`);
      console.error('Failed to dismiss reminder', error);
    });
}

/** DEV trace only: why applyReminderAction changed nothing (same rules as actions.ts). */
function whyUnchanged(tasks: Task[], action: ReminderAction) {
  const task = tasks.find((t) => t.id === action.taskId);
  if (!task) return 'task not in saved list';
  if (task.completedAt !== null) return 'task already completed';
  if (action.kind === 'snooze' && action.remindAt !== reminderTime(task)) {
    return `stale reminder: press remindAt=${action.remindAt} but task reminds at ${reminderTime(task)}`;
  }
  return 'unknown';
}

/** For tests: forget which presses were handled. */
export function resetHandledPresses() {
  handledKeys.clear();
}

/**
 * Handles a Done / Snooze press while Ding is in the background or closed, straight on the
 * saved tasks (no screens or TasksProvider involved). Never throws.
 */
export async function handleBackgroundPress(press: ReminderPress) {
  const action = readReminderPress(press);
  if (!action || action.kind === 'open') {
    trace(
      'bg-task',
      `ignored: ${action ? 'tap on the notification itself' : 'not a task reminder button'} (action=${press.actionId})`
    );
    return;
  }
  if (!isNewPress(press)) {
    trace('bg-task', `ignored: already handled in this run (key=${press.key})`);
    return;
  }

  try {
    // If reading fails, this throws and nothing is saved, so saved tasks can't be overwritten.
    const tasks = await loadTasks();
    trace(
      'bg-task',
      `${action.kind} attempted on ${action.taskId}; saved before: ${describeTask(tasks.find((t) => t.id === action.taskId))}`
    );
    const updated = applyReminderAction(tasks, action, new Date());
    if (updated) {
      await saveTasks(updated);
      traceSavedTask('bg-task', 'saved after', action.taskId);
      // A fresh sync, as Ding would do on launch: cancels or (for Snooze) schedules the reminder.
      trace('bg-task', 'sync called');
      await createReminderSync()(updated);
      trace('bg-task', 'sync finished');
    } else {
      trace('bg-task', `no change, not saved, no sync: ${whyUnchanged(tasks, action)}`);
    }
  } catch (error) {
    // Leave the notification up so the user can press again.
    handledKeys.delete(press.key);
    trace('bg-task', `failed, notification left up: ${String(error)}`);
    console.error('Failed to handle reminder press in the background', error);
    return;
  }
  dismiss(press, 'bg-task');
}

/**
 * Used by TasksProvider: handles Done / Snooze presses while Ding is on screen, by calling
 * `apply` (which changes the task list). Only listens while `enabled` (tasks have loaded).
 */
export function useReminderButtons(enabled: boolean, apply: (action: ReminderAction) => void) {
  const applyRef = useRef(apply);
  useEffect(() => {
    applyRef.current = apply;
  });

  useEffect(() => {
    if (!enabled) return;
    return addReminderPressListener((press) => {
      const action = readReminderPress(press);
      if (!action || action.kind === 'open') {
        trace(
          'fg-buttons',
          `ignored: ${action ? 'tap on the notification itself' : 'not a task reminder button'} (action=${press.actionId})`
        );
        return;
      }
      // Not on screen: on Android the background task owns this press. (iOS has no such
      // task for button presses, so there the listener handles them. Not verified yet.)
      if (Platform.OS === 'android' && AppState.currentState !== 'active') {
        trace(
          'fg-buttons',
          `ignored: Ding not active (AppState=${AppState.currentState}), background task should own it`
        );
        return;
      }
      if (!isNewPress(press)) {
        trace('fg-buttons', `ignored: already handled in this run (key=${press.key})`);
        return;
      }
      trace('fg-buttons', `${action.kind} attempted on ${action.taskId} via TasksProvider`);
      traceSavedTask('fg-buttons', 'saved before', action.taskId);
      applyRef.current(action);
      // The provider saves and syncs on its own a moment later; check what got saved.
      traceSavedTask('fg-buttons', 'saved 2 s after', action.taskId, 2000);
      dismiss(press, 'fg-buttons');
    }, 'fg-buttons');
  }, [enabled]);
}

/** Used by the root layout: tapping a task reminder opens that task. */
export function useOpenTaskFromReminder() {
  useEffect(() => {
    function open(press: ReminderPress) {
      const action = readReminderPress(press);
      if (action?.kind !== 'open') return;
      if (!isNewPress(press)) {
        trace('fg-open', `ignored: already handled in this run (key=${press.key})`);
        return;
      }
      trace('fg-open', `opening task ${action.taskId}`);
      router.push({ pathname: '/task/[id]', params: { id: action.taskId } });
    }

    // Ding was opened by tapping a notification (it may have been closed before).
    const last = getLastReminderPress();
    if (last) {
      trace(
        'fg-open',
        `Ding opened by a press: action=${last.actionId} id=${last.notificationId} remindAt=${last.remindAt}`
      );
      clearLastReminderPress();
      open(last);
    }
    // Ding was already running.
    return addReminderPressListener(open, 'fg-open');
  }, []);
}
