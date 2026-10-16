import { CURRENT_VERSION, isValidTask, parseStoredData, toPersistedData } from '@/tasks/persisted-data';
import type { Task } from '@/tasks/types';

const task: Task = {
  id: 'a1',
  title: 'Water plants',
  dueAt: '2026-10-16T09:00:00.000Z',
  completedAt: null,
  snoozedUntil: null,
  createdAt: '2026-10-15T08:00:00.000Z',
};

describe('isValidTask', () => {
  it('accepts a complete task', () => {
    expect(isValidTask(task)).toBe(true);
    expect(isValidTask({ ...task, completedAt: '2026-10-16T10:00:00.000Z' })).toBe(true);
  });

  it.each([
    ['null', null],
    ['an array', [task]],
    ['a missing id', { ...task, id: undefined }],
    ['an empty id', { ...task, id: '' }],
    ['a non-string title', { ...task, title: 42 }],
    ['an invalid dueAt', { ...task, dueAt: 'not a date' }],
    ['a missing createdAt', { ...task, createdAt: undefined }],
    ['an undefined completedAt', { ...task, completedAt: undefined }],
    ['an invalid completedAt', { ...task, completedAt: 'yesterday-ish' }],
    ['a missing snoozedUntil', { ...task, snoozedUntil: undefined }],
    ['an invalid snoozedUntil', { ...task, snoozedUntil: 'later' }],
  ])('rejects %s', (_label, value) => {
    expect(isValidTask(value)).toBe(false);
  });
});

describe('parseStoredData', () => {
  // What a task looked like before snoozing existed (versions 1 and 2).
  const { snoozedUntil: _unused, ...oldTask } = task;

  it('migrates the original bare-array format (version 1)', () => {
    expect(parseStoredData(JSON.stringify([oldTask]))).toEqual({
      kind: 'ok',
      tasks: [task],
      droppedCount: 0,
    });
  });

  it('migrates version 2 by marking every task as not snoozed', () => {
    const raw = JSON.stringify({ version: 2, tasks: [oldTask, { ...oldTask, id: 'a2' }] });
    expect(parseStoredData(raw)).toEqual({
      kind: 'ok',
      tasks: [task, { ...task, id: 'a2' }],
      droppedCount: 0,
    });
  });

  it('keeps a saved snooze time', () => {
    const snoozed = { ...task, snoozedUntil: '2026-10-16T09:10:00.000Z' };
    const raw = JSON.stringify(toPersistedData([snoozed]));
    expect(parseStoredData(raw)).toEqual({ kind: 'ok', tasks: [snoozed], droppedCount: 0 });
  });

  it('reports version 2 without a task list as corrupt', () => {
    expect(parseStoredData('{"version":2}')).toEqual({ kind: 'corrupt' });
  });

  it('reads the current format', () => {
    const raw = JSON.stringify(toPersistedData([task]));
    expect(JSON.parse(raw).version).toBe(CURRENT_VERSION);
    expect(parseStoredData(raw)).toEqual({ kind: 'ok', tasks: [task], droppedCount: 0 });
  });

  it('keeps valid tasks and counts the broken ones', () => {
    const raw = JSON.stringify([task, { id: 'broken' }, 'junk']);
    expect(parseStoredData(raw)).toEqual({ kind: 'ok', tasks: [task], droppedCount: 2 });
  });

  it.each([
    ['invalid JSON', '{not json'],
    ['a plain string', '"hello"'],
    ['an object without a version', '{"tasks":[]}'],
    ['version 0', '{"version":0,"tasks":[]}'],
    ['a current version without a task list', `{"version":${CURRENT_VERSION}}`],
  ])('reports %s as corrupt', (_label, raw) => {
    expect(parseStoredData(raw)).toEqual({ kind: 'corrupt' });
  });

  it('refuses data saved by a newer app version', () => {
    const raw = JSON.stringify({ version: CURRENT_VERSION + 1, tasks: [] });
    expect(parseStoredData(raw)).toEqual({ kind: 'too-new', version: CURRENT_VERSION + 1 });
  });
});
