/**
 * The ONLY file that knows how tasks are saved on the device.
 *
 * Today this uses AsyncStorage (works on iOS, Android, and web) and stores the whole task
 * list as one JSON string. To move to SQLite later, rewrite these two functions and keep
 * their signatures the same — nothing else in the app should need to change.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Task } from '@/tasks/types';

const STORAGE_KEY = 'ding.tasks.v1';
const CORRUPT_BACKUP_KEY = `${STORAGE_KEY}.corrupt-backup`;

export async function loadTasks(): Promise<Task[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('Saved tasks are not a list');
    }
    return parsed as Task[];
  } catch (error) {
    // Keep a copy of the unreadable data so it is not silently lost when we save again.
    console.error('Could not read saved tasks. Starting with an empty list.', error);
    await AsyncStorage.setItem(CORRUPT_BACKUP_KEY, raw);
    return [];
  }
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}
