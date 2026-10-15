import { groupTasks } from '@/tasks/grouping';
import type { Task } from '@/tasks/types';

// Local-time dates (month 9 = October) so the tests pass in any timezone.
const now = new Date(2026, 9, 16, 12, 0);

function makeTask(id: string, due: Date, completed: Date | null = null): Task {
  return {
    id,
    title: id,
    dueAt: due.toISOString(),
    completedAt: completed ? completed.toISOString() : null,
    createdAt: new Date(2026, 9, 1).toISOString(),
  };
}

function summary(tasks: Task[]) {
  return groupTasks(tasks, now).map((section) => [
    section.title,
    section.data.map((task) => task.id),
  ]);
}

it('returns no sections when there are no tasks', () => {
  expect(groupTasks([], now)).toEqual([]);
});

it('puts open tasks into Overdue, Today, and Upcoming', () => {
  const tasks = [
    makeTask('upcoming', new Date(2026, 9, 17, 0, 0)), // midnight tomorrow
    makeTask('later-today', new Date(2026, 9, 16, 23, 59)),
    makeTask('overdue', new Date(2026, 9, 16, 11, 59)),
    makeTask('right-now', new Date(2026, 9, 16, 12, 0)),
  ];

  expect(summary(tasks)).toEqual([
    ['Overdue', ['overdue']],
    ['Today', ['right-now', 'later-today']],
    ['Upcoming', ['upcoming']],
  ]);
});

it('shows only tasks completed today under Done today', () => {
  const tasks = [
    makeTask('done-today', new Date(2026, 9, 14, 9, 0), new Date(2026, 9, 16, 8, 0)),
    makeTask('done-yesterday', new Date(2026, 9, 15, 9, 0), new Date(2026, 9, 15, 10, 0)),
  ];

  expect(summary(tasks)).toEqual([['Done today', ['done-today']]]);
});

it('sorts each section by due date and leaves out empty sections', () => {
  const tasks = [
    makeTask('b', new Date(2026, 9, 20, 9, 0)),
    makeTask('a', new Date(2026, 9, 18, 9, 0)),
  ];

  expect(summary(tasks)).toEqual([['Upcoming', ['a', 'b']]]);
});
