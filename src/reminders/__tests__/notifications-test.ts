import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  getScheduledTaskReminders,
  REMINDERS_CHANNEL_ID,
  requestNotificationPermission,
  scheduleTaskReminder,
  scheduleTestNotification,
} from '@/reminders/notifications';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 6 },
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval', DATE: 'date' },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
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

describe('scheduleTaskReminder', () => {
  it('schedules at the due time with the task-derived id and details', async () => {
    const dueAt = '2026-10-16T13:00:00.000Z';
    await scheduleTaskReminder({ id: 'task-a', taskId: 'a', title: 'Water plants', dueAt });

    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledWith({
      identifier: 'task-a',
      content: expect.objectContaining({
        title: 'Water plants',
        data: { taskId: 'a', dueAt, title: 'Water plants' },
      }),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(dueAt),
        channelId: REMINDERS_CHANNEL_ID,
      },
    });
  });
});

describe('getScheduledTaskReminders', () => {
  it('returns only task reminders, with their saved details', async () => {
    mocked.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: 'task-a', content: { data: { dueAt: 'D', title: 'T' } } },
      { identifier: 'task-b', content: { data: null } },
      { identifier: 'r1-test', content: { data: {} } },
    ] as unknown as Notifications.NotificationRequest[]);

    await expect(getScheduledTaskReminders()).resolves.toEqual([
      { id: 'task-a', dueAt: 'D', title: 'T' },
      { id: 'task-b', dueAt: null, title: null },
    ]);
  });
});
