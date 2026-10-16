import { requestNotificationPermission } from '@/reminders/notifications';
import { prepareReminder } from '@/reminders/reminder-permission';

jest.mock('@/reminders/notifications', () => ({
  requestNotificationPermission: jest.fn(),
}));

const mockedRequest = jest.mocked(requestNotificationPermission);

const future = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();
const past = () => new Date(Date.now() - 60 * 60 * 1000).toISOString();

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
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
