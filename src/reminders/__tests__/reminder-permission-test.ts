import { Alert, Platform, type AlertButton } from 'react-native';

import {
  getReminderTiming,
  hasNotificationPermission,
  openExactTimingSettings,
  requestNotificationPermission,
} from '@/reminders/notifications';
import { offerPreciseTiming, prepareReminder } from '@/reminders/reminder-permission';

jest.mock('@/reminders/notifications', () => ({
  getReminderTiming: jest.fn(),
  hasNotificationPermission: jest.fn(),
  openExactTimingSettings: jest.fn(),
  requestNotificationPermission: jest.fn(),
}));

// A pretend device flag, so "only once" behaves like the real thing.
let mockOffered = false;
jest.mock('@/tasks/storage', () => ({
  wasPreciseTimingOffered: jest.fn(async () => mockOffered),
  markPreciseTimingOffered: jest.fn(async () => {
    mockOffered = true;
  }),
}));

const mockedRequest = jest.mocked(requestNotificationPermission);
const mockedGetTiming = jest.mocked(getReminderTiming);
const mockedHasPermission = jest.mocked(hasNotificationPermission);
const mockedOpenSettings = jest.mocked(openExactTimingSettings);

const future = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();
const past = () => new Date(Date.now() - 60 * 60 * 1000).toISOString();

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  Platform.OS = 'android';
  mockOffered = false;
  mockedGetTiming.mockReturnValue('best-effort');
  mockedHasPermission.mockResolvedValue(true);
});

describe('offerPreciseTiming', () => {
  it('explains precise timing once, when reminders may arrive late', async () => {
    await offerPreciseTiming(future());
    await offerPreciseTiming(future());

    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Want reminders to arrive on time?',
      expect.any(String),
      expect.any(Array)
    );
  });

  it('opens Android Settings only when the user taps Enable', async () => {
    await offerPreciseTiming(future());
    const buttons = jest.mocked(Alert.alert).mock.calls[0][2] as AlertButton[];
    expect(mockedOpenSettings).not.toHaveBeenCalled();

    buttons.find((b) => b.text === 'Not now')?.onPress?.();
    expect(mockedOpenSettings).not.toHaveBeenCalled();

    buttons.find((b) => b.text === 'Enable precise timing')?.onPress?.();
    expect(mockedOpenSettings).toHaveBeenCalled();
  });

  it('says nothing when timing is already exact', async () => {
    mockedGetTiming.mockReturnValue('exact');
    await offerPreciseTiming(future());
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('says nothing when notifications are off (that has its own message)', async () => {
    mockedHasPermission.mockResolvedValue(false);
    await offerPreciseTiming(future());
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('says nothing for a task that gets no reminder', async () => {
    await offerPreciseTiming(past());
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('says nothing on iOS', async () => {
    Platform.OS = 'ios';
    await offerPreciseTiming(future());
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});

it('asks for permission when saving a future task', async () => {
  mockedRequest.mockResolvedValue('granted');
  await expect(prepareReminder(future())).resolves.toBe(true);
  expect(mockedRequest).toHaveBeenCalled();
});

it('does not ask for a past-due task (no reminder needed)', async () => {
  await expect(prepareReminder(past())).resolves.toBe(true);
  expect(mockedRequest).not.toHaveBeenCalled();
});

it('reports false when notifications are turned off', async () => {
  mockedRequest.mockResolvedValue('denied');
  await expect(prepareReminder(future())).resolves.toBe(false);
});

it('does not warn on web, where notifications are simply unavailable', async () => {
  mockedRequest.mockResolvedValue('unavailable');
  await expect(prepareReminder(future())).resolves.toBe(true);
});

it('never throws, so the task can always be saved', async () => {
  mockedRequest.mockRejectedValue(new Error('native error'));
  await expect(prepareReminder(future())).resolves.toBe(true);
});
