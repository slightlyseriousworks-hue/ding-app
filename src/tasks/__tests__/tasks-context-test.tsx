import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { loadTasks, saveTasks } from '@/tasks/storage';
import { TasksProvider, useTasks } from '@/tasks/tasks-context';

jest.mock('@/tasks/storage', () => ({
  loadTasks: jest.fn(),
  saveTasks: jest.fn(() => Promise.resolve()),
}));

const mockSyncReminders = jest.fn(() => Promise.resolve());
jest.mock('@/reminders/sync', () => ({
  createReminderSync: () => mockSyncReminders,
}));

const mockedLoadTasks = jest.mocked(loadTasks);
const mockedSaveTasks = jest.mocked(saveTasks);

const newTask = { title: 'Water plants', dueAt: '2026-10-16T09:00:00.000Z' };

/** A tiny stand-in screen: shows "status:taskCount" and has Add / Retry buttons. */
function Probe() {
  const { tasks, loadStatus, addTask, retryLoad } = useTasks();
  return (
    <>
      <Text>{`${loadStatus}:${tasks.length}`}</Text>
      <Pressable onPress={() => addTask(newTask)}>
        <Text>Add</Text>
      </Pressable>
      <Pressable onPress={retryLoad}>
        <Text>Retry</Text>
      </Pressable>
    </>
  );
}

function renderProvider() {
  return render(
    <TasksProvider>
      <Probe />
    </TasksProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

it('never saves when loading fails, even if the user tries to add a task', async () => {
  mockedLoadTasks.mockRejectedValue(new Error('disk error'));
  await renderProvider();

  await screen.findByText('error:0');
  await fireEvent.press(screen.getByText('Add'));

  expect(screen.getByText('error:0')).toBeTruthy();
  expect(mockedSaveTasks).not.toHaveBeenCalled();
});

it('saves changes after a successful load', async () => {
  mockedLoadTasks.mockResolvedValue([]);
  await renderProvider();

  await screen.findByText('ready:0');
  await fireEvent.press(screen.getByText('Add'));

  await screen.findByText('ready:1');
  await waitFor(() =>
    expect(mockedSaveTasks).toHaveBeenLastCalledWith([expect.objectContaining(newTask)])
  );
});

it('never syncs reminders when loading fails', async () => {
  mockedLoadTasks.mockRejectedValue(new Error('disk error'));
  await renderProvider();

  await screen.findByText('error:0');
  await fireEvent.press(screen.getByText('Add'));

  expect(mockSyncReminders).not.toHaveBeenCalled();
});

it('syncs reminders after loading and after every change', async () => {
  mockedLoadTasks.mockResolvedValue([]);
  await renderProvider();

  await screen.findByText('ready:0');
  await waitFor(() => expect(mockSyncReminders).toHaveBeenLastCalledWith([]));

  await fireEvent.press(screen.getByText('Add'));
  await waitFor(() =>
    expect(mockSyncReminders).toHaveBeenLastCalledWith([expect.objectContaining(newTask)])
  );
});

it('can retry after a failed load', async () => {
  mockedLoadTasks.mockRejectedValueOnce(new Error('disk error'));
  mockedLoadTasks.mockResolvedValueOnce([]);
  await renderProvider();

  await screen.findByText('error:0');
  await fireEvent.press(screen.getByText('Retry'));
  await screen.findByText('ready:0');
});
