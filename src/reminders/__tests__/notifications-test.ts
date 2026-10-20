import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  DONE_ACTION_ID,
  OPEN_ACTION_ID,
  REMINDER_CATEGORY_ID,
  SNOOZE_ACTION_ID,
  SNOOZE_MINUTES,
} from '@/reminders/actions';
import {
  ensureReminderActions,
  getReminderTiming,
  getScheduledTaskReminders,
  openExactTimingSettings,
  REMINDERS_CHANNEL_ID,
  requestNotificationPermission,
  scheduleTaskReminder,
  scheduleTestNotification,
  toReminderPress,
} from '@/reminders/notifications';

import { ExactAlarm } from '../../../modules/exact-alarm';

// The DEV action trace saves to device storage; keep it out of these tests.
jest.mock('@/reminders/action-trace', () => ({ trace: jest.fn() }));

jest.mock('../../../modules/exact-alarm', () => ({
  ExactAlarm: {
    canScheduleExactAlarms: jest.fn(),
    openExactAlarmSettings: jest.fn(),
  },
}));

const mockedExactAlarm = jest.mocked(ExactAlarm!);

jest.mock('expo-notifications', () => ({
  DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
  AndroidImportance: { HIGH: 6 },
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval', DATE: 'date' },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  setNotificationCategoryAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(async () => 'notification-id'),
  getAllScheduledNotificationsAsync: jest.fn(),
}));

const mocked = jest.mocked(Notifications);

function permissions(granted: boolean, canAskAgain = true) {
  return { granted, canAskAgain } as Notifications.NotificationPermissionsStatus;
}

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'android';
});

