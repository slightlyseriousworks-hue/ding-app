/** Small date helpers for showing and grouping tasks. All work in the phone's local time. */

export function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function isSameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/** "Today", "Tomorrow", "Yesterday", or e.g. "Mon, Oct 20". */
export function formatDay(date: Date, now = new Date()) {
  if (isSameDay(date, now)) return 'Today';
  if (isSameDay(date, addDays(now, 1))) return 'Tomorrow';
  if (isSameDay(date, addDays(now, -1))) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

/** e.g. "3:00 PM" */
export function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** e.g. "Today, 3:00 PM" */
export function formatDue(iso: string, now = new Date()) {
  const date = new Date(iso);
  return `${formatDay(date, now)}, ${formatTime(date)}`;
}
