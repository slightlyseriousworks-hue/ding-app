import { useEffect, useState } from 'react';

/**
 * The current time, refreshed every `intervalMs`.
 * Lets screens re-render as time passes (e.g. a task moving from "Today" to "Overdue").
 */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
