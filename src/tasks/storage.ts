/**
 * The ONLY file that knows how tasks are saved on the device. (It also keeps one small
 * app flag at the bottom, so this stays the only file that touches device storage.)
 *
 * Today this uses AsyncStorage (works on iOS, Android, and web) and stores the whole task
 * list as one JSON string. To move to SQLite later, rewrite these two functions and keep
 * their signatures the same — nothing else in the app should need to change.
 *
 * Safety rule: if anything goes wrong while reading, `loadTasks` throws instead of
 * pretending the list is empty. Otherwise the app would save an empty list over real data.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { parseStoredData, toPersistedData } from '@/tasks/persisted-data';
import type { Task } from '@/tasks/types';

// The key name is just a label; the format version is stored inside the data.
const STORAGE_KEY = 'ding.tasks.v1';

/** Copies the raw saved data to a new, timestamped key so older backups are kept too. */
async function backUp(raw: string) {
  await AsyncStorage.setItem(`${STORAGE_KEY}.backup.${new Date().toISOString()}`, raw);
}

export async function loadTasks(): Promise<Task[]> {
  // If this read fails, the error goes straight to the caller.
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    return [];
  }

  const result = parseStoredData(raw);

  if (result.kind === 'too-new') {
    throw new Error(`Saved tasks use format version ${result.version}, which this app can't read`);
  }

  if (result.kind === 'corrupt') {
    // If the backup fails, this throws, and nothing gets overwritten.
    await backUp(raw);
    console.error('Could not read saved tasks. A backup was kept. Starting with an empty list.');
    return [];
  }

  if (result.droppedCount > 0) {
    await backUp(raw);
    console.error(`Skipped ${result.droppedCount} broken saved task(s). A backup was kept.`);
  }
  return result.tasks;
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toPersistedData(tasks)));
}

// --- App flags ---

const PRECISE_TIMING_OFFERED_KEY = 'ding.preciseTimingOffered';

/** True once Ding has explained "precise timing" to the user (it only does that once). */
export async function wasPreciseTimingOffered(): Promise<boolean> {
  return (await AsyncStorage.getItem(PRECISE_TIMING_OFFERED_KEY)) === 'true';
}

export async function markPreciseTimingOffered(): Promise<void> {
  await AsyncStorage.setItem(PRECISE_TIMING_OFFERED_KEY, 'true');
}
