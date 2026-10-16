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

/** Drops seconds and milliseconds, e.g. 3:20:41.512 → 3:20:00.000. */
export function startOfMinute(date: Date) {
  const result = new Date(date);
  result.setSeconds(0, 0);
  return result;
}

/**
 * The first whole minute that is at least `minutes` away, e.g. at 11:08:20, 1 → 11:10:00.
 * At exactly 11:08:00.000, 1 → 11:09:00. Used by the DEV test chips, so a reminder test
 * always gets a clean time with at least `minutes` of lead.
 */
export function wholeMinutesFromNow(minutes: number, now = new Date()) {
  const target = new Date(now.getTime() + minutes * 60_000);
  const rounded = startOfMinute(target);
  if (rounded.getTime() < target.getTime()) rounded.setMinutes(rounded.getMinutes() + 1);
  return rounded;
}

/** e.g. "3:00:00 PM". Only for DEV timing checks; users see times to the minute. */
export function formatTimeWithSeconds(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}
