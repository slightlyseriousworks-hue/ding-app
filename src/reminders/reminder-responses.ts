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
import { createReminderSync } from '@/reminders/sync';
import { loadTasks, saveTasks } from '@/tasks/storage';

/** Presses handled in this run of the app (a safety net against exact repeats). */
const handledKeys = new Set<string>();

/** True the first time a press is seen; false if it was already handled. */
function isNewPress(press: ReminderPress) {
  if (handledKeys.has(press.key)) return false;
  handledKeys.add(press.key);
  return true;
}

function dismiss(press: ReminderPress) {
  dismissReminder(press.notificationId).catch((error) =>
    console.error('Failed to dismiss reminder', error)
  );
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
  if (!action || action.kind === 'open') return;
  if (!isNewPress(press)) return;

  try {
    // If reading fails, this throws and nothing is saved, so saved tasks can't be overwritten.
    const tasks = await loadTasks();
    const updated = applyReminderAction(tasks, action, new Date());
    if (updated) {
      await saveTasks(updated);
      // A fresh sync, as Ding would do on launch: cancels or (for Snooze) schedules the reminder.
      await createReminderSync()(updated);
    }
  } catch (error) {
    // Leave the notification up so the user can press again.
    handledKeys.delete(press.key);
    console.error('Failed to handle reminder press in the background', error);
    return;
  }
  dismiss(press);
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
      if (!action || action.kind === 'open') return;
      // Not on screen: on Android the background task owns this press. (iOS has no such
      // task for button presses, so there the listener handles them. Not verified yet.)
      if (Platform.OS === 'android' && AppState.currentState !== 'active') return;
      if (!isNewPress(press)) return;
      applyRef.current(action);
      dismiss(press);
    });
  }, [enabled]);
}

/** Used by the root layout: tapping a task reminder opens that task. */
export function useOpenTaskFromReminder() {
  useEffect(() => {
    function open(press: ReminderPress) {
      const action = readReminderPress(press);
      if (action?.kind !== 'open' || !isNewPress(press)) return;
      router.push({ pathname: '/task/[id]', params: { id: action.taskId } });
    }

    // Ding was opened by tapping a notification (it may have been closed before).
    const last = getLastReminderPress();
    if (last) {
      clearLastReminderPress();
      open(last);
    }
    // Ding was already running.
    return addReminderPressListener(open);
  }, []);
}
