import AsyncStorage from '@react-native-async-storage/async-storage';

import { CURRENT_VERSION } from '@/tasks/persisted-data';
import { loadTasks, saveTasks } from '@/tasks/storage';
import type { Task } from '@/tasks/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const KEY = 'ding.tasks.v1';

const task: Task = {
  id: 'a1',
  title: 'Water plants',
  dueAt: '2026-10-16T09:00:00.000Z',
  completedAt: null,
  createdAt: '2026-10-15T08:00:00.000Z',
};

async function backupKeys() {
  const keys = await AsyncStorage.getAllKeys();
  return keys.filter((key) => key.startsWith(`${KEY}.backup.`));
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

it('returns an empty list when nothing has been saved', async () => {
  await expect(loadTasks()).resolves.toEqual([]);
});

it('loads tasks saved in the original bare-array format', async () => {
  await AsyncStorage.setItem(KEY, JSON.stringify([task]));
  await expect(loadTasks()).resolves.toEqual([task]);
  expect(await backupKeys()).toEqual([]);
});

it('saves in the current versioned format and loads it back', async () => {
  await saveTasks([task]);
  expect(JSON.parse((await AsyncStorage.getItem(KEY))!)).toEqual({
    version: CURRENT_VERSION,
    tasks: [task],
  });
  await expect(loadTasks()).resolves.toEqual([task]);
});

it('throws (instead of returning an empty list) when reading fails', async () => {
  jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk error'));
  await expect(loadTasks()).rejects.toThrow('disk error');
});

it('backs up unreadable data before starting empty', async () => {
  await AsyncStorage.setItem(KEY, '{not json');
  await expect(loadTasks()).resolves.toEqual([]);

  const keys = await backupKeys();
  expect(keys).toHaveLength(1);
  expect(await AsyncStorage.getItem(keys[0])).toBe('{not json');
});

it('throws if the backup of unreadable data cannot be written', async () => {
  await AsyncStorage.setItem(KEY, '{not json');
  jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
  await expect(loadTasks()).rejects.toThrow('disk full');
});

it('skips broken records but keeps a backup of the original data', async () => {
  const raw = JSON.stringify([task, { id: 'broken' }]);
  await AsyncStorage.setItem(KEY, raw);
  await expect(loadTasks()).resolves.toEqual([task]);

  const keys = await backupKeys();
  expect(keys).toHaveLength(1);
  expect(await AsyncStorage.getItem(keys[0])).toBe(raw);
});

it('throws for data saved by a newer app version and leaves it alone', async () => {
  const raw = JSON.stringify({ version: CURRENT_VERSION + 1, tasks: [] });
  await AsyncStorage.setItem(KEY, raw);
  await expect(loadTasks()).rejects.toThrow();
  expect(await AsyncStorage.getItem(KEY)).toBe(raw);
});
