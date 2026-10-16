import {
  cancelReminder,
  getReminderTiming,
  getScheduledTaskReminders,
  hasNotificationPermission,
  scheduleTaskReminder,
} from '@/reminders/notifications';
import type { ScheduledReminder } from '@/reminders/plan';
import { createReminderSync } from '@/reminders/sync';
import type { Task } from '@/tasks/types';

jest.mock('@/reminders/notifications', () => ({
  cancelReminder: jest.fn(async () => {}),
  ensureAndroidChannel: jest.fn(async () => {}),
  getReminderTiming: jest.fn(),
  getScheduledTaskReminders: jest.fn(),
  hasNotificationPermission: jest.fn(),
  scheduleTaskReminder: jest.fn(async () => {}),
}));

const mockedCancel = jest.mocked(cancelReminder);
const mockedGetTiming = jest.mocked(getReminderTiming);
const mockedGetScheduled = jest.mocked(getScheduledTaskReminders);
const mockedHasPermission = jest.mocked(hasNotificationPermission);
const mockedSchedule = jest.mocked(scheduleTaskReminder);

/** A fake device: remembers what is scheduled, so repeated syncs behave realistically. */
let device: Map<string, ScheduledReminder>;

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'a',
    title: 'Water plants',
    dueAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    completedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  device = new Map();
  mockedHasPermission.mockResolvedValue(true);
  mockedGetTiming.mockReturnValue('exact');
  mockedGetScheduled.mockImplementation(async () => [...device.values()]);
  mockedCancel.mockImplementation(async (id) => {
    device.delete(id);
  });
  mockedSchedule.mockImplementation(async ({ id, dueAt, title, timing }) => {
    device.set(id, { id, dueAt, title, timing });
  });
});

it('schedules a reminder for a new future task', async () => {
  const sync = createReminderSync();
  await sync([task()]);

  expect(mockedSchedule).toHaveBeenCalledTimes(1);
  expect([...device.keys()]).toEqual(['task-a']);
});

it('syncing the same tasks twice schedules nothing extra', async () => {
  const sync = createReminderSync();
  const tasks = [task()];
  await sync(tasks);
  await sync(tasks);

  expect(mockedSchedule).toHaveBeenCalledTimes(1);
  expect(mockedCancel).not.toHaveBeenCalled();
});

it('cancels the old reminder before scheduling its replacement', async () => {
  const sync = createReminderSync();
  await sync([task()]);
  await sync([task({ dueAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() })]);

  expect(mockedCancel).toHaveBeenCalledWith('task-a');
  expect(mockedCancel.mock.invocationCallOrder[0]).toBeLessThan(
    mockedSchedule.mock.invocationCallOrder[1]
  );
  expect(device.size).toBe(1);
});

it('cancels when a task is deleted', async () => {
  const sync = createReminderSync();
  await sync([task()]);
  await sync([]);

  expect(mockedCancel).toHaveBeenCalledWith('task-a');
  expect(device.size).toBe(0);
});

it('does not cancel reminders of tasks it has never seen (corrupt-data recovery)', async () => {
  device.set('task-lost', { id: 'task-lost', dueAt: task().dueAt, title: 'Lost', timing: 'exact' });
  const sync = createReminderSync();
  await sync([]);

  expect(mockedCancel).not.toHaveBeenCalled();
  expect(device.has('task-lost')).toBe(true);
});

it('schedules nothing without permission, but still cancels', async () => {
  device.set('task-a', {
    id: 'task-a',
    dueAt: task().dueAt,
    title: 'Water plants',
    timing: 'exact',
  });
  mockedHasPermission.mockResolvedValue(false);
  const sync = createReminderSync();
  await sync([task({ completedAt: new Date().toISOString() }), task({ id: 'b' })]);

  expect(mockedCancel).toHaveBeenCalledWith('task-a');
  expect(mockedSchedule).not.toHaveBeenCalled();
});

it('reschedules every reminder when the timing changes, and only then', async () => {
  const sync = createReminderSync();
  const tasks = [task({ id: 'a' }), task({ id: 'b' })];
  mockedGetTiming.mockReturnValue('best-effort');
  await sync(tasks);

  // The user turns on "Alarms & reminders" and comes back to Ding.
  mockedGetTiming.mockReturnValue('exact');
  await sync(tasks);
  await sync(tasks);

  expect(mockedCancel).toHaveBeenCalledTimes(2);
  expect(mockedSchedule).toHaveBeenCalledTimes(4);
  expect([...device.values()].map((r) => r.timing)).toEqual(['exact', 'exact']);
});

it('runs one sync at a time and finishes with the newest list', async () => {
  const sync = createReminderSync();
  const first = sync([task({ id: 'a' })]);
  sync([task({ id: 'a' }), task({ id: 'b' })]);
  const last = sync([task({ id: 'b' })]);
  await Promise.all([first, last]);

  // The middle list was skipped; the device ends up matching the last one.
  expect(mockedGetScheduled).toHaveBeenCalledTimes(2);
  expect([...device.keys()]).toEqual(['task-b']);
});

it('logs errors instead of throwing, and keeps working afterwards', async () => {
  const sync = createReminderSync();
  mockedGetScheduled.mockRejectedValueOnce(new Error('native error'));
  await expect(sync([task()])).resolves.toBeUndefined();
  expect(console.error).toHaveBeenCalled();

  await sync([task()]);
  expect(device.has('task-a')).toBe(true);
});
