import { renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AppState, Platform } from 'react-native';

import {
  DONE_ACTION_ID,
  OPEN_ACTION_ID,
  type ReminderPress,
  SNOOZE_ACTION_ID,
  SNOOZE_MINUTES,
} from '@/reminders/actions';
import {
  addReminderPressListener,
  clearLastReminderPress,
  dismissReminder,
  getLastReminderPress,
} from '@/reminders/notifications';
import {
  handleBackgroundPress,
  resetHandledPresses,
  useOpenTaskFromReminder,
  useReminderButtons,
} from '@/reminders/reminder-responses';
import { loadTasks, saveTasks } from '@/tasks/storage';
import type { Task } from '@/tasks/types';

jest.mock('@/reminders/notifications', () => ({
  addReminderPressListener: jest.fn(),
  clearLastReminderPress: jest.fn(),
  dismissReminder: jest.fn(async () => {}),
  getLastReminderPress: jest.fn(),
}));

const mockSync = jest.fn(async (_tasks: Task[]) => {});
jest.mock('@/reminders/sync', () => ({ createReminderSync: () => mockSync }));

jest.mock('@/tasks/storage', () => ({
  loadTasks: jest.fn(),
  saveTasks: jest.fn(async () => {}),
}));

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const mockedLoad = jest.mocked(loadTasks);
const mockedSave = jest.mocked(saveTasks);
const mockedDismiss = jest.mocked(dismissReminder);
const mockedAddListener = jest.mocked(addReminderPressListener);
const mockedGetLast = jest.mocked(getLastReminderPress);
const mockedPush = jest.mocked(router.push);

const dueAt = '2026-10-16T09:00:00.000Z';

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'a',
    title: 'Water plants',
    dueAt,
    completedAt: null,
    snoozedUntil: null,
    createdAt: '2026-10-15T08:00:00.000Z',
    ...overrides,
  };
}

function press(actionId: string, overrides: Partial<ReminderPress> = {}): ReminderPress {
  return {
    actionId,
    notificationId: 'task-a',
    remindAt: dueAt,
    key: `task-a|123|${actionId}`,
    ...overrides,
  };
}

/** The press listener most recently registered through addReminderPressListener. */
function latestListener() {
  return mockedAddListener.mock.calls.at(-1)![0];
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  resetHandledPresses();
  Platform.OS = 'android';
  mockedAddListener.mockReturnValue(() => {});
  mockedGetLast.mockReturnValue(null);
  mockedLoad.mockResolvedValue([task()]);
});

describe('handleBackgroundPress (Ding in the background or closed)', () => {
  it('Done: completes the saved task, syncs reminders, then dismisses the notification', async () => {
    await handleBackgroundPress(press(DONE_ACTION_ID));

    const done = expect.objectContaining({ id: 'a', completedAt: expect.any(String) });
    expect(mockedSave).toHaveBeenCalledWith([done]);
    expect(mockSync).toHaveBeenCalledWith([done]);
    expect(mockedDismiss).toHaveBeenCalledWith('task-a');
  });

  it('Snooze: saves snoozedUntil and syncs, which schedules the snoozed reminder', async () => {
    const before = Date.now();
    await handleBackgroundPress(press(SNOOZE_ACTION_ID));

    const saved = mockedSave.mock.calls[0][0][0];
    expect(saved.dueAt).toBe(dueAt);
    const delay = new Date(saved.snoozedUntil!).getTime() - before;
    expect(delay).toBeGreaterThanOrEqual(SNOOZE_MINUTES * 60_000);
    expect(delay).toBeLessThan(SNOOZE_MINUTES * 60_000 + 5_000);
    expect(mockSync).toHaveBeenCalledWith([saved]);
    expect(mockedDismiss).toHaveBeenCalledWith('task-a');
  });

  it('an out-of-date Snooze saves nothing, but still clears the notification', async () => {
    mockedLoad.mockResolvedValue([task({ dueAt: '2026-10-17T09:00:00.000Z' })]);
    await handleBackgroundPress(press(SNOOZE_ACTION_ID));

    expect(mockedSave).not.toHaveBeenCalled();
    expect(mockSync).not.toHaveBeenCalled();
    expect(mockedDismiss).toHaveBeenCalledWith('task-a');
  });

  it('the same press twice is only carried out once', async () => {
    await handleBackgroundPress(press(SNOOZE_ACTION_ID));
    await handleBackgroundPress(press(SNOOZE_ACTION_ID));

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledTimes(1);
  });

  it('never saves if reading saved tasks fails, and leaves the notification for a retry', async () => {
    mockedLoad.mockRejectedValueOnce(new Error('disk error'));
    await handleBackgroundPress(press(DONE_ACTION_ID));

    expect(mockedSave).not.toHaveBeenCalled();
    expect(mockedDismiss).not.toHaveBeenCalled();

    // Pressing again works.
    await handleBackgroundPress(press(DONE_ACTION_ID));
    expect(mockedSave).toHaveBeenCalledTimes(1);
  });

  it('ignores taps on the notification itself and presses on other notifications', async () => {
    await handleBackgroundPress(press(OPEN_ACTION_ID));
    await handleBackgroundPress(press(DONE_ACTION_ID, { notificationId: 'r1-test' }));

    expect(mockedLoad).not.toHaveBeenCalled();
    expect(mockedDismiss).not.toHaveBeenCalled();
  });
});

