import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppState, Pressable, Text, type AppStateStatus } from 'react-native';

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

it('syncs reminders again when Ding comes back to the foreground', async () => {
  const listeners: ((state: AppStateStatus) => void)[] = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    listeners.push(listener);
    return { remove: jest.fn() };
  });
  mockedLoadTasks.mockResolvedValue([]);
  await renderProvider();
  await screen.findByText('ready:0');
  await waitFor(() => expect(listeners.length).toBeGreaterThan(0));
  mockSyncReminders.mockClear();

  await act(() => listeners.at(-1)?.('background'));
  expect(mockSyncReminders).not.toHaveBeenCalled();

  await act(() => listeners.at(-1)?.('active'));
  expect(mockSyncReminders).toHaveBeenCalledWith([]);
});

describe('snooze', () => {
  const snoozed = {
    id: 's1',
    title: 'Call mum',
    dueAt: '2026-10-16T09:00:00.000Z',
    completedAt: null,
    snoozedUntil: '2026-10-16T09:10:00.000Z',
    createdAt: '2026-10-15T08:00:00.000Z',
  };

  /** Shows the task's snoozedUntil and has buttons for the edits that should clear it. */
  function SnoozeProbe() {
    const { tasks, updateTask, setCompleted } = useTasks();
    const task = tasks[0];
    return (
      <>
        <Text>{`snoozed:${task?.snoozedUntil ?? 'none'}`}</Text>
        <Pressable onPress={() => updateTask('s1', { title: 'Call mum!', dueAt: task.dueAt })}>
          <Text>Rename</Text>
        </Pressable>
        <Pressable onPress={() => updateTask('s1', { title: task.title, dueAt: '2026-10-17T09:00:00.000Z' })}>
          <Text>Move</Text>
        </Pressable>
        <Pressable onPress={() => setCompleted('s1', true)}>
          <Text>Complete</Text>
        </Pressable>
      </>
    );
  }

  async function renderSnoozed() {
    mockedLoadTasks.mockResolvedValue([snoozed]);
    await render(
      <TasksProvider>
        <SnoozeProbe />
      </TasksProvider>
    );
    await screen.findByText(`snoozed:${snoozed.snoozedUntil}`);
  }

  it('keeps the snooze when only the title changes', async () => {
    await renderSnoozed();
    await fireEvent.press(screen.getByText('Rename'));
    expect(screen.getByText(`snoozed:${snoozed.snoozedUntil}`)).toBeTruthy();
  });

  it('clears the snooze when the due time changes', async () => {
    await renderSnoozed();
    await fireEvent.press(screen.getByText('Move'));
    await screen.findByText('snoozed:none');
  });

  it('clears the snooze when the task is completed', async () => {
    await renderSnoozed();
    await fireEvent.press(screen.getByText('Complete'));
    await screen.findByText('snoozed:none');
  });
});

it('can retry after a failed load', async () => {
  mockedLoadTasks.mockRejectedValueOnce(new Error('disk error'));
  mockedLoadTasks.mockResolvedValueOnce([]);
  await renderProvider();

  await screen.findByText('error:0');
  await fireEvent.press(screen.getByText('Retry'));
  await screen.findByText('ready:0');
});
