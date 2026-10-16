import {
  MIN_LEAD_MS,
  planReminderChanges,
  reminderId,
  type ScheduledReminder,
} from '@/reminders/plan';
import type { Task } from '@/tasks/types';

const now = new Date('2026-10-16T12:00:00.000Z');
const inOneHour = '2026-10-16T13:00:00.000Z';
const inTwoHours = '2026-10-16T14:00:00.000Z';
const oneHourAgo = '2026-10-16T11:00:00.000Z';

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'a',
    title: 'Water plants',
    dueAt: inOneHour,
    completedAt: null,
    createdAt: '2026-10-16T10:00:00.000Z',
    ...overrides,
  };
}

/** A reminder exactly as it would be scheduled for `t`. */
function scheduledFor(t: Task): ScheduledReminder {
  return { id: reminderId(t.id), dueAt: t.dueAt, title: t.title };
}

function plan(tasks: Task[], scheduled: ScheduledReminder[] = [], seen = tasks.map((t) => t.id)) {
  return planReminderChanges({ tasks, scheduled, seenTaskIds: new Set(seen), now });
}

it('schedules one reminder for an open future task, at its due time', () => {
  expect(plan([task()])).toEqual({
    cancel: [],
    schedule: [{ id: 'task-a', taskId: 'a', title: 'Water plants', dueAt: inOneHour }],
  });
});

it('does nothing when the reminder is already up to date (no duplicates)', () => {
  const t = task();
  expect(plan([t], [scheduledFor(t)])).toEqual({ cancel: [], schedule: [] });
});

it('does not schedule a task that is already past due', () => {
  expect(plan([task({ dueAt: oneHourAgo })])).toEqual({ cancel: [], schedule: [] });
});

it('does not schedule a task due sooner than the minimum lead time', () => {
  const tooSoon = new Date(now.getTime() + MIN_LEAD_MS - 1).toISOString();
  expect(plan([task({ dueAt: tooSoon })]).schedule).toEqual([]);
});

it('cancels then reschedules (same id) when the due time changes', () => {
  const old = task();
  const edited = task({ dueAt: inTwoHours });
  expect(plan([edited], [scheduledFor(old)])).toEqual({
    cancel: ['task-a'],
    schedule: [expect.objectContaining({ id: 'task-a', dueAt: inTwoHours })],
  });
});

it('cancels then reschedules when the title changes', () => {
  const old = task();
  const edited = task({ title: 'Water ALL the plants' });
  expect(plan([edited], [scheduledFor(old)])).toEqual({
    cancel: ['task-a'],
    schedule: [expect.objectContaining({ title: 'Water ALL the plants' })],
  });
});

it('cancels without rescheduling when the due time is moved into the past', () => {
  const old = task();
  expect(plan([task({ dueAt: oneHourAgo })], [scheduledFor(old)])).toEqual({
    cancel: ['task-a'],
    schedule: [],
  });
});

it('cancels the reminder when the task is completed', () => {
  const t = task();
  const done = task({ completedAt: now.toISOString() });
  expect(plan([done], [scheduledFor(t)])).toEqual({ cancel: ['task-a'], schedule: [] });
});

it('schedules again when a completed future task is marked not done', () => {
  expect(plan([task({ completedAt: null })]).schedule).toHaveLength(1);
});

it('does not schedule when a completed past-due task is marked not done', () => {
  expect(plan([task({ dueAt: oneHourAgo })]).schedule).toEqual([]);
});

it('cancels the reminder of a task deleted this session', () => {
  const t = task();
  expect(plan([], [scheduledFor(t)], ['a'])).toEqual({ cancel: ['task-a'], schedule: [] });
});

it('leaves reminders for never-seen tasks alone (e.g. after recovering corrupt data)', () => {
  const lost = [scheduledFor(task({ id: 'x' })), scheduledFor(task({ id: 'y' }))];
  expect(plan([], lost, [])).toEqual({ cancel: [], schedule: [] });
});

it('ignores notifications that are not task reminders (e.g. the Settings test)', () => {
  const test = { id: 'some-random-id', dueAt: null, title: null };
  expect(plan([], [test], ['some-random-id'])).toEqual({ cancel: [], schedule: [] });
});

it('replaces a reminder whose saved details could not be read', () => {
  const t = task();
  const unreadable = { id: 'task-a', dueAt: null, title: null };
  expect(plan([t], [unreadable])).toEqual({
    cancel: ['task-a'],
    schedule: [expect.objectContaining({ id: 'task-a' })],
  });
});

it('gives every task its own id', () => {
  const ids = plan([task({ id: 'a' }), task({ id: 'b' })]).schedule.map((r) => r.id);
  expect(ids).toEqual(['task-a', 'task-b']);
});