describe('useReminderButtons (Ding on screen)', () => {
  function setAppState(state: 'active' | 'background') {
    // The test setup mocks AppState, so set the real-app value (a plain string) directly.
    Object.defineProperty(AppState, 'currentState', { value: state, configurable: true });
  }

  it('does not listen until tasks have loaded', async () => {
    await renderHook(() => useReminderButtons(false, jest.fn()));
    expect(mockedAddListener).not.toHaveBeenCalled();
  });

  it('applies Done through the provider and dismisses, without touching storage', async () => {
    setAppState('active');
    const apply = jest.fn();
    await renderHook(() => useReminderButtons(true, apply));

    latestListener()(press(DONE_ACTION_ID));

    expect(apply).toHaveBeenCalledWith({ kind: 'done', taskId: 'a', remindAt: dueAt });
    expect(mockedDismiss).toHaveBeenCalledWith('task-a');
    expect(mockedLoad).not.toHaveBeenCalled();
    expect(mockedSave).not.toHaveBeenCalled();
  });

  it('leaves presses alone when Ding is not active: the background task owns them', async () => {
    setAppState('background');
    const apply = jest.fn();
    await renderHook(() => useReminderButtons(true, apply));

    latestListener()(press(DONE_ACTION_ID));
    latestListener()(press(SNOOZE_ACTION_ID));

    expect(apply).not.toHaveBeenCalled();
    expect(mockedDismiss).not.toHaveBeenCalled();
  });

  it('ignores taps on the notification itself', async () => {
    setAppState('active');
    const apply = jest.fn();
    await renderHook(() => useReminderButtons(true, apply));

    latestListener()(press(OPEN_ACTION_ID));
    expect(apply).not.toHaveBeenCalled();
  });

  it('skips an exact repeat of a press it already handled', async () => {
    setAppState('active');
    const apply = jest.fn();
    await renderHook(() => useReminderButtons(true, apply));

    latestListener()(press(SNOOZE_ACTION_ID));
    latestListener()(press(SNOOZE_ACTION_ID));
    expect(apply).toHaveBeenCalledTimes(1);
  });
});

describe('useOpenTaskFromReminder', () => {
  const taskRoute = { pathname: '/task/[id]', params: { id: 'a' } };

  it('opens the task when Ding was opened by tapping its reminder', async () => {
    mockedGetLast.mockReturnValue(press(OPEN_ACTION_ID));
    await renderHook(() => useOpenTaskFromReminder());

    expect(mockedPush).toHaveBeenCalledWith(taskRoute);
    expect(clearLastReminderPress).toHaveBeenCalled();
  });

  it('opens the task when its reminder is tapped while Ding is running', async () => {
    await renderHook(() => useOpenTaskFromReminder());
    latestListener()(press(OPEN_ACTION_ID));
    expect(mockedPush).toHaveBeenCalledWith(taskRoute);
  });

  it('opens it only once if the same tap is reported twice', async () => {
    mockedGetLast.mockReturnValue(press(OPEN_ACTION_ID));
    await renderHook(() => useOpenTaskFromReminder());
    latestListener()(press(OPEN_ACTION_ID));
    expect(mockedPush).toHaveBeenCalledTimes(1);
  });

  it('does not navigate for Done / Snooze presses', async () => {
    mockedGetLast.mockReturnValue(press(DONE_ACTION_ID));
    await renderHook(() => useOpenTaskFromReminder());
    latestListener()(press(SNOOZE_ACTION_ID));
    expect(mockedPush).not.toHaveBeenCalled();
  });
});
