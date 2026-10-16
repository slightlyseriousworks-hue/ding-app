import {
  applyReminderAction,
  DONE_ACTION_ID,
  OPEN_ACTION_ID,
  readReminderPress,
  type ReminderAction,
  type ReminderPress,
  SNOOZE_ACTION_ID,
  SNOOZE_MINUTES,
} from '@/reminders/actions';
import type { Task } from '@/tasks/types';

const now = new Date('2026-10-16T12:00:00.000Z');
const dueAt = '2026-10-16T11:59:00.000Z';

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'a',
    title: 'Water plants',
    dueAt,
    completedAt: null,
    snoozedUntil: null,
    createdAt: '2026-10-16T10:00:00.000Z',
    ...overrides,
  };
}

function press(overrides: Partial<ReminderPress> = {}): ReminderPress {
  return { actionId: DONE_ACTION_ID, notificationId: 'task-a', remindAt: dueAt, key: 'k', ...overrides };
}

describe('readReminderPress', () => {
  it.each([
    [DONE_ACTION_ID, 'done'],
    [SNOOZE_ACTION_ID, 'snooze'],
    [OPEN_ACTION_ID, 'open'],
  ])('reads %s as %s, for the task in the notification id', (actionId, kind) => {
    expect(readReminderPress(press({ actionId }))).toEqual({ kind, taskId: 'a', remindAt: dueAt });
  });

  it('ignores buttons Ding does not know', () => {
    expect(readReminderPress(press({ actionId: 'something-else' }))).toBeNull();
  });

  it('ignores notifications that are not task reminders', () => {
    expect(readReminderPress(press({ notificationId: 'r1-test' }))).toBeNull();
    expect(readReminderPress(press({ notificationId: 'task-' }))).toBeNull();
  });
});

describe('applyReminderAction', () => {
  const done: ReminderAction = { kind: 'done', taskId: 'a', remindAt: dueAt };
  const snooze: ReminderAction = { kind: 'snooze', taskId: 'a', remindAt: dueAt };

  it('Done completes the right task and leaves the others alone', () => {
    const other = task({ id: 'b' });
    expect(applyReminderAction([task(), other], done, now)).toEqual([
      task({ completedAt: now.toISOString() }),
      other,
    ]);
  });

  it('Done clears a snooze, so no snoozed reminder is left behind', () => {
    const snoozed = task({ snoozedUntil: '2026-10-16T12:05:00.000Z' });
    expect(applyReminderAction([snoozed], done, now)).toEqual([
      task({ completedAt: now.toISOString() }),
    ]);
  });

  it('Done on an already completed task changes nothing (safe to repeat)', () => {
    const completed = task({ completedAt: '2026-10-16T11:00:00.000Z' });
    expect(applyReminderAction([completed], done, now)).toBeNull();
  });

  it('changes nothing for a deleted task', () => {
    expect(applyReminderAction([task({ id: 'b' })], done, now)).toBeNull();
    expect(applyReminderAction([], snooze, now)).toBeNull();
  });

  it('Snooze rings again SNOOZE_MINUTES from now, without moving the due time', () => {
    const snoozedUntil = new Date(now.getTime() + SNOOZE_MINUTES * 60_000).toISOString();
    expect(applyReminderAction([task()], snooze, now)).toEqual([task({ snoozedUntil })]);
  });

  it('Snooze works on a snoozed reminder that rang again', () => {
    const firstSnooze = '2026-10-16T11:59:30.000Z';
    const t = task({ snoozedUntil: firstSnooze });
    const result = applyReminderAction([t], { ...snooze, remindAt: firstSnooze }, now);
    expect(result?.[0].snoozedUntil).not.toBe(firstSnooze);
  });

  it('a second Snooze press on the same notification changes nothing', () => {
    const once = applyReminderAction([task()], snooze, now)!;
    const later = new Date(now.getTime() + 1000);
    expect(applyReminderAction(once, snooze, later)).toBeNull();
  });

  it('Snooze on an out-of-date notification (due time edited since) changes nothing', () => {
    const edited = task({ dueAt: '2026-10-17T09:00:00.000Z' });
    expect(applyReminderAction([edited], snooze, now)).toBeNull();
  });

  it('Snooze on a completed task changes nothing', () => {
    const completed = task({ completedAt: now.toISOString() });
    expect(applyReminderAction([completed], snooze, now)).toBeNull();
  });

  it('opening the notification changes nothing', () => {
    expect(applyReminderAction([task()], { ...done, kind: 'open' }, now)).toBeNull();
  });
});
