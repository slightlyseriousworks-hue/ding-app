import { addDays, isSameDay, startOfDay } from '@/tasks/dates';
import type { Task } from '@/tasks/types';

export type Section = { title: string; data: Task[] };

/** Splits tasks into the sections shown on the Today screen. Empty sections are left out. */
export function groupTasks(tasks: Task[], now: Date): Section[] {
  const tomorrow = startOfDay(addDays(now, 1));
  const byDueDate = [...tasks].sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const open = byDueDate.filter((task) => task.completedAt === null);

  const sections: Section[] = [
    { title: 'Overdue', data: open.filter((task) => new Date(task.dueAt) < now) },
    {
      title: 'Today',
      data: open.filter((task) => {
        const due = new Date(task.dueAt);
        return due >= now && due < tomorrow;
      }),
    },
    { title: 'Upcoming', data: open.filter((task) => new Date(task.dueAt) >= tomorrow) },
    {
      title: 'Done today',
      data: byDueDate.filter(
        (task) => task.completedAt !== null && isSameDay(new Date(task.completedAt), now)
      ),
    },
  ];

  return sections.filter((section) => section.data.length > 0);
}
