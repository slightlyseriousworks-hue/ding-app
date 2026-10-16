/**
 * The shape of the saved task data, and how to read older shapes.
 *
 * This file only works with plain values (no AsyncStorage), so it is easy to test.
 * storage.ts is still the only file that actually reads and writes the device.
 *
 * Versions:
 *   1 — a bare JSON array of tasks (what the app saved before versioning existed).
 *   2 — { version: 2, tasks: [...] }
 *   3 — same as 2, but every task also has `snoozedUntil` (Reminder R3).
 *
 * To change the format later: bump CURRENT_VERSION and add one step to `migrations`
 * that turns the previous version into the new one.
 */
import type { Task } from '@/tasks/types';

export const CURRENT_VERSION = 3;

export type PersistedData = {
  version: typeof CURRENT_VERSION;
  tasks: Task[];
};

export type ParseResult =
  /** Loaded fine. `droppedCount` is how many records were broken and left out. */
  | { kind: 'ok'; tasks: Task[]; droppedCount: number }
  /** Not valid JSON, or not a shape we recognise. */
  | { kind: 'corrupt' }
  /** Saved by a newer version of the app. We must not touch it. */
  | { kind: 'too-new'; version: number };

/** Each step turns version N into version N + 1. */
const migrations: Record<number, (data: unknown) => unknown> = {
  1: (tasks) => ({ version: 2, tasks }),
  // Tasks saved before snoozing existed were never snoozed.
  2: (data) => {
    if (!isObject(data) || !Array.isArray(data.tasks)) return data;
    const tasks = data.tasks.map((task) => (isObject(task) ? { snoozedUntil: null, ...task } : task));
    return { version: 3, tasks };
  },
};

export function toPersistedData(tasks: Task[]): PersistedData {
  return { version: CURRENT_VERSION, tasks };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
}

/** Returns true if `value` has every field a Task needs, with the right types. */
export function isValidTask(value: unknown): value is Task {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.title === 'string' &&
    isValidDate(value.dueAt) &&
    isValidDate(value.createdAt) &&
    (value.completedAt === null || isValidDate(value.completedAt)) &&
    (value.snoozedUntil === null || isValidDate(value.snoozedUntil))
  );
}

/** Works out which format version some saved data is in, or null if we can't tell. */
function getVersion(data: unknown): number | null {
  if (Array.isArray(data)) return 1;
  if (isObject(data) && Number.isInteger(data.version)) return data.version as number;
  return null;
}

/** Turns the raw saved string into tasks, upgrading old formats along the way. */
export function parseStoredData(raw: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { kind: 'corrupt' };
  }

  let version = getVersion(data);
  if (version === null || version < 1) return { kind: 'corrupt' };
  if (version > CURRENT_VERSION) return { kind: 'too-new', version };

  while (version < CURRENT_VERSION) {
    data = migrations[version](data);
    version += 1;
  }

  if (!isObject(data) || !Array.isArray(data.tasks)) return { kind: 'corrupt' };

  const tasks = data.tasks.filter(isValidTask);
  return { kind: 'ok', tasks, droppedCount: data.tasks.length - tasks.length };
}