describe('requestNotificationPermission', () => {
  it('does not show the prompt when permission is already granted', async () => {
    mocked.getPermissionsAsync.mockResolvedValue(permissions(true));

    await expect(requestNotificationPermission()).resolves.toBe('granted');
    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('creates the Android channel before asking (Android 13+ needs one)', async () => {
    mocked.getPermissionsAsync.mockResolvedValue(permissions(false));
    mocked.requestPermissionsAsync.mockResolvedValue(permissions(true));

    await expect(requestNotificationPermission()).resolves.toBe('granted');
    const channelOrder = mocked.setNotificationChannelAsync.mock.invocationCallOrder[0];
    const requestOrder = mocked.requestPermissionsAsync.mock.invocationCallOrder[0];
    expect(channelOrder).toBeLessThan(requestOrder);
  });

  it('reports denied when the user says no', async () => {
    mocked.getPermissionsAsync.mockResolvedValue(permissions(false));
    mocked.requestPermissionsAsync.mockResolvedValue(permissions(false));

    await expect(requestNotificationPermission()).resolves.toBe('denied');
  });

  it('does not ask again when the system will no longer show the prompt', async () => {
    mocked.getPermissionsAsync.mockResolvedValue(permissions(false, false));

    await expect(requestNotificationPermission()).resolves.toBe('denied');
    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe('scheduleTestNotification', () => {
  it('creates a HIGH importance Reminders channel', async () => {
    await scheduleTestNotification(10);

    expect(mocked.setNotificationChannelAsync).toHaveBeenCalledWith(
      REMINDERS_CHANNEL_ID,
      expect.objectContaining({ importance: Notifications.AndroidImportance.HIGH })
    );
  });

  it('schedules a time-interval notification on the Reminders channel', async () => {
    await expect(scheduleTestNotification(10)).resolves.toBe('notification-id');

    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: expect.objectContaining({ sound: true }),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 10,
        channelId: REMINDERS_CHANNEL_ID,
      },
    });
  });
});

describe('ensureReminderActions', () => {
  it('sets up Done and Snooze buttons that do not open the app', async () => {
    await ensureReminderActions();

    expect(mocked.setNotificationCategoryAsync).toHaveBeenCalledWith(REMINDER_CATEGORY_ID, [
      expect.objectContaining({
        identifier: DONE_ACTION_ID,
        buttonTitle: 'Done',
        options: { opensAppToForeground: false },
      }),
      expect.objectContaining({
        identifier: SNOOZE_ACTION_ID,
        buttonTitle: `Snooze ${SNOOZE_MINUTES} min`,
        options: { opensAppToForeground: false },
      }),
    ]);
  });
});

describe('scheduleTaskReminder', () => {
  it('schedules at the reminder time with the task-derived id, details, and buttons', async () => {
    const remindAt = '2026-10-16T13:00:00.000Z';
    await scheduleTaskReminder({
      id: 'task-a',
      taskId: 'a',
      title: 'Water plants',
      remindAt,
      timing: 'exact',
    });

    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledWith({
      identifier: 'task-a',
      content: expect.objectContaining({
        title: 'Water plants',
        categoryIdentifier: REMINDER_CATEGORY_ID,
        data: { taskId: 'a', remindAt, title: 'Water plants', timing: 'exact' },
      }),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(remindAt),
        channelId: REMINDERS_CHANNEL_ID,
      },
    });
  });
});

describe('getScheduledTaskReminders', () => {
  it('returns only task reminders, with their saved details', async () => {
    const withActions = { categoryIdentifier: REMINDER_CATEGORY_ID };
    mocked.getAllScheduledNotificationsAsync.mockResolvedValue([
      {
        identifier: 'task-a',
        content: { ...withActions, data: { remindAt: 'R', title: 'T', timing: 'exact' } },
      },
      { identifier: 'task-b', content: { data: null } },
      { identifier: 'task-c', content: { data: { dueAt: 'D', title: 'T', timing: 'nope' } } },
      { identifier: 'r1-test', content: { data: {} } },
    ] as unknown as Notifications.NotificationRequest[]);

    await expect(getScheduledTaskReminders()).resolves.toEqual([
      { id: 'task-a', remindAt: 'R', title: 'T', timing: 'exact', hasActions: true },
      { id: 'task-b', remindAt: null, title: null, timing: null, hasActions: false },
      // Scheduled before R3: only `dueAt` was saved, and there are no buttons.
      { id: 'task-c', remindAt: 'D', title: 'T', timing: null, hasActions: false },
    ]);
  });
});

describe('toReminderPress', () => {
  const remindAt = '2026-10-16T13:00:00.000Z';

  function response(actionIdentifier: string, content: Record<string, unknown>) {
    return { actionIdentifier, notification: { date: 123, request: { identifier: 'task-a', content } } };
  }

  it('reads a press reported to a listener (data already parsed)', () => {
    expect(toReminderPress(response('done', { data: { taskId: 'a', remindAt } }))).toEqual({
      actionId: 'done',
      notificationId: 'task-a',
      remindAt,
      key: 'task-a|123|done',
    });
  });

  it('reads a press given to the background task (data as a JSON string)', () => {
    const content = { dataString: JSON.stringify({ taskId: 'a', remindAt }) };
    expect(toReminderPress(response('snooze', content))).toEqual(
      expect.objectContaining({ actionId: 'snooze', notificationId: 'task-a', remindAt })
    );
  });

  it('reports a tap on the notification itself as "open"', () => {
    const tap = response(Notifications.DEFAULT_ACTION_IDENTIFIER, { data: {} });
    expect(toReminderPress(tap)).toEqual(
      expect.objectContaining({ actionId: OPEN_ACTION_ID, remindAt: null })
    );
  });

  it('survives broken payloads', () => {
    expect(toReminderPress(null)).toBeNull();
    expect(toReminderPress({ actionIdentifier: 'done' })).toBeNull();
    expect(toReminderPress(response('done', { dataString: '{not json' }))).toEqual(
      expect.objectContaining({ remindAt: null })
    );
  });
});

describe('getReminderTiming', () => {
  it('is exact on Android when Alarms & reminders is on', () => {
    mockedExactAlarm.canScheduleExactAlarms.mockReturnValue(true);
    expect(getReminderTiming()).toBe('exact');
  });

  it('is best-effort on Android when Alarms & reminders is off', () => {
    mockedExactAlarm.canScheduleExactAlarms.mockReturnValue(false);
    expect(getReminderTiming()).toBe('best-effort');
  });

  it('is always exact on iOS (no such switch there)', () => {
    Platform.OS = 'ios';
    mockedExactAlarm.canScheduleExactAlarms.mockReturnValue(false);
    expect(getReminderTiming()).toBe('exact');
  });
});

describe('openExactTimingSettings', () => {
  it('opens the Android settings page', () => {
    mockedExactAlarm.openExactAlarmSettings.mockReturnValue(true);
    expect(openExactTimingSettings()).toBe(true);
    expect(mockedExactAlarm.openExactAlarmSettings).toHaveBeenCalled();
  });

  it('does nothing on iOS', () => {
    Platform.OS = 'ios';
    expect(openExactTimingSettings()).toBe(false);
    expect(mockedExactAlarm.openExactAlarmSettings).not.toHaveBeenCalled();
  });
});
